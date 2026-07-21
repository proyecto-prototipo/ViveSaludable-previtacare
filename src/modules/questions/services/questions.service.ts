import { supabase } from '../../../shared/lib/supabase';
import type { Question, QuestionOption, RecommendationRule } from '../../../shared/types/models';

export async function listQuestionsWithOptions() {
  const { data, error } = await supabase.from('questions').select('*, question_options(*)').order('order_index');
  if (error) throw error;
  return data as Question[];
}

export async function saveQuestion(input: Partial<Question>) {
  const payload = { ...input };
  delete (payload as any).question_options;
  if (input.id) {
    const { data, error } = await supabase.from('questions').update(payload).eq('id', input.id).select('*').single();
    if (error) throw error;
    return data as Question;
  }
  const { data, error } = await supabase.from('questions').insert(payload).select('*').single();
  if (error) throw error;
  return data as Question;
}

export async function saveOption(input: Partial<QuestionOption>) {
  const { data, error } = await supabase.from('question_options').insert(input).select('*').single();
  if (error) throw error;
  return data as QuestionOption;
}

export async function listRules() {
  const { data, error } = await supabase.from('recommendation_rules').select('*, questions(question_text), question_options(label), rapid_tests(name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data as RecommendationRule[];
}

export async function saveRule(input: Partial<RecommendationRule>) {
  const { data, error } = await supabase.from('recommendation_rules').insert(input).select('*').single();
  if (error) throw error;
  return data as RecommendationRule;
}

export async function deleteRule(id: string) {
  const { error } = await supabase
    .from('recommendation_rules')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
