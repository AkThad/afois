-- Allow public read access to opportunities
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON public.opportunities;

CREATE POLICY "Enable read access for all users" ON public.opportunities
FOR SELECT
USING (true);
