'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'

import { Opportunity, AIAnalysis } from '@/types'

type OpportunityDetail = Opportunity & { ai_analysis: AIAnalysis }

export default function OpportunityDetail() {
    const params = useParams()
    const { id } = params

    const [op, setOp] = useState<OpportunityDetail | null>(null)
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        async function loadOp() {
            const { data } = await supabase
                .from('opportunities')
                .select(`*, ai_analysis(*)`)
                .eq('id', id)
                .single()

            setOp(data)
            setLoading(false)
        }
        if (id) loadOp()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Opportunity Intelligence...</div>
    if (!op) return <div className="p-10 text-center">Opportunity not found.</div>

    const analysis = op.ai_analysis || {}
    const incumbentData = analysis.incumbent_data || {}
    const raw = op.raw_json as any || {}

    // Extract New Fields
    const contact = raw.pointOfContact?.[0]
    const contactName = contact?.fullName || 'N/A'
    const contactEmail = contact?.email || 'N/A'
    const city = raw.placeOfPerformance?.city?.name || raw.place_of_performance_city || ''
    const description = raw.description || 'No description provided.'
    const noticeType = raw.type || 'Solicitation'
    const naics = op.naics_code || 'N/A'

    return (
        <div className="container mx-auto py-10 px-4 md:px-6 grid gap-6 md:grid-cols-3">
            {/* Left Column: Details */}
            <div className="md:col-span-2 space-y-6">
                <div className="glass-panel p-6 rounded-xl space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <span className="text-xs font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded mb-2 inline-block">
                                {noticeType} • ID: {op.notice_id}
                            </span>
                            <h1 className="text-2xl font-bold leading-tight">{op.title}</h1>
                            <div className="mt-2 text-sm text-blue-300">
                                Agency: {op.agency}
                            </div>
                        </div>
                        <div className="text-right min-w-[120px]">
                            <div className="mb-4">
                                <div className="text-xs uppercase tracking-wider text-muted-foreground">Bid Due Date</div>
                                <div className={`text-xl font-bold ${op.response_deadline && new Date(op.response_deadline) < new Date() ? 'text-red-400' : 'text-foreground'}`}>
                                    {op.response_deadline ? format(new Date(op.response_deadline), 'MMM dd, yyyy') : 'No Date'}
                                </div>
                            </div>

                            <div>
                                <div className="text-xs uppercase tracking-wider text-muted-foreground">Site Visit Date</div>
                                <div className="text-xl font-bold text-foreground">
                                    {op.site_visit_date ? format(new Date(op.site_visit_date), 'MMM dd, yyyy') : 'No Date'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm border-t border-white/10 pt-6">
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Set Aside</span>
                            <span className="font-medium">{op.set_aside || 'None'}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Contact</span>
                            <span className="font-medium block truncate" title={contactEmail}>{contactName}</span>
                            <span className="text-xs text-muted-foreground truncate block" title={contactEmail}>{contactEmail}</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Description / Scope of Work</h3>
                        <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap font-mono bg-black/20 p-4 rounded-lg border border-white/5 max-h-[400px] overflow-y-auto">
                            {description}
                        </div>
                    </div>

                    <div className="pt-2">
                        <a href={`https://sam.gov/opp/${op.notice_id}/view`} target="_blank" className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                            View Official Solicitation on SAM.gov
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                    </div>
                </div>

                {/* AI Analysis Block */}
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-purple-500">
                    <h2 className="text-xl font-semibold mb-4 glow-text">AI Analyst Report</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-purple-300">Executive Summary</h3>
                            <p className="text-sm mt-1 leading-relaxed">{analysis.summary || 'Analysis pending...'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-lg">
                            <div>
                                <span className="block text-xs uppercase tracking-wider text-muted-foreground">Recommendation</span>
                                <span className={`text-lg font-bold ${analysis.recommendation === 'PURSUE' ? 'text-green-400' :
                                    analysis.recommendation === 'PARTNER' ? 'text-yellow-400' : 'text-red-400'
                                    }`}>
                                    {analysis.recommendation || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="block text-xs uppercase tracking-wider text-muted-foreground">Bonding Status</span>
                                <span className="font-medium">{analysis.bonding_status || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Key Stats & Incumbent */}
            <div className="space-y-6">
                <div className="glass-panel p-6 rounded-xl text-center">
                    <div className="text-sm text-muted-foreground uppercase tracking-widest mb-2">My Probability of Win</div>
                    <div className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                        {analysis.pwin_score || 0}%
                    </div>
                </div>

                <CompetitiveLandscape naics={naics} />

                <Link href={`/opportunities/${op.id}/capability`} className="block w-full">
                    <button className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition shadow-lg shadow-white/10">
                        Draft Capability Statement
                    </button>
                </Link>
            </div>
        </div>
    )
}

function CompetitiveLandscape({ naics }: { naics: string }) {
    const [competitors, setCompetitors] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)

    async function loadCompetitors() {
        setLoading(true)
        try {
            const res = await fetch('/api/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ naics })
            })
            const data = await res.json()
            if (data.competitors) {
                setCompetitors(data.competitors)
            }
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
        setLoaded(true)
    }

    if (!loaded) {
        return (
            <div className="glass-panel p-6 rounded-xl space-y-4">
                <h3 className="font-semibold text-lg">Competitive Landscape</h3>
                <p className="text-sm text-muted-foreground">Analyze top performers in NAICS {naics}.</p>
                <button
                    onClick={loadCompetitors}
                    disabled={loading}
                    className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm transition"
                >
                    {loading ? 'Analyzing Market...' : 'Load Competitor Intelligence'}
                </button>
            </div>
        )
    }

    return (
        <div className="glass-panel p-6 rounded-xl space-y-6">
            <h3 className="font-semibold text-lg">Top Competitors (NAICS {naics})</h3>
            {competitors.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data found.</div>
            ) : (
                <div className="space-y-6">
                    {competitors.map((comp, idx) => (
                        <div key={idx} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-bold text-white">{comp.name}</div>
                                <div className="text-xs text-green-400 font-mono">
                                    ${(comp.total_obligated_amount / 1000000).toFixed(1)}M Won
                                </div>
                            </div>

                            {comp.recent_awards && comp.recent_awards.length > 0 && (
                                <div className="space-y-2 mt-3">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recent Similar Wins</div>
                                    {comp.recent_awards.map((award: any, i: number) => (
                                        <div key={i} className="bg-white/5 p-2 rounded text-xs space-y-1">
                                            <div className="font-medium text-blue-200 line-clamp-1" title={award.Description}>
                                                {award.Description || 'No description'}
                                            </div>
                                            <div className="flex justify-between text-muted-foreground font-mono text-[10px]">
                                                <span>{award['Awarding Agency']}</span>
                                                <span>{new Date(award['Action Date']).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
