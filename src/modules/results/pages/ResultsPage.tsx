import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Filter,
  HeartPulse,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  UserRound,
  X
} from 'lucide-react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { Textarea } from '../../../shared/ui/Textarea';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Badge } from '../../../shared/ui/Badge';
import { formatDate } from '../../../shared/lib/utils';
import type { Patient, PerformedTest, RapidTest } from '../../../shared/types/models';
import { listMyPatients } from '../../institutional/services/institutional.service';
import { listAllPatients } from '../../admin/services/admin.service';
import { listRapidTests } from '../../tests/services/tests.service';
import { createPerformedTest, listPerformedTests } from '../services/results.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/results.css';

const emptyForm = {
  patient_id: '',
  test_id: '',
  result_status: 'realizada',
  result_value: '',
  observation: '',
  performed_at: new Date().toISOString().slice(0, 16)
};

function getStatusTone(status?: string) {
  const value = status?.toLowerCase() ?? '';

  if (value.includes('positivo') || value.includes('alterado') || value.includes('observado')) return 'warning';
  if (value.includes('negativo') || value.includes('normal')) return 'success';
  if (value.includes('pendiente')) return 'info';
  return 'info';
}

function getStatusLabel(status?: string) {
  if (!status) return 'Sin estado';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function ResultsPage({ scope }: { scope: 'admin' | 'client' }) {
  const { profile } = useAuth();

  const [results, setResults] = useState<PerformedTest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tests, setTests] = useState<RapidTest[]>([]);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<PerformedTest | null>(null);

  const [search, setSearch] = useState('');
  const [testFilter, setTestFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [error, setError] = useState('');

  async function load(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    setError('');

    try {
      const clientId = scope === 'client' ? profile?.client_id : null;

      const [r, t, p] = await Promise.all([
        listPerformedTests(clientId),
        listRapidTests(),
        scope === 'client' && profile?.client_id
          ? listMyPatients(profile.client_id)
          : scope === 'admin'
            ? listAllPatients()
            : Promise.resolve([])
      ]);

      setResults(r);
      setTests(t);
      setPatients(p as Patient[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los resultados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const resultsChannel = supabase
      .channel(`results-${scope}-performed-tests-realtime`)
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

    const patientsChannel = supabase
      .channel(`results-${scope}-patients-realtime`)
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

    const testsChannel = supabase
      .channel(`results-${scope}-rapid-tests-realtime`)
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
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(testsChannel);
    };
  }, [profile?.client_id, scope]);

  const activeMainTests = useMemo(() => {
    return tests.filter(test => test.is_main_test && test.is_active);
  }, [tests]);

  const statuses = useMemo(() => {
    const values = new Set<string>();

    results.forEach(result => {
      if (result.result_status) values.add(result.result_status);
    });

    return Array.from(values);
  }, [results]);

  const stats = useMemo(() => {
    const total = results.length;

    const uniquePatients = new Set(
      results
        .map(result => result.patient_id)
        .filter(Boolean)
    ).size;

    const withValue = results.filter(result => Boolean(result.result_value)).length;

    const today = new Date();
    const thisMonth = results.filter(result => {
      if (!result.performed_at) return false;

      const date = new Date(result.performed_at);

      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }).length;

    return { total, uniquePatients, withValue, thisMonth };
  }, [results]);

  const filteredResults = useMemo(() => {
    const value = search.trim().toLowerCase();

    return results.filter((result: any) => {
      const patientName = result.patients?.full_name || result.patients?.code || '';
      const testName = result.rapid_tests?.name || '';
      const status = result.result_status || '';
      const resultValue = result.result_value || '';
      const observation = result.observation || '';

      const matchesSearch =
        !value ||
        patientName.toLowerCase().includes(value) ||
        testName.toLowerCase().includes(value) ||
        status.toLowerCase().includes(value) ||
        resultValue.toLowerCase().includes(value) ||
        observation.toLowerCase().includes(value);

      const matchesTest = testFilter === 'todos' || result.test_id === testFilter;
      const matchesStatus = statusFilter === 'todos' || result.result_status === statusFilter;

      return matchesSearch && matchesTest && matchesStatus;
    });
  }, [results, search, testFilter, statusFilter]);

  function openResultModal() {
    setForm({
      ...emptyForm,
      performed_at: new Date().toISOString().slice(0, 16)
    });
    setShowResultModal(true);
  }

  function closeResultModal() {
    setShowResultModal(false);
    setSaving(false);
    setForm({
      ...emptyForm,
      performed_at: new Date().toISOString().slice(0, 16)
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!profile) return;

    const patient = patients.find(item => item.id === form.patient_id);

    if (!patient) {
      setError('Selecciona un paciente válido para registrar el resultado.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const client_id = scope === 'client' ? profile.client_id! : patient.client_id;

      await createPerformedTest({
        ...form,
        client_id,
        performed_by: profile.id,
        performed_at: new Date(form.performed_at).toISOString()
      });

      closeResultModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el resultado.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="results-page">
      <section className="results-hero">
        <div>
          <span className="results-hero-pill">
            <ShieldCheck size={16} />
            {scope === 'admin' ? 'Seguimiento global PREVITACARE' : 'Gestión institucional'}
          </span>

          <h1>Resultados de pruebas</h1>

          <p>
            Registra y consulta pruebas realizadas, valores obtenidos, observaciones y fechas de atención
            desde un panel claro, moderno y conectado en tiempo real.
          </p>
        </div>

        <div className="results-hero-visual">
          <div className="results-orbit-main">
            <Stethoscope size={44} />
          </div>

          <div className="results-floating-card results-floating-one">
            <TestTube2 size={17} />
            <div>
              <span>Prueba</span>
              <strong>Realizada</strong>
            </div>
          </div>

          <div className="results-floating-card results-floating-two">
            <ClipboardCheck size={17} />
            <div>
              <span>Resultado</span>
              <strong>Registrado</strong>
            </div>
          </div>
        </div>

        <div className="results-hero-actions">
          <button className="results-refresh-button" type="button" onClick={() => load()}>
            <RefreshCw size={18} />
            Sincronizar
          </button>

          <button className="results-new-button" type="button" onClick={openResultModal}>
            <Plus size={18} />
            Registrar resultado
          </button>
        </div>
      </section>

      {error ? (
        <div className="results-error-box">
          {error}
        </div>
      ) : null}

      <section className="results-stats">
        <article className="results-stat-card">
          <div className="results-stat-icon">
            <ClipboardCheck size={24} />
          </div>

          <div>
            <span>Total resultados</span>
            <strong>{stats.total}</strong>
            <p>Pruebas registradas en el sistema</p>
          </div>
        </article>

        <article className="results-stat-card">
          <div className="results-stat-icon green">
            <CalendarDays size={24} />
          </div>

          <div>
            <span>Este mes</span>
            <strong>{stats.thisMonth}</strong>
            <p>Resultados registrados recientemente</p>
          </div>
        </article>

        <article className="results-stat-card">
          <div className="results-stat-icon blue">
            <UserRound size={24} />
          </div>

          <div>
            <span>Pacientes atendidos</span>
            <strong>{stats.uniquePatients}</strong>
            <p>Pacientes con pruebas realizadas</p>
          </div>
        </article>

        <article className="results-stat-card">
          <div className="results-stat-icon soft">
            <HeartPulse size={24} />
          </div>

          <div>
            <span>Con valor</span>
            <strong>{stats.withValue}</strong>
            <p>Resultados con dato registrado</p>
          </div>
        </article>
      </section>

      <section className="results-board">
        <div className="results-board-top">
          <div>
            <h2>Historial de resultados</h2>
            <p>{filteredResults.length} resultado(s) encontrado(s)</p>
          </div>

          <div className="results-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="results-filters">
          <div className="results-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por paciente, prueba, resultado u observación..."
            />
          </div>

          <div className="results-filter-box">
            <Filter size={17} />
            <select value={testFilter} onChange={event => setTestFilter(event.target.value)}>
              <option value="todos">Todas las pruebas</option>
              {tests.map(test => (
                <option key={test.id} value={test.id}>
                  {test.name}
                </option>
              ))}
            </select>
          </div>

          <div className="results-filter-box">
            <CheckCircle2 size={17} />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos los estados</option>
              {statuses.map(status => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="results-list">
          {filteredResults.length ? (
            filteredResults.map((result: any) => (
              <article className="result-card-pro" key={result.id}>
                <div className="result-card-icon">
                  <TestTube2 size={23} />
                </div>

                <div className="result-card-main">
                  <div className="result-card-head">
                    <div>
                      <div className="result-card-tags">
                        <Badge tone={getStatusTone(result.result_status) as any}>
                          {getStatusLabel(result.result_status)}
                        </Badge>

                        <Badge tone="muted">
                          {formatDate(result.performed_at)}
                        </Badge>
                      </div>

                      <h3>{result.patients?.full_name || result.patients?.code || 'Paciente sin nombre'}</h3>
                      <p>{result.rapid_tests?.name || 'Prueba no identificada'}</p>
                    </div>

                    <div className="result-value-box">
                      <span>Valor</span>
                      <strong>{result.result_value || 'No registrado'}</strong>
                    </div>
                  </div>

                  <div className="result-card-meta">
                    <span>
                      <UserRound size={15} />
                      {result.patients?.district || 'Distrito no definido'}
                    </span>

                    <span>
                      <TestTube2 size={15} />
                      {result.rapid_tests?.sample_type || 'Muestra no definida'}
                    </span>

                    <span>
                      <CalendarDays size={15} />
                      {formatDate(result.performed_at)}
                    </span>
                  </div>

                  <div className="result-observation-preview">
                    {result.observation || 'Sin observación registrada.'}
                  </div>
                </div>

                <div className="result-card-actions">
                  <Button variant="secondary" onClick={() => setSelectedResult(result)}>
                    <Eye size={16} />
                    Ver detalle
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="results-empty-state">
              <ClipboardCheck size={48} />
              <h3>No hay resultados para mostrar</h3>
              <p>
                Cuando se registren pruebas realizadas, aparecerán automáticamente en esta sección.
              </p>
            </div>
          )}
        </div>
      </section>

      {showResultModal ? (
        <div className="results-modal-overlay">
          <section className="results-modal">
            <div className="results-modal-header">
              <div>
                <span>Nuevo resultado</span>
                <h2>Registrar prueba realizada</h2>
                <p>Completa la información del paciente, prueba, resultado y observaciones.</p>
              </div>

              <button
                type="button"
                className="results-modal-close"
                onClick={closeResultModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="results-modal-form" onSubmit={submit}>
              <div className="results-field">
                <label>Paciente</label>
                <Select
                  value={form.patient_id}
                  onChange={event => setForm({ ...form, patient_id: event.target.value })}
                  required
                >
                  <option value="">Seleccionar paciente</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name || patient.code}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="results-field">
                <label>Prueba realizada</label>
                <Select
                  value={form.test_id}
                  onChange={event => setForm({ ...form, test_id: event.target.value })}
                  required
                >
                  <option value="">Seleccionar prueba</option>
                  {activeMainTests.map(test => (
                    <option key={test.id} value={test.id}>
                      {test.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="results-field">
                <label>Estado / resultado</label>
                <Input
                  value={form.result_status}
                  onChange={event => setForm({ ...form, result_status: event.target.value })}
                  placeholder="Ej. realizada, positivo, negativo, normal"
                />
              </div>

              <div className="results-field">
                <label>Valor</label>
                <Input
                  value={form.result_value}
                  onChange={event => setForm({ ...form, result_value: event.target.value })}
                  placeholder="Ej. 15 ng/ml, positivo, negativo"
                />
              </div>

              <div className="results-field">
                <label>Fecha y hora</label>
                <Input
                  type="datetime-local"
                  value={form.performed_at}
                  onChange={event => setForm({ ...form, performed_at: event.target.value })}
                />
              </div>

              <div className="results-field span-2">
                <label>Observación</label>
                <Textarea
                  value={form.observation}
                  onChange={event => setForm({ ...form, observation: event.target.value })}
                  placeholder="Agrega una observación breve sobre el resultado, atención o seguimiento."
                />
              </div>

              <div className="results-modal-note span-2">
                <ShieldCheck size={18} />
                <span>
                  Este registro quedará asociado al paciente, cliente institucional y usuario que realizó la atención.
                </span>
              </div>

              <div className="results-modal-actions span-2">
                <Button type="button" variant="secondary" onClick={closeResultModal}>
                  Cancelar
                </Button>

                <Button disabled={saving}>
                  {saving ? 'Registrando...' : (
                    <>
                      <Save size={17} />
                      Registrar resultado
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedResult ? (
        <div className="results-modal-overlay">
          <section className="results-modal result-detail-modal">
            <div className="results-modal-header">
              <div>
                <span>Detalle del resultado</span>
                <h2>{selectedResult.patients?.full_name || selectedResult.patients?.code}</h2>
                <p>{selectedResult.rapid_tests?.name || 'Prueba realizada'}</p>
              </div>

              <button
                type="button"
                className="results-modal-close"
                onClick={() => setSelectedResult(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="result-detail-grid">
              <div className="result-detail-card">
                <span>Estado</span>
                <strong>{getStatusLabel(selectedResult.result_status)}</strong>
              </div>

              <div className="result-detail-card">
                <span>Valor</span>
                <strong>{selectedResult.result_value || 'No registrado'}</strong>
              </div>

              <div className="result-detail-card">
                <span>Fecha</span>
                <strong>{formatDate(selectedResult.performed_at)}</strong>
              </div>

              <div className="result-detail-card">
                <span>Paciente</span>
                <strong>{selectedResult.patients?.full_name || selectedResult.patients?.code}</strong>
              </div>
            </div>

            <div className="result-detail-section">
              <h3>Observación</h3>
              <p>{selectedResult.observation || 'Sin observación registrada.'}</p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}