/*
  ========================================================
  V2 MEGABOX - UZBEKISTAN EDITION:
  Please execute this SQL in the Supabase Dashboard SQL Editor 
  (https://supabase.com/dashboard/project/qiutmcjoolzmqtyvblhd/sql):
  ========================================================
*/

-- 1. Create Categories Table (Uzbek localized + 3 types)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings')),
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'savings')),
    category_id UUID REFERENCES public.categories(id),
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Turn off RLS temporarily so Next.js + Bot can access easily
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 4. Seed basic Uzbek Categories
INSERT INTO public.categories (name, type, color) VALUES 
('Oziq-ovqat', 'expense', '#ef4444'),
('Transport', 'expense', '#f97316'),
('Kommunal', 'expense', '#06b6d4'),
('Kiyim-kechak', 'expense', '#d946ef'),
('Oylik', 'income', '#10b981'),
('Mukofot', 'income', '#84cc16'),
('Mening Jamg''armam', 'savings', '#eab308')
ON CONFLICT DO NOTHING;
