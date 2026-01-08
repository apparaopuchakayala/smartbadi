import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iqwcqxacniomyoamkznc.supabase.co';
const supabaseKey = 'sb_publishable_RMpqRk80FumD3dETNIdKYQ_lgEYLTIa';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Keep user logged in on refresh
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}); 