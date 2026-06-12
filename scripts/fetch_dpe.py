#!/usr/bin/env python3
"""Cliente del API público Defensoría del Pueblo (LOTAIP Núm. 6).

Base: https://transparencia.dpe.gob.ec/backend/v1/public/public/
(la duplicación /public/public/ en la ruta es real — confirmado contra
el servicio en vivo).

EJECUTAR LOCALMENTE (PowerShell, bash, etc.) — el sandbox remoto no
tiene salida de red hacia este host. Solo stdlib de Python 3.10+.

Subcomandos:
  spec        Descarga el OpenAPI a data/sources/dpe_openapi.json
              y lista los endpoints.
  catastro    POST /presupuesto con {ruc:null, year, month} →
              guarda la respuesta cruda en data/sources/dpe_catastro/
              y deriva data/sources/gad_rucs.csv filtrando a GAD
              Municipales (~221 cantones). Acepta --month N (un mes)
              o --months 10,11,12 (unión, dedup por RUC) para
              maximizar cobertura cuando algunos GAD no publicaron
              en un mes dado. Es el bootstrap: corre esto una vez
              antes de los otros subcomandos.
  presupuesto Para cada RUC del catastro hace POST /presupuesto
              con {ruc, year, month} y cachea en
              data/sources/dpe_presupuesto/.
  csv         Descarga el "Conjunto de datos.csv" detallado por GAD
              probando los patrones de CSV_URL_PATTERNS (primer hit
              gana y se memoriza) a data/sources/dpe_csv/
              <gad_id>_<año>_<mes>.csv. Los 404 se registran en
              data/sources/dpe_csv/_errores.log y el loop continúa.

Uso típico (PowerShell):
  python scripts/fetch_dpe.py spec
  python scripts/fetch_dpe.py catastro --year 2024 --months 10,11,12
  python scripts/fetch_dpe.py presupuesto --year 2024 --month 12
  python scripts/fetch_dpe.py csv --year 2024 --month 12

Todos los subcomandos son re-ejecutables (saltan lo cacheado) y hacen
una pausa de cortesía con el servicio público.
"""
import argparse
import csv
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_API = "https://transparencia.dpe.gob.ec/backend/v1/public/public"
SPEC_URL = "https://transparencia.dpe.gob.ec/backend/v1/public/swagger/?format=openapi"

# Patrones de URL del CSV de Numeral 6 — se prueban en orden hasta el primer 200.
# El primero es la ruta real que sirve Django (descubierta por reverse-engineering
# del frontend: wf="/backend" + Xi="/v1/transparency"). El segundo es la heurística
# inicial del repo, dejada como fallback hasta que un éxito real confirme la primera.
CSV_URL_PATTERNS = [
    "https://transparencia.dpe.gob.ec/backend/v1/transparency/media/{ruta}",
    "https://transparencia.dpe.gob.ec/media/transparencia/{ruta}",
]

SRC = ROOT / "data" / "sources"
SPEC_OUT = SRC / "dpe_openapi.json"
CATASTRO_DIR = SRC / "dpe_catastro"
RUCS_CSV = SRC / "gad_rucs.csv"
PRESUPUESTO_DIR = SRC / "dpe_presupuesto"
CSV_DIR = SRC / "dpe_csv"
ELECTORAL_JSON = ROOT / "public" / "data" / "electoral.json"

HEADERS_JSON = {
    "User-Agent": "SIGEL-ETL/1.0 (plataforma de evaluación de gobiernos locales)",
    "Accept": "application/json",
    "Content-Type": "application/json",
}
HEADERS_FILE = {
    "User-Agent": HEADERS_JSON["User-Agent"],
    "Accept": "text/csv, */*",
}


def http_json(url: str, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS_JSON)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_download(url: str, destino: Path) -> int:
    req = urllib.request.Request(url, headers=HEADERS_FILE)
    with urllib.request.urlopen(req, timeout=120) as resp:
        contenido = resp.read()
    destino.write_bytes(contenido)
    return len(contenido)


def norm(s: str) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.lower().split())


