// SIGEL — Traducción de errores de Supabase Auth a mensajes en español.
// supabase-js v2 expone `code` en AuthApiError; se prioriza `code` y se
// respalda con substring de `message` para versiones/errores que no lo traen.
// Helper puro y reutilizable (login, registro, cambio de contraseña, etc.).

interface ErrorLike {
  code?: string | null;
  message?: string | null;
}

// Mensajes reutilizados por código y por substring del message.
const MSG = {
  emailRate:
    'El sistema de correo alcanzó su límite temporal. Espera unos minutos e inténtalo de nuevo, o avisa al administrador.',
  requestRate: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  smsRate:
    'El sistema de envío alcanzó su límite temporal. Espera unos minutos e inténtalo de nuevo.',
  invalidCreds: 'Email o contraseña incorrectos.',
  notConfirmed:
    'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
  yaRegistrado: 'Este email ya tiene una cuenta. Inicia sesión.',
  weak: 'La contraseña es muy débil (mínimo 8 caracteres).',
  emailInvalid: 'El email no es válido.',
  validation: 'Revisa los datos ingresados.',
  signupDisabled: 'El registro está deshabilitado temporalmente.',
  banned: 'Esta cuenta está deshabilitada. Contacta al administrador.',
} as const;

const POR_CODIGO: Record<string, string> = {
  over_email_send_rate_limit: MSG.emailRate,
  over_request_rate_limit: MSG.requestRate,
  over_sms_send_rate_limit: MSG.smsRate,
  invalid_credentials: MSG.invalidCreds,
  email_not_confirmed: MSG.notConfirmed,
  user_already_exists: MSG.yaRegistrado,
  email_exists: MSG.yaRegistrado,
  weak_password: MSG.weak,
  email_address_invalid: MSG.emailInvalid,
  validation_failed: MSG.validation,
  signup_disabled: MSG.signupDisabled,
  user_banned: MSG.banned,
};

// Respaldo por substring del `message` en minúsculas. Orden: específico antes
// que genérico (p. ej. "email rate limit" gana sobre "rate limit").
const POR_MENSAJE: ReadonlyArray<readonly [string, string]> = [
  ['email rate limit exceeded', MSG.emailRate],
  ['rate limit', MSG.requestRate],
  ['invalid login credentials', MSG.invalidCreds],
  ['email not confirmed', MSG.notConfirmed],
  ['already registered', MSG.yaRegistrado],
  ['user already exists', MSG.yaRegistrado],
  ['password should be at least', MSG.weak],
  ['weak password', MSG.weak],
  ['unable to validate email address', MSG.emailInvalid],
  ['invalid email', MSG.emailInvalid],
  ['signups not allowed', MSG.signupDisabled],
  ['signup is disabled', MSG.signupDisabled],
];

const GENERICO = 'No se pudo completar la operación. Inténtalo de nuevo.';

/** Traduce un error de Supabase Auth a un mensaje claro en español. */
export function mensajeErrorAuth(error: ErrorLike | null | undefined): string {
  if (!error) return GENERICO;
  const code = (error.code ?? '').toLowerCase();
  const porCodigo = code ? POR_CODIGO[code] : undefined;
  if (porCodigo) return porCodigo;
  const msg = (error.message ?? '').toLowerCase();
  for (const [fragmento, texto] of POR_MENSAJE) {
    if (msg.includes(fragmento)) return texto;
  }
  // Sin mapeo conocido: crudo a consola para devs, genérico al usuario.
  if (error.message) console.warn('[auth] error sin traducir:', error.message);
  return GENERICO;
}
