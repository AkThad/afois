CREATE OR REPLACE FUNCTION create_new_organization(
    org_name TEXT,
    bonding_cap BIGINT DEFAULT 10000000,
    naics TEXT[] DEFAULT ARRAY['541511'],
    states TEXT[] DEFAULT ARRAY['VA'],
    set_asides TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (admin), bypassing RLS for the insert steps
AS $$
DECLARE
    new_org_id UUID;
    current_user_id UUID;
    result_org json;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Insert Organization
    INSERT INTO public.organizations (name, bonding_capacity, target_naics, target_states, qualified_set_asides)
    VALUES (org_name, bonding_cap, naics, states, set_asides)
    RETURNING id INTO new_org_id;

    -- 2. Insert Membership (Admin)
    INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org_id, current_user_id, 'admin');

    -- 3. Return the created org
    SELECT row_to_json(o) INTO result_org
    FROM public.organizations o
    WHERE o.id = new_org_id;

    RETURN result_org;
END;
$$;
