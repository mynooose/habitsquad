'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Target, Loader2, Users, AlertTriangle, ArrowRight } from 'lucide-react';

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}>
      <JoinContent />
    </Suspense>
  );
}

function JoinContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const [status, setStatus] = useState('idle'); // idle, joining, success, error
  const [error, setError] = useState('');
  const [groupId, setGroupId] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      // Stash code, send through login then back here
      if (code) sessionStorage.setItem('pendingJoinCode', code);
      router.replace(`/login?next=${encodeURIComponent(`/join${code ? `?code=${code}` : ''}`)}`);
      return;
    }
    if (!code) {
      setStatus('error');
      setError('No invite code in link');
      return;
    }
    setStatus('joining');
    api.joinGroup(code)
      .then((res) => {
        setGroupId(res.group?.id || null);
        setStatus('success');
        setTimeout(() => router.push(res.group?.id ? `/dashboard/groups/${res.group.id}` : '/dashboard/groups'), 1500);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Could not join group');
      });
  }, [code, isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">HabitSquad</span>
        </Link>

        {(status === 'idle' || status === 'joining') && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Joining group…</h1>
            <p className="text-muted">Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5">
              <Users className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">You're in!</h1>
            <p className="text-muted mb-6">Taking you to the group…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold mb-2">Couldn't join</h1>
            <p className="text-muted mb-6">{error}</p>
            <Link href="/dashboard/groups" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-semibold hover:opacity-90">
              Go to Groups <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
