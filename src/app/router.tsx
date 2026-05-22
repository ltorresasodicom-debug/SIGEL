import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { RankingPage } from '@/pages/RankingPage';
import { MapaPage } from '@/pages/MapaPage';
import { GadPage } from '@/pages/GadPage';
import { EvaluarPage } from '@/pages/EvaluarPage';
import { CalculadoraPage } from '@/pages/CalculadoraPage';
import { MetodologiaPage } from '@/pages/MetodologiaPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

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
