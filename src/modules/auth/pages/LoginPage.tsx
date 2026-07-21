import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../../shared/layouts/AuthLayout';
import { useAuth } from '../../../shared/hooks/useAuth';
import logoViveSaludable from '../../../assets/logo-vivesaludable.png';
import '../styles/auth.css';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('vive_remember_email');

    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const loggedProfile = await signIn(email.trim(), password);

      if (loggedProfile.status === 'suspended' || loggedProfile.status === 'inactive') {
        setError('Tu cuenta se encuentra inactiva o suspendida. Comunícate con PREVITACARE.');
        return;
      }

      if (remember) {
        localStorage.setItem('vive_remember_email', email.trim());
      } else {
        localStorage.removeItem('vive_remember_email');
      }

      if (loggedProfile.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      if (loggedProfile.role === 'institutional') {
        navigate('/cliente/dashboard', { replace: true });
        return;
      }

      navigate('/cliente/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <section className="login-card">
        <div className="login-logo-mini">
          <img
            src={logoViveSaludable}
            alt="ViveSaludable"
            className="login-card-logo"
          />
        </div>

        <div className="login-heading">
          <h2>Iniciar sesión</h2>
          <p>Accede a tu cuenta para gestionar pacientes, pruebas y reportes</p>
        </div>

        {error ? (
          <div className="auth-alert auth-alert-danger">
            {error}
          </div>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label>Correo electrónico o usuario</label>

            <div className="login-input-wrap">
              <Mail size={20} />

              <input
                type="email"
                placeholder="Ingresa tu correo electrónico"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label>Contraseña</label>

            <div className="login-input-wrap">
              <Lock size={20} />

              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label="Mostrar u ocultar contraseña"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="remember-check">
              <input
                type="checkbox"
                checked={remember}
                onChange={event => setRemember(event.target.checked)}
              />

              <span>Recordarme</span>
            </label>

            <button
              type="button"
              className="forgot-link"
              onClick={() =>
                setError('Para recuperar tu contraseña, comunícate con el administrador de PREVITACARE.')
              }
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? (
              'Ingresando...'
            ) : (
              <>
                <LogIn size={20} />
                Ingresar
              </>
            )}
          </button>
        </form>

        <div className="login-divider">
          <span />
          <ShieldCheck size={22} />
          <span />
        </div>

        <div className="login-access-note">
          <div className="access-icon">
            <Building2 size={23} />
          </div>

          <p>
            Acceso para Administrador <strong>PREVITACARE</strong> y clientes institucionales.
          </p>
        </div>

        <div className="login-security-note">
          <Lock size={16} />
          <span>Tus datos están protegidos y el acceso se gestiona por roles.</span>
        </div>
      </section>
    </AuthLayout>
  );
}