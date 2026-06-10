// SIGEL — Servicio de autenticación (Supabase Auth).
import { supabase } from '@/lib/supabase';

export function getSession() {
  return supabase.auth.getSession();
}

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Registra una cuenta nueva. El trigger handle_new_user (migración 0003)
 * crea el perfil con rol 'ciudadano' y toma el nombre de full_name.
 */
export function signUpWithEmail(email: string, password: string, nombre?: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: nombre ? { data: { full_name: nombre } } : undefined,
  });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}
