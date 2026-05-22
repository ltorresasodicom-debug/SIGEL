// SIGEL — Hook de guardado de evaluaciones (mutación TanStack + Supabase).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { guardarEvaluacion } from '@/services/supabase/evaluaciones';

export function useGuardarEvaluacion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: guardarEvaluacion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['evaluaciones'] });
    },
  });
}
