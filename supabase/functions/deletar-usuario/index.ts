import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    if (user.id === user_id) {
      return new Response(JSON.stringify({ error: 'Você não pode excluir sua própria conta' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const { data: roles } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin')

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem excluir usuários' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      })
    }

    await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id)
    await supabaseAdmin.from('profiles').delete().eq('id', user_id)

    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (delError) {
      return new Response(JSON.stringify({ error: delError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
