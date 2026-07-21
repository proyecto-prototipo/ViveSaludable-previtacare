import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserRound
} from 'lucide-react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Badge } from '../../../shared/ui/Badge';
import { formatDate } from '../../../shared/lib/utils';
import {
  getMyInstitutionClient,
  getMyInstitutionProfile,
  updateMyInstitutionClient,
  updateMyInstitutionProfile
} from '../services/institutional.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/institutional.css';

function getStatusTone(status?: string) {
  if (status === 'active') return 'success';
  if (status === 'inactive') return 'muted';
  if (status === 'suspended') return 'warning';
  return 'info';
}

function getStatusLabel(status?: string) {
  if (status === 'active') return 'Activo';
  if (status === 'inactive') return 'Inactivo';
  if (status === 'suspended') return 'Suspendido';
  if (status === 'pending') return 'Pendiente';
  return status || 'Sin estado';
}

function getInitials(name?: string, email?: string) {
  const value = name || email || 'Cliente';
  const parts = value.trim().split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

export function InstitutionalConfigPage() {
  const { profile } = useAuth();

  const [currentProfile, setCurrentProfile] = useState<any | null>(null);
  const [client, setClient] = useState<any | null>(null);

  const [profileForm, setProfileForm] = useState({
    full_name: ''
  });

  const [clientForm, setClientForm] = useState({
    name: '',
    client_type: 'institucion',
    responsible_name: '',
    email: '',
    phone: '',
    district: ''
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  async function load(options?: { silent?: boolean }) {
    if (!profile?.id) {
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
      const profileData = await getMyInstitutionProfile(profile.id);
      setCurrentProfile(profileData);

      setProfileForm({
        full_name: profileData.full_name ?? ''
      });

      if (profileData.client_id) {
        const clientData = await getMyInstitutionClient(profileData.client_id);

        setClient(clientData);

        setClientForm({
          name: clientData.name ?? '',
          client_type: clientData.client_type ?? 'institucion',
          responsible_name: clientData.responsible_name ?? '',
          email: clientData.email ?? '',
          phone: clientData.phone ?? '',
          district: clientData.district ?? ''
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    if (!profile?.id) return;

    const profileChannel = supabase
      .channel(`client-config-profile-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`
        },
        () => {
          load({ silent: true }).catch(console.error);
        }
      )
      .subscribe();

    const clientChannel = profile.client_id
      ? supabase
          .channel(`client-config-client-${profile.client_id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'clients',
              filter: `id=eq.${profile.client_id}`
            },
            () => {
              load({ silent: true }).catch(console.error);
            }
          )
          .subscribe()
      : null;

    return () => {
      supabase.removeChannel(profileChannel);
      if (clientChannel) supabase.removeChannel(clientChannel);
    };
  }, [profile?.id, profile?.client_id]);

  const accountSummary = useMemo(() => {
    return {
      initials: getInitials(currentProfile?.full_name, currentProfile?.email),
      displayName: currentProfile?.full_name || currentProfile?.email || 'Usuario institucional',
      email: currentProfile?.email || 'Sin correo',
      status: getStatusLabel(currentProfile?.status),
      role: 'Cliente institucional',
      clientName: client?.name || 'Institución no definida'
    };
  }, [currentProfile, client]);

  async function submitProfile(event: React.FormEvent) {
    event.preventDefault();

    if (!currentProfile?.id) return;

    setSavingProfile(true);
    setError('');
    setSuccessMessage('');

    try {
      const updated = await updateMyInstitutionProfile(currentProfile.id, {
        full_name: profileForm.full_name.trim()
      });

      setCurrentProfile(updated);
      setSuccessMessage('Datos de usuario actualizados correctamente.');
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitClient(event: React.FormEvent) {
    event.preventDefault();

    if (!client?.id) return;

    setSavingClient(true);
    setError('');
    setSuccessMessage('');

    try {
      const updated = await updateMyInstitutionClient(client.id, {
        name: clientForm.name.trim(),
        client_type: clientForm.client_type,
        responsible_name: clientForm.responsible_name.trim(),
        email: clientForm.email.trim(),
        phone: clientForm.phone.trim(),
        district: clientForm.district.trim()
      });

      setClient(updated);
      setSuccessMessage('Datos institucionales actualizados correctamente.');
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la institución.');
    } finally {
      setSavingClient(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="client-config-page">
      <section className="client-config-hero">
        <div>
          <span className="client-config-hero-pill">
            <ShieldCheck size={16} />
            Configuración institucional
          </span>

          <h1>Configuración de cuenta</h1>

          <p>
            Administra la información visible de tu usuario y los datos operativos de tu institución.
            Los datos sensibles permanecen protegidos por PREVITACARE.
          </p>
        </div>

        <div className="client-config-hero-visual">
          <div className="client-config-orbit-main">
            <UserCog size={44} />
          </div>

          <div className="client-config-floating-card client-config-floating-one">
            <Building2 size={17} />
            <div>
              <span>Cuenta</span>
              <strong>Institucional</strong>
            </div>
          </div>

          <div className="client-config-floating-card client-config-floating-two">
            <LockKeyhole size={17} />
            <div>
              <span>Acceso</span>
              <strong>Protegido</strong>
            </div>
          </div>
        </div>

        <button className="client-config-refresh" type="button" onClick={() => load({ silent: true })}>
          <RefreshCw size={18} className={refreshing ? 'client-config-spin' : ''} />
          {refreshing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </section>

      {error ? (
        <div className="client-config-error">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="client-config-success">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      ) : null}

      <section className="client-config-summary">
        <article className="client-config-profile-card">
          <div className="client-config-avatar">
            {accountSummary.initials}
          </div>

          <div>
            <div className="client-config-profile-top">
              <h2>{accountSummary.displayName}</h2>
              <Badge tone={getStatusTone(currentProfile?.status) as any}>
                {accountSummary.status}
              </Badge>
            </div>

            <p>{accountSummary.email}</p>

            <div className="client-config-profile-meta">
              <span>
                <Building2 size={15} />
                {accountSummary.clientName}
              </span>

              <span>
                <ShieldCheck size={15} />
                {accountSummary.role}
              </span>
            </div>
          </div>
        </article>

        <article className="client-config-mini-card">
          <LockKeyhole size={24} />
          <div>
            <span>Seguridad</span>
            <strong>Datos sensibles bloqueados</strong>
            <p>Correo de acceso, rol, estado y contraseña se gestionan con PREVITACARE.</p>
          </div>
        </article>

        <article className="client-config-mini-card">
          <Activity size={24} />
          <div>
            <span>Estado operativo</span>
            <strong>{getStatusLabel(client?.status || currentProfile?.status)}</strong>
            <p>Tu institución puede operar mientras su estado esté activo.</p>
          </div>
        </article>
      </section>

      <section className="client-config-grid">
        <article className="client-config-panel">
          <div className="client-config-panel-header">
            <div>
              <h2>Datos de usuario</h2>
              <p>Información visible para identificar tu cuenta dentro del sistema.</p>
            </div>

            <UserRound size={23} />
          </div>

          <form className="client-config-form" onSubmit={submitProfile}>
            <div className="client-config-field">
              <label>Nombre visible</label>
              <Input
                value={profileForm.full_name}
                onChange={event => setProfileForm({ ...profileForm, full_name: event.target.value })}
                placeholder="Nombre del responsable o usuario"
                required
              />
            </div>

            <div className="client-config-field">
              <label>Correo de acceso</label>
              <Input value={currentProfile?.email ?? ''} disabled />
              <small>Este correo se usa para iniciar sesión y no se edita desde aquí.</small>
            </div>

            <div className="client-config-readonly-grid">
              <div>
                <span>Rol</span>
                <strong>Cliente institucional</strong>
              </div>

              <div>
                <span>Estado</span>
                <strong>{getStatusLabel(currentProfile?.status)}</strong>
              </div>
            </div>

            <div className="client-config-actions">
              <Button disabled={savingProfile}>
                {savingProfile ? 'Guardando...' : (
                  <>
                    <Save size={17} />
                    Guardar usuario
                  </>
                )}
              </Button>
            </div>
          </form>
        </article>

        <article className="client-config-panel">
          <div className="client-config-panel-header">
            <div>
              <h2>Datos institucionales</h2>
              <p>Información operativa de contacto y responsable de tu institución.</p>
            </div>

            <Building2 size={23} />
          </div>

          <form className="client-config-form" onSubmit={submitClient}>
            <div className="client-config-field">
              <label>Nombre de la institución</label>
              <Input
                value={clientForm.name}
                onChange={event => setClientForm({ ...clientForm, name: event.target.value })}
                placeholder="Nombre comercial o razón social"
                required
              />
            </div>

            <div className="client-config-field">
              <label>Tipo de cliente</label>
              <Select
                value={clientForm.client_type}
                onChange={event => setClientForm({ ...clientForm, client_type: event.target.value })}
              >
                <option value="institucion">Institución</option>
                <option value="empresa">Empresa</option>
                <option value="farmacia">Farmacia</option>
                <option value="clinica">Clínica / centro médico</option>
                <option value="profesional">Profesional independiente</option>
              </Select>
            </div>

            <div className="client-config-field">
              <label>Responsable</label>
              <Input
                value={clientForm.responsible_name}
                onChange={event => setClientForm({ ...clientForm, responsible_name: event.target.value })}
                placeholder="Responsable institucional"
              />
            </div>

            <div className="client-config-field">
              <label>Correo de contacto</label>
              <Input
                type="email"
                value={clientForm.email}
                onChange={event => setClientForm({ ...clientForm, email: event.target.value })}
                placeholder="contacto@institucion.com"
              />
            </div>

            <div className="client-config-field">
              <label>Teléfono</label>
              <Input
                value={clientForm.phone}
                onChange={event => setClientForm({ ...clientForm, phone: event.target.value })}
                placeholder="Celular o teléfono"
              />
            </div>

            <div className="client-config-field">
              <label>Distrito</label>
              <Input
                value={clientForm.district}
                onChange={event => setClientForm({ ...clientForm, district: event.target.value })}
                placeholder="Distrito de atención"
              />
            </div>

            <div className="client-config-actions">
              <Button disabled={savingClient}>
                {savingClient ? 'Guardando...' : (
                  <>
                    <Save size={17} />
                    Guardar institución
                  </>
                )}
              </Button>
            </div>
          </form>
        </article>
      </section>

      <section className="client-config-security">
        <div className="client-config-panel-header">
          <div>
            <h2>Seguridad y alcance de la cuenta</h2>
            <p>Resumen de qué puedes editar y qué queda protegido por administración.</p>
          </div>

          <LockKeyhole size={23} />
        </div>

        <div className="client-config-security-grid">
          <div className="client-config-security-card">
            <Mail size={24} />
            <strong>Correo de acceso</strong>
            <span>No editable desde esta vista. Sirve para iniciar sesión.</span>
          </div>

          <div className="client-config-security-card">
            <ShieldCheck size={24} />
            <strong>Rol y permisos</strong>
            <span>Asignados por PREVITACARE para mantener control de acceso.</span>
          </div>

          <div className="client-config-security-card">
            <Database size={24} />
            <strong>Separación de datos</strong>
            <span>Tus pacientes, formularios y resultados se filtran por client_id.</span>
          </div>

          <div className="client-config-security-card">
            <Clock size={24} />
            <strong>Última actualización</strong>
            <span>
              {client?.updated_at
                ? formatDate(client.updated_at)
                : currentProfile?.updated_at
                  ? formatDate(currentProfile.updated_at)
                  : 'Sin fecha registrada'}
            </span>
          </div>

          <div className="client-config-security-card">
            <Phone size={24} />
            <strong>Soporte</strong>
            <span>Para cambios sensibles, contacta al administrador PREVITACARE.</span>
          </div>

          <div className="client-config-security-card">
            <MapPin size={24} />
            <strong>Ubicación operativa</strong>
            <span>{client?.district || 'Distrito no registrado'}</span>
          </div>
        </div>
      </section>

      <section className="client-config-note">
        <div className="client-config-note-icon">
          <Sparkles size={23} />
        </div>

        <div>
          <h3>Configuración enfocada en operación institucional</h3>
          <p>
            Puedes mantener actualizados tus datos visibles y de contacto. Los cambios de acceso,
            contraseña, estado o permisos deben gestionarse con PREVITACARE para proteger la cuenta.
          </p>
        </div>
      </section>
    </div>
  );
}