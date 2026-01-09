import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Admin Client (The "Master Key")
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Get the ID of the user to delete
    const { target_id } = await req.json()

    if (!target_id) {
      throw new Error("Target ID is required")
    }

    console.log("Attempting to delete user:", target_id)

    // 4. DELETE FROM PROFILES (Public Table)
    // We do this first to ensure clean data removal
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', target_id)

    if (profileError) {
      console.error("Profile Delete Error:", profileError)
      // We continue anyway to ensure Auth is cleaned up
    }

    // 5. DELETE FROM AUTH (The Critical Step)
    // Only supabaseAdmin can do this
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(target_id)

    if (authError) throw authError

    return new Response(
      JSON.stringify({ message: "User deleted successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})