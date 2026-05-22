import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';

// Code-splitting por ruta: cada página es un chunk independiente.
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const RankingPage = lazy(() =>
  import('@/pages/RankingPage').then((m) => ({ default: m.RankingPage })),
);
const MapaPage = lazy(() => import('@/pages/MapaPage').then((m) => ({ default: m.MapaPage })));
const GadPage = lazy(() => import('@/pages/GadPage').then((m) => ({ default: m.GadPage })));
const EvaluarPage = lazy(() =>
  import('@/pages/EvaluarPage').then((m) => ({ default: m.EvaluarPage })),
);
const CalculadoraPage = lazy(() =>
  import('@/pages/CalculadoraPage').then((m) => ({ default: m.CalculadoraPage })),
);
const MetodologiaPage = lazy(() =>
  import('@/pages/MetodologiaPage').then((m) => ({ default: m.MetodologiaPage })),
);
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

/** Definición de rutas del SPA. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="mapa" element={<MapaPage />} />
        <Route path="gad/:id" element={<GadPage />} />
        <Route path="evaluar" element={<EvaluarPage />} />
        <Route path="calculadora" element={<CalculadoraPage />} />
        <Route path="metodologia" element={<MetodologiaPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
