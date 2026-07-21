import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CircleDollarSign,
  Eye,
  Filter,
  HeartPulse,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
  TrendingUp,
  UserRound,
  X
} from 'lucide-react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import type { Recommendation } from '../../../shared/types/models';
import { listMyRecommendations } from '../services/institutional.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/institutional.css';

function getPriorityTone(priority?: string) {
  if (priority === 'alta') return 'danger';
  if (priority === 'media') return 'warning';
  return 'info';
}

function getPriorityLabel(priority?: string) {
  if (priority === 'alta') return 'Prioridad alta';
  if (priority === 'media') return 'Prioridad media';
  if (priority === 'baja') return 'Prioridad baja';
  return priority || 'Sin prioridad';
}

function getPriorityClass(priority?: string) {
  if (priority === 'alta') return 'high';
  if (priority === 'media') return 'medium';
  return 'low';
}

function getReasons(reasons: unknown): string[] {
  if (Array.isArray(reasons)) return reasons.filter(Boolean).map(String);
  if (typeof reasons === 'string' && reasons.trim()) return [reasons];
  return [];
}

export function InstitutionalRecommendationsPage() {
  const { profile } = useAuth();

  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  const [testFilter, setTestFilter] = useState('todos');

  const [selectedRecommendation, setSelectedRecommendation] = useState<any | null>(null);

  async function load(options?: { silent?: boolean }) {
    if (!profile?.client_id) {
      setItems([]);
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
      const data = await listMyRecommendations(profile.client_id);
      setItems(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las recomendaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    if (!profile?.client_id) return;

    const recommendationsChannel = supabase
      .channel(`client-recommendations-${profile.client_id}-realtime`)
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

    const patientsChannel = supabase
      .channel(`client-recommendations-patients-${profile.client_id}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `client_id=eq.${profile.client_id}`
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    const testsChannel = supabase
      .channel(`client-recommendations-tests-${profile.client_id}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rapid_tests'
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(recommendationsChannel);
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(testsChannel);
    };
  }, [profile?.client_id]);

  const tests = useMemo(() => {
    const map = new Map<string, string>();

    items.forEach((item: any) => {
      const id = item.test_id;
      const name = item.rapid_tests?.name ?? item.test_id;

      if (id && name) map.set(id, name);
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const high = items.filter(item => item.priority_level === 'alta').length;
    const medium = items.filter(item => item.priority_level === 'media').length;

    const uniquePatients = new Set(
      items
        .map((item: any) => item.patient_id)
        .filter(Boolean)
    ).size;

    const totalAmount = items.reduce((sum, item) => {
      return sum + Number(item.price_snapshot ?? 0);
    }, 0);

    return { total, high, medium, uniquePatients, totalAmount };
  }, [items]);

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase();

    return items.filter((item: any) => {
      const patientName = item.patients?.full_name || item.patients?.code || '';
      const testName = item.rapid_tests?.name || '';
      const testDescription = item.rapid_tests?.description || '';
      const priority = item.priority_level || '';
      const reasons = getReasons(item.reasons).join(' ');

      const matchesSearch =
        !value ||
        patientName.toLowerCase().includes(value) ||
        testName.toLowerCase().includes(value) ||
        testDescription.toLowerCase().includes(value) ||
        priority.toLowerCase().includes(value) ||
        reasons.toLowerCase().includes(value);

      const matchesPriority =
        priorityFilter === 'todos' || item.priority_level === priorityFilter;

      const matchesTest =
        testFilter === 'todos' || item.test_id === testFilter;

      return matchesSearch && matchesPriority && matchesTest;
    });
  }, [items, search, priorityFilter, testFilter]);

  if (loading) return <LoadingState />;

  return (
    <div className="client-recommendations-page">
      <section className="client-recommendations-hero">
        <div>
          <span className="client-recommendations-hero-pill">
            <ShieldCheck size={16} />
            Recomendaciones de tu institución
          </span>

          <h1>Mis recomendaciones</h1>

          <p>
            Revisa las pruebas sugeridas para tus pacientes según sus respuestas preventivas,
            reglas configuradas y puntajes generados por el sistema.
          </p>
        </div>

        <div className="client-recommendations-hero-visual">
          <div className="client-recommendations-orbit-main">
            <Sparkles size={44} />
          </div>

          <div className="client-recommendations-floating-card client-rec-floating-one">
            <UserRound size={17} />
            <div>
              <span>Pacientes</span>
              <strong>{stats.uniquePatients}</strong>
            </div>
          </div>

          <div className="client-recommendations-floating-card client-rec-floating-two">
            <TestTube2 size={17} />
            <div>
              <span>Ranking</span>
              <strong>Preventivo</strong>
            </div>
          </div>
        </div>

        <button className="client-recommendations-refresh" type="button" onClick={() => load({ silent: true })}>
          <RefreshCw size={18} className={refreshing ? 'client-recommendations-spin' : ''} />
          {refreshing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </section>

      {error ? (
        <div className="client-recommendations-error">
          {error}
        </div>
      ) : null}

      <section className="client-recommendations-stats">
        <article className="client-recommendations-stat-card">
          <div className="client-recommendations-stat-icon">
            <Sparkles size={24} />
          </div>

          <div>
            <span>Total recomendaciones</span>
            <strong>{stats.total}</strong>
            <p>Recomendaciones generadas para tus pacientes</p>
          </div>
        </article>

        <article className="client-recommendations-stat-card">
          <div className="client-recommendations-stat-icon danger">
            <AlertTriangle size={24} />
          </div>

          <div>
            <span>Prioridad alta</span>
            <strong>{stats.high}</strong>
            <p>Casos con mayor puntaje preventivo</p>
          </div>
        </article>

        <article className="client-recommendations-stat-card">
          <div className="client-recommendations-stat-icon warning">
            <TrendingUp size={24} />
          </div>

          <div>
            <span>Prioridad media</span>
            <strong>{stats.medium}</strong>
            <p>Recomendaciones de seguimiento</p>
          </div>
        </article>

        <article className="client-recommendations-stat-card">
          <div className="client-recommendations-stat-icon green">
            <CircleDollarSign size={24} />
          </div>

          <div>
            <span>Valor referencial</span>
            <strong>{formatCurrency(stats.totalAmount)}</strong>
            <p>Suma de precios sugeridos</p>
          </div>
        </article>
      </section>

      <section className="client-recommendations-board">
        <div className="client-recommendations-board-top">
          <div>
            <h2>Ranking de recomendaciones</h2>
            <p>{filteredItems.length} recomendación(es) encontrada(s)</p>
          </div>

          <div className="client-recommendations-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="client-recommendations-filters">
          <div className="client-recommendations-search">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por paciente, prueba, prioridad o motivo..."
            />
          </div>

          <div className="client-recommendations-filter">
            <ShieldAlert size={17} />
            <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
              <option value="todos">Todas las prioridades</option>
              <option value="alta">Prioridad alta</option>
              <option value="media">Prioridad media</option>
              <option value="baja">Prioridad baja</option>
            </select>
          </div>

          <div className="client-recommendations-filter">
            <Filter size={17} />
            <select value={testFilter} onChange={event => setTestFilter(event.target.value)}>
              <option value="todos">Todas las pruebas</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>{test.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="client-recommendations-list">
          {filteredItems.length ? (
            filteredItems.map((item: any, index) => {
              const reasons = getReasons(item.reasons);
              const priorityClass = getPriorityClass(item.priority_level);

              return (
                <article className={`client-recommendation-card ${priorityClass}`} key={item.id}>
                  <div className="client-recommendation-rank">
                    <strong>#{index + 1}</strong>
                    <span>ranking</span>
                  </div>

                  <div className="client-recommendation-main">
                    <div className="client-recommendation-head">
                      <div>
                        <div className="client-recommendation-tags">
                          <Badge tone={getPriorityTone(item.priority_level) as any}>
                            {getPriorityLabel(item.priority_level)}
                          </Badge>

                          <Badge tone="muted">
                            Puntaje {item.priority_score ?? 0}
                          </Badge>
                        </div>

                        <h3>{item.rapid_tests?.name || 'Prueba recomendada'}</h3>

                        <p>
                          {item.patients?.full_name || item.patients?.code || 'Paciente sin nombre'}
                        </p>
                      </div>

                      <div className="client-recommendation-price">
                        <span>Precio</span>
                        <strong>{formatCurrency(item.price_snapshot)}</strong>
                      </div>
                    </div>

                    <div className="client-recommendation-meta">
                      <span>
                        <TestTube2 size={15} />
                        {item.rapid_tests?.sample_type || 'Muestra no definida'}
                      </span>

                      <span>
                        <HeartPulse size={15} />
                        {item.rapid_tests?.result_time || 'Tiempo no definido'}
                      </span>

                      <span>
                        <Activity size={15} />
                        {item.priority_score ?? 0} puntos
                      </span>

                      <span>
                        <UserRound size={15} />
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <div className="client-recommendation-reasons">
                      {reasons.length ? (
                        reasons.slice(0, 2).map((reason, reasonIndex) => (
                          <span key={`${reason}-${reasonIndex}`}>
                            <ShieldCheck size={15} />
                            {reason}
                          </span>
                        ))
                      ) : (
                        <span>
                          <ShieldCheck size={15} />
                          Sin motivos detallados registrados
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="client-recommendation-actions">
                    <Button variant="secondary" onClick={() => setSelectedRecommendation(item)}>
                      <Eye size={16} />
                      Ver detalle
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="client-recommendations-empty">
              <Sparkles size={48} />
              <h3>No hay recomendaciones para mostrar</h3>
              <p>
                Cuando tus pacientes completen formularios preventivos, las recomendaciones aparecerán automáticamente aquí.
              </p>
            </div>
          )}
        </div>
      </section>

      {selectedRecommendation ? (
        <div className="client-recommendations-modal-overlay">
          <section className="client-recommendations-modal">
            <div className="client-recommendations-modal-header">
              <div>
                <span>Detalle de recomendación</span>
                <h2>{selectedRecommendation.rapid_tests?.name || 'Prueba recomendada'}</h2>
                <p>
                  {selectedRecommendation.patients?.full_name ||
                    selectedRecommendation.patients?.code ||
                    'Paciente sin nombre'}
                </p>
              </div>

              <button
                type="button"
                className="client-recommendations-modal-close"
                onClick={() => setSelectedRecommendation(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="client-recommendations-detail-grid">
              <div className="client-recommendations-detail-card">
                <span>Prioridad</span>
                <strong>{getPriorityLabel(selectedRecommendation.priority_level)}</strong>
              </div>

              <div className="client-recommendations-detail-card">
                <span>Puntaje</span>
                <strong>{selectedRecommendation.priority_score ?? 0}</strong>
              </div>

              <div className="client-recommendations-detail-card">
                <span>Precio referencial</span>
                <strong>{formatCurrency(selectedRecommendation.price_snapshot)}</strong>
              </div>

              <div className="client-recommendations-detail-card">
                <span>Fecha</span>
                <strong>{formatDate(selectedRecommendation.created_at)}</strong>
              </div>
            </div>

            <div className="client-recommendations-detail-section">
              <h3>Motivos de recomendación</h3>

              {getReasons(selectedRecommendation.reasons).length ? (
                <ul>
                  {getReasons(selectedRecommendation.reasons).map((reason, index) => (
                    <li key={`${reason}-${index}`}>
                      <ShieldCheck size={16} />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay motivos detallados registrados para esta recomendación.</p>
              )}
            </div>

            <div className="client-recommendations-note">
              <Sparkles size={18} />
              <span>
                Esta recomendación es una orientación preventiva basada en respuestas y reglas configuradas. No reemplaza una evaluación médica.
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}