import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({
        ok: false,
        message: 'Método no permitido'
      });
    }

    const authHeader = req.headers.authorization;

    const querySecret =
      typeof req.query?.secret === 'string' ? req.query.secret : '';

    const cronSecret = process.env.CRON_SECRET;

    const isAuthorized =
      cronSecret &&
      (authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret);

    if (!isAuthorized) {
      return res.status(401).json({
        ok: false,
        message: 'No autorizado'
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        ok: false,
        message: 'Faltan variables de entorno de Supabase'
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('keep_alive_status')
      .upsert(
        {
          id: 'main',
          last_ping_at: now,
          source: 'vercel-keep-alive',
          updated_at: now
        },
        {
          onConflict: 'id'
        }
      );

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      message: 'Supabase activo',
      last_ping_at: now
    });
  } catch (error) {
    console.error('Error keep-alive:', error);

    return res.status(500).json({
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'Error ejecutando keep-alive'
    });
  }
}