def es_gad_municipal(nombre: str) -> bool:
    """Filtra instituciones que son GAD Municipales (cantones)."""
    n = norm(nombre)
    # GAD Municipal / Gobierno Autónomo Descentralizado Municipal / Municipio de X
    return (
        "gad municipal" in n
        or "gobierno autonomo descentralizado municipal" in n
        or n.startswith("municipio de ")
        or n.startswith("ilustre municipio")
        or "municipalidad" in n
    )


def encontrar_campo(obj: dict, *posibles: str) -> str | None:
    """Devuelve el primer campo presente (case-insensitive) entre los candidatos."""
    if not isinstance(obj, dict):
        return None
    lower = {k.lower(): k for k in obj.keys()}
    for p in posibles:
        if p.lower() in lower:
            return lower[p.lower()]
    return None


def cmd_spec(_args) -> int:
    spec = http_json(SPEC_URL)
    SPEC_OUT.parent.mkdir(parents=True, exist_ok=True)
    SPEC_OUT.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
    paths = spec.get("paths", {}) if isinstance(spec, dict) else {}
    print(f"✓ {SPEC_OUT.relative_to(ROOT)}  ·  {len(paths)} endpoints:")
    for ruta, metodos in sorted(paths.items()):
        for metodo in metodos:
            print(f"  {metodo.upper():6} {ruta}")
    return 0


def cargar_indice_electoral() -> dict[str, str]:
    """Mapea nombre-cantón normalizado → gad_id (cant-N).

    Lazy: solo se carga si hace falta para emparejar el catastro DPE
    con la dimensión cantonal del repo.
    """
    if not ELECTORAL_JSON.exists():
        return {}
    data = json.loads(ELECTORAL_JSON.read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for idx, c in enumerate(data["cantones"]):
        out.setdefault(norm(c["canton"]), f"cant-{idx}")
    return out


def nombre_canton_desde_institucion(nombre: str) -> str:
    """'GAD MUNICIPAL DE CUENCA' / 'MUNICIPIO DE GIRÓN' → 'cuenca' / 'giron'."""
    n = norm(nombre)
    for prefijo in (
        "gobierno autonomo descentralizado municipal de ",
        "gobierno autonomo descentralizado municipal del ",
        "gad municipal de ",
        "gad municipal del ",
        "municipio de ",
        "municipio del ",
        "ilustre municipio de ",
        "ilustre municipio del ",
        "municipalidad de ",
        "municipalidad del ",
    ):
        if n.startswith(prefijo):
            return n[len(prefijo):]
    return n


def descargar_dump_mes(year: int, mes: int, refrescar: bool) -> list[dict]:
    """Devuelve la lista cruda de instituciones para un (year, mes), con cache."""
    CATASTRO_DIR.mkdir(parents=True, exist_ok=True)
    raw_out = CATASTRO_DIR / f"{year}_{mes:02d}.json"
    if raw_out.exists() and not refrescar:
        print(f"  · usando cache {raw_out.relative_to(ROOT)} (--refrescar para forzar)")
        items = json.loads(raw_out.read_text(encoding="utf-8"))
    else:
        print(f"  ↓ POST {BASE_API}/presupuesto  body={{ruc:null, year:{year}, month:{mes}}}")
        items = http_json(
            f"{BASE_API}/presupuesto",
            {"ruc": None, "year": year, "month": mes},
        )
        raw_out.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {raw_out.relative_to(ROOT)}  ·  {len(items)} instituciones")
    if not isinstance(items, list):
        return []
    return items


def cmd_catastro(args) -> int:
    meses: list[int] = args.meses_resueltos  # garantizado por main()
    # ruc → (nombre, set(meses_vistos)). Primera aparición fija el nombre.
    acumulado: dict[str, tuple[str, set[int]]] = {}
    campo_ruc = campo_nombre = None
    for mes in meses:
        items = descargar_dump_mes(args.year, mes, args.refrescar)
        if not items:
            print(f"  · {args.year}-{mes:02d}: respuesta vacía, salto", file=sys.stderr)
            continue
        if campo_ruc is None:
            muestra = items[0]
            campo_ruc = encontrar_campo(muestra, "ruc")
            campo_nombre = encontrar_campo(
                muestra, "razonSocial", "razon_social", "nombre", "institucion", "name"
            )
            if not campo_ruc or not campo_nombre:
                print(
                    f"  ✗ No pude detectar los campos ruc/nombre. "
                    f"Claves disponibles: {list(muestra.keys())}",
                    file=sys.stderr,
                )
                return 1
            print(f"  · campos detectados: ruc='{campo_ruc}'  nombre='{campo_nombre}'")
        for it in items:
            nombre = (it.get(campo_nombre) or "").strip()
            ruc = (it.get(campo_ruc) or "").strip()
            if not nombre or not ruc or not es_gad_municipal(nombre):
                continue
            if ruc not in acumulado:
                acumulado[ruc] = (nombre, set())
            acumulado[ruc][1].add(mes)

    if not acumulado:
        print("  ✗ Ningún GAD Municipal encontrado en los meses solicitados.", file=sys.stderr)
        return 1

    indice_electoral = cargar_indice_electoral()
    filas: list[tuple[str, str, str, str]] = []  # (gad_id, ruc, nombre, meses_visto)
    sin_match: list[str] = []
    for ruc, (nombre, meses_set) in acumulado.items():
        canton = nombre_canton_desde_institucion(nombre)
        gad_id = indice_electoral.get(canton, "")
        if not gad_id:
            sin_match.append(f"{nombre} ({ruc})")
        meses_visto = ",".join(str(m) for m in sorted(meses_set))
        filas.append((gad_id, ruc, nombre, meses_visto))

    filas.sort(key=lambda r: (r[0] or "zz", r[2]))
    with RUCS_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["gad_id", "ruc", "nombre", "meses_visto"])
        w.writerows(filas)
    emparejados = sum(1 for r in filas if r[0])
    meses_str = ",".join(f"{m:02d}" for m in meses)
    print(
        f"✓ {RUCS_CSV.relative_to(ROOT)}  ·  {len(filas)} GAD Municipales "
        f"(unión {args.year}-{{{meses_str}}}, {emparejados} con cant-id, "
        f"{len(sin_match)} sin match)"
    )
    if sin_match:
        print("  · sin match en electoral.json — revisar manualmente:")
        for n in sin_match[:10]:
            print(f"    - {n}")
        if len(sin_match) > 10:
            print(f"    ... y {len(sin_match) - 10} más")
    return 0


