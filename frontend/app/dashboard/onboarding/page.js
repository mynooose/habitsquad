'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Target, CheckCircle2, Circle, Loader2, ArrowRight, Sparkles, Droplets, BookOpen, Dumbbell, Footprints, Moon, PenLine, Brain, Coffee, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEMPLATES = [
  { key: 'water', title: 'Drink 2L of water', icon: Droplets, color: '#3b82f6' },
  { key: 'meditate', title: 'Meditate 10 min', icon: Brain, color: '#8b5cf6' },
  { key: 'read', title: 'Read 20 min', icon: BookOpen, color: '#f59e0b' },
  { key: 'exercise', title: 'Exercise 30 min', icon: Dumbbell, color: '#ef4444' },
  { key: 'steps', title: 'Walk 10,000 steps', icon: Footprints, color: '#10b981' },
  { key: 'sleep', title: 'Sleep by 11 PM', icon: Moon, color: '#6366f1' },
  { key: 'journal', title: 'Journal for 5 min', icon: PenLine, color: '#ec4899' },
  { key: 'nocaffeine', title: 'No caffeine after 2 PM', icon: Coffee, color: '#a16207' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, checkAuth } = useAuth();
  const [picked, setPicked] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('templates'); // 'templates' | 'group'

  const toggle = (key) => {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const saveTemplates = async (skipTasks = false) => {
    setSaving(true);
    setError('');
    try {
      if (!skipTasks && picked.size > 0) {
        const chosen = TEMPLATES.filter(t => picked.has(t.key));
        const base = Math.floor(100 / chosen.length);
        const remainder = 100 - base * chosen.length;
        for (let i = 0; i < chosen.length; i++) {
          const t = chosen[i];
          const weight = base + (i === chosen.length - 1 ? remainder : 0);
          await api.createTask({ title: t.title, frequency: 'DAILY', weightage: weight, color: t.color });
        }
      }
      await api.updateProfile({ onboardedAt: new Date().toISOString() });
      await checkAuth();
      setStep('group'); // continue to the social-onboarding step
    } catch (err) {
      setError(err.message || 'Failed to set up habits');
    } finally {
      setSaving(false);
    }
  };

  const finishToDashboard = () => router.push('/dashboard');
  const goCreateGroup = () => router.push('/dashboard/new');

  return (
    <div className="min-h-screen py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center">
            {step === 'templates' ? <Sparkles className="w-6 h-6 text-white" /> : <Users className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              {step === 'templates'
                ? <>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</>
                : 'Better with friends'}
            </h1>
            <p className="text-muted">
              {step === 'templates'
                ? 'Pick a few habits to get started. You can always add more later.'
                : 'HabitSquad shines when you keep each other accountable. Set up a group now?'}
            </p>
          </div>
        </div>

        {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        {step === 'templates' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {TEMPLATES.map(t => {
                const isPicked = picked.has(t.key);
                const Icon = t.icon;
                return (
                  <button key={t.key} type="button" onClick={() => toggle(t.key)}
                    className={cn('flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left',
                      isPicked
                        ? 'border-brand-500 bg-brand-500/10 shadow-sm'
                        : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-brand-500/50')}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: t.color + '22', color: t.color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 font-medium">{t.title}</span>
                    {isPicked ? <CheckCircle2 className="w-5 h-5 text-brand-500" /> : <Circle className="w-5 h-5 text-muted" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <button onClick={() => saveTemplates(true)} disabled={saving}
                className="text-sm text-muted hover:text-primary underline-offset-4 hover:underline">
                Skip for now — I'll add my own
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">{picked.size} selected</span>
                <button onClick={() => saveTemplates(false)} disabled={saving || picked.size === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-semibold hover:opacity-90 disabled:opacity-40">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'group' && (
          <div className="space-y-4">
            <button onClick={goCreateGroup}
              className="w-full p-6 rounded-3xl gradient-brand text-white text-left transition-all hover:opacity-95 shadow-lg shadow-brand-500/20">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-xl">Create a group</p>
                  <p className="text-sm text-white/80 mt-0.5">Invite friends and turn habits into a shared streak. You can always do this later.</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white shrink-0 mt-2" />
              </div>
            </button>
            <button onClick={finishToDashboard}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-sm font-medium text-muted hover:text-primary">
              Maybe later — take me to my dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
