import { createClient } from '@supabase/supabase-js';
// Ensure .env is loaded before reading values (env.ts is idempotent).
import './env';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase env vars. Check .env file for SUPABASE_URL and SUPABASE_SERVICE_KEY'
  );
}

// Service role client — bypasses RLS, full access. SERVER-SIDE ONLY.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const SUPABASE_TABLE = 'ebook_orders';
