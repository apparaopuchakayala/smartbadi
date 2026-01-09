import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iqwcqxacniomyoamkznc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxd2NxeGFjbmlvbXlvYW1rem5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjE2MDUsImV4cCI6MjA4MzE5NzYwNX0.89VI8vdWD6FLyhKeYu-JkQU0Nsv1OhpLYZcI18qyre0';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Keep user logged in on refresh
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}); 