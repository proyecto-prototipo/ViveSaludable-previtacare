import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clipboard,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Link2,
  QrCode,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { Button } from '../../../shared/ui/Button';
import { Select } from '../../../shared/ui/Select';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Badge } from '../../../shared/ui/Badge';
import { buildPublicUrl, createToken, formatDate } from '../../../shared/lib/utils';
import type { Patient } from '../../../shared/types/models';
import {
  createPublicForm,
  listMyForms,
  listMyPatients
} from '../services/institutional.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/institutional.css';

function getPatientName(patient?: Patient | null) {
  return patient?.full_name || patient?.code || 'Paciente sin nombre';
}

function getFormStatusTone(status?: string) {
  if (status === 'completed') return 'success';
  if (status === 'submitted') return 'success';
  if (status === 'draft') return 'info';
  if (status === 'expired') return 'warning';
  return 'muted';
}

function getFormStatusLabel(status?: string) {
  if (status === 'completed') return 'Completado';
  if (status === 'submitted') return 'Enviado';
  if (status === 'draft') return 'Pendiente';
  if (status === 'expired') return 'Vencido';
  return status || 'Sin estado';
}

function getPublicFormLink(token?: string) {
  if (!token) return '';
  return buildPublicUrl(`/formulario/${token}`);
}

