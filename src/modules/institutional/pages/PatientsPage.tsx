import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Edit3,
  Filter,
  HeartPulse,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  UsersRound,
  X
} from 'lucide-react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Badge } from '../../../shared/ui/Badge';
import { formatDate } from '../../../shared/lib/utils';
import type { Patient } from '../../../shared/types/models';
import {
  createPatient,
  deletePatient,
  listMyPatients,
  updatePatient
} from '../services/institutional.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/institutional.css';

const empty: Partial<Patient> = {
  full_name: '',
  code: '',
  age: 18,
  sex: 'femenino',
  contact: '',
  district: '',
  consent_accepted: true
};

function getPatientName(patient: Patient) {
  return patient.full_name || patient.code || 'Paciente sin nombre';
}

export function PatientsPage() {
  const { profile } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState<Partial<Patient>>(empty);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showPatientModal, setShowPatientModal] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [sexFilter, setSexFilter] = useState('todos');
  const [districtFilter, setDistrictFilter] = useState('todos');
  const [error, setError] = useState('');

  async function load(options?: { silent?: boolean }) {
    if (!profile?.client_id) {
      setPatients([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) setLoading(true);
    setError('');

    try {
      const data = await listMyPatients(profile.client_id);
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pacientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    if (!profile?.client_id) return;

    const channel = supabase
      .channel(`client-patients-${profile.client_id}-realtime`)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.client_id]);

  const districts = useMemo(() => {
    const values = new Set<string>();

    patients.forEach(patient => {
      if (patient.district) values.add(patient.district);
    });

    return Array.from(values);
  }, [patients]);

  const stats = useMemo(() => {
    const total = patients.length;

    const withContact = patients.filter(patient => Boolean(patient.contact)).length;

    const consentAccepted = patients.filter(patient => patient.consent_accepted).length;

    const thisMonth = patients.filter(patient => {
      if (!patient.created_at) return false;

      const date = new Date(patient.created_at);
      const now = new Date();

      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    return { total, withContact, consentAccepted, thisMonth };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const value = search.trim().toLowerCase();

    return patients.filter(patient => {
      const name = getPatientName(patient).toLowerCase();
      const contact = patient.contact?.toLowerCase() ?? '';
      const district = patient.district?.toLowerCase() ?? '';
      const sex = patient.sex?.toLowerCase() ?? '';

      const matchesSearch =
        !value ||
        name.includes(value) ||
        contact.includes(value) ||
        district.includes(value) ||
        sex.includes(value);

      const matchesSex =
        sexFilter === 'todos' || patient.sex === sexFilter;

      const matchesDistrict =
        districtFilter === 'todos' || patient.district === districtFilter;

      return matchesSearch && matchesSex && matchesDistrict;
    });
  }, [patients, search, sexFilter, districtFilter]);

  function openCreatePatient() {
    setForm(empty);
    setShowPatientModal(true);
  }

  function openEditPatient(patient: Patient) {
    setForm(patient);
    setShowPatientModal(true);
  }

  function closePatientModal() {
    setForm(empty);
    setSaving(false);
    setShowPatientModal(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!profile?.client_id) return;

    setSaving(true);
    setError('');

    try {
      if (form.id) {
        await updatePatient(form.id, {
          full_name: form.full_name ?? '',
          code: form.code ?? '',
          age: Number(form.age ?? 18),
          sex: form.sex ?? 'femenino',
          contact: form.contact ?? '',
          district: form.district ?? '',
          consent_accepted: form.consent_accepted ?? true
        });
      } else {
        await createPatient({
          ...form,
          age: Number(form.age ?? 18),
          client_id: profile.client_id,
          created_by: profile.id,
          consent_accepted: true
        });
      }

      closePatientModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el paciente.');
    } finally {
      setSaving(false);
    }
  }

  function openDelete(patient: Patient) {
    setDeletingPatient(patient);
  }

  function closeDelete() {
    setDeletingPatient(null);
    setDeleting(false);
  }

  async function confirmDelete() {
    if (!deletingPatient) return;

    setDeleting(true);
    setError('');

    try {
      await deletePatient(deletingPatient.id);
      closeDelete();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el paciente.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="client-patients-page">
      <section className="client-patients-hero">
        <div>
          <span className="client-patients-hero-pill">
            <ShieldCheck size={16} />
            Gestión institucional de pacientes
          </span>

          <h1>Mis pacientes</h1>

          <p>
            Registra y administra únicamente los pacientes asociados a tu institución.
            Los cambios se sincronizan automáticamente para mantener tu información actualizada.
          </p>
        </div>

        <div className="client-patients-hero-visual">
          <div className="client-patients-orbit-main">
            <UsersRound size={44} />
          </div>

          <div className="client-patients-floating-card client-floating-one">
            <UserCheck size={17} />
            <div>
              <span>Pacientes</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="client-patients-floating-card client-floating-two">
            <HeartPulse size={17} />
            <div>
              <span>Atención</span>
              <strong>Preventiva</strong>
            </div>
          </div>
        </div>

        <div className="client-patients-hero-actions">
          <button className="client-patients-refresh" type="button" onClick={() => load()}>
            <RefreshCw size={18} />
            Sincronizar
          </button>

          <button className="client-patients-new" type="button" onClick={openCreatePatient}>
            <Plus size={18} />
            Registrar paciente
          </button>
        </div>
      </section>

      {error ? (
        <div className="client-patients-error">
          {error}
        </div>
      ) : null}

      <section className="client-patients-stats">
        <article className="client-patients-stat-card">
          <div className="client-patients-stat-icon">
            <UsersRound size={24} />
          </div>

          <div>
            <span>Total pacientes</span>
            <strong>{stats.total}</strong>
            <p>Pacientes asociados a tu institución</p>
          </div>
        </article>

        <article className="client-patients-stat-card">
          <div className="client-patients-stat-icon green">
            <CalendarDays size={24} />
          </div>

          <div>
            <span>Este mes</span>
            <strong>{stats.thisMonth}</strong>
            <p>Nuevos pacientes registrados</p>
          </div>
        </article>

        <article className="client-patients-stat-card">
          <div className="client-patients-stat-icon blue">
            <UserCheck size={24} />
          </div>

          <div>
            <span>Con contacto</span>
            <strong>{stats.withContact}</strong>
            <p>Pacientes con dato de contacto</p>
          </div>
        </article>

        <article className="client-patients-stat-card">
          <div className="client-patients-stat-icon soft">
            <ShieldCheck size={24} />
          </div>

          <div>
            <span>Consentimiento</span>
            <strong>{stats.consentAccepted}</strong>
            <p>Pacientes con consentimiento aceptado</p>
          </div>
        </article>
      </section>

      <section className="client-patients-board">
        <div className="client-patients-board-top">
          <div>
            <h2>Listado de pacientes</h2>
            <p>{filteredPatients.length} paciente(s) encontrado(s)</p>
          </div>

          <div className="client-patients-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="client-patients-filters">
          <div className="client-patients-search">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nombre, código, contacto o distrito..."
            />
          </div>

          <div className="client-patients-filter">
            <Filter size={17} />
            <select value={sexFilter} onChange={event => setSexFilter(event.target.value)}>
              <option value="todos">Todos los sexos</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="client-patients-filter">
            <UserRound size={17} />
            <select value={districtFilter} onChange={event => setDistrictFilter(event.target.value)}>
              <option value="todos">Todos los distritos</option>
              {districts.map(district => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="client-patients-list">
          {filteredPatients.length ? (
            filteredPatients.map(patient => (
              <article className="client-patient-card" key={patient.id}>
                <div className="client-patient-avatar">
                  <UserRound size={23} />
                </div>

                <div className="client-patient-main">
                  <div className="client-patient-head">
                    <div>
                      <div className="client-patient-tags">
                        <Badge tone="info">
                          {patient.sex || 'Sin sexo'}
                        </Badge>

                        <Badge tone={patient.consent_accepted ? 'success' : 'muted'}>
                          {patient.consent_accepted ? 'Consentimiento aceptado' : 'Sin consentimiento'}
                        </Badge>
                      </div>

                      <h3>{getPatientName(patient)}</h3>
                      <p>{patient.code ? `Código: ${patient.code}` : 'Sin código interno'}</p>
                    </div>

                    <div className="client-patient-age">
                      <span>Edad</span>
                      <strong>{patient.age ?? '-'}</strong>
                    </div>
                  </div>

                  <div className="client-patient-meta">
                    <span>
                      <UserRound size={15} />
                      {patient.contact || 'Sin contacto'}
                    </span>

                    <span>
                      <Activity size={15} />
                      {patient.district || 'Sin distrito'}
                    </span>

                    <span>
                      <CalendarDays size={15} />
                      {formatDate(patient.created_at)}
                    </span>
                  </div>
                </div>

                <div className="client-patient-actions">
                  <Button variant="secondary" onClick={() => openEditPatient(patient)}>
                    <Edit3 size={16} />
                    Editar
                  </Button>

                  <Button variant="danger" onClick={() => openDelete(patient)}>
                    <Trash2 size={16} />
                    Eliminar
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="client-patients-empty">
              <UsersRound size={48} />
              <h3>No hay pacientes para mostrar</h3>
              <p>
                Registra un nuevo paciente o cambia los filtros para visualizar la información disponible.
              </p>
            </div>
          )}
        </div>
      </section>

      {showPatientModal ? (
        <div className="client-patients-modal-overlay">
          <section className="client-patients-modal">
            <div className="client-patients-modal-header">
              <div>
                <span>{form.id ? 'Editar paciente' : 'Nuevo paciente'}</span>
                <h2>{form.id ? 'Actualizar datos del paciente' : 'Registrar paciente'}</h2>
                <p>Completa los datos principales para mantener tu base institucional ordenada.</p>
              </div>

              <button
                type="button"
                className="client-patients-modal-close"
                onClick={closePatientModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="client-patients-modal-form" onSubmit={submit}>
              <div className="client-patients-field">
                <label>Nombre o código</label>
                <Input
                  value={form.full_name ?? ''}
                  onChange={event => setForm({ ...form, full_name: event.target.value })}
                  placeholder="Nombre del paciente"
                />
              </div>

              <div className="client-patients-field">
                <label>Código opcional</label>
                <Input
                  value={form.code ?? ''}
                  onChange={event => setForm({ ...form, code: event.target.value })}
                  placeholder="Código interno"
                />
              </div>

              <div className="client-patients-field">
                <label>Edad</label>
                <Input
                  type="number"
                  value={form.age ?? 18}
                  onChange={event => setForm({ ...form, age: Number(event.target.value) })}
                  required
                />
              </div>

              <div className="client-patients-field">
                <label>Sexo</label>
                <Select
                  value={form.sex ?? ''}
                  onChange={event => setForm({ ...form, sex: event.target.value })}
                >
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                  <option value="otro">Otro</option>
                </Select>
              </div>

              <div className="client-patients-field">
                <label>Contacto</label>
                <Input
                  value={form.contact ?? ''}
                  onChange={event => setForm({ ...form, contact: event.target.value })}
                  placeholder="Celular o correo"
                />
              </div>

              <div className="client-patients-field">
                <label>Distrito</label>
                <Input
                  value={form.district ?? ''}
                  onChange={event => setForm({ ...form, district: event.target.value })}
                  placeholder="Distrito del paciente"
                />
              </div>

              <div className="client-patients-note span-2">
                <ShieldCheck size={18} />
                <span>
                  Este paciente quedará asociado únicamente a tu institución y será visible solo para los usuarios autorizados.
                </span>
              </div>

              <div className="client-patients-modal-actions span-2">
                <Button type="button" variant="secondary" onClick={closePatientModal}>
                  Cancelar
                </Button>

                <Button disabled={saving}>
                  {saving ? 'Guardando...' : (
                    <>
                      <Save size={17} />
                      Guardar paciente
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deletingPatient ? (
        <div className="client-patients-delete-overlay">
          <section className="client-patients-delete-modal">
            <div className="client-patients-delete-icon">
              <AlertTriangle size={34} />
            </div>

            <h2>¿Eliminar paciente?</h2>

            <p>
              Estás por eliminar a <strong>{getPatientName(deletingPatient)}</strong>.
              Esta acción puede afectar formularios, resultados o recomendaciones asociadas.
            </p>

            <div className="client-patients-delete-warning">
              Si este paciente ya tiene información relacionada, lo más seguro es conservar el registro.
            </div>

            <div className="client-patients-delete-actions">
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