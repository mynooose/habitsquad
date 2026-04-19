'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Target, Users, TrendingUp, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--card-border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">HabitSquad</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-sm font-medium transition-colors">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Track habits with your squad
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Build Habits with <span className="text-brand-400">Accountability</span>
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Track daily habits, create accountability groups, and compete on leaderboards. The social pressure you need to stick to your goals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto px-8 py-3 rounded-xl gradient-brand text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90">
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] font-semibold hover:bg-[var(--card-bg-hover)]">Sign In</Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-[var(--card-border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: CheckCircle2, title: 'Daily Tracking', desc: 'Mark habits complete with weighted scoring.', color: 'text-green-400' },
              { icon: Calendar, title: 'Calendar View', desc: 'Visualize progress with heatmaps.', color: 'text-blue-400' },
              { icon: Users, title: 'Groups', desc: 'Create accountability squads.', color: 'text-purple-400' },
              { icon: TrendingUp, title: 'Leaderboards', desc: 'Compete with your squad.', color: 'text-orange-400' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl glass-card">
                <div className={`w-12 h-12 rounded-xl bg-[var(--card-bg-hover)] flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-[var(--card-border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-brand flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium">HabitSquad</span>
          </div>
          <p className="text-sm text-zinc-500">© {new Date().getFullYear()} HabitSquad</p>
        </div>
      </footer>
    </div>
  );
}
