import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  Filter,
  HeartPulse,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound
} from 'lucide-react';

import { LoadingState } from '../../../shared/components/LoadingState';
import { formatDate } from '../../../shared/lib/utils';
import { listAllPatients } from '../services/admin.service';
import type { Patient } from '../../../shared/types/models';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/admin.css';

export function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sexFilter, setSexFilter] = useState('todos');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await listAllPatients();
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pacientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const channel = supabase
      .channel('admin-patients-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients'
        },
        () => {
          load().catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = patients.length;

    const withContact = patients.filter(patient => Boolean(patient.contact)).length;

    const male = patients.filter(patient =>
      patient.sex?.toLowerCase().includes('masculino') ||
      patient.sex?.toLowerCase() === 'm'
    ).length;

    const female = patients.filter(patient =>
      patient.sex?.toLowerCase().includes('femenino') ||
      patient.sex?.toLowerCase() === 'f'
    ).length;

    const today = new Date();
    const thisMonth = patients.filter(patient => {
      if (!patient.created_at) return false;
      const created = new Date(patient.created_at);
      return created.getMonth() === today.getMonth() && created.getFullYear() === today.getFullYear();
    }).length;

    return { total, withContact, male, female, thisMonth };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    const value = search.trim().toLowerCase();

    return patients.filter(patient => {
      const patientName = patient.full_name || patient.code || 'Sin nombre';

      const matchesSearch =
        !value ||
        patientName.toLowerCase().includes(value) ||
        patient.contact?.toLowerCase().includes(value) ||
        patient.district?.toLowerCase().includes(value) ||
        patient.sex?.toLowerCase().includes(value);

      const matchesSex =
        sexFilter === 'todos' ||
        patient.sex?.toLowerCase() === sexFilter.toLowerCase() ||
        patient.sex?.toLowerCase().includes(sexFilter.toLowerCase());

      return matchesSearch && matchesSex;
    });
  }, [patients, search, sexFilter]);

  if (loading) return <LoadingState />;

  return (
    <div className="admin-patients-page">
      <section className="admin-patients-hero">
        <div className="admin-patients-hero-content">
          <span className="admin-hero-pill">
            <ShieldCheck size={16} />
            Seguimiento global de pacientes
          </span>

          <h1>Pacientes evaluados</h1>

          <p>
            Visualiza todos los pacientes registrados por los clientes institucionales,
            revisa su información básica y monitorea el crecimiento de evaluaciones preventivas.
          </p>
        </div>

        <div className="admin-patients-hero-visual">
          <div className="patient-pulse-circle">
            <HeartPulse size={42} />
          </div>

          <div className="patient-floating-card patient-card-one">
            <Activity size={17} />
            <div>
              <span>Evaluación</span>
              <strong>Preventiva</strong>
            </div>
          </div>

          <div className="patient-floating-card patient-card-two">
            <ClipboardCheck size={17} />
            <div>
              <span>Formulario</span>
              <strong>Registrado</strong>
            </div>
          </div>
        </div>

        <button className="admin-refresh-button patients-refresh" type="button" onClick={load}>
          <RefreshCw size={18} />
          Sincronizar
        </button>
      </section>

      {error ? (
        <div className="admin-error-box">
          {error}
        </div>
      ) : null}

      <section className="admin-patient-stats">
        <article className="admin-patient-stat-card">
          <div className="admin-patient-stat-icon">
            <UsersRound size={24} />
          </div>
          <div>
            <span>Total pacientes</span>
            <strong>{stats.total}</strong>
            <p>Pacientes registrados en la plataforma</p>
          </div>
        </article>

        <article className="admin-patient-stat-card">
          <div className="admin-patient-stat-icon green">
            <CalendarDays size={24} />
          </div>
          <div>
            <span>Este mes</span>
            <strong>{stats.thisMonth}</strong>
            <p>Nuevos registros preventivos</p>
          </div>
        </article>

        <article className="admin-patient-stat-card">
          <div className="admin-patient-stat-icon blue">
            <Phone size={24} />
          </div>
          <div>
            <span>Con contacto</span>
            <strong>{stats.withContact}</strong>
            <p>Pacientes con dato de comunicación</p>
          </div>
        </article>

        <article className="admin-patient-stat-card">
          <div className="admin-patient-stat-icon soft">
            <UserRound size={24} />
          </div>
          <div>
            <span>Distribución</span>
            <strong>{stats.female} / {stats.male}</strong>
            <p>Femenino / Masculino registrados</p>
          </div>
        </article>
      </section>

      <section className="admin-patients-board">
        <div className="admin-patients-board-top">
          <div>
            <h2>Lista global de pacientes</h2>
            <p>{filteredPatients.length} paciente(s) encontrado(s)</p>
          </div>

          <div className="admin-table-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="admin-patient-filters">
          <div className="admin-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por paciente, contacto, sexo o distrito..."
            />
          </div>

          <div className="admin-filter-box">
            <Filter size={17} />
            <select value={sexFilter} onChange={event => setSexFilter(event.target.value)}>
              <option value="todos">Todos los sexos</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
            </select>
          </div>
        </div>

        <div className="admin-patients-list">
          {filteredPatients.length ? (
            filteredPatients.map(patient => {
              const patientName = patient.full_name || patient.code || 'Sin nombre';

              return (
                <article className="admin-patient-card" key={patient.id}>
                  <div className="admin-patient-avatar">
                    {patientName.charAt(0).toUpperCase()}
                  </div>

                  <div className="admin-patient-info">
                    <div className="admin-patient-title">
                      <div>
                        <h3>{patientName}</h3>
                        <span>{patient.code ? `Código: ${patient.code}` : 'Paciente registrado'}</span>
                      </div>

                      <div className="admin-patient-age">
                        <strong>{patient.age ?? '-'}</strong>
                        <span>años</span>
                      </div>
                    </div>

                    <div className="admin-patient-meta">
                      <span>
                        <UserRound size={15} />
                        {patient.sex || 'Sin sexo'}
                      </span>

                      <span>
                        <Phone size={15} />
                        {patient.contact || 'Sin contacto'}
                      </span>

                      <span>
                        <MapPin size={15} />
                        {patient.district || 'Sin distrito'}
                      </span>

                      <span>
                        <CalendarDays size={15} />
                        {formatDate(patient.created_at)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="admin-patients-empty">
              <HeartPulse size={46} />
              <h3>No hay pacientes para mostrar</h3>
              <p>
                Cuando los clientes institucionales registren pacientes o completen formularios,
                aparecerán automáticamente en esta sección.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}