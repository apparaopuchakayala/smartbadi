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

    const { target_id, all_students } = await req.json();

    // కనీసం ఒక ఐడెంటిఫైయర్ ఉండాలి
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

    // 2. రిక్వెస్టర్ (అడ్మిన్) ని వెరిఫై చేయడం
    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requester) throw new Error("Unauthorized: Identity unknown.");

    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', requester.id)
      .single();

    if (requesterProfile?.role !== 'super-admin' && requesterProfile?.role !== 'school-admin') {
      throw new Error("Forbidden: Insufficient permissions to delete users.");
    }

    // --- CASE A: బల్క్ డిలీట్ (Registry Wipe) ---
    if (all_students === true) {
      // ఆ స్కూల్ కి చెందిన విద్యార్థులందరినీ Auth నుండి తొలగించడం
      const { data: students, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('school_id', requesterProfile.school_id)
        .eq('role', 'student');

      if (fetchError) throw fetchError;

      let successCount = 0;
      let errorCount = 0;

      if (students && students.length > 0) {
        // సురక్షితంగా ఒక్కొక్కరిని డిలీట్ చేయడం (Looping ensures stable deletion)
        for (const student of students) {
          const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(student.id);
          if (!delError) {
            successCount++;
          } else {
            console.error(`Failed to delete user ${student.id}:`, delError.message);
            errorCount++;
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          message: `Process completed. Successfully scrubbed ${successCount} accounts. Errors: ${errorCount}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- CASE B: ఒక్కరిని మాత్రమే డిలీట్ చేయడం ---
    // సెక్యూరిటీ చెక్: వేరే స్కూల్ యూజర్ ని డిలీట్ చేయకుండా అడ్డుకోవడం
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

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(target_id);
    if (authError) throw authError;

    return new Response(
      JSON.stringify({ message: "Student account scrubbed from Auth and Database successfully." }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})