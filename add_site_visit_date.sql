-- Add 'site_visit_date' column to opportunities
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS site_visit_date TIMESTAMP WITH TIME ZONE;
