// SIGEL — Componentes de UI compartidos (design system).
import type { ReactNode } from 'react';
import type { Nivel, Semaforo } from '@/evaluation-engine/types';
import { NIVEL_STYLE, SEMAFORO_COLOR } from '@/lib/colores';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ nivel }: { nivel: Nivel }) {
  const s = NIVEL_STYLE[nivel];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide"
      style={{ background: s.bg, color: s.fg }}
    >
      {nivel}
    </span>
  );
}

export function SemaforoDot({ semaforo, label = false }: { semaforo: Semaforo; label?: boolean }) {
  const dot = (
    <span
      className="inline-block h-3.5 w-3.5 rounded-full"
      style={{
        background: SEMAFORO_COLOR[semaforo],
        boxShadow: '0 0 0 2px #fff, 0 0 0 3px #e2e8f0',
      }}
    />
  );
  if (!label) return dot;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
      {dot}
      {semaforo}
    </span>
  );
}

export function Stat({
  value,
  label,
  invert = false,
}: {
  value: ReactNode;
  label: string;
  invert?: boolean;
}) {
  return (
    <div
      className={
        invert
          ? 'rounded-xl border border-white/15 bg-white/10 p-4'
          : 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'
      }
    >
      <div
        className={`font-display text-3xl font-extrabold tabular-nums md:text-4xl ${
          invert ? 'text-white' : 'text-sigel-primary'
        }`}
      >
        {value}
      </div>
      <div
        className={`mt-1 text-xs uppercase tracking-wider ${
          invert ? 'text-white/80' : 'text-slate-500'
        }`}
      >
        {label}
      </div>
    </div>
  );
}

export function ProgressBar({ value, color = '#1E3A8A' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-slate-500">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-sigel-primary border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}

/** Envoltura de estados de carga/error para vistas data-driven. */
export function DataBoundary({
  loading,
  error,
  children,
}: {
  loading: boolean;
  error: unknown;
  children: ReactNode;
}) {
  if (loading) return <Spinner label="Cargando datos de SIGEL…" />;
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h2 className="font-display text-2xl font-bold text-red-600">Error de carga</h2>
        <p className="mt-2 text-slate-600">No fue posible cargar los datos. Intenta recargar.</p>
      </div>
    );
  }
  return <>{children}</>;
}
