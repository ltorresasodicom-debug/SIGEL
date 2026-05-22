/** Códigos canónicos de las 8 dimensiones SIGEL. */
export type DimensionCodigo =
  | 'transparencia'
  | 'finanzas'
  | 'servicios'
  | 'desarrollo'
  | 'gestion_institucional'
  | 'participacion'
  | 'legitimidad'
  | 'innovacion';

/** Nivel de clasificación del puntaje INGEL. */
export type Nivel = 'EXCELENTE' | 'ALTO' | 'MEDIO' | 'BAJO' | 'CRITICO';

/** Semaforización del desempeño. */
export type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

/** Definición canónica de una dimensión (peso de scoring). */
export interface Dimension {
  codigo: DimensionCodigo;
  nombre: string;
  peso: number;
  color: string;
}

/** Puntajes 0–100 por dimensión, indexados por código. */
export type DimScores = Partial<Record<DimensionCodigo, number>>;

/** Una pregunta ciudadana de una dimensión. */
export interface PreguntaCiudadana {
  id: string;
  texto: string;
  helperText: string;
  tipoEscala: 'likert-1-5';
  peso: number;
}

/** Dimensión SIGEL en lenguaje ciudadano. */
export interface DimensionCiudadana {
  id: DimensionCodigo;
  dimension: string;
  tituloCiudadano: string;
  descripcionCorta: string;
  descripcionExpandida: string;
  ejemplo: string;
  interpretacionScore: { baja: string; alta: string };
  preguntas: PreguntaCiudadana[];
}