def leer_catastro() -> list[dict]:
    if not RUCS_CSV.exists():
        print(
            f"Falta {RUCS_CSV.relative_to(ROOT)}. "
            "Corre primero: python scripts/fetch_dpe.py catastro --year YYYY --months 10,11,12",
            file=sys.stderr,
        )
        return []
    with RUCS_CSV.open(encoding="utf-8", newline="") as f:
        filas = list(csv.DictReader(f, delimiter=";"))
    # Compatibilidad con CSVs viejos (3 columnas, sin meses_visto):
    for fila in filas:
        fila.setdefault("meses_visto", "")
    return filas


def cmd_presupuesto(args) -> int:
    catastro = leer_catastro()
    if not catastro:
        return 1
    PRESUPUESTO_DIR.mkdir(parents=True, exist_ok=True)
    ok = saltados = errores = 0
    for fila in catastro:
        gad_id, ruc = fila["gad_id"].strip(), fila["ruc"].strip()
        if not gad_id:
            continue  # sin match con cant-N → no podemos asociarlo a la dimensión
        destino = PRESUPUESTO_DIR / f"{gad_id}_{args.year}_{args.month:02d}.json"
        if destino.exists():
            saltados += 1
            continue
        try:
            payload = http_json(
                f"{BASE_API}/presupuesto",
                {"ruc": ruc, "year": args.year, "month": args.month},
            )
            destino.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            ok += 1
        except urllib.error.HTTPError as e:
            print(f"  ✗ {gad_id} ({ruc}): HTTP {e.code}", file=sys.stderr)
            errores += 1
        except Exception as e:
            print(f"  ✗ {gad_id} ({ruc}): {e}", file=sys.stderr)
            errores += 1
        time.sleep(args.pausa)
    print(
        f"✓ presupuesto {args.year}-{args.month:02d}: {ok} nuevos · "
        f"{saltados} en caché · {errores} errores → {PRESUPUESTO_DIR.relative_to(ROOT)}/"
    )
    return 0 if errores == 0 else 2


