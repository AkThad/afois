import { NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { supabaseAdmin } from '@/lib/supabase/admin'

const KEYWORDS = ["Construction", "Logistics", "PEMB", "Arctic", "Alaska", "Development", "Infrastructure", "Repair", "Maintenance"]

export const maxDuration = 300

export async function GET() {
    try {
        const res = await fetch('https://subnet.sba.gov/rss/opportunities.xml')
        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch SubNet RSS' }, { status: res.status })
        }
        const xml = await res.text()
        const parser = new XMLParser()
        const jObj = parser.parse(xml)

        const items = jObj?.rss?.channel?.item || []
        const itemsArray = Array.isArray(items) ? items : [items]

        let count = 0
        let processed = 0

        for (const item of itemsArray) {
            processed++
            const title = item.title || ''
            const desc = item.description || ''
            const link = item.link || ''
            // Use link or guid as ID
            const guid = (typeof item.guid === 'string' ? item.guid : item.guid?.['#text']) || link

            // Filter
            const text = `${title} ${desc}`
            const match = KEYWORDS.some(k => text.toLowerCase().includes(k.toLowerCase()))

            if (match) {
                const { error } = await supabaseAdmin.from('opportunities').upsert({
                    source: 'SUB',
                    notice_id: guid.substring(0, 200), // Ensure fits in column if limited, text is fine
                    title: title,
                    agency: 'SBA SubNet',
                    solicitation_number: null,
                    naics_code: null,
                    set_aside: 'Subcontract - No Bonding Limit',
                    posted_date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                    response_deadline: null,
                    place_of_performance_state: null,
                    raw_json: item
                }, { onConflict: 'notice_id' })

                if (!error) count++
                else console.log('Subnet insert error', error)
            }
        }

        return NextResponse.json({
            success: true,
            processed,
            inserted: count,
            debug: {
                xml_length: xml.length,
                items_found: itemsArray.length,
                first_item_title: itemsArray[0]?.title || 'None'
            }
        })

    } catch (e: unknown) {
        console.error('SubNet Error', e)
        return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
}
