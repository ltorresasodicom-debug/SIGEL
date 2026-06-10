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
 *
 * `emailRedirectTo` apunta al origen actual de la app: así el link de
 * confirmación lleva de vuelta al dominio correcto en dev y en prod,
 * sin depender del "Site URL" global del dashboard de Supabase. El
 * dominio debe estar añadido a Authentication → URL Configuration →
 * Redirect URLs en el panel de Supabase.
 */
export function signUpWithEmail(email: string, password: string, nombre?: string) {
  const emailRedirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
  const data = nombre ? { full_name: nombre } : undefined;
  return supabase.auth.signUp({
    email,
    password,
    options: { data, emailRedirectTo },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}
