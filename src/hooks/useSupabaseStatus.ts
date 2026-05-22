// SIGEL — Estado de conexión a Supabase (diagnóstico).
// Combina la presencia de credenciales (env vars) con un ping mínimo a la
// tabla pública `gads` para validar tanto la URL/clave como que el esquema
// SQL esté aplicado.
import { useQuery } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type SupabaseStatus = 'no-config' | 'checking' | 'ok' | 'error';

export function useSupabaseStatus(): SupabaseStatus {
  const { isLoading, isError } = useQuery({
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

  if (!isSupabaseConfigured) return 'no-config';
  if (isLoading) return 'checking';
  if (isError) return 'error';
  return 'ok';
}
