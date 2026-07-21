import { supabase } from '../../../shared/lib/supabase';
import type { RapidTest } from '../../../shared/types/models';

export async function listRapidTests() {
  const { data, error } = await supabase.from('rapid_tests').select('*').order('name');
  if (error) throw error;
  return data as RapidTest[];
}

export async function saveRapidTest(input: Partial<RapidTest>) {
  if (input.id) {
    const { data, error } = await supabase.from('rapid_tests').update(input).eq('id', input.id).select('*').single();
    if (error) throw error;
    return data as RapidTest;
  }
  const { data, error } = await supabase.from('rapid_tests').insert(input).select('*').single();
  if (error) throw error;
  return data as RapidTest;
}

export async function toggleRapidTest(id: string, is_active: boolean) {
  const { error } = await supabase.from('rapid_tests').update({ is_active }).eq('id', id);
  if (error) throw error;
}

export async function deleteRapidTest(id: string) {
  const { error } = await supabase
    .from('rapid_tests')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
