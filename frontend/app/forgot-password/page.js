'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Target, Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">HabitSquad</span>
        </Link>

        {submitted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-muted mb-6">If <span className="text-primary font-medium">{email}</span> is registered, a reset link is on the way. It expires in 1 hour.</p>
            <Link href="/login" className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2">Forgot password?</h1>
            <p className="text-muted mb-8">Enter your email and we'll send you a link to reset it.</p>

            {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl gradient-brand font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send reset link <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="mt-8 text-center text-muted">
              Remembered it? <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
