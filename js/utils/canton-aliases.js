// =============================================================================
// SIGEL — Alias de cantones
//
// El dataset electoral (Excel) usa abreviaturas y nombres cortos que no
// coinciden literalmente con la nomenclatura oficial DPA del shapefile INEC.
// Esta tabla mapea el nombre del Excel (normalizado) → nombre oficial del
// GeoJSON (normalizado), para lograr ~100% de matching sin editar datos.
//
// Clave y valor se comparan con normalize() (sin tildes, minúsculas).
// =============================================================================
import { normalize } from './normalize.js';

const RAW_ALIASES = {
  // Excel (corto / abreviado)            → Oficial DPA (shapefile)
  'rio verde':                              'rioverde',
  'a baquerizo moreno':                     'alfredo baquerizo moreno',
  'crnl marcelino mariduenas':              'crnel. marcelino maridueña',
  'crnl marcelino maridueñas':              'crnel. marcelino maridueña',
  'el empalme':                             'empalme',
  'gral. a erizalde':                       'gnral. antonio elizalde',
  'gral a erizalde':                        'gnral. antonio elizalde',
  'fco. de orellana':                       'orellana',
  'fco de orellana':                        'orellana',
  'nobol/piedrahita':                       'nobol',
  'yahuachi':                               'san jacinto de yaguachi',
  'urcuqui':                                'san miguel de urcuqui',
  'pueblo viejo':                           'puebloviejo',
  'c.j. arosemena tola':                    'carlos julio arosemena tola',
  'cj arosemena tola':                      'carlos julio arosemena tola',
  'baños':                                  'baños de agua santa',
  'banos':                                  'baños de agua santa',
  'pelileo':                                'san pedro de pelileo',
  'pillaro':                                'santiago de pillaro',
  'yanzatza':                               'yantzaza',
  'joya de los sachas':                     'la joya de los sachas',
  'logroño':                                'logroño',
  'rumiñahui':                              'ruminahui',
};

// Pre-normaliza claves y valores para lookup O(1).
const ALIAS_MAP = new Map();
for (const [k, v] of Object.entries(RAW_ALIASES)) {
  ALIAS_MAP.set(normalize(k), normalize(v));
}

/**
 * Devuelve el nombre oficial normalizado para un cantón del Excel, aplicando
 * la tabla de alias. Si no hay alias, retorna el nombre normalizado tal cual.
 */
export function resolveCantonName(excelName) {
  const n = normalize(excelName);
  return ALIAS_MAP.get(n) || n;
}
