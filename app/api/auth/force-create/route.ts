import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Service Role Key missing on server' }, { status: 500 })
        }

        // Direct Admin Client (Bypasses RLS and Auth Restrictions)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // 1. Check if user exists
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = users.find(u => u.email === email)

        let resultUser;

        if (existingUser) {
            // 2. Update existing user (Force Password Reset)
            const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
                existingUser.id,
                { password, email_confirm: true, user_metadata: { email_confirmed: true } }
            )
            if (error) throw error
            resultUser = data.user
        } else {
            // 3. Create new user
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            })
            if (error) throw error
            resultUser = data.user
        }

        return NextResponse.json({
            success: true,
            user: resultUser,
            message: 'User account secured. Logging you in...'
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
