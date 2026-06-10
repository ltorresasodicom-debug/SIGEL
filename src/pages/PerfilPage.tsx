import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSigelData } from '@/hooks/useSigelData';
import { actualizarMiPerfil } from '@/services/supabase/profiles';
import { filterByQuery } from '@/lib/fuzzy';
import { isSupabaseConfigured } from '@/lib/supabase';

const ROL_LABEL: Record<string, string> = {
  ciudadano: 'Ciudadano/a',
  analista: 'Analista',
  gad_admin: 'Administrador de GAD',
  admin: 'Administrador',
};

export function PerfilPage() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: cargandoPerfil } = useProfile();
  const { data } = useSigelData();
  const qc = useQueryClient();

  const [nombre, setNombre] = useState('');
  const [gadId, setGadId] = useState('');
  const [filtro, setFiltro] = useState('');

  // Hidrata el formulario cuando llega el perfil.
  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre ?? '');
      setGadId(profile.gad_id ?? '');
    }
  }, [profile]);

  const gads = useMemo(() => data?.gads ?? [], [data]);
  const gadActual = gads.find((g) => g.id === gadId);
  const listaGads = useMemo(() => {
    const base = [...gads].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return filterByQuery(base, ['nombre', 'provincia', 'autoridad'], filtro).slice(0, 60);
  }, [gads, filtro]);

  const guardar = useMutation({
    mutationFn: () =>
      actualizarMiPerfil(user!.id, {
        nombre: nombre.trim() || null,
        gad_id: gadId || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    guardar.mutate();
  }

  if (!isSupabaseConfigured) {
    return (
      <Marco>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El backend Supabase no está configurado en este despliegue.
        </p>
      </Marco>
    );
  }

  if (!loading && !user) {
    return (
      <Marco>
        <p className="text-slate-600">
          Necesitas una cuenta para gestionar tu perfil.{' '}
          <Link to="/login" className="font-semibold text-sigel-primary hover:underline">
            Inicia sesión o crea una cuenta →
          </Link>
        </p>
      </Marco>
    );
  }

  return (
    <Marco>
      {loading || cargandoPerfil ? (
        <p className="text-slate-400">Cargando perfil…</p>
      ) : (
        <>
          <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Email</dt>
              <dd className="font-semibold">{user?.email}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Rol</dt>
              <dd>
                <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {ROL_LABEL[profile?.rol ?? 'ciudadano'] ?? profile?.rol}
                </span>
              </dd>
            </div>
          </dl>

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="perfil-nombre" className="mb-1 block text-sm font-medium">
                Nombre
              </label>
              <input
                id="perfil-nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
              />
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium">Tu gobierno local</span>
              <p className="mb-2 text-xs text-muted">
                Vincula tu cantón o provincia de residencia para personalizar tu experiencia.
              </p>
              {gadActual && (
                <p className="mb-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Seleccionado: <strong>{gadActual.nombre}</strong> ({gadActual.provincia})
                </p>
              )}
              <input
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Busca tu cantón: «Quito», «Cuenca»…"
                aria-label="Buscar gobierno local"
                className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
              />
              <label htmlFor="perfil-gad" className="sr-only">
                Gobierno local
              </label>
              <select
                id="perfil-gad"
                size={6}
                value={gadId}
                onChange={(e) => setGadId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sigel-primary"
              >
                <option value="">— Sin vincular —</option>
                {listaGads.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} ({g.provincia})
                  </option>
                ))}
              </select>
            </div>

            {guardar.isError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {guardar.error instanceof Error ? guardar.error.message : 'Error al guardar.'}
              </p>
            )}
            {guardar.isSuccess && (
              <p
                role="status"
                className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
              >
                ✓ Perfil actualizado.
              </p>
            )}

            <Button variant="primary" size="lg" fullWidth type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </form>
        </>
      )}
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Mi perfil</h1>
        <p className="mt-2 text-slate-600">
          Tu información de cuenta y tu vínculo territorial.
        </p>
      </header>
      <Card>{children}</Card>
    </div>
  );
}
