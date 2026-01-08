export type OpportunitySource = 'SAM' | 'SUB' | 'USA'

export interface Opportunity {
    id: string
    source: OpportunitySource
    notice_id: string
    title: string
    type?: string // e.g. 'Solicitation', 'Sources Sought', 'Presolicitation'
    agency?: string
    solicitation_number?: string
    naics_code?: string
    set_aside?: string
    posted_date?: string // ISO string
    response_deadline?: string // ISO string
    site_visit_date?: string // ISO string
    place_of_performance_state?: string
    status?: 'BID' | 'NO_BID' | 'POSSIBLE' | 'HOLD'
    raw_json?: SAMRawData
    created_at: string
}

export interface IncumbentData {
    identified_incumbent?: string
    potential_competitors?: string[]
    recent_awards?: Record<string, unknown>[]
}

export interface Contact {
    fullName?: string
    email?: string
    title?: string
    phone?: string
    fax?: string
}

export interface SAMRawData {
    pointOfContact?: Contact[]
    [key: string]: unknown
}

export interface AIAnalysis {
    id: string
    opportunity_id: string
    pwin_score: number
    recommendation: string
    summary: string
    incumbent_data?: IncumbentData
    bonding_status: 'OK' | 'EXCEEDS' | 'N/A'
    analyzed_at: string
}

export interface UserProfile {
    id: string
    company_name: string
    ue_id: string
    bonding_capacity: number
    target_states: string[]
    qualified_set_asides: string[]
}

export interface Organization {
    id: string
    name: string
    bonding_capacity: number
    target_naics: string[]
    target_states: string[]
    qualified_set_asides: string[]
    created_at: string
}

export interface OrganizationMember {
    id: string
    org_id: string
    user_id: string
    role: 'admin' | 'member'
}

export interface PipelineItem {
    id: string
    org_id: string
    opportunity_id: string
    status: 'BID' | 'NO_BID' | 'POSSIBLE' | 'HOLD'
    created_at: string
}

export type OpportunityWithPipeline = Opportunity & {
    pipeline_status?: PipelineItem['status']
    ai_analysis?: AIAnalysis
}
