import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Filter,
  HelpCircle,
  ListChecks,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';

import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { Badge } from '../../../shared/ui/Badge';
import { LoadingState } from '../../../shared/components/LoadingState';
import type { Question } from '../../../shared/types/models';
import { listQuestionsWithOptions, saveOption, saveQuestion } from '../services/questions.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/questions.css';

const empty: Partial<Question> = {
  section: 'sintomas',
  question_text: '',
  question_type: 'multiple',
  is_required: false,
  is_active: true,
  order_index: 1
};

const sectionOptions = [
  { value: 'datos', label: 'Datos' },
  { value: 'sintomas', label: 'Síntomas' },
  { value: 'habitos', label: 'Hábitos' },
  { value: 'antecedentes', label: 'Antecedentes' },
  { value: 'factores_riesgo', label: 'Factores de riesgo' }
];

const questionTypes = [
  { value: 'single', label: 'Selección única' },
  { value: 'multiple', label: 'Selección múltiple' },
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sí / No' }
];

function getSectionLabel(section?: string) {
  return sectionOptions.find(item => item.value === section)?.label ?? section ?? 'Sin sección';
}

function getQuestionTypeLabel(type?: string) {
  return questionTypes.find(item => item.value === type)?.label ?? type ?? 'Sin tipo';
}

