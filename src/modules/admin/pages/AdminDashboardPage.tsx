import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  PieChart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

import { LoadingState } from '../../../shared/components/LoadingState';
import { getAdminMetrics } from '../services/admin.service';
import type { AdminMetrics } from '../types';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/admin.css';

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(Math.round((value / total) * 100), 100);
}

function barWidth(value: number, max: number) {
  if (!max) return 8;
  return Math.max(Math.round((value / max) * 100), 8);
}

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(options?: { silent?: boolean }) {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const data = await getAdminMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las métricas del dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const clientsChannel = supabase
      .channel('admin-dashboard-clients-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    const patientsChannel = supabase
      .channel('admin-dashboard-patients-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients'
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    const formsChannel = supabase
      .channel('admin-dashboard-forms-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms'
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    const recommendationsChannel = supabase
      .channel('admin-dashboard-recommendations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recommendations'
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    const performedTestsChannel = supabase
      .channel('admin-dashboard-performed-tests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'performed_tests'
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(formsChannel);
      supabase.removeChannel(recommendationsChannel);
      supabase.removeChannel(performedTestsChannel);
    };
  }, []);

  const dashboard = useMemo(() => {
    if (!metrics) return null;

    const inactiveClients = Math.max(
      metrics.clients - metrics.activeClients - metrics.pendingClients,
      0
    );

    const activeClientPercent = percent(metrics.activeClients, metrics.clients);
    const pendingClientPercent = percent(metrics.pendingClients, metrics.clients);
    const inactiveClientPercent = percent(inactiveClients, metrics.clients);

    const recommendationRate = percent(metrics.recommendations, metrics.forms);
    const performedRate = percent(metrics.performedTests, metrics.forms);

    const barItems = [
      {
        label: 'Clientes',
        value: metrics.clients,
        icon: Building2
      },
      {
        label: 'Pacientes',
        value: metrics.patients,
        icon: Users
      },
      {
        label: 'Formularios',
        value: metrics.forms,
        icon: FileText
      },
      {
        label: 'Recomendaciones',
        value: metrics.recommendations,
        icon: Activity
      },
      {
        label: 'Resultados',
        value: metrics.performedTests,
        icon: HeartPulse
      }
    ];

    const maxValue = Math.max(...barItems.map(item => item.value), 1);

    return {
      inactiveClients,
      activeClientPercent,
      pendingClientPercent,
      inactiveClientPercent,
      recommendationRate,
      performedRate,
      barItems,
      maxValue
    };
  }, [metrics]);

  if (loading || !metrics || !dashboard) return <LoadingState />;

  return (
    <div className="admin-dashboard-page">
      <section className="admin-dashboard-hero">
        <div>
          <span className="admin-dashboard-hero-pill">
            <ShieldCheck size={16} />
            Centro de control PREVITACARE
          </span>

          <h1>Dashboard PREVITACARE</h1>

          <p>
            Vista global del uso de ViveSaludable: clientes, pacientes, formularios,
            recomendaciones generadas y resultados registrados en la plataforma.
          </p>
        </div>

        <div className="admin-dashboard-hero-visual">
          <div className="admin-dashboard-orbit-main">
            <BarChart3 size={44} />
          </div>

          <div className="admin-dashboard-floating-card dashboard-floating-one">
            <Users size={17} />
            <div>
              <span>Pacientes</span>
              <strong>{metrics.patients}</strong>
            </div>
          </div>

          <div className="admin-dashboard-floating-card dashboard-floating-two">
            <Sparkles size={17} />
            <div>
              <span>Recomendaciones</span>
              <strong>{metrics.recommendations}</strong>
            </div>
          </div>
        </div>

        <button className="admin-dashboard-refresh" type="button" onClick={() => load({ silent: true })}>
          <RefreshCw size={18} className={refreshing ? 'admin-dashboard-spin' : ''} />
          {refreshing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </section>

      {error ? (
        <div className="admin-error-box">
          {error}
        </div>
      ) : null}

      <section className="admin-dashboard-kpis">
        <article className="admin-dashboard-kpi-card">
          <div className="admin-dashboard-kpi-icon">
            <Building2 size={25} />
          </div>

          <div>
            <span>Clientes registrados</span>
            <strong>{metrics.clients}</strong>
            <p>{metrics.activeClients} activos actualmente</p>
          </div>
        </article>

        <article className="admin-dashboard-kpi-card">
          <div className="admin-dashboard-kpi-icon green">
            <Users size={25} />
          </div>

          <div>
            <span>Pacientes evaluados</span>
            <strong>{metrics.patients}</strong>
            <p>Pacientes registrados en la plataforma</p>
          </div>
        </article>

        <article className="admin-dashboard-kpi-card">
          <div className="admin-dashboard-kpi-icon blue">
            <FileText size={25} />
          </div>

          <div>
            <span>Formularios completados</span>
            <strong>{metrics.forms}</strong>
            <p>Base para el motor preventivo</p>
          </div>
        </article>

        <article className="admin-dashboard-kpi-card">
          <div className="admin-dashboard-kpi-icon soft">
            <HeartPulse size={25} />
          </div>

          <div>
            <span>Pruebas realizadas</span>
            <strong>{metrics.performedTests}</strong>
            <p>Resultados registrados por atención</p>
          </div>
        </article>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Estado de clientes</h2>
              <p>Distribución general de clientes institucionales.</p>
            </div>

            <PieChart size={23} />
          </div>

          <div className="admin-dashboard-donut-wrap">
            <div
              className="admin-dashboard-donut"
              style={{
                background: `conic-gradient(
                  #2eb872 0 ${dashboard.activeClientPercent}%,
                  #f59e0b ${dashboard.activeClientPercent}% ${dashboard.activeClientPercent + dashboard.pendingClientPercent}%,
                  #d9e6eb ${dashboard.activeClientPercent + dashboard.pendingClientPercent}% 100%
                )`
              }}
            >
              <div>
                <strong>{dashboard.activeClientPercent}%</strong>
                <span>activos</span>
              </div>
            </div>

            <div className="admin-dashboard-legend">
              <div>
                <span className="legend-dot active" />
                <strong>{metrics.activeClients}</strong>
                <p>Clientes activos</p>
              </div>

              <div>
                <span className="legend-dot pending" />
                <strong>{metrics.pendingClients}</strong>
                <p>Clientes pendientes</p>
              </div>

              <div>
                <span className="legend-dot inactive" />
                <strong>{dashboard.inactiveClients}</strong>
                <p>Otros estados</p>
              </div>
            </div>
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Actividad por módulo</h2>
              <p>Comparativa visual de los principales registros.</p>
            </div>

            <BarChart3 size={23} />
          </div>

          <div className="admin-dashboard-bars">
            {dashboard.barItems.map(item => {
              const Icon = item.icon;

              return (
                <div className="admin-dashboard-bar-row" key={item.label}>
                  <div className="admin-dashboard-bar-label">
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </div>

                  <div className="admin-dashboard-bar-track">
                    <div
                      className="admin-dashboard-bar-fill"
                      style={{ width: `${barWidth(item.value, dashboard.maxValue)}%` }}
                    />
                  </div>

                  <strong>{item.value}</strong>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="admin-dashboard-grid secondary">
        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Flujo preventivo</h2>
              <p>Seguimiento desde formularios hasta resultados registrados.</p>
            </div>

            <TrendingUp size={23} />
          </div>

          <div className="admin-dashboard-flow">
            <div className="admin-dashboard-flow-item">
              <div>
                <FileText size={22} />
              </div>

              <strong>{metrics.forms}</strong>
              <span>Formularios</span>
            </div>

            <div className="admin-dashboard-flow-line" />

            <div className="admin-dashboard-flow-item">
              <div>
                <Activity size={22} />
              </div>

              <strong>{metrics.recommendations}</strong>
              <span>Recomendaciones</span>
            </div>

            <div className="admin-dashboard-flow-line" />

            <div className="admin-dashboard-flow-item">
              <div>
                <HeartPulse size={22} />
              </div>

              <strong>{metrics.performedTests}</strong>
              <span>Resultados</span>
            </div>
          </div>

          <div className="admin-dashboard-rates">
            <div>
              <span>Tasa de recomendaciones</span>
              <strong>{dashboard.recommendationRate}%</strong>
            </div>

            <div>
              <span>Tasa de resultados</span>
              <strong>{dashboard.performedRate}%</strong>
            </div>
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Acciones recomendadas</h2>
              <p>Checklist operativo para mantener la plataforma precisa.</p>
            </div>

            <ClipboardCheck size={23} />
          </div>

          <div className="admin-dashboard-actions">
            <div className="admin-dashboard-action-card">
              <div>
                <CheckCircle2 size={20} />
              </div>

              <div>
                <strong>Validar stock de pruebas</strong>
                <span>Revisa que solo pruebas activas y disponibles participen en el ranking.</span>
              </div>
            </div>

            <div className="admin-dashboard-action-card">
              <div>
                <Zap size={20} />
              </div>

              <div>
                <strong>Revisar reglas de recomendación</strong>
                <span>Asegura que los puntajes y motivos estén alineados al criterio preventivo.</span>
              </div>
            </div>

            <div className="admin-dashboard-action-card">
              <div>
                <Activity size={20} />
              </div>

              <div>
                <strong>Monitorear resultados</strong>
                <span>Evalúa si las recomendaciones están terminando en pruebas realizadas.</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="admin-dashboard-note">
        <div className="admin-dashboard-note-icon">
          <ShieldCheck size={23} />
        </div>

        <div>
          <h3>Lectura general del sistema</h3>
          <p>
            Este dashboard resume el uso operativo de ViveSaludable. Las recomendaciones se generan
            por reglas ponderadas y deben mantenerse como orientación preventiva, no como diagnóstico médico.
          </p>
        </div>
      </section>
    </div>
  );
}