# ViveSaludable | PREVITACARE SAC

Sistema web real para prevención personalizada con pruebas rápidas. Incluye autenticación, roles, Supabase, RLS, catálogo de pruebas, configurador de preguntas, reglas ponderadas, formulario público por token, recomendaciones, resultados y reportes.

## Tecnologías

- React + TypeScript
- Vite
- Supabase Auth + PostgreSQL + RLS
- CSS modular por módulo/rol
- Diseño responsive

## Estructura principal

```txt
src/
  app/
  shared/
  modules/
    auth/
    admin/
    institutional/
    patient/
    recommendation/
    tests/
    questions/
    results/
    reports/
  supabase/
    migrations/
    seed.sql
```

Cada módulo tiene sus propias carpetas `pages`, `components`, `services`, `styles` y `types.ts`. Lo compartido está en `src/shared`.

## Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

Configura `.env`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
VITE_PUBLIC_APP_URL=http://localhost:5173
```

## Base de datos Supabase

Ejecuta en Supabase SQL Editor, en este orden:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls.sql`
3. `supabase/seed.sql`

## Edge Function para crear usuarios internos

El módulo de usuarios usa una Edge Function segura porque Supabase Auth no permite crear usuarios de otras cuentas solo desde el frontend. Despliega la función:

```bash
supabase functions deploy create-user
```

La función usa `SUPABASE_SERVICE_ROLE_KEY` en el entorno de Supabase Functions. No coloques esa clave en el frontend.

## Crear administrador inicial

1. Crea un usuario desde Supabase Auth con el correo del administrador.
2. Ejecuta este SQL cambiando el correo:

```sql
update public.profiles
set role = 'admin', status = 'active', full_name = 'Administrador PREVITACARE'
where email = 'admin@previtacare.com';
```

## Flujo validado

1. Cliente institucional se registra en `/registro-cliente`.
2. La cuenta queda `pending`.
3. Administrador aprueba al cliente desde `/admin/clientes`.
4. Cliente institucional ingresa a `/cliente/dashboard`.
5. Cliente registra paciente.
6. Cliente genera enlace público del formulario.
7. Paciente completa el formulario y acepta consentimiento.
8. Motor ponderado genera recomendaciones reales.
9. Cliente registra prueba realizada y resultado.
10. Admin ve información global y exporta reportes.
11. Cliente exporta solo sus propios reportes.

## Notas importantes de producción

- El sistema no diagnostica enfermedades. Solo genera orientación preventiva.
- El ranking descarta pruebas inactivas, sin stock o productos complementarios.
- `Optifer F` está marcado como producto complementario, por eso no aparece en el ranking principal.
- RLS separa información por `client_id`.
- Para producción estricta, se recomienda mover el envío del formulario público y la generación de recomendaciones a una Edge Function de Supabase con validación adicional del token. La versión incluida funciona con RLS y token público seguro desde frontend.

## Diseño

La interfaz usa una línea médica moderna: azul, turquesa, verde, tarjetas limpias, dashboards con KPIs, tablas con acciones, formulario por pasos y experiencia responsive.
