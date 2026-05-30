import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui';
import { Button } from '@/components/Button';
import { signInWithEmail } from '@/services/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !pwd) {
      setErr('Ingresa email y contraseña.');
      return;
    }
    setErr('');
    setPending(true);
    try {
      const { error } = await signInWithEmail(email, pwd);
      if (error) {
        setErr(error.message);
        return;
      }
      navigate('/');
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Error al iniciar sesión.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-slate-600">
          Accede a tu cuenta SIGEL para guardar evaluaciones a tu nombre y participar en la
          conversación territorial.
        </p>
      </header>

      <Card>
        {!isSupabaseConfigured ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            El backend Supabase no está configurado en este despliegue. El login no está
            disponible hasta configurar <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        ) : !loading && user ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Ya estás autenticado como <strong>{user.email}</strong>.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
              />
            </div>
            <div>
              <label htmlFor="login-pwd" className="mb-1 block text-sm font-medium">
                Contraseña
              </label>
              <input
                id="login-pwd"
                type="password"
                autoComplete="current-password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
              />
            </div>
            {err && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {err}
              </p>
            )}
            <Button variant="primary" size="lg" fullWidth type="submit" disabled={pending}>
              {pending ? 'Iniciando…' : 'Iniciar sesión'}
            </Button>
            <p className="text-xs text-muted">
              Las cuentas se gestionan desde el panel de Supabase mientras el registro público
              se habilita en una siguiente sesión.
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
