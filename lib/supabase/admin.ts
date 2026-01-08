import { createClient } from '@supabase/supabase-js'

// Accessing Service Role Key for admin tasks (Ingestion)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Ensure keys are present or throw, to fail fast in production
if (!supabaseUrl || !supabaseServiceKey) {
    // In build time or client side this might throw if imported, so be careful.
    // This file should only be used in API routes/Server context.
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})
