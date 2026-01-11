import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle Browser Pre-flight (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. VERIFY USER: Is the token valid?
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error("Unauthorized: Invalid Token")
    }

    // 4. VERIFY ROLE: Is this user a Super Admin or School Admin?
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // ఇక్కడ school-admin కి కూడా పర్మిషన్ ఇచ్చాము
    if (adminProfile?.role !== 'super-admin' && adminProfile?.role !== 'school-admin') {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only administrators can create users" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. PARSE DATA
    const { email, password, profileData } = await req.json()

    // 6. CREATE USER (Auth)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { 
        role: profileData.role, 
        full_name: profileData.full_name,
        school_id: profileData.school_id 
      }
    })

    if (authError) throw authError

    // 7. CREATE PROFILE (Data) - అన్ని ఫీల్డ్స్ ఇక్కడ యాడ్ చేశాను
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email,
        full_name: profileData.full_name,
        role: profileData.role,
        school_id: profileData.school_id,
        employee_id: profileData.employee_id,
        mobile_number: profileData.mobile_number,
        dob: profileData.dob,
        subject_teaching: profileData.subject_teaching,
        encrypted_password: profileData.encrypted_password,
        // మీ ప్రాజెక్ట్ లోని అదనపు ఫీల్డ్స్
        gender: profileData.gender,
        blood_group: profileData.blood_group,
        date_of_joining: profileData.date_of_joining,
        address: profileData.address || '',
        is_active: true
      })

    if (profileError) {
      // Rollback Auth if Profile fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    return new Response(
      JSON.stringify({ message: "User and Profile created successfully" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})