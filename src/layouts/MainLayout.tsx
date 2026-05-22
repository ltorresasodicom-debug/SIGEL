import { lazy, Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Spinner } from '@/components/ui';

// Lazy: el cliente Supabase no entra al bundle inicial.
const SupabaseStatusBadge = lazy(() =>
  import('@/components/SupabaseStatusBadge').then((m) => ({ default: m.SupabaseStatusBadge })),
);

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/ranking', label: 'Ranking', end: false },
  { to: '/mapa', label: 'Mapa', end: false },
  { to: '/evaluar', label: 'Evaluar', end: false },
  { to: '/calculadora', label: 'Calculadora', end: false },
  { to: '/metodologia', label: 'Metodología', end: false },
];

/** Marco de la aplicación: navbar accesible, contenido (Outlet) y footer. */
export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="skip-link">
        Saltar al contenido principal
      </a>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-sigel-primary text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2" aria-label="SIGEL Ecuador — inicio">
            <span className="font-display text-xl font-extrabold tracking-tight">SIGEL</span>
            <span className="text-[10px] uppercase tracking-widest opacity-80">Ecuador</span>
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Navegación principal">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 transition hover:bg-white/10 ${
                    isActive ? 'bg-white/15 font-semibold' : ''
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1">
        <Suspense fallback={<Spinner label="Cargando…" />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="mt-16 bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm">
          <div className="font-display text-lg font-bold text-white">SIGEL Ecuador</div>
          <p className="mt-2 opacity-80">
            Plataforma ciudadana de evaluación de gobiernos locales. Con el apoyo de ASODICOM y
            Latam Cifras.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="opacity-60">
              © {new Date().getFullYear()} SIGEL Ecuador — Evaluación pública para la mejora continua.
            </p>
            <Suspense fallback={null}>
              <SupabaseStatusBadge />
            </Suspense>
          </div>
        </div>
      </footer>
    </div>
  );
}
