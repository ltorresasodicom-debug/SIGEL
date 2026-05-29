// SIGEL — Bloque institucional "Con el apoyo de" (reutilizable).
import { SPONSORS } from '@/lib/brand';
import { SponsorCard } from '@/components/SponsorCard';

export function SponsorSection() {
  return (
    <section aria-labelledby="apoyo-titulo" className="border-t border-white/10 pt-8">
      <h2
        id="apoyo-titulo"
        className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
      >
        Con el apoyo de
      </h2>
      <ul className="mx-auto mt-5 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        {SPONSORS.map((sponsor) => (
          <li key={sponsor.id}>
            <SponsorCard sponsor={sponsor} />
          </li>
        ))}
      </ul>
    </section>
  );
}
