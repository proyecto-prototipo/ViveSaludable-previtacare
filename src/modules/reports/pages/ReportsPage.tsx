import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  FileBarChart,
  FileSpreadsheet,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TestTube2,
  TrendingUp,
  Users
} from 'lucide-react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { Button } from '../../../shared/ui/Button';
import { LoadingState } from '../../../shared/components/LoadingState';
import { downloadCsv, formatDate } from '../../../shared/lib/utils';
import { getReportData, logReportExport } from '../services/reports.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/reports.css';

type ExportType = 'patients' | 'recommendations' | 'performed';

export function ReportsPage({ scope }: { scope: 'admin' | 'client' }) {
  const { profile } = useAuth();

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [error, setError] = useState('');

  const clientId = scope === 'client' ? profile?.client_id : null;

  async function load(options?: { silent?: boolean }) {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const reportData = await getReportData(clientId);
      setData(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const patientsChannel = supabase
      .channel(`reports-${scope}-patients-realtime`)
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

    const recommendationsChannel = supabase
      .channel(`reports-${scope}-recommendations-realtime`)
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

    const performedChannel = supabase
      .channel(`reports-${scope}-performed-tests-realtime`)
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
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(recommendationsChannel);
      supabase.removeChannel(performedChannel);
    };
  }, [clientId, scope]);

  const stats = useMemo(() => {
    const patients = data?.patients ?? [];
    const recommendations = data?.recommendations ?? [];
    const performed = data?.performed ?? [];

    const highPriority = recommendations.filter((item: any) => item.priority_level === 'alta').length;

    const latestActivity = [...patients, ...recommendations, ...performed]
      .map((item: any) => item.created_at || item.performed_at)
      .filter(Boolean)
      .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      patients: patients.length,
      recommendations: recommendations.length,
      performed: performed.length,
      highPriority,
      latestActivity
    };
  }, [data]);

  const latestPatients = useMemo(() => {
    return [...(data?.patients ?? [])]
      .sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 5);
  }, [data]);

  const latestRecommendations = useMemo(() => {
    return [...(data?.recommendations ?? [])]
      .sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 5);
  }, [data]);

  const latestPerformed = useMemo(() => {
    return [...(data?.performed ?? [])]
      .sort((a: any, b: any) => new Date(b.performed_at ?? b.created_at ?? 0).getTime() - new Date(a.performed_at ?? a.created_at ?? 0).getTime())
      .slice(0, 5);
  }, [data]);

  async function exportRows(type: ExportType) {
    if (!data) return;

    setExporting(type);
    setError('');

    try {
      downloadCsv(`vive-saludable-${type}.csv`, data[type] ?? []);

      if (profile) {
        await logReportExport(profile.id, type, clientId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar el reporte.');
    } finally {
      setExporting(null);
    }
  }

  if (loading || !data) return <LoadingState />;

  return (
    <div className="reports-page">
      <section className="reports-hero">
        <div>
          <span className="reports-hero-pill">
            <ShieldCheck size={16} />
            {scope === 'client' ? 'Reportes institucionales' : 'Vista general PREVITACARE'}
          </span>

          <h1>Reportes y exportaciones</h1>

          <p>
            Consulta indicadores clave y exporta información real de pacientes, recomendaciones y resultados
            para análisis, validación operativa y seguimiento preventivo.
          </p>
        </div>

        <div className="reports-hero-visual">
          <div className="reports-orbit-main">
            <FileBarChart size={44} />
          </div>

          <div className="reports-floating-card reports-floating-one">
            <Database size={17} />
            <div>
              <span>Datos</span>
              <strong>Reales</strong>
            </div>
          </div>

          <div className="reports-floating-card reports-floating-two">
            <FileSpreadsheet size={17} />
            <div>
              <span>Exportación</span>
              <strong>CSV</strong>
            </div>
          </div>
        </div>

        <button className="reports-refresh-button" type="button" onClick={() => load({ silent: true })}>
          <RefreshCw size={18} className={refreshing ? 'reports-spin' : ''} />
          {refreshing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </section>

      {error ? (
        <div className="reports-error-box">
          {error}
        </div>
      ) : null}

      <section className="reports-stats">
        <article className="reports-stat-card">
          <div className="reports-stat-icon">
            <Users size={24} />
          </div>

          <div>
            <span>Pacientes</span>
            <strong>{stats.patients}</strong>
            <p>{scope === 'client' ? 'Pacientes de tu institución' : 'Pacientes registrados globalmente'}</p>
          </div>
        </article>

        <article className="reports-stat-card">
          <div className="reports-stat-icon blue">
            <FileBarChart size={24} />
          </div>

          <div>
            <span>Recomendaciones</span>
            <strong>{stats.recommendations}</strong>
            <p>Registros generados por reglas ponderadas</p>
          </div>
        </article>

        <article className="reports-stat-card">
          <div className="reports-stat-icon green">
            <HeartPulse size={24} />
          </div>

          <div>
            <span>Pruebas realizadas</span>
            <strong>{stats.performed}</strong>
            <p>Resultados registrados en la plataforma</p>
          </div>
        </article>

        <article className="reports-stat-card">
          <div className="reports-stat-icon warning">
            <TrendingUp size={24} />
          </div>

          <div>
            <span>Prioridad alta</span>
            <strong>{stats.highPriority}</strong>
            <p>Recomendaciones con mayor puntaje</p>
          </div>
        </article>
      </section>

      <section className="reports-export-board">
        <div className="reports-board-top">
          <div>
            <h2>Exportaciones disponibles</h2>
            <p>Descarga archivos CSV para análisis, respaldo o validación del proyecto.</p>
          </div>

          <div className="reports-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="reports-export-grid">
          <article className="reports-export-card">
            <div className="reports-export-icon">
              <Users size={26} />
            </div>

            <div>
              <h3>Pacientes CSV</h3>
              <p>Incluye pacientes registrados, datos básicos y fecha de creación.</p>
              <span>{data.patients.length} registro(s) listos</span>
            </div>

            <Button disabled={exporting === 'patients'} onClick={() => exportRows('patients')}>
              <Download size={17} />
              {exporting === 'patients' ? 'Exportando...' : 'Descargar'}
            </Button>
          </article>

          <article className="reports-export-card">
            <div className="reports-export-icon blue">
              <FileBarChart size={26} />
            </div>

            <div>
              <h3>Recomendaciones CSV</h3>
              <p>Incluye ranking, prioridad, puntajes, pruebas sugeridas y motivos.</p>
              <span>{data.recommendations.length} registro(s) listos</span>
            </div>

            <Button variant="secondary" disabled={exporting === 'recommendations'} onClick={() => exportRows('recommendations')}>
              <Download size={17} />
              {exporting === 'recommendations' ? 'Exportando...' : 'Descargar'}
            </Button>
          </article>

          <article className="reports-export-card">
            <div className="reports-export-icon green">
              <HeartPulse size={26} />
            </div>

            <div>
              <h3>Resultados CSV</h3>
              <p>Incluye pruebas realizadas, resultados, observaciones y fechas.</p>
              <span>{data.performed.length} registro(s) listos</span>
            </div>

            <Button variant="light" disabled={exporting === 'performed'} onClick={() => exportRows('performed')}>
              <Download size={17} />
              {exporting === 'performed' ? 'Exportando...' : 'Descargar'}
            </Button>
          </article>
        </div>
      </section>

      <section className="reports-preview-grid">
        <article className="reports-preview-card">
          <div className="reports-preview-header">
            <div>
              <h3>Últimos pacientes</h3>
              <p>Registros recientes del formulario preventivo.</p>
            </div>
            <Users size={22} />
          </div>

          <div className="reports-preview-list">
            {latestPatients.length ? (
              latestPatients.map((patient: any) => (
                <div className="reports-preview-row" key={patient.id}>
                  <div>
                    <strong>{patient.full_name || patient.code || 'Paciente sin nombre'}</strong>
                    <span>{patient.district || 'Sin distrito'}</span>
                  </div>

                  <small>{patient.created_at ? formatDate(patient.created_at) : 'Sin fecha'}</small>
                </div>
              ))
            ) : (
              <div className="reports-empty-mini">
                No hay pacientes para mostrar.
              </div>
            )}
          </div>
        </article>

        <article className="reports-preview-card">
          <div className="reports-preview-header">
            <div>
              <h3>Últimas recomendaciones</h3>
              <p>Ranking generado por el motor preventivo.</p>
            </div>
            <Sparkles size={22} />
          </div>

          <div className="reports-preview-list">
            {latestRecommendations.length ? (
              latestRecommendations.map((recommendation: any) => (
                <div className="reports-preview-row" key={recommendation.id}>
                  <div>
                    <strong>{recommendation.rapid_tests?.name || recommendation.test_id || 'Prueba sugerida'}</strong>
                    <span>{recommendation.priority_level || 'Sin prioridad'} · Puntaje {recommendation.priority_score ?? 0}</span>
                  </div>

                  <small>{recommendation.created_at ? formatDate(recommendation.created_at) : 'Sin fecha'}</small>
                </div>
              ))
            ) : (
              <div className="reports-empty-mini">
                No hay recomendaciones para mostrar.
              </div>
            )}
          </div>
        </article>

        <article className="reports-preview-card">
          <div className="reports-preview-header">
            <div>
              <h3>Últimos resultados</h3>
              <p>Pruebas realizadas recientemente.</p>
            </div>
            <TestTube2 size={22} />
          </div>

          <div className="reports-preview-list">
            {latestPerformed.length ? (
              latestPerformed.map((result: any) => (
                <div className="reports-preview-row" key={result.id}>
                  <div>
                    <strong>{result.rapid_tests?.name || result.test_id || 'Prueba realizada'}</strong>
                    <span>{result.patients?.full_name || result.patients?.code || 'Paciente'} · {result.result_status || 'Sin estado'}</span>
                  </div>

                  <small>{result.performed_at ? formatDate(result.performed_at) : 'Sin fecha'}</small>
                </div>
              ))
            ) : (
              <div className="reports-empty-mini">
                No hay resultados para mostrar.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="reports-note">
        <div className="reports-note-icon">
          <CheckCircle2 size={22} />
        </div>

        <div>
          <h3>Información exportable y trazable</h3>
          <p>
            Cada exportación queda registrada para mantener control operativo.
            {stats.latestActivity ? ` Última actividad detectada: ${formatDate(stats.latestActivity)}.` : ' Aún no hay actividad registrada.'}
          </p>
        </div>
      </section>
    </div>
  );
}