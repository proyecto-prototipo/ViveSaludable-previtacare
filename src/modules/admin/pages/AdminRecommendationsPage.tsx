import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
  TrendingUp,
  X
} from 'lucide-react';

import { LoadingState } from '../../../shared/components/LoadingState';
import { Badge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import type { Recommendation } from '../../../shared/types/models';
import { listAllRecommendations } from '../services/admin.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/admin.css';

function getPriorityTone(priority?: string) {
  if (priority === 'alta') return 'danger';
  if (priority === 'media') return 'warning';
  return 'info';
}

function getPriorityLabel(priority?: string) {
  if (priority === 'alta') return 'Alta prioridad';
  if (priority === 'media') return 'Prioridad media';
  return 'Prioridad baja';
}

function getPriorityClass(priority?: string) {
  if (priority === 'alta') return 'high';
  if (priority === 'media') return 'medium';
  return 'low';
}

function getReasons(reasons: unknown) {
  if (Array.isArray(reasons)) return reasons.filter(Boolean);
  if (typeof reasons === 'string' && reasons.trim()) return [reasons];
  return [];
}

export function AdminRecommendationsPage() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  const [testFilter, setTestFilter] = useState('todos');

  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await listAllRecommendations();
      setItems(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las recomendaciones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const recommendationsChannel = supabase
      .channel('admin-recommendations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recommendations'
        },
        () => {
          load().catch(console.error);
        }
      )
      .subscribe();

    const testsChannel = supabase
      .channel('admin-recommendations-tests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rapid_tests'
        },
        () => {
          load().catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(recommendationsChannel);
      supabase.removeChannel(testsChannel);
    };
  }, []);

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
    const low = items.filter(item => item.priority_level === 'baja').length;

    const totalAmount = items.reduce((sum, item) => {
      return sum + Number(item.price_snapshot ?? 0);
    }, 0);

    return { total, high, medium, low, totalAmount };
  }, [items]);

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase();

    return items.filter((item: any) => {
      const testName = item.rapid_tests?.name ?? item.test_id ?? '';
      const testDescription = item.rapid_tests?.description ?? '';
      const priority = item.priority_level ?? '';
      const reasons = getReasons(item.reasons).join(' ');

      const matchesSearch =
        !value ||
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
    <div className="admin-recommendations-page">
      <section className="admin-recommendations-hero">
        <div>
          <span className="admin-recommendations-hero-pill">
            <BrainCircuit size={16} />
            Motor preventivo de recomendaciones
          </span>

          <h1>Recomendaciones globales</h1>

          <p>
            Monitorea las recomendaciones generadas por reglas ponderadas en toda la plataforma.
            Esta vista permite revisar prioridades, puntajes, pruebas sugeridas y motivos preventivos.
          </p>
        </div>

        <div className="admin-recommendations-hero-visual">
          <div className="admin-recommendations-orbit-main">
            <Sparkles size={44} />
          </div>

          <div className="admin-recommendations-floating-card rec-floating-one">
            <ClipboardList size={17} />
            <div>
              <span>Formulario</span>
              <strong>Paciente</strong>
            </div>
          </div>

          <div className="admin-recommendations-floating-card rec-floating-two">
            <TestTube2 size={17} />
            <div>
              <span>Prueba</span>
              <strong>Sugerida</strong>
            </div>
          </div>
        </div>

        <button className="admin-recommendations-refresh" type="button" onClick={load}>
          <RefreshCw size={18} />
          Sincronizar
        </button>
      </section>

      {error ? (
        <div className="admin-error-box">
          {error}
        </div>
      ) : null}

      <section className="admin-recommendations-stats">
        <article className="admin-recommendations-stat-card">
          <div className="admin-recommendations-stat-icon">
            <Sparkles size={24} />
          </div>

          <div>
            <span>Total recomendaciones</span>
            <strong>{stats.total}</strong>
            <p>Registros generados por el motor</p>
          </div>
        </article>

        <article className="admin-recommendations-stat-card">
          <div className="admin-recommendations-stat-icon danger">
            <AlertTriangle size={24} />
          </div>

          <div>
            <span>Prioridad alta</span>
            <strong>{stats.high}</strong>
            <p>Casos con mayor puntaje preventivo</p>
          </div>
        </article>

        <article className="admin-recommendations-stat-card">
          <div className="admin-recommendations-stat-icon warning">
            <TrendingUp size={24} />
          </div>

          <div>
            <span>Prioridad media</span>
            <strong>{stats.medium}</strong>
            <p>Recomendaciones de seguimiento</p>
          </div>
        </article>

        <article className="admin-recommendations-stat-card">
          <div className="admin-recommendations-stat-icon green">
            <CircleDollarSign size={24} />
          </div>

          <div>
            <span>Valor referencial</span>
            <strong>{formatCurrency(stats.totalAmount)}</strong>
            <p>Suma de precios recomendados</p>
          </div>
        </article>
      </section>

      <section className="admin-recommendations-board">
        <div className="admin-recommendations-board-top">
          <div>
            <h2>Ranking generado</h2>
            <p>{filteredItems.length} recomendación(es) encontrada(s)</p>
          </div>

          <div className="admin-table-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="admin-recommendations-filters">
          <div className="admin-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por prueba, prioridad o motivo..."
            />
          </div>

          <div className="admin-filter-box">
            <ShieldAlert size={17} />
            <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
              <option value="todos">Todas las prioridades</option>
              <option value="alta">Prioridad alta</option>
              <option value="media">Prioridad media</option>
              <option value="baja">Prioridad baja</option>
            </select>
          </div>

          <div className="admin-filter-box">
            <Filter size={17} />
            <select value={testFilter} onChange={event => setTestFilter(event.target.value)}>
              <option value="todos">Todas las pruebas</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>{test.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-recommendations-list">
          {filteredItems.length ? (
            filteredItems.map((item: any, index) => {
              const priorityClass = getPriorityClass(item.priority_level);
              const reasons = getReasons(item.reasons);

              return (
                <article
                  className={`admin-recommendation-card ${priorityClass}`}
                  key={item.id}
                >
                  <div className="admin-recommendation-rank">
                    <strong>#{index + 1}</strong>
                    <span>ranking</span>
                  </div>

                  <div className="admin-recommendation-main">
                    <div className="admin-recommendation-head">
                      <div>
                        <div className="admin-recommendation-tags">
                          <Badge tone={getPriorityTone(item.priority_level) as any}>
                            {getPriorityLabel(item.priority_level)}
                          </Badge>

                          <Badge tone="muted">
                            Puntaje {item.priority_score}
                          </Badge>
                        </div>

                        <h3>{item.rapid_tests?.name ?? item.test_id}</h3>
                        <p>{item.rapid_tests?.description ?? 'Recomendación generada por el motor preventivo.'}</p>
                      </div>

                      <div className="admin-recommendation-price">
                        <span>Precio</span>
                        <strong>{formatCurrency(item.price_snapshot)}</strong>
                      </div>
                    </div>

                    <div className="admin-recommendation-meta">
                      <span>
                        <TestTube2 size={15} />
                        {item.rapid_tests?.sample_type ?? 'Muestra no definida'}
                      </span>

                      <span>
                        <ShieldCheck size={15} />
                        {item.priority_level ?? 'Sin prioridad'}
                      </span>

                      <span>
                        <Activity size={15} />
                        {item.priority_score ?? 0} puntos
                      </span>

                      <span>
                        <ClipboardList size={15} />
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <div className="admin-recommendation-reasons">
                      {reasons.length ? (
                        reasons.slice(0, 2).map((reason, reasonIndex) => (
                          <span key={`${reason}-${reasonIndex}`}>
                            <CheckCircle2 size={15} />
                            {reason}
                          </span>
                        ))
                      ) : (
                        <span>
                          <CheckCircle2 size={15} />
                          Sin motivos detallados registrados
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="admin-recommendation-actions">
                    <Button variant="secondary" onClick={() => setSelectedRecommendation(item)}>
                      <Eye size={16} />
                      Ver detalle
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="admin-recommendations-empty">
              <BrainCircuit size={48} />
              <h3>No hay recomendaciones para mostrar</h3>
              <p>
                Cuando los pacientes completen formularios y el motor genere recomendaciones,
                aparecerán automáticamente en esta sección.
              </p>
            </div>
          )}
        </div>
      </section>

      {selectedRecommendation ? (
        <div className="admin-recommendation-modal-overlay">
          <section className="admin-recommendation-modal">
            <div className="admin-recommendation-modal-header">
              <div>
                <span>Detalle de recomendación</span>
                <h2>{selectedRecommendation.rapid_tests?.name ?? selectedRecommendation.test_id}</h2>
                <p>Información generada por el motor de reglas ponderadas.</p>
              </div>

              <button
                type="button"
                className="admin-recommendation-modal-close"
                onClick={() => setSelectedRecommendation(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-recommendation-detail-grid">
              <div className="admin-recommendation-detail-card">
                <span>Prioridad</span>
                <strong>{getPriorityLabel(selectedRecommendation.priority_level)}</strong>
              </div>

              <div className="admin-recommendation-detail-card">
                <span>Puntaje</span>
                <strong>{selectedRecommendation.priority_score}</strong>
              </div>

              <div className="admin-recommendation-detail-card">
                <span>Precio referencial</span>
                <strong>{formatCurrency(selectedRecommendation.price_snapshot)}</strong>
              </div>

              <div className="admin-recommendation-detail-card">
                <span>Fecha</span>
                <strong>{formatDate(selectedRecommendation.created_at)}</strong>
              </div>
            </div>

            <div className="admin-recommendation-detail-section">
              <h3>Motivos</h3>

              {getReasons(selectedRecommendation.reasons).length ? (
                <ul>
                  {getReasons(selectedRecommendation.reasons).map((reason, index) => (
                    <li key={`${reason}-${index}`}>
                      <CheckCircle2 size={16} />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Esta recomendación no tiene motivos detallados registrados.</p>
              )}
            </div>

            <div className="admin-recommendation-ai-note">
              <Sparkles size={18} />
              <span>
                Esta vista muestra el resultado guardado. La IA, si se integra luego, debe apoyar la redacción
                de la explicación, no reemplazar las reglas de recomendación.
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}