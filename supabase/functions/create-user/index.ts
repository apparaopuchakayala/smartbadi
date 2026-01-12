import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight handle చేయడం
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("No Authorization Header found");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. JWT వెరిఫికేషన్: రిక్వెస్ట్ పంపిన అడ్మిన్ ఎవరో వెరిఫై చేయడం
    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requester) throw new Error("Unauthorized: Invalid or Expired Token");

    // 2. అడ్మిన్ పర్మిషన్ చెక్
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', requester.id)
      .single();

    if (adminProfile?.role !== 'super-admin' && adminProfile?.role !== 'school-admin') {
      throw new Error("Access Denied: Insufficient Permissions");
    }

    // డేటా స్వీకరించడం
    const { email, password, profileData } = await req.json();

    if (!email || !password) throw new Error("Email and Password are required");

    // మ్యాపింగ్ ఫిక్స్: రోల్ ని ఖచ్చితంగా సెట్ చేయడం (Default 'student' ఒకవేళ ఏమీ లేకపోతే)
    const targetRole = profileData.role || 'student';

    // 3. AUTH USER క్రియేషన్ (Auth Table)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: { 
        role: targetRole, 
        school_id: adminProfile.school_id, // సెక్యూరిటీ కోసం అడ్మిన్ స్కూల్ ఐడి వాడుతున్నాం
        full_name: profileData.full_name 
      }
    });

    if (authError) throw authError;

    // 4. DATABASE PROFILE క్రియేషన్ (Profiles Table)
    // ఇక్కడ 'role' కాలమ్ కి మనం పంపిన targetRole ని అసైన్ చేస్తున్నాం
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        full_name: profileData.full_name,
        role: targetRole, // ఇక్కడ టీచర్ లేదా స్టూడెంట్ అని డైనమిక్ గా మారుతుంది
        school_id: adminProfile.school_id,
        employee_id: profileData.employee_id,
        mobile_number: profileData.mobile_number || profileData.father_mobile,
        dob: profileData.dob,
        gender: profileData.gender,
        subject_teaching: profileData.subject_teaching,
        date_of_joining: profileData.date_of_joining,
        blood_group: profileData.blood_group,
        address: profileData.address || profileData.residential_address || '',
        encrypted_password: profileData.encrypted_password || password,
        is_active: true
      });

    if (profileError) {
      // ప్రొఫైల్ క్రియేషన్ ఫెయిల్ అయితే యూజర్ ని డిలీట్ చేయడం (Rollback)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return new Response(
      JSON.stringify({ 
        message: `${targetRole.toUpperCase()} registered successfully`,
        user_id: authData.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});