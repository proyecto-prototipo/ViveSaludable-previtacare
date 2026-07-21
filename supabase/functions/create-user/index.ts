import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type Body = {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'institutional';
  client_id?: string | null;
  status?: 'active' | 'pending' | 'suspended' | 'inactive';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) throw new Error('No autorizado.');

    const { data: caller, error: callerError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    if (callerError || !caller) throw new Error('Perfil no encontrado.');
    if (caller.status !== 'active') throw new Error('Cuenta no activa.');

    const body = await req.json() as Body;
    if (!body.email || !body.password || !body.full_name || !body.role) throw new Error('Datos incompletos.');

    const isAdmin = caller.role === 'admin';
    const isInstitutional = caller.role === 'institutional';
    if (!isAdmin && !isInstitutional) throw new Error('Rol sin permisos para crear usuarios.');

    let targetRole = body.role;
    let targetClientId = body.client_id ?? null;
    if (isInstitutional) {
      targetRole = 'institutional';
      targetClientId = caller.client_id;
    }
    if (targetRole === 'institutional' && !targetClientId) throw new Error('El usuario institucional requiere client_id.');

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
        role: targetRole,
        status: body.status ?? 'active'
      }
    });
    if (createError || !created.user) throw createError ?? new Error('No se pudo crear usuario.');

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: created.user.id,
      email: body.email,
      full_name: body.full_name,
      role: targetRole,
      client_id: targetClientId,
      status: body.status ?? 'active'
    });
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ ok: true, user_id: created.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : 'Error desconocido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
