
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { TARGET_NAICS, TARGET_STATES } from '@/lib/ingest/constants'
import { addDays, subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
    const mockOps = [
        {
            noticeId: `MOCK-${Date.now()}-1`,
            subject: 'Repair and Alteration of Hangar 4',
            departmentName: 'Department of the Air Force',
            solicitationNumber: 'FA5000-24-R-0001',
            typeOfSetAside: '8(a) Sole Source',
            naicsCode: '236220',
            postedDate: new Date().toISOString(),
            responseDeadLine: addDays(new Date(), 14).toISOString(),
            placeOfPerformance: {
                state: { code: 'AK' },
                city: { name: 'Eielson AFB' }
            },
            pointOfContact: [{ fullName: 'John Doe', email: 'john.doe@us.af.mil' }],
            description: "Provide all labor, equipment, and materials to repair Hangar 4 at Eielson AFB. Project includes new siding, insulation, and door replacement. A mandatory Site Visit is scheduled for Jan 15th.",
            siteVisitDate: addDays(new Date(), 5).toISOString()
        },
        {
            noticeId: `MOCK-${Date.now()}-2`,
            subject: 'Community Health Center Construction',
            departmentName: 'Department of Health and Human Services',
            solicitationNumber: '75N95024R00005',
            typeOfSetAside: 'Indian Small Business Economic Enterprise',
            naicsCode: '236220',
            postedDate: subDays(new Date(), 2).toISOString(),
            responseDeadLine: addDays(new Date(), 30).toISOString(),
            placeOfPerformance: {
                state: { code: 'AZ' },
                city: { name: 'Tuba City' }
            },
            pointOfContact: [{ fullName: 'Alice Smith', email: 'alice.smith@ihs.gov' }],
            description: "Construction of a new 20,000 sq ft health center on tribal land. ISBEE set-aside. Pre-bid conference via Zoom.",
            siteVisitDate: addDays(new Date(), 2).toISOString()
        },
        {
            noticeId: `MOCK-${Date.now()}-3`,
            subject: 'Logistics Support Services',
            departmentName: 'Department of the Army',
            solicitationNumber: 'W9128F-24-R-0055',
            typeOfSetAside: 'Total Small Business',
            naicsCode: '541614',
            postedDate: subDays(new Date(), 5).toISOString(),
            responseDeadLine: addDays(new Date(), 10).toISOString(),
            placeOfPerformance: {
                state: { code: 'TX' },
                city: { name: 'Fort Cavazos' }
            },
            pointOfContact: [{ fullName: 'Sgt. Bilko', email: 'phil.bilko@army.mil' }],
            description: "Provide comprehensive logistics support.",
        },
        {
            noticeId: `MOCK-${Date.now()}-4`,
            subject: 'Oil Pipeline Maintenance',
            departmentName: 'Department of Energy',
            solicitationNumber: 'DE-FE0000001',
            typeOfSetAside: 'N/A',
            naicsCode: '237120',
            postedDate: new Date().toISOString(),
            responseDeadLine: addDays(new Date(), 45).toISOString(),
            placeOfPerformance: {
                state: { code: 'AK' },
                city: { name: 'Prudhoe Bay' }
            },
            pointOfContact: [{ fullName: 'Energy Corp', email: 'procurement@doe.gov' }],
            description: "Maintenance and repair of oil pipeline infrastructure in North Slope region. Site Visit highly recommended."
        },
        {
            noticeId: `MOCK-${Date.now()}-5`,
            subject: 'Cybersecurity Market Research',
            departmentName: 'Department of Homeland Security',
            solicitationNumber: 'DHS-CYBER-24-SS',
            typeOfSetAside: 'N/A',
            naicsCode: '541512',
            postedDate: new Date().toISOString(),
            responseDeadLine: addDays(new Date(), 7).toISOString(),
            placeOfPerformance: {
                state: { code: 'VA' },
                city: { name: 'Arlington' }
            },
            pointOfContact: [{ fullName: 'CISO Office', email: 'ciso@dhs.gov' }],
            description: "SOURCES SOUGHT: DHS is seeking capable vendors for upcoming Zero Trust Architecture implementation.",
            noticeType: 'Sources Sought'
        }
    ]

    let insertedCount = 0

    for (const op of mockOps) {
        // Calculate dynamic filtering status just like real ingest (filtering happen in DB or here?)
        // The real ingest filters by State/SetAside.
        // We mocked valid states/set-asides mostly.

        const { error } = await supabaseAdmin
            .from('opportunities')
            .upsert({
                source: 'SAM', // or 'Mock'
                notice_id: op.noticeId,
                title: op.subject,
                type: (op as any).noticeType || 'Solicitation',
                agency: op.departmentName,
                solicitation_number: op.solicitationNumber,
                naics_code: op.naicsCode,
                set_aside: op.typeOfSetAside,
                posted_date: op.postedDate,
                response_deadline: op.responseDeadLine,
                place_of_performance_state: op.placeOfPerformance.state.code,
                raw_json: op
            }, { onConflict: 'notice_id' })

        if (!error) insertedCount++
        else console.error('Mock Insert Error', error)
    }

    return NextResponse.json({ success: true, count: insertedCount, message: "Mock data ingested" })
}
