import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Falta configurar VITE_GEMINI_API_KEY en el archivo .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

export type PreventiveAIInput = {
  patient: {
    id?: string;
    full_name?: string;
    age?: number | null;
    sex?: string | null;
    district?: string | null;
  };
  answers: {
    question_id?: string;
    question: string;
    answer: string | string[] | number | boolean | null;
    section?: string | null;
  }[];
  recommendedTests: {
    recommendation_id?: string;
    test_id?: string;
    name: string;
    description?: string | null;
    priority_level?: string | null;
    priority_score?: number | null;
    reasons?: string[];
    price_snapshot?: number | null;
    sample_type?: string | null;
    result_time?: string | null;
  }[];
  availableTests: {
    id: string;
    name: string;
    description?: string | null;
    price?: number | null;
    sample_type?: string | null;
    result_time?: string | null;
    active?: boolean | null;
    stock?: number | null;
  }[];
};

export type PreventiveAIResponse = {
  estado_ia: 'Refuerzo preventivo' | 'Revisión sugerida' | 'Atención prioritaria';
  resumen_ia: string;
  observacion_ia: string;
  recomendacion_ia: string;
  pruebas_reforzadas: {
    test_id?: string;
    nombre_prueba: string;
    motivo_ia: string;
    nivel_prioridad_ia: 'alta' | 'media' | 'baja';
  }[];
  alertas_preventivas: string[];
  disclaimer_ia: string;
};

function cleanJsonResponse(text: string) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export async function generarRefuerzoPreventivoIA(
  payload: PreventiveAIInput
): Promise<PreventiveAIResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const prompt = `
Eres un asistente de orientación preventiva para ViveSaludable, una plataforma de pruebas rápidas preventivas.

IMPORTANTE:
- No diagnostiques enfermedades.
- No indiques tratamientos.
- No reemplaces a un médico.
- No cambies las pruebas que el sistema ya recomendó.
- No cambies el precio, puntaje ni prioridad original.
- No afirmes que el paciente tiene una enfermedad.
- Usa lenguaje profesional, claro, humano y preventivo.
- Actúa como apoyo explicativo basado en criterios de salud preventiva.
- Responde únicamente un JSON válido. No uses markdown. No uses comillas invertidas. No agregues texto fuera del JSON.

DATOS DEL PACIENTE:
${JSON.stringify(payload.patient, null, 2)}

RESPUESTAS MARCADAS EN EL FORMULARIO:
${JSON.stringify(payload.answers, null, 2)}

PRUEBAS YA RECOMENDADAS POR EL MOTOR DE REGLAS:
${JSON.stringify(payload.recommendedTests, null, 2)}

LISTA DE PRUEBAS DISPONIBLES EN PREVITACARE:
${JSON.stringify(payload.availableTests, null, 2)}

Devuelve exactamente este JSON:

{
  "estado_ia": "Refuerzo preventivo" o "Revisión sugerida" o "Atención prioritaria",
  "resumen_ia": "Resumen breve del caso en lenguaje preventivo",
  "observacion_ia": "Observación preventiva personalizada según edad, sexo y respuestas",
  "recomendacion_ia": "Recomendación clara para el paciente sin diagnóstico ni tratamiento",
  "pruebas_reforzadas": [
    {
      "test_id": "id de la prueba si existe",
      "nombre_prueba": "nombre de la prueba recomendada",
      "motivo_ia": "motivo preventivo por el cual se refuerza esta prueba",
      "nivel_prioridad_ia": "alta" o "media" o "baja"
    }
  ],
  "alertas_preventivas": [
    "alerta preventiva importante si corresponde"
  ],
  "disclaimer_ia": "Mensaje indicando que esta orientación no reemplaza una evaluación médica profesional"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const cleanText = cleanJsonResponse(responseText);
    const aiData = JSON.parse(cleanText) as PreventiveAIResponse;

    return aiData;
  } catch (error) {
    console.error('Error en Gemini:', error);
    throw new Error('No se pudo generar el refuerzo preventivo con IA.');
  }
}