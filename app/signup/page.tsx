'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')
    const router = useRouter()
    const supabase = createClient()

    async function handleSignUp(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMsg('')

        // Use Server-Side Force Create (more reliable for dev)
        try {
            const res = await fetch('/api/auth/force-create', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()

            if (data.error) {
                setMsg(data.error)
            } else {
                setMsg('Success! User created and confirmed. Redirecting to login...')
                setTimeout(() => router.push('/login'), 2000)
            }
        } catch (err) {
            setMsg('Network error occurred.')
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-xl shadow-2xl">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight glow-text">
                        Create Account
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Start your winning streak today
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-md border border-white/10 bg-black/20 p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="relative block w-full rounded-md border border-white/10 bg-black/20 p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {loading ? 'Signing up...' : 'Sign up'}
                        </button>
                    </div>

                    {msg && (
                        <div className={`text-sm text-center ${msg.includes('Check') ? 'text-green-400' : 'text-red-400'}`}>
                            {msg}
                        </div>
                    )}
                </form>

                <div className="text-center">
                    <Link href="/login" className="text-sm font-medium text-blue-400 hover:text-blue-300">
                        Already have an account? Sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
