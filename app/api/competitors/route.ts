import { NextRequest, NextResponse } from 'next/server'
import { subMonths, format } from 'date-fns'

// USASpending API Base URL
const BASE_URL = 'https://api.usaspending.gov/api/v2'

export async function POST(req: NextRequest) {
    try {
        const { naics } = await req.json()

        if (!naics) {
            return NextResponse.json({ error: 'NAICS code is required' }, { status: 400 })
        }

        // 1. Define Time Period (Last 12 Months)
        const endDate = new Date()
        const startDate = subMonths(endDate, 12)
        const timePeriod = [{
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd')
        }]

        // 2. Fetch Top Recipients (Competitors) for this NAICS
        const categoryRes = await fetch(`${BASE_URL}/search/spending_by_category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                category: 'recipient_duns', // Use recipient_duns for better grouping
                filters: {
                    time_period: timePeriod,
                    naics_codes: [naics],
                    award_type_codes: ['A', 'B', 'C', 'D'] // Contracts only
                },
                limit: 5,
                page: 1
            })
        })

        if (!categoryRes.ok) {
            const errText = await categoryRes.text()
            console.error('USASpending Search Error:', errText)
            throw new Error(`USASpending Category API Error: ${categoryRes.status} ${categoryRes.statusText}`)
        }

        const categoryData = await categoryRes.json()
        const topCompetitors = categoryData.results || []

        // 3. For Top 3, Fetch Recent Awards
        const detailedCompetitors = await Promise.all(topCompetitors.slice(0, 3).map(async (comp: any) => {
            // comp.name works even for recipient_duns category, as verified by documentation
            const competitorName = comp.name

            // Endpoint: /search/spending_by_award
            const awardRes = await fetch(`${BASE_URL}/search/spending_by_award`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filters: {
                        recipient_search_text: [competitorName], // Search by name
                        naics_codes: [naics],
                        time_period: timePeriod,
                        award_type_codes: ['A', 'B', 'C', 'D'] // REQUIRED FIELD
                    },
                    fields: [
                        "Award ID",
                        "Description",
                        "Award Amount",
                        "Action Date",
                        "Awarding Agency"
                    ],
                    limit: 3,
                    page: 1,
                    sort: "Action Date",
                    order: "desc"
                })
            })

            let recentAwards = []
            if (awardRes.ok) {
                const awardData = await awardRes.json()
                recentAwards = awardData.results || []
            } else {
                console.error('Award Search Failed', await awardRes.text())
            }

            return {
                name: competitorName,
                total_obligated_amount: comp.amount,
                recent_awards: recentAwards
            }
        }))

        return NextResponse.json({
            naics,
            competitors: detailedCompetitors
        })

    } catch (error: any) {
        console.error('Competitor Fetch Error:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch competitor data' }, { status: 500 })
    }
}
