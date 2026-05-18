// =============================================================================
// SIGEL — Vista Mapa interactivo
//
// Renderiza los 224 cantones del Ecuador como polígonos GeoJSON sobre
// Leaflet, coloreados según el INGEL (heatmap semaforizado). Cada polígono
// es:
//   - hover: realza el contorno
//   - click: abre popup con datos y enlace al perfil del GAD
//
// Si por alguna razón el GeoJSON no está disponible, cae a un fallback de
// circle markers (manteniendo compatibilidad con la versión anterior).
// =============================================================================
import { COLOR_SEMAFORO } from '../ingel.js';
import { getCantonesGeoJSON } from '../data.js';
import { normalize } from '../utils/normalize.js';

let _leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!_leafletPromise) {
    _leafletPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => res(window.L);
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  return _leafletPromise;
}

export function viewMapa(state) {
  return /*html*/`
  <div class="max-w-7xl mx-auto px-4 py-8 fade-in">
    <header class="mb-6">
      <h1 class="font-display font-bold text-3xl">Mapa Nacional de Desempeño</h1>
      <p class="text-slate-600 mt-2">
        Coropleta del INGEL en los <strong>224 cantones</strong> del Ecuador,
        coloreada por nivel de desempeño. Pasa el cursor sobre un cantón para
        resaltarlo, haz clic para ver el perfil del GAD.
      </p>
    </header>

    <div class="card p-0 overflow-hidden">
      <div id="map" role="application" aria-label="Mapa de cantones del Ecuador"></div>
    </div>

    <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm">
      <div class="flex items-center gap-2"><span class="inline-block w-4 h-4 rounded" style="background:#16A34A"></span> Alto desempeño (INGEL ≥ 70)</div>
      <div class="flex items-center gap-2"><span class="inline-block w-4 h-4 rounded" style="background:#F59E0B"></span> Medio (50–69)</div>
      <div class="flex items-center gap-2"><span class="inline-block w-4 h-4 rounded" style="background:#DC2626"></span> Crítico (&lt; 50)</div>
      <div class="flex items-center gap-2"><span class="inline-block w-4 h-4 rounded border" style="background:#E2E8F0"></span> Sin datos</div>
    </div>

    <p class="text-xs text-slate-400 text-center mt-3">
      Geometrías: shapefile oficial INEC (DPA 2012, reproyectado UTM 17S → WGS84).
    </p>
  </div>
  `;
}

/**
 * Mount post-render: instancia el mapa Leaflet, añade tile-layer, y monta
 * los polígonos GeoJSON con styling reactivo.
 */
export async function mountMapa(state) {
  const L = await loadLeaflet();
  const geo = getCantonesGeoJSON();

  const map = L.map('map', {
    scrollWheelZoom: true,
    minZoom: 5,
    maxZoom: 12,
    zoomControl: true,
    attributionControl: true,
  }).setView([-1.5, -78.5], 6);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap · © CartoDB',
    maxZoom: 19,
  }).addTo(map);

  // Índice rápido para asociar cada feature con su GAD (y por tanto su INGEL)
  const gadByCanton = new Map();
  for (const g of state.data.cantones) {
    gadByCanton.set(normalize(g.canton), g);
  }

  if (geo && geo.features?.length) {
    renderChoropleth(L, map, geo, gadByCanton, state);
  } else {
    renderFallbackMarkers(L, map, state);
  }
}

function renderChoropleth(L, map, geo, gadByCanton, state) {
  const layer = L.geoJSON(geo, {
    style: (feature) => styleForFeature(feature, gadByCanton),
    onEachFeature: (feature, lyr) => bindFeatureBehavior(feature, lyr, gadByCanton),
  }).addTo(map);

  // Ajustar la vista al país (centrado entre Galápagos y la frontera norte)
  try {
    map.fitBounds(layer.getBounds(), { padding: [10, 10] });
  } catch { /* viewport por defecto */ }

  // Capa de marcadores para las 23 prefecturas (centroide provincial)
  for (const p of state.data.provincias) {
    if (!p.coord) continue;
    L.circleMarker(p.coord, {
      radius: 5,
      color: '#1E3A8A',
      fillColor: '#1E3A8A',
      fillOpacity: 0.9,
      weight: 2,
    })
      .bindPopup(provincePopupHtml(p))
      .addTo(map);
  }
}

