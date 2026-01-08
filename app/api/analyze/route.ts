import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { analyzeOpportunity } from '@/lib/ai/analysis'

export const maxDuration = 300

export async function POST(request: Request) {
    try {
        const { opportunity_id } = await request.json()

        if (!opportunity_id) {
            return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 })
        }

        // Fetch opportunity and ANY existing incumbent data
        // (Note: we might have fetched incumbent data in step 2. If it's in ai_analysis, fetch it. If not, pass null).
        // Actually our schema puts incumbent_data in ai_analysis. So we check if there's an entry.
        const { data: op, error: opError } = await supabaseAdmin
            .from('opportunities')
            .select('*')
            .eq('id', opportunity_id)
            .single()

        if (opError || !op) {
            return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
        }

        const { data: existingAnalysis } = await supabaseAdmin
            .from('ai_analysis')
            .select('incumbent_data')
            .eq('opportunity_id', opportunity_id)
            .single()

        const incumbentData = existingAnalysis?.incumbent_data || {}

        const result = await analyzeOpportunity(op, incumbentData)

        return NextResponse.json(result)

    } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
