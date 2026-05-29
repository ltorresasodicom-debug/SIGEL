// SIGEL — Card institucional de un patrocinador (reutilizable).
import type { Sponsor } from '@/lib/brand';

export function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const { nombre, descripcion, logo, ancho, alto, alt, href } = sponsor;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${nombre} — sitio institucional (se abre en una pestaña nueva)`}
      className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-7 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <img
        src={logo}
        alt={alt}
        width={ancho}
        height={alto}
        loading="lazy"
        decoding="async"
        className="h-9 w-auto max-w-[210px] object-contain transition duration-200 group-hover:scale-[1.02] sm:h-11"
      />
      <span className="text-sm leading-snug text-slate-500">{descripcion}</span>
    </a>
  );
}
