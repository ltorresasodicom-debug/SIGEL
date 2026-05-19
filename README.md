# SIGEL — Demo Público (Netlify)

Sitio estático ciudadano que expone la metodología SIGEL y permite a cualquier
persona **crear sus propias evaluaciones** del Índice Nacional de Gestión Local
(INGEL) directamente en el navegador.

## ¿Qué es esto?

Es la **versión pública** de SIGEL — un sitio 100 % estático (HTML + JS modular
+ Tailwind CDN + Leaflet) que se despliega en Netlify. No requiere backend.

Cargado:
- **23 prefectos** de las elecciones seccionales 2023
- **221 alcaldes** (incluye los 3 cantones de Galápagos)
- **18 asambleístas** electos 2024
- **8 dimensiones SIGEL** con sus ponderaciones canónicas
- **Fórmula INGEL** (port a JS del backend Python)

## Características

- 🏠 **Home** con stats nacionales y Top 5
- 📊 **Ranking** filtrable de los 244 GADs
- 🗺️ **Mapa Leaflet** con coropletas por desempeño
- 📋 **Crear evaluación** ciudadana (Likert 1-5 en las 8 dimensiones) con
  cálculo INGEL en vivo
- 💾 **Guardado en localStorage** (privado, sin servidor)
- 📤 **Exportación a JSON**
- 📚 Página de **metodología** completa

## Estructura

```
sigel-public/
├── index.html              # Punto de entrada
├── netlify.toml            # Config Netlify (headers, cache)
├── assets/sigel.css        # Estilos complementarios
├── js/
│   ├── app.js              # Bootstrap + router por hash
│   ├── ingel.js            # Motor de scoring (port del backend Python)
│   ├── data.js             # Carga de electoral.json + scores sintéticos
│   └── views/
│       ├── home.js
│       ├── ranking.js
│       ├── mapa.js
│       ├── gad.js
│       ├── evaluar.js
│       └── metodologia.js
└── data/electoral.json     # 23 prefectos + 218 alcaldes (extraído del Excel)
```

## Probar localmente

```bash
cd sigel-public
python3 -m http.server 8080
# → http://localhost:8080
```

O con Netlify CLI:

```bash
npx netlify-cli dev
```

## Desplegar a Netlify

```bash
npx netlify-cli deploy --prod --dir=. --site=<SITE_ID>
```

## ⚠️ Aviso

Los puntajes mostrados son **sintéticos** (generados deterministicamente a
partir de los datos electorales) para fines de demostración. La versión
completa de SIGEL alimenta el INGEL con datos reales del scraper LOTAIP,
API SERCOP, Ministerio de Finanzas y encuestas ciudadanas verificadas.

Las **evaluaciones ciudadanas** que el usuario hace en este demo **sí usan
exactamente la misma fórmula INGEL** del backend de producción.
