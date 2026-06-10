import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui';
import { Button } from '@/components/Button';
import { signInWithEmail, signUpWithEmail } from '@/services/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type Modo = 'login' | 'registro';

const INPUT_CLS =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40';

export function LoginPage() {
  const [modo, setModo] = useState<Modo>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  function cambiarModo(m: Modo) {
    setModo(m);
    setErr('');
    setOk('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setOk('');
    if (!email || !pwd) {
      setErr('Ingresa email y contraseña.');
      return;
    }
    if (modo === 'registro') {
      if (pwd.length < 8) {
        setErr('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (pwd !== pwd2) {
        setErr('Las contraseñas no coinciden.');
        return;
      }
    }
    setPending(true);
    try {
      if (modo === 'login') {
        const { error } = await signInWithEmail(email, pwd);
        if (error) {
          setErr(error.message);
          return;
        }
        navigate('/');
        return;
      }
      const { data, error } = await signUpWithEmail(email, pwd, nombre.trim() || undefined);
      if (error) {
        setErr(error.message);
        return;
      }
      // Con confirmación por email activada, un email ya registrado
      // devuelve user con identities vacío en lugar de error.
      if (data.user && data.user.identities?.length === 0) {
        setErr('Este email ya tiene una cuenta. Inicia sesión.');
        return;
      }
      if (data.session) {
        navigate('/');
        return;
      }
      setOk('Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.');
    } catch (ex) {
      setErr(
        ex instanceof Error
          ? ex.message
          : modo === 'login'
            ? 'Error al iniciar sesión.'
            : 'Error al crear la cuenta.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h1>
        <p className="mt-2 text-slate-600">
          Accede a tu cuenta SIGEL para guardar evaluaciones a tu nombre y participar en la
          conversación territorial.
        </p>
      </header>

      <Card>
        {!isSupabaseConfigured ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            El backend Supabase no está configurado en este despliegue. El acceso no está
            disponible hasta configurar <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        ) : !loading && user ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Ya estás autenticado como <strong>{user.email}</strong>.
          </p>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Modo de acceso"
              className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
            >
              {(
                [
                  ['login', 'Iniciar sesión'],
                  ['registro', 'Crear cuenta'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={modo === m}
                  onClick={() => cambiarModo(m)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    modo === m
                      ? 'bg-surface text-sigel-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {modo === 'registro' && (
                <div>
                  <label htmlFor="reg-nombre" className="mb-1 block text-sm font-medium">
                    Nombre <span className="font-normal text-muted">(opcional)</span>
                  </label>
                  <input
                    id="reg-nombre"
                    type="text"
                    autoComplete="name"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>
              )}
              <div>
                <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label htmlFor="login-pwd" className="mb-1 block text-sm font-medium">
                  Contraseña
                </label>
                <input
                  id="login-pwd"
                  type="password"
                  autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  className={INPUT_CLS}
                />
                {modo === 'registro' && (
                  <p className="mt-1 text-xs text-muted">Mínimo 8 caracteres.</p>
                )}
              </div>
              {modo === 'registro' && (
                <div>
                  <label htmlFor="reg-pwd2" className="mb-1 block text-sm font-medium">
                    Confirmar contraseña
                  </label>
                  <input
                    id="reg-pwd2"
                    type="password"
                    autoComplete="new-password"
                    value={pwd2}
                    onChange={(e) => setPwd2(e.target.value)}
                    className={INPUT_CLS}
                  />
                </div>
              )}
              {err && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {err}
                </p>
              )}
              {ok && (
                <p
                  role="status"
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
                >
                  {ok}
                </p>
              )}
              <Button variant="primary" size="lg" fullWidth type="submit" disabled={pending}>
                {pending
                  ? modo === 'login'
                    ? 'Iniciando…'
                    : 'Creando cuenta…'
                  : modo === 'login'
                    ? 'Iniciar sesión'
                    : 'Crear cuenta'}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
