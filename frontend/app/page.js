'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Target, Users, TrendingUp, Calendar, ArrowRight, CheckCircle2, Sparkles, Zap, Trophy } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="blob w-[500px] h-[500px] bg-indigo-400 top-[-200px] left-[-200px]" />
      <div className="blob w-[600px] h-[600px] bg-purple-400 top-[20%] right-[-300px]" />
      <div className="blob w-[400px] h-[400px] bg-pink-400 bottom-[-100px] left-[30%]" />

      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--card-border)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-pop">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">HabitSquad</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted hover:text-primary transition-colors px-4 py-2">Sign in</Link>
            <Link href="/register" className="btn-primary px-5 py-2.5 text-sm font-semibold flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="pt-32 md:pt-40 pb-20 px-6 relative">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-indigo-500/20 text-indigo-500 text-sm mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-medium">Build habits with your squad</span>
          </div>

          <h1 className="display text-5xl md:text-7xl lg:text-8xl font-black leading-[1.05] mb-6 animate-slide-up">
            Transform Your <br />
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Daily Habits</span>
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Track daily habits, create accountability groups, and compete on leaderboards.
            The social pressure you need to stick to your goals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link href="/register" className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base font-semibold flex items-center justify-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-ghost w-full sm:w-auto px-8 py-3.5 text-base font-semibold flex items-center justify-center gap-2">
              Sign In
            </Link>
          </div>

          <div className="hidden md:flex absolute left-8 top-[45%] soft-card p-4 pr-5 gap-3 items-center animate-float" style={{ animationDelay: '0.5s' }}>
            <div className="flex -space-x-2">
              {['#6366f1', '#8b5cf6', '#ec4899'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="text-left">
              <p className="text-lg font-black">2.5k+</p>
              <p className="text-xs text-muted">Active users</p>
            </div>
          </div>

          <div className="hidden md:flex absolute right-8 top-[50%] soft-card p-4 gap-3 items-center animate-float" style={{ animationDelay: '1s' }}>
            <div className="w-10 h-10 rounded-xl gradient-success flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-black">89%</p>
              <p className="text-xs text-muted">Success rate</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="soft-card p-8 md:p-12 relative overflow-hidden">
            <div className="blob w-[300px] h-[300px] bg-indigo-400 -top-20 -right-20 opacity-40" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-black text-center mb-3">
                Success across <span className="text-indigo-500">every habit</span>
              </h2>
              <p className="text-muted text-center mb-10 max-w-xl mx-auto">
                Join thousands of people transforming their lives with accountability partners.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                  { value: '2.5k+', label: 'Active users', bg: 'bento-indigo' },
                  { value: '150k', label: 'Habits tracked', bg: 'bento-purple' },
                  { value: '89%', label: 'Success rate', bg: 'bento-green' },
                  { value: '500+', label: 'Groups active', bg: 'bento-orange' },
                ].map((s, i) => (
                  <div key={i} className={`p-5 md:p-6 rounded-2xl ${s.bg}`}>
                    <p className="text-3xl md:text-4xl font-black mb-1">{s.value}</p>
                    <p className="text-xs md:text-sm opacity-70 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-3xl md:text-5xl font-black">Everything you need</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: CheckCircle2, title: 'Daily Tracking', desc: 'Mark habits complete with weighted scoring.', bg: 'bento-green' },
              { icon: Calendar, title: 'Calendar View', desc: 'Visualize progress with heatmaps.', bg: 'bento-blue' },
              { icon: Users, title: 'Groups', desc: 'Create accountability squads.', bg: 'bento-purple' },
              { icon: Trophy, title: 'Leaderboards', desc: 'Compete with your squad.', bg: 'bento-orange' },
            ].map((f, i) => (
              <div key={i} className={`soft-card p-6 ${f.bg}`}>
                <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm opacity-70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 md:p-12 rounded-[32px] gradient-brand text-white relative overflow-hidden text-center">
            <div className="blob w-[300px] h-[300px] bg-white/20 -top-20 -left-20" />
            <div className="blob w-[300px] h-[300px] bg-pink-300 -bottom-20 -right-20" />
            <div className="relative">
              <Zap className="w-8 h-8 mx-auto mb-4 text-yellow-300" />
              <h2 className="text-3xl md:text-5xl font-black mb-4">Ready to build better habits?</h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">Join HabitSquad free and find your accountability partner today.</p>
              <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-indigo-600 rounded-full font-bold hover:scale-105 transition-transform">
                Start Free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
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
          <p className="text-sm text-muted">© {new Date().getFullYear()} HabitSquad</p>
        </div>
      </footer>
    </div>
  );
}
