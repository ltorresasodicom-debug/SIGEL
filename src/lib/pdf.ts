// SIGEL — Exportación de evaluaciones a PDF institucional.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DIMENSIONES } from '@/evaluation-engine';
import type { EvaluacionGuardada } from '@/services/evaluaciones-local';
import type { Gad } from '@/types/sigel';

export function exportarEvaluacionPdf(ev: EvaluacionGuardada, gad: Gad | undefined): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 595, 120, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('SIGEL', 40, 58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Reporte de Evaluación Ciudadana', 40, 82);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(gad?.nombre ?? 'Gobierno local', 40, 165);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${gad?.provincia ?? ''} · ${new Date(ev.fecha).toLocaleString('es-EC')}`,
    40,
    184,
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    `INGEL ciudadano: ${ev.ingel.toFixed(1)}   ·   ${ev.nivel}   ·   IRI ${ev.iri.toFixed(1)}`,
    40,
    214,
  );

  autoTable(doc, {
    startY: 234,
    head: [['Dimensión', 'Puntaje 0–100']],
    body: DIMENSIONES.map((d) => [d.nombre, ev.dims[d.codigo].toFixed(1)]),
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] },
  });

  if (ev.comentario) {
    const finalY =
      (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 234;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(doc.splitTextToSize(`Comentario: ${ev.comentario}`, 515), 40, finalY + 28);
  }

  doc.save(`evaluacion-sigel-${slug(gad?.nombre ?? 'gad')}.pdf`);
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