export function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState<Partial<Question>>(empty);

  const [optionQuestion, setOptionQuestion] = useState('');
  const [optionLabel, setOptionLabel] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [savingOption, setSavingOption] = useState(false);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('todos');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await listQuestionsWithOptions();
      setQuestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las preguntas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const questionsChannel = supabase
      .channel('admin-questions-realtime')
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
      .channel('admin-question-options-realtime')
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

    return () => {
      supabase.removeChannel(questionsChannel);
      supabase.removeChannel(optionsChannel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = questions.length;
    const active = questions.filter(question => question.is_active).length;
    const required = questions.filter(question => question.is_required).length;
    const withOptions = questions.filter(question => (question.question_options?.length ?? 0) > 0).length;

    return { total, active, required, withOptions };
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const value = search.trim().toLowerCase();

    return questions.filter(question => {
      const optionsText = question.question_options
        ?.map(option => option.label)
        .join(' ')
        .toLowerCase() ?? '';

      const matchesSearch =
        !value ||
        question.question_text?.toLowerCase().includes(value) ||
        question.section?.toLowerCase().includes(value) ||
        question.question_type?.toLowerCase().includes(value) ||
        optionsText.includes(value);

      const matchesSection =
        sectionFilter === 'todos' || question.section === sectionFilter;

      const matchesType =
        typeFilter === 'todos' || question.question_type === typeFilter;

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'active' && question.is_active) ||
        (statusFilter === 'inactive' && !question.is_active);

      return matchesSearch && matchesSection && matchesType && matchesStatus;
    });
  }, [questions, search, sectionFilter, typeFilter, statusFilter]);

  function openCreateQuestion() {
    setForm(empty);
    setShowQuestionModal(true);
  }

  function openEditQuestion(question: Question) {
    setForm(question);
    setShowQuestionModal(true);
  }

  function closeQuestionModal() {
    setForm(empty);
    setSavingQuestion(false);
    setShowQuestionModal(false);
  }

  function openOptionModal(questionId?: string) {
    setOptionQuestion(questionId ?? '');
    setOptionLabel('');
    setShowOptionModal(true);
  }

  function closeOptionModal() {
    setOptionQuestion('');
    setOptionLabel('');
    setSavingOption(false);
    setShowOptionModal(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setSavingQuestion(true);
    setError('');

    try {
      await saveQuestion({
        ...form,
        order_index: Number(form.order_index ?? 1),
        is_active: form.is_active ?? true,
        is_required: form.is_required ?? false
      });

      closeQuestionModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la pregunta.');
    } finally {
      setSavingQuestion(false);
    }
  }

  async function addOption(event: React.FormEvent) {
    event.preventDefault();

    if (!optionQuestion || !optionLabel.trim()) return;

    setSavingOption(true);
    setError('');

    try {
      await saveOption({
        question_id: optionQuestion,
        label: optionLabel.trim(),
        value: optionLabel.trim().toLowerCase().replaceAll(' ', '_'),
        is_active: true,
        order_index: 1
      });

      closeOptionModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la opción.');
    } finally {
      setSavingOption(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="questions-page">
      <section className="questions-hero">
        <div>
          <span className="questions-hero-pill">
            <ShieldCheck size={16} />
            Configuración del formulario preventivo
          </span>

          <h1>Configurador de preguntas</h1>

          <p>
            Crea, organiza y conecta preguntas por sección. Estas preguntas alimentan
            el formulario del paciente y luego se vinculan con reglas de recomendación.
          </p>
        </div>

        <div className="questions-hero-visual">
          <div className="questions-orbit-main">
            <HelpCircle size={44} />
          </div>

          <div className="questions-floating-card questions-floating-one">
            <ClipboardList size={17} />
            <div>
              <span>Formulario</span>
              <strong>Preventivo</strong>
            </div>
          </div>

          <div className="questions-floating-card questions-floating-two">
            <Sparkles size={17} />
            <div>
              <span>Motor</span>
              <strong>Reglas</strong>
            </div>
          </div>
        </div>

        <div className="questions-hero-actions">
          <button className="questions-refresh-button" type="button" onClick={load}>
            <RefreshCw size={18} />
            Sincronizar
          </button>

          <button className="questions-new-button" type="button" onClick={openCreateQuestion}>
            <Plus size={18} />
            Nueva pregunta
          </button>

          <button className="questions-option-button" type="button" onClick={() => openOptionModal()}>
            <MessageSquarePlus size={18} />
            Agregar opción
          </button>
        </div>
      </section>

      {error ? (
        <div className="questions-error-box">
          {error}
        </div>
      ) : null}

      <section className="questions-stats">
        <article className="questions-stat-card">
          <div className="questions-stat-icon">
            <ClipboardList size={24} />
          </div>
          <div>
            <span>Total preguntas</span>
            <strong>{stats.total}</strong>
            <p>Preguntas configuradas en el formulario</p>
          </div>
        </article>

        <article className="questions-stat-card">
          <div className="questions-stat-icon green">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span>Activas</span>
            <strong>{stats.active}</strong>
            <p>Disponibles para el paciente</p>
          </div>
        </article>

        <article className="questions-stat-card">
          <div className="questions-stat-icon blue">
            <ListChecks size={24} />
          </div>
          <div>
            <span>Con opciones</span>
            <strong>{stats.withOptions}</strong>
            <p>Listas para generar respuestas</p>
          </div>
        </article>

        <article className="questions-stat-card">
          <div className="questions-stat-icon soft">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span>Obligatorias</span>
            <strong>{stats.required}</strong>
            <p>Preguntas requeridas por flujo</p>
          </div>
        </article>
      </section>

      <section className="questions-board">
        <div className="questions-board-top">
          <div>
            <h2>Banco de preguntas</h2>
            <p>{filteredQuestions.length} pregunta(s) encontrada(s)</p>
          </div>

          <div className="questions-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="questions-filters">
          <div className="questions-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por pregunta, sección, tipo u opción..."
            />
          </div>

          <div className="questions-filter-box">
            <Filter size={17} />
            <select value={sectionFilter} onChange={event => setSectionFilter(event.target.value)}>
              <option value="todos">Todas las secciones</option>
              {sectionOptions.map(section => (
                <option key={section.value} value={section.value}>{section.label}</option>
              ))}
            </select>
          </div>

          <div className="questions-filter-box">
            <HelpCircle size={17} />
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              <option value="todos">Todos los tipos</option>
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="questions-filter-box">
            <ShieldCheck size={17} />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>
        </div>

        <div className="questions-list">
          {filteredQuestions.length ? (
            filteredQuestions.map(question => (
              <article className="question-card-pro" key={question.id}>
                <div className="question-card-icon">
                  <HelpCircle size={23} />
                </div>

                <div className="question-card-main">
                  <div className="question-card-head">
                    <div>
                      <div className="question-card-tags">
                        <Badge tone="info">
                          <span className="question-section-tag">{getSectionLabel(question.section)}</span>
                        </Badge>

                        <Badge tone="muted">
                          {getQuestionTypeLabel(question.question_type)}
                        </Badge>

                        <Badge tone={question.is_active ? 'success' : 'muted'}>
                          {question.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>

                      <h3>{question.question_text}</h3>
                    </div>
                  </div>

                  <div className="question-options-area">
                    {question.question_options?.length ? (
                      question.question_options.map(option => (
                        <Badge key={option.id} tone="muted">
                          {option.label}
                        </Badge>
                      ))
                    ) : (
                      <span className="question-no-options">
                        Esta pregunta aún no tiene opciones registradas.
                      </span>
                    )}
                  </div>
                </div>

                <div className="question-card-actions">
                  <Button variant="secondary" onClick={() => openEditQuestion(question)}>
                    <Edit3 size={16} />
                    Editar
                  </Button>

                  <Button variant="light" onClick={() => openOptionModal(question.id)}>
                    <MessageSquarePlus size={16} />
                    Opción
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="questions-empty-state">
              <HelpCircle size={48} />
              <h3>No hay preguntas para mostrar</h3>
              <p>
                Crea una nueva pregunta o cambia los filtros para visualizar las preguntas configuradas.
              </p>
            </div>
          )}
        </div>
      </section>

      {showQuestionModal ? (
        <div className="questions-modal-overlay">
          <section className="questions-modal">
            <div className="questions-modal-header">
              <div>
                <span>{form.id ? 'Editar pregunta' : 'Nueva pregunta'}</span>
                <h2>{form.id ? 'Actualizar pregunta' : 'Crear pregunta'}</h2>
                <p>Define la sección, tipo y comportamiento de la pregunta dentro del formulario preventivo.</p>
              </div>

              <button
                type="button"
                className="questions-modal-close"
                onClick={closeQuestionModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="questions-modal-form" onSubmit={submit}>
              <div className="questions-field">
                <label>Sección</label>
                <Select
                  value={form.section}
                  onChange={event => setForm({ ...form, section: event.target.value })}
                >
                  {sectionOptions.map(section => (
                    <option key={section.value} value={section.value}>{section.label}</option>
                  ))}
                </Select>
              </div>

              <div className="questions-field">
                <label>Tipo de pregunta</label>
                <Select
                  value={form.question_type}
                  onChange={event => setForm({ ...form, question_type: event.target.value as Question['question_type'] })}
                >
                  {questionTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Select>
              </div>

              <div className="questions-field">
                <label>Orden</label>
                <Input
                  type="number"
                  value={form.order_index ?? 1}
                  onChange={event => setForm({ ...form, order_index: Number(event.target.value) })}
                />
              </div>

              <div className="questions-field">
                <label>Estado</label>
                <Select
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={event => setForm({ ...form, is_active: event.target.value === 'active' })}
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </Select>
              </div>

              <div className="questions-field span-2">
                <label>Pregunta</label>
                <Input
                  value={form.question_text ?? ''}
                  onChange={event => setForm({ ...form, question_text: event.target.value })}
                  placeholder="Ej. ¿Presenta cansancio frecuente?"
                  required
                />
              </div>

              <div className="questions-modal-note span-2">
                <Sparkles size={18} />
                <span>
                  Luego podrás conectar las respuestas de esta pregunta con reglas de recomendación y puntajes.
                </span>
              </div>

              <div className="questions-modal-actions span-2">
                <Button type="button" variant="secondary" onClick={closeQuestionModal}>
                  Cancelar
                </Button>

                <Button disabled={savingQuestion}>
                  {savingQuestion ? 'Guardando...' : (
                    <>
                      <Save size={17} />
                      Guardar pregunta
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {showOptionModal ? (
        <div className="questions-modal-overlay">
          <section className="questions-modal question-option-modal">
            <div className="questions-modal-header">
              <div>
                <span>Nueva opción</span>
                <h2>Agregar opción de respuesta</h2>
                <p>Las opciones serán usadas para que el paciente seleccione respuestas y luego se conecten con reglas.</p>
              </div>

              <button
                type="button"
                className="questions-modal-close"
                onClick={closeOptionModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="questions-modal-form" onSubmit={addOption}>
              <div className="questions-field span-2">
                <label>Pregunta</label>
                <Select
                  value={optionQuestion}
                  onChange={event => setOptionQuestion(event.target.value)}
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

              <div className="questions-field span-2">
                <label>Opción de respuesta</label>
                <Input
                  value={optionLabel}
                  onChange={event => setOptionLabel(event.target.value)}
                  placeholder="Ej. Cansancio frecuente"
                  required
                />
              </div>

              <div className="questions-modal-note span-2">
                <MessageSquarePlus size={18} />
                <span>
                  El valor técnico se generará automáticamente a partir del nombre de la opción.
                </span>
              </div>

              <div className="questions-modal-actions span-2">
                <Button type="button" variant="secondary" onClick={closeOptionModal}>
                  Cancelar
                </Button>

                <Button variant="secondary" disabled={savingOption}>
                  {savingOption ? 'Agregando...' : (
                    <>
                      <Plus size={17} />
                      Agregar opción
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}