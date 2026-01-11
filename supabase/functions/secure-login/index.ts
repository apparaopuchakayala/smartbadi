import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, password, school_id } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 2. CREDENTIAL VERIFICATION
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email, password
    });
    if (authError) throw authError;

    // 3. FETCH COMPREHENSIVE PROFILE
    // ఇక్కడ school సమాచారాన్ని కూడా కలిపి తెచ్చుకుంటున్నాము
    const { data: profile, error: pError } = await supabaseAdmin
      .from('profiles')
      .select('*, schools(name)')
      .eq('id', authData.user.id)
      .single();

    if (pError || !profile) {
      await supabaseAdmin.auth.admin.signOut(authData.session.access_token);
      throw new Error("Security Error: profile configuration missing.");
    }

    // 4. MULTI-TENANT VALIDATION
    // Super-admin కాకపోతే, వారు ఎంచుకున్న స్కూల్ కి చెందినవారో లేదో చెక్ చేయడం
    if (profile.role !== 'super-admin' && profile.school_id !== school_id) {
      await supabaseAdmin.auth.admin.signOut(authData.session.access_token);
      return new Response(
        JSON.stringify({ 
          error: `Access Denied: Dear ${profile.full_name}, your credentials belong to another institution.` 
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. ATOMIC METADATA INJECTION
    // ఇది మీ RLS పాలసీలు పనిచేయడానికి అత్యంత కీలకం
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      user_metadata: { 
        role: profile.role, 
        school_id: profile.school_id,
        full_name: profile.full_name,
        institution_name: profile.schools?.name 
      }
    });

    if (updateError) console.error("Metadata Sync Failed:", updateError.message);

    // 6. SUCCESS RESPONSE
    return new Response(
      JSON.stringify({ 
        session: authData.session, 
        profile: profile 
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});