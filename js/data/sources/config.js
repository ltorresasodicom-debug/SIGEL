// =============================================================================
// SIGEL — Registro de fuentes externas (config-driven)
//
// CAPA DESACOPLADA Y OPCIONAL. Está DESACTIVADA por defecto: no se hace ninguna
// petición de red hasta que registres aquí fuentes con `enabled: true`.
//
// No contiene datos: solo describe CÓMO consumir endpoints públicos estándar.
// Rellena `featureServer`/`resourceId` con los IDs reales que verifiques en:
//   - SIL (ArcGIS Hub): https://sistema-de-informacin-local-sil-gobiernoslocales.hub.arcgis.com/
//   - Datos Abiertos (CKAN): https://www.datosabiertos.gob.ec/
//
// Tipos soportados por los adaptadores (js/data/sources/adapters.js):
//   - 'arcgis' : ArcGIS Feature Service (contrato REST estándar /query?f=json)
//   - 'ckan'   : CKAN Action API (datastore_search)
//
// `fieldMap` mapea campos del dataset → modelo interno. `cantonField` /
// `provinciaField` se usan para cruzar con nuestros cantones por nombre
// normalizado (reutiliza utils/normalize + canton-aliases). `metrics` lista
// los campos numéricos/textuales a exponer en la ficha del GAD.
// =============================================================================

/**
 * @typedef {Object} ExternalSource
 * @property {string}  id           Identificador único interno (slug).
 * @property {string}  label        Nombre legible para la UI.
 * @property {'arcgis'|'ckan'} type Tipo de adaptador.
 * @property {boolean} enabled      Si está activa (default false).
 * @property {string}  [featureServer] (arcgis) URL base .../FeatureServer
 * @property {number}  [layer]      (arcgis) índice de capa (default 0).
 * @property {string}  [ckanBase]   (ckan) p.ej. https://www.datosabiertos.gob.ec
 * @property {string}  [resourceId] (ckan) resource_id del datastore.
 * @property {string}  cantonField  Campo con el nombre del cantón.
 * @property {string}  [provinciaField] Campo con la provincia (validación).
 * @property {string[]} metrics     Campos a exponer como indicadores.
 * @property {number}  [ttlHours]   TTL de caché (default 24h).
 */

/** @type {ExternalSource[]} */
export const SOURCES = [
  // ─── PLANTILLA ArcGIS / SIL (DESACTIVADA — completa y pon enabled:true) ────
  // {
  //   id: 'sil-cobertura',
  //   label: 'SIL · Gobiernos Locales',
  //   type: 'arcgis',
  //   enabled: false,
  //   featureServer: 'https://services.arcgis.com/<org>/arcgis/rest/services/<servicio>/FeatureServer',
  //   layer: 0,
  //   cantonField: 'CANTON',
  //   provinciaField: 'PROVINCIA',
  //   metrics: ['INDICADOR_1', 'INDICADOR_2'],
  //   ttlHours: 24,
  // },
  //
  // ─── PLANTILLA CKAN / datosabiertos.gob.ec (DESACTIVADA) ──────────────────
  // {
  //   id: 'datosabiertos-municipal',
  //   label: 'Datos Abiertos · Municipal',
  //   type: 'ckan',
  //   enabled: false,
  //   ckanBase: 'https://www.datosabiertos.gob.ec',
  //   resourceId: '<resource_id-del-datastore>',
  //   cantonField: 'canton',
  //   provinciaField: 'provincia',
  //   metrics: ['indicador'],
  //   ttlHours: 24,
  // },
];

/** ¿Hay al menos una fuente activa? Evita cualquier red si no la hay. */
export const EXTERNAL_SOURCES_ENABLED = SOURCES.some(s => s && s.enabled);
