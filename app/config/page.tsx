'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

import { useRouter } from 'next/navigation'
import { Organization } from '@/types'

import { TIER_1_SET_ASIDES, TIER_2_SET_ASIDES } from '@/lib/ingest/constants'

// Combine for selection
const ALL_SET_ASIDES = ['None', ...TIER_1_SET_ASIDES, ...TIER_2_SET_ASIDES]

export default function ConfigPage() {
    const [loading, setLoading] = useState(true)
    const [org, setOrg] = useState<Organization | Partial<Organization>>({})
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')
    const [orgId, setOrgId] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function loadOrg() {
            // 1. Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            console.log('Config Page Auth Check:', user, authError)

            if (!user) {
                // router.push('/login')
                setMsg('DEBUG: No User Found. Auth Error: ' + (authError?.message || 'None'))
                setLoading(false)
                return
            }

            // 2. Get Org Membership
            const { data: members, error } = await supabase
                .from('organization_members')
                .select('org_id')
                .eq('user_id', user.id)
                .limit(1)

            if (members && members.length > 0) {
                const oid = members[0].org_id
                setOrgId(oid)
                // 3. Get Organization Details
                const { data: orgData } = await supabase.from('organizations').select('*').eq('id', oid).single()
                if (orgData) setOrg(orgData)
            } else {
                setMsg('No Organization found.')
            }
            setLoading(false)
        }
        loadOrg()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function createOrganization() {
        setSaving(true)

        // Debug: Check User right before RPC
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setMsg('Error: No active session. Please Sign Out and Sign In again.')
            setSaving(false)
            return
        }

        const { data: newOrg, error } = await supabase.rpc('create_new_organization', {
            org_name: 'My New Organization',
            bonding_cap: 10000000,
            naics: ['541511'],
            states: ['VA'],
            set_asides: []
        })

        if (error) {
            setMsg('Error creating org: ' + error.message)
            setSaving(false)
            return
        }

        if (newOrg) {
            setMsg('Organization Created!')
            setOrgId(newOrg.id)
            setOrg(newOrg)
        }
        setSaving(false)
    }

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!orgId) return
        setSaving(true)
        setMsg('')

        const { error } = await supabase
            .from('organizations')
            .update({
                name: org.name,
                bonding_capacity: org.bonding_capacity,
                target_naics: org.target_naics,
                target_states: org.target_states,
                qualified_set_asides: org.qualified_set_asides
            })
            .eq('id', orgId)

        if (error) {
            setMsg('Error saving: ' + error.message)
        } else {
            setMsg('Settings saved successfully.')
        }
        setSaving(false)
    }

    const toggleSetAside = (val: string) => {
        const current = org.qualified_set_asides || []
        if (current.includes(val)) {
            setOrg({ ...org, qualified_set_asides: current.filter(s => s !== val) })
        } else {
            setOrg({ ...org, qualified_set_asides: [...current, val] })
        }
    }

    if (loading) return <div className="p-10">Loading Config...</div>

    return (
        <div className="container mx-auto py-10 px-4 md:px-6 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6 glow-text">Organization Configuration</h1>

            <form onSubmit={handleSave} className="space-y-6 glass-panel p-8 rounded-xl">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Organization Name</label>
                    <input
                        type="text"
                        className="w-full bg-black/20 border border-white/10 rounded-md p-2"
                        value={org.name || ''}
                        onChange={e => setOrg({ ...org, name: e.target.value })}
                        placeholder="My Organization"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Bonding Capacity ($)</label>
                    <input
                        type="number"
                        className="w-full bg-black/20 border border-white/10 rounded-md p-2"
                        value={org.bonding_capacity || 0}
                        onChange={e => setOrg({ ...org, bonding_capacity: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Opportunities exceeding this (as Prime) will be flagged &quot;Partner&quot;.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Qualified Set-Asides</label>
                    <div className="grid grid-cols-3 gap-2 bg-black/20 border border-white/10 rounded-md p-4">
                        {ALL_SET_ASIDES.map(sa => (
                            <label key={sa} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={org.qualified_set_asides?.includes(sa) || false}
                                    onChange={() => toggleSetAside(sa)}
                                    className="accent-blue-500"
                                />
                                <span className="text-sm">{sa}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Target NAICS (Comma separated)</label>
                    <input
                        type="text"
                        className="w-full bg-black/20 border border-white/10 rounded-md p-2"
                        value={org.target_naics?.join(', ') || ''}
                        onChange={e => setOrg({ ...org, target_naics: e.target.value.split(',').map(s => s.trim()) })}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Target States (Comma separated)</label>
                    <input
                        type="text"
                        className="w-full bg-black/20 border border-white/10 rounded-md p-2"
                        value={org.target_states?.join(', ') || ''}
                        onChange={e => setOrg({ ...org, target_states: e.target.value.split(',').map(s => s.trim()) })}
                    />
                </div>

                <div className="pt-4 flex items-center justify-between">
                    {!orgId ? (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={createOrganization}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md transition disabled:opacity-50"
                            >
                                {saving ? 'Creating...' : 'Initialize New Organization'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="bg-red-900/50 hover:bg-red-900 text-red-200 px-4 py-2 rounded-md transition text-sm"
                            >
                                Sign Out (Reset)
                            </button>
                        </div>
                    ) : (
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md transition disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    )}
                    {msg && <span className="text-sm text-green-400">{msg}</span>}
                </div>
            </form>

            {orgId && (
                <div className="flex justify-end mt-4">
                    <div className="flex gap-4">
                        <button
                            onClick={async () => {
                                if (!confirm('This will fetch LIVE opportunities from SAM.gov (Last 365 days). This process is rate-limited and may take a few seconds. Continue?')) return
                                setLoading(true)
                                try {
                                    const res = await fetch('/api/ingest/sam')
                                    const data = await res.json()
                                    if (data.error) throw new Error(data.error)
                                    alert(`Ingestion Complete! ${data.inserted} new opportunities added.`)
                                } catch (e: any) {
                                    alert('Ingestion Failed: ' + e.message)
                                }
                                setLoading(false)
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold"
                        >
                            ⚡ Ingest LIVE Data (SAM.gov)
                        </button>

                        <button
                            onClick={async () => {
                                if (!confirm('This will reset all opportunities to the latest mock data. Continue?')) return
                                setLoading(true)
                                await fetch('/api/ingest/mock')
                                setLoading(false)
                                alert('Demo Data Reset! Go to War Room to see changes.')
                            }}
                            className="text-xs text-muted-foreground hover:text-white underline"
                        >
                            Reset Demo Data (Ingest Mocks)
                        </button>
                    </div>
                </div>
            )}

            {orgId && <CompanyDocumentsManager supabase={supabase} orgId={orgId} />}
        </div>
    )
}

function CompanyDocumentsManager({ supabase, orgId }: { supabase: any, orgId: string }) {
    const [docs, setDocs] = useState<any[]>([])
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editContent, setEditContent] = useState('')

    useEffect(() => {
        loadDocs()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId])

    async function loadDocs() {
        const { data, error } = await supabase
            .from('company_documents')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })

        if (data) setDocs(data)
        if (error) console.error('Load Error', error)
    }

    async function addDoc() {
        if (!title || !content) return
        setLoading(true)
        setErrorMsg('')

        const { error } = await supabase.from('company_documents').insert({
            title,
            content,
            category: 'CAPABILITY_STATEMENT',
            org_id: orgId
        })

        if (error) {
            console.error(error)
            setErrorMsg(error.message || 'Unknown error adding document')
        } else {
            setTitle('')
            setContent('')
            loadDocs()
        }
        setLoading(false)
    }

    async function deleteDoc(id: string) {
        if (!confirm('Are you sure?')) return
        await supabase.from('company_documents').delete().eq('id', id)
        loadDocs()
    }

    function startEditing(doc: any) {
        setEditingId(doc.id)
        setEditTitle(doc.title)
        setEditContent(doc.content)
        setExpandedId(doc.id)
    }

    async function saveEdit() {
        if (!editingId) return
        setLoading(true)
        const { error } = await supabase.from('company_documents')
            .update({ title: editTitle, content: editContent })
            .eq('id', editingId)

        if (error) {
            console.error(error)
            setErrorMsg('Failed to update')
        } else {
            setEditingId(null)
            loadDocs()
        }
        setLoading(false)
    }

    return (
        <div className="mt-10 space-y-6 glass-panel p-8 rounded-xl border-t border-white/10">
            <h2 className="text-xl font-bold">Company Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">
                Upload existing capability statements, past performance, or resumes here. The AI will use this knowledge to draft better responses.
            </p>

            <div className="space-y-4">
                {/* Add New Section */}
                <div className="grid gap-2 border-b border-white/5 pb-6">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">Add New Document</h3>
                    <input
                        placeholder="Document Title"
                        className="bg-black/20 border border-white/10 rounded-md p-2"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                    />
                    <textarea
                        placeholder="Paste content..."
                        className="bg-black/20 border border-white/10 rounded-md p-2 min-h-[100px] font-mono text-xs"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-red-400 text-sm">{errorMsg}</span>
                        <button
                            onClick={addDoc}
                            disabled={loading || !title || !content}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-md transition disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Add Document'}
                        </button>
                    </div>
                </div>

                {/* List Section */}
                <div className="space-y-2 mt-6">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Stored Documents</h3>
                    {docs.length === 0 && <div className="text-sm text-white/30 italic">No documents stored yet.</div>}

                    {docs.map(doc => (
                        <div key={doc.id} className="bg-white/5 p-4 rounded-md border border-white/5 transition-all">
                            {editingId === doc.id ? (
                                // Edit Mode
                                <div className="space-y-2">
                                    <input
                                        className="w-full bg-black/40 border border-white/20 rounded p-2 text-white"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                    />
                                    <textarea
                                        className="w-full bg-black/40 border border-white/20 rounded p-2 min-h-[150px] font-mono text-xs"
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs">Cancel</button>
                                        <button onClick={saveEdit} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs">Save Changes</button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}>
                                        <div className="font-semibold flex items-center gap-2">
                                            {doc.title}
                                            <span className="text-[10px] bg-white/10 px-1 rounded text-muted-foreground">
                                                {expandedId === doc.id ? 'Collapse' : 'Expand'}
                                            </span>
                                        </div>
                                        {!expandedId || expandedId !== doc.id ? (
                                            <div className="text-xs text-muted-foreground truncate max-w-[300px] mt-1">{doc.content.slice(0, 50)}...</div>
                                        ) : null}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEditing(doc)} className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-white/5 rounded">Edit</button>
                                        <button onClick={() => deleteDoc(doc.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-white/5 rounded">Delete</button>
                                    </div>
                                </div>
                            )}

                            {expandedId === doc.id && !editingId && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <div className="text-xs font-mono text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/20 p-4 rounded">
                                        {doc.content}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
