import { Badge } from '../ui/Badge';

export function StatusBadge({ status }: { status?: string | boolean | null }) {
  const text = typeof status === 'boolean' ? (status ? 'Activo' : 'Inactivo') : (status ?? 'Sin estado');
  const normalized = String(text).toLowerCase();
  const tone = normalized.includes('active') || normalized.includes('activo') || normalized === 'true'
    ? 'success'
    : normalized.includes('pending') || normalized.includes('pendiente')
      ? 'warning'
      : normalized.includes('suspend') || normalized.includes('inactive') || normalized.includes('inactivo')
        ? 'danger'
        : 'muted';
  return <Badge tone={tone}>{text}</Badge>;
}
