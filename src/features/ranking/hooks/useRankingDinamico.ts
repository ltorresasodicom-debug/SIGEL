// SIGEL — Lectura del ranking persistido en public.rankings para un período.
import { useQuery } from '@tanstack/react-query';
import { obtenerRankingDinamico } from '@/services/supabase/rankings';
import { isSupabaseConfigured } from '@/lib/supabase';

export function useRankingDinamico(periodo: string) {
  return useQuery({
    queryKey: ['rankings', 'dinamico', periodo],
    queryFn: () => obtenerRankingDinamico(periodo),
    enabled: isSupabaseConfigured && Boolean(periodo),
    staleTime: 60_000,
  });
}
