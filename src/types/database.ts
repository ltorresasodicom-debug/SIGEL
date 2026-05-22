// SIGEL — Tipos de la base de datos Supabase.
// Inicial a mano; regenerable con `supabase gen types typescript`.
// Refleja supabase/migrations/0001_init.sql.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; nombre: string | null; rol: string; created_at: string };
        Insert: { id: string; nombre?: string | null; rol?: string };
        Update: { nombre?: string | null; rol?: string };
        Relationships: [];
      };
      gads: {
        Row: {
          id: string;
          tipo: string;
          nombre: string;
          provincia: string;
          canton: string | null;
          autoridad: string | null;
          partido: string | null;
        };
        Insert: {
          id: string;
          tipo: string;
          nombre: string;
          provincia: string;
          canton?: string | null;
          autoridad?: string | null;
          partido?: string | null;
        };
        Update: Partial<Database['public']['Tables']['gads']['Insert']>;
        Relationships: [];
      };
      evaluaciones: {
        Row: {
          id: string;
          gad_id: string;
          user_id: string | null;
          respuestas: Json;
          dims: Json;
          ingel: number;
          nivel: string;
          semaforo: string;
          iri: number;
          comentario: string | null;
          created_at: string;
        };
        Insert: {
          gad_id: string;
          user_id?: string | null;
          respuestas: Json;
          dims: Json;
          ingel: number;
          nivel: string;
          semaforo: string;
          iri: number;
          comentario?: string | null;
        };
        Update: Partial<Database['public']['Tables']['evaluaciones']['Insert']>;
        Relationships: [];
      };
      indicadores: {
        Row: { id: string; gad_id: string; fuente: string; anio: number; payload: Json };
        Insert: { gad_id: string; fuente: string; anio: number; payload: Json };
        Update: Partial<Database['public']['Tables']['indicadores']['Insert']>;
        Relationships: [];
      };
      ranking_snapshots: {
        Row: { id: string; fecha: string; gad_id: string; ingel: number; posicion: number };
        Insert: { fecha: string; gad_id: string; ingel: number; posicion: number };
        Update: Partial<Database['public']['Tables']['ranking_snapshots']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
