// SIGEL — Servicio de administración de usuarios (RPC security definer, 0004).
// Ambas funciones rechazan en la DB si quien llama no tiene rol 'admin'.
import { supabase } from '@/lib/supabase';
import type { Rol } from '@/hooks/useProfile';

export interface UsuarioAdmin {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  gad_id: string | null;
  created_at: string;
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const { data, error } = await supabase.rpc('admin_listar_usuarios');
  if (error) throw error;
  return (data as UsuarioAdmin[] | null) ?? [];
}

export async function setRol(targetId: string, nuevoRol: Rol): Promise<void> {
  const { error } = await supabase.rpc('admin_set_rol', {
    target_id: targetId,
    nuevo_rol: nuevoRol,
  });
  if (error) throw error;
}
