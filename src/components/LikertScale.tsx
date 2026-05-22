// SIGEL — Escala Likert 1–5 accesible (radiogroup), reutilizable.

interface LikertScaleProps {
  value: number | null;
  onChange: (valor: number) => void;
  ariaLabel: string;
}

export function LikertScale({ value, onChange, ariaLabel }: LikertScaleProps) {
  return (
    <>
      <div role="radiogroup" aria-label={ariaLabel} className="mt-2 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((v) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${v} de 5`}
              onClick={() => onChange(v)}
              className={`min-h-[44px] rounded-lg border-2 font-bold transition ${
                on
                  ? 'border-sigel-primary bg-sigel-primary text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-sigel-primary hover:text-sigel-primary'
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between px-1 text-xs text-slate-500">
        <span>En desacuerdo</span>
        <span>De acuerdo</span>
      </div>
    </>
  );
}
