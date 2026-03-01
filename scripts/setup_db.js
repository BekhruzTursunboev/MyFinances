const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
    console.log('Setting up database tables...');

    // Create Categories Table via SQL RPC if it doesn't exist.
    // Note: Standard Supabase JS client doesn't support raw DDL statements directly
    // through the data API. Users typically run these queries in the Supabase SQL Editor.

    // Since we don't have the Service Role Key to bypass RLS, we will just try to insert default categories
    // and see if the table exists. However, we'll explain to the user they need to run SQL if it fails.

    console.log(`
    ========================================================
    IMPORTANT ACTION REQUIRED:
    Please execute this SQL in the Supabase Dashboard SQL Editor 
    (https://supabase.com/dashboard/project/qiutmcjoolzmqtyvblhd/sql):
    ========================================================
    
    -- Create categories table
    CREATE TABLE IF NOT EXISTS public.categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        color TEXT DEFAULT '#3b82f6',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create transactions table
    CREATE TABLE IF NOT EXISTS public.transactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        amount NUMERIC NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        category_id UUID REFERENCES public.categories(id),
        description TEXT,
        date TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enable RLS (Optional, for public access temporarily)
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Allow anonymous read access" ON public.categories FOR SELECT TO anon USING (true);
    CREATE POLICY "Allow anonymous insert access" ON public.categories FOR INSERT TO anon WITH CHECK (true);
    CREATE POLICY "Allow anonymous update access" ON public.categories FOR UPDATE TO anon USING (true);
    CREATE POLICY "Allow anonymous delete access" ON public.categories FOR DELETE TO anon USING (true);

    CREATE POLICY "Allow anonymous read access" ON public.transactions FOR SELECT TO anon USING (true);
    CREATE POLICY "Allow anonymous insert access" ON public.transactions FOR INSERT TO anon WITH CHECK (true);
    CREATE POLICY "Allow anonymous update access" ON public.transactions FOR UPDATE TO anon USING (true);
    CREATE POLICY "Allow anonymous delete access" ON public.transactions FOR DELETE TO anon USING (true);

    -- Insert default categories
    INSERT INTO public.categories (name, type, color) VALUES 
    ('Food', 'expense', '#ef4444'),
    ('Utilities', 'expense', '#3b82f6'),
    ('Entertainment', 'expense', '#f59e0b'),
    ('Income', 'income', '#10b981')
    ON CONFLICT DO NOTHING;
    
    ========================================================
  `);
}

setupDatabase().catch(console.error);
