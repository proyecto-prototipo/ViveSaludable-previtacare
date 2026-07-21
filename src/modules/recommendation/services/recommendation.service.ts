import { supabase } from '../../../shared/lib/supabase';
import type { PreventiveWarning, Recommendation, RecommendationRule, RapidTest } from '../../../shared/types/models';
import type { PreventiveAIResponse } from '../../patient/services/gemini-preventive-ai.service';


type AnswerRow = { question_id: string; option_id: string | null; answer_text: string | null };
type ScoreBucket = { test: RapidTest; score: number; reasons: string[]; warnings: Array<{ type: string; message: string; test_id: string | null }> };

function priorityLevel(score: number): 'alta' | 'media' | 'baja' {
  if (score >= 8) return 'alta';
  if (score >= 4) return 'media';
  return 'baja';
}

export async function generateRecommendations(formId: string) {
  const { data: form, error: formError } = await supabase.from('forms').select('*').eq('id', formId).single();
  if (formError) throw formError;
  if (!form.patient_id) throw new Error('El formulario no tiene paciente asociado.');

  const [{ data: answers, error: answersError }, { data: rules, error: rulesError }, { data: tests, error: testsError }] = await Promise.all([
    supabase.from('form_answers').select('question_id, option_id, answer_text').eq('form_id', formId),
    supabase.from('recommendation_rules').select('*').eq('is_active', true),
    supabase.from('rapid_tests').select('*')
  ]);
  if (answersError) throw answersError;
  if (rulesError) throw rulesError;
  if (testsError) throw testsError;

  const testMap = new Map((tests as RapidTest[]).map(test => [test.id, test]));
  const buckets = new Map<string, ScoreBucket>();

  for (const answer of answers as AnswerRow[]) {
    const matchedRules = (rules as RecommendationRule[]).filter(rule => {
      if (rule.question_id !== answer.question_id) return false;
      if (rule.option_id) return rule.option_id === answer.option_id;
      return Boolean(answer.answer_text || answer.option_id);
    });

    for (const rule of matchedRules) {
      const test = testMap.get(rule.test_id);
      if (!test) continue;
      const bucket = buckets.get(rule.test_id) ?? { test, score: 0, reasons: [], warnings: [] };
      bucket.score += Number(rule.score ?? 0);
      if (rule.reason_text && !bucket.reasons.includes(rule.reason_text)) bucket.reasons.push(rule.reason_text);
      if (rule.triggers_warning && rule.warning_message) {
        bucket.warnings.push({ type: rule.warning_type ?? 'preventiva', message: rule.warning_message, test_id: test.id });
      }
      buckets.set(rule.test_id, bucket);
    }
  }

  const ranked = Array.from(buckets.values())
    .filter(bucket => bucket.score > 0)
    .filter(bucket => bucket.test.is_active && bucket.test.stock > 0)
    .filter(bucket => bucket.test.is_main_test && !bucket.test.is_complementary_product)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  await Promise.all([
    supabase.from('recommendations').delete().eq('form_id', formId),
    supabase.from('preventive_warnings').delete().eq('form_id', formId)
  ]);

  const recommendationsPayload = ranked.map((bucket, index) => ({
    form_id: formId,
    patient_id: form.patient_id,
    client_id: form.client_id,
    test_id: bucket.test.id,
    priority_score: bucket.score,
    priority_level: priorityLevel(bucket.score),
    reasons: bucket.reasons.length ? bucket.reasons : [`La prueba ${bucket.test.name} coincide con las respuestas registradas.`],
    price_snapshot: bucket.test.price,
    stock_snapshot: bucket.test.stock,
    position: index + 1
  }));

  let recommendations: Recommendation[] = [];
  if (recommendationsPayload.length) {
    const { data, error } = await supabase.from('recommendations').insert(recommendationsPayload).select('*, rapid_tests(*)');
    if (error) throw error;
    recommendations = data as Recommendation[];
  }

  const warningPayload = ranked.flatMap(bucket => bucket.warnings).map(warning => ({
    form_id: formId,
    patient_id: form.patient_id,
    client_id: form.client_id,
    test_id: warning.test_id,
    warning_type: warning.type,
    message: warning.message
  }));

  let warnings: PreventiveWarning[] = [];
  if (warningPayload.length) {
    const { data, error } = await supabase.from('preventive_warnings').insert(warningPayload).select('*');
    if (error) throw error;
    warnings = data as PreventiveWarning[];
  }

  return { recommendations, warnings };
}

export async function loadResult(formId: string) {
  const [{ data: recommendations, error: recError }, { data: warnings, error: warningError }] = await Promise.all([
    supabase.from('recommendations').select('*, rapid_tests(*)').eq('form_id', formId).order('position'),
    supabase.from('preventive_warnings').select('*').eq('form_id', formId).order('created_at')
  ]);
  if (recError) throw recError;
  if (warningError) throw warningError;

  const recs = recommendations as Recommendation[];
  const needsIronComplement = recs.some(item => item.rapid_tests?.name === 'Hierro / Ferritina');
  let complements: RapidTest[] = [];
  if (needsIronComplement) {
    const { data, error } = await supabase
      .from('rapid_tests')
      .select('*')
      .eq('is_complementary_product', true)
      .eq('is_active', true)
      .gt('stock', 0);
    if (error) throw error;
    complements = data as RapidTest[];
  }

  return { recommendations: recs, warnings: warnings as PreventiveWarning[], complements };
}


