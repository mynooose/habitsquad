'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Loader2, TrendingUp, Flame, Activity, BarChart3, Trophy, CheckCircle2, Clock } from 'lucide-react';
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
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-muted hover:text-primary"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Your Analytics</h1>
          <p className="text-muted text-sm">Your last {data.days} days at a glance</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--card-bg)]">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', days === d ? 'bg-brand-500 text-white shadow' : 'text-muted hover:text-primary')}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Pulse — colored tiles */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PulseTile color="blue" icon={<Activity className="w-5 h-5" />} label="Today" value={`${data.todayScore}%`} sub={data.todayScore === 0 ? 'Not started yet' : 'today so far'} />
          <PulseTile color="purple" icon={<TrendingUp className="w-5 h-5" />} label="7-day avg" value={`${data.weekAvg}%`} sub="scored days only" />
          <PulseTile color="orange" icon={<Flame className="w-5 h-5" />} label="Show-up streak" value={`${data.showUpStreak.current}d`} sub={data.showUpStreak.current === 1 ? 'day in a row' : 'days in a row'} />
          <PulseTile color="green" icon={<CheckCircle2 className="w-5 h-5" />} label="Longest" value={`${data.showUpStreak.longest}d`} sub={`${data.totalCompletions} total completions`} />
        </div>
      </section>

      {/* Heatmap */}
      <section>
        <div className="p-5 rounded-2xl glass-card">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-500" /> Daily Activity</h2>
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
          <div className="flex items-center justify-between mt-4 text-xs text-muted flex-wrap gap-2">
            <span className="tabular-nums">{data.history[0]?.date}</span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 justify-center">
              <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-green-500" />≥80%</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-blue-500" />≥50%</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-amber-500" />&lt;50%</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-red-500/30" />Missed</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm border border-dashed border-blue-400" />Today</span>
            </div>
            <span className="tabular-nums">{data.history[data.history.length - 1]?.date}</span>
          </div>
        </div>
      </section>

      {/* Habit breakdown */}
      {data.habitBreakdown.length > 0 && (
        <section>
          <div className="p-5 rounded-2xl glass-card">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-brand-500" /> Habit Breakdown</h2>
            <div className="space-y-4">
              {data.habitBreakdown.map(h => (
                <div key={h.id}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-5 rounded shrink-0" style={{ backgroundColor: h.color || '#8b5cf6' }} />
                      <span className="text-sm font-semibold truncate">{h.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted tabular-nums">{h.completions}/{h.applicableDays}</span>
                      <span className={cn('text-sm font-black tabular-nums',
                        h.completionRate >= 80 ? 'text-green-500' :
                        h.completionRate >= 50 ? 'text-blue-500' :
                        h.completionRate > 0 ? 'text-amber-500' :
                        'text-muted')}>{h.completionRate}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--card-bg-hover)] overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all',
                      h.completionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                      h.completionRate >= 50 ? 'bg-gradient-to-r from-blue-500 to-sky-400' :
                      h.completionRate > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                      'bg-red-500/30')}
                      style={{ width: `${Math.max(h.completionRate, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Weekday breakdown */}
      <section>
        <div className="p-5 rounded-2xl glass-card">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-brand-500" /> When You're Most Active</h2>
          <div className="flex items-end justify-between gap-2 h-32">
            {data.weekdayBreakdown.map(w => {
              const pct = (w.count / maxWeekdayCount) * 100;
              const isTop = w.day === data.mostActiveWeekday;
              return (
                <div key={w.day} className="flex-1 flex flex-col items-center gap-2">
                  <span className={cn('text-[10px] font-bold tabular-nums', isTop ? 'text-brand-500' : 'text-muted')}>{w.count}</span>
                  <div className="w-full flex items-end" style={{ height: '88px' }}>
                    <div className={cn('w-full rounded-md transition-all',
                      isTop ? 'bg-gradient-to-t from-brand-500 to-purple-500 shadow-md shadow-brand-500/20' :
                      w.count > 0 ? 'bg-gradient-to-t from-[var(--card-bg-hover)] to-[var(--card-bg)] border border-[var(--card-border)]' :
                      'bg-[var(--card-bg-hover)]')}
                      style={{ height: `${Math.max(pct, 4)}%` }} title={`${w.count} completions`} />
                  </div>
                  <span className={cn('text-xs', isTop ? 'font-bold text-brand-500' : 'text-muted')}>{w.day}</span>
                </div>
              );
            })}
          </div>
          {data.mostActiveWeekday && (
            <p className="text-xs text-muted text-center mt-3">Peak day: <span className="font-bold text-brand-500">{data.mostActiveWeekday}</span></p>
          )}
        </div>
      </section>

      {/* Best day */}
      {data.bestDay && (
        <section>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-400/15 to-amber-500/5 border border-yellow-500/30 shadow-lg shadow-yellow-500/5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md shadow-yellow-500/30">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Best day in window</p>
                <p className="text-lg font-bold">{new Date(data.bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
              <p className="text-3xl font-black text-yellow-500 tabular-nums">{data.bestDay.score}%</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PulseTile({ color, icon, label, value, sub }) {
  const colorMap = {
    blue:   { bg: 'from-blue-500/10 to-sky-500/5',       ring: 'border-blue-500/20',   fg: 'text-blue-500' },
    purple: { bg: 'from-purple-500/10 to-indigo-500/5',  ring: 'border-purple-500/20', fg: 'text-purple-500' },
    green:  { bg: 'from-emerald-500/10 to-green-500/5',  ring: 'border-emerald-500/20', fg: 'text-emerald-500' },
    orange: { bg: 'from-orange-500/10 to-amber-500/5',   ring: 'border-orange-500/20', fg: 'text-orange-500' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={cn('p-4 rounded-2xl border bg-gradient-to-br', c.bg, c.ring)}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-8 h-8 rounded-xl bg-white/80 dark:bg-white/5 flex items-center justify-center', c.fg)}>{icon}</div>
        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-black tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
