// SIGEL — Hook de acceso al conjunto de datos (TanStack Query).
import { useQuery } from '@tanstack/react-query';
import { cargarSigelData } from '@/services/sigel-data';

export function useSigelData() {
  return useQuery({
    queryKey: ['sigel-data'],
    queryFn: cargarSigelData,
    staleTime: Infinity,
  });
}
