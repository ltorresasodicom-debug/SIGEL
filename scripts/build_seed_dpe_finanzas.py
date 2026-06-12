#!/usr/bin/env python3
"""Genera supabase/seeds/0005_dpe_finanzas_reales.sql desde los CSV de
Numeral 6 cacheados en data/sources/dpe_csv/.

Indicador: dpe_lotaip6_<año>_ejecucion_presupuestaria
  valor = sum(Devengado de hojas) / sum(Asignado de hojas) * 100

"Hoja" = cuenta del clasificador presupuestario que no es prefijo de
ninguna otra cuenta del mismo archivo. Sumar solo hojas evita el doble
conteo cuando el archivo reporta agregados jerárquicos (p.ej. cant-50
trae `5` totalizando `51`/`53`/... y `51` totalizando `51.01`/...);
en archivos sin jerarquía (cant-1: solo `5.1`/`7.3`/...) toda fila es
hoja y se suma directo. La normalización quita los puntos del código
para que `5.1` y `51` se comparen correctamente.

Los CSVs vienen en dos formatos heterogéneos del mismo servicio:
  - latin-1, separador de miles `,`, decimal `.` (cant-1)
  - utf-8 con BOM, separador de miles `.`, decimal `,`        (cant-50)
Ambos se autodetectan por archivo.

Uso:
  python scripts/build_seed_dpe_finanzas.py [--year 2024] [--month 12]
"""
import argparse
import calendar
import csv
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_DIR = ROOT / "data" / "sources" / "dpe_csv"
OUT = ROOT / "supabase" / "seeds" / "0005_dpe_finanzas_reales.sql"

DIMENSION = "finanzas"
UNIDAD = "porcentaje"
FUENTE = "DPE LOTAIP Numeral 6"


