// SIGEL — Evaluaciones del usuario logueado persistidas en Supabase.
import { useQuery } from '@tanstack/react-query';
import { listarEvaluacionesDeUsuario } from '@/services/supabase/evaluaciones';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useMisEvaluaciones() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['evaluaciones', 'usuario', user?.id ?? null],
    queryFn: () => listarEvaluacionesDeUsuario(user!.id),
    enabled: isSupabaseConfigured && Boolean(user?.id),
    staleTime: 60_000,
  });
}
