// SIGEL — Borrador de evaluación en curso (asistente ciudadano).
import { create } from 'zustand';

interface EvaluationDraftState {
  gadId: string;
  respuestas: Record<string, number>;
  comentario: string;
  setGad: (gadId: string) => void;
  setRespuesta: (preguntaId: string, valor: number) => void;
  setComentario: (texto: string) => void;
  reset: () => void;
}

export const useEvaluationDraftStore = create<EvaluationDraftState>((set) => ({
  gadId: '',
  respuestas: {},
  comentario: '',
  setGad: (gadId) => set({ gadId }),
  setRespuesta: (preguntaId, valor) =>
    set((s) => ({ respuestas: { ...s.respuestas, [preguntaId]: valor } })),
  setComentario: (comentario) => set({ comentario }),
  reset: () => set({ gadId: '', respuestas: {}, comentario: '' }),
}));
