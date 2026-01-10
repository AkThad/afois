import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TARGET_NAICS, TARGET_STATES } from '@/lib/ingest/constants'
import { subDays, format } from 'date-fns'

export const maxDuration = 300 // 5 minutes for Edge/Node functions (if supported by plan)
export const dynamic = 'force-dynamic' // CRITICAL: Prevent Next.js from caching this GET request at build time

export async function GET(request: Request) {
    try {
        const apiKey = process.env.SAM_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'SAM_API_KEY not configured' }, { status: 500 })
        }

        // Get query params
        const { searchParams } = new URL(request.url)
        const orgId = searchParams.get('orgId')
        const skipGeoFilter = searchParams.get('skipGeoFilter') === 'true'

        // Fetch organization configuration from database
        let targetNaics = TARGET_NAICS
        let targetStates = TARGET_STATES
        let orgName = 'Default'
        const stateDistribution: Record<string, number> = {} // Track what states we see

        if (orgId) {
            const { data: org, error: orgError } = await supabaseAdmin
                .from('organizations')
                .select('name, target_naics, target_states')
                .eq('id', orgId)
                .single()

            if (orgError) {
                console.error('Error fetching org config:', orgError)
                // Continue with defaults
            } else if (org) {
                orgName = org.name
                if (org.target_naics && org.target_naics.length > 0) {
                    targetNaics = org.target_naics
                }
                if (org.target_states && org.target_states.length > 0) {
                    targetStates = org.target_states
                }
            }
        } else {
            // No orgId provided - try to get first organization as default
            const { data: orgs } = await supabaseAdmin
                .from('organizations')
                .select('name, target_naics, target_states')
                .limit(1)

            if (orgs && orgs.length > 0) {
                const org = orgs[0]
                orgName = org.name
                if (org.target_naics && org.target_naics.length > 0) {
                    targetNaics = org.target_naics
                }
                if (org.target_states && org.target_states.length > 0) {
                    targetStates = org.target_states
                }
            }
        }

        // User requested "Active" postings. Explicit "active=true" parameter in SAM API is best, 
        // but we also need a date range. Let's look back 90 days to avoid API limits (400 Bad Request).
        const postedFrom = format(subDays(new Date(), 90), 'MM/dd/yyyy')
        const postedTo = format(new Date(), 'MM/dd/yyyy')

        let processedCount = 0
        let insertedCount = 0
        let skippedGeo = 0
        const globalErrors: string[] = []
        let rawDebug: any = null

        // Helper for delay
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

        for (const naics of targetNaics) {
            let attempt = 0
            let success = false
            const maxRetries = 2

            while (attempt < maxRetries && !success) {
                try {
                    // Base rate limit protection (3s) plus exponential backoff on retries
                    const waitTime = 3000 + (attempt * 5000)
                    if (attempt > 0) console.log(`Retry attempt ${attempt} for NAICS ${naics}. Waiting ${waitTime}ms...`)
                    await delay(waitTime)

                    // NOTE: We intentionally do NOT pass state filter to API because it would
                    // exclude opportunities with blank Place of Performance. We filter client-side
                    // to include: target states OR blank/null POP (which could be multi-state contracts)
                    const url = `https://api.sam.gov/prod/opportunities/v2/search?api_key=${apiKey}&postedFrom=${postedFrom}&postedTo=${postedTo}&limit=1000&ncode=${naics}&active=yes`

                    const res = await fetch(url)

                    if (!res.ok) {
                        if (res.status === 429) {
                            console.warn(`Rate Limit Hit for NAICS ${naics} (Attempt ${attempt + 1}/${maxRetries})`)
                            attempt++
                            continue // Loop to retry
                        }
                        // Other errors: log and skip this NAICS
                        console.error(`Failed to fetch SAM for NAICS ${naics}: ${res.statusText}`)
                        globalErrors.push(`NAICS ${naics}: HTTP ${res.status} ${res.statusText}`)
                        break
                    }

                    const data = await res.json()
                    if (!rawDebug) rawDebug = data // Capture first successful response
                    const opportunities = data.opportunitiesData || []
                    success = true // Mark as successful to exit retry loop

                    for (const op of opportunities) {
                        processedCount++

                        // 1. Ensure op is an object (in case it's stringified)
                        let opObj = op;
                        if (typeof opObj === 'string') {
                            try {
                                opObj = JSON.parse(opObj);
                            } catch (e) {
                                if (globalErrors.length < 5) globalErrors.push(`Record ${processedCount} Parse Fail: ${opObj.slice(0, 50)}`);
                                continue;
                            }
                        }

                        // 2. Robust Field Mapping (handles inconsistent API casing)
                        const getF = (o: any, ...ks: string[]) => {
                            for (const k of ks) {
                                if (o[k] !== undefined && o[k] !== null) return o[k];
                            }
                            // Case-insensitive fallback
                            const keys = Object.keys(o || {});
                            for (const k of ks) {
                                const found = keys.find(lk => lk.toLowerCase() === k.toLowerCase());
                                if (found) return o[found];
                            }
                            return null;
                        };

                        const noticeId = getF(opObj, 'noticeId', 'noticeld', 'notice_id', 'noticeID', 'noticeid') as string;
                        const title = getF(opObj, 'title', 'subject', 'headline') || 'Untitled';
                        const agency = getF(opObj, 'departmentName', 'agency', 'agencyName', 'organization') || 'Unknown';
                        const solNum = getF(opObj, 'solicitationNumber', 'solnum', 'solicitation_number');
                        const posted = getF(opObj, 'postedDate', 'posted_date');
                        const deadline = getF(opObj, 'responseDeadLine', 'response_deadline', 'responseDeadline');
                        const setAside = getF(opObj, 'typeOfSetAsideDescription', 'typeOfSetAside', 'setaside') || '';

                        if (!noticeId) {
                            if (globalErrors.length < 3) {
                                globalErrors.push(`Record ${processedCount}: Missing notice ID. Keys: ${Object.keys(opObj).join(', ')}`);
                            }
                            continue;
                        }

                        // 3. Office Location (matches SAM.gov website behavior)
                        const officeState = opObj.officeAddress?.state || '';

                        // Track state distribution for debugging
                        const stateKey = officeState || '(no office state)'
                        stateDistribution[stateKey] = (stateDistribution[stateKey] || 0) + 1

                        // GEO FILTER DISABLED - Inserting all opportunities for testing
                        // TODO: Re-enable with proper state filtering via API parameter

                        // 4. Insert into DB
                        const { error } = await supabaseAdmin
                            .from('opportunities')
                            .upsert({
                                source: 'SAM',
                                notice_id: noticeId,
                                title: title,
                                agency: agency,
                                solicitation_number: solNum,
                                naics_code: naics,
                                set_aside: setAside,
                                type: opObj.type || 'Solicitation',
                                posted_date: posted,
                                response_deadline: deadline,
                                site_visit_date: null,
                                place_of_performance_state: officeState,
                                raw_json: opObj
                            }, { onConflict: 'notice_id' })

                        if (error) {
                            if (globalErrors.length < 10) {
                                globalErrors.push(`DB Error [${noticeId}]: ${error.message} (${error.code})`);
                            }
                            console.error('Error inserting opportunity:', error)
                        } else {
                            insertedCount++
                        }
                    }

                } catch (err: any) {
                    console.error(`Exception fetching NAICS ${naics}:`, err)
                    globalErrors.push(`NAICS ${naics} Exception: ${err.message || err}`)
                    attempt++
                }
            } // End retry loop

            if (!success) {
                console.error(`Giving up on NAICS ${naics} after ${maxRetries} attempts.`)
            }
        }

        // DIAGNOSTICS: Check total DB count
        const { count: totalInDb } = await supabaseAdmin
            .from('opportunities')
            .select('*', { count: 'exact', head: true })

        const reportText = `
INGESTION REPORT (V1.013)
========================
Time: ${new Date().toISOString()}
Total Records in DB: ${totalInDb || 0}
Status: ${insertedCount > 0 ? 'SUCCESS' : 'NO RECORDS ADDED'}
Processed (Scanned): ${processedCount}
Successfully Added/Updated: ${insertedCount}

ORGANIZATION: ${orgName}
NAICS CHECKED: ${targetNaics.join(', ')}
STATES FILTERED (UI): ${targetStates.join(', ')}

ERRORS:
${globalErrors.length > 0 ? globalErrors.join('\n') : 'None'}

STATE DISTRIBUTION (OFFICE):
${Object.entries(stateDistribution).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
`.trim();

        return NextResponse.json({
            success: true,
            version: "V1.013",
            processed: processedCount,
            inserted: insertedCount,
            total_in_db: totalInDb,
            report_text: reportText,
            debug: {
                org: orgName,
                naics_used: targetNaics,
                states_used: targetStates,
                states_passed_to_api: false,
                geo_filter_skipped: skipGeoFilter,
                state_distribution: stateDistribution,
                naics_checked: targetNaics.length,
                last_url_masked: apiKey ? `...${apiKey.slice(-4)}` : 'MISSING',
                sample_response_keys: (rawDebug?.opportunitiesData && rawDebug.opportunitiesData.length > 0) ? Object.keys(rawDebug.opportunitiesData[0] || {}) : [],
                raw_response_preview: rawDebug ? (JSON.stringify(rawDebug).slice(0, 1000) + '...') : "Null",
                range: { postedFrom, postedTo },
                errors: globalErrors,
                dry_run: false
            }
        })

    } catch (err: unknown) {
        console.error('SAM Ingestion Error:', err)
        return NextResponse.json({ error: (err as Error).message, version: "V1.013-ERROR" }, { status: 500 })
    }
}
