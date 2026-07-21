import type { ReactNode } from 'react';
import logoViveSaludable from '../../assets/logo-vivesaludable.png';

export function PublicFormLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-page">
      <main className="public-container">
        <header className="public-brand">
          <div className="public-brand-badge">
            <img
              src={logoViveSaludable}
              alt="ViveSaludable"
              className="public-brand-logo"
            />
          </div>

          <div className="public-brand-text">
            <strong>ViveSaludable</strong>
            <span>Orientación preventiva personalizada</span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}