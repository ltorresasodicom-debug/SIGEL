// SIGEL — Mutation que recalcula el ranking dinámico de un período y
// refresca tanto la tabla del período como la lista de períodos.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { recalcularRankingsDesdeMediciones } from '@/services/supabase/rankings';

export function useRecalcularRankings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (periodo: string) => recalcularRankingsDesdeMediciones(periodo),
    onSuccess: (_data, periodo) => {
      void qc.invalidateQueries({ queryKey: ['rankings', 'dinamico', periodo] });
      void qc.invalidateQueries({ queryKey: ['rankings', 'periodos'] });
    },
  });
}
