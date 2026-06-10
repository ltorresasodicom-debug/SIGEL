// SIGEL — Servicio del perfil propio (public.profiles).
// La RLS "perfil propio escritura" (0001) + el grant de columnas de 0002
// limitan la edición a (nombre, gad_id) de la fila del usuario autenticado.
import { supabase } from '@/lib/supabase';

export interface PerfilUpdate {
  nombre?: string | null;
  gad_id?: string | null;
}

export async function actualizarMiPerfil(userId: string, cambios: PerfilUpdate): Promise<void> {
  const { error } = await supabase.from('profiles').update(cambios).eq('id', userId);
  if (error) throw error;
}