def cmd_csv(args) -> int:
    catastro = leer_catastro()
    if not catastro:
        return 1
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    log_path = CSV_DIR / "_errores.log"
    log_path.unlink(missing_ok=True)
    ok = saltados = errores = 0
    patron_ganador: str | None = None
    for fila in catastro:
        gad_id, ruc = fila["gad_id"].strip(), fila["ruc"].strip()
        if not gad_id:
            continue
        destino = CSV_DIR / f"{gad_id}_{args.year}_{args.month:02d}.csv"
        if destino.exists():
            saltados += 1
            continue
        ruta = urllib.parse.quote(
            f"{ruc}/Numeral 6/{args.year}/{args.month:02d}/Conjunto de datos.csv"
        )
        # Prioriza el patrón que ya funcionó; si aún no hay ganador, todos.
        patrones = [patron_ganador] if patron_ganador else CSV_URL_PATTERNS
        ultimo_error: str = ""
        size = 0
        for patron in patrones:
            url = patron.format(ruta=ruta)
            try:
                size = http_download(url, destino)
                if patron_ganador is None:
                    patron_ganador = patron
                    print(f"  · patrón ganador: {patron}")
                break
            except urllib.error.HTTPError as e:
                ultimo_error = f"HTTP {e.code}"
            except Exception as e:
                ultimo_error = str(e)
        else:
            with log_path.open("a", encoding="utf-8") as logf:
                logf.write(f"{gad_id};{ruc};{ultimo_error}\n")
            errores += 1
            time.sleep(args.pausa)
            continue
        ok += 1
        if args.verbose:
            print(f"  ✓ {gad_id} ({ruc}): {size} bytes")
        time.sleep(args.pausa)
    msg_log = f" (ver {log_path.relative_to(ROOT)})" if errores else ""
    print(
        f"✓ CSV {args.year}-{args.month:02d}: {ok} nuevos · "
        f"{saltados} en caché · {errores} errores{msg_log} → {CSV_DIR.relative_to(ROOT)}/"
    )
    return 0 if errores == 0 else 2


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("spec")

    c = sub.add_parser("catastro")
    c.add_argument("--year", type=int, required=True)
    g = c.add_mutually_exclusive_group(required=True)
    g.add_argument("--month", type=int, help="un solo mes (1-12)")
    g.add_argument("--months", type=str, help='lista CSV de meses, e.g. "10,11,12"')
    c.add_argument("--refrescar", action="store_true", help="re-descarga el dump aunque exista cache")

    for nombre in ("presupuesto", "csv"):
        s = sub.add_parser(nombre)
        s.add_argument("--year", type=int, required=True)
        s.add_argument("--month", type=int, required=True)
        s.add_argument("--pausa", type=float, default=0.4, help="segundos entre requests")
        if nombre == "csv":
            s.add_argument("--verbose", action="store_true")

    args = p.parse_args()
    if args.cmd == "catastro":
        if args.months:
            try:
                args.meses_resueltos = [int(m.strip()) for m in args.months.split(",") if m.strip()]
            except ValueError:
                p.error(f"--months espera enteros separados por coma, recibí: {args.months!r}")
            if not all(1 <= m <= 12 for m in args.meses_resueltos):
                p.error("--months debe contener valores entre 1 y 12")
        else:
            args.meses_resueltos = [args.month]
    return {
        "spec": cmd_spec,
        "catastro": cmd_catastro,
        "presupuesto": cmd_presupuesto,
        "csv": cmd_csv,
    }[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
