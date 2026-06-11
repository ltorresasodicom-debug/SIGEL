#!/usr/bin/env python3
"""Cliente del API público de la Defensoría del Pueblo (LOTAIP).

Base: https://transparencia.dpe.gob.ec/backend/v1/public/
Endpoint confirmado: POST /public/presupuesto  body={ruc, year, month}.

EJECUTAR EN TU MÁQUINA (el sandbox de desarrollo no tiene salida de red
hacia este host). Solo usa la librería estándar de Python 3.10+.

Subcomandos:
  spec          Descarga el OpenAPI a data/sources/dpe_openapi.json y
                lista los endpoints disponibles (para mapear más fuentes).
  presupuesto   Para cada RUC del catastro data/sources/gad_rucs.csv
                (columnas: gad_id;ruc;nombre) hace POST /public/presupuesto
                y cachea las respuestas en data/sources/dpe_presupuesto/.
                Re-ejecutable: salta los GAD ya cacheados.

Uso típico:
  python3 scripts/fetch_dpe.py spec
  python3 scripts/fetch_dpe.py presupuesto --year 2024 --month 12

El catastro gad_rucs.csv es el pre-requisito pendiente (los RUC no están
en electoral.json). Si el spec revela un endpoint de instituciones, esa
será la vía para generarlo automáticamente.
"""
import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://transparencia.dpe.gob.ec/backend/v1/public"
SPEC_URL = "https://transparencia.dpe.gob.ec/backend/v1/public/swagger/?format=openapi"
SPEC_OUT = ROOT / "data" / "sources" / "dpe_openapi.json"
RUCS_CSV = ROOT / "data" / "sources" / "gad_rucs.csv"
CACHE_DIR = ROOT / "data" / "sources" / "dpe_presupuesto"

HEADERS = {
    "User-Agent": "SIGEL-ETL/1.0 (plataforma de evaluación de gobiernos locales)",
    "Accept": "application/json",
    "Content-Type": "application/json",
}


def http(url: str, body: dict | None = None) -> dict | list:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def cmd_spec(_args) -> int:
    spec = http(SPEC_URL)
    SPEC_OUT.parent.mkdir(parents=True, exist_ok=True)
    SPEC_OUT.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
    paths = spec.get("paths", {}) if isinstance(spec, dict) else {}
    print(f"✓ {SPEC_OUT.relative_to(ROOT)}  ·  {len(paths)} endpoints:")
    for ruta, metodos in sorted(paths.items()):
        for metodo in metodos:
            print(f"  {metodo.upper():6} {ruta}")
    return 0


def cmd_presupuesto(args) -> int:
    if not RUCS_CSV.exists():
        print(
            f"Falta el catastro {RUCS_CSV.relative_to(ROOT)} "
            "(columnas: gad_id;ruc;nombre). Genera o coloca el archivo y reintenta.",
            file=sys.stderr,
        )
        return 1
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with RUCS_CSV.open(encoding="utf-8", newline="") as f:
        catastro = list(csv.DictReader(f, delimiter=";"))
    ok = saltados = errores = 0
    for fila in catastro:
        gad_id, ruc = fila["gad_id"].strip(), fila["ruc"].strip()
        destino = CACHE_DIR / f"{gad_id}_{args.year}_{args.month:02d}.json"
        if destino.exists():
            saltados += 1
            continue
        try:
            payload = http(
                f"{BASE}/presupuesto",
                {"ruc": ruc, "year": args.year, "month": args.month},
            )
            destino.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            ok += 1
        except urllib.error.HTTPError as e:
            print(f"  ✗ {gad_id} ({ruc}): HTTP {e.code}", file=sys.stderr)
            errores += 1
        except Exception as e:  # red caída, JSON inválido, etc.
            print(f"  ✗ {gad_id} ({ruc}): {e}", file=sys.stderr)
            errores += 1
        time.sleep(args.pausa)  # cortesía con el servicio público
    print(f"✓ presupuesto {args.year}-{args.month:02d}: {ok} nuevos · "
          f"{saltados} en caché · {errores} errores → {CACHE_DIR.relative_to(ROOT)}/")
    return 0 if errores == 0 else 2


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("spec")
    pp = sub.add_parser("presupuesto")
    pp.add_argument("--year", type=int, required=True)
    pp.add_argument("--month", type=int, required=True)
    pp.add_argument("--pausa", type=float, default=0.5, help="segundos entre requests")
    args = p.parse_args()
    return {"spec": cmd_spec, "presupuesto": cmd_presupuesto}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
