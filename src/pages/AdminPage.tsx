import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, type Rol } from '@/hooks/useProfile';
import { useSigelData } from '@/hooks/useSigelData';
import { listarUsuarios, setRol, type UsuarioAdmin } from '@/services/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase';

const ROLES: Rol[] = ['ciudadano', 'analista', 'gad_admin', 'admin'];

export function AdminPage() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: cargandoPerfil } = useProfile();
  const { data: sigel } = useSigelData();
  const qc = useQueryClient();
  const esAdmin = profile?.rol === 'admin';

  const usuarios = useQuery({
    queryKey: ['admin', 'usuarios'],
    queryFn: listarUsuarios,
    enabled: isSupabaseConfigured && esAdmin,
    staleTime: 30_000,
  });

  const cambiarRol = useMutation({
    mutationFn: ({ id, rol }: { id: string; rol: Rol }) => setRol(id, rol),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'usuarios'] });
      if (vars.id === user?.id) void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  function onCambiarRol(u: UsuarioAdmin, nuevo: Rol) {
    if (nuevo === u.rol) return;
    if (
      u.id === user?.id &&
      nuevo !== 'admin' &&
      !confirm('Vas a quitarte el rol admin a ti mismo y perderás acceso a este panel. ¿Continuar?')
    ) {
      return;
    }
    cambiarRol.mutate({ id: u.id, rol: nuevo });
  }

  const nombreGad = (gadId: string | null) =>
    gadId ? (sigel?.gads.find((g) => g.id === gadId)?.nombre ?? gadId) : '—';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Administración de usuarios
        </h1>
        <p className="mt-2 text-slate-600">
          Gestiona los roles de la plataforma. Solo visible para administradores.
        </p>
      </header>

      {!isSupabaseConfigured ? (
        <Card>
          <p className="text-sm text-amber-900">El backend Supabase no está configurado.</p>
        </Card>
      ) : loading || cargandoPerfil ? (
        <Card>
          <p className="text-slate-400">Cargando…</p>
        </Card>
      ) : !user ? (
        <Card>
          <p className="text-slate-600">
            Necesitas iniciar sesión.{' '}
            <Link to="/login" className="font-semibold text-sigel-primary hover:underline">
              Ir al login →
            </Link>
          </p>
        </Card>
      ) : !esAdmin ? (
        <Card>
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Acceso restringido: esta sección es solo para administradores.
          </p>
        </Card>
      ) : usuarios.isLoading ? (
        <Card>
          <p className="text-slate-400">Cargando usuarios…</p>
        </Card>
      ) : usuarios.isError ? (
        <Card>
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Error al listar usuarios:{' '}
            {usuarios.error instanceof Error ? usuarios.error.message : 'desconocido'}
            <span className="mt-1 block text-xs">
              Si el error es «function admin_listar_usuarios does not exist», falta aplicar la
              migración <code>0004_admin_usuarios.sql</code> en el SQL Editor.
            </span>
          </p>
        </Card>
      ) : (
        <>
          {cambiarRol.isError && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              Error al cambiar rol:{' '}
              {cambiarRol.error instanceof Error ? cambiarRol.error.message : 'desconocido'}
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Nombre</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="hidden px-4 py-3 text-left lg:table-cell">GAD vinculado</th>
                  <th className="hidden px-4 py-3 text-left sm:table-cell">Alta</th>
                </tr>
              </thead>
              <tbody>
                {(usuarios.data ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">
                      {u.email}
                      {u.id === user.id && (
                        <span className="ml-2 rounded bg-sigel-primary/10 px-1.5 py-0.5 text-xs font-semibold text-sigel-primary">
                          tú
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {u.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <label className="sr-only" htmlFor={`rol-${u.id}`}>
                        Rol de {u.email}
                      </label>
                      <select
                        id={`rol-${u.id}`}
                        value={u.rol}
                        disabled={cambiarRol.isPending}
                        onChange={(e) => onCambiarRol(u, e.target.value as Rol)}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                      {nombreGad(u.gad_id)}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">
                      {new Date(u.created_at).toLocaleDateString('es-EC')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            {usuarios.data?.length ?? 0} usuario(s). Los cambios de rol son inmediatos y quedan
            protegidos en la base de datos: solo un admin puede ejecutarlos.
          </p>
        </>
      )}
    </div>
  );
}
