import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  Edit3,
  Filter,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  UsersRound,
  X,
  Save,
  AlertTriangle
} from 'lucide-react';

import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { LoadingState } from '../../../shared/components/LoadingState';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import type { Client } from '../../../shared/types/models';
import {
  createInternalUser,
  deleteInternalUser,
  listClients,
  listProfiles,
  updateInternalUser
} from '../services/admin.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/admin.css';

type UserForm = {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'institutional';
  client_id: string;
};

const emptyForm: UserForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'institutional',
  client_id: ''
};

export function AdminUsersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Partial<any>>({});
  const [editing, setEditing] = useState(false);

  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [p, c] = await Promise.all([listProfiles(), listClients()]);
      setProfiles(p ?? []);
      setClients(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const profilesChannel = supabase
      .channel('admin-users-profiles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          load().catch(console.error);
        }
      )
      .subscribe();

    const clientsChannel = supabase
      .channel('admin-users-clients-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          load().catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(clientsChannel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = profiles.length;
    const admins = profiles.filter(profile => profile.role === 'admin').length;
    const institutional = profiles.filter(profile => profile.role === 'institutional').length;
    const active = profiles.filter(profile => profile.status === 'active').length;

    return { total, admins, institutional, active };
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const value = search.trim().toLowerCase();

    return profiles.filter(profile => {
      const clientName = profile.clients?.name ?? 'PREVITACARE';

      const matchesSearch =
        !value ||
        profile.full_name?.toLowerCase().includes(value) ||
        profile.email?.toLowerCase().includes(value) ||
        profile.role?.toLowerCase().includes(value) ||
        clientName.toLowerCase().includes(value);

      const matchesRole = roleFilter === 'todos' || profile.role === roleFilter;
      const matchesStatus = statusFilter === 'todos' || profile.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [profiles, search, roleFilter, statusFilter]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createInternalUser({
        ...form,
        client_id: form.role === 'admin' ? null : form.client_id,
        status: 'active'
      });

      setForm(emptyForm);
      setShowCreateModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(profile: any) {
    setEditingUser(profile);
    setEditForm({
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      client_id: profile.client_id ?? '',
      status: profile.status
    });
  }

  function closeEdit() {
    setEditingUser(null);
    setEditForm({});
    setEditing(false);
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();

    if (!editingUser) return;

    setEditing(true);
    setError('');

    try {
      await updateInternalUser(editingUser.id, {
        full_name: editForm.full_name,
        email: editForm.email,
        role: editForm.role,
        client_id: editForm.role === 'admin' ? null : editForm.client_id,
        status: editForm.status
      });

      closeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el usuario.');
    } finally {
      setEditing(false);
    }
  }

  function openDelete(profile: any) {
    setDeletingUser(profile);
  }

  function closeDelete() {
    setDeletingUser(null);
    setDeleting(false);
  }

  async function confirmDelete() {
    if (!deletingUser) return;

    setDeleting(true);
    setError('');

    try {
      await deleteInternalUser(deletingUser.id);
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
    <div className="admin-users-page">
      <section className="admin-users-hero">
        <div>
          <span className="admin-hero-pill">
            <ShieldCheck size={16} />
            Control seguro de accesos
          </span>

          <h1>Usuarios internos</h1>

          <p>
            Gestiona administradores y usuarios institucionales con accesos reales,
            roles definidos y trazabilidad conectada a Supabase.
          </p>
        </div>

        <div className="admin-users-hero-visual">
          <div className="users-orbit-main">
            <UserCog size={44} />
          </div>

          <div className="users-floating-card users-floating-one">
            <ShieldCheck size={17} />
            <div>
              <span>Roles</span>
              <strong>Seguros</strong>
            </div>
          </div>

          <div className="users-floating-card users-floating-two">
            <Activity size={17} />
            <div>
              <span>Acceso</span>
              <strong>Activo</strong>
            </div>
          </div>
        </div>

        <div className="admin-users-actions">
          <button className="admin-refresh-button" type="button" onClick={load}>
            <RefreshCw size={18} />
            Sincronizar
          </button>

          <button className="admin-new-user-button" type="button" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            Nuevo usuario
          </button>
        </div>
      </section>

      {error ? (
        <div className="admin-error-box">
          {error}
        </div>
      ) : null}

      <section className="admin-user-stats">
        <article className="admin-user-stat-card">
          <div className="admin-user-stat-icon">
            <UsersRound size={24} />
          </div>
          <div>
            <span>Total usuarios</span>
            <strong>{stats.total}</strong>
            <p>Accesos registrados en la plataforma</p>
          </div>
        </article>

        <article className="admin-user-stat-card">
          <div className="admin-user-stat-icon green">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span>Usuarios activos</span>
            <strong>{stats.active}</strong>
            <p>Cuentas habilitadas para operar</p>
          </div>
        </article>

        <article className="admin-user-stat-card">
          <div className="admin-user-stat-icon blue">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span>Administradores</span>
            <strong>{stats.admins}</strong>
            <p>Usuarios con acceso global</p>
          </div>
        </article>

        <article className="admin-user-stat-card">
          <div className="admin-user-stat-icon soft">
            <Building2 size={24} />
          </div>
          <div>
            <span>Institucionales</span>
            <strong>{stats.institutional}</strong>
            <p>Usuarios asociados a clientes</p>
          </div>
        </article>
      </section>

      <section className="admin-users-board">
        <div className="admin-users-board-top">
          <div>
            <h2>Usuarios registrados</h2>
            <p>{filteredProfiles.length} usuario(s) encontrado(s)</p>
          </div>

          <div className="admin-table-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="admin-users-filters">
          <div className="admin-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por usuario, correo, rol o cliente..."
            />
          </div>

          <div className="admin-filter-box">
            <Filter size={17} />
            <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)}>
              <option value="todos">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="institutional">Institucionales</option>
            </select>
          </div>

          <div className="admin-filter-box">
            <ShieldCheck size={17} />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>
        </div>

        <div className="admin-users-list">
          {filteredProfiles.length ? (
            filteredProfiles.map((profile: any) => {
              const initials = profile.full_name
                ? profile.full_name.charAt(0).toUpperCase()
                : profile.email?.charAt(0).toUpperCase() || 'U';

              return (
                <article className="admin-user-row" key={profile.id}>
                  <div className="admin-user-avatar">
                    {initials}
                  </div>

                  <div className="admin-user-main">
                    <div className="admin-user-title">
                      <div>
                        <h3>{profile.full_name || 'Usuario sin nombre'}</h3>
                        <span>{profile.role === 'admin' ? 'Administrador PREVITACARE' : 'Cliente institucional'}</span>
                      </div>

                      <StatusBadge status={profile.status} />
                    </div>

                    <div className="admin-user-meta">
                      <span>
                        <Mail size={15} />
                        {profile.email || 'Sin correo'}
                      </span>

                      <span>
                        <Building2 size={15} />
                        {profile.clients?.name ?? 'PREVITACARE'}
                      </span>

                      <span>
                        <ShieldCheck size={15} />
                        {profile.role}
                      </span>
                    </div>
                  </div>

                  <div className="admin-user-actions">
                    <Button variant="secondary" onClick={() => openEdit(profile)}>
                      <Edit3 size={16} />
                      Editar
                    </Button>

                    <Button variant="danger" onClick={() => openDelete(profile)}>
                      <Trash2 size={16} />
                      Eliminar
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="admin-users-empty">
              <UserCog size={46} />
              <h3>No hay usuarios para mostrar</h3>
              <p>Crea un nuevo usuario interno para habilitar accesos administrativos o institucionales.</p>
            </div>
          )}
        </div>
      </section>

      {showCreateModal ? (
        <div className="admin-edit-overlay">
          <section className="admin-edit-modal admin-user-modal">
            <div className="admin-edit-header">
              <div>
                <span>Nuevo usuario</span>
                <h2>Crear acceso interno</h2>
                <p>Registra un usuario administrador o institucional con acceso activo al sistema.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="admin-edit-close"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="admin-edit-form" onSubmit={submit}>
              <div className="admin-field span-2">
                <label>Nombre completo</label>
                <Input
                  value={form.full_name}
                  onChange={event => setForm({ ...form, full_name: event.target.value })}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Correo</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={event => setForm({ ...form, email: event.target.value })}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Contraseña temporal</label>
                <Input
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={event => setForm({ ...form, password: event.target.value })}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Rol</label>
                <Select
                  value={form.role}
                  onChange={event => setForm({ ...form, role: event.target.value as 'admin' | 'institutional' })}
                >
                  <option value="institutional">Cliente institucional</option>
                  <option value="admin">Administrador</option>
                </Select>
              </div>

              {form.role === 'institutional' ? (
                <div className="admin-field">
                  <label>Cliente asociado</label>
                  <Select
                    value={form.client_id}
                    onChange={event => setForm({ ...form, client_id: event.target.value })}
                    required
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <div className="admin-edit-actions span-2">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>

                <Button disabled={saving}>
                  {saving ? 'Creando usuario...' : (
                    <>
                      <UserPlus size={17} />
                      Crear usuario
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {editingUser ? (
        <div className="admin-edit-overlay">
          <section className="admin-edit-modal admin-user-modal">
            <div className="admin-edit-header">
              <div>
                <span>Editar usuario</span>
                <h2>{editingUser.full_name || editingUser.email}</h2>
                <p>Actualiza datos, rol, estado o cliente asociado del usuario.</p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="admin-edit-close"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="admin-edit-form" onSubmit={submitEdit}>
              <div className="admin-field span-2">
                <label>Nombre completo</label>
                <Input
                  value={editForm.full_name ?? ''}
                  onChange={event => setEditForm({ ...editForm, full_name: event.target.value })}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Correo</label>
                <Input
                  type="email"
                  value={editForm.email ?? ''}
                  onChange={event => setEditForm({ ...editForm, email: event.target.value })}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Rol</label>
                <Select
                  value={editForm.role ?? 'institutional'}
                  onChange={event => setEditForm({ ...editForm, role: event.target.value })}
                >
                  <option value="institutional">Cliente institucional</option>
                  <option value="admin">Administrador</option>
                </Select>
              </div>

              <div className="admin-field">
                <label>Estado</label>
                <Select
                  value={editForm.status ?? 'active'}
                  onChange={event => setEditForm({ ...editForm, status: event.target.value })}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                </Select>
              </div>

              {editForm.role === 'institutional' ? (
                <div className="admin-field span-2">
                  <label>Cliente asociado</label>
                  <Select
                    value={editForm.client_id ?? ''}
                    onChange={event => setEditForm({ ...editForm, client_id: event.target.value })}
                    required
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <div className="admin-edit-actions span-2">
                <Button type="button" variant="secondary" onClick={closeEdit}>
                  Cancelar
                </Button>

                <Button disabled={editing}>
                  {editing ? 'Guardando...' : (
                    <>
                      <Save size={17} />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deletingUser ? (
        <div className="admin-delete-overlay">
          <section className="admin-delete-modal">
            <div className="admin-delete-icon">
              <AlertTriangle size={34} />
            </div>

            <h2>¿Eliminar usuario?</h2>

            <p>
              Estás por eliminar el acceso de <strong>{deletingUser.full_name || deletingUser.email}</strong>.
              Esta acción quitará su perfil del sistema. ¿Deseas continuar?
            </p>

            <div className="admin-delete-actions">
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