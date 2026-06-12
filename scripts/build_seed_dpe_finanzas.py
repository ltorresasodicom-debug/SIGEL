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

Los CSVs vienen en formatos heterogéneos del mismo servicio:
  - latin-1, separador de miles `,`, decimal `.` (cant-1)
  - utf-8 con BOM, separador de miles `.`, decimal `,`        (cant-50)
  - delimitador `;` o `,`, con o sin filas de título antes de la cabecera
Todo se autodetecta por archivo; los no parseables se reportan con
diagnóstico (encoding, delimitadores probados, primeras líneas).

Uso:
  python scripts/build_seed_dpe_finanzas.py [--year 2024] [--month 12] \
      [--fallback-meses 11,10]
"""
import argparse
import calendar
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_DIR = ROOT / "data" / "sources" / "dpe_csv"
OUT = ROOT / "supabase" / "seeds" / "0005_dpe_finanzas_reales.sql"
JSON_OUT = ROOT / "public" / "data" / "finanzas-dpe-2024.json"

DIMENSION = "finanzas"
UNIDAD = "porcentaje"
FUENTE = "DPE LOTAIP Numeral 6"


def norm_header(s: str) -> str:
    s = unicodedata.normalize("NFD", s.strip().lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def leer_texto(path: Path) -> tuple[str, str]:
    """Lee el CSV resolviendo BOM y autodetectando UTF-8 vs latin-1.

    Devuelve (texto, etiqueta_encoding) para diagnóstico.
    """
    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        return raw[3:].decode("utf-8"), "utf-8-bom"
    try:
        return raw.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        return raw.decode("latin-1"), "latin-1"


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


def buscar_col(cabeceras: list[str], objetivo: str) -> int:
    """Índice de la columna `objetivo`: exacto primero, luego contains. -1 si nada."""
    for i, h in enumerate(cabeceras):
        if h == objetivo:
            return i
    for i, h in enumerate(cabeceras):
        if objetivo in h:
            return i
    return -1


def localizar_tabla(texto: str) -> tuple[list[list[str]], int, int, int] | None:
    """Encuentra la tabla resumen dentro del CSV, tolerando variantes.

    Algunos GAD exportan con delimitador coma en vez de punto y coma, o con
    filas de título antes de la cabecera. Se intenta cada delimitador y se
    busca la fila de cabecera (la que tiene Cuenta + Asignado + Devengado)
    dentro de las primeras 30 filas. Devuelve (filas_datos, i_cuenta,
    i_asignado, i_devengado) o None.
    """
    lineas = texto.splitlines()
    for delim in (";", ","):
        rows = list(csv.reader(lineas, delimiter=delim))
        for idx, row in enumerate(rows[:30]):
            cab = [norm_header(c) for c in row]
            i_cuenta = buscar_col(cab, "cuenta")
            i_asig = buscar_col(cab, "asignado")
            i_dev = buscar_col(cab, "devengado")
            if i_cuenta >= 0 and i_asig >= 0 and i_dev >= 0 and len(row) >= 4:
                return rows[idx + 1:], i_cuenta, i_asig, i_dev
    return None


def procesar_csv(path: Path) -> tuple[float, float, int]:
    """Devuelve (asignado_total, devengado_total, n_hojas).

    Lanza ValueError con el motivo si el archivo no es parseable.
    """
    texto, encoding = leer_texto(path)
    formato = detectar_formato_decimal(texto)

    tabla = localizar_tabla(texto)
    if tabla is None:
        primeras = [ln for ln in texto.splitlines() if ln.strip()][:2]
        preview = " | ".join(repr(ln[:120]) for ln in primeras)
        raise ValueError(
            f"sin cabecera Cuenta/Asignado/Devengado en las primeras 30 filas "
            f"(delims probados ';' y ','; encoding {encoding}). Inicio: {preview}"
        )
    data_rows, i_cuenta, i_asig, i_dev = tabla

    filas: list[tuple[str, str, str]] = []
    for row in data_rows:
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
        raise ValueError(
            f"cabecera encontrada pero ninguna fila de datos con código de "
            f"cuenta válido (encoding {encoding})"
        )

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
    ap.add_argument(
        "--fallback-meses", type=str, default="",
        help='meses alternos si falta el CSV del mes primario, e.g. "11,10". '
             "El GAD usa el primer mes con archivo; la fecha del seed sigue "
             "siendo el cierre del mes primario (acumulado fiscal anual).",
    )
    args = ap.parse_args()

    try:
        meses = [args.month] + [
            int(x.strip()) for x in args.fallback_meses.split(",") if x.strip()
        ]
    except ValueError:
        ap.error(f"--fallback-meses espera enteros separados por coma: {args.fallback_meses!r}")

    fecha = f"{args.year}-{args.month:02d}-{calendar.monthrange(args.year, args.month)[1]:02d}"
    indicador = f"dpe_lotaip6_{args.year}_ejecucion_presupuestaria"

    gad_nums: set[int] = set()
    for mes in meses:
        for p in CSV_DIR.glob(f"cant-*_{args.year}_{mes:02d}.csv"):
            gad_nums.add(int(re.match(r"cant-(\d+)_", p.name).group(1)))
    if not gad_nums:
        print(
            f"No hay CSVs para {args.year} meses {meses} en {CSV_DIR.relative_to(ROOT)}/. "
            f"Corre primero: python scripts/fetch_dpe.py csv --year {args.year} --month {args.month}",
            file=sys.stderr,
        )
        return 1

    rows: list[str] = []
    json_by_gad: dict[str, dict] = {}
    sin_asignado: list[str] = []
    sin_datos: list[tuple[str, str]] = []
    fuera_rango: list[tuple[str, float]] = []
    con_fallback: list[tuple[str, int]] = []

    for n in sorted(gad_nums):
        gad_id = f"cant-{n}"
        path = mes_usado = None
        for mes in meses:
            candidato = CSV_DIR / f"{gad_id}_{args.year}_{mes:02d}.csv"
            if candidato.exists():
                path, mes_usado = candidato, mes
                break
        if path is None:
            continue
        if mes_usado != args.month:
            con_fallback.append((gad_id, mes_usado))

        try:
            asignado, devengado, _ = procesar_csv(path)
        except ValueError as e:
            sin_datos.append((gad_id, str(e)))
            continue
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
        json_by_gad[gad_id] = {
            "presupuesto": round(asignado, 2),
            "gasto": round(devengado, 2),
            "ejecucion_pct": valor,
            "mes_corte": mes_usado,
        }

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

    # JSON consumido por public/data/ desde el frontend (src/services/sigel-data.ts).
    # Mismos números que el seed SQL pero con los montos absolutos preservados,
    # que el seed no almacena porque mediciones.dimension acepta solo el catálogo
    # del motor de ranking y los USD no entran al promedio.
    json_payload = {
        "fuente": FUENTE,
        "fecha_corte": fecha,
        "indicador_pct": indicador,
        "byGadId": {k: json_by_gad[k] for k in sorted(json_by_gad)},
    }
    JSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUT.write_text(
        json.dumps(json_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"✓ {OUT.relative_to(ROOT)}  ·  {len(rows)} mediciones reales (finanzas DPE)")
    print(f"✓ {JSON_OUT.relative_to(ROOT)}  ·  {len(json_by_gad)} cantones (montos y % ejecución)")
    if con_fallback:
        print(
            f"  · {len(con_fallback)} usaron mes alterno: "
            f"{[f'{g} (mes {m})' for g, m in con_fallback[:8]]}",
            file=sys.stderr,
        )
    if sin_asignado:
        print(f"  · {len(sin_asignado)} sin Asignado>0 (omitidos): {sin_asignado[:8]}", file=sys.stderr)
    if sin_datos:
        print(f"  · {len(sin_datos)} sin datos parseables (omitidos) — diagnóstico:", file=sys.stderr)
        for gad_id, motivo in sin_datos:
            print(f"    - {gad_id}: {motivo}", file=sys.stderr)
    if fuera_rango:
        print(
            f"  · {len(fuera_rango)} con ejecución fuera de [0,150]% (incluidos, capados en valor_norm): "
            f"{fuera_rango[:8]}",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
