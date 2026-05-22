// SIGEL — Paleta semántica de scoring (compartida por UI y mapa).
import type { Nivel, Semaforo } from '@/evaluation-engine/types';

export const NIVEL_STYLE: Record<Nivel, { bg: string; fg: string }> = {
  EXCELENTE: { bg: '#DCFCE7', fg: '#14532D' },
  ALTO: { bg: '#E7F6D5', fg: '#365314' },
  MEDIO: { bg: '#FEF3C7', fg: '#854D0E' },
  BAJO: { bg: '#FFEDD5', fg: '#9A3412' },
  CRITICO: { bg: '#FEE2E2', fg: '#991B1B' },
};

export const SEMAFORO_COLOR: Record<Semaforo, string> = {
  VERDE: '#16A34A',
  AMARILLO: '#F59E0B',
  ROJO: '#DC2626',
};

/** Color por umbral de puntaje INGEL (0–100). */
export function colorPorIngel(ingel: number): string {
  return ingel >= 70 ? '#16A34A' : ingel >= 50 ? '#F59E0B' : '#DC2626';
}
