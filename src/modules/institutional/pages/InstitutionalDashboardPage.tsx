import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users
} from 'lucide-react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { LoadingState } from '../../../shared/components/LoadingState';
import { getInstitutionalMetrics } from '../services/institutional.service';
import type { InstitutionalMetrics } from '../types';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/institutional.css';

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

export function InstitutionalDashboardPage() {
  const { profile } = useAuth();

  const [metrics, setMetrics] = useState<InstitutionalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(options?: { silent?: boolean }) {
    if (!profile?.client_id) {
      setLoading(false);
      return;
    }

    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const data = await getInstitutionalMetrics(profile.client_id);
      setMetrics(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las métricas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    if (!profile?.client_id) return;

    const channel = supabase
      .channel(`institutional-dashboard-${profile.client_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `client_id=eq.${profile.client_id}`
        },
        () => load({ silent: true }).catch(console.error)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms',
          filter: `client_id=eq.${profile.client_id}`
        },
        () => load({ silent: true }).catch(console.error)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recommendations',
          filter: `client_id=eq.${profile.client_id}`
        },
        () => load({ silent: true }).catch(console.error)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performed_tests'
        },
        () => load({ silent: true }).catch(console.error)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.client_id]);

  const dashboard = useMemo(() => {
    const patients = safeNumber(metrics?.patients);
    const forms = safeNumber(metrics?.forms);
    const recommendations = safeNumber(metrics?.recommendations);
    const performedTests = safeNumber(metrics?.performedTests);

    const totalActivity = patients + forms + recommendations + performedTests;
    const maxMetric = Math.max(patients, forms, recommendations, performedTests, 1);

    const formCoverage = percent(forms, Math.max(patients, 1));
    const resultCoverage = percent(performedTests, Math.max(recommendations, 1));

    const preventiveProgress = Math.round(
      (Math.min(formCoverage, 100) +
        Math.min(resultCoverage, 100) +
        (recommendations > 0 ? 100 : 0)) /
        3
    );

    return {
      patients,
      forms,
      recommendations,
      performedTests,
      totalActivity,
      maxMetric,
      formCoverage,
      resultCoverage,
      preventiveProgress
    };
  }, [metrics]);

  const kpis = [
    {
      label: 'Pacientes',
      value: dashboard.patients,
      icon: Users,
      detail: 'Personas registradas por tu institución',
      className: 'blue'
    },
    {
      label: 'Formularios',
      value: dashboard.forms,
      icon: ClipboardList,
      detail: 'Enlaces preventivos generados',
      className: 'green'
    },
    {
      label: 'Recomendaciones',
      value: dashboard.recommendations,
      icon: Activity,
      detail: 'Pruebas sugeridas por reglas',
      className: 'purple'
    },
    {
      label: 'Resultados',
      value: dashboard.performedTests,
      icon: HeartPulse,
      detail: 'Pruebas realizadas registradas',
      className: 'rose'
    }
  ];

  const bars = [
    {
      label: 'Pacientes',
      value: dashboard.patients,
      icon: Users,
      width: percent(dashboard.patients, dashboard.maxMetric)
    },
    {
      label: 'Formularios',
      value: dashboard.forms,
      icon: ClipboardList,
      width: percent(dashboard.forms, dashboard.maxMetric)
    },
    {
      label: 'Recomendaciones',
      value: dashboard.recommendations,
      icon: Activity,
      width: percent(dashboard.recommendations, dashboard.maxMetric)
    },
    {
      label: 'Resultados',
      value: dashboard.performedTests,
      icon: HeartPulse,
      width: percent(dashboard.performedTests, dashboard.maxMetric)
    }
  ];

  if (loading && !metrics) return <LoadingState />;

  return (
    <div className="client-dashboard-page">
      <section className="client-dashboard-hero">
        <div className="client-dashboard-hero-content">
          <span className="client-dashboard-pill">
            <ShieldCheck size={16} />
            Panel institucional
          </span>

          <h1>
            Gestiona la orientación preventiva de tus pacientes desde un solo lugar
          </h1>

          <p>
            Registra pacientes, comparte formularios, revisa recomendaciones y controla resultados
            con información actualizada en tiempo real.
          </p>

          <div className="client-dashboard-hero-actions">
            <Link to="/cliente/pacientes" className="client-dashboard-primary-action">
              <UserPlus size={18} />
              Registrar paciente
            </Link>

            <Link to="/cliente/formularios" className="client-dashboard-secondary-action">
              <QrCode size={18} />
              Generar formulario
            </Link>
          </div>
        </div>

        <div className="client-dashboard-hero-visual">
          <div className="client-dashboard-orbit">
            <Sparkles size={44} />
          </div>

          <div className="client-dashboard-floating-card floating-one">
            <Users size={17} />
            <div>
              <span>Pacientes</span>
              <strong>{dashboard.patients}</strong>
            </div>
          </div>

          <div className="client-dashboard-floating-card floating-two">
            <Activity size={17} />
            <div>
              <span>Recomendaciones</span>
              <strong>{dashboard.recommendations}</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="client-dashboard-refresh"
          onClick={() => load({ silent: true })}
        >
          <RefreshCw size={18} className={refreshing ? 'client-dashboard-spin' : ''} />
          {refreshing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </section>

      {error ? (
        <div className="client-dashboard-error">
          {error}
        </div>
      ) : null}

      <section className="client-dashboard-kpis">
        {kpis.map(item => {
          const Icon = item.icon;

          return (
            <article className="client-dashboard-kpi" key={item.label}>
              <div className={`client-dashboard-kpi-icon ${item.className}`}>
                <Icon size={25} />
              </div>

              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="client-dashboard-grid">
        <article className="client-dashboard-panel client-dashboard-progress-panel">
          <div className="client-dashboard-panel-header">
            <div>
              <h2>Avance preventivo</h2>
              <p>Relación entre formularios, recomendaciones y resultados registrados.</p>
            </div>

            <TrendingUp size={24} />
          </div>

          <div className="client-dashboard-progress-content">
            <div
              className="client-dashboard-donut"
              style={{ '--progress': `${dashboard.preventiveProgress}%` } as React.CSSProperties}
            >
              <div>
                <strong>{dashboard.preventiveProgress}%</strong>
                <span>avance</span>
              </div>
            </div>

            <div className="client-dashboard-progress-info">
              <div>
                <span>Formularios por paciente</span>
                <strong>{dashboard.formCoverage}%</strong>
              </div>

              <div>
                <span>Resultados frente a recomendaciones</span>
                <strong>{dashboard.resultCoverage}%</strong>
              </div>

              <div>
                <span>Actividad total</span>
                <strong>{dashboard.totalActivity}</strong>
              </div>
            </div>
          </div>
        </article>

        <article className="client-dashboard-panel">
          <div className="client-dashboard-panel-header">
            <div>
              <h2>Actividad por módulo</h2>
              <p>Comparativa visual de las cantidades registradas.</p>
            </div>

            <BarChart3 size={24} />
          </div>

          <div className="client-dashboard-bars">
            {bars.map(item => {
              const Icon = item.icon;

              return (
                <div className="client-dashboard-bar-row" key={item.label}>
                  <div className="client-dashboard-bar-label">
                    <Icon size={17} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>

                  <div className="client-dashboard-bar-track">
                    <div
                      className="client-dashboard-bar-fill"
                      style={{ width: `${item.width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="client-dashboard-grid bottom">
        <article className="client-dashboard-panel">
          <div className="client-dashboard-panel-header">
            <div>
              <h2>Flujo de atención preventiva</h2>
              <p>Estado general del proceso institucional.</p>
            </div>

            <CheckCircle2 size={24} />
          </div>

          <div className="client-dashboard-flow">
            <div className="client-dashboard-flow-step active">
              <div>
                <Users size={18} />
              </div>
              <span>Paciente</span>
              <strong>{dashboard.patients}</strong>
            </div>

            <ArrowRight size={18} className="client-dashboard-flow-arrow" />

            <div className="client-dashboard-flow-step active">
              <div>
                <FileText size={18} />
              </div>
              <span>Formulario</span>
              <strong>{dashboard.forms}</strong>
            </div>

            <ArrowRight size={18} className="client-dashboard-flow-arrow" />

            <div className="client-dashboard-flow-step active">
              <div>
                <Sparkles size={18} />
              </div>
              <span>Recomendación</span>
              <strong>{dashboard.recommendations}</strong>
            </div>

            <ArrowRight size={18} className="client-dashboard-flow-arrow" />

            <div className="client-dashboard-flow-step active">
              <div>
                <HeartPulse size={18} />
              </div>
              <span>Resultado</span>
              <strong>{dashboard.performedTests}</strong>
            </div>
          </div>
        </article>

        <article className="client-dashboard-panel">
          <div className="client-dashboard-panel-header">
            <div>
              <h2>Accesos rápidos</h2>
              <p>Continúa con las acciones más usadas por tu institución.</p>
            </div>

            <Plus size={24} />
          </div>

          <div className="client-dashboard-actions-grid">
            <Link to="/cliente/pacientes" className="client-dashboard-action-card">
              <UserPlus size={21} />
              <div>
                <strong>Registrar paciente</strong>
                <span>Agregar una nueva persona a tu cuenta</span>
              </div>
            </Link>

            <Link to="/cliente/formularios" className="client-dashboard-action-card">
              <QrCode size={21} />
              <div>
                <strong>Crear formulario</strong>
                <span>Generar enlace o QR preventivo</span>
              </div>
            </Link>

            <Link to="/cliente/recomendaciones" className="client-dashboard-action-card">
              <Activity size={21} />
              <div>
                <strong>Ver recomendaciones</strong>
                <span>Revisar pruebas sugeridas</span>
              </div>
            </Link>

            <Link to="/cliente/resultados" className="client-dashboard-action-card">
              <HeartPulse size={21} />
              <div>
                <strong>Registrar resultado</strong>
                <span>Guardar una prueba realizada</span>
              </div>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}