#!/usr/bin/env node
// =============================================================================
// SIGEL — Generador del seed `mediciones` (motor real)
//
// Lee public/data/electoral.json y produce supabase/seeds/0001_demo.sql con:
//   1) INSERT de los 244 GADs (prov-N / cant-N, mismos IDs que la app en
//      memoria) — necesario para satisfacer la FK mediciones.gad_id → gads.id.
//   2) INSERT de 8 mediciones por GAD (una por dimensión canónica) con valores
//      sintéticos deterministas (hash FNV-1a) en escala 0–100.
//
// Ambos INSERTs usan ON CONFLICT DO NOTHING → idempotente.
// Re-ejecutar el script regenera el mismo SQL bit a bit (sin dependencias).
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SRC = path.join(ROOT, 'public/data/electoral.json');
const OUT = path.join(ROOT, 'supabase/seeds/0001_demo.sql');

const DIMENSIONES = [
  'transparencia',
  'finanzas',
  'servicios',
  'desarrollo',
  'gestion_institucional',
  'participacion',
  'legitimidad',
  'innovacion',
];

const FUENTE = 'SIGEL demo v1';
const FECHA = '2024-12-01';
const UNIDAD = 'índice 0–100';

// FNV-1a 32-bit — equivalente al hashStr() del motor en memoria.
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Score determinista en [25.00, 95.00] dependiente de (seedKey, dimensión).
function syntheticScore(seedKey, dimIdx) {
  const h = hashStr(`${seedKey}::dim${dimIdx}`);
  const raw = (h % 7000) / 100; // 0 – 69.99
  return Math.round((25 + raw) * 100) / 100;
}

// Escape de string para literal SQL (single-quoted).
function sql(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

const data = JSON.parse(fs.readFileSync(SRC, 'utf-8'));

const gadsRows = [];
const medRows = [];

function addGad(id, tipo, nombre, provincia, canton, autoridad, partido, seedKey) {
  gadsRows.push(
    `  (${sql(id)}, ${sql(tipo)}, ${sql(nombre)}, ${sql(provincia)}, ` +
      `${sql(canton)}, ${sql(autoridad)}, ${sql(partido)})`,
  );
  DIMENSIONES.forEach((dim, i) => {
    const valor = syntheticScore(seedKey, i);
    medRows.push(
      `  (${sql(id)}, ${sql(dim)}, ${sql(`demo_v1_${dim}`)}, ${valor}, ${sql(UNIDAD)}, ` +
        `${valor}, ${sql(FUENTE)}, DATE ${sql(FECHA)})`,
    );
  });
}

data.provincias.forEach((p, idx) => {
  addGad(
    `prov-${idx}`,
    'PROVINCIAL',
    `Gobierno Provincial de ${p.provincia}`,
    p.provincia,
    null,
    p.prefecto,
    p.partido,
    `prov:${p.provincia}`,
  );
});

data.cantones.forEach((c, idx) => {
  addGad(
    `cant-${idx}`,
    'MUNICIPAL',
    `GAD Municipal de ${c.canton}`,
    c.provincia,
    c.canton,
    c.alcalde,
    c.partido,
    `cant:${c.provincia}:${c.canton}`,
  );
});

const header = `-- =============================================================================
-- SIGEL — Seed demo de mediciones (generado por scripts/build_seed_mediciones.mjs)
-- ${gadsRows.length} GADs · ${medRows.length} mediciones (${DIMENSIONES.length} dimensiones × GAD)
-- Fuente: ${FUENTE}  ·  Fecha observación: ${FECHA}
-- Idempotente: ON CONFLICT DO NOTHING. Re-aplicar no duplica.
-- Requiere migraciones 0001_init.sql y 0002_motor_real.sql ya aplicadas.
-- Aplicar pegándolo en el SQL Editor del dashboard de Supabase.
-- =============================================================================

begin;

-- 1) Catálogo mínimo de GADs (FK destino de mediciones).
insert into public.gads (id, tipo, nombre, provincia, canton, autoridad, partido) values
`;

const middle = `
on conflict (id) do nothing;

-- 2) Mediciones objetivas: una por dimensión por GAD (valores sintéticos demo).
insert into public.mediciones (gad_id, dimension, indicador, valor, unidad, valor_norm, fuente, fecha) values
`;

const footer = `
on conflict (gad_id, dimension, indicador, fecha, fuente) do nothing;

commit;
`;

const sqlOut = header + gadsRows.join(',\n') + middle + medRows.join(',\n') + footer;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, sqlOut, 'utf-8');

console.log(
  `✓ ${path.relative(ROOT, OUT)}  ·  ${gadsRows.length} GADs  ·  ${medRows.length} mediciones`,
);
