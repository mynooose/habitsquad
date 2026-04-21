'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Loader2, TrendingUp, Flame, Activity, BarChart3, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PersonalAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getPersonalAnalytics(days).then(res => { if (!cancelled) setData(res); })
      .catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  if (loading && !data) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }
  if (!data) return null;

  const maxWeekdayCount = Math.max(...data.weekdayBreakdown.map(w => w.count), 1);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-muted hover:text-primary"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Your Analytics</h1>
          <p className="text-muted text-sm">Your last {data.days} days at a glance</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--card-bg)]">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', days === d ? 'bg-brand-500 text-white' : 'text-muted hover:text-primary')}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Pulse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Today" value={`${data.todayScore}%`} />
        <KpiCard label="7-day avg" value={`${data.weekAvg}%`} />
        <KpiCard label="Show-up streak" value={`${data.showUpStreak.current}d`} accent="text-orange-400" icon={<Flame className="w-4 h-4" />} />
        <KpiCard label="Longest" value={`${data.showUpStreak.longest}d`} />
      </div>

      {/* Heatmap */}
      <div className="p-5 rounded-2xl glass-card">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Daily Activity</h2>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(data.history.length, data.days)}, 1fr)` }}>
          {data.history.map((h, idx) => {
            const isLast = idx === data.history.length - 1;
            const pending = isLast && h.totalCount > 0 && h.completedCount === 0;
            return (
              <div key={h.date} title={`${h.date}: ${pending ? 'In progress' : `${h.completedCount}/${h.totalCount} · ${h.score}%`}`}
                className={cn('aspect-square rounded-sm min-w-[6px]',
                  pending ? 'bg-[var(--card-bg-hover)] border border-dashed border-blue-400' :
                  h.totalCount === 0 ? 'bg-[var(--card-bg-hover)]' :
                  h.score >= 80 ? 'bg-green-500' :
                  h.score >= 50 ? 'bg-blue-500' :
                  h.score > 0 ? 'bg-amber-500' :
                  'bg-red-500/30'
                )} />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-muted">
          <span>{data.history[0]?.date}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" />≥80%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" />≥50%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" />&lt;50%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/30" />Missed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-dashed border-blue-400" />Today</span>
          </div>
          <span>{data.history[data.history.length - 1]?.date}</span>
        </div>
      </div>

      {/* Habit breakdown */}
      {data.habitBreakdown.length > 0 && (
        <div className="p-5 rounded-2xl glass-card">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Habit Breakdown</h2>
          <div className="space-y-3">
            {data.habitBreakdown.map(h => (
              <div key={h.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-4 rounded shrink-0" style={{ backgroundColor: h.color || '#8b5cf6' }} />
                    <span className="text-sm font-medium truncate">{h.title}</span>
                  </div>
                  <span className="text-xs text-muted shrink-0">{h.completions}/{h.applicableDays} · <span className="font-bold text-primary">{h.completionRate}%</span></span>
                </div>
                <div className="h-2 rounded-full bg-[var(--card-bg-hover)] overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all',
                    h.completionRate >= 80 ? 'bg-green-500' :
                    h.completionRate >= 50 ? 'bg-blue-500' :
                    h.completionRate > 0 ? 'bg-amber-500' :
                    'bg-red-500/30')}
                    style={{ width: `${Math.max(h.completionRate, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekday breakdown */}
      <div className="p-5 rounded-2xl glass-card">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> When You're Most Active</h2>
        <div className="flex items-end justify-between gap-2 h-28">
          {data.weekdayBreakdown.map(w => {
            const pct = (w.count / maxWeekdayCount) * 100;
            const isTop = w.day === data.mostActiveWeekday;
            return (
              <div key={w.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end" style={{ height: '80px' }}>
                  <div className={cn('w-full rounded-md transition-all',
                    isTop ? 'bg-gradient-to-t from-brand-500 to-purple-500' : 'bg-[var(--card-bg-hover)]')}
                    style={{ height: `${Math.max(pct, 4)}%` }} title={`${w.count} completions`} />
                </div>
                <span className={cn('text-xs', isTop ? 'font-bold text-brand-500' : 'text-muted')}>{w.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Best day */}
      {data.bestDay && (
        <div className="p-5 rounded-2xl glass-card bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Best day in window</p>
              <p className="text-lg font-bold">{new Date(data.bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · <span className="text-yellow-500">{data.bestDay.score}%</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent, icon }) {
  return (
    <div className="p-4 rounded-2xl glass-card">
      <p className="text-xs uppercase tracking-wider text-muted mb-1 flex items-center gap-1.5">{icon}{label}</p>
      <p className={cn('text-2xl font-black', accent || 'text-primary')}>{value}</p>
    </div>
  );
}
