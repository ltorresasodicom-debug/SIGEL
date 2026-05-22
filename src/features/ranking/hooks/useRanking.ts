// SIGEL — Hook de ranking dinámico (TanStack Query + servicio Supabase).
import { useQuery } from '@tanstack/react-query';
import { obtenerRankingSnapshots } from '@/services/supabase/rankings';

export function useRanking() {
  return useQuery({
    queryKey: ['ranking'],
    queryFn: obtenerRankingSnapshots,
  });
}
