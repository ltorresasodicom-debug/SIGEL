import { Providers } from './providers';
import { AppRoutes } from './router';

/** Raíz de la aplicación SIGEL. */
export function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
