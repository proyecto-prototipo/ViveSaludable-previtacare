import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  Filter,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  Pencil,
  Save,
  X
} from 'lucide-react';

import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { LoadingState } from '../../../shared/components/LoadingState';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import type { Client } from '../../../shared/types/models';
import { createClient, listClients, updateClientStatus, updateClient } from '../services/admin.service';
import '../styles/admin.css';
import { supabase } from '../../../shared/lib/supabase';

const empty = {
  name: '',
  client_type: 'médico',
  responsible_name: '',
  email: '',
  phone: '',
  district: '',
  status: 'active'
} as Partial<Client>;

const clientTypes = [
  'médico',
  'farmacia',
  'empresa',
  'institución',
  'centro ocupacional'
];

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [error, setError] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [editing, setEditing] = useState(false);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await listClients();
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la lista de clientes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const channel = supabase
      .channel('admin-clients-realtime')
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
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(client => client.status === 'active').length;
    const suspended = clients.filter(client => client.status === 'suspended').length;
    const institutions = clients.filter(client =>
      ['empresa', 'institución', 'centro ocupacional'].includes(client.client_type)
    ).length;

    return { total, active, suspended, institutions };
  }, [clients]);

  const filteredClients = useMemo(() => {
    const value = search.trim().toLowerCase();

    return clients.filter(client => {
      const matchesSearch =
        !value ||
        client.name?.toLowerCase().includes(value) ||
        client.responsible_name?.toLowerCase().includes(value) ||
        client.email?.toLowerCase().includes(value) ||
        client.district?.toLowerCase().includes(value);

      const matchesType = typeFilter === 'todos' || client.client_type === typeFilter;
      const matchesStatus = statusFilter === 'todos' || client.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [clients, search, typeFilter, statusFilter]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createClient({
        ...form,
        status: 'active'
      });

      setForm(empty);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, next: Client['status']) {
    setUpdatingId(id);
    setError('');

    try {
      await updateClientStatus(id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del cliente.');
    } finally {
      setUpdatingId(null);
    }
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      client_type: client.client_type,
      responsible_name: client.responsible_name,
      email: client.email,
      phone: client.phone,
      district: client.district,
      status: client.status
    });
  }

  function closeEdit() {
    setEditingClient(null);
    setEditForm({});
    setEditing(false);
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();

    if (!editingClient) return;

    setEditing(true);
    setError('');

    try {
      await updateClient(editingClient.id, {
        name: editForm.name,
        client_type: editForm.client_type,
        responsible_name: editForm.responsible_name,
        email: editForm.email,
        phone: editForm.phone,
        district: editForm.district,
        status: editForm.status
      });

      closeEdit();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el cliente.');
    } finally {
      setEditing(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="admin-clients-page">
      <section className="admin-clients-hero">
        <div>
          <span className="admin-hero-pill">
            <ShieldCheck size={16} />
            Panel administrador PREVITACARE
          </span>

          <h1>Gestión de clientes institucionales</h1>

          <p>
            Administra médicos, farmacias, empresas, instituciones y centros ocupacionales desde
            un panel moderno, conectado a Supabase y listo para operar en tiempo real.
          </p>
        </div>

        <button className="admin-refresh-button" type="button" onClick={load}>
          <RefreshCw size={18} />
          Actualizar datos
        </button>
      </section>

      {error ? (
        <div className="admin-error-box">
          {error}
        </div>
      ) : null}

      <section className="admin-client-stats">
        <article className="admin-stat-card stat-total">
          <div className="admin-stat-icon">
            <UsersRound size={24} />
          </div>
          <div>
            <span>Total clientes</span>
            <strong>{stats.total}</strong>
            <p>Registros conectados a la plataforma</p>
          </div>
        </article>

        <article className="admin-stat-card stat-active">
          <div className="admin-stat-icon">
            <Activity size={24} />
          </div>
          <div>
            <span>Clientes activos</span>
            <strong>{stats.active}</strong>
            <p>Con acceso habilitado al sistema</p>
          </div>
        </article>

        <article className="admin-stat-card stat-suspended">
          <div className="admin-stat-icon">
            <PauseCircle size={24} />
          </div>
          <div>
            <span>Suspendidos</span>
            <strong>{stats.suspended}</strong>
            <p>Cuentas bloqueadas temporalmente</p>
          </div>
        </article>

        <article className="admin-stat-card stat-institutions">
          <div className="admin-stat-icon">
            <Building2 size={24} />
          </div>
          <div>
            <span>Empresas e instituciones</span>
            <strong>{stats.institutions}</strong>
            <p>Clientes B2B con operación preventiva</p>
          </div>
        </article>
      </section>

      <section className="admin-clients-layout">
        <article className="admin-create-client-card">
          <div className="admin-section-heading">
            <div className="admin-section-icon">
              <Plus size={20} />
            </div>

            <div>
              <h2>Crear cliente manualmente</h2>
              <p>El cliente se creará como activo y podrá operar de inmediato.</p>
            </div>
          </div>

          <form className="admin-client-form" onSubmit={submit}>
            <div className="admin-field span-2">
              <label>Nombre comercial o razón social</label>
              <Input
                value={form.name ?? ''}
                onChange={event => setForm({ ...form, name: event.target.value })}
                placeholder="Ej. Farmacia Salud Total"
                required
              />
            </div>

            <div className="admin-field">
              <label>Tipo de cliente</label>
              <Select
                value={form.client_type}
                onChange={event => setForm({ ...form, client_type: event.target.value })}
              >
                {clientTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </div>

            <div className="admin-field">
              <label>Responsable</label>
              <Input
                value={form.responsible_name ?? ''}
                onChange={event => setForm({ ...form, responsible_name: event.target.value })}
                placeholder="Nombre del responsable"
                required
              />
            </div>

            <div className="admin-field">
              <label>Correo electrónico</label>
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={event => setForm({ ...form, email: event.target.value })}
                placeholder="correo@empresa.com"
                required
              />
            </div>

            <div className="admin-field">
              <label>Teléfono</label>
              <Input
                value={form.phone ?? ''}
                onChange={event => setForm({ ...form, phone: event.target.value })}
                placeholder="999 999 999"
              />
            </div>

            <div className="admin-field">
              <label>Distrito</label>
              <Input
                value={form.district ?? ''}
                onChange={event => setForm({ ...form, district: event.target.value })}
                placeholder="Ej. Magdalena del Mar"
              />
            </div>

            <Button disabled={saving}>
              {saving ? 'Guardando cliente...' : (
                <>
                  <Plus size={18} />
                  Guardar cliente activo
                </>
              )}
            </Button>
          </form>
        </article>

        <article className="admin-clients-table-card">
          <div className="admin-table-top">
            <div>
              <h2>Clientes registrados</h2>
              <p>{filteredClients.length} resultado(s) encontrado(s)</p>
            </div>

            <div className="admin-table-badge">
              <Activity size={16} />
              Datos en vivo
            </div>
          </div>

          <div className="admin-client-filters">
            <div className="admin-search-box">
              <Search size={18} />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por cliente, responsable, correo o distrito..."
              />
            </div>

            <div className="admin-filter-box">
              <Filter size={17} />
              <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
                <option value="todos">Todos los tipos</option>
                {clientTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="admin-filter-box">
              <ShieldCheck size={17} />
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                <option value="todos">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="suspended">Suspendidos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>

          <div className="admin-clients-list">
            {filteredClients.length ? (
              filteredClients.map(client => (
                <article className="admin-client-row" key={client.id}>
                  <div className="admin-client-avatar">
                    {client.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>

                  <div className="admin-client-main">
                    <div className="admin-client-title">
                      <div>
                        <h3>{client.name}</h3>
                        <span>{client.client_type}</span>
                      </div>

                      <StatusBadge status={client.status} />
                    </div>

                    <div className="admin-client-meta">
                      <span>
                        <UserRound size={15} />
                        {client.responsible_name || 'Sin responsable'}
                      </span>

                      <span>
                        <Mail size={15} />
                        {client.email || 'Sin correo'}
                      </span>

                      <span>
                        <Phone size={15} />
                        {client.phone || 'Sin teléfono'}
                      </span>

                      <span>
                        <MapPin size={15} />
                        {client.district || 'Sin distrito'}
                      </span>
                    </div>
                  </div>

                  <div className="admin-client-actions">
                    <Button
                      variant="secondary"
                      onClick={() => openEdit(client)}
                    >
                      <Pencil size={16} />
                      Editar
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={updatingId === client.id || client.status === 'active'}
                      onClick={() => changeStatus(client.id, 'active')}
                    >
                      <CheckCircle2 size={16} />
                      Activar
                    </Button>

                    <Button
                      variant="danger"
                      disabled={updatingId === client.id || client.status === 'suspended'}
                      onClick={() => changeStatus(client.id, 'suspended')}
                    >
                      <PauseCircle size={16} />
                      Suspender
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className="admin-empty-state">
                <Building2 size={42} />
                <h3>No se encontraron clientes</h3>
                <p>Prueba cambiando los filtros o registra un nuevo cliente institucional.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      {editingClient ? (
        <div className="admin-edit-overlay">
          <section className="admin-edit-modal">
            <div className="admin-edit-header">
              <div>
                <span>Editar cliente</span>
                <h2>{editingClient.name}</h2>
                <p>Actualiza los datos institucionales del cliente. Los cambios se reflejarán en todos los módulos conectados.</p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="admin-edit-close"
                aria-label="Cerrar edición"
              >
                <X size={20} />
              </button>
            </div>

            <form className="admin-edit-form" onSubmit={submitEdit}>
              <div className="admin-field span-2">
                <label>Nombre comercial o razón social</label>
                <Input
                  value={editForm.name ?? ''}
                  onChange={event => setEditForm({ ...editForm, name: event.target.value })}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Tipo de cliente</label>
                <Select
                  value={editForm.client_type ?? 'médico'}
                  onChange={event => setEditForm({ ...editForm, client_type: event.target.value })}
                >
                  {clientTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>

              <div className="admin-field">
                <label>Estado</label>
                <Select
                  value={editForm.status ?? 'active'}
                  onChange={event => setEditForm({ ...editForm, status: event.target.value as Client['status'] })}
                >
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="inactive">Inactivo</option>
                </Select>
              </div>

              <div className="admin-field">
                <label>Responsable</label>
                <Input
                  value={editForm.responsible_name ?? ''}
                  onChange={event => setEditForm({ ...editForm, responsible_name: event.target.value })}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Correo de contacto</label>
                <Input
                  type="email"
                  value={editForm.email ?? ''}
                  onChange={event => setEditForm({ ...editForm, email: event.target.value })}
                  required
                />
              </div>

              <div className="admin-field">
                <label>Teléfono</label>
                <Input
                  value={editForm.phone ?? ''}
                  onChange={event => setEditForm({ ...editForm, phone: event.target.value })}
                />
              </div>

              <div className="admin-field">
                <label>Distrito</label>
                <Input
                  value={editForm.district ?? ''}
                  onChange={event => setEditForm({ ...editForm, district: event.target.value })}
                />
              </div>

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
    </div>
  );
}