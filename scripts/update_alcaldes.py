#!/usr/bin/env python3
"""Actualiza data/electoral.json con los alcaldes oficiales del Excel.

Determinista y re-ejecutable. Reglas:
  - Los 218 cantones existentes NO cambian de orden ni de índice (los IDs
    runtime `cant-<idx>` deben permanecer estables -> evaluaciones intactas).
    Solo se reescribe el campo `alcalde`.
  - Los cantones de Galápagos (ausentes hoy) se agregan al FINAL del array.
  - `provincias` y `asambleistas` no se tocan.

El match Excel<->JSON usa la misma normalización que el front
(js/utils/normalize.js + js/utils/canton-aliases.js) más alias explícitos
para 5 variantes de nombre y 1 de provincia.
"""
import json
import unicodedata
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "electoral.json"
XLSX_PATH = ROOT / "data" / "sources" / "alcaldes-actualizacion-2023.xlsx"


def normalize(text) -> str:
    """Equivalente a js/utils/normalize.js: sin tildes, minúsculas, espacios."""
    if not text:
        return ""
    s = unicodedata.normalize("NFD", str(text))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.lower().split())


# Alias cantón Excel->oficial (espejo de js/utils/canton-aliases.js)
CANTON_ALIASES = {
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
    "logroño": "logroño",
    "rumiñahui": "ruminahui",
}
CANTON_ALIASES = {normalize(k): normalize(v) for k, v in CANTON_ALIASES.items()}

# Provincia: el JSON guarda "Sto Dgo De los Tsachilas"; el Excel la grafía oficial.
PROVINCE_ALIASES = {"sto dgo de los tsachilas": "santo domingo de los tsachilas"}

# 5 cantones cuyo nombre en el Excel difiere del guardado y no cae en los alias
# anteriores. Mapea (provincia_norm, canton_excel_norm) -> canton_json_norm.
_EXTRA_PAIRS_RAW = {
    ("bolivar", "san miguel de bolivar"): "san miguel",
    ("carchi", "huaca"): "san pedro de huaca",
    ("guayas", "general antonio elizalde"): "gnral. antonio elizalde",
    ("guayas", "marcelino maridueña"): "crnel. marcelino maridueña",
    ("guayas", "yaguachi"): "san jacinto de yaguachi",
}
EXTRA_PAIRS = {
    (normalize(pk), normalize(ck)): normalize(v)
    for (pk, ck), v in _EXTRA_PAIRS_RAW.items()
}

GALAPAGOS_PROVINCE = "Galapagos"  # consistente con COORDENADAS/geojson


def prov_key(p) -> str:
    n = normalize(p)
    return PROVINCE_ALIASES.get(n, n)


def canton_key(c) -> str:
    n = normalize(c)
    return CANTON_ALIASES.get(n, n)


def main() -> None:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    cantones = data["cantones"]

    # Snapshot para aseverar estabilidad de IDs posicionales.
    before = [(c["provincia"], c["canton"]) for c in cantones]

    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    rows = [
        (str(p).strip(), str(c).strip(), str(a).strip())
        for p, c, a in wb["Hoja1"].iter_rows(values_only=True)
        if p and c and a
    ]

    # Índice del JSON actual por (prov, canton) normalizado.
    json_index = {}
    for c in cantones:
        json_index[(prov_key(c["provincia"]), canton_key(c["canton"]))] = c

    updated = unchanged = 0
    new_rows = []
    unmatched = []

    for prov, canton, alcalde in rows:
        pk = prov_key(prov)
        ck = canton_key(canton)
        target = json_index.get((pk, ck))
        if target is None and (pk, ck) in EXTRA_PAIRS:
            target = json_index.get((pk, EXTRA_PAIRS[(pk, ck)]))

        if target is None:
            if pk == normalize(GALAPAGOS_PROVINCE):
                new_rows.append((prov, canton, alcalde))
            else:
                unmatched.append((prov, canton, alcalde))
            continue

        if normalize(target.get("alcalde", "")) != normalize(alcalde):
            target["alcalde"] = alcalde
            updated += 1
        else:
            unchanged += 1

    # Append Galápagos al final (IDs cant-<idx> existentes no se desplazan).
    for prov, canton, alcalde in new_rows:
        cantones.append(
            {
                "provincia": GALAPAGOS_PROVINCE,
                "canton": canton,
                "alcalde": alcalde,
                "partido": "Sin dato",
                "alianza": False,
                "porcentaje": None,
            }
        )

    # ── Validaciones de integridad ──────────────────────────────────────────
    errors = []
    after = [(c["provincia"], c["canton"]) for c in cantones]
    if after[: len(before)] != before:
        errors.append("Los primeros 218 (provincia,canton) cambiaron de posición")
    if len(data["provincias"]) != 23:
        errors.append(f"provincias != 23 ({len(data['provincias'])})")
    if len(data["asambleistas"]) != 18:
        errors.append(f"asambleistas != 18 ({len(data['asambleistas'])})")
    if unmatched:
        errors.append(f"{len(unmatched)} filas del Excel sin cruzar")

    JSON_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("=== Actualización de alcaldes ===")
    print(f"Filas Excel procesadas : {len(rows)}")
    print(f"Alcaldes actualizados  : {updated}")
    print(f"Sin cambio             : {unchanged}")
    print(f"Cantones nuevos (Galáp): {len(new_rows)} -> {[c for _,c,_ in new_rows]}")
    print(f"Total cantones         : {len(cantones)} (antes {len(before)})")
    print(f"Provincias / Asamble.  : {len(data['provincias'])} / {len(data['asambleistas'])}")
    print(f"IDs cant-0..{len(before)-1} estables: {after[:len(before)] == before}")
    if unmatched:
        print("NO CRUZADOS:")
        for r in unmatched:
            print("  ", r)
    if errors:
        raise SystemExit("FALLO DE INTEGRIDAD:\n  - " + "\n  - ".join(errors))
    print("Integridad OK.")


if __name__ == "__main__":
    main()
