import { NextResponse } from 'next/server'
import { supabaseAdmin } from "@/lib/supabase/admin"
import { processUSASpending } from "@/lib/ingest/usaspending"

export const maxDuration = 300

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { opportunity_id } = body

        if (!opportunity_id) {
            // Optional: Process batch of pending
            return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 })
        }

        // Fetch opportunity details
        const { data: op, error } = await supabaseAdmin
            .from('opportunities')
            .select('notice_id, naics_code, agency, title')
            .eq('id', opportunity_id)
            .single()

        if (error || !op) {
            return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
        }

        const result = await processUSASpending(
            opportunity_id,
            op.notice_id,
            op.naics_code,
            op.agency
        )

        return NextResponse.json(result)

    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
