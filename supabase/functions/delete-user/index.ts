import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("No Authorization Header found");

    const { target_id, all_students } = await req.json();

    // Validation Check: target_id లేకపోయినా, all_students ఉంటే అనుమతిస్తుంది
    if (!target_id && !all_students) {
      throw new Error("Target ID or Bulk Action flag is required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // అడ్మిన్ వెరిఫికేషన్
    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requester) throw new Error("Unauthorized: Identity unknown.");

    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', requester.id)
      .single();

    if (requesterProfile?.role !== 'super-admin' && requesterProfile?.role !== 'school-admin') {
      throw new Error("Forbidden: Insufficient permissions.");
    }

    // CASE A: బల్క్ డిలీట్ (Registry Wipe)
    if (all_students === true) {
      const { data: students, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('school_id', requesterProfile.school_id)
        .eq('role', 'student');

      if (fetchError) throw fetchError;

      if (students && students.length > 0) {
        const deletePromises = students.map(s => supabaseAdmin.auth.admin.deleteUser(s.id));
        await Promise.all(deletePromises);
      }

      return new Response(
        JSON.stringify({ message: `Successfully scrubbed ${students?.length || 0} student accounts.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CASE B: సింగిల్ డిలీట్
    if (requesterProfile.role !== 'super-admin') {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('school_id')
        .eq('id', target_id)
        .single();

      if (targetProfile?.school_id !== requesterProfile.school_id) {
        throw new Error("Security Alert: Access Denied.");
      }
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(target_id);
    if (authError) throw authError;

    return new Response(
      JSON.stringify({ message: "Student account terminated successfully." }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})