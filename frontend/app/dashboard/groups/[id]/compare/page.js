'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Loader2, Trophy, Flame, Calendar, Users } from 'lucide-react';
import { cn, getInitials, getScoreColor } from '@/lib/utils';

function getLocalDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftDate(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split('T')[0];
}

const PRESETS = [
  { id: 'this-week', label: 'This week' },
  { id: 'last-week', label: 'Last week' },
  { id: 'this-vs-last', label: 'This week + last' },
  { id: '30d', label: 'Last 30 days' },
];

function rangeForPreset(preset) {
  const today = getLocalDateKey();
  if (preset === 'this-week') return { from: shiftDate(today, -6), to: today };
  if (preset === 'last-week') return { from: shiftDate(today, -13), to: shiftDate(today, -7) };
  if (preset === 'this-vs-last') return { from: shiftDate(today, -13), to: today };
  if (preset === '30d') return { from: shiftDate(today, -29), to: today };
  return { from: shiftDate(today, -6), to: today };
}

export default function GroupComparePage() {
  const { id: groupId } = useParams();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [preset, setPreset] = useState('this-week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getGroup(groupId).then(({ group: g }) => {
      if (cancelled) return;
      setGroup(g);
      const members = (g.memberships || []).map(m => ({ user: m.user, role: m.role }));
      setAllMembers(members);
      const myId = user?.id;
      const others = members.filter(m => m.user.id !== myId).map(m => m.user.id);
      const initial = [...new Set([myId, others[0]].filter(Boolean))].slice(0, 2);
      setSelected(initial);
    }).catch(err => setError(err.message)).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId, user?.id]);

  const range = useMemo(() => rangeForPreset(preset), [preset]);

  useEffect(() => {
    if (!selected.length) { setData(null); return; }
    let cancelled = false;
    setComparing(true);
    api.getGroupCompare(groupId, { members: selected, from: range.from, to: range.to })
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setComparing(false); });
    return () => { cancelled = true; };
  }, [groupId, selected, range.from, range.to]);

  const toggleMember = (uid) => {
    setSelected(prev => {
      if (prev.includes(uid)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter(x => x !== uid);
      }
      if (prev.length >= 4) return prev; // cap
      return [...prev, uid];
    });
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }
  if (error) {
    return <div className="p-6 max-w-3xl mx-auto"><p className="text-red-500">{error}</p></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/groups/${groupId}`} className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-muted hover:text-primary"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Compare members</h1>
          <p className="text-muted text-sm">{group?.name} · pick people and a window</p>
        </div>
      </div>

      {/* Preset row */}
      <div className="p-3 rounded-2xl glass-card">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Window</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.id} type="button" onClick={() => setPreset(p.id)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', preset === p.id ? 'bg-brand-500 text-white' : 'bg-[var(--card-bg)] text-muted hover:text-primary')}>
              {p.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted self-center tabular-nums">{range.from} → {range.to}</span>
        </div>
      </div>

      {/* Member multi-select */}
      <div className="p-3 rounded-2xl glass-card">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Members</span>
          <span className="text-[10px] text-muted ml-auto">{selected.length}/4 selected</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allMembers.map(m => {
            const u = m.user;
            const active = selected.includes(u.id);
            return (
              <button key={u.id} type="button" onClick={() => toggleMember(u.id)}
                className={cn('flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-sm font-medium transition-colors',
                  active ? 'bg-brand-500/15 text-brand-500 ring-1 ring-brand-500/40' : 'bg-[var(--card-bg)] text-muted hover:text-primary')}>
                {u.avatar
                  ? <img src={u.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  : <div className="w-6 h-6 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-[10px] font-bold">{getInitials(u.name)}</div>}
                <span>{u.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {comparing && !data && (
        <div className="py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      )}

      {data && data.members.length > 0 && (
        <>
          {/* Numbers table */}
          <CompareNumbers members={data.members} />

          {/* Daily heatmap rows per member */}
          <CompareHeatmap members={data.members} from={range.from} to={range.to} />

          {/* Per-habit breakdown grid */}
          <CompareHabits members={data.members} />
        </>
      )}
    </div>
  );
}

function CompareNumbers({ members }) {
  const topAvg = Math.max(...members.map(m => m.avg));
  const topCompletions = Math.max(...members.map(m => m.totalCompletions));
  return (
    <section className="rounded-2xl glass-card overflow-hidden">
      <div className="p-4 border-b border-[var(--card-border)]">
        <h2 className="font-bold flex items-center gap-2"><Trophy className="w-4 h-4 text-brand-500" /> Numbers</h2>
      </div>
      <div className="divide-y divide-[var(--card-border)]">
        {members.map(m => (
          <div key={m.userId} className="p-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 min-w-[150px]">
              {m.avatar
                ? <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                : <div className="w-8 h-8 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-xs font-bold">{getInitials(m.name)}</div>}
              <p className="text-sm font-semibold truncate">{m.name}</p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-3 min-w-0">
              <Stat label="Avg" value={`${m.avg}%`} highlight={m.avg === topAvg} color="text-green-500" />
              <Stat label="Completions" value={m.totalCompletions} highlight={m.totalCompletions === topCompletions} color="text-blue-500" />
              <Stat label="Best day" value={m.bestDay ? `${m.bestDay.score}%` : '—'} sub={m.bestDay ? new Date(m.bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''} color="text-amber-500" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value, sub, color, highlight }) {
  return (
    <div className={cn('p-2 rounded-lg', highlight && 'bg-brand-500/10 ring-1 ring-brand-500/30')}>
      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums', color)}>{value}</p>
      {sub && <p className="text-[10px] text-muted truncate">{sub}</p>}
    </div>
  );
}

function CompareHeatmap({ members, from, to }) {
  const days = members[0]?.days || [];

  return (
    <section className="rounded-2xl glass-card overflow-hidden">
      <div className="p-4 border-b border-[var(--card-border)]">
        <h2 className="font-bold">Daily activity</h2>
      </div>
      <div className="p-3 overflow-x-auto">
        <div className="space-y-2 min-w-[480px]">
          {members.map(m => (
            <div key={m.userId} className="flex items-center gap-3">
              <div className="w-32 flex items-center gap-2 shrink-0">
                {m.avatar
                  ? <img src={m.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  : <div className="w-6 h-6 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-[10px] font-bold">{getInitials(m.name)}</div>}
                <p className="text-xs font-medium truncate">{m.name}</p>
              </div>
              <div className="flex-1 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${m.days.length}, 1fr)` }}>
                {m.days.map(d => (
                  <div key={d.date} title={`${d.date}: ${d.applicable === 0 ? 'no habits' : `${d.completed}/${d.applicable} · ${d.score}%`}`}
                    className={cn('aspect-square rounded-sm min-w-[6px]',
                      d.applicable === 0 ? 'bg-[var(--card-bg-hover)]' :
                      d.score >= 80 ? 'bg-green-500' :
                      d.score >= 50 ? 'bg-blue-500' :
                      d.score > 0 ? 'bg-amber-500' :
                      'bg-red-500/30'
                    )} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted">
          <span>{from}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" />≥80%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />≥50%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />&lt;50%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/30" />Missed</span>
          </div>
          <span>{to}</span>
        </div>
      </div>
    </section>
  );
}

function CompareHabits({ members }) {
  // Build a unified habit list (some members may not have all habits)
  const habitMap = {};
  members.forEach(m => {
    m.habits.forEach(h => {
      if (!habitMap[h.title]) habitMap[h.title] = { title: h.title, color: h.color, byMember: {} };
      habitMap[h.title].byMember[m.userId] = h;
    });
  });
  const habits = Object.values(habitMap);
  if (habits.length === 0) return null;

  return (
    <section className="rounded-2xl glass-card overflow-hidden">
      <div className="p-4 border-b border-[var(--card-border)]">
        <h2 className="font-bold">Per-habit</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted">Habit</th>
              {members.map(m => (
                <th key={m.userId} className="text-center p-3 font-semibold text-xs uppercase tracking-wider text-muted min-w-[80px]">{m.name.split(' ')[0]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map(h => {
              const rates = members.map(m => h.byMember[m.userId]?.rate ?? null);
              const max = Math.max(...rates.filter(r => r !== null));
              return (
                <tr key={h.title} className="border-b border-[var(--card-border)] last:border-b-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-5 rounded shrink-0" style={{ backgroundColor: h.color || '#8b5cf6' }} />
                      <span className="font-medium truncate">{h.title}</span>
                    </div>
                  </td>
                  {members.map(m => {
                    const rec = h.byMember[m.userId];
                    if (!rec) return <td key={m.userId} className="text-center p-3 text-muted">—</td>;
                    const isTop = rec.rate === max && rec.applicable > 0;
                    return (
                      <td key={m.userId} className="p-3 text-center">
                        <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold tabular-nums',
                          isTop ? 'bg-brand-500/15 text-brand-500' : 'text-muted')}>
                          <span className={cn(getScoreColor(rec.rate))}>{rec.rate}%</span>
                          <span className="text-[10px] text-muted font-normal">({rec.completed}/{rec.applicable})</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
