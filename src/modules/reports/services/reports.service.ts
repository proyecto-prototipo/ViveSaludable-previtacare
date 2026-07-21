import { supabase } from '../../../shared/lib/supabase';

export async function getReportData(clientId?: string | null) {
  const patientQuery = supabase.from('patients').select('*').order('created_at', { ascending: false });
  const recommendationsQuery = supabase.from('recommendations').select('*, rapid_tests(name), patients(full_name, code)').order('created_at', { ascending: false });
  const performedQuery = supabase.from('performed_tests').select('*, rapid_tests(name), patients(full_name, code)').order('created_at', { ascending: false });
  if (clientId) {
    patientQuery.eq('client_id', clientId);
    recommendationsQuery.eq('client_id', clientId);
    performedQuery.eq('client_id', clientId);
  }
  const [patients, recommendations, performed] = await Promise.all([patientQuery, recommendationsQuery, performedQuery]);
  if (patients.error) throw patients.error;
  if (recommendations.error) throw recommendations.error;
  if (performed.error) throw performed.error;
  return { patients: patients.data ?? [], recommendations: recommendations.data ?? [], performed: performed.data ?? [] };
}

export async function logReportExport(userId: string, reportType: string, clientId?: string | null, filters: Record<string, unknown> = {}) {
  await supabase.from('report_exports').insert({ user_id: userId, client_id: clientId, report_type: reportType, filters });
}
