import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader) throw new Error("No Authorization Header found");

    // టోకెన్‌ను క్లీన్‌గా తీసుకోవడం
    const token = authHeader.replace('Bearer ', '').trim();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')! 
    );

    // 1. MANUAL JWT VERIFICATION (దీనివల్ల --no-verify-jwt వాడినా రిస్క్ ఉండదు)
    const { data: { user: requester }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !requester) throw new Error("Unauthorized: Invalid Token");

    const { target_id, all_students } = await req.json();

    // 2. REQUESTER PROFILE & ROLE CHECK
    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', requester.id)
      .single();

    if (requesterProfile?.role !== 'super-admin' && requesterProfile?.role !== 'school-admin') {
      throw new Error("Forbidden: Insufficient permissions.");
    }

    // --- CASE A: BULK DELETE (Registry Wipe) ---
    if (all_students === true) {
      const { data: students, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('school_id', requesterProfile.school_id)
        .eq('role', 'student');

      if (fetchError) throw fetchError;

      let successCount = 0;
      if (students && students.length > 0) {
        for (const student of students) {
          const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(student.id);
          if (!delError) successCount++;
        }
      }

      return new Response(
        JSON.stringify({ message: `Scrubbed ${successCount} accounts.` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- CASE B: SINGLE DELETE ---
    if (requesterProfile.role !== 'super-admin') {
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('school_id')
        .eq('id', target_id)
        .single();

      if (targetProfile?.school_id !== requesterProfile.school_id) {
        throw new Error("Security Alert: Cross-institution deletion blocked.");
      }
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(target_id);
    if (authError) throw authError;

    return new Response(
      JSON.stringify({ message: "Success" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})