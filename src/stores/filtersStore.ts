// SIGEL — Estado global de filtros (ranking, mapa, dashboards).
import { create } from 'zustand';
import type { TipoGad } from '@/types/domain';

interface FiltersState {
  q: string;
  tipoGad: TipoGad | 'TODOS';
  provincia: string;
  setQ: (q: string) => void;
  setTipoGad: (tipoGad: TipoGad | 'TODOS') => void;
  setProvincia: (provincia: string) => void;
  reset: () => void;
}

const INICIAL = { q: '', tipoGad: 'TODOS' as const, provincia: 'TODAS' };

export const useFiltersStore = create<FiltersState>((set) => ({
  ...INICIAL,
  setQ: (q) => set({ q }),
  setTipoGad: (tipoGad) => set({ tipoGad }),
  setProvincia: (provincia) => set({ provincia }),
  reset: () => set({ ...INICIAL }),
}));
