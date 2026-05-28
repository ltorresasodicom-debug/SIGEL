// SIGEL — Cliente Supabase tipado (capa de persistencia).
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Saneamos los valores: el error de pegado más común en Vercel es un espacio
// sobrante o un slash final en la URL, que rompe la conexión con `Failed to fetch`.
const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** `true` si las variables de entorno de Supabase están presentes. */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no definidas — ' +
      'la persistencia estará deshabilitada. Copia .env.example a .env.',
  );
}

/** Cliente Supabase. Si no hay credenciales, las llamadas fallarán de forma controlada. */
export const supabase = createClient<Database>(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-key-placeholder',
);
