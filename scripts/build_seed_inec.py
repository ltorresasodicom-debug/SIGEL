#!/usr/bin/env python3
"""Genera el seed SQL de mediciones reales INEC 2024 para public.mediciones.

Fuente: public/data/indicadores_inec_2024.json (producido por
scripts/build_indicadores_inec.py a partir de los CSV oficiales INEC).
Mapea canton_codigo (INEC/geojson) → cant-N (catálogo SIGEL en gads) usando
nombre normalizado contra public/data/electoral.json, mismo orden que
scripts/build_seed_mediciones.mjs.

Salida: supabase/seeds/0003_indicadores_reales_inec.sql.
Aplicar pegándolo en el SQL Editor del dashboard de Supabase.
Idempotente (ON CONFLICT DO NOTHING en la clave natural de mediciones).
"""
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_INEC = ROOT / "public" / "data" / "indicadores_inec_2024.json"
SRC_ELECTORAL = ROOT / "public" / "data" / "electoral.json"
OUT = ROOT / "supabase" / "seeds" / "0003_indicadores_reales_inec.sql"

FUENTE = "INEC GADM 2024"
FECHA = "2024-12-31"
UNIDAD = "índice 0–100"
DIMENSION = "servicios"  # GIRS y APA son servicios públicos por excelencia

# Indicadores compuestos por dataset. El subíndice `indice` agrega los binarios
# institucional + operacion según la metodología del ETL INEC; los detalles
# quedan en build_indicadores_inec.py para auditoría.
INDICADORES = [
    ("girs", "inec_girs_2024_indice"),
    ("apa", "inec_apa_2024_indice"),
]


def norm(s: str) -> str:
    """Normaliza para matchear nombres entre fuentes (igual a src/lib/normalize.ts)."""
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.lower().split())


# Alias electoral → nombre oficial DPA/INEC, espejo de src/lib/canton-aliases.ts.
# Cuando ambas fuentes evolucionen, mantener ambos archivos en sintonía.
RAW_ALIASES_ELECTORAL_A_INEC: dict[str, str] = {
    "rio verde": "rioverde",
    "a baquerizo moreno": "alfredo baquerizo moreno",
    "crnl marcelino mariduenas": "crnel. marcelino maridueña",
    "crnl marcelino maridueñas": "crnel. marcelino maridueña",
    "el empalme": "empalme",
    "gral. a erizalde": "gnral. antonio elizalde",
    "gral a erizalde": "gnral. antonio elizalde",
    "fco. de orellana": "orellana",
    "fco de orellana": "orellana",
    "nobol/piedrahita": "nobol",
    "yahuachi": "san jacinto de yaguachi",
    "urcuqui": "san miguel de urcuqui",
    "pueblo viejo": "puebloviejo",
    "c.j. arosemena tola": "carlos julio arosemena tola",
    "cj arosemena tola": "carlos julio arosemena tola",
    "baños": "baños de agua santa",
    "banos": "baños de agua santa",
    "pelileo": "san pedro de pelileo",
    "pillaro": "santiago de pillaro",
    "yanzatza": "yantzaza",
    "joya de los sachas": "la joya de los sachas",
    "rumiñahui": "ruminahui",
}
ALIAS_ELECTORAL_A_INEC = {norm(k): norm(v) for k, v in RAW_ALIASES_ELECTORAL_A_INEC.items()}


def nombre_oficial(electoral_name: str) -> str:
    """Replica resolveCantonName(): el alias del front lleva electoral → INEC."""
    n = norm(electoral_name)
    return ALIAS_ELECTORAL_A_INEC.get(n, n)


# Fixups específicos de esta fuente (INEC GADM 2024): el JSON usa formas DPA
# completas que no coinciden con la forma canónica del alias del front (que fue
# calibrado contra otra fuente INEC). Solo afectan a este ETL.
ALIAS_INEC_FUENTE = {
    norm(k): norm(v)
    for k, v in {
        "el empalme": "empalme",
        "coronel marcelino maridueña": "crnel. marcelino maridueña",
        "general antonio elizalde": "gnral. antonio elizalde",
    }.items()
}


