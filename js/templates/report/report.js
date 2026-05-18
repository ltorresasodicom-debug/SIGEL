// =============================================================================
// SIGEL — Template del Reporte PDF de Evaluación
//
// Construye un documento institucional, profesional, legible. Estructura:
//   1. Portada
//   2. Resumen Ejecutivo
//   3. Metodología
//   4. Resultados (puntaje, tabla por dimensión, indicadores, observaciones)
//   5. Visualizaciones (barras horizontales)
//   6. Pie de página con paginación
//
// Diseñado para A4 vertical. Maneja saltos de página automáticamente vía
// jsPDF-autoTable. Tipografía Helvetica (built-in jsPDF, ligera).
// =============================================================================
import { DIMENSIONES } from '../../ingel.js';
import {
  formatDate, formatYear,
  colorForNivel, colorForSemaforo,
  identifyStrengthsAndWeaknesses, truncate,
} from '../../features/pdf/helpers.js';

const PAGE = { width: 595.28, height: 841.89 };  // A4 pts
const MARGIN = { top: 60, bottom: 60, left: 60, right: 60 };

const COLORS = {
  primary:   [30, 58, 138],   // sigel-primary
  secondary: [15, 118, 110],  // sigel-secondary
  accent:    [217, 119, 6],   // sigel-accent
  text:      [15, 23, 42],
  muted:     [100, 116, 139],
  lightBg:   [248, 250, 252],
  border:    [226, 232, 240],
};

/**
 * Punto de entrada del template. Recibe el doc jsPDF y agrega todas las
 * secciones del reporte. El doc se queda listo para `.save()`.
 */
