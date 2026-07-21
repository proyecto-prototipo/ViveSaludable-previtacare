import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './protected-routes';
import { DashboardLayout } from '../shared/layouts/DashboardLayout';
import { LoginPage } from '../modules/auth/pages/LoginPage';
import { ClientRegisterPage } from '../modules/auth/pages/ClientRegisterPage';
import { AdminDashboardPage } from '../modules/admin/pages/AdminDashboardPage';
import { ClientsPage } from '../modules/admin/pages/ClientsPage';
import { AdminPatientsPage } from '../modules/admin/pages/AdminPatientsPage';
import { AdminRecommendationsPage } from '../modules/admin/pages/AdminRecommendationsPage';
import { AdminConfigPage } from '../modules/admin/pages/AdminConfigPage';
import { AdminUsersPage } from '../modules/admin/pages/AdminUsersPage';
import { TestsPage } from '../modules/tests/pages/TestsPage';
import { QuestionsPage } from '../modules/questions/pages/QuestionsPage';
import { RulesPage } from '../modules/questions/pages/RulesPage';
import { ResultsPage } from '../modules/results/pages/ResultsPage';
import { ReportsPage } from '../modules/reports/pages/ReportsPage';
import { InstitutionalDashboardPage } from '../modules/institutional/pages/InstitutionalDashboardPage';
import { PatientsPage } from '../modules/institutional/pages/PatientsPage';
import { FormsPage } from '../modules/institutional/pages/FormsPage';
import { InstitutionalRecommendationsPage } from '../modules/institutional/pages/InstitutionalRecommendationsPage';
import { InstitutionalConfigPage } from '../modules/institutional/pages/InstitutionalConfigPage';
import { InstitutionalUsersPage } from '../modules/institutional/pages/InstitutionalUsersPage';
import { PublicFormPage } from '../modules/patient/pages/PublicFormPage';
import { ResultPage } from '../modules/patient/pages/ResultPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro-cliente" element={<ClientRegisterPage />} />
      <Route path="/cuenta-pendiente" element={<Navigate to="/login" replace />} />
      <Route path="/formulario/:token" element={<PublicFormPage />} />
      <Route path="/resultado/:formId" element={<ResultPage />} />

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<DashboardLayout scope="admin"><Navigate to="/admin/dashboard" replace /></DashboardLayout>} />
        <Route path="/admin/dashboard" element={<DashboardLayout scope="admin"><AdminDashboardPage /></DashboardLayout>} />
        <Route path="/admin/clientes" element={<DashboardLayout scope="admin"><ClientsPage /></DashboardLayout>} />
        <Route path="/admin/pacientes" element={<DashboardLayout scope="admin"><AdminPatientsPage /></DashboardLayout>} />
        <Route path="/admin/usuarios" element={<DashboardLayout scope="admin"><AdminUsersPage /></DashboardLayout>} />
        <Route path="/admin/pruebas" element={<DashboardLayout scope="admin"><TestsPage /></DashboardLayout>} />
        <Route path="/admin/preguntas" element={<DashboardLayout scope="admin"><QuestionsPage /></DashboardLayout>} />
        <Route path="/admin/reglas" element={<DashboardLayout scope="admin"><RulesPage /></DashboardLayout>} />
        <Route path="/admin/recomendaciones" element={<DashboardLayout scope="admin"><AdminRecommendationsPage /></DashboardLayout>} />
        <Route path="/admin/resultados" element={<DashboardLayout scope="admin"><ResultsPage scope="admin" /></DashboardLayout>} />
        <Route path="/admin/reportes" element={<DashboardLayout scope="admin"><ReportsPage scope="admin" /></DashboardLayout>} />
        <Route path="/admin/configuracion" element={<DashboardLayout scope="admin"><AdminConfigPage /></DashboardLayout>} />
      </Route>

      <Route element={<ProtectedRoute roles={['institutional']} />}>
        <Route path="/cliente" element={<DashboardLayout scope="client"><Navigate to="/cliente/dashboard" replace /></DashboardLayout>} />
        <Route path="/cliente/dashboard" element={<DashboardLayout scope="client"><InstitutionalDashboardPage /></DashboardLayout>} />
        <Route path="/cliente/pacientes" element={<DashboardLayout scope="client"><PatientsPage /></DashboardLayout>} />
        <Route path="/cliente/formularios" element={<DashboardLayout scope="client"><FormsPage /></DashboardLayout>} />
        <Route path="/cliente/usuarios" element={<DashboardLayout scope="client"><InstitutionalUsersPage /></DashboardLayout>} />
        <Route path="/cliente/recomendaciones" element={<DashboardLayout scope="client"><InstitutionalRecommendationsPage /></DashboardLayout>} />
        <Route path="/cliente/resultados" element={<DashboardLayout scope="client"><ResultsPage scope="client" /></DashboardLayout>} />
        <Route path="/cliente/reportes" element={<DashboardLayout scope="client"><ReportsPage scope="client" /></DashboardLayout>} />
        <Route path="/cliente/configuracion" element={<DashboardLayout scope="client"><InstitutionalConfigPage /></DashboardLayout>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