def norm_header(s: str) -> str:
    s = unicodedata.normalize("NFD", s.strip().lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def leer_texto(path: Path) -> str:
    """Lee el CSV resolviendo BOM y autodetectando UTF-8 vs latin-1."""
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw[3:].decode("utf-8")
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1")


def detectar_formato_decimal(texto: str) -> str:
    """'coma' si el archivo usa `1.234,56`; 'punto' si usa `1,234.56`.

    Heurística robusta: cuenta ocurrencias de los dos patrones miles+decimal
    completos; si solo aparece uno, gana; si aparecen ambos (raro), gana el
    mayoritario; si ninguno, fallback al patrón corto `,XX` al final de un
    número (típico cuando los valores son pequeños y no usan miles).
    """
    coma = len(re.findall(r"\d\.\d{3},\d{2}", texto))
    punto = len(re.findall(r"\d,\d{3}\.\d{2}", texto))
    if coma > punto:
        return "coma"
    if punto > coma:
        return "punto"
    if re.search(r"\d,\d{2}(?:\D|$)", texto):
        return "coma"
    return "punto"


def parse_numero(s: str, formato: str) -> float | None:
    s = (s or "").strip()
    if not s or s in ("-", "—", "--"):
        return 0.0
    negativo = s.startswith("-")
    if negativo:
        s = s[1:].strip()
    if formato == "coma":
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", "")
    try:
        v = float(s)
        return -v if negativo else v
    except ValueError:
        return None


def procesar_csv(path: Path) -> tuple[float, float, int] | None:
    """Devuelve (asignado_total, devengado_total, n_hojas) o None."""
    texto = leer_texto(path)
    formato = detectar_formato_decimal(texto)

    reader = csv.reader(texto.splitlines(), delimiter=";")
    try:
        cabeceras = [norm_header(h) for h in next(reader)]
    except StopIteration:
        return None
    try:
        i_cuenta = cabeceras.index("cuenta")
        i_asig = cabeceras.index("asignado")
        i_dev = cabeceras.index("devengado")
    except ValueError:
        return None

    filas: list[tuple[str, str, str]] = []
    for row in reader:
        if len(row) <= max(i_cuenta, i_asig, i_dev):
            continue
        cuenta = row[i_cuenta].strip()
        if not cuenta:
            continue
        codigo = cuenta.replace(".", "")
        if not codigo or not codigo[0].isdigit():
            continue
        filas.append((codigo, row[i_asig], row[i_dev]))

    if not filas:
        return None

    # Hoja = código que no es prefijo de ningún otro código distinto presente.
    # Las repeticiones del mismo código (cant-1 tiene `5.1` varias veces, una
    # por sección del clasificador: corriente, producción, inversión...) son
    # partidas legítimamente distintas y se mantienen en la suma.
    codigos_unicos = set(c for c, _, _ in filas)
    hojas = {
        c for c in codigos_unicos
        if not any(otro != c and otro.startswith(c) for otro in codigos_unicos)
    }

    asig_total = 0.0
    dev_total = 0.0
    n_sumadas = 0
    for codigo, asig_s, dev_s in filas:
        if codigo not in hojas:
            continue
        a = parse_numero(asig_s, formato)
        d = parse_numero(dev_s, formato)
        if a is None or d is None:
            continue
        asig_total += a
        dev_total += d
        n_sumadas += 1
    return asig_total, dev_total, n_sumadas


def sql_str(v: str) -> str:
    return "'" + v.replace("'", "''") + "'"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--year", type=int, default=2024)
    ap.add_argument("--month", type=int, default=12)
    args = ap.parse_args()

    fecha = f"{args.year}-{args.month:02d}-{calendar.monthrange(args.year, args.month)[1]:02d}"
    indicador = f"dpe_lotaip6_{args.year}_ejecucion_presupuestaria"

    archivos = sorted(
        CSV_DIR.glob(f"cant-*_{args.year}_{args.month:02d}.csv"),
        key=lambda p: int(re.match(r"cant-(\d+)_", p.name).group(1)),
    )
    if not archivos:
        print(
            f"No hay CSVs para {args.year}-{args.month:02d} en {CSV_DIR.relative_to(ROOT)}/. "
            f"Corre primero: python scripts/fetch_dpe.py csv --year {args.year} --month {args.month}",
            file=sys.stderr,
        )
        return 1

    rows: list[str] = []
    sin_asignado: list[str] = []
    sin_datos: list[str] = []
    fuera_rango: list[tuple[str, float]] = []

    for path in archivos:
        m = re.match(r"(cant-\d+)_\d{4}_\d{2}\.csv", path.name)
        if not m:
            continue
        gad_id = m.group(1)

        resultado = procesar_csv(path)
        if resultado is None:
            sin_datos.append(gad_id)
            continue
        asignado, devengado, _ = resultado
        if asignado <= 0:
            sin_asignado.append(gad_id)
            continue

        valor = round(devengado / asignado * 10000) / 100  # 2 decimales
        if valor < 0 or valor > 150:
            fuera_rango.append((gad_id, valor))
        # valor_norm: ejecución por encima del 100% es "sobreejecución" (común
        # con reformas presupuestarias); para el scoring 0-100 capamos arriba
        # y abajo, sin perder el valor crudo en `valor`.
        valor_norm = max(0.0, min(100.0, valor))

        rows.append(
            "  ("
            f"{sql_str(gad_id)}, "
            f"{sql_str(DIMENSION)}, "
            f"{sql_str(indicador)}, "
            f"{valor}, "
            f"{sql_str(UNIDAD)}, "
            f"{valor_norm}, "
            f"{sql_str(FUENTE)}, "
            f"DATE {sql_str(fecha)}"
            ")"
        )

    if not rows:
        print("No se generó ninguna fila — revisa los CSVs fuente.", file=sys.stderr)
        return 1

    header = (
        "-- =============================================================================\n"
        f"-- SIGEL — Mediciones reales DPE LOTAIP Núm. 6 {args.year}-{args.month:02d}\n"
        f"--          → dimensión finanzas\n"
        f"-- Generado por scripts/build_seed_dpe_finanzas.py · {len(rows)} mediciones\n"
        f"-- Fuente: {FUENTE}  ·  Fecha observación: {fecha}\n"
        f"-- Indicador: {indicador} (porcentaje)\n"
        "-- Metodología: ejecución presupuestaria = sum(Devengado)/sum(Asignado)*100,\n"
        "--   sumando solo las cuentas hoja del clasificador (las que no son\n"
        "--   prefijo de otra) para no duplicar por jerarquía. valor_norm clamp 0-100.\n"
        "-- Idempotente: ON CONFLICT DO NOTHING sobre la clave natural.\n"
        "-- Requiere 0001_init.sql + 0002_motor_real.sql.\n"
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

    print(f"✓ {OUT.relative_to(ROOT)}  ·  {len(rows)} mediciones reales (finanzas DPE)")
    if sin_asignado:
        print(f"  · {len(sin_asignado)} sin Asignado>0 (omitidos): {sin_asignado[:8]}", file=sys.stderr)
    if sin_datos:
        print(f"  · {len(sin_datos)} sin datos parseables (omitidos): {sin_datos[:8]}", file=sys.stderr)
    if fuera_rango:
        print(
            f"  · {len(fuera_rango)} con ejecución fuera de [0,150]% (incluidos, capados en valor_norm): "
            f"{fuera_rango[:8]}",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
