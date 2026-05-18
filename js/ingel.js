// =============================================================================
// SIGEL — Motor de scoring INGEL (port a JavaScript del backend Python)
//
// Implementa fielmente la fórmula metodológica documentada en
// services/analytics/app/services/ingel.py — los tests unitarios del backend
// (49 verdes) cubren la misma lógica.
// =============================================================================

// Ponderaciones canónicas de las 8 dimensiones SIGEL — suman 1.0
export const DIMENSIONES = [
  { codigo: 'transparencia',          nombre: 'Transparencia',                peso: 0.20, color: '#0F766E' },
  { codigo: 'finanzas',               nombre: 'Gestión financiera',           peso: 0.15, color: '#1E40AF' },
  { codigo: 'servicios',              nombre: 'Servicios públicos',           peso: 0.20, color: '#9333EA' },
  { codigo: 'desarrollo',             nombre: 'Desarrollo territorial',       peso: 0.10, color: '#16A34A' },
  { codigo: 'gestion_institucional',  nombre: 'Gestión institucional',        peso: 0.10, color: '#EA580C' },
  { codigo: 'participacion',          nombre: 'Participación ciudadana',      peso: 0.10, color: '#DC2626' },
  { codigo: 'legitimidad',            nombre: 'Legitimidad y confianza',      peso: 0.10, color: '#7C3AED' },
  { codigo: 'innovacion',             nombre: 'Innovación digital',           peso: 0.05, color: '#0891B2' },
];

// Combinación de componentes: 60% objetivo + 25% ciudadano + 15% experto
export const PESO_OBJETIVO  = 0.60;
export const PESO_CIUDADANO = 0.25;
export const PESO_EXPERTO   = 0.15;

// ─────────────────────────────────────────────────────────────────────────────
// Normalización Min-Max
// ─────────────────────────────────────────────────────────────────────────────
export function normalizePositive(value, vmin = 0, vmax = 100) {
  if (value == null || vmax === vmin) return 0;
  return Math.max(0, Math.min(1, (value - vmin) / (vmax - vmin)));
}

export function normalizeNegative(value, vmin = 0, vmax = 100) {
  if (value == null || vmax === vmin) return 0;
  return Math.max(0, Math.min(1, (vmax - value) / (vmax - vmin)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Fórmula INGEL = Σ(Dimensión × Ponderación)
// ─────────────────────────────────────────────────────────────────────────────
export function calcularIngel(scores) {
  let total = 0;
  for (const dim of DIMENSIONES) {
    const v = scores[dim.codigo] ?? 0;
    total += v * dim.peso;
  }
  return Math.round(total * 1000) / 1000;
}

// Combina componentes objetivo / ciudadano / experto
export function combinarComponentes(objetivo, ciudadano, experto) {
  return Math.round(
    (objetivo * PESO_OBJETIVO + ciudadano * PESO_CIUDADANO + experto * PESO_EXPERTO) * 1000
  ) / 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clasificación y semaforización
// ─────────────────────────────────────────────────────────────────────────────
export function clasificarNivel(puntaje) {
  if (puntaje == null) return null;
  if (puntaje >= 90) return 'EXCELENTE';
  if (puntaje >= 75) return 'ALTO';
  if (puntaje >= 60) return 'MEDIO';
  if (puntaje >= 40) return 'BAJO';
  return 'CRITICO';
}

export function semaforizar(puntaje) {
  if (puntaje == null) return null;
  if (puntaje >= 70) return 'VERDE';
  if (puntaje >= 50) return 'AMARILLO';
  return 'ROJO';
}

// ─────────────────────────────────────────────────────────────────────────────
// Índice de Riesgo Institucional (IRI)
// ─────────────────────────────────────────────────────────────────────────────
export function calcularIri({ transparencia, finanzas, endeudamiento, corrupcion, participacion }) {
  const risk =
    (100 - (transparencia ?? 0)) * 0.25 +
    (100 - (finanzas ?? 0)) * 0.20 +
    Math.min(endeudamiento ?? 0, 100) * 0.20 +
    (corrupcion ?? 0) * 0.20 +
    (100 - (participacion ?? 0)) * 0.15;
  return Math.round(Math.max(0, Math.min(100, risk)) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convierte una respuesta Likert (1-5) a escala 0-100
// ─────────────────────────────────────────────────────────────────────────────
export function likertA100(valorLikert) {
  if (valorLikert == null) return 0;
  return ((valorLikert - 1) / 4) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapa de score → color semáforo (para Leaflet y badges)
// ─────────────────────────────────────────────────────────────────────────────
export const COLOR_SEMAFORO = {
  VERDE:    '#16A34A',
  AMARILLO: '#F59E0B',
  ROJO:     '#DC2626',
};
