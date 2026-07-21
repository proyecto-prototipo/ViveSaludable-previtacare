import { supabase } from '../../../shared/lib/supabase';
import type { Client, Patient, Recommendation } from '../../../shared/types/models';
import type { AdminMetrics } from '../types';

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const [clients, activeClients, pendingClients, patients, forms, recommendations, performedTests] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('forms').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('recommendations').select('id', { count: 'exact', head: true }),
    supabase.from('performed_tests').select('id', { count: 'exact', head: true })
  ]);
  return {
    clients: clients.count ?? 0,
    activeClients: activeClients.count ?? 0,
    pendingClients: pendingClients.count ?? 0,
    patients: patients.count ?? 0,
    forms: forms.count ?? 0,
    recommendations: recommendations.count ?? 0,
    performedTests: performedTests.count ?? 0
  };
}

export async function listClients() {
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Client[];
}

export async function createClient(input: Partial<Client>) {
  const { data, error } = await supabase.from('clients').insert(input).select('*').single();
  if (error) throw error;
  return data as Client;
}

export async function updateClientStatus(id: string, status: Client['status']) {
  const update: Partial<Client> = { status, activation_date: status === 'active' ? new Date().toISOString() : null };
  const { data, error } = await supabase.from('clients').update(update).eq('id', id).select('*').single();
  if (error) throw error;
  await supabase.from('profiles').update({ status, client_id: id }).eq('client_id', id);
  return data as Client;
}

export async function listAllPatients() {
  const { data, error } = await supabase.from('patients').select('*, clients(name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Patient[];
}

export async function listAllRecommendations() {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*, rapid_tests(*), patients(full_name, code), clients(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Recommendation[];
}

export async function listProfiles() {
  const { data, error } = await supabase.from('profiles').select('*, clients(name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}


export async function createInternalUser(input: { email: string; password: string; full_name: string; role: 'admin' | 'institutional'; client_id?: string | null; status?: string }) {
  const { data, error } = await supabase.functions.invoke('create-user', { body: input });
  if (error) throw error;
  return data;
}

export async function updateClient(
  id: string,
  payload: Partial<{
    name: string;
    client_type: string;
    responsible_name: string;
    email: string;
    phone: string;
    district: string;
    status: string;
  }>
) {
  const { data, error } = await supabase
    .from('clients')
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

export async function updateInternalUser(
  id: string,
  payload: Partial<{
    full_name: string;
    email: string;
    role: 'admin' | 'institutional';
    client_id: string | null;
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
    .select('*, clients(name)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInternalUser(id: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}
