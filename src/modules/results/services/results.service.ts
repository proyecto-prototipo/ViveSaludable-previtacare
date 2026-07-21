import { supabase } from '../../../shared/lib/supabase';
import type { PerformedTest } from '../../../shared/types/models';
import type { ResultInput } from '../types';

export async function listPerformedTests(clientId?: string | null) {
  let query = supabase.from('performed_tests').select('*, patients(*), rapid_tests(*)').order('performed_at', { ascending: false });
  if (clientId) query = query.eq('client_id', clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data as PerformedTest[];
}

export async function createPerformedTest(input: ResultInput & { client_id: string; performed_by: string }) {
  const { data, error } = await supabase.from('performed_tests').insert(input).select('*, patients(*), rapid_tests(*)').single();
  if (error) throw error;
  return data as PerformedTest;
}
