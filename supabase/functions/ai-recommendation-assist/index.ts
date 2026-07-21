import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function safeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: 'Falta configurar GEMINI_API_KEY.' }, 500);
    }

    const { form_id, public_token } = await req.json();

    if (!form_id || !public_token) {
      return jsonResponse(
        { error: 'form_id y public_token son obligatorios.' },
        400
      );
    }

    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        id,
        public_token,
        client_id,
        patient_id,
        patients (
          age,
          sex,
          district
        )
      `)
      .eq('id', form_id)
      .maybeSingle();

    if (formError) throw formError;

    if (!form) {
      return jsonResponse({ error: 'No se encontró el formulario.' }, 404);
    }

    if (form.public_token !== public_token) {
      return jsonResponse({ error: 'Token público inválido.' }, 403);
    }

    const { data: recommendations, error: recommendationsError } = await supabase
      .from('recommendations')
      .select(`
        id,
        form_id,
        patient_id,
        test_id,
        priority_score,
        priority_level,
        reasons,
        price_snapshot,
        rapid_tests (
          name,
          description,
          sample_type,
          result_time
        )
      `)
      .eq('form_id', form_id)
      .order('priority_score', { ascending: false });

    if (recommendationsError) throw recommendationsError;

    if (!recommendations?.length) {
      return jsonResponse({
        ok: true,
        message: 'No hay recomendaciones para reforzar con IA.'
      });
    }

    await supabase
      .from('recommendations')
      .update({
        ai_status: 'generating',
        ai_error: null
      })
      .eq('form_id', form_id);

    const patientContext = {
      age: form.patients?.age ?? null,
      sex: form.patients?.sex ?? null,
      district: form.patients?.district ?? null
    };

    const recommendationContext = recommendations.map((item: any) => ({
      recommendation_id: item.id,
      test_name: item.rapid_tests?.name,
      test_description: item.rapid_tests?.description,
      sample_type: item.rapid_tests?.sample_type,
      result_time: item.rapid_tests?.result_time,
      priority_level: item.priority_level,
      priority_score: item.priority_score,
      reasons: safeArray(item.reasons),
      price_snapshot: item.price_snapshot
    }));

    const prompt = `
Eres un asistente de orientación preventiva para una plataforma de pruebas rápidas llamada ViveSaludable.

REGLAS OBLIGATORIAS:
- No diagnostiques enfermedades.
- No indiques tratamientos.
- No reemplaces la recomendación del sistema.
- No cambies la prueba recomendada.
- No cambies prioridad, puntaje ni precio.
- No afirmes que el paciente tiene una enfermedad.
- Solo refuerza la explicación preventiva en lenguaje claro, humano y responsable.
- Usa español, tono breve, profesional y amigable.

CONTEXTO DEL PACIENTE:
${JSON.stringify(patientContext, null, 2)}

RECOMENDACIONES GENERADAS POR EL MOTOR DE REGLAS:
${JSON.stringify(recommendationContext, null, 2)}

Devuelve únicamente JSON válido con esta estructura:
{
  "items": [
    {
      "recommendation_id": "id exacto de la recomendación",
      "ai_summary": "resumen preventivo corto",
      "ai_explanation": "explicación clara para el paciente",
      "ai_key_points": ["punto clave 1", "punto clave 2"],
      "ai_alerts": ["alerta preventiva 1", "alerta preventiva 2"],
      "ai_disclaimer": "mensaje indicando que no reemplaza evaluación médica"
    }
  ]
}
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();

      await supabase
        .from('recommendations')
        .update({
          ai_status: 'failed',
          ai_error: errorText
        })
        .eq('form_id', form_id);

      return jsonResponse(
        {
          error: 'Gemini no pudo generar la explicación.',
          details: errorText
        },
        502
      );
    }

    const geminiData = await geminiResponse.json();

    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{"items":[]}';

    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    const validIds = new Set(recommendations.map((item: any) => item.id));

    for (const item of items) {
      if (!validIds.has(item.recommendation_id)) continue;

      await supabase
        .from('recommendations')
        .update({
          ai_status: 'completed',
          ai_summary: item.ai_summary ?? null,
          ai_explanation: item.ai_explanation ?? null,
          ai_key_points: safeArray(item.ai_key_points),
          ai_alerts: safeArray(item.ai_alerts),
          ai_disclaimer:
            item.ai_disclaimer ??
            'Esta explicación es una orientación preventiva y no reemplaza una evaluación médica.',
          ai_model: GEMINI_MODEL,
          ai_error: null,
          ai_generated_at: new Date().toISOString()
        })
        .eq('id', item.recommendation_id);
    }

    return jsonResponse({
      ok: true,
      generated: items.length
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error inesperado al generar explicación IA.'
      },
      500
    );
  }
});