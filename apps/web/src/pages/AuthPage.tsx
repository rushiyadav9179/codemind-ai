import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { AuthRequestError } from '../lib/authSession';
import { useAuth } from '../auth/AuthProvider';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

type AuthMode = 'login' | 'register';

function passwordIsStrong(password: string): boolean {
  const categories = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  );
  return password.length >= 12 && password.length <= 128 && categories.length >= 3;
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { user, isLoading, login, register, restoreError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner label="Restoring your session..." />
      </main>
    );
  }
  if (user) return <Navigate to={destination || '/'} replace />;

  const isRegister = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    if (isRegister && !passwordIsStrong(password)) {
      setError('Use 12–128 characters with at least three character types.');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) await register(normalizedEmail, password);
      else await login(normalizedEmail, password);
      navigate(destination || '/', { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof AuthRequestError
          ? requestError.message
          : 'Unable to complete the request. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-atmospheric flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-3"
          aria-label="CodeMind AI"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7667C8] to-[#9B8FE0] text-white shadow-sm shadow-[#7667C8]/25">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-850">CodeMind AI</span>
        </Link>

        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-card sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-850">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {isRegister
                ? 'Start building a clearer understanding of your code.'
                : 'Sign in to continue to your CodeMind workspace.'}
            </p>
          </div>

          {(error || restoreError) && (
            <p
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800"
              role="alert"
            >
              {error || restoreError}
            </p>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                disabled={isSubmitting}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-850 outline-none transition focus:border-[#7667C8] focus:ring-2 focus:ring-[#7667C8]/20"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  maxLength={128}
                  value={password}
                  disabled={isSubmitting}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-12 text-sm text-slate-850 outline-none transition focus:border-[#7667C8] focus:ring-2 focus:ring-[#7667C8]/20"
                  placeholder={isRegister ? 'At least 12 characters' : 'Your password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-800"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {isRegister && (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Use 12–128 characters and at least three character types.
                </p>
              )}
            </div>

            {isRegister && (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  disabled={isSubmitting}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-850 outline-none transition focus:border-[#7667C8] focus:ring-2 focus:ring-[#7667C8]/20"
                />
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
              {isSubmitting
                ? isRegister
                  ? 'Creating account…'
                  : 'Signing in…'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isRegister ? 'Already have an account?' : 'New to CodeMind AI?'}{' '}
            <Link
              to={isRegister ? '/login' : '/register'}
              className="font-semibold text-[#6756B8] hover:text-[#5A49AA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7667C8]"
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
