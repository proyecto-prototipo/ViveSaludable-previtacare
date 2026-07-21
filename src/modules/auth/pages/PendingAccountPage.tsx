import { Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import '../styles/auth.css';

export function PendingAccountPage() {
  return (
    <Card className="pending-card">
      <div className="pending-icon"><Clock3 size={34} /></div>
      <h1>Cuenta pendiente de aprobación</h1>
      <p>Tu cuenta institucional fue creada correctamente. PREVITACARE debe aprobarla para activar el acceso al panel.</p>
      <Link to="/login"><Button variant="light">Volver al login</Button></Link>
    </Card>
  );
}
