import { supabase } from '../../../shared/lib/supabase';
import type { Patient, PreventiveForm, Recommendation } from '../../../shared/types/models';
import type { InstitutionalMetrics } from '../types';

export async function getInstitutionalMetrics(clientId: string): Promise<InstitutionalMetrics> {
  const [patients, forms, recommendations, performedTests] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    supabase.from('forms').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    supabase.from('recommendations').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    supabase.from('performed_tests').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
  ]);
  return { patients: patients.count ?? 0, forms: forms.count ?? 0, recommendations: recommendations.count ?? 0, performedTests: performedTests.count ?? 0 };
}

export async function listMyPatients(clientId: string) {
  const { data, error } = await supabase.from('patients').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Patient[];
}

export async function createPatient(input: Partial<Patient>) {
  const { data, error } = await supabase.from('patients').insert(input).select('*').single();
  if (error) throw error;
  return data as Patient;
}

export async function createPublicForm(input: Partial<PreventiveForm>) {
  const { data, error } = await supabase.from('forms').insert(input).select('*').single();
  if (error) throw error;
  return data as PreventiveForm;
}

export async function listMyForms(clientId: string) {
  const { data, error } = await supabase.from('forms').select('*, patients(full_name, code)').eq('client_id', clientId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listMyRecommendations(clientId: string) {
  const { data, error } = await supabase.from('recommendations').select('*, rapid_tests(*), patients(full_name, code)').eq('client_id', clientId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Recommendation[];
}


export async function listMyUsers(clientId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMyInternalUser(input: { email: string; password: string; full_name: string; client_id: string }) {
  const { data, error } = await supabase.functions.invoke('create-user', { body: { ...input, role: 'institutional', status: 'active' } });
  if (error) throw error;
  return data;
}

export async function updatePatient(
  id: string,
  payload: Partial<{
    full_name: string;
    code: string;
    age: number;
    sex: string;
    contact: string;
    district: string;
    consent_accepted: boolean;
  }>
) {
  const { data, error } = await supabase
    .from('patients')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deletePatient(id: string) {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function updateMyInternalUser(
  id: string,
  payload: Partial<{
    full_name: string;
    status: string;
  }>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMyInternalUser(id: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}


export async function getMyInstitutionProfile(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateMyInstitutionProfile(
  profileId: string,
  payload: Partial<{
    full_name: string;
  }>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function getMyInstitutionClient(clientId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateMyInstitutionClient(
  clientId: string,
  payload: Partial<{
    name: string;
    client_type: string;
    responsible_name: string;
    email: string;
    phone: string;
    district: string;
  }>
) {
  const { data, error } = await supabase
    .from('clients')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
