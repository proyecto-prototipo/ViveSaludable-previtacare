import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  FileBarChart,
  HeartPulse,
  Home,
  LogOut,
  Settings,
  TestTube2,
  Users,
  Building2,
  ListChecks,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './dashboard-layout.css';
import logoViveSaludable from '../../assets/logo-vivesaludable.png';

const adminItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { to: '/admin/clientes', label: 'Clientes', icon: Building2 },
  { to: '/admin/pacientes', label: 'Pacientes', icon: Users },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { to: '/admin/pruebas', label: 'Pruebas', icon: TestTube2 },
  { to: '/admin/preguntas', label: 'Preguntas', icon: ClipboardList },
  { to: '/admin/reglas', label: 'Reglas', icon: ListChecks },
  { to: '/admin/recomendaciones', label: 'Recomendaciones', icon: Activity },
  { to: '/admin/resultados', label: 'Resultados', icon: HeartPulse },
  { to: '/admin/reportes', label: 'Reportes', icon: FileBarChart },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings }
];

const clientItems = [
  { to: '/cliente/dashboard', label: 'Dashboard', icon: Home },
  { to: '/cliente/pacientes', label: 'Pacientes', icon: Users },
  { to: '/cliente/formularios', label: 'Formularios', icon: ClipboardList },
  { to: '/cliente/usuarios', label: 'Usuarios', icon: Users },
  { to: '/cliente/recomendaciones', label: 'Recomendaciones', icon: Activity },
  { to: '/cliente/resultados', label: 'Resultados', icon: HeartPulse },
  { to: '/cliente/reportes', label: 'Reportes', icon: FileBarChart },
  { to: '/cliente/configuracion', label: 'Configuración', icon: Settings }
];

export function DashboardLayout({
  children,
  scope
}: {
  children: React.ReactNode;
  scope: 'admin' | 'client';
}) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const items = scope === 'admin' ? adminItems : clientItems;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  const isAdmin = scope === 'admin';

  const profileName = profile?.full_name?.trim();
  const isGenericAdminName = profileName?.toLowerCase() === 'administrador previtacare';

  const topbarTitle = isAdmin
    ? isGenericAdminName || !profileName
      ? 'Panel administrativo'
      : profileName
    : profileName || 'Cuenta institucional';

  const topbarSubtitle = isAdmin
    ? 'PREVITACARE · ViveSaludable'
    : profile?.email || 'Cliente Pro';

  const topbarBadge = isAdmin ? 'Administrador' : 'Cliente';

  return (
    <div className={`dashboard-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      <div
        className="mobile-sidebar-overlay"
        onClick={closeSidebar}
      />

      <aside className="sidebar">
        <button
          type="button"
          className="mobile-close-button"
          onClick={closeSidebar}
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>

        <div className="sidebar-brand">
          <div className="brand-logo">
            <img src={logoViveSaludable} alt="Logo ViveSaludable" />
          </div>
          <div>
            <strong>ViveSaludable</strong>
            <span>{scope === 'admin' ? 'PREVITACARE' : 'Cliente Pro'}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-logout" onClick={handleSignOut}>
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div className="topbar-user">
            <div className="topbar-avatar">
              {isAdmin ? 'PA' : 'CP'}
            </div>

            <div className="topbar-user-info">
              <div className="topbar-title-row">
                <strong>{topbarTitle}</strong>
                <span className="topbar-role-badge">{topbarBadge}</span>
              </div>

              <span>{topbarSubtitle}</span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </section>
    </div>
  );
}