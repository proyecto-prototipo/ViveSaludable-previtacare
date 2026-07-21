import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Beaker,
  CheckCircle2,
  Edit3,
  Filter,
  PackageCheck,
  PackageX,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  TestTube2,
  Trash2,
  X
} from 'lucide-react';

import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { Textarea } from '../../../shared/ui/Textarea';
import { LoadingState } from '../../../shared/components/LoadingState';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { formatCurrency } from '../../../shared/lib/utils';
import type { RapidTest } from '../../../shared/types/models';
import {
  deleteRapidTest,
  listRapidTests,
  saveRapidTest,
  toggleRapidTest
} from '../services/tests.service';
import { supabase } from '../../../shared/lib/supabase';
import '../styles/tests.css';

const empty: Partial<RapidTest> = {
  name: '',
  description: '',
  price: 0,
  stock: 0,
  includes_igv: true,
  is_active: true,
  is_main_test: true,
  is_complementary_product: false,
  sample_type: '',
  result_time: '',
  conditions: ''
};

export function TestsPage() {
  const [tests, setTests] = useState<RapidTest[]>([]);
  const [form, setForm] = useState<Partial<RapidTest>>(empty);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [stockFilter, setStockFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);

  const [deletingTest, setDeletingTest] = useState<RapidTest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await listRapidTests();
      setTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las pruebas rápidas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);

    const channel = supabase
      .channel('admin-tests-realtime')
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
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = tests.length;
    const active = tests.filter(test => test.is_active).length;
    const withoutStock = tests.filter(test => Number(test.stock) <= 0).length;
    const complementary = tests.filter(test => test.is_complementary_product).length;

    return { total, active, withoutStock, complementary };
  }, [tests]);

  const filteredTests = useMemo(() => {
    const value = search.trim().toLowerCase();

    return tests.filter(test => {
      const matchesSearch =
        !value ||
        test.name?.toLowerCase().includes(value) ||
        test.description?.toLowerCase().includes(value) ||
        test.sample_type?.toLowerCase().includes(value) ||
        test.result_time?.toLowerCase().includes(value);

      const matchesType =
        typeFilter === 'todos' ||
        (typeFilter === 'test' && !test.is_complementary_product) ||
        (typeFilter === 'product' && test.is_complementary_product);

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'active' && test.is_active) ||
        (statusFilter === 'inactive' && !test.is_active);

      const stock = Number(test.stock ?? 0);

      const matchesStock =
        stockFilter === 'todos' ||
        (stockFilter === 'available' && stock >= 10) ||
        (stockFilter === 'low' && stock > 0 && stock < 10) ||
        (stockFilter === 'empty' && stock <= 0);

      return matchesSearch && matchesType && matchesStatus && matchesStock;
    });
  }, [tests, search, typeFilter, stockFilter, statusFilter]);

  function openCreate() {
    setForm(empty);
    setShowFormModal(true);
  }

  function openEdit(test: RapidTest) {
    setForm(test);
    setShowFormModal(true);
  }

  function closeFormModal() {
    setForm(empty);
    setShowFormModal(false);
    setSaving(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setSaving(true);
    setError('');

    try {
      await saveRapidTest({
        ...form,
        includes_igv: true,
        is_active: form.is_active ?? true
      });

      closeFormModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la prueba.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, next: boolean) {
    setUpdatingId(id);
    setError('');

    try {
      await toggleRapidTest(id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado de la prueba.');
    } finally {
      setUpdatingId(null);
    }
  }

  function openDelete(test: RapidTest) {
    setDeletingTest(test);
  }

  function closeDelete() {
    setDeletingTest(null);
    setDeleting(false);
  }

  async function confirmDelete() {
    if (!deletingTest) return;

    setDeleting(true);
    setError('');

    try {
      await deleteRapidTest(deletingTest.id);
      closeDelete();
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar la prueba. Puede estar vinculada a reglas, recomendaciones o resultados.'
      );
    } finally {
      setDeleting(false);
    }
  }

  function getStockLabel(test: RapidTest) {
    const stock = Number(test.stock ?? 0);

    if (stock <= 0) return 'Sin stock';
    if (stock < 10) return 'Bajo stock';
    return 'Disponible';
  }

  function getStockClass(test: RapidTest) {
    const stock = Number(test.stock ?? 0);

    if (stock <= 0) return 'stock-empty';
    if (stock < 10) return 'stock-low';
    return 'stock-ok';
  }

  if (loading) return <LoadingState />;

  return (
    <div className="tests-page">
      <section className="tests-hero">
        <div>
          <span className="tests-hero-pill">
            <ShieldCheck size={16} />
            Catálogo inteligente PREVITACARE
          </span>

          <h1>Gestión de pruebas rápidas</h1>

          <p>
            Administra precios, stock, disponibilidad, tipo de muestra y condiciones de uso.
            Las pruebas activas alimentan el motor de recomendación preventiva.
          </p>
        </div>

        <div className="tests-hero-visual">
          <div className="tests-orbit-main">
            <TestTube2 size={44} />
          </div>

          <div className="tests-floating-card tests-floating-one">
            <Activity size={17} />
            <div>
              <span>Motor</span>
              <strong>Recomendación</strong>
            </div>
          </div>

          <div className="tests-floating-card tests-floating-two">
            <PackageCheck size={17} />
            <div>
              <span>Stock</span>
              <strong>Controlado</strong>
            </div>
          </div>
        </div>

        <div className="tests-hero-actions">
          <button className="tests-refresh-button" type="button" onClick={load}>
            <RefreshCw size={18} />
            Sincronizar
          </button>

          <button className="tests-new-button" type="button" onClick={openCreate}>
            <Plus size={18} />
            Crear prueba
          </button>
        </div>
      </section>

      {error ? (
        <div className="tests-error-box">
          {error}
        </div>
      ) : null}

      <section className="tests-stats">
        <article className="tests-stat-card">
          <div className="tests-stat-icon">
            <Beaker size={24} />
          </div>
          <div>
            <span>Total catálogo</span>
            <strong>{stats.total}</strong>
            <p>Pruebas y productos registrados</p>
          </div>
        </article>

        <article className="tests-stat-card">
          <div className="tests-stat-icon green">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span>Activas</span>
            <strong>{stats.active}</strong>
            <p>Disponibles para recomendar</p>
          </div>
        </article>

        <article className="tests-stat-card">
          <div className="tests-stat-icon danger">
            <PackageX size={24} />
          </div>
          <div>
            <span>Sin stock</span>
            <strong>{stats.withoutStock}</strong>
            <p>No deben aparecer en ranking</p>
          </div>
        </article>

        <article className="tests-stat-card">
          <div className="tests-stat-icon soft">
            <PackageCheck size={24} />
          </div>
          <div>
            <span>Complementarios</span>
            <strong>{stats.complementary}</strong>
            <p>Productos fuera del ranking principal</p>
          </div>
        </article>
      </section>

      <section className="tests-board">
        <div className="tests-board-top">
          <div>
            <h2>Catálogo de pruebas y productos</h2>
            <p>{filteredTests.length} resultado(s) encontrado(s)</p>
          </div>

          <div className="tests-live-badge">
            <Activity size={16} />
            Datos en vivo
          </div>
        </div>

        <div className="tests-filters">
          <div className="tests-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nombre, descripción, muestra o tiempo..."
            />
          </div>

          <div className="tests-filter-box">
            <Filter size={17} />
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              <option value="todos">Todos los tipos</option>
              <option value="test">Pruebas principales</option>
              <option value="product">Complementarios</option>
            </select>
          </div>

          <div className="tests-filter-box">
            <PackageCheck size={17} />
            <select value={stockFilter} onChange={event => setStockFilter(event.target.value)}>
              <option value="todos">Todo stock</option>
              <option value="available">Disponible</option>
              <option value="low">Bajo stock</option>
              <option value="empty">Sin stock</option>
            </select>
          </div>

          <div className="tests-filter-box">
            <ShieldCheck size={17} />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>
        </div>

        <div className="tests-list">
          {filteredTests.length ? (
            filteredTests.map(test => (
              <article className="test-card-row" key={test.id}>
                <div className="test-card-icon">
                  {test.is_complementary_product ? <PackageCheck size={24} /> : <TestTube2 size={24} />}
                </div>

                <div className="test-card-main">
                  <div className="test-card-title">
                    <div>
                      <h3>{test.name}</h3>
                      <span>
                        {test.is_complementary_product ? 'Producto complementario' : 'Ranking principal'}
                      </span>
                    </div>

                    <StatusBadge status={test.is_active} />
                  </div>

                  <p className="test-card-description">
                    {test.description || 'Sin descripción registrada.'}
                  </p>

                  <div className="test-card-meta">
                    <span className="test-price">{formatCurrency(test.price)}</span>

                    <span className={`test-stock-pill ${getStockClass(test)}`}>
                      {test.stock ?? 0} und. · {getStockLabel(test)}
                    </span>

                    <span>{test.sample_type || 'Muestra no definida'}</span>

                    <span>{test.result_time || 'Tiempo no definido'}</span>
                  </div>
                </div>

                <div className="test-card-actions">
                  <Button variant="secondary" onClick={() => openEdit(test)}>
                    <Edit3 size={16} />
                    Editar
                  </Button>

                  <Button
                    variant={test.is_active ? 'danger' : 'secondary'}
                    disabled={updatingId === test.id}
                    onClick={() => changeStatus(test.id, !test.is_active)}
                  >
                    {test.is_active ? (
                      <>
                        <PackageX size={16} />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Activar
                      </>
                    )}
                  </Button>

                  <Button variant="danger" onClick={() => openDelete(test)}>
                    <Trash2 size={16} />
                    Eliminar
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <div className="tests-empty-state">
              <TestTube2 size={48} />
              <h3>No hay pruebas para mostrar</h3>
              <p>
                Crea una nueva prueba rápida o cambia los filtros para visualizar el catálogo disponible.
              </p>
            </div>
          )}
        </div>
      </section>

      {showFormModal ? (
        <div className="tests-modal-overlay">
          <section className="tests-modal">
            <div className="tests-modal-header">
              <div>
                <span>{form.id ? 'Editar prueba' : 'Nueva prueba'}</span>
                <h2>{form.id ? form.name : 'Crear prueba rápida'}</h2>
                <p>Configura la información comercial y operativa de la prueba o producto.</p>
              </div>

              <button
                type="button"
                className="tests-modal-close"
                onClick={closeFormModal}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form className="tests-modal-form" onSubmit={submit}>
              <div className="tests-field span-2">
                <label>Nombre de la prueba o producto</label>
                <Input
                  value={form.name ?? ''}
                  onChange={event => setForm({ ...form, name: event.target.value })}
                  placeholder="Ej. Vitamina D"
                  required
                />
              </div>

              <div className="tests-field">
                <label>Precio con IGV</label>
                <Input
                  type="number"
                  value={form.price ?? 0}
                  onChange={event => setForm({ ...form, price: Number(event.target.value) })}
                  required
                />
              </div>

              <div className="tests-field">
                <label>Stock disponible</label>
                <Input
                  type="number"
                  value={form.stock ?? 0}
                  onChange={event => setForm({ ...form, stock: Number(event.target.value) })}
                />
              </div>

              <div className="tests-field">
                <label>Tipo</label>
                <Select
                  value={form.is_complementary_product ? 'product' : 'test'}
                  onChange={event =>
                    setForm({
                      ...form,
                      is_complementary_product: event.target.value === 'product',
                      is_main_test: event.target.value === 'test'
                    })
                  }
                >
                  <option value="test">Prueba rápida principal</option>
                  <option value="product">Producto complementario</option>
                </Select>
              </div>

              <div className="tests-field">
                <label>Estado</label>
                <Select
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={event =>
                    setForm({
                      ...form,
                      is_active: event.target.value === 'active'
                    })
                  }
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </Select>
              </div>

              <div className="tests-field">
                <label>Tipo de muestra</label>
                <Input
                  value={form.sample_type ?? ''}
                  onChange={event => setForm({ ...form, sample_type: event.target.value })}
                  placeholder="Ej. Sangre, orina, heces"
                />
              </div>

              <div className="tests-field">
                <label>Tiempo de resultado</label>
                <Input
                  value={form.result_time ?? ''}
                  onChange={event => setForm({ ...form, result_time: event.target.value })}
                  placeholder="Ej. 15 minutos"
                />
              </div>

              <div className="tests-field span-2">
                <label>Descripción</label>
                <Textarea
                  value={form.description ?? ''}
                  onChange={event => setForm({ ...form, description: event.target.value })}
                  placeholder="Describe cuándo se recomienda esta prueba."
                />
              </div>

              <div className="tests-field span-2">
                <label>Condiciones de uso</label>
                <Textarea
                  value={form.conditions ?? ''}
                  onChange={event => setForm({ ...form, conditions: event.target.value })}
                  placeholder="Indica restricciones, consideraciones o condiciones importantes."
                />
              </div>

              {form.is_complementary_product ? (
                <div className="tests-modal-note span-2">
                  <PackageCheck size={18} />
                  <span>
                    Este producto se mostrará como complementario y no formará parte del ranking principal de pruebas.
                  </span>
                </div>
              ) : (
                <div className="tests-modal-note span-2">
                  <TestTube2 size={18} />
                  <span>
                    Esta prueba podrá ser considerada por el motor de recomendación si está activa y tiene stock.
                  </span>
                </div>
              )}

              <div className="tests-modal-actions span-2">
                <Button type="button" variant="secondary" onClick={closeFormModal}>
                  Cancelar
                </Button>

                <Button disabled={saving}>
                  {saving ? 'Guardando...' : (
                    <>
                      <Save size={17} />
                      Guardar prueba
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deletingTest ? (
        <div className="tests-delete-overlay">
          <section className="tests-delete-modal">
            <div className="tests-delete-icon">
              <AlertTriangle size={34} />
            </div>

            <h2>¿Eliminar prueba?</h2>

            <p>
              Estás por eliminar <strong>{deletingTest.name}</strong>. Esta acción puede afectar reglas
              o reportes si la prueba está vinculada a registros existentes.
            </p>

            <div className="tests-delete-warning">
              Para producción, se recomienda desactivar la prueba si ya fue usada en recomendaciones o resultados.
            </div>

            <div className="tests-delete-actions">
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