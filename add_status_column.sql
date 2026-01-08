-- Create the status enum type
CREATE TYPE opportunity_status AS ENUM ('BID', 'NO_BID', 'POSSIBLE', 'HOLD');

-- Add the status column to opportunities table
ALTER TABLE public.opportunities 
ADD COLUMN status opportunity_status DEFAULT 'POSSIBLE';

-- Update RLS if necessary (usually not needed if existing policy covers update, but let's be safe)
-- "Authenticated users can update opportunities" might be needed if not present.
-- Actually, our RLS was "view own profile" and "view opportunities". 
-- Users need UPADTE permission on opportunities to change status.
CREATE POLICY "Authenticated users can update opportunities" ON public.opportunities
FOR UPDATE
USING (auth.role() = 'authenticated');
