// SIGEL — Estado de conexión a Supabase (diagnóstico).
// Combina la presencia de credenciales (env vars) con un ping mínimo a la
// tabla pública `gads` para validar tanto la URL/clave como que el esquema
// SQL esté aplicado.
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type SupabaseStatus = 'no-config' | 'checking' | 'ok' | 'error';

export interface SupabaseStatusInfo {
  status: SupabaseStatus;
  /** Mensaje del error real cuando `status === 'error'` (p. ej. "Failed to fetch"). */
  detail?: string;
}

export function useSupabaseStatus(): SupabaseStatusInfo {
  const { isLoading, isError, error } = useQuery({
    queryKey: ['supabase-status'],
    queryFn: async () => {
      const { error } = await supabase.from('gads').select('id').limit(1);
      if (error) throw error;
      return true;
    },
    enabled: isSupabaseConfigured,
    staleTime: Infinity,
    retry: false,
  });

  if (!isSupabaseConfigured) return { status: 'no-config' };
  if (isLoading) return { status: 'checking' };
  if (isError) {
    return { status: 'error', detail: error instanceof Error ? error.message : String(error) };
  }
  return { status: 'ok' };
}
