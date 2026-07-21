-- ViveSaludable | Seguridad RLS por rol y client_id
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.patients enable row level security;
alter table public.rapid_tests enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.recommendation_rules enable row level security;
alter table public.forms enable row level security;
alter table public.form_answers enable row level security;
alter table public.recommendations enable row level security;
alter table public.preventive_warnings enable row level security;
alter table public.performed_tests enable row level security;
alter table public.report_exports enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy profiles_select on public.profiles for select using (public.is_admin() or id = auth.uid() or client_id = public.current_client_id());
create policy profiles_update on public.profiles for update using (public.is_admin() or id = auth.uid()) with check (public.is_admin() or id = auth.uid());

-- clients
create policy clients_select on public.clients for select using (public.is_admin() or id = public.current_client_id());
create policy clients_insert_authenticated on public.clients for insert to authenticated with check (true);
create policy clients_update_admin on public.clients for update using (public.is_admin()) with check (public.is_admin());

-- patients
create policy patients_select on public.patients for select using (public.is_admin() or client_id = public.current_client_id() or exists(select 1 from public.forms f where f.patient_id = patients.id and f.public_token is not null));
create policy patients_insert_staff on public.patients for insert to authenticated with check (public.is_admin() or client_id = public.current_client_id());
create policy patients_insert_public_form on public.patients for insert to anon with check (consent_accepted = true and exists(select 1 from public.clients c where c.id = client_id and c.status = 'active'));
create policy patients_update_staff on public.patients for update using (public.is_admin() or client_id = public.current_client_id()) with check (public.is_admin() or client_id = public.current_client_id());
create policy patients_update_public_form on public.patients for update to anon using (exists(select 1 from public.forms f where f.patient_id = patients.id and f.public_token is not null and f.status = 'draft')) with check (true);

-- catalogs
create policy rapid_tests_read on public.rapid_tests for select using (public.is_admin() or is_active = true);
create policy rapid_tests_write_admin on public.rapid_tests for all using (public.is_admin()) with check (public.is_admin());
create policy questions_read on public.questions for select using (public.is_admin() or is_active = true);
create policy questions_write_admin on public.questions for all using (public.is_admin()) with check (public.is_admin());
create policy question_options_read on public.question_options for select using (public.is_admin() or is_active = true);
create policy question_options_write_admin on public.question_options for all using (public.is_admin()) with check (public.is_admin());
create policy rules_read on public.recommendation_rules for select using (public.is_admin() or is_active = true);
create policy rules_write_admin on public.recommendation_rules for all using (public.is_admin()) with check (public.is_admin());

-- forms
create policy forms_select_staff on public.forms for select using (public.is_admin() or client_id = public.current_client_id());
create policy forms_select_public on public.forms for select to anon using (public_token is not null);
create policy forms_insert_staff on public.forms for insert to authenticated with check (public.is_admin() or client_id = public.current_client_id());
create policy forms_update_staff on public.forms for update using (public.is_admin() or client_id = public.current_client_id()) with check (public.is_admin() or client_id = public.current_client_id());
create policy forms_update_public on public.forms for update to anon using (public_token is not null and status = 'draft') with check (public_token is not null);

-- answers
create policy answers_select_staff on public.form_answers for select using (public.is_admin() or exists(select 1 from public.forms f where f.id = form_answers.form_id and f.client_id = public.current_client_id()) or exists(select 1 from public.forms f where f.id = form_answers.form_id and f.public_token is not null));
create policy answers_insert_staff on public.form_answers for insert to authenticated with check (public.is_admin() or exists(select 1 from public.forms f where f.id = form_id and f.client_id = public.current_client_id()));
create policy answers_insert_public on public.form_answers for insert to anon with check (exists(select 1 from public.forms f where f.id = form_id and f.public_token is not null and f.status = 'draft'));
create policy answers_delete_staff_public on public.form_answers for delete using (public.is_admin() or exists(select 1 from public.forms f where f.id = form_answers.form_id and (f.client_id = public.current_client_id() or f.public_token is not null)));

-- recommendations and warnings
create policy recommendations_select on public.recommendations for select using (public.is_admin() or client_id = public.current_client_id() or exists(select 1 from public.forms f where f.id = recommendations.form_id and f.public_token is not null));
create policy recommendations_insert on public.recommendations for insert with check (public.is_admin() or client_id = public.current_client_id() or exists(select 1 from public.forms f where f.id = form_id and f.public_token is not null));
create policy recommendations_delete on public.recommendations for delete using (public.is_admin() or client_id = public.current_client_id() or exists(select 1 from public.forms f where f.id = recommendations.form_id and f.public_token is not null));
create policy warnings_select on public.preventive_warnings for select using (public.is_admin() or client_id = public.current_client_id() or exists(select 1 from public.forms f where f.id = preventive_warnings.form_id and f.public_token is not null));
create policy warnings_insert on public.preventive_warnings for insert with check (public.is_admin() or client_id = public.current_client_id() or exists(select 1 from public.forms f where f.id = form_id and f.public_token is not null));
create policy warnings_delete on public.preventive_warnings for delete using (public.is_admin() or client_id = public.current_client_id() or exists(select 1 from public.forms f where f.id = preventive_warnings.form_id and f.public_token is not null));

-- performed tests and reports
create policy performed_select on public.performed_tests for select using (public.is_admin() or client_id = public.current_client_id());
create policy performed_insert on public.performed_tests for insert with check (public.is_admin() or client_id = public.current_client_id());
create policy performed_update on public.performed_tests for update using (public.is_admin() or client_id = public.current_client_id()) with check (public.is_admin() or client_id = public.current_client_id());
create policy report_exports_select on public.report_exports for select using (public.is_admin() or user_id = auth.uid() or client_id = public.current_client_id());
create policy report_exports_insert on public.report_exports for insert with check (public.is_admin() or user_id = auth.uid() or client_id = public.current_client_id());
create policy audit_admin on public.audit_logs for all using (public.is_admin()) with check (public.is_admin());
