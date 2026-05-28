// SIGEL — Badge pasivo que muestra el estado de conexión a Supabase.
import { useSupabaseStatus, type SupabaseStatus } from '@/hooks/useSupabaseStatus';

const ESTILOS: Record<SupabaseStatus, { color: string; text: string }> = {
  'no-config': { color: '#94A3B8', text: 'Supabase: no configurado' },
  checking: { color: '#F59E0B', text: 'Supabase: comprobando…' },
  ok: { color: '#16A34A', text: 'Supabase: conectado' },
  error: { color: '#DC2626', text: 'Supabase: error de conexión' },
};

export function SupabaseStatusBadge() {
  const { status, detail } = useSupabaseStatus();
  const { color, text } = ESTILOS[status];
  const title = status === 'error' && detail ? `${text} — ${detail}` : text;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-slate-400"
      title={title}
      aria-live="polite"
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
      {text}
    </span>
  );
}
