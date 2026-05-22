// =============================================================================
// SIGEL — Motor de scoring INGEL (capa pura, sin React ni Supabase)
//
// Portado de la versión vanilla (js/ingel.js). Funciones puras y testeables;
// implementa la fórmula metodológica del Índice Nacional de Gestión Local.
// =============================================================================
import type { Dimension, DimScores, Nivel, Semaforo } from './types';

/** Ponderaciones canónicas de las 8 dimensiones SIGEL — suman 1.0. */
export const DIMENSIONES: readonly Dimension[] = [
  { codigo: 'transparencia', nombre: 'Transparencia', peso: 0.2, color: '#0F766E' },
  { codigo: 'finanzas', nombre: 'Gestión financiera', peso: 0.15, color: '#1E40AF' },
  { codigo: 'servicios', nombre: 'Servicios públicos', peso: 0.2, color: '#9333EA' },
  { codigo: 'desarrollo', nombre: 'Desarrollo territorial', peso: 0.1, color: '#16A34A' },
  { codigo: 'gestion_institucional', nombre: 'Gestión institucional', peso: 0.1, color: '#EA580C' },
  { codigo: 'participacion', nombre: 'Participación ciudadana', peso: 0.1, color: '#DC2626' },
  { codigo: 'legitimidad', nombre: 'Legitimidad y confianza', peso: 0.1, color: '#7C3AED' },
  { codigo: 'innovacion', nombre: 'Innovación digital', peso: 0.05, color: '#0891B2' },
];

/** Combinación de componentes: 60% objetivo + 25% ciudadano + 15% experto. */
export const PESO_OBJETIVO = 0.6;
export const PESO_CIUDADANO = 0.25;
export const PESO_EXPERTO = 0.15;

/** Normalización Min-Max para indicadores de polaridad positiva. */
export function normalizePositive(value: number | null, vmin = 0, vmax = 100): number {
  if (value == null || vmax === vmin) return 0;
  return Math.max(0, Math.min(1, (value - vmin) / (vmax - vmin)));
}

/** Normalización Min-Max para indicadores de polaridad negativa. */
export function normalizeNegative(value: number | null, vmin = 0, vmax = 100): number {
  if (value == null || vmax === vmin) return 0;
  return Math.max(0, Math.min(1, (vmax - value) / (vmax - vmin)));
}

/** INGEL = Σ(Dimensión × Ponderación). `scores` en escala 0–100. */
export function calcularIngel(scores: DimScores): number {
  let total = 0;
  for (const dim of DIMENSIONES) total += (scores[dim.codigo] ?? 0) * dim.peso;
  return Math.round(total * 1000) / 1000;
}

/** Combina los componentes objetivo / ciudadano / experto. */
export function combinarComponentes(objetivo: number, ciudadano: number, experto: number): number {
  return (
    Math.round(
      (objetivo * PESO_OBJETIVO + ciudadano * PESO_CIUDADANO + experto * PESO_EXPERTO) * 1000,
    ) / 1000
  );
}

/** Clasifica un puntaje 0–100 en un nivel de desempeño. */
export function clasificarNivel(puntaje: number | null): Nivel | null {
  if (puntaje == null) return null;
  if (puntaje >= 90) return 'EXCELENTE';
  if (puntaje >= 75) return 'ALTO';
  if (puntaje >= 60) return 'MEDIO';
  if (puntaje >= 40) return 'BAJO';
  return 'CRITICO';
}

/** Semaforiza un puntaje 0–100. */
export function semaforizar(puntaje: number | null): Semaforo | null {
  if (puntaje == null) return null;
  if (puntaje >= 70) return 'VERDE';
  if (puntaje >= 50) return 'AMARILLO';
  return 'ROJO';
}

/** Parámetros del Índice de Riesgo Institucional (IRI). */
export interface IriInput {
  transparencia: number;
  finanzas: number;
  endeudamiento: number;
  corrupcion: number;
  participacion: number;
}

/** Índice de Riesgo Institucional (IRI) — 0–100, mayor = más riesgo. */
export function calcularIri(input: IriInput): number {
  const risk =
    (100 - input.transparencia) * 0.25 +
    (100 - input.finanzas) * 0.2 +
    Math.min(input.endeudamiento, 100) * 0.2 +
    input.corrupcion * 0.2 +
    (100 - input.participacion) * 0.15;
  return Math.round(Math.max(0, Math.min(100, risk)) * 100) / 100;
}

/** Convierte una respuesta Likert (1–5) a escala 0–100. */
export function likertA100(valorLikert: number | null): number {
  if (valorLikert == null) return 0;
  return ((valorLikert - 1) / 4) * 100;
}

/** Color de semáforo (para badges y mapas). */
export const COLOR_SEMAFORO: Record<Semaforo, string> = {
  VERDE: '#16A34A',
  AMARILLO: '#F59E0B',
  ROJO: '#DC2626',
};
