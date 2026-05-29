// SIGEL — Servicio de ingesta y lectura de mediciones objetivas (motor real).
// Las mediciones son el dato objetivo por GAD que reemplaza los scores
// sintéticos: una fila por (gad, dimensión, indicador, fecha, fuente).
import { supabase } from '@/lib/supabase';
import type { DimensionCodigo } from '@/evaluation-engine/types';
import type { MedicionInsert, MedicionRow } from '@/types/domain';

/** Inserta una medición y devuelve la fila creada. */
export async function guardarMedicion(data: MedicionInsert): Promise<MedicionRow> {
  const { data: row, error } = await supabase
    .from('mediciones')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row;
}

/**
 * Ingesta idempotente por lote. Hace upsert sobre la clave natural
 * (gad_id, dimension, indicador, fecha, fuente) — re-ejecutar el ETL no duplica.
 */
export async function ingestarMediciones(filas: MedicionInsert[]): Promise<MedicionRow[]> {
  if (filas.length === 0) return [];
  const { data, error } = await supabase
    .from('mediciones')
    .upsert(filas, { onConflict: 'gad_id,dimension,indicador,fecha,fuente' })
    .select();
  if (error) throw error;
  return data ?? [];
}

/** Lista las mediciones de un GAD, de la más reciente a la más antigua. */
export async function listarMedicionesPorGad(gadId: string): Promise<MedicionRow[]> {
  const { data, error } = await supabase
    .from('mediciones')
    .select('*')
    .eq('gad_id', gadId)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Lista las mediciones de una dimensión en todos los GADs (para análisis comparado). */
export async function listarMedicionesPorDimension(
  dimension: DimensionCodigo,
): Promise<MedicionRow[]> {
  const { data, error } = await supabase
    .from('mediciones')
    .select('*')
    .eq('dimension', dimension)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
