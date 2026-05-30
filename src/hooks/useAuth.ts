// SIGEL — Hook de estado de autenticación (Supabase Auth).
import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '@/services/supabase/auth';

/**
 * Devuelve la sesión Supabase y el usuario actual, reaccionando a cambios.
 * Si Supabase no está configurado, `loading` termina en `false` y `user` es null.
 */
export function useAuth(): { user: User | null; session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    getSession()
      .then(({ data }) => {
        if (activo) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (activo) setLoading(false);
      });
    const { data: sub } = onAuthStateChange(async (_event, sess) => {
      if (activo) setSession(sess);
    });
    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user: session?.user ?? null, session, loading };
}
