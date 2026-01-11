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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. JWT వెరిఫికేషన్ (401 ని ఇక్కడ హ్యాండిల్ చేస్తాము)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized: Invalid or Expired Token");

    // 2. అడ్మిన్ పర్మిషన్ చెక్
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'super-admin' && adminProfile?.role !== 'school-admin') {
      throw new Error("Access Denied: Insufficient Permissions");
    }

    const { email, password, profileData } = await req.json();

    // 3. AUTH USER క్రియేషన్
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        role: profileData.role, 
        school_id: profileData.school_id,
        full_name: profileData.full_name 
      }
    });

    if (authError) throw authError;

    // 4. DATABASE PROFILE క్రియేషన్ (UPSERT)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        full_name: profileData.full_name,
        role: profileData.role,
        school_id: profileData.school_id,
        employee_id: profileData.employee_id,
        mobile_number: profileData.mobile_number,
        dob: profileData.dob,
        gender: profileData.gender,
        subject_teaching: profileData.subject_teaching,
        date_of_joining: profileData.date_of_joining,
        blood_group: profileData.blood_group,
        address: profileData.address || '',
        encrypted_password: profileData.encrypted_password,
        is_active: true
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return new Response(
      JSON.stringify({ message: "Enterprise Entry Authorized & Registered Successfully" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});