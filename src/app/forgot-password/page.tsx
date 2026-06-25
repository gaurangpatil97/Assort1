'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }

      setSuccess(true);
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
          <h2 className="mt-2 text-center text-h2 font-display text-on-surface">Reset your password</h2>
          <p className="mt-2 text-center text-body-md text-on-surface-variant">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        {success ? (
          <div className="mt-8 space-y-6">
            <div className="bg-tertiary-fixed text-on-tertiary-fixed-variant p-4 rounded-lg border border-tertiary-fixed-dim">
              <p className="text-sm font-label-sm">If an account exists with that email, we have sent a password reset link.</p>
            </div>
            <div className="text-center text-sm w-full">
              <Link href="/login" className="font-label-md text-primary hover:text-primary-container hover:underline transition-colors block py-2">
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
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
                {loading ? 'Sending link...' : 'Send reset link'}
              </button>
            </div>
            
            <div className="text-center text-sm mt-4 w-full">
              <Link href="/login" className="font-label-md text-on-surface-variant hover:text-on-surface transition-colors block py-2">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
