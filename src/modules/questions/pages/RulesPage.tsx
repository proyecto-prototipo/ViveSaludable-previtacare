import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Filter,
  GitBranch,
  HelpCircle,
  ListChecks,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Trash2,
  X
} from 'lucide-react';

import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { Textarea } from '../../../shared/ui/Textarea';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Badge } from '../../../shared/ui/Badge';
import type { Question, RecommendationRule, RapidTest } from '../../../shared/types/models';
import {
  deleteRule,
  listQuestionsWithOptions,
  listRules,
  saveRule
} from '../services/questions.service';
import { listRapidTests } from '../../tests/services/tests.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/questions.css';

const emptyRule: Partial<RecommendationRule> = {
  question_id: '',
  option_id: null,
  test_id: '',
  score: 2,
  reason_text: '',
  triggers_warning: false,
  warning_type: '',
  warning_message: '',
  is_active: true
};

export function RulesPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [tests, setTests] = useState<RapidTest[]>([]);
  const [rules, setRules] = useState<RecommendationRule[]>([]);
  const [form, setForm] = useState<Partial<RecommendationRule>>(emptyRule);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [deletingRule, setDeletingRule] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [testFilter, setTestFilter] = useState('todos');
  const [warningFilter, setWarningFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const [error, setError] = useState('');

  const options = useMemo(
    () => questions.find(question => question.id === form.question_id)?.question_options ?? [],
    [questions, form.question_id]
  );

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [q, t, r] = await Promise.all([
        listQuestionsWithOptions(),
        listRapidTests(),
        listRules()
      ]);

      setQuestions(q);
      setTests(t);
      setRules(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reglas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const rulesChannel = supabase
      .channel('admin-rules-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recommendation_rules'
        },
        () => {
          load().catch(console.error);
        }
      )
      .subscribe();

    const questionsChannel = supabase
      .channel('admin-rules-questions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions'
        },
        () => {
          load().catch(console.error);
        }
      )
      .subscribe();

    const optionsChannel = supabase
      .channel('admin-rules-options-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'question_options'
        },
        () => {
          load().catch(console.error);
        }
      )
      .subscribe();

    const testsChannel = supabase
      .channel('admin-rules-tests-realtime')
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
      supabase.removeChannel(rulesChannel);
      supabase.removeChannel(questionsChannel);
      supabase.removeChannel(optionsChannel);
      supabase.removeChannel(testsChannel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((rule: any) => rule.is_active).length;
    const warnings = rules.filter((rule: any) => rule.triggers_warning).length;
    const highScore = rules.filter((rule: any) => Number(rule.score ?? 0) >= 3).length;

    return { total, active, warnings, highScore };
  }, [rules]);

  const filteredRules = useMemo(() => {
    const value = search.trim().toLowerCase();

    return rules.filter((rule: any) => {
      const questionText = rule.questions?.question_text ?? '';
      const optionLabel = rule.question_options?.label ?? 'Respuesta libre';
      const testName = rule.rapid_tests?.name ?? '';
      const reason = rule.reason_text ?? '';

      const matchesSearch =
        !value ||
        questionText.toLowerCase().includes(value) ||
        optionLabel.toLowerCase().includes(value) ||
        testName.toLowerCase().includes(value) ||
        reason.toLowerCase().includes(value);

      const matchesTest =
        testFilter === 'todos' || rule.test_id === testFilter;

      const matchesWarning =
        warningFilter === 'todos' ||
        (warningFilter === 'si' && rule.triggers_warning) ||
        (warningFilter === 'no' && !rule.triggers_warning);

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'active' && rule.is_active) ||
        (statusFilter === 'inactive' && !rule.is_active);

      return matchesSearch && matchesTest && matchesWarning && matchesStatus;
    });
  }, [rules, search, testFilter, warningFilter, statusFilter]);

  function openCreateRule() {
    setForm(emptyRule);
    setShowRuleModal(true);
  }

  function openEditRule(rule: any) {
    setForm({
      id: rule.id,
      question_id: rule.question_id,
      option_id: rule.option_id,
      test_id: rule.test_id,
      score: rule.score,
      reason_text: rule.reason_text,
      triggers_warning: rule.triggers_warning,
      warning_type: rule.warning_type,
      warning_message: rule.warning_message,
      is_active: rule.is_active
    });

    setShowRuleModal(true);
  }

  function closeRuleModal() {
    setForm(emptyRule);
    setSaving(false);
    setShowRuleModal(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setSaving(true);
    setError('');

    try {
      await saveRule({
        ...form,
        option_id: form.option_id || null,
        score: Number(form.score ?? 0),
        triggers_warning: Boolean(form.triggers_warning),
        is_active: form.is_active ?? true
      });

      closeRuleModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la regla.');
    } finally {
      setSaving(false);
    }
  }

  function openDelete(rule: any) {
    setDeletingRule(rule);
  }

  function closeDelete() {
    setDeletingRule(null);
    setDeleting(false);
  }

  async function confirmDelete() {
    if (!deletingRule) return;

    setDeleting(true);
    setError('');

    try {
      await deleteRule(deletingRule.id);
      closeDelete();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la regla.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="rules-page">
      <section className="rules-hero">
        <div>
          <span className="rules-hero-pill">
            <ShieldCheck size={16} />
            Motor preventivo inteligente
          </span>

          <h1>Reglas de recomendación</h1>

          <p>
            Conecta respuestas del formulario con pruebas rápidas, puntajes, motivos clínicos
            preventivos y advertencias que ayudan a priorizar recomendaciones.
          </p>
        </div>

        <div className="rules-hero-visual">
          <div className="rules-orbit-main">
            <GitBranch size={44} />
          </div>

          <div className="rules-floating-card rules-floating-one">
            <HelpCircle size={17} />
            <div>
              <span>Respuesta</span>
              <strong>Paciente</strong>
            </div>
          </div>

          <div className="rules-floating-card rules-floating-two">
            <TestTube2 size={17} />
            <div>
              <span>Prueba</span>
              <strong>Sugerida</strong>
            </div>
          </div>
        </div>

        <div className="rules-hero-actions">
          <button className="rules-refresh-button" type="button" onClick={load}>
            <RefreshCw size={18} />
            Sincronizar
          </button>

          <button className="rules-new-button" type="button" onClick={openCreateRule}>
            <Plus size={18} />
            Nueva regla
          </button>
        </div>
      </section>

      {error ? (
        <div className="rules-error-box">
          {error}
        </div>
      ) : null}

      <section className="rules-stats">
        <article className="rules-stat-card">
          <div className="rules-stat-icon">
            <ListChecks size={24} />
          </div>
          <div>
            <span>Total reglas</span>
            <strong>{stats.total}</strong>
            <p>Reglas configuradas en el motor</p>
          </div>
        </article>

        <article className="rules-stat-card">
          <div className="rules-stat-icon green">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span>Activas</span>
            <strong>{stats.active}</strong>
            <p>Disponibles para recomendar</p>
          </div>
        </article>

        <article className="rules-stat-card">
          <div className="rules-stat-icon warning">
            <ShieldAlert size={24} />
          </div>
          <div>
            <span>Con advertencia</span>
            <strong>{stats.warnings}</strong>
            <p>Generan alertas preventivas</p>
          </div>
        </article>

        <article className="rules-stat-card">
          <div className="rules-stat-icon soft">
            <Sparkles size={24} />
          </div>
          <div>
            <span>Alta prioridad</span>
            <strong>{stats.highScore}</strong>
            <p>Reglas con puntaje elevado</p>
          </div>
        </article>
      </section>

      <section className="rules-board">
        <div className="rules-board-top">
          <div>
            <h2>Banco de reglas</h2>
            <p>{filteredRules.length} regla(s) encontrada(s)</p>
          </div>

          <div className="rules-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="rules-filters">
          <div className="rules-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por pregunta, opción, prueba o motivo..."
            />
          </div>

          <div className="rules-filter-box">
            <Filter size={17} />
            <select value={testFilter} onChange={event => setTestFilter(event.target.value)}>
              <option value="todos">Todas las pruebas</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>{test.name}</option>
              ))}
            </select>
          </div>

          <div className="rules-filter-box">
            <ShieldAlert size={17} />
            <select value={warningFilter} onChange={event => setWarningFilter(event.target.value)}>
              <option value="todos">Advertencias</option>
              <option value="si">Con advertencia</option>
              <option value="no">Sin advertencia</option>
            </select>
          </div>

          <div className="rules-filter-box">
            <ShieldCheck size={17} />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>
        </div>

        <div className="rules-list">
          {filteredRules.length ? (
            filteredRules.map((rule: any) => (
              <article className="rule-card-pro" key={rule.id}>
                <div className="rule-card-icon">
                  <GitBranch size={23} />
                </div>

                <div className="rule-card-main">
                  <div className="rule-card-head">
                    <div>
                      <div className="rule-card-tags">
                        <Badge tone={rule.is_active ? 'success' : 'muted'}>
                          {rule.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>

                        <Badge tone="info">
                          Puntaje {rule.score}
                        </Badge>

                        {rule.triggers_warning ? (
                          <Badge tone="warning">Genera advertencia</Badge>
                        ) : (
                          <Badge tone="muted">Sin advertencia</Badge>
                        )}
                      </div>

                      <h3>{rule.questions?.question_text || 'Pregunta no encontrada'}</h3>
                    </div>
                  </div>

                  <div className="rule-flow">
                    <span>
                      {rule.question_options?.label ?? 'Respuesta libre / Sí'}
                    </span>

                    <strong>→</strong>

                    <span>
                      {rule.rapid_tests?.name ?? 'Prueba no encontrada'}
                    </span>
                  </div>

                  <p className="rule-reason">
                    {rule.reason_text || 'Sin motivo para el paciente registrado.'}
                  </p>

                  {rule.triggers_warning ? (
                    <div className="rule-warning-box">
                      <ShieldAlert size={16} />
                      <span>
                        {rule.warning_message || rule.warning_type || 'Advertencia preventiva configurada.'}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="rule-card-actions">
                  <Button variant="secondary" onClick={() => openEditRule(rule)}>
                    <Edit3 size={16} />
                    Editar
                  </Button>

                  <Button variant="danger" onClick={() => openDelete(rule)}>
                    <Trash2 size={16} />
                    Eliminar
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="rules-empty-state">
              <GitBranch size={48} />
              <h3>No hay reglas para mostrar</h3>
              <p>
                Crea una nueva regla o cambia los filtros para visualizar el motor de recomendación.
              </p>
            </div>
          )}
        </div>
      </section>

      {showRuleModal ? (
        <div className="rules-modal-overlay">
          <section className="rules-modal">
            <div className="rules-modal-header">
              <div>
                <span>{form.id ? 'Editar regla' : 'Nueva regla'}</span>
                <h2>{form.id ? 'Actualizar regla' : 'Crear regla de recomendación'}</h2>
                <p>
                  Define qué respuesta activa una prueba, qué puntaje suma y si debe mostrar una advertencia preventiva.
                </p>
              </div>

              <button
                type="button"
                className="rules-modal-close"
                onClick={closeRuleModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="rules-modal-form" onSubmit={submit}>
              <div className="rules-field span-2">
                <label>Pregunta</label>
                <Select
                  value={form.question_id ?? ''}
                  onChange={event => setForm({ ...form, question_id: event.target.value, option_id: null })}
                  required
                >
                  <option value="">Seleccionar pregunta</option>
                  {questions.map(question => (
                    <option key={question.id} value={question.id}>
                      {question.question_text}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="rules-field">
                <label>Opción o respuesta</label>
                <Select
                  value={form.option_id ?? ''}
                  onChange={event => setForm({ ...form, option_id: event.target.value || null })}
                >
                  <option value="">Aplica a respuesta libre / Sí</option>
                  {options.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="rules-field">
                <label>Prueba recomendada</label>
                <Select
                  value={form.test_id ?? ''}
                  onChange={event => setForm({ ...form, test_id: event.target.value })}
                  required
                >
                  <option value="">Seleccionar prueba</option>
                  {tests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="rules-field">
                <label>Puntaje</label>
                <Input
                  type="number"
                  value={form.score ?? 0}
                  onChange={event => setForm({ ...form, score: Number(event.target.value) })}
                />
              </div>

              <div className="rules-field">
                <label>Estado</label>
                <Select
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={event => setForm({ ...form, is_active: event.target.value === 'active' })}
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </Select>
              </div>

              <div className="rules-field span-2">
                <label>Motivo para el paciente</label>
                <Textarea
                  value={form.reason_text ?? ''}
                  onChange={event => setForm({ ...form, reason_text: event.target.value })}
                  placeholder="Ej. Se recomienda esta prueba por la presencia de síntomas o factores de riesgo reportados."
                />
              </div>

              <div className="rules-field">
                <label>¿Genera advertencia?</label>
                <Select
                  value={form.triggers_warning ? 'si' : 'no'}
                  onChange={event => setForm({ ...form, triggers_warning: event.target.value === 'si' })}
                >
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </Select>
              </div>

              <div className="rules-field">
                <label>Tipo de advertencia</label>
                <Input
                  value={form.warning_type ?? ''}
                  onChange={event => setForm({ ...form, warning_type: event.target.value })}
                  placeholder="Ej. Riesgo digestivo, alerta preventiva"
                />
              </div>

              <div className="rules-field span-2">
                <label>Mensaje de advertencia</label>
                <Textarea
                  value={form.warning_message ?? ''}
                  onChange={event => setForm({ ...form, warning_message: event.target.value })}
                  placeholder="Mensaje que verá el paciente si esta regla genera una advertencia."
                />
              </div>

              <div className="rules-modal-note span-2">
                <Sparkles size={18} />
                <span>
                  Esta regla alimentará el ranking preventivo y puede influir en las pruebas recomendadas al paciente.
                </span>
              </div>

              <div className="rules-modal-actions span-2">
                <Button type="button" variant="secondary" onClick={closeRuleModal}>
                  Cancelar
                </Button>

                <Button disabled={saving}>
                  {saving ? 'Guardando...' : (
                    <>
                      <Save size={17} />
                      Guardar regla
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deletingRule ? (
        <div className="rules-delete-overlay">
          <section className="rules-delete-modal">
            <div className="rules-delete-icon">
              <AlertTriangle size={34} />
            </div>

            <h2>¿Eliminar regla?</h2>

            <p>
              Estás por eliminar una regla asociada a la pregunta
              <strong> {deletingRule.questions?.question_text || 'seleccionada'}</strong>.
              Esta acción puede afectar el motor de recomendaciones.
            </p>

            <div className="rules-delete-warning">
              Si la regla ya fue usada en formularios o reportes, lo más seguro es marcarla como inactiva en lugar de eliminarla.
            </div>

            <div className="rules-delete-actions">
              <Button type="button" variant="secondary" onClick={closeDelete}>
                Cancelar
              </Button>

              <Button type="button" variant="danger" disabled={deleting} onClick={confirmDelete}>
                {deleting ? 'Eliminando...' : (
                  <>
                    <Trash2 size={17} />
                    Sí, eliminar
                  </>
                )}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}