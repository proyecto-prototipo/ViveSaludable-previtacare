import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Edit3,
  Filter,
  Mail,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  UsersRound,
  X
} from 'lucide-react';

import { useAuth } from '../../../shared/hooks/useAuth';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { LoadingState } from '../../../shared/components/LoadingState';
import { Badge } from '../../../shared/ui/Badge';
import {
  createMyInternalUser,
  deleteMyInternalUser,
  listMyUsers,
  updateMyInternalUser
} from '../services/institutional.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/institutional.css';

const emptyForm = {
  email: '',
  password: '',
  full_name: '',
  status: 'active'
};

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
  return status || 'Sin estado';
}

function getInitials(name?: string, email?: string) {
  const value = name || email || 'Usuario';
  const parts = value.trim().split(' ').filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

export function InstitutionalUsersPage() {
  const { profile } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [error, setError] = useState('');

  async function load(options?: { silent?: boolean }) {
    if (!profile?.client_id) {
      setUsers([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) setLoading(true);
    setError('');

    try {
      const data = await listMyUsers(profile.client_id);
      setUsers(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    if (!profile?.client_id) return;

    const channel = supabase
      .channel(`client-users-${profile.client_id}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
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

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(user => user.status === 'active').length;
    const inactive = users.filter(user => user.status === 'inactive').length;
    const suspended = users.filter(user => user.status === 'suspended').length;

    return { total, active, inactive, suspended };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    return users.filter(user => {
      const name = user.full_name?.toLowerCase() ?? '';
      const email = user.email?.toLowerCase() ?? '';
      const role = user.role?.toLowerCase() ?? '';
      const status = user.status?.toLowerCase() ?? '';

      const matchesSearch =
        !value ||
        name.includes(value) ||
        email.includes(value) ||
        role.includes(value) ||
        status.includes(value);

      const matchesStatus =
        statusFilter === 'todos' || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  function openCreateUser() {
    setEditingUser(null);
    setForm(emptyForm);
    setShowUserModal(true);
  }

  function openEditUser(user: any) {
    setEditingUser(user);
    setForm({
      email: user.email ?? '',
      password: '',
      full_name: user.full_name ?? '',
      status: user.status ?? 'active'
    });
    setShowUserModal(true);
  }

  function closeUserModal() {
    setEditingUser(null);
    setForm(emptyForm);
    setSaving(false);
    setShowUserModal(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!profile?.client_id) return;

    setSaving(true);
    setError('');

    try {
      if (editingUser) {
        await updateMyInternalUser(editingUser.id, {
          full_name: form.full_name,
          status: form.status
        });
      } else {
        await createMyInternalUser({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          client_id: profile.client_id
        });
      }

      closeUserModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  }

  function openDelete(user: any) {
    setDeletingUser(user);
  }

  function closeDelete() {
    setDeletingUser(null);
    setDeleting(false);
  }

  async function confirmDelete() {
    if (!deletingUser) return;

    if (deletingUser.id === profile?.id) {
      setError('No puedes eliminar tu propio usuario desde esta pantalla.');
      closeDelete();
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await deleteMyInternalUser(deletingUser.id);
      closeDelete();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el usuario.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="client-users-page">
      <section className="client-users-hero">
        <div>
          <span className="client-users-hero-pill">
            <ShieldCheck size={16} />
            Equipo institucional
          </span>

          <h1>Usuarios de mi cuenta</h1>

          <p>
            Crea y administra usuarios internos asociados únicamente a tu institución.
            Cada usuario podrá acceder según los permisos definidos para el rol institucional.
          </p>
        </div>

        <div className="client-users-hero-visual">
          <div className="client-users-orbit-main">
            <UserCog size={44} />
          </div>

          <div className="client-users-floating-card client-users-floating-one">
            <UsersRound size={17} />
            <div>
              <span>Equipo</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="client-users-floating-card client-users-floating-two">
            <UserCheck size={17} />
            <div>
              <span>Activos</span>
              <strong>{stats.active}</strong>
            </div>
          </div>
        </div>

        <div className="client-users-hero-actions">
          <button className="client-users-refresh" type="button" onClick={() => load()}>
            <RefreshCw size={18} />
            Sincronizar
          </button>

          <button className="client-users-new" type="button" onClick={openCreateUser}>
            <UserPlus size={18} />
            Nuevo usuario
          </button>
        </div>
      </section>

      {error ? (
        <div className="client-users-error">
          {error}
        </div>
      ) : null}

      <section className="client-users-stats">
        <article className="client-users-stat-card">
          <div className="client-users-stat-icon">
            <UsersRound size={24} />
          </div>

          <div>
            <span>Total usuarios</span>
            <strong>{stats.total}</strong>
            <p>Usuarios asociados a tu institución</p>
          </div>
        </article>

        <article className="client-users-stat-card">
          <div className="client-users-stat-icon green">
            <UserCheck size={24} />
          </div>

          <div>
            <span>Activos</span>
            <strong>{stats.active}</strong>
            <p>Usuarios habilitados para ingresar</p>
          </div>
        </article>

        <article className="client-users-stat-card">
          <div className="client-users-stat-icon blue">
            <UserCog size={24} />
          </div>

          <div>
            <span>Inactivos</span>
            <strong>{stats.inactive}</strong>
            <p>Usuarios pausados temporalmente</p>
          </div>
        </article>

        <article className="client-users-stat-card">
          <div className="client-users-stat-icon soft">
            <ShieldCheck size={24} />
          </div>

          <div>
            <span>Suspendidos</span>
            <strong>{stats.suspended}</strong>
            <p>Usuarios bloqueados por control interno</p>
          </div>
        </article>
      </section>

      <section className="client-users-board">
        <div className="client-users-board-top">
          <div>
            <h2>Equipo de trabajo</h2>
            <p>{filteredUsers.length} usuario(s) encontrado(s)</p>
          </div>

          <div className="client-users-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="client-users-filters">
          <div className="client-users-search">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo, rol o estado..."
            />
          </div>

          <div className="client-users-filter">
            <Filter size={17} />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
        </div>

        <div className="client-users-list">
          {filteredUsers.length ? (
            filteredUsers.map(user => {
              const isCurrentUser = user.id === profile?.id;

              return (
                <article className="client-user-card" key={user.id}>
                  <div className="client-user-avatar">
                    {getInitials(user.full_name, user.email)}
                  </div>

                  <div className="client-user-main">
                    <div className="client-user-head">
                      <div>
                        <div className="client-user-tags">
                          <Badge tone={getStatusTone(user.status) as any}>
                            {getStatusLabel(user.status)}
                          </Badge>

                          <Badge tone="info">
                            {user.role || 'institutional'}
                          </Badge>

                          {isCurrentUser ? (
                            <Badge tone="muted">Tu cuenta</Badge>
                          ) : null}
                        </div>

                        <h3>{user.full_name || 'Usuario sin nombre'}</h3>

                        <p>
                          <Mail size={15} />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="client-user-actions">
                    <Button variant="secondary" onClick={() => openEditUser(user)}>
                      <Edit3 size={16} />
                      Editar
                    </Button>

                    <Button
                      variant="danger"
                      disabled={isCurrentUser}
                      onClick={() => openDelete(user)}
                    >
                      <Trash2 size={16} />
                      Eliminar
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="client-users-empty">
              <UsersRound size={48} />
              <h3>No hay usuarios para mostrar</h3>
              <p>
                Crea un nuevo usuario institucional o cambia los filtros para visualizar tu equipo.
              </p>
            </div>
          )}
        </div>
      </section>

      {showUserModal ? (
        <div className="client-users-modal-overlay">
          <section className="client-users-modal">
            <div className="client-users-modal-header">
              <div>
                <span>{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</span>
                <h2>{editingUser ? 'Actualizar usuario institucional' : 'Crear usuario institucional'}</h2>
                <p>
                  {editingUser
                    ? 'Actualiza el nombre y estado del usuario seleccionado.'
                    : 'Crea una cuenta interna asociada únicamente a tu institución.'}
                </p>
              </div>

              <button
                type="button"
                className="client-users-modal-close"
                onClick={closeUserModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="client-users-modal-form" onSubmit={submit}>
              <div className="client-users-field">
                <label>Nombre</label>
                <Input
                  value={form.full_name}
                  onChange={event => setForm({ ...form, full_name: event.target.value })}
                  placeholder="Nombre del usuario"
                  required
                />
              </div>

              <div className="client-users-field">
                <label>Correo</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={event => setForm({ ...form, email: event.target.value })}
                  placeholder="correo@empresa.com"
                  disabled={Boolean(editingUser)}
                  required
                />
              </div>

              {!editingUser ? (
                <div className="client-users-field">
                  <label>Contraseña temporal</label>
                  <Input
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={event => setForm({ ...form, password: event.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
              ) : (
                <div className="client-users-field">
                  <label>Estado</label>
                  <Select
                    value={form.status}
                    onChange={event => setForm({ ...form, status: event.target.value })}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="suspended">Suspendido</option>
                  </Select>
                </div>
              )}

              <div className="client-users-note span-2">
                <ShieldCheck size={18} />
                <span>
                  Los usuarios creados desde esta pantalla quedan vinculados a tu institución mediante `client_id`.
                </span>
              </div>

              <div className="client-users-modal-actions span-2">
                <Button type="button" variant="secondary" onClick={closeUserModal}>
                  Cancelar
                </Button>

                <Button disabled={saving}>
                  {saving ? 'Guardando...' : (
                    <>
                      <Save size={17} />
                      {editingUser ? 'Guardar cambios' : 'Crear usuario'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deletingUser ? (
        <div className="client-users-delete-overlay">
          <section className="client-users-delete-modal">
            <div className="client-users-delete-icon">
              <AlertTriangle size={34} />
            </div>

            <h2>¿Eliminar usuario?</h2>

            <p>
              Estás por eliminar a <strong>{deletingUser.full_name || deletingUser.email}</strong>.
              Este usuario dejará de aparecer dentro de la cuenta institucional.
            </p>

            <div className="client-users-delete-warning">
              Para bloquear accesos sin perder trazabilidad, también puedes editarlo y cambiar su estado a inactivo o suspendido.
            </div>

            <div className="client-users-delete-actions">
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