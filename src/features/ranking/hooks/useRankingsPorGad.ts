// SIGEL — Histórico de rankings de un GAD (analítica longitudinal).
import { useQuery } from '@tanstack/react-query';
import { obtenerRankingsPorGad } from '@/services/supabase/rankings';
import { isSupabaseConfigured } from '@/lib/supabase';

export function useRankingsPorGad(gadId: string) {
  return useQuery({
    queryKey: ['rankings', 'gad', gadId],
    queryFn: () => obtenerRankingsPorGad(gadId),
    enabled: isSupabaseConfigured && Boolean(gadId),
    staleTime: 60_000,
  });
}
