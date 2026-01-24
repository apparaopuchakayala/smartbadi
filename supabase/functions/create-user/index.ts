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

    // --- HELPER FUNCTION: GET TARGET SCHOOL ID ---
    // This solves your problem. 
    // If Super Admin -> Use the ID sent from React (body.school_id or profileData.school_id)
    // If School Admin -> Force use their own ID (Security)
    const getTargetSchoolId = (providedId: any) => {
        if (adminProfile.role === 'super-admin') {
            return providedId || adminProfile.school_id;
        }
        return adminProfile.school_id;
    }

    // --- CASE A: BULK REGISTRATION ---
    if (body.isBulk && Array.isArray(body.students)) {
      const results = [];
      
      // Calculate ID based on who is logged in
      const bulkSchoolId = getTargetSchoolId(body.school_id);
      
      if (!bulkSchoolId) throw new Error("Target School ID missing for bulk upload.");

      for (const student of body.students) {
        const studentEmail = student.email.toLowerCase().trim();
        
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: studentEmail,
          password: student.password || 'SmartBadi@2026',
          email_confirm: true,
          user_metadata: { 
            full_name: student.FullName || student.name, 
            role: 'student', 
            school_id: bulkSchoolId 
          }
        });

        if (!authError || authError.message.includes('already has been registered')) {
          let targetUserId = authUser?.user?.id;
          
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
              school_id: bulkSchoolId, // Uses calculated ID
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

    // Calculate School ID
    const targetSchoolId = getTargetSchoolId(profileData.school_id);
    
    if (!targetSchoolId) throw new Error("Target School ID is missing. Please select a school first.");

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: profileData.full_name, 
        role: profileData.role, 
        school_id: targetSchoolId 
      }
    });

    if (authError && !authError.message.includes('already has been registered')) throw authError;

    let targetId = authUser?.user?.id;
    if (!targetId) {
        const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('email', studentEmail).single();
        targetId = existingUser?.id;
    }

    if (!targetId) throw new Error("Could not identify user for profile sync.");

    // Profile Sync
    const { error: dbError } = await supabaseAdmin.from('profiles').upsert({
      ...profileData,
      id: targetId,
      email: studentEmail,
      school_id: targetSchoolId, 
      is_active: true
    }, { onConflict: 'id' });

    if (dbError) throw new Error(`Profile Sync Error: ${dbError.message}`);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});