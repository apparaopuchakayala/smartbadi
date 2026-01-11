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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("No Authorization Header found");

    const { target_id } = await req.json();
    if (!target_id) throw new Error("Target ID is required");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. VERIFY CALLER IDENTITY
    // ఈ రిక్వెస్ట్ పంపిన యూజర్ ఎవరో వెరిఫై చేయడం
    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requester) throw new Error("Unauthorized: Identity unknown.");

    // 3. SECURITY CHECK: Role-Based Authorization
    // రిక్వెస్టర్ కి 'super-admin' లేదా 'school-admin' రోల్ ఉందో లేదో చెక్ చేయడం
    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', requester.id)
      .single();

    if (requesterProfile?.role !== 'super-admin' && requesterProfile?.role !== 'school-admin') {
      throw new Error("Forbidden: Insufficient permissions to terminate access.");
    }

    // 4. CROSS-INSTITUTION PROTECTION
    // వేరే స్కూల్ యూజర్లని డిలీట్ చేయకుండా అడ్డుకోవడం
    if (requesterProfile.role !== 'super-admin') {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('school_id')
        .eq('id', target_id)
        .single();

      if (targetProfile?.school_id !== requesterProfile.school_id) {
        throw new Error("Security Alert: You can only delete users from your own institution.");
      }
    }

    console.log(`System: User ${requester.id} is terminating access for ${target_id}`);

    // 5. ATOMIC DELETION
    // ముందుగా Auth నుండి డిలీట్ చేస్తే, ప్రొఫైల్ టేబుల్ లోని ON DELETE CASCADE వల్ల డేటా మొత్తం క్లీన్ అవుతుంది
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(target_id);
    if (authError) throw authError;

    return new Response(
      JSON.stringify({ message: "Access Terminated & Data Scrubbed Successfully" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})