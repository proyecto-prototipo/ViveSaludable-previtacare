import { supabase } from '../../../shared/lib/supabase';
import type { ClientRegisterInput } from '../types';

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function registerInstitutionalClient(input: ClientRegisterInput) {
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.responsible_name,
        role: 'institutional',
        status: 'active'
      }
    }
  });

  if (signUpError) throw signUpError;
  if (!authData.user) throw new Error('No se pudo crear el usuario institucional.');

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: input.name,
      client_type: input.client_type,
      responsible_name: input.responsible_name,
      email: input.email,
      phone: input.phone,
      district: input.district,
      status: 'active',
      activation_date: new Date().toISOString()
    })
    .select('*')
    .single();

  if (clientError) throw clientError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: input.responsible_name,
      email: input.email,
      role: 'institutional',
      client_id: client.id,
      status: 'active'
    })
    .eq('id', authData.user.id);

  if (profileError) throw profileError;

  return { user: authData.user, client };
}
