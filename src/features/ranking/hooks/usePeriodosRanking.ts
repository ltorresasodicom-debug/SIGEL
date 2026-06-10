// SIGEL — Períodos disponibles en public.rankings (más reciente primero).
import { useQuery } from '@tanstack/react-query';
import { listarPeriodosRanking } from '@/services/supabase/rankings';
import { isSupabaseConfigured } from '@/lib/supabase';

export function usePeriodosRanking() {
  return useQuery({
    queryKey: ['rankings', 'periodos'],
    queryFn: listarPeriodosRanking,
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  });
}
