import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ALLOWED_ORIGINS = [
  'https://app.ozmaelogistics.com',
  'http://localhost:8080',
  'http://localhost:5173'
]

serve(async (req) => {
  const origin = req.headers.get('Origin') || ''
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Admin Auth Client (uses service_role for user management)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verify if requester is an Admin
    const { data: { user: requester }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !requester) throw new Error('Unauthorized')

    const normalizeRole = (r: string) => (r.charAt(0).toUpperCase() + r.slice(1).toLowerCase());

    const { data: requesterRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requester.id)

    const isRequesterAdmin = requesterRoles?.some(r => normalizeRole(r.role) === 'Admin')
    if (!isRequesterAdmin) throw new Error('Forbidden: Admin access required')

    const { action, payload } = await req.json()

    if (action === 'CREATE_USER') {
      const { email, full_name, roles } = payload
      
      // Create Auth User
      let authUser;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'OzAME@2030#',
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (createError) {
        if (createError.message.includes("already been registered")) {
          // Self-healing: Find existing user
          const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers()
          authUser = existingUsers.find(u => u.email === email)
          if (!authUser) throw createError
        } else {
          throw createError
        }
      } else {
        authUser = newUser.user
      }

      const userId = authUser.id

      // Create Profile (using upsert to handle partial previous failures)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert([{
          id: userId,
          full_name,
          email,
          role: roles.includes('Admin') ? 'admin' : (roles[0]?.toLowerCase() || 'sales'),
          password_updated_at: new Date().toISOString()
        }])
      
      if (profileError) throw profileError

      // Assign Roles
      if (roles && roles.length > 0) {
        const rolePayload = roles.map((role: string) => ({
          user_id: userId,
          role: role.toLowerCase()
        }))
        // Use upsert or delete/insert to ensure consistency
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
        await supabaseAdmin.from('user_roles').insert(rolePayload)
      }

      return new Response(JSON.stringify({ ok: true, user: authUser }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'UPDATE_PASSWORD') {
      const { userId, newPassword } = payload
      
      // Protect other admins from password reset if they aren't the requester? 
      // Actually, Admin can reset anyone's.
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (error) throw error

      // Update tracker
      await supabaseAdmin
        .from('profiles')
        .update({ password_updated_at: new Date().toISOString() })
        .eq('id', userId)

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'TOGGLE_STATUS') {
      const { userId, is_active } = payload

      // PROTECTION: Check if target is an Admin
      const { data: targetRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)

      const isTargetAdmin = targetRoles?.some(r => normalizeRole(r.role) === 'Admin')
      if (isTargetAdmin) {
        throw new Error('Action denied: Administrative accounts cannot be deactivated.')
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_active })
        .eq('id', userId)

      if (error) throw error
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'UPDATE_USER') {
      const { userId, full_name, phone } = payload

      // 1. Update Profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ full_name, phone })
        .eq('id', userId)

      if (profileError) throw profileError

      // 2. Sync to Auth Metadata
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { full_name }
      })

      if (authError) throw authError

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'SYNC_ROLES') {
      const { userId, role, operation } = payload
      const normalizedReqRole = normalizeRole(role)

      // PROTECTION: Check if attempting to remove the last Admin or removing Admin from Admin
      if (normalizedReqRole === 'Admin' && operation === 'remove') {
        throw new Error('Action denied: Administrative privileges cannot be revoked in this workspace.')
      }

      if (operation === 'add') {
        await supabaseAdmin.from('user_roles').insert([{ user_id: userId, role: normalizedReqRole.toLowerCase() }])
      } else {
        // Delete is tricky with casing. We'll fetch all and delete the specific one with case-insensitive check
        const { data: rolesToFilter } = await supabaseAdmin.from('user_roles').select('id, role').eq('user_id', userId)
        const targetId = rolesToFilter?.find(r => normalizeRole(r.role) === normalizedReqRole)?.id
        if (targetId) {
           await supabaseAdmin.from('user_roles').delete().eq('id', targetId)
        }
      }

      // Sync back to profile
      const { data: currentRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      
      const roleList = currentRoles?.map(r => normalizeRole(r.role)) || []
      const primaryRole = roleList.includes('Admin') ? 'admin' : (roleList[0]?.toLowerCase() || null)
      
      await supabaseAdmin.from('profiles').update({ role: primaryRole }).eq('id', userId)

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Invalid action')

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