export function buildReport(doc, evaluacion, gad) {
  setupDocument(doc, gad);
  renderCover(doc, evaluacion, gad);
  doc.addPage();
  renderExecutiveSummary(doc, evaluacion, gad);
  doc.addPage();
  renderMethodology(doc);
  doc.addPage();
  renderResults(doc, evaluacion, gad);
  // Pie de página en todas las páginas (incluyendo la portada)
  renderFooterAllPages(doc);
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración global del documento
// ─────────────────────────────────────────────────────────────────────────────
function setupDocument(doc, gad) {
  doc.setProperties({
    title: `Reporte de Evaluación — ${gad?.nombre || 'GAD'} — SIGEL Ecuador`,
    subject: 'Reporte de Evaluación de Gestión y Transparencia Municipal',
    author: 'SIGEL Ecuador',
    creator: 'SIGEL — Sistema Integral de Gestión y Evaluación Local',
    keywords: 'SIGEL, INGEL, evaluación, transparencia, gestión municipal, Ecuador',
  });
  doc.setLanguage('es-EC');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PORTADA
// ─────────────────────────────────────────────────────────────────────────────
function renderCover(doc, ev, gad) {
  // Banda superior institucional
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE.width, 180, 'F');

  // Logo simulado (escudo)
  doc.setFillColor(...COLORS.accent);
  doc.circle(PAGE.width / 2, 90, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('SIGEL', PAGE.width / 2, 99, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('SISTEMA INTEGRAL DE GESTIÓN Y EVALUACIÓN LOCAL', PAGE.width / 2, 150, {
    align: 'center', charSpace: 1,
  });
  doc.text('Ecuador', PAGE.width / 2, 165, { align: 'center', charSpace: 1 });

  // Cuerpo de portada
  let y = 260;
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titulo = 'Reporte de Evaluación de\nGestión y Transparencia Municipal';
  const titleLines = doc.splitTextToSize(titulo, PAGE.width - MARGIN.left * 2);
  doc.text(titleLines, PAGE.width / 2, y, { align: 'center' });
  y += titleLines.length * 24 + 25;

  // Caja con info principal
  const boxW = PAGE.width - MARGIN.left * 2;
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(MARGIN.left, y, boxW, 200, 6, 6, 'F');

  const labelStyle = () => { doc.setTextColor(...COLORS.muted); doc.setFontSize(9); doc.setFont('helvetica', 'bold'); };
  const valueStyle = () => { doc.setTextColor(...COLORS.text); doc.setFontSize(14); doc.setFont('helvetica', 'normal'); };

  let yy = y + 35;
  labelStyle(); doc.text('MUNICIPIO / GAD EVALUADO', MARGIN.left + 25, yy, { charSpace: 1.2 });
  valueStyle();
  const nombreGad = doc.splitTextToSize(gad?.nombre || 'GAD desconocido', boxW - 50);
  doc.text(nombreGad, MARGIN.left + 25, yy + 18);
  yy += 50 + (nombreGad.length - 1) * 14;

  labelStyle(); doc.text('AUTORIDAD EVALUADA', MARGIN.left + 25, yy, { charSpace: 1.2 });
  valueStyle(); doc.text(`${gad?.autoridad || '—'} (${gad?.cargo || '—'})`, MARGIN.left + 25, yy + 18);
  yy += 50;

  labelStyle(); doc.text('FECHA DE EVALUACIÓN', MARGIN.left + 25, yy, { charSpace: 1.2 });
  valueStyle(); doc.text(formatDate(ev.fecha, true), MARGIN.left + 25, yy + 18);
  yy += 45;

  labelStyle(); doc.text('AÑO DE EVALUACIÓN', MARGIN.left + 25, yy, { charSpace: 1.2 });
  valueStyle(); doc.text(String(formatYear(ev.fecha)), MARGIN.left + 25, yy + 18);

  // Marca INGEL al pie
  y = PAGE.height - 200;
  doc.setFillColor(...colorForNivel(ev.nivel));
  doc.roundedRect(MARGIN.left, y, boxW, 100, 6, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('PUNTAJE INGEL OBTENIDO', PAGE.width / 2, y + 22, { align: 'center', charSpace: 1.2 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.text((ev.ingel ?? 0).toFixed(1), PAGE.width / 2, y + 65, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Nivel: ${ev.nivel || '—'} · Semáforo: ${ev.semaforo || '—'}`,
    PAGE.width / 2, y + 88, { align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. RESUMEN EJECUTIVO
// ─────────────────────────────────────────────────────────────────────────────
function renderExecutiveSummary(doc, ev, gad) {
  let y = renderSectionTitle(doc, 'Resumen Ejecutivo', MARGIN.top);
  const { fortalezas, debilidades } = identifyStrengthsAndWeaknesses(ev.dims100 || {}, DIMENSIONES);
  const transparenciaScore = ev.dims100?.transparencia ?? 0;
  const participacionScore = ev.dims100?.participacion ?? 0;
  const legitimidadScore   = ev.dims100?.legitimidad ?? 0;

  // Párrafo introductorio
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);

  const intro =
    `El presente reporte presenta los resultados de la evaluación ciudadana ` +
    `realizada al ${gad?.nombre || 'GAD'} mediante el Índice Nacional de ` +
    `Gestión Local (INGEL), instrumento del Sistema Integral de Gestión y ` +
    `Evaluación Local (SIGEL). La evaluación abarca ocho dimensiones que ` +
    `miden, en conjunto, la calidad de la gestión pública territorial.`;
  y = writeParagraph(doc, intro, MARGIN.left, y, PAGE.width - MARGIN.left * 2);
  y += 14;

  // Cards: puntaje, nivel, cumplimiento, transparencia
  const cards = [
    { label: 'PUNTAJE GENERAL INGEL', value: (ev.ingel ?? 0).toFixed(1), color: COLORS.primary },
    { label: 'NIVEL ALCANZADO',       value: ev.nivel || '—',             color: colorForNivel(ev.nivel) },
    { label: 'CUMPLIMIENTO',          value: cumplimientoPct(ev.ingel),    color: COLORS.secondary },
    { label: 'ESTADO TRANSPARENCIA',  value: cualificarTransp(transparenciaScore), color: colorForSemaforo(ev.semaforo) },
  ];
  y = renderCardGrid(doc, cards, MARGIN.left, y);
  y += 8;

  // Fortalezas
  y = renderSubsection(doc, 'Principales fortalezas', y);
  for (const f of fortalezas) {
    y = renderBullet(doc, `${f.nombre}: ${f.score.toFixed(1)}/100 — ${cualifica(f.score)}.`, y);
  }
  y += 10;

  // Debilidades
  y = renderSubsection(doc, 'Principales debilidades', y);
  for (const d of debilidades) {
    y = renderBullet(doc, `${d.nombre}: ${d.score.toFixed(1)}/100 — ${cualifica(d.score)}.`, y);
  }
  y += 10;

  // Interpretación cualitativa
  y = renderSubsection(doc, 'Interpretación cualitativa', y);
  const interp =
    `Con un puntaje INGEL de ${(ev.ingel ?? 0).toFixed(1)}, este GAD se ` +
    `clasifica en el nivel ${ev.nivel || '—'}. La transparencia presenta un ` +
    `desempeño ${cualifica(transparenciaScore)}, la participación ciudadana ` +
    `se encuentra ${cualifica(participacionScore)} y la legitimidad pública ` +
    `es ${cualifica(legitimidadScore)}. ` +
    (ev.iri != null
      ? `El Índice de Riesgo Institucional asociado es de ${ev.iri.toFixed(1)} puntos, ` +
        `lo que sugiere un nivel de riesgo ${riesgoTexto(ev.iri)}.`
      : '');
  y = writeParagraph(doc, interp, MARGIN.left, y, PAGE.width - MARGIN.left * 2);

  if (ev.comentario) {
    y += 12;
    y = renderSubsection(doc, 'Observaciones del evaluador', y);
    doc.setFont('helvetica', 'italic');
    y = writeParagraph(doc, `"${ev.comentario}"`, MARGIN.left, y, PAGE.width - MARGIN.left * 2);
    doc.setFont('helvetica', 'normal');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. METODOLOGÍA (texto institucional, fijo)
// ─────────────────────────────────────────────────────────────────────────────
function renderMethodology(doc) {
  let y = renderSectionTitle(doc, 'Metodología SIGEL', MARGIN.top);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);

  const blocks = [
    {
      title: 'Marco conceptual',
      body:
        'El Sistema Integral de Gestión y Evaluación Local (SIGEL) se ' +
        'fundamenta en estándares internacionales de calidad institucional ' +
        'y gobierno abierto: la norma ISO 18091 sobre sistemas de gestión ' +
        'de calidad para gobiernos locales, la ISO 9001, el modelo ' +
        'Infoparticipa de transparencia y acceso a información pública, ' +
        'la Ley Orgánica de Transparencia y Acceso a la Información Pública ' +
        '(LOTAIP) y el ciclo de mejora continua PHVA (Planificar–Hacer–' +
        'Verificar–Actuar).',
    },
    {
      title: 'Propósito de la evaluación',
      body:
        'La evaluación no tiene un carácter sancionador, sino que constituye ' +
        'un instrumento de mejora continua de la gestión pública local. ' +
        'Su finalidad es fortalecer la transparencia, la rendición de ' +
        'cuentas, la legitimidad democrática y la calidad de los servicios ' +
        'que reciben las y los ciudadanos del Ecuador.',
    },
    {
      title: 'Cálculo del INGEL',
      body:
        'El Índice Nacional de Gestión Local (INGEL) es un índice compuesto ' +
        'que integra ocho dimensiones con ponderaciones específicas: ' +
        'Transparencia (20%), Gestión Financiera (15%), Servicios Públicos ' +
        '(20%), Desarrollo Territorial (10%), Gestión Institucional (10%), ' +
        'Participación Ciudadana (10%), Legitimidad y Confianza (10%) e ' +
        'Innovación Digital (5%). La fórmula es INGEL = Σ(Dimensión × ' +
        'Ponderación), aplicada sobre valores normalizados en escala 0–100. ' +
        'El cálculo combina además tres componentes: evaluación objetiva ' +
        '(60%), percepción ciudadana (25%) y análisis experto (15%).',
    },
    {
      title: 'Escala de evaluación',
      body:
        'Cada dimensión recibe una calificación ordinal del 1 al 5 según ' +
        'escala Likert: 1 (muy malo), 2 (malo), 3 (regular), 4 (bueno) y ' +
        '5 (muy bueno). El sistema normaliza estos valores a una escala ' +
        '0–100 mediante el método Min-Max, distinguiendo indicadores ' +
        'positivos (mayor valor = mejor desempeño) e indicadores negativos ' +
        '(mayor valor = peor desempeño, p. ej. el endeudamiento).',
    },
    {
      title: 'Clasificación de desempeño',
      body:
        'A partir del puntaje INGEL final se asigna un nivel: Excelente ' +
        '(90–100), Alto (75–89), Medio (60–74), Bajo (40–59) o Crítico ' +
        '(0–39), acompañado de una semaforización Verde / Amarillo / Rojo ' +
        'que facilita la comunicación pública del resultado.',
    },
  ];

  for (const b of blocks) {
    y = ensurePageSpace(doc, y, 80);
    y = renderSubsection(doc, b.title, y);
    y = writeParagraph(doc, b.body, MARGIN.left, y, PAGE.width - MARGIN.left * 2);
    y += 8;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RESULTADOS — puntaje destacado + tablas + gráfico de barras
// ─────────────────────────────────────────────────────────────────────────────
function renderResults(doc, ev, gad) {
  let y = renderSectionTitle(doc, 'Resultados de la Evaluación', MARGIN.top);

  // A. Puntaje destacado
  y = renderHighlightScore(doc, ev, y);
  y += 18;

  // B. Tabla por dimensión
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...COLORS.primary);
  doc.text('Resultados por dimensión', MARGIN.left, y);
  y += 8;
  const rows = DIMENSIONES.map(d => {
    const score = ev.dims100?.[d.codigo] ?? 0;
    return [
      d.nombre,
      `${(d.peso * 100).toFixed(0)}%`,
      score.toFixed(1),
      cualifica(score),
    ];
  });
  doc.autoTable({
    startY: y + 6,
    head: [['Dimensión', 'Peso', 'Puntaje (0–100)', 'Nivel']],
    body: rows,
    margin: { left: MARGIN.left, right: MARGIN.right },
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 7, textColor: COLORS.text },
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.lightBg },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 50 },
      2: { halign: 'right', cellWidth: 80 },
      3: { halign: 'center', cellWidth: 80 },
    },
  });
  y = doc.lastAutoTable.finalY + 18;

  // C. Indicadores Likert (la respuesta original del usuario)
  y = ensurePageSpace(doc, y, 220);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...COLORS.primary);
  doc.text('Indicadores evaluados (Likert 1–5)', MARGIN.left, y);
  y += 8;
  const indRows = DIMENSIONES.map(d => {
    const l = ev.likert?.[d.codigo];
    return [
      d.nombre,
      l != null ? `${l} / 5` : 's/d',
      l != null ? interpretarLikert(l) : '—',
      l != null && l >= 3 ? 'Sí' : 'No',
    ];
  });
  doc.autoTable({
    startY: y + 6,
    head: [['Indicador / Dimensión', 'Respuesta', 'Observación', 'Cumplimiento']],
    body: indRows,
    margin: { left: MARGIN.left, right: MARGIN.right },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6, textColor: COLORS.text },
    headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 180 },
      1: { halign: 'center', cellWidth: 60 },
      3: { halign: 'center', cellWidth: 80 },
    },
  });
  y = doc.lastAutoTable.finalY + 18;

  // D. Gráfico de barras horizontales por dimensión
  y = ensurePageSpace(doc, y, 320);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...COLORS.primary);
  doc.text('Perfil multidimensional', MARGIN.left, y);
  y += 10;
  y = renderBarChart(doc, ev.dims100 || {}, MARGIN.left, y);

  // E. Comentarios / observaciones
  if (ev.comentario) {
    y += 18;
    y = ensurePageSpace(doc, y, 120);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...COLORS.primary);
    doc.text('Observaciones del evaluador', MARGIN.left, y);
    y += 8;
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(MARGIN.left, y, PAGE.width - MARGIN.left * 2, 80, 4, 4, 'F');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(`"${ev.comentario}"`, PAGE.width - MARGIN.left * 2 - 30);
    doc.text(lines.slice(0, 6), MARGIN.left + 15, y + 22);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PIE DE PÁGINA en todas las páginas
// ─────────────────────────────────────────────────────────────────────────────
function renderFooterAllPages(doc) {
  const total = doc.internal.pages.length - 1;
  const generated = formatDate(new Date(), true);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    // Separador
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(MARGIN.left, PAGE.height - 35, PAGE.width - MARGIN.right, PAGE.height - 35);
    // Texto
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`SIGEL — Sistema Integral de Gestión y Evaluación Local · Generado ${generated}`,
      MARGIN.left, PAGE.height - 22);
    doc.text(`Página ${i} de ${total}`, PAGE.width - MARGIN.right, PAGE.height - 22, { align: 'right' });
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      'Documento generado automáticamente. Reproducción autorizada citando la fuente.',
      PAGE.width / 2, PAGE.height - 10, { align: 'center' }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVAS DE RENDERIZADO
// ─────────────────────────────────────────────────────────────────────────────
function renderSectionTitle(doc, title, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.primary);
  doc.text(title, MARGIN.left, y);
  doc.setDrawColor(...COLORS.accent);
  doc.setLineWidth(2);
  doc.line(MARGIN.left, y + 6, MARGIN.left + 45, y + 6);
  return y + 30;
}

function renderSubsection(doc, title, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.text);
  doc.text(title, MARGIN.left, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  return y + 16;
}

function renderBullet(doc, text, y) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.text);
  doc.setFillColor(...COLORS.accent);
  doc.circle(MARGIN.left + 4, y - 3, 1.8, 'F');
  const lines = doc.splitTextToSize(text, PAGE.width - MARGIN.left * 2 - 16);
  doc.text(lines, MARGIN.left + 14, y);
  return y + lines.length * 14;
}

function writeParagraph(doc, text, x, y, width) {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * 13;
}

function renderCardGrid(doc, cards, x, y) {
  const totalW = PAGE.width - MARGIN.left * 2;
  const gap = 10;
  const cardW = (totalW - gap * (cards.length - 1)) / cards.length;
  const cardH = 70;
  for (let i = 0; i < cards.length; i++) {
    const cx = x + i * (cardW + gap);
    const c = cards[i];
    doc.setFillColor(...c.color);
    doc.roundedRect(cx, y, cardW, cardH, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(c.label, cx + cardW / 2, y + 18, { align: 'center', charSpace: 0.8, maxWidth: cardW - 10 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(c.value.length > 8 ? 14 : 20);
    doc.text(String(c.value), cx + cardW / 2, y + 48, { align: 'center', maxWidth: cardW - 10 });
  }
  return y + cardH;
}

function renderHighlightScore(doc, ev, y) {
  const w = PAGE.width - MARGIN.left * 2;
  const h = 90;
  doc.setFillColor(...colorForNivel(ev.nivel));
  doc.roundedRect(MARGIN.left, y, w, h, 6, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('PUNTAJE GENERAL INGEL', MARGIN.left + 25, y + 25, { charSpace: 1.2 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.text((ev.ingel ?? 0).toFixed(1), MARGIN.left + 25, y + 70);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Nivel ${ev.nivel || '—'}`, MARGIN.left + 200, y + 50);
  doc.text(`Semáforo: ${ev.semaforo || '—'}`, MARGIN.left + 200, y + 65);
  if (ev.iri != null) doc.text(`IRI: ${ev.iri.toFixed(1)}`, MARGIN.left + 200, y + 80);

  return y + h;
}

/** Gráfico de barras horizontales rendereado con primitivas (sin imágenes). */
function renderBarChart(doc, dims100, x, y) {
  const labelW = 145;
  const barW = PAGE.width - MARGIN.left - MARGIN.right - labelW - 50;
  const barH = 12;
  const rowGap = 6;
  for (const d of DIMENSIONES) {
    const val = dims100[d.codigo] ?? 0;
    // Label
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...COLORS.text);
    const wrapped = doc.splitTextToSize(d.nombre, labelW);
    doc.text(wrapped[0], x, y + 9);
    // Track
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(x + labelW, y, barW, barH, 3, 3, 'F');
    // Fill
    const hexColor = hexToRgb(d.color);
    doc.setFillColor(...hexColor);
    doc.roundedRect(x + labelW, y, (barW * val) / 100, barH, 3, 3, 'F');
    // Value
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...COLORS.text);
    doc.text(val.toFixed(1), x + labelW + barW + 8, y + 9);
    y += barH + rowGap;
  }
  return y;
}

function ensurePageSpace(doc, y, neededHeight) {
  if (y + neededHeight > PAGE.height - MARGIN.bottom - 20) {
    doc.addPage();
    return MARGIN.top;
  }
  return y;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [148, 163, 184];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Cualificadores en lenguaje natural
// ─────────────────────────────────────────────────────────────────────────────
function cualifica(score) {
  if (score >= 90) return 'excelente';
  if (score >= 75) return 'alto';
  if (score >= 60) return 'medio';
  if (score >= 40) return 'bajo';
  return 'crítico';
}

function cualificarTransp(score) {
  if (score >= 75) return 'Sólido';
  if (score >= 50) return 'Parcial';
  return 'Deficiente';
}

function riesgoTexto(iri) {
  if (iri >= 70) return 'alto';
  if (iri >= 50) return 'moderado';
  if (iri >= 30) return 'medio';
  return 'bajo';
}

function cumplimientoPct(ingel) {
  if (ingel == null) return '—';
  return `${Math.round(ingel)}%`;
}

function interpretarLikert(n) {
  return ({ 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Muy bueno' })[n] || '—';
}
