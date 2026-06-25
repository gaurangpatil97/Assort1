'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      if (data.companyId === null) {
        router.push('/superadmin/dashboard');
      } else if (data.baseLevel === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[480px] sm:min-w-[420px] space-y-8 bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-lg border border-outline-variant">
        <div>
          <h2 className="mt-2 text-center text-h2 font-display text-on-surface">Sign in to your account</h2>
        </div>
        
        {message && (
          <div className="bg-tertiary-fixed text-on-tertiary-fixed-variant p-4 mb-4 rounded-lg border border-tertiary-fixed-dim">
            <p className="text-sm font-label-sm">{message}</p>
          </div>
        )}

        <form className="mt-8 space-y-6 w-full" onSubmit={handleSubmit}>
          <div className="space-y-4 w-full">
            <div className="w-full">
              <label htmlFor="email-address" className="block text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-outline-variant placeholder-outline text-on-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container bg-surface-container-low transition-all font-body-md"
                placeholder="you@company.com"
              />
            </div>
            <div className="w-full">
              <label htmlFor="password" className="block text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 pr-12 border border-outline-variant placeholder-outline text-on-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container bg-surface-container-low transition-all font-body-md"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface focus:outline-none flex items-center justify-center"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/forgot-password" className="font-label-md text-primary hover:text-primary-container hover:underline transition-colors">
                Forgot your password?
              </Link>
            </div>
          </div>

          {error && (
            <div className="text-sm text-error bg-error-container p-3 rounded-lg border border-error">
              {error}
            </div>
          )}

          <div className="w-full">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex justify-center items-center py-2 px-4 border border-transparent font-label-md rounded-lg text-white bg-primary-container hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
