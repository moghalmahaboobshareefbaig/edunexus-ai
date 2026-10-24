// EduNexus AI — Supabase client (frontend, anon key only)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://blgqapkuizpyaqgyqftt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3VC4FKHjx4ApAGFwaoQXSQ_crGEEkMw';

export const isSupabaseConfigured = (): boolean => Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder')
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. ' +
    'Copy frontend/.env.example to frontend/.env.local and add your credentials.'
  );
}

const safeUrl = supabaseUrl && supabaseUrl.startsWith('https://')
  ? supabaseUrl
  : 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
