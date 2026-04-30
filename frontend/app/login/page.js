'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Target, Mail, Lock, ArrowRight, Loader2, Phone, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [mode, setMode] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStage, setOtpStage] = useState('phone'); // 'phone' | 'code'
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { login, checkAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  const goNext = () => router.push(next && next.startsWith('/') ? next : '/dashboard');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10,12}$/.test(phone.replace(/\D/g, ''))) {
      setError('Enter a valid mobile number');
      return;
    }
    setLoading(true);
    try {
      await api.sendPhoneOtp(phone);
      setOtpStage('code');
      setOtpCooldown(30);
      const t = setInterval(() => setOtpCooldown(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; }), 1000);
    } catch (err) {
      setError(err.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.verifyPhoneOtp(phone, otp);
      await checkAuth();
      goNext();
    } catch (err) {
      setError(err.message || 'Could not verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);
    try {
      await login(email, password);
      router.push(next && next.startsWith('/') ? next : '/dashboard');
    } catch (err) {
      if (err.message?.includes('verify your email')) {
        setUnverified(true);
        setError('Please verify your email before logging in.');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.request('/auth/resend-verification', { method: 'POST', body: { email } });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">HabitSquad</span>
          </Link>

          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted mb-6">Sign in to continue tracking</p>

          {/* Mode tabs */}
          <div className="flex items-center gap-1 p-1 mb-6 rounded-xl bg-[var(--card-bg)]">
            <button type="button" onClick={() => { setMode('email'); setError(''); }}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2', mode === 'email' ? 'bg-brand-500 text-white shadow' : 'text-muted hover:text-primary')}>
              <Mail className="w-4 h-4" /> Email
            </button>
            <button type="button" onClick={() => { setMode('phone'); setError(''); }}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2', mode === 'phone' ? 'bg-brand-500 text-white shadow' : 'text-muted hover:text-primary')}>
              <Phone className="w-4 h-4" /> Phone
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
              {unverified && (
                <button onClick={handleResend} disabled={resending || resent}
                  className="mt-2 block w-full py-2 rounded-lg bg-red-500/10 text-red-300 text-sm font-medium hover:bg-red-500/20 disabled:opacity-50">
                  {resending ? 'Sending...' : resent ? 'Verification email sent!' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          {mode === 'email' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Password</label>
                  <Link href="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 font-medium">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl gradient-brand font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {mode === 'phone' && otpStage === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Mobile number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">+91</span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" required minLength={10}
                    className="w-full pl-14 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
                </div>
                <p className="text-xs text-muted mt-1.5">We'll text you a 6-digit code. New here? An account is created automatically.</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl gradient-brand font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send code <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {mode === 'phone' && otpStage === 'code' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Verification code</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input type="text" inputMode="numeric" pattern="\d*" maxLength={6} value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code" required minLength={4}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500 tracking-widest text-center font-mono text-lg" />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted">
                  <button type="button" onClick={() => { setOtpStage('phone'); setOtp(''); setError(''); }} className="hover:text-primary">← Change number</button>
                  <button type="button" onClick={handleSendOtp} disabled={otpCooldown > 0 || loading}
                    className="text-brand-400 hover:text-brand-300 font-medium disabled:text-muted disabled:cursor-not-allowed">
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading || otp.length < 4}
                className="w-full py-3 rounded-xl gradient-brand font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & sign in <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-muted">
            Don't have an account? <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium">Create one</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[var(--card-bg)] border-l border-[var(--card-border)]">
        <div className="max-w-md text-center p-12">
          <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-8">
            <Target className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Track. Compete. Grow.</h2>
          <p className="text-muted">Join your squad and build habits that stick.</p>
        </div>
      </div>
    </div>
  );
}