export function FormsPage() {
  const { profile } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [patientId, setPatientId] = useState('');
  const [lastLink, setLastLink] = useState('');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const [selectedForm, setSelectedForm] = useState<any | null>(null);
  const [error, setError] = useState('');

  async function load(options?: { silent?: boolean }) {
    if (!profile?.client_id) {
      setPatients([]);
      setForms([]);
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
      const [p, f] = await Promise.all([
        listMyPatients(profile.client_id),
        listMyForms(profile.client_id)
      ]);

      setPatients(p);
      setForms(f);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los formularios.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    if (!profile?.client_id) return;

    const formsChannel = supabase
      .channel(`client-forms-${profile.client_id}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms',
          filter: `client_id=eq.${profile.client_id}`
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    const patientsChannel = supabase
      .channel(`client-forms-patients-${profile.client_id}-realtime`)
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
      supabase.removeChannel(formsChannel);
      supabase.removeChannel(patientsChannel);
    };
  }, [profile?.client_id]);

  const selectedPatient = useMemo(() => {
    return patients.find(patient => patient.id === patientId);
  }, [patients, patientId]);

  const stats = useMemo(() => {
    const total = forms.length;

    const pending = forms.filter(form => form.status === 'draft').length;

    const completed = forms.filter(form =>
      form.status === 'completed' || form.status === 'submitted'
    ).length;

    const withConsent = forms.filter(form => form.consent_accepted).length;

    return { total, pending, completed, withConsent };
  }, [forms]);

  const filteredForms = useMemo(() => {
    const value = search.trim().toLowerCase();

    return forms.filter(form => {
      const patientName = form.patients?.full_name || form.patients?.code || '';
      const token = form.public_token || '';
      const status = form.status || '';

      const matchesSearch =
        !value ||
        patientName.toLowerCase().includes(value) ||
        token.toLowerCase().includes(value) ||
        status.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === 'todos' || form.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [forms, search, statusFilter]);

  async function copyLink(link: string) {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);

      window.setTimeout(() => {
        setCopiedLink('');
      }, 1800);
    } catch {
      setError('No se pudo copiar el enlace. Puedes abrirlo y copiarlo manualmente.');
    }
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault();

    if (!profile?.client_id || !patientId) return;

    setGenerating(true);
    setError('');

    try {
      const token = createToken();

      const form = await createPublicForm({
        client_id: profile.client_id,
        patient_id: patientId,
        completed_by: profile.id,
        public_token: token,
        status: 'draft',
        consent_accepted: false,
        preventive_disclaimer_accepted: false
      });

      const link = buildPublicUrl(`/formulario/${form.public_token}`);

      setLastLink(link);
      setSelectedForm({
        ...form,
        patients: selectedPatient
      });

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el enlace.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="client-forms-page">
      <section className="client-forms-hero">
        <div>
          <span className="client-forms-hero-pill">
            <ShieldCheck size={16} />
            Formularios seguros para pacientes
          </span>

          <h1>Formularios preventivos</h1>

          <p>
            Genera enlaces únicos para que tus pacientes completen su formulario preventivo
            desde celular o computadora. Cada enlace queda asociado a tu institución.
          </p>
        </div>

        <div className="client-forms-hero-visual">
          <div className="client-forms-orbit-main">
            <FileText size={44} />
          </div>

          <div className="client-forms-floating-card client-forms-floating-one">
            <Link2 size={17} />
            <div>
              <span>Enlace</span>
              <strong>Seguro</strong>
            </div>
          </div>

          <div className="client-forms-floating-card client-forms-floating-two">
            <QrCode size={17} />
            <div>
              <span>Acceso</span>
              <strong>QR</strong>
            </div>
          </div>
        </div>

        <button className="client-forms-refresh" type="button" onClick={() => load({ silent: true })}>
          <RefreshCw size={18} className={refreshing ? 'client-forms-spin' : ''} />
          {refreshing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </section>

      {error ? (
        <div className="client-forms-error">
          {error}
        </div>
      ) : null}

      <section className="client-forms-stats">
        <article className="client-forms-stat-card">
          <div className="client-forms-stat-icon">
            <FileText size={24} />
          </div>

          <div>
            <span>Total formularios</span>
            <strong>{stats.total}</strong>
            <p>Enlaces generados por tu institución</p>
          </div>
        </article>

        <article className="client-forms-stat-card">
          <div className="client-forms-stat-icon blue">
            <Clock size={24} />
          </div>

          <div>
            <span>Pendientes</span>
            <strong>{stats.pending}</strong>
            <p>Formularios aún no completados</p>
          </div>
        </article>

        <article className="client-forms-stat-card">
          <div className="client-forms-stat-icon green">
            <CheckCircle2 size={24} />
          </div>

          <div>
            <span>Completados</span>
            <strong>{stats.completed}</strong>
            <p>Pacientes que finalizaron el formulario</p>
          </div>
        </article>

        <article className="client-forms-stat-card">
          <div className="client-forms-stat-icon soft">
            <ShieldCheck size={24} />
          </div>

          <div>
            <span>Consentimiento</span>
            <strong>{stats.withConsent}</strong>
            <p>Formularios con consentimiento aceptado</p>
          </div>
        </article>
      </section>

      <section className="client-forms-generator">
        <div className="client-forms-generator-info">
          <div className="client-forms-generator-icon">
            <Send size={25} />
          </div>

          <div>
            <h2>Generar nuevo enlace</h2>
            <p>
              Selecciona un paciente registrado y genera un enlace público para que complete
              sus respuestas preventivas.
            </p>
          </div>
        </div>

        <form className="client-forms-generator-form" onSubmit={generate}>
          <div className="client-forms-field">
            <label>Paciente</label>

            <Select
              value={patientId}
              onChange={event => setPatientId(event.target.value)}
              required
            >
              <option value="">Seleccionar paciente</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {getPatientName(patient)}
                </option>
              ))}
            </Select>
          </div>

          <Button disabled={generating || !patientId}>
            <Link2 size={17} />
            {generating ? 'Generando...' : 'Generar enlace'}
          </Button>
        </form>

        {lastLink ? (
          <div className="client-forms-last-link">
            <div>
              <strong>Último enlace generado</strong>
              <a href={lastLink} target="_blank" rel="noreferrer">
                {lastLink}
              </a>
            </div>

            <div className="client-forms-last-actions">
              <button type="button" onClick={() => copyLink(lastLink)}>
                <Copy size={16} />
                {copiedLink === lastLink ? 'Copiado' : 'Copiar'}
              </button>

              <a href={lastLink} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                Abrir
              </a>
            </div>

            <div className="client-forms-last-qr">
              <QRCodeSVG value={lastLink} size={126} level="M" includeMargin />
            </div>
          </div>
        ) : null}
      </section>

      <section className="client-forms-board">
        <div className="client-forms-board-top">
          <div>
            <h2>Historial de formularios</h2>
            <p>{filteredForms.length} formulario(s) encontrado(s)</p>
          </div>

          <div className="client-forms-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="client-forms-filters">
          <div className="client-forms-search">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por paciente, token o estado..."
            />
          </div>

          <div className="client-forms-filter">
            <Filter size={17} />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="draft">Pendientes</option>
              <option value="completed">Completados</option>
              <option value="submitted">Enviados</option>
              <option value="expired">Vencidos</option>
            </select>
          </div>
        </div>

        <div className="client-forms-list">
          {filteredForms.length ? (
            filteredForms.map(form => {
              const link = getPublicFormLink(form.public_token);

              return (
                <article className="client-form-card" key={form.id}>
                  <div className="client-form-icon">
                    <FileCheck2 size={23} />
                  </div>

                  <div className="client-form-main">
                    <div className="client-form-head">
                      <div>
                        <div className="client-form-tags">
                          <Badge tone={getFormStatusTone(form.status) as any}>
                            {getFormStatusLabel(form.status)}
                          </Badge>

                          <Badge tone={form.consent_accepted ? 'success' : 'muted'}>
                            {form.consent_accepted ? 'Consentimiento aceptado' : 'Sin consentimiento'}
                          </Badge>
                        </div>

                        <h3>{form.patients?.full_name || form.patients?.code || 'Paciente sin nombre'}</h3>
                        <p>Token: {form.public_token}</p>
                      </div>

                      <div className="client-form-date">
                        <span>Creado</span>
                        <strong>{formatDate(form.created_at)}</strong>
                      </div>
                    </div>

                    <div className="client-form-meta">
                      <span>
                        <UserRound size={15} />
                        {form.patients?.district || 'Sin distrito'}
                      </span>

                      <span>
                        <Clipboard size={15} />
                        {form.public_token || 'Sin token'}
                      </span>

                      <span>
                        <ShieldCheck size={15} />
                        {getFormStatusLabel(form.status)}
                      </span>
                    </div>
                  </div>

                  <div className="client-form-actions">
                    <Button variant="secondary" onClick={() => copyLink(link)}>
                      <Copy size={16} />
                      {copiedLink === link ? 'Copiado' : 'Copiar'}
                    </Button>

                    <Button variant="light" onClick={() => setSelectedForm(form)}>
                      <QrCode size={16} />
                      QR
                    </Button>

                    {link ? (
                      <a className="client-form-open-link" href={link} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} />
                        Abrir
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="client-forms-empty">
              <FileText size={48} />
              <h3>No hay formularios para mostrar</h3>
              <p>
                Genera un enlace para un paciente y aparecerá automáticamente en esta sección.
              </p>
            </div>
          )}
        </div>
      </section>

      {selectedForm ? (
        <div className="client-forms-modal-overlay">
          <section className="client-forms-modal">
            <div className="client-forms-modal-header">
              <div>
                <span>Formulario preventivo</span>
                <h2>{selectedForm.patients?.full_name || selectedForm.patients?.code || 'Paciente'}</h2>
                <p>Comparte este enlace o permite que el paciente escanee el código QR.</p>
              </div>

              <button
                type="button"
                className="client-forms-modal-close"
                onClick={() => setSelectedForm(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="client-forms-modal-body">
              <div className="client-forms-qr-box">
                <QRCodeSVG
                  value={getPublicFormLink(selectedForm.public_token)}
                  size={190}
                  level="M"
                  includeMargin
                />
              </div>

              <div className="client-forms-modal-info">
                <div className="client-forms-detail-card">
                  <span>Estado</span>
                  <strong>{getFormStatusLabel(selectedForm.status)}</strong>
                </div>

                <div className="client-forms-detail-card">
                  <span>Token</span>
                  <strong>{selectedForm.public_token}</strong>
                </div>

                <div className="client-forms-detail-card">
                  <span>Creado</span>
                  <strong>{formatDate(selectedForm.created_at)}</strong>
                </div>

                <div className="client-forms-link-panel">
                  <strong>Enlace público</strong>
                  <a
                    href={getPublicFormLink(selectedForm.public_token)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {getPublicFormLink(selectedForm.public_token)}
                  </a>

                  <div>
                    <Button
                      variant="secondary"
                      onClick={() => copyLink(getPublicFormLink(selectedForm.public_token))}
                    >
                      <Copy size={16} />
                      {copiedLink === getPublicFormLink(selectedForm.public_token) ? 'Copiado' : 'Copiar enlace'}
                    </Button>

                    <a
                      className="client-form-open-link"
                      href={getPublicFormLink(selectedForm.public_token)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={16} />
                      Abrir
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="client-forms-modal-note">
              <Sparkles size={18} />
              <span>
                Cuando el paciente complete el formulario, sus respuestas alimentarán el motor de recomendaciones preventivas.
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}