def normalizar_nombre_inec(s: str) -> str:
    """Forma comparable: strip de paréntesis y aplicación de fixups de fuente."""
    n = norm(s)
    # quita sufijos entre paréntesis ("YANTZAZA (YANZATZA)" → "yantzaza")
    if "(" in n:
        n = n.split("(", 1)[0].strip()
    return ALIAS_INEC_FUENTE.get(n, n)


def sql_str(v) -> str:
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


electoral = json.loads(SRC_ELECTORAL.read_text(encoding="utf-8"))
inec = json.loads(SRC_INEC.read_text(encoding="utf-8"))

# nombre oficial INEC (post-alias) → cant-N. Mismo orden de cant-N que
# build_seed_mediciones.mjs (índice de aparición en electoral.json).
idx_por_canton: dict[str, int] = {}
for idx, c in enumerate(electoral["cantones"]):
    idx_por_canton.setdefault(nombre_oficial(c["canton"]), idx)

rows: list[str] = []
no_encontrados: list[tuple[str, str]] = []
sin_valor: list[tuple[str, str, str]] = []

for code, payload in sorted(inec["byCode"].items()):
    nombre_inec = payload.get("canton", "")
    idx = idx_por_canton.get(normalizar_nombre_inec(nombre_inec))
    if idx is None:
        no_encontrados.append((code, nombre_inec))
        continue
    gad_id = f"cant-{idx}"
    for dataset, indicador in INDICADORES:
        info = payload.get(dataset) or {}
        valor = info.get("indice")
        if valor is None:
            sin_valor.append((code, nombre_inec, dataset))
            continue
        valor_r = round(float(valor) * 100) / 100
        rows.append(
            "  ("
            f"{sql_str(gad_id)}, "
            f"{sql_str(DIMENSION)}, "
            f"{sql_str(indicador)}, "
            f"{valor_r}, "
            f"{sql_str(UNIDAD)}, "
            f"{valor_r}, "
            f"{sql_str(FUENTE)}, "
            f"DATE {sql_str(FECHA)}"
            ")"
        )

if not rows:
    print("No se generó ninguna fila — revisa los archivos fuente.", file=sys.stderr)
    sys.exit(1)

OUT.parent.mkdir(parents=True, exist_ok=True)
header = (
    "-- =============================================================================\n"
    "-- SIGEL — Mediciones reales INEC GADM 2024 (GIRS + APA)\n"
    f"-- Generado por scripts/build_seed_inec.py · {len(rows)} mediciones\n"
    f"-- Fuente: {FUENTE}  ·  Fecha observación: {FECHA}\n"
    "-- Dimensión SIGEL: servicios.  Escala: índice 0–100.\n"
    "-- Idempotente: ON CONFLICT DO NOTHING sobre la clave natural.\n"
    "-- Requiere migraciones 0001_init.sql y 0002_motor_real.sql ya aplicadas\n"
    "-- y el seed 0001_demo.sql aplicado (para tener las filas de gads).\n"
    "-- =============================================================================\n"
    "\n"
    "begin;\n"
    "\n"
    "insert into public.mediciones "
    "(gad_id, dimension, indicador, valor, unidad, valor_norm, fuente, fecha) values\n"
)
footer = (
    "\non conflict (gad_id, dimension, indicador, fecha, fuente) do nothing;\n"
    "\ncommit;\n"
)
OUT.write_text(header + ",\n".join(rows) + footer, encoding="utf-8")

print(f"✓ {OUT.relative_to(ROOT)}  ·  {len(rows)} mediciones reales")
if no_encontrados:
    print(
        f"  · {len(no_encontrados)} cantones INEC sin match en electoral.json (revisar):",
        file=sys.stderr,
    )
    for code, nombre in no_encontrados[:10]:
        print(f"    [{code}] {nombre}", file=sys.stderr)
    if len(no_encontrados) > 10:
        print(f"    … ({len(no_encontrados) - 10} más)", file=sys.stderr)
if sin_valor:
    print(f"  · {len(sin_valor)} (cantón, dataset) sin valor", file=sys.stderr)
