-- Create table for storing company knowledge/assets
CREATE TABLE public.company_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- Optional if we want multi-user strictness, currently mostly anon/single user in dev
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL', -- 'CAPABILITY_STATEMENT', 'PAST_PERFORMANCE', 'RESUME'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- Allow access (for dev/demo purposes)
CREATE POLICY "Enable all access for all users" ON public.company_documents FOR ALL USING (true);
