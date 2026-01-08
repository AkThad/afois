-- Allow users to see which organizations they belong to
-- This is required for the War Room to know which "Org ID" to load data for.

CREATE POLICY "Users can view own memberships" ON public.organization_members
FOR SELECT
USING (auth.uid() = user_id);
