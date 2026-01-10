import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, password, school_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Verify User Credentials
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email, password
    });

    if (authError) throw authError;

    // 2. Fetch Profile including full_name
    const { data: profile, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('school_id, role, full_name')
      .eq('id', authData.user.id)
      .single();

    if (pError || !profile) {
      await supabaseAdmin.auth.admin.signOut(authData.session.access_token);
      throw new Error("Security Error: Profile not linked.");
    }

    // 3. Strict Institution Rule
    // ఇక్కడ మెసేజ్ లో పేరు డైనమిక్ గా రావడానికి Template Literals వాడాలి
    if (profile.role !== 'super-admin' && profile.school_id !== school_id) {
      await supabaseAdmin.auth.admin.signOut(authData.session.access_token);
      
      return new Response(
        JSON.stringify({ 
          error: `Oops! Dear ${profile.full_name}, you are not from this institution.` 
        }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(JSON.stringify({ session: authData.session, profile }), { 
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});