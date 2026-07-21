import {
  Activity,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Database,
  FileBarChart,
  HeartPulse,
  LockKeyhole,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TestTube2,
  UsersRound,
  Workflow
} from 'lucide-react';

import '../styles/admin.css';

export function AdminConfigPage() {
  return (
    <div className="admin-config-page">
      <section className="admin-config-hero">
        <div>
          <span className="admin-config-hero-pill">
            <Settings size={16} />
            Centro de configuración PREVITACARE
          </span>

          <h1>Configuración general</h1>

          <p>
            Revisa los parámetros operativos, criterios preventivos, seguridad de datos y alcance funcional
            del sistema ViveSaludable para una operación clara, segura y profesional.
          </p>
        </div>

        <div className="admin-config-hero-visual">
          <div className="admin-config-orbit-main">
            <SlidersHorizontal size={44} />
          </div>

          <div className="admin-config-floating-card config-floating-one">
            <ShieldCheck size={17} />
            <div>
              <span>Seguridad</span>
              <strong>Activa</strong>
            </div>
          </div>

          <div className="admin-config-floating-card config-floating-two">
            <BrainCircuit size={17} />
            <div>
              <span>IA</span>
              <strong>Planificada</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-config-stats">
        <article className="admin-config-stat-card">
          <div className="admin-config-stat-icon">
            <Building2 size={24} />
          </div>

          <div>
            <span>Modelo comercial</span>
            <strong>B2B / B2B2C</strong>
            <p>Orientado a médicos, farmacias, empresas e instituciones.</p>
          </div>
        </article>

        <article className="admin-config-stat-card">
          <div className="admin-config-stat-icon green">
            <Workflow size={24} />
          </div>

          <div>
            <span>Motor activo</span>
            <strong>Reglas</strong>
            <p>Recomendaciones por reglas ponderadas y puntajes.</p>
          </div>
        </article>

        <article className="admin-config-stat-card">
          <div className="admin-config-stat-icon blue">
            <LockKeyhole size={24} />
          </div>

          <div>
            <span>Seguridad</span>
            <strong>RLS</strong>
            <p>Acceso controlado por roles y separación por cliente.</p>
          </div>
        </article>

        <article className="admin-config-stat-card">
          <div className="admin-config-stat-icon soft">
            <BrainCircuit size={24} />
          </div>

          <div>
            <span>IA clínica</span>
            <strong>Asistida</strong>
            <p>Planificada como apoyo preventivo, no diagnóstico final.</p>
          </div>
        </article>
      </section>

      <section className="admin-config-grid">
        <article className="admin-config-panel">
          <div className="admin-config-panel-header">
            <div>
              <h2>Parámetros operativos</h2>
              <p>Información base del funcionamiento actual del sistema.</p>
            </div>

            <Activity size={23} />
          </div>

          <div className="admin-config-list">
            <div className="admin-config-item">
              <div className="admin-config-item-icon">
                <Building2 size={20} />
              </div>

              <div>
                <strong>Modelo comercial</strong>
                <span>ViveSaludable Pro opera bajo un modelo B2B / B2B2C para clientes institucionales.</span>
              </div>

              <small>Activo</small>
            </div>

            <div className="admin-config-item">
              <div className="admin-config-item-icon">
                <Workflow size={20} />
              </div>

              <div>
                <strong>Motor de recomendación</strong>
                <span>Las recomendaciones se generan mediante reglas ponderadas configurables por el administrador.</span>
              </div>

              <small>Activo</small>
            </div>

            <div className="admin-config-item">
              <div className="admin-config-item-icon">
                <HeartPulse size={20} />
              </div>

              <div>
                <strong>Orientación preventiva</strong>
                <span>El sistema brinda orientación preventiva basada en respuestas, puntajes y pruebas disponibles.</span>
              </div>

              <small>Activo</small>
            </div>

            <div className="admin-config-item">
              <div className="admin-config-item-icon">
                <TestTube2 size={20} />
              </div>

              <div>
                <strong>Catálogo de pruebas</strong>
                <span>Solo las pruebas activas y con stock deben participar en el ranking principal.</span>
              </div>

              <small>Validado</small>
            </div>
          </div>
        </article>

        <article className="admin-config-panel">
          <div className="admin-config-panel-header">
            <div>
              <h2>Seguridad y datos</h2>
              <p>Controles principales para proteger información sensible.</p>
            </div>

            <ShieldCheck size={23} />
          </div>

          <div className="admin-security-grid">
            <div className="admin-security-card">
              <LockKeyhole size={24} />
              <strong>Supabase Auth</strong>
              <span>Acceso por usuario autenticado y roles definidos.</span>
            </div>

            <div className="admin-security-card">
              <Database size={24} />
              <strong>Row Level Security</strong>
              <span>Políticas RLS para proteger registros según rol y cliente.</span>
            </div>

            <div className="admin-security-card">
              <UsersRound size={24} />
              <strong>Separación por cliente</strong>
              <span>Los datos institucionales se segmentan por `client_id`.</span>
            </div>

            <div className="admin-security-card">
              <FileBarChart size={24} />
              <strong>Exportaciones trazables</strong>
              <span>Las descargas de reportes pueden registrarse para auditoría.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="admin-config-grid">
  <article className="admin-config-panel wide">
    <div className="admin-config-panel-header">
      <div>
        <h2>Criterios preventivos del sistema</h2>
        <p>Reglas de operación que deben mantenerse para un uso responsable.</p>
      </div>

      <CheckCircle2 size={23} />
    </div>

    <div className="admin-config-timeline">
      <div className="admin-config-step">
        <span>01</span>
        <div>
          <strong>No reemplaza una consulta médica</strong>
          <p>
            Las recomendaciones son preventivas y deben interpretarse como apoyo para orientar pruebas rápidas,
            no como diagnóstico definitivo.
          </p>
        </div>
      </div>

      <div className="admin-config-step">
        <span>02</span>
        <div>
          <strong>El ranking depende de reglas configuradas</strong>
          <p>
            Las respuestas del paciente suman puntajes a determinadas pruebas mediante reglas creadas por el administrador.
          </p>
        </div>
      </div>

      <div className="admin-config-step">
        <span>03</span>
        <div>
          <strong>Stock y disponibilidad importan</strong>
          <p>
            Las pruebas inactivas o sin stock no deberían mostrarse como recomendación principal al paciente.
          </p>
        </div>
      </div>

      <div className="admin-config-step">
        <span>04</span>
        <div>
          <strong>Explicación clara para el paciente</strong>
          <p>
            Cada recomendación debe mostrar motivo, prioridad, precio referencial y advertencias preventivas si corresponde.
          </p>
        </div>
      </div>
    </div>
  </article>
</section>

      <section className="admin-config-modules">
        <div className="admin-config-panel-header">
          <div>
            <h2>Módulos activos del administrador</h2>
            <p>Resumen visual de las áreas principales ya configuradas.</p>
          </div>

          <Settings size={23} />
        </div>

        <div className="admin-module-grid">
          <div className="admin-module-card">
            <UsersRound size={24} />
            <strong>Clientes</strong>
            <span>Gestión institucional</span>
          </div>

          <div className="admin-module-card">
            <HeartPulse size={24} />
            <strong>Pacientes</strong>
            <span>Vista global</span>
          </div>

          <div className="admin-module-card">
            <TestTube2 size={24} />
            <strong>Pruebas</strong>
            <span>Catálogo y stock</span>
          </div>

          <div className="admin-module-card">
            <Workflow size={24} />
            <strong>Reglas</strong>
            <span>Motor preventivo</span>
          </div>

          <div className="admin-module-card">
            <BrainCircuit size={24} />
            <strong>Recomendaciones</strong>
            <span>Ranking generado</span>
          </div>

          <div className="admin-module-card">
            <FileBarChart size={24} />
            <strong>Reportes</strong>
            <span>Exportación CSV</span>
          </div>
        </div>
      </section>

      <section className="admin-config-alert">
        <div className="admin-config-alert-icon">
          <ShieldCheck size={24} />
        </div>

        <div>
          <h3>Uso responsable del sistema</h3>
          <p>
            ViveSaludable debe comunicar sus resultados como orientación preventiva. Cuando se integre IA,
            debe usarse para mejorar la explicación y acompañamiento, no para reemplazar la evaluación de un profesional de salud.
          </p>
        </div>
      </section>
    </div>
  );
}