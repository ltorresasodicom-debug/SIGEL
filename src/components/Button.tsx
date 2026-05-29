// SIGEL — Botón/CTA reutilizable, dirigido por tokens del design system.
// Renderiza <button> por defecto; con `to` → <Link> interno; con `href` → <a>.
import type { MouseEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'accent' | 'primary' | 'secondary' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT: Record<Variant, string> = {
  accent: 'bg-sigel-accent text-ink-inverse hover:opacity-90',
  primary: 'bg-sigel-primary text-ink-inverse hover:opacity-90',
  secondary: 'border border-slate-300 bg-surface text-slate-600 hover:bg-slate-50',
  inverse: 'border border-white/30 bg-white/10 text-ink-inverse hover:bg-white/20',
};

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5',
  lg: 'px-6 py-3',
};

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
  onClick?: MouseEventHandler;
  /** Ruta interna (react-router): renderiza <Link>. */
  to?: string;
  /** URL externa: renderiza <a>. */
  href?: string;
  target?: string;
  rel?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', fullWidth = false, className = '', children } = props;
  const cls = [BASE, VARIANT[variant], SIZE[size], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ');
  const label = props['aria-label'];

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={cls} aria-label={label} onClick={props.onClick}>
        {children}
      </Link>
    );
  }
  if (props.href !== undefined) {
    return (
      <a
        href={props.href}
        target={props.target}
        rel={props.rel}
        className={cls}
        aria-label={label}
        onClick={props.onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type={props.type ?? 'button'}
      disabled={props.disabled}
      className={cls}
      aria-label={label}
      onClick={props.onClick}
    >
      {children}
    </button>
  );
}
