// =============================================================================
// SIGEL — Persistencia local de evaluaciones ciudadanas (localStorage)
//
// Mantiene la clave `sigel.evaluaciones.v1` para conservar las evaluaciones
// previas. La persistencia en Supabase está disponible en services/supabase y
// se activará cuando el proyecto Supabase esté configurado.
// =============================================================================
import type { Nivel, Semaforo } from '@/evaluation-engine/types';
import type { DimScoreMap } from '@/types/sigel';

const LS_KEY = 'sigel.evaluaciones.v1';

export interface EvaluacionGuardada {
  id: string;
  fecha: string;
  gadId: string;
  respuestas: Record<string, number>;
  dims: DimScoreMap;
  ingel: number;
  nivel: Nivel;
  semaforo: Semaforo;
  iri: number;
  comentario: string;
}

export type EvaluacionNueva = Omit<EvaluacionGuardada, 'id' | 'fecha'>;

export function obtenerEvaluaciones(): EvaluacionGuardada[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as EvaluacionGuardada[];
  } catch {
    return [];
  }
}

export function guardarEvaluacionLocal(data: EvaluacionNueva): EvaluacionGuardada {
  const todas = obtenerEvaluaciones();
  const nueva: EvaluacionGuardada = {
    ...data,
    id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fecha: new Date().toISOString(),
  };
  todas.push(nueva);
  localStorage.setItem(LS_KEY, JSON.stringify(todas));
  return nueva;
}

export function borrarEvaluacionLocal(id: string): void {
  const restantes = obtenerEvaluaciones().filter((e) => e.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(restantes));
}
