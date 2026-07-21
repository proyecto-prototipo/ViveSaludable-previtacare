import type { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <article className="kpi-card">
      <div className="kpi-icon"><Icon size={22} /></div>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
    </article>
  );
}
