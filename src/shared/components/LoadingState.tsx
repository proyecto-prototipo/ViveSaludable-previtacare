export function LoadingState({ text = 'Cargando información...' }: { text?: string }) {
  return <div className="loading">{text}</div>;
}
