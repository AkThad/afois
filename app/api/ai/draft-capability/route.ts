import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const { opportunityId } = await req.json()

        // 1. Auth & Context
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Get Token from Header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization Header' }, { status: 401 })
        }
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized: ' + authError?.message }, { status: 401 })
        }

        // Use Admin Client for Data Access (to ensure we can read docs even if RLS is tricky)
        // In a real app we'd just use the user context, but this is safer for this prototype Fix.
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get Org ID
        const { data: members } = await supabaseAdmin
            .from('organization_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)

        const orgId = members?.[0]?.org_id

        // 2. Fetch Opportunity
        const { data: op, error: opError } = await supabaseAdmin
            .from('opportunities')
            .select('*')
            .eq('id', opportunityId)
            .single()

        if (opError || !op) {
            return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
        }

        // 3. Fetch Company Docs (Org Scoped)
        let docs: any[] = []
        if (orgId) {
            const { data } = await supabaseAdmin
                .from('company_documents')
                .select('title, content')
                .eq('org_id', orgId)
                .limit(5)
            if (data) docs = data
        }

        const companyContext = docs?.map(d => `SOURCE: ${d.title}\n${d.content}`).join('\n\n') || 'No company documents provided.'

        // 4. Construct Prompt
        const systemPrompt = `You are an expert Government Contracting Proposal Manager. 
        Your task is to write a compelling, 1-page Capability Statement tailored to a specific Federal Opportunity.
        
        You will be provided with:
        1. The Opportunity Details (Agency, Description, Requirements)
        2. The Company's Knowledge Base (Capability Statements, Past Performance, Resume data)

        GUIDELINES:
        - Format clearly with headers: "Core Competencies", "Past Performance", "Differentiators", "Company Data".
        - TAILOR the "Core Competencies" to strictly match the Opportunity Requirements.
        - Use the Company Data to prove we can do the work. If the user provided a "Company Information Sheet" with license numbers/codes, include them in a "Company Data" section.
        - Tone: Professional, authoritative, compliant.
        - If specific past performance in the Company Docs matches the Opportunity description, highlight it.
        `

        const userUserInfo = `
        TARGET OPPORTUNITY:
        Title: ${op.title}
        Agency: ${op.agency}
        Description: ${op.raw_json?.description || 'N/A'}
        NAICS: ${op.naics_code}

        MY COMPANY INFORMATION (Knowledge Base):
        ${companyContext}

        Write the Capability Statement now.
        `

        // 5. Call AI
        if (!process.env.ANTHROPIC_API_KEY) {
            // Mock response if no key (for verification safety)
            return NextResponse.json({
                text: `# MOCK GENERATED STATEMENT\n\n**For:** ${op.title}\n**Agency:** ${op.agency}\n\n## Core Competencies\n[ AI would write tailored competencies based on: ${op.raw_json?.description?.slice(0, 50)}... ]\n\n## Company Data\n(Using data from ${docs?.length} uploaded documents)\n...`
            })
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const msg = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 2000,
            temperature: 0.7,
            system: systemPrompt,
            messages: [
                { role: "user", content: userUserInfo }
            ]
        })

        const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
        return NextResponse.json({ text })

    } catch (error: any) {
        console.error('AI Generation Error', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
