#!/usr/bin/env python3
"""Genera el seed SQL de mediciones reales INEC 2024 → dimensión `finanzas`.

Fuente: data/sources/inec_girs_2024.csv (CSV oficial INEC GADM 2024, GIRS).
Indicador compuesto `inec_girs_2024_sostenibilidad_financiera` (0–100):
media de tres banderas binarias del módulo financiero del servicio de
residuos, recodificadas a 0/100 (misma metodología que el índice GIRS/APA
de build_indicadores_inec.py):

  - MSF      = 1  → el servicio es financieramente sostenible      (+)
  - SUBSIDIO = 0  → no requiere subsidio municipal para operar     (+)
  - RDES     = 1  → la recaudación se destina al servicio          (+)

score = media(componentes) ∈ {0, 33.33, 66.67, 100}.
Notas de alcance: proxy de salud financiera acotado al servicio GIRS; no
mide ejecución presupuestaria global (eSIGEF/DPE) ni calidad del gasto
(Contraloría). Primer dato real en `finanzas` hasta ingestar esas fuentes.

Salida: supabase/seeds/0004_finanzas_reales_inec.sql (idempotente).
Aplicar pegándolo en el SQL Editor del dashboard de Supabase.

TODO(_inec_common): el mapeo nombre→cant-N está duplicado con
build_seed_inec.py; extraer a scripts/_inec_common.py en la próxima fuente.
"""
import csv
import sys
import unicodedata
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_CSV = ROOT / "data" / "sources" / "inec_girs_2024.csv"
SRC_ELECTORAL = ROOT / "public" / "data" / "electoral.json"
OUT = ROOT / "supabase" / "seeds" / "0004_finanzas_reales_inec.sql"

FUENTE = "INEC GADM 2024"
FECHA = "2024-12-31"
UNIDAD = "índice 0–100"
DIMENSION = "finanzas"
INDICADOR = "inec_girs_2024_sostenibilidad_financiera"


def norm(s: str) -> str:
    """Normaliza para matchear nombres entre fuentes (igual a src/lib/normalize.ts)."""
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.lower().split())


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

ALIAS_INEC_FUENTE = {
    norm(k): norm(v)
    for k, v in {
        "el empalme": "empalme",
        "coronel marcelino maridueña": "crnel. marcelino maridueña",
        "general antonio elizalde": "gnral. antonio elizalde",
    }.items()
}


def nombre_oficial(electoral_name: str) -> str:
    n = norm(electoral_name)
    return ALIAS_ELECTORAL_A_INEC.get(n, n)


def normalizar_nombre_inec(s: str) -> str:
    n = norm(s)
    if "(" in n:
        n = n.split("(", 1)[0].strip()
    return ALIAS_INEC_FUENTE.get(n, n)


def sql_str(v) -> str:
    if v is None or v == "":
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def flag(valor: str) -> int | None:
    """'0'/'1' → int; cualquier otra cosa (vacío, código raro) → None."""
    v = (valor or "").strip()
    if v in ("0", "1"):
        return int(v)
    return None


electoral = json.loads(SRC_ELECTORAL.read_text(encoding="utf-8"))
idx_por_canton: dict[str, int] = {}
for idx, c in enumerate(electoral["cantones"]):
    idx_por_canton.setdefault(nombre_oficial(c["canton"]), idx)

with SRC_CSV.open(encoding="latin-1", newline="") as f:
    filas_csv = list(csv.DictReader(f, delimiter=";"))

name_col = next(c for c in filas_csv[0] if "Nombre" in c)

rows: list[str] = []
no_encontrados: list[str] = []
sin_datos: list[str] = []

for r in filas_csv:
    nombre = (r.get(name_col) or "").strip()
    idx = idx_por_canton.get(normalizar_nombre_inec(nombre))
    if idx is None:
        no_encontrados.append(nombre)
        continue
    msf = flag(r.get("MSF"))
    subsidio = flag(r.get("SUBSIDIO"))
    rdes = flag(r.get("RDES"))
    componentes = [
        100 * c
        for c in (
            msf,
            None if subsidio is None else 1 - subsidio,  # 0 = sin subsidio → 100
            rdes,
        )
        if c is not None
    ]
    if not componentes:
        sin_datos.append(nombre)
        continue
    score = round(sum(componentes) / len(componentes) * 100) / 100
    gad_id = f"cant-{idx}"
    rows.append(
        "  ("
        f"{sql_str(gad_id)}, "
        f"{sql_str(DIMENSION)}, "
        f"{sql_str(INDICADOR)}, "
        f"{score}, "
        f"{sql_str(UNIDAD)}, "
        f"{score}, "
        f"{sql_str(FUENTE)}, "
        f"DATE {sql_str(FECHA)}"
        ")"
    )

if not rows:
    print("No se generó ninguna fila — revisa los archivos fuente.", file=sys.stderr)
    sys.exit(1)

header = (
    "-- =============================================================================\n"
    "-- SIGEL — Mediciones reales INEC GADM 2024 → dimensión finanzas\n"
    f"-- Generado por scripts/build_seed_inec_finanzas.py · {len(rows)} mediciones\n"
    f"-- Fuente: {FUENTE}  ·  Fecha observación: {FECHA}\n"
    f"-- Indicador: {INDICADOR} (0–100)\n"
    "-- Metodología: media de banderas binarias del módulo financiero GIRS\n"
    "--   MSF=1 (servicio financieramente sostenible) · SUBSIDIO=0 (opera sin\n"
    "--   subsidio municipal) · RDES=1 (recaudación destinada al servicio).\n"
    "-- Idempotente: ON CONFLICT DO NOTHING sobre la clave natural.\n"
    "-- Requiere 0001_init.sql + 0002_motor_real.sql y el seed 0001_demo.sql.\n"
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
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(header + ",\n".join(rows) + footer, encoding="utf-8")

print(f"✓ {OUT.relative_to(ROOT)}  ·  {len(rows)} mediciones reales (finanzas)")
if no_encontrados:
    print(f"  · {len(no_encontrados)} cantones sin match: {no_encontrados[:8]}", file=sys.stderr)
if sin_datos:
    print(f"  · {len(sin_datos)} cantones sin banderas válidas", file=sys.stderr)
