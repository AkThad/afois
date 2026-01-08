BEGIN;

-- Allow authenticated users to create organizations
CREATE POLICY "Users can create organizations" ON public.organizations
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to add themselves to organization_members (essential for the creator to become admin)
CREATE POLICY "Users can add themselves to orgs" ON public.organization_members
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

COMMIT;
