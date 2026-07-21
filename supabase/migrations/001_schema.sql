-- ViveSaludable | Esquema principal Supabase
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_type text not null,
  responsible_name text not null,
  email text not null,
  phone text,
  district text,
  status text not null default 'pending' check (status in ('pending','active','suspended','inactive')),
  activation_date timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'institutional' check (role in ('admin','institutional','patient')),
  client_id uuid references public.clients(id) on delete set null,
  status text not null default 'pending' check (status in ('active','pending','suspended','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'institutional'),
    coalesce(new.raw_user_meta_data->>'status', 'pending')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  code text,
  full_name text,
  age integer not null check (age >= 0 and age <= 120),
  sex text not null,
  contact text,
  district text,
  consent_accepted boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger patients_updated_at before update on public.patients for each row execute function public.set_updated_at();

create table if not exists public.rapid_tests (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  price numeric(10,2) not null check (price >= 0),
  includes_igv boolean not null default true,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  is_main_test boolean not null default true,
  is_complementary_product boolean not null default false,
  sample_type text,
  result_time text,
  conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger rapid_tests_updated_at before update on public.rapid_tests for each row execute function public.set_updated_at();

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('datos','sintomas','habitos','antecedentes','factores_riesgo')),
  question_text text not null,
  question_type text not null check (question_type in ('single','multiple','text','number','boolean')),
  is_required boolean not null default false,
  is_active boolean not null default true,
  order_index integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger questions_updated_at before update on public.questions for each row execute function public.set_updated_at();

create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  value text not null,
  is_active boolean not null default true,
  order_index integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_rules (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_id uuid references public.question_options(id) on delete cascade,
  test_id uuid not null references public.rapid_tests(id) on delete cascade,
  score integer not null default 1,
  reason_text text,
  triggers_warning boolean not null default false,
  warning_type text,
  warning_message text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger recommendation_rules_updated_at before update on public.recommendation_rules for each row execute function public.set_updated_at();

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  completed_by uuid references public.profiles(id) on delete set null,
  public_token text unique,
  status text not null default 'draft' check (status in ('draft','completed')),
  consent_accepted boolean not null default false,
  preventive_disclaimer_accepted boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger forms_updated_at before update on public.forms for each row execute function public.set_updated_at();

create table if not exists public.form_answers (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  option_id uuid references public.question_options(id) on delete set null,
  answer_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  test_id uuid not null references public.rapid_tests(id) on delete cascade,
  priority_score integer not null,
  priority_level text not null check (priority_level in ('alta','media','baja')),
  reasons jsonb not null default '[]'::jsonb,
  price_snapshot numeric(10,2) not null,
  stock_snapshot integer not null,
  position integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.preventive_warnings (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  test_id uuid references public.rapid_tests(id) on delete set null,
  warning_type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.performed_tests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  test_id uuid not null references public.rapid_tests(id) on delete cascade,
  performed_by uuid not null references public.profiles(id) on delete restrict,
  result_status text not null,
  result_value text,
  observation text,
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger performed_tests_updated_at before update on public.performed_tests for each row execute function public.set_updated_at();

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  report_type text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  role text,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
