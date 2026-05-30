// SIGEL — Menú compacto de autenticación para el header.
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/services/supabase/auth';

export function AuthMenu() {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium transition hover:bg-white/20"
      >
        Iniciar sesión
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden max-w-[180px] truncate opacity-80 md:inline" title={user.email}>
        {user.email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 font-medium transition hover:bg-white/20"
      >
        Salir
      </button>
    </div>
  );
}
