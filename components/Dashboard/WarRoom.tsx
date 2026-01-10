'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
// import { Badge } from 'lucide-react'
// import { Badge } from "@/components/ui/badge" // Need to build UI components or use simple ones
import Link from 'next/link'
import { format } from 'date-fns'

import { Opportunity, AIAnalysis, OpportunityWithPipeline } from '@/types'

type OpportunityWithAnalysis = Opportunity & { ai_analysis?: AIAnalysis }

export default function WarRoom() {
    type EnhancedOp = OpportunityWithPipeline & { ai_analysis?: AIAnalysis }

    const [opportunities, setOpportunities] = useState<EnhancedOp[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string>('ACTIVE')
    const [segment, setSegment] = useState<'LIVE' | 'RESEARCH'>('LIVE')
    const [sortBy, setSortBy] = useState<'PWIN' | 'DUE_DATE'>('PWIN')
    const [locationFilter, setLocationFilter] = useState<string>('ALL')
    const [orgId, setOrgId] = useState<string | null>(null)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function fetchData() {
        setLoading(true)

        // 1. Get User's Org
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: members } = await supabase
            .from('organization_members')
            .select('org_id')
            .eq('user_id', user.id)
            .limit(1)

        const oid = members?.[0]?.org_id
        setOrgId(oid)

        if (!oid) {
            setLoading(false)
            return
        }

        // 2. Fetch Opportunities + Analysis (Global)
        const { data: opsData } = await supabase
            .from('opportunities')
            .select('*, ai_analysis(*)')
            .order('created_at', { ascending: false })
            .limit(100)

        // 3. Fetch Pipeline Statuses (Org Specific)
        const { data: pipeData } = await supabase
            .from('pipeline_items')
            .select('opportunity_id, status')
            .eq('org_id', oid)

        // 4. Merge
        if (opsData) {
            const merged = opsData.map((op: any) => {
                const pipeItem = pipeData?.find((p: any) => p.opportunity_id === op.id)
                return {
                    ...op,
                    // Use pipeline status if exists, else default to 'POSSIBLE'
                    pipeline_status: (pipeItem?.status || 'POSSIBLE') as any
                }
            })
            setOpportunities(merged)
        }
        setLoading(false)
    }

    async function updateStatus(opId: string, newStatus: string) {
        if (!orgId) return

        // Optimistic
        setOpportunities(prev => prev.map(op =>
            op.id === opId ? { ...op, pipeline_status: newStatus as any } : op
        ))

        // Upsert Pipeline Item
        const { error } = await supabase
            .from('pipeline_items')
            .upsert({
                org_id: orgId,
                opportunity_id: opId,
                status: newStatus
            }, { onConflict: 'org_id, opportunity_id' })

        if (error) {
            console.error('Status update failed', error)
            fetchData() // Revert
        }
    }

    if (loading) return <div className="p-10 text-center animate-pulse">Loading War Room Intelligence...</div>
    if (!orgId) return (
        <div className="p-10 text-center flex flex-col items-center gap-4">
            <p className="text-xl">No Organization Found.</p>
            <p className="text-muted-foreground">You need to join or create an organization to view the War Room.</p>
            <Link href="/config" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md transition">
                Go to Configuration
            </Link>
            <button onClick={fetchData} className="text-sm opacity-50 hover:opacity-100">Retry</button>
        </div>
    )

    // Get unique states from opportunities for filter dropdown
    const availableStates = [...new Set(opportunities.map(op => op.place_of_performance_state || '(No State)'))].sort()

    // 1. Filter
    const filteredOps = opportunities.filter(op => {
        const status = op.pipeline_status || 'POSSIBLE'

        // Location Filter
        if (locationFilter !== 'ALL') {
            const opState = op.place_of_performance_state || '(No State)'
            if (opState !== locationFilter) return false
        }

        // Segment Filter
        if (segment === 'LIVE') {
            // Live Bids: Solicitation, Combined Syn/Sol
            const type = op.type?.toLowerCase() || ''
            if (type.includes('sources sought') || type.includes('presolicitation') || type.includes('special notice')) return false
        } else {
            // Market Research: Sources Sought, Presolicitation, Special
            const type = op.type?.toLowerCase() || ''
            if (!type.includes('sources sought') && !type.includes('presolicitation') && !type.includes('special notice')) return false
        }

        if (statusFilter === 'ACTIVE') return status !== 'NO_BID'
        if (statusFilter === 'ALL') return true
        return status === statusFilter
    })

    // 2. Sort
    const sortedOps = [...filteredOps].sort((a, b) => {
        if (sortBy === 'PWIN') {
            const scoreA = a.ai_analysis?.pwin_score || 0
            const scoreB = b.ai_analysis?.pwin_score || 0
            return scoreB - scoreA
        } else {
            const dateA = a.response_deadline ? new Date(a.response_deadline).getTime() : 9999999999999
            const dateB = b.response_deadline ? new Date(b.response_deadline).getTime() : 9999999999999
            return dateA - dateB
        }
    })

    const statusOptions = ['BID', 'POSSIBLE', 'HOLD', 'NO_BID']
    const filterOptions = ['ACTIVE', 'ALL', ...statusOptions]
    const typeOptions = ['ALL', 'Solicitation', 'Sources Sought']

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-black/40 p-4 rounded-xl border border-white/10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight glow-text">War Room</h1>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{sortedOps.length} Opportunities</span>
                        <span className="text-white/20">|</span>
                        <span>{segment === 'LIVE' ? 'Active Solicitations' : 'Early Market Research'}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-end">
                    {/* Segment Toggle */}
                    <div className="bg-white/5 p-1 rounded-lg flex items-center border border-white/10">
                        <button
                            onClick={() => setSegment('LIVE')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${segment === 'LIVE' ? 'bg-blue-600 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                        >
                            Live Bids
                        </button>
                        <button
                            onClick={() => setSegment('RESEARCH')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${segment === 'RESEARCH' ? 'bg-purple-600 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                        >
                            Market Research
                        </button>
                    </div>

                    <div className="flex items-center bg-white/5 rounded-md p-1 self-start">
                        <span className="text-xs text-muted-foreground px-2">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-transparent text-xs text-white p-1 border-none outline-none cursor-pointer"
                        >
                            <option value="PWIN" className="bg-gray-900 text-white">PWin Score</option>
                            <option value="DUE_DATE" className="bg-gray-900 text-white">Due Date</option>
                        </select>
                    </div>

                    <div className="flex items-center bg-white/5 rounded-md p-1 self-start">
                        <span className="text-xs text-muted-foreground px-2">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-xs text-white p-1 border-none outline-none cursor-pointer"
                        >
                            {filterOptions.map(opt => (
                                <option key={opt} value={opt} className="bg-gray-900 text-white">{opt.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-white/5 rounded-md p-1 self-start">
                        <span className="text-xs text-muted-foreground px-2">Location:</span>
                        <select
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="bg-transparent text-xs text-white p-1 border-none outline-none cursor-pointer"
                        >
                            <option value="ALL" className="bg-gray-900 text-white">All States</option>
                            {availableStates.map(state => (
                                <option key={state} value={state} className="bg-gray-900 text-white">{state}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {sortedOps.map((op) => {
                    const analysis = op.ai_analysis
                    const pwin = analysis?.pwin_score || 0
                    const isHighValue = pwin >= 80
                    const status = op.pipeline_status || 'POSSIBLE'

                    // Extract Fields
                    const raw = op.raw_json as any || {}
                    const city = raw.placeOfPerformance?.city?.name || raw.place_of_performance_city || ''
                    const contact = raw.pointOfContact?.[0]
                    const contactName = contact?.fullName || 'N/A'
                    const contactEmail = contact?.email

                    return (
                        <div key={op.id} className={`glass-panel p-6 rounded-xl transition-all duration-200 hover:bg-white/5 flex flex-col gap-4 ${isHighValue ? 'border-l-4 border-l-green-500' : ''}`}>
                            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                                <div className="flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-xl font-bold ${isHighValue ? 'text-green-400' : 'text-blue-400'}`}>{pwin}% PWin</span>
                                        <span className="text-xs px-2 py-1 bg-white/10 rounded-full border border-white/10">{op.source}</span>
                                        <div className="flex items-center space-x-1 ml-2">
                                            {statusOptions.map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => updateStatus(op.id, s)}
                                                    className={`text-[10px] px-2 py-0.5 rounded border border-white/5 transition-colors ${status === s
                                                        ? (s === 'BID' ? 'bg-green-500 text-black border-green-500' : s === 'NO_BID' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-white/20 text-white')
                                                        : 'text-muted-foreground hover:bg-white/10'}`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <Link href={`/opportunities/${op.id}`} className="block group">
                                        <h3 className="text-xl font-semibold group-hover:text-blue-400 transition-colors">{op.title}</h3>
                                    </Link>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
                                        <div><span className="block text-xs uppercase tracking-wider opacity-50">Type</span><span className={`text-foreground font-medium ${op.type === 'Sources Sought' ? 'text-purple-400' : ''}`}>{op.type || 'Solicitation'}</span></div>
                                        <div><span className="block text-xs uppercase tracking-wider opacity-50">Agency</span><span className="text-foreground">{op.agency}</span></div>
                                        <div><span className="block text-xs uppercase tracking-wider opacity-50">Set-Aside</span><span className="text-foreground">{op.set_aside || 'None'}</span></div>
                                        <div><span className="block text-xs uppercase tracking-wider opacity-50">Location</span><span className="text-foreground">{city ? `${city}, ` : ''}{op.place_of_performance_state || 'N/A'}</span></div>
                                        <div>
                                            <span className="block text-xs uppercase tracking-wider opacity-50">Contact(s)</span>
                                            <div className="flex flex-col">
                                                <span className="text-foreground truncate block text-sm" title={contact?.email}>
                                                    {contactName}
                                                </span>
                                                {raw.pointOfContact && raw.pointOfContact.length > 1 && (
                                                    <span className="text-xs text-muted-foreground truncate block" title={raw.pointOfContact[1].email}>
                                                        APOC: {raw.pointOfContact[1].fullName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:text-right text-sm text-muted-foreground min-w-[140px] flex flex-col justify-between h-full">
                                    <div>
                                        <div className="text-xs uppercase tracking-wider opacity-50 mb-1">Bid Due Date</div>
                                        <div className={`font-medium text-lg ${op.response_deadline && new Date(op.response_deadline) < new Date() ? 'text-red-400' : 'text-foreground'}`}>
                                            {op.response_deadline ? format(new Date(op.response_deadline), 'MMM dd, yyyy') : 'No Date'}
                                        </div>

                                        <div className="mt-4">
                                            <div className="text-xs uppercase tracking-wider opacity-50 mb-1">Site Visit Date</div>
                                            <div className="font-medium text-lg text-foreground">
                                                {op.site_visit_date ? format(new Date(op.site_visit_date), 'MMM dd, yyyy') : 'No Date'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-xs opacity-50 font-mono">Status: {status}</div>
                                </div>
                            </div >
                        </div >
                    )
                })}
                {
                    filteredOps.length === 0 && (
                        <div className="p-10 text-center text-muted-foreground glass-panel rounded-xl">
                            No active opportunities found. Check "All" or run ingestion.
                        </div>
                    )
                }
            </div >
        </div >
    )
}
