import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

if (!import.meta.env.VITE_SUPABASE_URL) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL');
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY');
}

// Configuration améliorée pour Supabase avec de meilleurs timeouts
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  // Log des requêtes uniquement en développement
  ...(import.meta.env.DEV && {
    debug: {
      logRequests: true
    }
  })
};

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  supabaseOptions
);