function getAnswerValueForAI(answer: AnswerRow, optionMap: Map<string, any>) {
  if (answer.option_id) {
    const option = optionMap.get(answer.option_id);
    if (option?.label) return option.label;
  }

  if (answer.answer_text !== null && answer.answer_text !== undefined) {
    return answer.answer_text;
  }

  return null;
}

export async function loadPreventiveAIContext(
  formId: string,
  recommendations: Recommendation[]
) {
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('id, patient_id, client_id')
    .eq('id', formId)
    .single();

  if (formError) throw formError;

  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, full_name, age, sex, district')
    .eq('id', form.patient_id)
    .maybeSingle();

  if (patientError) throw patientError;

  const { data: answerRows, error: answersError } = await supabase
    .from('form_answers')
    .select('question_id, option_id, answer_text')
    .eq('form_id', formId);

  if (answersError) throw answersError;

  const answers = (answerRows ?? []) as AnswerRow[];

  const questionIds = Array.from(
    new Set(
      answers
        .map(answer => answer.question_id)
        .filter(Boolean)
    )
  );

  const optionIds = Array.from(
    new Set(
      answers
        .map(answer => answer.option_id)
        .filter(Boolean)
    )
  ) as string[];

  const [{ data: questions, error: questionsError }, { data: options, error: optionsError }] =
    await Promise.all([
      questionIds.length
        ? supabase
            .from('questions')
            .select('id, question_text, section, question_type')
            .in('id', questionIds)
        : Promise.resolve({ data: [], error: null } as any),

      optionIds.length
        ? supabase
            .from('question_options')
            .select('id, label')
            .in('id', optionIds)
        : Promise.resolve({ data: [], error: null } as any)
    ]);

  if (questionsError) throw questionsError;
  if (optionsError) throw optionsError;

  const questionMap = new Map((questions ?? []).map((question: any) => [question.id, question]));
  const optionMap = new Map((options ?? []).map((option: any) => [option.id, option]));

  const { data: rapidTests, error: testsError } = await supabase
    .from('rapid_tests')
    .select('id, name, description, price, sample_type, result_time, is_active, stock')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (testsError) throw testsError;

  return {
    patient: {
      id: patient?.id,
      full_name: patient?.full_name,
      age: patient?.age,
      sex: patient?.sex,
      district: patient?.district
    },

    answers: answers.map(answer => {
      const question = questionMap.get(answer.question_id);

      return {
        question_id: answer.question_id,
        question: question?.question_text ?? 'Pregunta no identificada',
        answer: getAnswerValueForAI(answer, optionMap),
        section: question?.section ?? null
      };
    }),

    recommendedTests: recommendations.map((item: any) => ({
      recommendation_id: item.id,
      test_id: item.test_id,
      name: item.rapid_tests?.name ?? 'Prueba recomendada',
      description: item.rapid_tests?.description ?? null,
      priority_level: item.priority_level ?? null,
      priority_score: item.priority_score ?? null,
      reasons: Array.isArray(item.reasons) ? item.reasons : [],
      price_snapshot: item.price_snapshot ?? null,
      sample_type: item.rapid_tests?.sample_type ?? null,
      result_time: item.rapid_tests?.result_time ?? null
    })),

    availableTests: (rapidTests ?? []).map((test: any) => ({
      id: test.id,
      name: test.name,
      description: test.description,
      price: test.price,
      sample_type: test.sample_type,
      result_time: test.result_time,
      active: test.is_active,
      stock: test.stock
    }))
  };
}

export async function savePreventiveAIResult(
  formId: string,
  aiResult: PreventiveAIResponse
) {
  const { data, error } = await supabase
    .from('forms')
    .update({
      ai_result: aiResult,
      ai_result_status: 'completed',
      ai_result_error: null,
      ai_result_generated_at: new Date().toISOString()
    })
    .eq('id', formId)
    .select('*')
    .single();

  if (error) throw error;

  return data;
}

export async function savePreventiveAIError(formId: string, message: string) {
  const { error } = await supabase
    .from('forms')
    .update({
      ai_result_status: 'failed',
      ai_result_error: message
    })
    .eq('id', formId);

  if (error) throw error;
}


export async function loadPreventiveAIResult(formId: string) {
  const { data, error } = await supabase
    .from('forms')
    .select(`
      id,
      ai_result,
      ai_result_status,
      ai_result_error,
      ai_result_generated_at
    `)
    .eq('id', formId)
    .single();

  if (error) throw error;

  return data;
}

export async function markPreventiveAIGenerating(formId: string) {
  const { data, error } = await supabase
    .from('forms')
    .update({
      ai_result_status: 'generating',
      ai_result_error: null
    })
    .eq('id', formId)
    .select(`
      id,
      ai_result,
      ai_result_status,
      ai_result_error,
      ai_result_generated_at
    `)
    .single();

  if (error) throw error;

  return data;
}
