import { supabaseAdmin } from "@/lib/supabase/admin"
import { subYears, format } from "date-fns"

export async function processUSASpending(opportunityId: string, noticeId: string, naicsCode: string, agencyName: string) {
    try {
        // 1. Prepare Filters
        // USASpending API v2/search/spending_by_award/
        // We look for Contracts (A) in the last 24 months
        const startDate = format(subYears(new Date(), 2), 'yyyy-MM-dd')
        const endDate = format(new Date(), 'yyyy-MM-dd')

        // Agency mapping is complex. We'll use Keyword search with Agency Name + NAICS.
        // Ideally we'd use agency IDs, but we don't have a mapping table yet.

        // We try to find "Incumbent" by searching for similar keywords in descriptions or titles?
        // Or just look for recent awards in this NAICS + Agency to see "Potential Competitors".

        // Payload for USASpending
        const payload = {
            filters: {
                time_period: [
                    {
                        start_date: startDate,
                        end_date: endDate
                    }
                ],
                award_type_codes: ["A", "B", "C", "D"], // Contracts
                naics_codes: [naicsCode],
                keywords: [agencyName], // Filter by agency name as keyword if ID not known
                // recipients: [] // We want to Find recipients
            },
            fields: [
                "Award ID",
                "Recipient Name",
                "Start Date",
                "End Date",
                "Award Amount",
                "Description",
                "Awarding Agency"
            ],
            limit: 10,
            page: 1,
            sort: "Award Amount",
            order: "desc"
        }

        const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            const txt = await res.text()
            console.error('USASpending API Error:', txt)
            return { error: txt }
        }

        const data = await res.json()
        const awards = data.results || []

        const potentialCompetitors = awards.map((a: Record<string, unknown>) => a['Recipient Name'])
        // Simple logic: The top winner is the "Incumbent" or "Top Competitor"
        const topCompetitor = potentialCompetitors[0] || 'Unknown'

        const incumbentData = {
            identified_incumbent: topCompetitor,
            potential_competitors: [...new Set(potentialCompetitors)],
            recent_awards: awards
        }

        // 2. Store in ai_analysis (create or update)
        // We upsert
        const { error } = await supabaseAdmin
            .from('ai_analysis')
            .upsert({
                opportunity_id: opportunityId,
                incumbent_data: incumbentData,
                // We preserve other fields if they exist? upsert replaces unless we merge. 
                // But here we might be creating the record if analysis hasn't run.
                // Better to check if exists or use direct update.
            }, { onConflict: 'opportunity_id' })

        if (error) {
            // If partial update not supported by upsert (it overwrites nulls), we might lose pwin if it was there.
            // However, the prompt says "Pass to AI... Store... in ai_analysis".
            // Ingestion happens BEFORE AI? Or parallel?
            // Usually: Ingest SAM -> Ingest USASpending -> Trigger AI.
            // If AI hasn't run, pwin is null, which is fine.
            console.error('Error saving incumbent data', error)
            return { error }
        }

        return { success: true, data: incumbentData }

    } catch (err: unknown) {
        console.error('USASpending Logic Error:', err)
        return { error: (err as Error).message }
    }
}
