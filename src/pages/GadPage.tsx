import { useParams } from 'react-router-dom';
import { Placeholder } from '@/components/Placeholder';

/** Ficha de un gobierno local (GAD). */
export function GadPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <Placeholder
      titulo="Ficha del gobierno local"
      descripcion={`Perfil, INGEL, dimensiones e indicadores oficiales del GAD «${id ?? ''}».`}
    />
  );
}
