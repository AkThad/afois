import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = createClient()

    // 1. Try to list tables (if permissions allow, otherwise just try insert)

    // 2. Try simple insert
    const { data, error } = await supabase
        .from('company_documents')
        .insert({
            title: 'Debug Doc',
            content: 'Debug Content',
            category: 'DEBUG'
        })
        .select()

    if (error) {
        return NextResponse.json({
            status: 'Error',
            message: error.message,
            details: error
        })
    }

    return NextResponse.json({
        status: 'Success',
        data
    })
}
