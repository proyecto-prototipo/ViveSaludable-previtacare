import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Send } from 'lucide-react';
import { AuthLayout } from '../../../shared/layouts/AuthLayout';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Select } from '../../../shared/ui/Select';
import { registerInstitutionalClient } from '../services/auth.service';
import type { ClientRegisterInput } from '../types';
import '../styles/auth.css';

const initial: ClientRegisterInput = { name: '', client_type: 'médico', responsible_name: '', email: '', phone: '', district: '', password: '' };

export function ClientRegisterPage() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function update<K extends keyof ClientRegisterInput>(key: K, value: ClientRegisterInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerInstitutionalClient(form);
       navigate('/cliente/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el cliente.');
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout>
      <section className="auth-card">
        <h2><Building2 size={24} /> Registro institucional</h2>
        <p>Crea tu cuenta institucional y accede de inmediato a la plataforma.</p>
        {error ? <div className="alert alert-danger">{error}</div> : null}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field"><label>Nombre comercial o razón social</label><Input value={form.name} onChange={e => update('name', e.target.value)} required /></div>
          <div className="field"><label>Tipo de cliente</label><Select value={form.client_type} onChange={e => update('client_type', e.target.value)}><option>médico</option><option>farmacia</option><option>empresa</option><option>institución</option><option>centro ocupacional</option><option>otro</option></Select></div>
          <div className="field"><label>Responsable</label><Input value={form.responsible_name} onChange={e => update('responsible_name', e.target.value)} required /></div>
          <div className="form-grid">
            <div className="field"><label>Correo</label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} required /></div>
            <div className="field"><label>Teléfono</label><Input value={form.phone} onChange={e => update('phone', e.target.value)} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Distrito</label><Input value={form.district} onChange={e => update('district', e.target.value)} /></div>
            <div className="field"><label>Contraseña</label><Input type="password" minLength={6} value={form.password} onChange={e => update('password', e.target.value)} required /></div>
          </div>
          <Button disabled={loading}>{loading ? 'Creando cuenta...' : <><Send size={18} /> Crear cuenta e ingresar</>}</Button>
        </form>
        <p className="auth-footer">¿Ya tienes cuenta? <Link className="auth-link" to="/login">Inicia sesión</Link></p>
      </section>
    </AuthLayout>
  );
}
