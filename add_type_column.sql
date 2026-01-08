-- Add 'type' column to opportunities
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Solicitation';

-- Update RLS if needed? No, existing policies cover "ALL" columns usually.
