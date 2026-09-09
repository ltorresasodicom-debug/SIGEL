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
import difflib
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

# URL real del CSV de Numeral 6, confirmada contra el servicio en vivo: base
# /backend/v1/transparency/media/ + la ruta tal cual viene en url_download
# (que empieza por 'transparencia/<RUC>/Numeral 6/...'). El handler Django
# ^media/(?P<path>.*)$ devuelve 404 limpio si el archivo no existe.
CSV_URL_PATTERNS = [
    "https://transparencia.dpe.gob.ec/backend/v1/transparency/media/{ruta}",
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
    # Accept con */* porque el spec se sirve como application/openapi+json
    # (un Accept estricto a application/json provoca HTTP 406). Content-Type
    # solo cuando hay cuerpo (un GET con Content-Type también irrita al server).
    headers = {"User-Agent": HEADERS_JSON["User-Agent"], "Accept": "application/json, */*"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_download(url: str, destino: Path) -> int:
    req = urllib.request.Request(url, headers=HEADERS_FILE)
    with urllib.request.urlopen(req, timeout=120) as resp:
        contenido = resp.read()
    if contenido[:15].lstrip().lower().startswith((b"<!doctype", b"<html")):
        raise ValueError("respuesta HTML (archivo no disponible)")
    destino.write_bytes(contenido)
    return len(contenido)


def norm(s: str) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(s.lower().split())


# Alias nombre-corto (electoral) → nombre(s) oficial(es) (DPE), ya normalizado.
# Valores: str o tupla de variantes (la DPE no es consistente entre GADs).
# Portado de src/lib/canton-aliases.ts.
CANTON_ALIASES = {
    "rio verde": "rioverde",
    "a baquerizo moreno": "alfredo baquerizo moreno",
    "crnl marcelino mariduenas": "crnel. marcelino mariduena",
    "el empalme": "empalme",
    # electoral.json trae "GRAL. A Erizalde" (sic); la DPE publica como
    # "GENERAL ANTONIO ELIZALDE BUCAY".
    "gral. a erizalde": (
        "gnral. antonio elizalde",
        "general antonio elizalde",
        "general antonio elizalde bucay",
    ),
    "gral a erizalde": (
        "gnral. antonio elizalde",
        "general antonio elizalde",
        "general antonio elizalde bucay",
    ),
    "fco. de orellana": "orellana",
    "fco de orellana": "orellana",
    "nobol/piedrahita": "nobol",
    "yahuachi": "san jacinto de yaguachi",
    "urcuqui": "san miguel de urcuqui",
    "pueblo viejo": "puebloviejo",
    "c.j. arosemena tola": "carlos julio arosemena tola",
    "cj arosemena tola": "carlos julio arosemena tola",
    "banos": "banos de agua santa",
    "pelileo": "san pedro de pelileo",
    "pillaro": "santiago de pillaro",
    "yanzatza": "yantzaza",
    "joya de los sachas": "la joya de los sachas",
}


# Alias nombre-provincia (electoral) → nombre(s) que publica la DPE, normalizado.
# electoral.json abrevia algunos; la DPE suele traer el nombre completo.
PROVINCIA_ALIASES = {
    "sto dgo de los tsachilas": (
        "santo domingo de los tsachilas",
        "santo domingo",
    ),
}


def _strip_punct(s: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", s).split())


def ruc_desde_record(record: dict) -> str:
    """El RUC va embebido en files[].url_download: /transparencia/<RUC>/..."""
    for f in record.get("files") or []:
        url = f.get("url_download") or ""
        partes = [urllib.parse.unquote(p) for p in url.strip("/").split("/")]
        for i, seg in enumerate(partes):
            if seg.lower() == "transparencia" and i + 1 < len(partes) and partes[i + 1].isdigit():
                return partes[i + 1]
        for seg in partes:  # respaldo: primer segmento numérico largo
            if seg.isdigit() and len(seg) >= 10:
                return seg
    return ""


def extraer_canton(nombre: str) -> str | None:
    """Cantón si el nombre ES un GAD Municipal (empieza por el prefijo); si no, None.

    Estricto (startswith) para excluir agencias del GAD: 'ACCIÓN SOCIAL DEL
    GOBIERNO ... MUNICIPAL ...', 'CUERPO DE BOMBEROS ...', 'EMPRESA MUNICIPAL ...'.
    """
    n = norm(nombre)
    m = re.match(r"^gobierno autonomo descentralizado municipal\s+(.*)$", n)
    if m:
        resto = m.group(1)
    else:
        resto = None
        for pat in (r"^gobierno municipal\s+(.*)$",
                    r"^i?\.?\s*ilustre municipalidad\s+(.*)$",
                    r"^municipalidad\s+(.*)$",
                    r"^municipio\s+(.*)$"):
            m = re.match(pat, n)
            if m:
                resto = m.group(1)
                break
    if not resto:
        return None
    # Quita modificadores y conector inicial sin romper artículos (La/Las/Los/El).
    resto = re.sub(r"^(intercultural y plurinacional|intercultural|y plurinacional|plurinacional)\b", "", resto).strip()
    resto = re.sub(r"^(del canton|de el canton|canton|del|de)\s+", "", resto)
    # Corta colas: " - GADM...", "(...)", "provincia de ...", "... gad/gadm...".
    resto = re.split(r"\s+-\s+|\s*\(|\bprovincia de[l]?\b|\bgad", resto)[0]
    return resto.strip(" .,-") or None


def es_gad_municipal(nombre: str) -> bool:
    """True solo si el nombre ES un GAD Municipal (no una empresa/agencia del GAD)."""
    return extraer_canton(nombre) is not None


def extraer_provincia(nombre: str) -> str | None:
    """Provincia si el nombre ES un GAD Provincial (Prefectura); si no, None.

    Estricto (los prefijos exigen 'provincial'/'prefectura') para excluir
    empresas/agencias provinciales que no son el GAD en sí. Nunca colisiona con
    municipios: aquellos empiezan por '... descentralizado municipal'.
    """
    n = norm(nombre)
    resto = None
    for pat in (r"^gobierno autonomo descentralizado provincial\s+(.*)$",
                r"^gobierno autonomo descentralizado de la provincia\s+(.*)$",
                r"^gobierno provincial\s+(.*)$",
                r"^gad provincial\s+(.*)$",
                r"^h?\.?\s*consejo provincial\s+(.*)$",
                r"^prefectura\s+(.*)$"):
        m = re.match(pat, n)
        if m:
            resto = m.group(1)
            break
    if not resto:
        return None
    # Quita el conector inicial sin romper el artículo El ("El Oro"): NO se
    # incluye "de el" en la lista, para que "de el oro" → "el oro" (vía "de ").
    resto = re.sub(r"^(de la provincia de|de la|del|de)\s+", "", resto)
    # Corta colas: " - GAD...", "(...)", "... gad/gadp...".
    resto = re.split(r"\s+-\s+|\s*\(|\bgad", resto)[0]
    return resto.strip(" .,-") or None


def es_gad_provincial(nombre: str) -> bool:
    """True solo si el nombre ES un GAD Provincial / Prefectura."""
    return extraer_provincia(nombre) is not None


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


def cargar_indice_electoral() -> tuple[dict[str, str], dict[str, str]]:
    """Índices nombre-cantón normalizado → gad_id (cant-N): directo+alias y sin puntuación.

    cant-N = 'cant-' + índice 0-based del arreglo cantones de electoral.json
    (igual que src/services/sigel-data.ts).
    """
    if not ELECTORAL_JSON.exists():
        return {}, {}
    data = json.loads(ELECTORAL_JSON.read_text(encoding="utf-8"))
    by_norm: dict[str, str] = {}
    for idx, c in enumerate(data["cantones"]):
        key = norm(c["canton"])
        if not key:
            continue
        gid = f"cant-{idx}"
        by_norm.setdefault(key, gid)
        # Clave cualificada "<cantón> <provincia>" para nombres duplicados:
        # hay dos cantones Olmedo (Loja y Manabí) y el de Manabí se publica
        # como "OLMEDO-MANABÍ", que sin puntuación cae en esta clave.
        prov = norm(c.get("provincia") or "")
        if prov:
            by_norm.setdefault(f"{key} {prov}", gid)
        oficial = CANTON_ALIASES.get(key)
        if oficial:
            variantes = (oficial,) if isinstance(oficial, str) else oficial
            for v in variantes:
                by_norm.setdefault(norm(v), gid)
    by_norm_np = {}
    for k, gid in by_norm.items():
        by_norm_np.setdefault(_strip_punct(k), gid)
    return by_norm, by_norm_np


def cargar_indice_provincial() -> tuple[dict[str, str], dict[str, str]]:
    """Índices nombre-provincia normalizado → gad_id (prov-N): directo+alias y sin puntuación.

    prov-N = 'prov-' + índice 0-based del arreglo provincias de electoral.json
    (igual que src/services/sigel-data.ts).
    """
    if not ELECTORAL_JSON.exists():
        return {}, {}
    data = json.loads(ELECTORAL_JSON.read_text(encoding="utf-8"))
    by_norm: dict[str, str] = {}
    for idx, p in enumerate(data["provincias"]):
        key = norm(p["provincia"])
        if not key:
            continue
        gid = f"prov-{idx}"
        by_norm.setdefault(key, gid)
        oficial = PROVINCIA_ALIASES.get(key)
        if oficial:
            variantes = (oficial,) if isinstance(oficial, str) else oficial
            for v in variantes:
                by_norm.setdefault(norm(v), gid)
    by_norm_np = {}
    for k, gid in by_norm.items():
        by_norm_np.setdefault(_strip_punct(k), gid)
    return by_norm, by_norm_np


def match_canton(nombre: str, indices: tuple[dict[str, str], dict[str, str]]) -> str:
    """Empareja un GAD con su cant-N: exacto → sin-puntuación → sufijo → fuzzy. '' si nada."""
    by_norm, by_norm_np = indices
    canton = extraer_canton(nombre)
    if not canton:
        return ""
    n = norm(canton)
    if n in by_norm:
        return by_norm[n]
    if _strip_punct(n) in by_norm_np:
        return by_norm_np[_strip_punct(n)]
    # Nombres oficiales anteponen santo/cualificador: "San Pedro de Pimampiro" → "Pimampiro".
    toks = n.split()
    for i in range(1, len(toks)):
        suf = " ".join(toks[i:])
        if suf in by_norm:
            return by_norm[suf]
        if _strip_punct(suf) in by_norm_np:
            return by_norm_np[_strip_punct(suf)]
    cerca = difflib.get_close_matches(n, list(by_norm.keys()), n=1, cutoff=0.84)
    return by_norm[cerca[0]] if cerca else ""


def match_provincia(nombre: str, indices: tuple[dict[str, str], dict[str, str]]) -> str:
    """Empareja un GAD Provincial con su prov-N: exacto → sin-puntuación → fuzzy. '' si nada."""
    by_norm, by_norm_np = indices
    provincia = extraer_provincia(nombre)
    if not provincia:
        return ""
    n = norm(provincia)
    if n in by_norm:
        return by_norm[n]
    if _strip_punct(n) in by_norm_np:
        return by_norm_np[_strip_punct(n)]
    cerca = difflib.get_close_matches(n, list(by_norm.keys()), n=1, cutoff=0.84)
    return by_norm[cerca[0]] if cerca else ""


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
    quiere_muni = args.tipo in ("municipal", "ambos")
    quiere_prov = args.tipo in ("provincial", "ambos")
    # ruc → (nombre, clase, set(meses_vistos)). Primera aparición fija nombre/clase.
    acumulado: dict[str, tuple[str, str, set[int]]] = {}
    for mes in meses:
        items = descargar_dump_mes(args.year, mes, args.refrescar)
        if not items:
            print(f"  · {args.year}-{mes:02d}: respuesta vacía, salto", file=sys.stderr)
            continue
        # La API devuelve 'establishment_name'; el RUC va embebido en url_download.
        for it in items:
            nombre = (it.get("establishment_name") or "").strip()
            ruc = ruc_desde_record(it)
            if not nombre or not ruc:
                continue
            if quiere_muni and es_gad_municipal(nombre):
                clase = "municipal"
            elif quiere_prov and es_gad_provincial(nombre):
                clase = "provincial"
            else:
                continue
            if ruc not in acumulado:
                acumulado[ruc] = (nombre, clase, set())
            acumulado[ruc][2].add(mes)

    if not acumulado:
        print("  ✗ Ningún GAD encontrado en los meses solicitados.", file=sys.stderr)
        return 1

    idx_muni = cargar_indice_electoral()
    idx_prov = cargar_indice_provincial()
    filas: list[tuple[str, str, str, str]] = []  # (gad_id, ruc, nombre, meses_visto)
    sin_match: list[str] = []
    for ruc, (nombre, clase, meses_set) in acumulado.items():
        gad_id = (
            match_canton(nombre, idx_muni)
            if clase == "municipal"
            else match_provincia(nombre, idx_prov)
        )
        if not gad_id:
            sin_match.append(f"{nombre} ({ruc})")
        meses_visto = ",".join(str(m) for m in sorted(meses_set))
        filas.append((gad_id, ruc, nombre, meses_visto))

    filas.sort(key=lambda r: (r[0] or "zz", r[2]))
    with RUCS_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["gad_id", "ruc", "nombre", "meses_visto"])
        w.writerows(filas)
    n_cant = sum(1 for r in filas if r[0].startswith("cant-"))
    n_prov = sum(1 for r in filas if r[0].startswith("prov-"))
    meses_str = ",".join(f"{m:02d}" for m in meses)
    print(
        f"✓ {RUCS_CSV.relative_to(ROOT)}  ·  {len(filas)} GAD "
        f"(unión {args.year}-{{{meses_str}}}, tipo={args.tipo}: "
        f"{n_cant} cant + {n_prov} prov, {len(sin_match)} sin match)"
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
            "Corre primero: python scripts/fetch_dpe.py catastro --year YYYY --months 10,11,12 --tipo ambos",
            file=sys.stderr,
        )
        return []
    with RUCS_CSV.open(encoding="utf-8", newline="") as f:
        filas = list(csv.DictReader(f, delimiter=";"))
    # Compatibilidad con CSVs viejos (3 columnas, sin meses_visto):
    for fila in filas:
        fila.setdefault("meses_visto", "")
    return filas


def filtro_solo(args) -> set[str] | None:
    """Set de gad_ids del flag --solo, o None para procesar todos."""
    if not getattr(args, "solo", None):
        return None
    return {g.strip() for g in args.solo.split(",") if g.strip()}


def cmd_presupuesto(args) -> int:
    catastro = leer_catastro()
    if not catastro:
        return 1
    solo = filtro_solo(args)
    PRESUPUESTO_DIR.mkdir(parents=True, exist_ok=True)
    ok = saltados = errores = 0
    for fila in catastro:
        gad_id, ruc = fila["gad_id"].strip(), fila["ruc"].strip()
        if not gad_id:
            continue  # sin match con cant-N → no podemos asociarlo a la dimensión
        if solo is not None and gad_id not in solo:
            continue
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
    solo = filtro_solo(args)
    CSV_DIR.mkdir(parents=True, exist_ok=True)
    log_path = CSV_DIR / "_errores.log"
    # En corridas completas el log arranca de cero; con --solo se conservan
    # las entradas de otros GAD y solo se reescriben las de los reintentados.
    errores_previos: dict[str, str] = {}
    if solo is not None and log_path.exists():
        for linea in log_path.read_text(encoding="utf-8").splitlines():
            if linea.strip():
                errores_previos[linea.split(";", 1)[0]] = linea
        for gid in solo:
            errores_previos.pop(gid, None)
    ok = saltados = errores = 0
    patron_ganador: str | None = None
    for fila in catastro:
        gad_id, ruc = fila["gad_id"].strip(), fila["ruc"].strip()
        if not gad_id:
            continue
        if solo is not None and gad_id not in solo:
            continue
        destino = CSV_DIR / f"{gad_id}_{args.year}_{args.month:02d}.csv"
        if destino.exists():
            saltados += 1
            continue
        ruta = urllib.parse.quote(
            f"transparencia/{ruc}/Numeral 6/{args.year}/{args.month:02d}/Conjunto de datos.csv"
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
            errores_previos[gad_id] = f"{gad_id};{ruc};{ultimo_error}"
            errores += 1
            time.sleep(args.pausa)
            continue
        ok += 1
        if args.verbose:
            print(f"  ✓ {gad_id} ({ruc}): {size} bytes")
        time.sleep(args.pausa)
    if errores_previos:
        log_path.write_text(
            "\n".join(sorted(errores_previos.values())) + "\n", encoding="utf-8"
        )
    else:
        log_path.unlink(missing_ok=True)
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
    c.add_argument(
        "--tipo", choices=["municipal", "provincial", "ambos"], default="municipal",
        help="qué GAD capturar: municipal (default), provincial (prefecturas) o ambos",
    )
    c.add_argument("--refrescar", action="store_true", help="re-descarga el dump aunque exista cache")

    for nombre in ("presupuesto", "csv"):
        s = sub.add_parser(nombre)
        s.add_argument("--year", type=int, required=True)
        s.add_argument("--month", type=int, required=True)
        s.add_argument("--pausa", type=float, default=0.4, help="segundos entre requests")
        s.add_argument(
            "--solo", type=str, default="",
            help='restringe a estos gad_ids, e.g. "cant-82,cant-144" (para reintentos puntuales)',
        )
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
