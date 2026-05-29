// SIGEL — Datos de las instituciones que apoyan la plataforma.
// Los logotipos viven como archivos optimizados en `public/brand/` (no se
// incrustan en el bundle); se referencian por URL pública.

export interface Sponsor {
  id: string;
  /** Nombre accesible / institucional. */
  nombre: string;
  /** Descriptor institucional breve. */
  descripcion: string;
  /** Ruta pública del logo (en `public/brand/`). */
  logo: string;
  /** Dimensiones intrínsecas del logo (evitan layout shift). */
  ancho: number;
  alto: number;
  /** Texto alternativo de la imagen. */
  alt: string;
  /** Sitio institucional. */
  href: string;
}

export const SPONSORS: Sponsor[] = [
  {
    id: 'asodicom',
    nombre: 'ASODICOM',
    descripcion: 'Asociación de Diálogo Comunitario',
    logo: '/brand/asodicom.png',
    ancho: 577,
    alto: 100,
    alt: 'Logotipo de ASODICOM — Uniendo Comunidades',
    href: 'https://www.poreditar.com',
  },
  {
    id: 'latamcifras',
    nombre: 'Latam Cifras',
    descripcion: 'Análisis de datos e indicadores de América Latina',
    logo: '/brand/latamcifras.png',
    ancho: 640,
    alto: 127,
    alt: 'Logotipo de Latam Cifras',
    href: 'https://www.latamcifras.com',
  },
];
