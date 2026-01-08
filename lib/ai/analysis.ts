import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Opportunity } from '@/types'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function analyzeOpportunity(opportunity: Opportunity, incumbentData: Record<string, unknown>) {
    try {
        // 1. Fetch User Profile for Bonding Limit
        // For V0, we assume one main profile or use a default.
        // Ideally we pass the user ID or use a specific company profile.
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('bonding_capacity, company_name, qualified_set_asides')
            .single()

        // Default to $10M if not set
        const bondingLimit = profile?.bonding_capacity || 10000000
        const companyName = profile?.company_name || "IPS, Inc."
        const capabilities = profile?.qualified_set_asides?.join(', ') || "8A"

        // 2. Construct System Prompt
        const systemPrompt = `You are a specialized Bid/No-Bid Analyst for ${companyName}, a construction and logistics firm.
    
Our Capabilities: Remote Arctic construction, Oil & Gas support structures (PEMB/PEFB), Logistics management.
Our Certifications/Set-Asides: ${capabilities}.
Our Constraints: Bonding limit is $${bondingLimit.toLocaleString()} (for Prime contracts only).

CRITICAL INSTRUCTION: You must ONLY consider the "Certifications/Set-Asides" listed above. Do NOT assume we have others (like 8(a) or SDVOSB) unless explicitly listed. If the opportunity requires a set-aside we do not have, you MUST lower the PWin Score significantly and recommend PARTNER or PASS.

Your Task: Analyze the provided solicitation JSON and Incumbent Data.
1. Extract: Summary, Key Requirements, Place of Performance (if ambiguous).
2. Evaluate: Assign a PWin Score (0-100) based on alignment with our capabilities and certifications (8a/IEE/ISBEE are high value).
3. Bonding Check: If estimated value > Bonding Limit ($${bondingLimit.toLocaleString()}), mark result as 'Refer to Partners' (Analysis Recommendation) unless it is a Subcontract.
   - Note: Estimated value might need to be inferred from description or similar awards. If unknown, assume within limit unless clearly large (e.g. >$20M).
4. Recommendation: Output one of: "PURSUE", "PARTNER", "PASS".

Output Format: REQUIRED JSON.
{
  "summary": "High level summary...",
  "pwin_score": 85,
  "recommendation": "PURSUE",
  "bonding_status": "OK" | "EXCEEDS" | "N/A",
  "reasoning": "Why this score..."
}`

        // 3. User Message
        const userMessage = JSON.stringify({
            opportunity: opportunity,
            incumbent_context: incumbentData
        })

        // 4. Call Claude
        const msg = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                { role: "user", content: userMessage }
            ]
        })

        // 5. Parse Response
        const textBlock = msg.content[0]
        if (textBlock.type !== 'text') throw new Error('Unexpected response type')

        const responseText = textBlock.text
        // Extract JSON if wrapped in markdown
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText

        const analysis = JSON.parse(jsonStr)

        // 6. Save to DB
        const { error } = await supabaseAdmin
            .from('ai_analysis')
            .upsert({
                opportunity_id: opportunity.id,
                summary: analysis.summary,
                pwin_score: analysis.pwin_score,
                recommendation: analysis.recommendation,
                bonding_status: analysis.bonding_status,
                incumbent_data: incumbentData // Ensure this is synced
                // analyzed_at updates automatically via default? Or need to set? default is now()
            }, { onConflict: 'opportunity_id' })

        if (error) {
            console.error('Error saving analysis:', error)
            return { error }
        }

        return { success: true, analysis }

    } catch (err: unknown) {
        console.error('AI Analysis Error:', err)
        return { error: (err as Error).message }
    }
}
