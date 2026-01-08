import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Singleton pattern to prevent "Multiple GoTrueClient instances" warning
let client: ReturnType<typeof createSupabaseClient> | undefined

export function createClient() {
  if (client) return client

  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
