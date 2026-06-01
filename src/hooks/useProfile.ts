// SIGEL — Perfil del usuario logueado (public.profiles).
// Usado para gating por rol en la UI (staff: 'analista' | 'admin').
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from './useAuth';

export type Rol = 'ciudadano' | 'analista' | 'gad_admin' | 'admin';

export interface Profile {
  id: string;
  nombre: string | null;
  rol: Rol;
  gad_id: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery<Profile | null>({
    queryKey: ['profile', user?.id ?? null],
    enabled: isSupabaseConfigured && Boolean(user?.id),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, rol, gad_id')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });
}

export function esStaff(rol: Rol | undefined | null): boolean {
  return rol === 'analista' || rol === 'admin';
}
