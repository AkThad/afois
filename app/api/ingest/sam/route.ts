import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TARGET_NAICS, TARGET_STATES } from '@/lib/ingest/constants'
import { subDays, format } from 'date-fns'

export const maxDuration = 300 // 5 minutes for Edge/Node functions (if supported by plan)

export async function GET() {
    try {
        const apiKey = process.env.SAM_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'SAM_API_KEY not configured' }, { status: 500 })
        }

        // T-365 days (1 Year) to catch active-but-older ops
        const postedFrom = format(subDays(new Date(), 365), 'MM/dd/yyyy')
        const postedTo = format(new Date(), 'MM/dd/yyyy')

        let processedCount = 0
        let insertedCount = 0

        // Helper for delay
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

        for (const naics of TARGET_NAICS) {
            let attempt = 0
            let success = false
            const maxRetries = 3

            while (attempt < maxRetries && !success) {
                try {
                    // Base rate limit protection (3s) plus exponential backoff on retries
                    const waitTime = 3000 + (attempt * 5000)
                    if (attempt > 0) console.log(`Retry attempt ${attempt} for NAICS ${naics}. Waiting ${waitTime}ms...`)
                    await delay(waitTime)

                    const url = `https://api.sam.gov/prod/opportunities/v2/search?api_key=${apiKey}&postedFrom=${postedFrom}&postedTo=${postedTo}&limit=1000&ncode=${naics}`
                    const res = await fetch(url)

                    if (!res.ok) {
                        if (res.status === 429) {
                            console.warn(`Rate Limit Hit for NAICS ${naics} (Attempt ${attempt + 1}/${maxRetries})`)
                            attempt++
                            continue // Loop to retry
                        }
                        // Other errors: log and skip this NAICS
                        console.error(`Failed to fetch SAM for NAICS ${naics}: ${res.statusText}`)
                        break
                    }

                    const data = await res.json()
                    const opportunities = data.opportunities || []
                    success = true // Mark as successful to exit retry loop

                    for (const op of opportunities) {
                        processedCount++

                        const setAside = op.typeOfSetAside || op.typeOfSetAsideDescription || ''

                        // 2. Place of Performance Filter
                        const popState = op.placeOfPerformance?.state?.code || ''
                        const popCountry = op.placeOfPerformance?.country?.code || ''

                        const isGeoMatch =
                            TARGET_STATES.includes(popState) ||
                            (popCountry === 'MEX') ||
                            !popState || // Null
                            popState.toLowerCase() === 'multiple' ||
                            op.placeOfPerformance?.city?.name?.toLowerCase() === 'multiple' // Sometimes "Multiple" is in city

                        if (!isGeoMatch) {
                            continue
                        }

                        // Insert into DB
                        const { error } = await supabaseAdmin
                            .from('opportunities')
                            .upsert({
                                source: 'SAM',
                                notice_id: op.noticeId,
                                title: op.subject,
                                agency: op.departmentName || op.agency || 'Unknown',
                                solicitation_number: op.solicitationNumber,
                                naics_code: naics,
                                set_aside: setAside,
                                type: op.type || 'Solicitation',
                                posted_date: op.postedDate,
                                response_deadline: op.responseDeadLine,
                                site_visit_date: null,
                                place_of_performance_state: popState,
                                raw_json: op
                            }, { onConflict: 'notice_id' })

                        if (error) {
                            console.error('Error inserting opportunity:', error)
                        } else {
                            insertedCount++
                        }
                    }

                } catch (err) {
                    console.error(`Exception fetching NAICS ${naics}:`, err)
                    attempt++
                }
            } // End retry loop

            if (!success) {
                console.error(`Giving up on NAICS ${naics} after ${maxRetries} attempts.`)
            }
        }

        return NextResponse.json({
            success: true,
            processed: processedCount,
            inserted: insertedCount,
            debug: {
                naics_checked: TARGET_NAICS.length,
                last_url_masked: `...${apiKey.slice(-4)}&ncode=${TARGET_NAICS[0]}`,
                sample_response_keys: processedCount === 0 ? "No ops found" : "Ops found",
                range: { postedFrom, postedTo }
            }
        })

    } catch (err: unknown) {
        console.error('SAM Ingestion Error:', err)
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
