'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Target, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const { checkAuth } = useAuth();

  const [status, setStatus] = useState('loading'); // loading, success, error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      return;
    }

    api.request(`/auth/verify?token=${token}`)
      .then(async (data) => {
        if (data.token) {
          api.setToken(data.token);
          await checkAuth();
        }
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Verification failed');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">HabitSquad</span>
        </Link>

        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Verifying your email...</h1>
            <p className="text-zinc-400">Just a moment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-xl font-bold mb-2">Email verified!</h1>
            <p className="text-zinc-400 mb-6">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold mb-2">Verification failed</h1>
            <p className="text-zinc-400 mb-6">{error}</p>
            <Link href="/login" className="inline-block px-6 py-3 rounded-xl gradient-brand font-semibold hover:opacity-90">
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
