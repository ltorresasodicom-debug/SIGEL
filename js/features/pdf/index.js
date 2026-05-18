// =============================================================================
// SIGEL — Generación de PDF institucional
//
// Punto de entrada del feature de exportación PDF. Carga jsPDF + autoTable
// lazy (sólo cuando el usuario hace clic en exportar) para no penalizar el
// tiempo de carga inicial del sitio. Delega el armado del documento al
// template `report.js`.
//
// Separación de responsabilidades:
//   - index.js   ← API pública + carga de dependencias
//   - report.js  ← Template / layout del reporte
//   - helpers.js ← Utilidades de formato (números, fechas, slugs)
// =============================================================================

import { buildReport } from '../../templates/report/report.js';
import { fileNameFor } from './helpers.js';

let _libsPromise = null;

/**
 * Carga jsPDF (UMD) + autoTable (UMD) desde CDN una sola vez.
 * Devuelve la referencia global `window.jspdf.jsPDF`.
 */
function loadPdfLibs() {
  if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) {
    return Promise.resolve(window.jspdf);
  }
  if (_libsPromise) return _libsPromise;
  _libsPromise = (async () => {
    await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js');
    return window.jspdf;
  })();
  return _libsPromise;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Genera y descarga un PDF para una evaluación ciudadana.
 *
 * @param {object} evaluacion   - registro de localStorage
 * @param {object} gad          - GAD asociado (puede ser null si fue borrado)
 * @param {function} [onProgress] - callback opcional (mensaje, pct 0-100)
 */
export async function exportarEvaluacionPdf(evaluacion, gad, onProgress = () => {}) {
  onProgress('Cargando generador PDF…', 10);
  const { jsPDF } = await loadPdfLibs();

  onProgress('Componiendo documento…', 40);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  buildReport(doc, evaluacion, gad);

  onProgress('Guardando archivo…', 90);
  const filename = fileNameFor(gad, evaluacion);
  doc.save(filename);

  onProgress('PDF generado correctamente', 100);
  return filename;
}
