BEGIN;

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    bonding_capacity BIGINT DEFAULT 10000000,
    target_naics TEXT[],
    target_states TEXT[],
    qualified_set_asides TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Memberships Table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- 3. Migration: Convert existing User Profiles to Organizations
DO $$
DECLARE
    r RECORD;
    new_org_id UUID;
BEGIN
    FOR r IN SELECT * FROM public.user_profiles WHERE id != '00000000-0000-0000-0000-000000000000' LOOP
        -- Check if org already exists for this user to avoid duplicates if re-run
        -- (Ideally we'd have a link, but for this migration we just create one)
        INSERT INTO public.organizations (name, bonding_capacity, target_naics, target_states, qualified_set_asides)
        VALUES (
            COALESCE(r.company_name, 'My Organization'),
            r.bonding_capacity,
            r.target_naics,
            r.target_states,
            r.qualified_set_asides
        )
        RETURNING id INTO new_org_id;

        INSERT INTO public.organization_members (org_id, user_id, role)
        VALUES (new_org_id, r.id, 'admin');
    END LOOP;
END $$;

-- 4. Pipeline Items
CREATE TABLE IF NOT EXISTS public.pipeline_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
    status text DEFAULT 'POSSIBLE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, opportunity_id)
);

-- 5. Migrate existing Statuses
INSERT INTO public.pipeline_items (org_id, opportunity_id, status)
SELECT 
    (SELECT id FROM public.organizations LIMIT 1),
    id,
    status
FROM public.opportunities
WHERE status IS NOT NULL 
AND status != 'POSSIBLE'
ON CONFLICT DO NOTHING;

-- 6. Update AI Analysis
ALTER TABLE public.ai_analysis ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.ai_analysis SET org_id = (SELECT id FROM public.organizations LIMIT 1) WHERE org_id IS NULL;

-- 7. Update Company Documents
ALTER TABLE public.company_documents ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
UPDATE public.company_documents SET org_id = (SELECT id FROM public.organizations LIMIT 1) WHERE org_id IS NULL;

-- 8. Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_items ENABLE ROW LEVEL SECURITY;

-- 9. Helper Function
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS UUID[] AS $$
    SELECT array_agg(org_id) FROM public.organization_members WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 10. Policies
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
FOR SELECT USING (id = ANY(get_my_org_ids()));

DROP POLICY IF EXISTS "Members can view org pipeline" ON public.pipeline_items;
CREATE POLICY "Members can view org pipeline" ON public.pipeline_items
FOR ALL USING (org_id = ANY(get_my_org_ids()));

DROP POLICY IF EXISTS "Members can view org analysis" ON public.ai_analysis;
CREATE POLICY "Members can view org analysis" ON public.ai_analysis
FOR ALL USING (org_id = ANY(get_my_org_ids()));

DROP POLICY IF EXISTS "Members can view org docs" ON public.company_documents;
CREATE POLICY "Members can view org docs" ON public.company_documents
FOR ALL USING (org_id = ANY(get_my_org_ids()));

COMMIT;
