export function Badge({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'muted' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
