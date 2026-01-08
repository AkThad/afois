-- Allow organization admins to update their own organization
CREATE POLICY "Admins can update their organization" ON public.organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM public.organization_members 
        WHERE org_id = organizations.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.organization_members 
        WHERE org_id = organizations.id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    )
);
