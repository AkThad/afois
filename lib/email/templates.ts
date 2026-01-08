import { Opportunity, AIAnalysis } from '@/types'

type OpWithAnalysis = Opportunity & { ai_analysis?: AIAnalysis }

export function generateDailyDigestHtml(opportunities: OpWithAnalysis[]) {
  const opsList = opportunities.map(op => {
    const pwin = op.ai_analysis?.pwin_score || 0
    const rec = op.ai_analysis?.recommendation || 'N/A'
    const summary = op.ai_analysis?.summary || 'No summary available.'

    return `
      <div style="border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #111827;">${op.title} (${pwin}% PWin)</h3>
        <p style="color: #4b5563; font-size: 14px;"><strong>Agency:</strong> ${op.agency} | <strong>Notice ID:</strong> ${op.notice_id}</p>
        <p style="color: #4b5563; font-size: 14px;"><strong>Set Aside:</strong> ${op.set_aside || 'None'}</p>
        <div style="margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
          <strong>AI Analysis (${rec}):</strong>
          <p style="margin: 5px 0 0;">${summary}</p>
        </div>
        <a href="https://sam.gov/opp/${op.notice_id}/view" style="color: #2563eb; text-decoration: none; font-size: 14px;">View on SAM.gov</a>
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: sans-serif; color: #374151; line-height: 1.5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { margin-bottom: 30px; }
          .footer { margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #1f2937;">Daily Opportunity Digest</h1>
            <p>Here are the high-potential opportunities identified for you today.</p>
          </div>
          
          ${opsList}
          
          <div class="footer">
            <p>Powered by AFOIS AI</p>
          </div>
        </div>
      </body>
    </html>
  `
}
