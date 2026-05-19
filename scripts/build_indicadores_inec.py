#!/usr/bin/env python3
"""ETL reproducible: índices compuestos INEC 2024 (GIRS + APA) por cantón.

Capa ADITIVA y no destructiva. NO toca electoral.json, dims, ingel, IDs ni
evaluaciones. Genera data/indicadores_inec_2024.json indexado por el
`canton_codigo` del geojson (mismo valor que data.js asigna a g.feature_id en
attachGeoToGads), para que el pipeline lo adjunte en O(1) sin ambigüedad de
homónimos.

Fuentes (INEC, Estadística de Información Ambiental Económica en GADM 2024):
  - data/sources/inec_girs_2024.csv  (Gestión Integral de Residuos Sólidos)
  - data/sources/inec_apa_2024.csv   (Agua Potable y Alcantarillado)

Metodología (versionada): cada índice 0–100 = media de variables binarias
"Sí/No" del INEC recodificadas 1→100, 2→0; vacío u otro código se EXCLUYE del
denominador (no penaliza ni infla). Selección curada y documentada abajo.
"""
import csv
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GIRS_CSV = ROOT / "data" / "sources" / "inec_girs_2024.csv"
APA_CSV = ROOT / "data" / "sources" / "inec_apa_2024.csv"
GEOJSON = ROOT / "data" / "cantones-ec.geojson"
OUT = ROOT / "data" / "indicadores_inec_2024.json"

# ── Variables curadas (códigos del diccionario INEC 2024) ───────────────────
GIRS_VARS = {
    # 2.1.x: etapas operativas del manejo de residuos (Sí/No)
    "operacion": ["MR211", "MR212", "MR213", "MR214", "MR215", "MR216",
                  "MR217", "MR218", "MR219", "MR2110", "MR21111"],
    # capacidad institucional / normativa / sostenibilidad financiera
    "institucional": ["MR111", "MR113", "MR13", "MR19", "MR221", "MR2210"],
}
APA_VARS = {
    # ¿Cuenta/Dispone? institucional, catastros, automatización, plan de mejoras
    "institucional": ["MA121", "MA1211", "MA131", "MA141", "MA142", "MA151",
                      "MA152", "MA171", "MA181", "MA182", "MA191", "MA192",
                      "MA193", "MA1101", "MA112DPM"],
    # manuales/guías de operación de los sistemas (agua cruda/potable/saneam.)
    "operacion": ["MA21111", "MA21112", "MA1612", "MA1613", "MA1614",
                  "MA1621", "MA1622", "MA1623", "MA1624", "MA1625",
                  "MA1631", "MA1632"],
}


def read_csv(path: Path, encoding: str):
    txt = path.read_bytes().decode(encoding, "replace")
    rows = list(csv.reader(io.StringIO(txt), delimiter=";"))
    header = [h.lstrip("﻿").strip() for h in rows[0]]
    idx = {h: i for i, h in enumerate(header)}
    return idx, [r for r in rows[1:] if any(c.strip() for c in r)]


def subindex(row, idx, cols):
    """Media 0–100 de las columnas binarias presentes (1→100, 2→0)."""
    vals = []
    used = 0
    for c in cols:
        if c not in idx:
            continue
        raw = row[idx[c]].strip() if idx[c] < len(row) else ""
        if raw == "1":
            vals.append(100.0); used += 1
        elif raw == "2":
            vals.append(0.0); used += 1
        # vacío / otro → excluido del denominador
    if not vals:
        return None, 0
    return round(sum(vals) / len(vals), 1), used


def build(path, encoding, id_col, name_col, prov_col, pob_col, groups, tag):
    idx, rows = read_csv(path, encoding)
    out = {}
    miss_cols = [c for g in groups.values() for c in g if c not in idx]
    for r in rows:
        try:
            cid = int(str(r[idx[id_col]]).strip())
        except (ValueError, KeyError):
            continue
        sub = {}
        all_used = 0
        for gname, cols in groups.items():
            val, used = subindex(r, idx, cols)
            sub[gname] = val
            all_used += used
        present = [v for v in sub.values() if v is not None]
        indice = round(sum(present) / len(present), 1) if present else None
        out[cid] = {
            "nombre": r[idx[name_col]].strip() if name_col in idx else "",
            "subindices": sub,
            "indice": indice,
            "variables_usadas": all_used,
        }
    return out, idx, len(rows), miss_cols


def main():
    geo = json.loads(GEOJSON.read_text(encoding="utf-8"))
    # int(CantonId) → canton_codigo string del geojson (clave que usa g.feature_id)
    code_by_int = {}
    for f in geo["features"]:
        cc = str(f["properties"].get("canton_codigo", "")).strip()
        if cc.isdigit():
            code_by_int.setdefault(int(cc), cc)

    girs, gi_idx, gi_rows, gi_miss = build(
        GIRS_CSV, "latin-1", "CantonId", "NombreCantón", "Provin", "Pob",
        GIRS_VARS, "GIRS")
    apa, ap_idx, ap_rows, ap_miss = build(
        APA_CSV, "utf-8-sig", "IDCANTON", "NOM_CANTON", "Prov", None,
        APA_VARS, "APA")

    all_ids = sorted(set(girs) | set(apa))
    result = {}
    matched = unmatched = 0
    for cid in all_ids:
        cc = code_by_int.get(cid)
        if not cc:
            unmatched += 1
            continue
        matched += 1
        g = girs.get(cid)
        a = apa.get(cid)
        result[cc] = {
            "canton": (g or a or {}).get("nombre", ""),
            "girs": None if not g else {
                "indice": g["indice"], **g["subindices"],
            },
            "apa": None if not a else {
                "indice": a["indice"], **a["subindices"],
            },
        }

    payload = {
        "_meta": {
            "fuente": "INEC — Estadística de Información Ambiental Económica en GADM 2024",
            "datasets": ["GIRS (residuos sólidos)", "APA (agua potable y alcantarillado)"],
            "anio": 2024,
            "metodologia": "Índice 0–100 = media de variables binarias INEC "
                           "(1=Sí→100, 2=No→0; vacío excluido). Selección curada "
                           "en scripts/build_indicadores_inec.py.",
            "clave": "canton_codigo del geojson (= g.feature_id en data.js)",
            "variables": {"GIRS": GIRS_VARS, "APA": APA_VARS},
        },
        "byCode": result,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")

    print("=== Indicadores INEC 2024 ===")
    print(f"GIRS filas={gi_rows}  APA filas={ap_rows}")
    print(f"Cantones con código mapeado: {matched}  sin mapear: {unmatched}")
    print(f"Cantones en salida: {len(result)}")
    if gi_miss:
        print(f"GIRS columnas no halladas (omitidas): {gi_miss}")
    if ap_miss:
        print(f"APA columnas no halladas (omitidas): {ap_miss}")
    ej = next(iter(result.items()))
    print("Ejemplo:", ej[0], json.dumps(ej[1], ensure_ascii=False))
    # Validación de integridad
    errs = []
    for cc, v in result.items():
        for ds in ("girs", "apa"):
            d = v[ds]
            if d and d["indice"] is not None and not (0 <= d["indice"] <= 100):
                errs.append(f"{cc} {ds} fuera de rango: {d['indice']}")
    if errs:
        raise SystemExit("FALLO INTEGRIDAD:\n  " + "\n  ".join(errs[:10]))
    print("Integridad OK (todos los índices en [0,100]).")


if __name__ == "__main__":
    main()
