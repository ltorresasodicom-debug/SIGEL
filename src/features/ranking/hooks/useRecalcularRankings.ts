// SIGEL — Mutation que recalcula el ranking dinámico y refresca la query.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recalcularRankingsDesdeMediciones } from '@/services/supabase/rankings';

export function useRecalcularRankings(periodo: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recalcularRankingsDesdeMediciones(periodo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rankings', 'dinamico', periodo] });
    },
  });
}
