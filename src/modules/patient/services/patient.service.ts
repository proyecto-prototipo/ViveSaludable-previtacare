import { supabase } from '../../../shared/lib/supabase';
import type { Patient, PreventiveForm, Question } from '../../../shared/types/models';
import { generateRecommendations } from '../../recommendation/services/recommendation.service';
import type { AnswerValue, PatientFormInput } from '../types';

export async function loadPublicForm(token: string) {
  const { data, error } = await supabase.from('forms').select('*, patients(*)').eq('public_token', token).maybeSingle();
  if (error) throw error;
  return data as (PreventiveForm & { patients: Patient | null }) | null;
}

export async function loadActiveQuestions() {
  const { data, error } = await supabase.from('questions').select('*, question_options(*)').eq('is_active', true).order('order_index');
  if (error) throw error;
  return data as Question[];
}

export async function submitPublicForm(params: { token: string; patient: PatientFormInput; answers: Record<string, AnswerValue> }) {
  const form = await loadPublicForm(params.token);
  if (!form) throw new Error('Formulario no encontrado o token inválido.');
  if (form.status === 'completed') return generateRecommendations(form.id);

  let patientId = form.patient_id;
  if (patientId) {
    const { error } = await supabase.from('patients').update({
      full_name: params.patient.full_name,
      age: params.patient.age,
      sex: params.patient.sex,
      contact: params.patient.contact,
      district: params.patient.district,
      consent_accepted: params.patient.consent_accepted
    }).eq('id', patientId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('patients').insert({
      client_id: form.client_id,
      full_name: params.patient.full_name,
      age: params.patient.age,
      sex: params.patient.sex,
      contact: params.patient.contact,
      district: params.patient.district,
      consent_accepted: params.patient.consent_accepted
    }).select('*').single();
    if (error) throw error;
    patientId = data.id;
  }

  const answerRows = Object.entries(params.answers).flatMap(([questionId, value]) => {
    if (Array.isArray(value)) return value.map(optionId => ({ form_id: form.id, question_id: questionId, option_id: optionId, answer_text: null }));
    const isOptionId = value.length > 20 && value.includes('-');
    return [{ form_id: form.id, question_id: questionId, option_id: isOptionId ? value : null, answer_text: isOptionId ? null : value }];
  }).filter(row => row.option_id || row.answer_text);

  await supabase.from('form_answers').delete().eq('form_id', form.id);
  if (answerRows.length) {
    const { error } = await supabase.from('form_answers').insert(answerRows);
    if (error) throw error;
  }

  const { error: updateError } = await supabase.from('forms').update({
    patient_id: patientId,
    status: 'completed',
    consent_accepted: true,
    preventive_disclaimer_accepted: true,
    completed_at: new Date().toISOString()
  }).eq('id', form.id);
  if (updateError) throw updateError;

  return generateRecommendations(form.id);
}
