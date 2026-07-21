import { ReactNode } from 'react';
import {
  BrainCircuit,
  ChartColumnIncreasing,
  LockKeyhole,
  ShieldCheck,
  Activity
} from 'lucide-react';

import logoViveSaludable from '../../assets/logo-vivesaludable.png';
import loginHealthImage from '../../assets/login-health.png';

import '../../modules/auth/styles/auth.css';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-left-panel">
          <div className="auth-brand auth-animate-down">
            <div className="auth-logo-box">
              <img
                src={logoViveSaludable}
                alt="ViveSaludable"
                className="auth-logo-img"
              />
            </div>

            <div className="auth-brand-text">
              <h1>ViveSaludable</h1>
              <p>Prevención personalizada con pruebas rápidas</p>
            </div>
          </div>

          <div className="auth-visual-card auth-animate-up">
            <div className="auth-visual-glow" />

            <img
              src={loginHealthImage}
              alt="Sistema ViveSaludable"
              className="auth-main-image"
            />

            <div className="auth-chip auth-chip-one">
              <Activity size={16} />
              <div>
                <span>Perfil de salud</span>
                <strong>Evaluación activa</strong>
              </div>
            </div>

            <div className="auth-chip auth-chip-two">
              <ShieldCheck size={16} />
              <div>
                <span>Riesgo detectado</span>
                <strong>Bajo</strong>
              </div>
            </div>

            <div className="auth-chip auth-chip-three">
              <ChartColumnIncreasing size={16} />
              <div>
                <span>Seguimiento</span>
                <strong>Reporte generado</strong>
              </div>
            </div>
          </div>

          <div className="auth-benefits-grid auth-animate-up-delay">
            <article className="auth-benefit-card">
              <div className="auth-benefit-icon">
                <BrainCircuit size={24} />
              </div>
              <div>
                <h3>Recomendaciones inteligentes</h3>
                <p>Reglas preventivas para sugerir pruebas rápidas según el perfil del paciente.</p>
              </div>
            </article>

            <article className="auth-benefit-card">
              <div className="auth-benefit-icon">
                <LockKeyhole size={24} />
              </div>
              <div>
                <h3>Gestión segura</h3>
                <p>Información organizada por cliente institucional y protegida por roles.</p>
              </div>
            </article>

            <article className="auth-benefit-card">
              <div className="auth-benefit-icon">
                <ChartColumnIncreasing size={24} />
              </div>
              <div>
                <h3>Reportes claros</h3>
                <p>Paneles y métricas para dar seguimiento a pacientes, pruebas y resultados.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="auth-right-panel auth-animate-right">
          {children}
        </section>
      </div>
    </main>
  );
}