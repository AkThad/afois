'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CapabilityDrafter() {
    const params = useParams()
    const router = useRouter()
    const { id } = params
    const [op, setOp] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [statement, setStatement] = useState('')

    const supabase = createClient()

    useEffect(() => {
        async function loadData() {
            const { data } = await supabase.from('opportunities').select('*').eq('id', id).single()
            setOp(data)
            setStatement(`DRAFT CAPABILITY STATEMENT\n\nRE: ${data.title} (${data.solicitation_number || 'N/A'})\nAgency: ${data.agency}\n\n[Company Name] is pleased to submit this capability statement...`)
            setLoading(false)
        }
        if (id) loadData()
    }, [id])

    const [generating, setGenerating] = useState(false)

    async function handleGenerate() {
        setGenerating(true)
        setStatement('Checking Company Knowledge Base and generating draft...')

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            if (!token) {
                setStatement('Error: Not authenticated (No token found).')
                setGenerating(false)
                return
            }

            const res = await fetch('/api/ai/draft-capability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ opportunityId: id })
            })
            const data = await res.json()
            if (data.text) {
                setStatement(data.text)
            } else {
                setStatement('Error: ' + (data.error || 'Unknown error occurred.'))
            }
        } catch (err) {
            console.error(err)
            setStatement('System error during generation.')
        }
        setGenerating(false)
    }

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Drafter...</div>
    if (!op) return <div className="p-10">Opportunity not found</div>

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Link href={`/opportunities/${id}`} className="text-sm text-muted-foreground hover:text-white mb-2 block">
                        &larr; Back to Opportunity
                    </Link>
                    <h1 className="text-2xl font-bold">Draft Capability Statement</h1>
                    <div className="text-purple-400 text-sm">Target: {op.title}</div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {generating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {generating ? 'AI Writing...' : 'Generate with AI'}
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 h-[70vh]">
                {/* Context Column */}
                <div className="hidden md:block glass-panel p-4 rounded-xl overflow-y-auto text-sm text-muted-foreground space-y-4">
                    <h3 className="font-semibold text-white uppercase tracking-wider text-xs">Opportunity Context</h3>

                    <div>
                        <div className="text-xs opacity-50">Scope</div>
                        <div className="line-clamp-6 hover:line-clamp-none transition-all">
                            {op.raw_json?.description || 'No description'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs opacity-50">Agency</div>
                        <div>{op.agency}</div>
                    </div>
                </div>

                {/* Editor Column */}
                <div className="md:col-span-2 flex flex-col gap-4">
                    <div className="flex-1 glass-panel p-1 rounded-xl border border-white/10 flex flex-col">
                        <textarea
                            className="flex-1 w-full bg-transparent p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                            value={statement}
                            onChange={(e) => setStatement(e.target.value)}
                            placeholder="Start writing or generate..."
                        />
                    </div>
                    <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl">
                        <span className="text-xs text-muted-foreground">Autosaved just now</span>
                        <div className="flex gap-2">
                            <button className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">
                                Save Draft
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