function styleForFeature(feature, gadByCanton) {
  const gad = gadByCanton.get(normalize(feature.properties.canton));
  const color = gad ? COLOR_SEMAFORO[gad.semaforo] : '#E2E8F0';
  return {
    color: '#FFFFFF',
    weight: 0.8,
    fillColor: color,
    fillOpacity: gad ? 0.78 : 0.4,
  };
}

function bindFeatureBehavior(feature, lyr, gadByCanton) {
  const gad = gadByCanton.get(normalize(feature.properties.canton));

  lyr.on('mouseover', (e) => {
    e.target.setStyle({ weight: 2.5, color: '#1E3A8A', fillOpacity: 0.9 });
    e.target.bringToFront();
  });
  lyr.on('mouseout', (e) => {
    e.target.setStyle(styleForFeature(feature, gadByCanton));
  });
  lyr.on('click', () => {
    if (gad) location.hash = `#/gad/${gad.id}`;
  });

  lyr.bindTooltip(
    `<strong>${feature.properties.canton}</strong><br>` +
      (gad
        ? `${feature.properties.provincia} · INGEL ${gad.ingel.toFixed(1)}`
        : `${feature.properties.provincia} · sin datos`),
    { sticky: true, direction: 'top', offset: [0, -5] }
  );

  if (gad) {
    lyr.bindPopup(cantonPopupHtml(gad, feature));
  } else {
    lyr.bindPopup(
      `<div class="text-sm"><strong>${feature.properties.canton}</strong><br>` +
        `<span class="text-slate-500">${feature.properties.provincia}</span><br>` +
        `<em>Sin evaluación cargada</em></div>`
    );
  }
}

function cantonPopupHtml(gad, feature) {
  return /*html*/`
    <div class="text-sm" style="min-width:200px">
      <div class="font-bold text-base">${feature.properties.canton}</div>
      <div class="text-xs text-slate-500 mb-2">
        ${feature.properties.provincia} · ${gad.autoridad || '—'}
      </div>
      <div class="mb-1">INGEL: <strong>${gad.ingel.toFixed(1)}</strong> · ${gad.nivel}</div>
      <div class="text-xs text-slate-600 mb-2">IRI ${gad.iri.toFixed(1)}</div>
      <a href="#/gad/${gad.id}" style="display:inline-block;padding:.3rem .6rem;background:#1E3A8A;color:#fff;border-radius:.3rem;font-weight:600">
        Ver perfil →
      </a>
    </div>
  `;
}

function provincePopupHtml(p) {
  return /*html*/`
    <div class="text-sm">
      <div class="font-bold">Prefectura · ${p.provincia}</div>
      <div class="text-xs text-slate-500 mb-2">${p.autoridad || '—'}</div>
      <div>INGEL: <strong>${p.ingel.toFixed(1)}</strong> · ${p.nivel}</div>
      <a href="#/gad/${p.id}" style="display:inline-block;margin-top:.4rem;padding:.3rem .6rem;background:#1E3A8A;color:#fff;border-radius:.3rem;font-weight:600">
        Ver perfil →
      </a>
    </div>
  `;
}

/** Fallback si el GeoJSON falla — mantiene la experiencia previa. */
function renderFallbackMarkers(L, map, state) {
  for (const g of state.data.gads) {
    const color = COLOR_SEMAFORO[g.semaforo] || '#94A3B8';
    L.circleMarker(g.coord, {
      radius: Math.max(5, g.ingel / 8),
      color,
      fillColor: color,
      fillOpacity: 0.55,
      weight: 1.5,
    })
      .bindTooltip(`${g.nombre} · INGEL ${g.ingel.toFixed(1)}`, { sticky: true })
      .on('click', () => { location.hash = `#/gad/${g.id}`; })
      .addTo(map);
  }
}
