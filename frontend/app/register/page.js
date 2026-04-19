'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Target, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.request('/auth/register', { method: 'POST', body: { email, password, name } });
      setRegistered(true);
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Check your email</h1>
          <p className="text-zinc-400 mb-8">
            We sent a verification link to <span className="text-white font-medium">{email}</span>. Click the link to activate your account.
          </p>
          <ResendButton email={email} />
          <p className="mt-6 text-sm text-zinc-500">
            Already verified? <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[var(--card-bg)] border-r border-[var(--card-border)]">
        <div className="max-w-md text-center p-12">
          <div className="w-20 h-20 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-8">
            <Target className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Start Your Journey</h2>
          <p className="text-zinc-400 mb-8">Build habits with accountability partners.</p>
          <div className="space-y-3 text-left">
            {['Track habits with weighted scoring', 'Create accountability groups', 'Compete on leaderboards', 'Visualize with calendar heatmaps'].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">HabitSquad</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Create account</h1>
          <p className="text-zinc-400 mb-8">Start tracking in under a minute</p>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
              </div>
              <p className="mt-2 text-xs text-zinc-500">At least 6 characters</p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl gradient-brand font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-zinc-400">
            Already have an account? <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function ResendButton({ email }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      await api.request('/auth/resend-verification', { method: 'POST', body: { email } });
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <button onClick={handleResend} disabled={sending || sent}
      className="w-full py-3 rounded-xl bg-[var(--card-bg)] text-zinc-400 font-medium hover:bg-[var(--card-bg-hover)] disabled:opacity-50">
      {sending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : sent ? 'Email sent!' : "Didn't get it? Resend"}
    </button>
  );
}
