import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { generateDailyDigestHtml } from '@/lib/email/templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export const maxDuration = 300

export async function GET() {
    try {
        // 1. Fetch High Score Opportunities not yet notified
        // We join opportunities with ai_analysis
        // Since Supabase JS client doesn't do deep joins easily without defined relationships,
        // we use the syntax: select('*, ai_analysis!inner(*)') to filter on joined table
        const { data: opportunities, error } = await supabaseAdmin
            .from('opportunities')
            .select('*, ai_analysis!inner(*)')
            .gte('ai_analysis.pwin_score', 70)
            .eq('ai_analysis.notification_sent', false)
            .limit(20) // Cap to avoid email size limits

        if (error) {
            console.error('Fetch error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!opportunities || opportunities.length === 0) {
            return NextResponse.json({ message: 'No new high-score opportunities found.' })
        }

        // 2. Generate Email
        const html = generateDailyDigestHtml(opportunities)

        // 3. Send Email
        // Fetch user email from profile? Or hardcoded for now.
        // We'll send to a configured email or the first user found.
        // const { data: profile } = await supabaseAdmin.from('user_profiles').select('email').limit(1).single() 
        // Actually user_profiles schema I created didn't have 'email', it has 'id' ref auth.users.
        // We can't easily get email from auth.users via public API without Supabase Admin Auth Client.
        // For V0, I'll use a hardcoded env var or a placeholder.
        const targetEmail = process.env.TARGET_EMAIL || 'user@example.com'

        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'AFOIS Intel <intel@resend.dev>', // Update with verified domain
                to: targetEmail,
                subject: `Daily Intel: ${opportunities.length} High-Value Opportunities Found`,
                html: html
            })
        } else {
            console.log('Resend Key missing, skipping email send. Content length:', html.length)
        }

        // 4. Mark as Sent
        // const opIds = opportunities.map(o => o.id)
        // We need to update ai_analysis table
        // Can't do bulk update with simple filters easily in one go unless we iterate or use RPC.
        // We'll iterate for simplicity in V0.
        for (const op of opportunities) {
            await supabaseAdmin
                .from('ai_analysis')
                .update({ notification_sent: true })
                .eq('opportunity_id', op.id)
        }

        return NextResponse.json({ success: true, count: opportunities.length })

    } catch (err: unknown) {
        console.error('Notification Error:', err)
        return NextResponse.json({ error: (err as Error).message }, { status: 500 })
    }
}
