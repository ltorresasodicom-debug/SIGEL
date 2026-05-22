// SIGEL — Servicio de autenticación (Supabase Auth).
import { supabase } from '@/lib/supabase';

export function getSession() {
  return supabase.auth.getSession();
}

export function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}
