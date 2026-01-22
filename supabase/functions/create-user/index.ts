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
    const token = authHeader?.replace('Bearer ', '');
    if (!token) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // 1. Requester Validation
    const { data: { user: requester }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !requester) throw new Error("Invalid Session");

    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', requester.id)
      .single();

    if (!['super-admin', 'school-admin'].includes(adminProfile?.role)) throw new Error("Forbidden");

    const body = await req.json();

    // --- CASE A: BULK REGISTRATION ---
    if (body.isBulk && Array.isArray(body.students)) {
      const results = [];
      for (const student of body.students) {
        const studentEmail = student.email.toLowerCase().trim();
        
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: studentEmail,
          password: student.password || 'SmartBadi@2026',
          email_confirm: true,
          user_metadata: { 
            full_name: student.FullName || student.name, 
            role: 'student', 
            school_id: adminProfile.school_id 
          }
        });

        if (!authError || authError.message.includes('already has been registered')) {
          // ఒకవేళ Auth లో ఉండి Profile లో లేకపోయినా ఇది పని చేస్తుంది (UPSERT)
          let targetUserId = authUser?.user?.id;
          
          // ఒకవేళ యూజర్ ఆల్రెడీ ఉంటే, వారి ID ని తెచ్చుకోవడం
          if (!targetUserId) {
             const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('email', studentEmail).single();
             targetUserId = existing?.id;
          }

          if (targetUserId) {
            const { error: dbError } = await supabaseAdmin.from('profiles').upsert({
              id: targetUserId,
              full_name: student.FullName || student.name || 'Student',
              email: studentEmail,
              role: 'student',
              school_id: adminProfile.school_id,
              roll_number: student.RollNumber || null,
              mobile_number: student.MotherMobile || null,
              is_active: true
            }, { onConflict: 'id' });
            
            results.push({ email: studentEmail, status: dbError ? 'failed' : 'success' });
          }
        } else {
          results.push({ email: studentEmail, status: 'failed', error: authError.message });
        }
      }
      return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- CASE B: INDIVIDUAL REGISTRATION ---
    const { email, password, profileData } = body;
    const studentEmail = email.toLowerCase().trim();

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: profileData.full_name, 
        role: profileData.role, 
        school_id: adminProfile.school_id 
      }
    });

    // ఎర్రర్ వస్తే, ఆ ఈమెయిల్ తో యూజర్ ఆల్రెడీ ఉన్నాడో లేదో చెక్ చేస్తున్నాం
    if (authError && !authError.message.includes('already has been registered')) throw authError;

    let targetId = authUser?.user?.id;
    if (!targetId) {
        const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('email', studentEmail).single();
        targetId = existingUser?.id;
    }

    if (!targetId) throw new Error("Could not identify user for profile sync.");

    // ప్రొఫైల్ సింక్ - UPSERT వాడటం వల్ల Duplicate PKEY ఎర్రర్ రాదు
    const { error: dbError } = await supabaseAdmin.from('profiles').upsert({
      ...profileData,
      id: targetId,
      email: studentEmail,
      school_id: adminProfile.school_id,
      is_active: true
    }, { onConflict: 'id' });

    if (dbError) throw new Error(`Profile Sync Error: ${dbError.message}`);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});