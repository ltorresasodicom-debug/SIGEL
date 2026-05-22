import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSigelData } from '@/hooks/useSigelData';
import { DataBoundary } from '@/components/ui';
import { SEMAFORO_COLOR } from '@/lib/colores';
import { normalize } from '@/lib/normalize';
import type { Gad } from '@/types/sigel';

export function MapaPage() {
  const { data, isLoading, error } = useSigelData();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const el = containerRef.current;
    if (!data?.geojson || !el) return;

    const map = L.map(el, { scrollWheelZoom: true, minZoom: 5, maxZoom: 12 }).setView(
      [-1.5, -78.5],
      6,
    );
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap · © CartoDB',
      maxZoom: 19,
    }).addTo(map);

    const gadByCanton = new Map<string, Gad>(
      data.cantones.map((g) => [normalize(g.canton ?? ''), g]),
    );
    const gadDe = (f?: GeoJSON.Feature): Gad | undefined => {
      const canton = f?.properties?.['canton'] as string | undefined;
      return canton ? gadByCanton.get(normalize(canton)) : undefined;
    };

    const layer = L.geoJSON(data.geojson as unknown as GeoJSON.GeoJsonObject, {
      style: (f) => {
        const gad = gadDe(f);
        return {
          color: '#ffffff',
          weight: 0.8,
          fillColor: gad ? SEMAFORO_COLOR[gad.semaforo] : '#E2E8F0',
          fillOpacity: gad ? 0.78 : 0.4,
        };
      },
      onEachFeature: (f, lyr) => {
        const gad = gadDe(f);
        const p = f.properties ?? {};
        lyr.bindTooltip(
          `<strong>${p['canton'] ?? ''}</strong><br>${p['provincia'] ?? ''}` +
            (gad ? ` · INGEL ${gad.ingel.toFixed(1)}` : ' · sin datos'),
          { sticky: true, direction: 'top' },
        );
        if (gad) lyr.on('click', () => navigate(`/gad/${gad.id}`));
      },
    }).addTo(map);

    try {
      map.fitBounds(layer.getBounds(), { padding: [10, 10] });
    } catch {
      /* viewport por defecto */
    }

    return () => {
      map.remove();
    };
  }, [data, navigate]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Mapa Nacional de Desempeño
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Coropleta del INGEL en los cantones del Ecuador. Haz clic en un cantón para ver su ficha.
        </p>
      </header>

      <DataBoundary loading={isLoading} error={error}>
        <div
          ref={containerRef}
          className="overflow-hidden rounded-xl border border-slate-200 shadow-sm"
          style={{ height: 'clamp(420px, 62vh, 680px)', background: '#EAF0F6' }}
          role="application"
          aria-label="Mapa interactivo de cantones del Ecuador"
        />
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
          {(
            [
              ['Alto (≥ 70)', '#16A34A'],
              ['Medio (50–69)', '#F59E0B'],
              ['Crítico (< 50)', '#DC2626'],
              ['Sin datos', '#E2E8F0'],
            ] as const
          ).map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </DataBoundary>
    </div>
  );
}
