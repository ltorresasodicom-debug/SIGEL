// SIGEL — Alias de cantones: mapea nombres del dataset electoral al nombre
// oficial DPA (geojson INEC), normalizados, para lograr ~100% de matching.
import { normalize } from './normalize';

const RAW_ALIASES: Record<string, string> = {
  'rio verde': 'rioverde',
  'a baquerizo moreno': 'alfredo baquerizo moreno',
  'crnl marcelino mariduenas': 'crnel. marcelino maridueña',
  'crnl marcelino maridueñas': 'crnel. marcelino maridueña',
  'el empalme': 'empalme',
  'gral. a erizalde': 'gnral. antonio elizalde',
  'gral a erizalde': 'gnral. antonio elizalde',
  'fco. de orellana': 'orellana',
  'fco de orellana': 'orellana',
  'nobol/piedrahita': 'nobol',
  yahuachi: 'san jacinto de yaguachi',
  urcuqui: 'san miguel de urcuqui',
  'pueblo viejo': 'puebloviejo',
  'c.j. arosemena tola': 'carlos julio arosemena tola',
  'cj arosemena tola': 'carlos julio arosemena tola',
  baños: 'baños de agua santa',
  banos: 'baños de agua santa',
  pelileo: 'san pedro de pelileo',
  pillaro: 'santiago de pillaro',
  yanzatza: 'yantzaza',
  'joya de los sachas': 'la joya de los sachas',
  rumiñahui: 'ruminahui',
};

const ALIAS_MAP = new Map<string, string>();
for (const [k, v] of Object.entries(RAW_ALIASES)) ALIAS_MAP.set(normalize(k), normalize(v));

/** Nombre oficial normalizado de un cantón (aplica la tabla de alias). */
export function resolveCantonName(excelName: string): string {
  const n = normalize(excelName);
  return ALIAS_MAP.get(n) ?? n;
}
