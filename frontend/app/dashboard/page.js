'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, CheckCircle2, Circle, Flame, Target, Trophy, ArrowUp, ArrowDown, Edit2, Loader2, ChevronRight, ChevronLeft, Minus, Zap, Camera, X, BarChart3, Info, ImagePlus, Clock, MessageSquare, Pencil, Check, Sparkles } from 'lucide-react';
import { cn, formatDate, getScoreColor, getFrequencyLabel, TASK_COLORS, formatDeadline, isPastDeadline } from '@/lib/utils';

function getLocalDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [weekEnd, setWeekEnd] = useState(() => getLocalDateKey());
  const [weekData, setWeekData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [proofTask, setProofTask] = useState(null);
  const [viewProof, setViewProof] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, groupsRes, statsRes, rankRes] = await Promise.all([
        api.getTasks({ active: 'true' }),
        api.getGroups(),
        api.getDashboardStats(),
        api.getDashboardRankings(),
      ]);
      setTasks(tasksRes.tasks || []);
      setGroups(groupsRes.groups || []);
      setDashStats(statsRes);
      setRankings(rankRes);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    api.getWeek(weekEnd).then(res => { if (!cancelled) setWeekData(res); }).catch(() => {});
    return () => { cancelled = true; };
  }, [weekEnd]);

  const shiftWeek = (deltaDays) => {
    const d = new Date(weekEnd + 'T12:00:00');
    d.setDate(d.getDate() + deltaDays);
    const todayKey = getLocalDateKey();
    const newKey = getLocalDateKey(d);
    setWeekEnd(newKey > todayKey ? todayKey : newKey);
  };
  const atToday = weekEnd === getLocalDateKey();

  const handleToggle = async (task, proofUrl = null) => {
    if (!task.completedToday && task.requiresProof && !proofUrl) {
      setProofTask(task);
      return;
    }
    if (!task.completedToday && task.deadlineTime && isPastDeadline(task.deadlineTime)) {
      alert(`Deadline (${task.deadlineTime}) has passed for "${task.title}". You can't mark it done today.`);
      return;
    }
    setCompleting(task.id);
    try {
      if (task.completedToday) {
        await api.uncompleteTask(task.id);
      } else {
        await api.completeTask(task.id, null, proofUrl);
      }
      await fetchData();
    } catch (error) {
      alert(error.message || 'Failed to save');
    } finally {
      setCompleting(null);
      setProofTask(null);
    }
  };

  const handleSaveRemark = async (task, remark) => {
    if (!task.completionId) return;
    try {
      await api.updateRemark(task.completionId, remark);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, remark: remark.trim() || null } : t));
    } catch (e) {
      console.error('Failed to save remark:', e);
    }
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  const personalTasks = tasks.filter(t => !t.groupId);
  const groupedTasks = groups.map(g => ({ group: g, tasks: tasks.filter(t => t.groupId === g.id) })).filter(g => g.tasks.length > 0);

  const score = dashStats?.today?.score || 0;
  const delta = dashStats?.delta || 0;

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">{greeting}, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-muted mt-0.5">{formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link href="/dashboard/new" className="btn-primary px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add New
        </Link>
      </div>

      {/* Hero Score */}
      <div className="p-8 rounded-[28px] gradient-brand text-white mb-5 relative overflow-hidden shadow-pop">
        <div className="blob w-[300px] h-[300px] bg-white/20 -top-20 -right-20" />
        <div className="blob w-[200px] h-[200px] bg-pink-300 -bottom-10 -left-10 opacity-40" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white/70 uppercase tracking-wider">Today's Score</span>
            {delta !== 0 && (
              <div className={cn('flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold', delta > 0 ? 'bg-white/20 text-white' : 'bg-red-500/30 text-red-100')}>
                {delta > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {delta > 0 ? '+' : ''}{delta}% vs yesterday
              </div>
            )}
          </div>
          <div className="flex items-end gap-3 mb-4">
            <span className="text-6xl md:text-7xl font-black tabular-nums text-white">{score}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden mb-2">
            <div className="h-full rounded-full bg-white/80 transition-all duration-700" style={{ width: `${score}%` }} />
          </div>
          <div className="flex justify-between text-xs text-white/60">
            <span>{dashStats?.today?.completedTasks || 0}/{dashStats?.today?.totalTasks || 0} habits done</span>
            <span>{dashStats?.today?.totalWeight || 0} pts allocated</span>
          </div>
        </div>
      </div>

      {/* Show-up Streak + 7-day activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Show-up Streak */}
        <div className="p-5 rounded-[24px] soft-card bento-orange relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-orange flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Show-up Streak</span>
            </div>
            <div className="relative group/info">
              <Info className="w-4 h-4 text-muted opacity-60 cursor-help" />
              <div className="absolute right-0 top-6 w-60 p-2.5 rounded-lg bg-[var(--card-bg-solid)] border border-[var(--card-border)] text-[11px] text-muted opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                Days in a row you completed at least one task. Keep showing up — momentum matters more than perfection.
              </div>
            </div>
          </div>
          <div className="flex items-end gap-1 mb-3">
            <span className="text-4xl font-black text-orange-400">{dashStats?.showUpStreak?.current || 0}</span>
            <span className="text-sm text-muted mb-1.5">day{(dashStats?.showUpStreak?.current || 0) === 1 ? '' : 's'} in a row</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Longest</span>
            <span className="font-bold">{dashStats?.showUpStreak?.longest || 0} days</span>
          </div>
        </div>

        {/* 7-day activity chart */}
        {(() => {
          const days = weekData?.days || [];
          const weekAvg = days.length ? Math.round(days.reduce((s, d) => s + d.score, 0) / days.length) : 0;
          return (
            <div className="p-5 rounded-[24px] soft-card bento-blue">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">7 Days</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => shiftWeek(-7)} className="p-1 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted" title="Previous week">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-muted font-semibold min-w-[3.5rem] text-center">{weekAvg}% avg</span>
                  <button onClick={() => shiftWeek(7)} disabled={atToday} className="p-1 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted disabled:opacity-30 disabled:cursor-not-allowed" title="Next week">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-20 mb-2">
                {days.map((d) => {
                  const todayKey = getLocalDateKey();
                  const isToday = d.date === todayKey;
                  const isFuture = d.date > todayKey;
                  const dateObj = new Date(d.date + 'T12:00:00');
                  const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });
                  const longLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 relative group/bar">
                      <div className="relative w-full flex items-end cursor-pointer" style={{ height: '56px' }}
                        onClick={() => !isFuture && router.push(`/dashboard/calendar?date=${d.date}`)}>
                        <div
                          className={cn(
                            'w-full rounded-md transition-all',
                            isFuture ? 'bg-[var(--card-bg-hover)] opacity-40' :
                            d.score >= 80 ? 'bg-gradient-to-t from-green-500 to-green-400 group-hover/bar:brightness-110' :
                            d.score >= 50 ? 'bg-gradient-to-t from-blue-500 to-blue-400 group-hover/bar:brightness-110' :
                            d.score > 0 ? 'bg-gradient-to-t from-amber-500 to-amber-400 group-hover/bar:brightness-110' :
                            'bg-[var(--card-bg-hover)] group-hover/bar:bg-[var(--card-bg-solid)]',
                            isToday && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[var(--card-bg)]'
                          )}
                          style={{ height: `${Math.max(d.score, 4)}%` }}
                        />
                      </div>
                      <span className={cn('text-[10px] font-semibold', isToday ? 'text-blue-400' : isFuture ? 'text-muted opacity-40' : 'text-muted')}>{dayLabel}</span>
                      {/* Hover tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[160px] p-2.5 rounded-lg bg-[var(--card-bg-solid)] border border-[var(--card-border)] shadow-lg text-[11px] opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-20">
                        <p className="font-semibold mb-1">{longLabel}{isToday && ' (today)'}</p>
                        {isFuture ? (
                          <p className="text-muted italic">Upcoming</p>
                        ) : d.totalTasks === 0 ? (
                          <p className="text-muted italic">No habits scheduled</p>
                        ) : (
                          <>
                            <p className="text-muted mb-1.5">{d.completedTasks}/{d.totalTasks} done &middot; <span className="font-bold text-primary">{d.score}%</span></p>
                            <div className="space-y-0.5 max-h-24 overflow-hidden">
                              {(d.tasks || []).slice(0, 5).map(t => (
                                <div key={t.id} className="flex items-center gap-1.5">
                                  {t.completed ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> : <Circle className="w-3 h-3 text-muted shrink-0" />}
                                  <span className={cn('truncate', t.completed && 'text-muted line-through')}>{t.title}</span>
                                </div>
                              ))}
                              {(d.tasks || []).length > 5 && <p className="text-muted italic">+{d.tasks.length - 5} more</p>}
                            </div>
                          </>
                        )}
                        <p className="text-muted italic mt-1.5 text-[10px]">Click for full day</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-[var(--card-border)]">
                <span>Best: <span className="font-bold text-yellow-400">{dashStats?.personalBest || 0}%</span></span>
                {atToday && dashStats?.weekDelta !== undefined && dashStats?.weekDelta !== 0 && (
                  <span className={cn('font-bold', dashStats.weekDelta > 0 ? 'text-green-400' : 'text-red-400')}>
                    {dashStats.weekDelta > 0 ? '+' : ''}{dashStats.weekDelta}% vs last week
                  </span>
                )}
                {!atToday && <span className="italic">{new Date(days[0]?.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(weekEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Rankings */}
      {rankings?.groups?.length > 0 && (
        <div className="p-5 rounded-[24px] soft-card bento-purple mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">My Rankings</span>
          </div>
          <div className="space-y-2">
            {rankings.groups.map(g => (
              <Link key={g.groupId} href={`/dashboard/groups/${g.groupId}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--card-bg-hover)] transition-colors group">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black', g.myRank === 1 ? 'bg-yellow-500/20 text-yellow-400' : g.myRank === 2 ? 'bg-zinc-400/20 text-muted' : g.myRank === 3 ? 'bg-amber-600/20 text-amber-500' : 'bg-[var(--card-bg-hover)] text-muted')}>
                  #{g.myRank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.groupName}</p>
                  <p className="text-xs text-muted">{g.totalMembers} members</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-bold', getScoreColor(g.myScore))}>{g.myScore}%</p>
                  {g.topUser && g.topScore > g.myScore && (
                    <p className="text-xs text-muted">Leader: {g.topScore}%</p>
                  )}
                  {g.myRank === 1 && <p className="text-xs text-yellow-500">Leading!</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted group-hover:text-muted" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="p-8 rounded-[24px] soft-card bento-purple text-center">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-1">Ready to build a habit?</h3>
          <p className="text-muted mb-6 max-w-sm mx-auto">Start with one small thing you want to do every day. Tiny steps compound.</p>
          <Link href="/dashboard/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-semibold hover:opacity-90"><Plus className="w-4 h-4" /> Create your first habit</Link>
          <p className="text-xs text-muted mt-4">Want to do this with friends? <Link href="/dashboard/new" className="text-brand-500 hover:underline font-medium">Create a group</Link> instead.</p>
        </div>
      )}

      {/* Personal (solo) Tasks — softer framing now that groups are primary */}
      {personalTasks.length > 0 && (
        <>
          <TaskSection title="Just for me" tasks={personalTasks} completing={completing} onToggle={handleToggle} onViewProof={setViewProof} onSaveRemark={handleSaveRemark} />
          {(!groups || groups.length === 0) && (
            <Link href="/dashboard/new"
              className="block mb-4 px-4 py-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/15 text-sm text-brand-500 font-semibold flex items-center justify-between gap-3">
              <span>👥 Doing this with friends? Create a group →</span>
            </Link>
          )}
        </>
      )}

      {/* Group Tasks */}
      {groupedTasks.map(({ group, tasks: gTasks }) => (
        <TaskSection key={group.id} title={group.name} groupId={group.id} color={group.color} tasks={gTasks} completing={completing} onToggle={handleToggle} onViewProof={setViewProof} onSaveRemark={handleSaveRemark} />
      ))}

      {/* Daily reflection — the most valuable line in the day */}
      {tasks.length > 0 && <DailyReflection />}

      {/* Proof Viewer */}
      {viewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewProof(null)}>
          <div className="max-w-lg w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Proof: {viewProof.title}</p>
              <button onClick={() => setViewProof(null)} className="text-muted hover:text-primary"><X className="w-5 h-5" /></button>
            </div>
            <img src={viewProof.url} alt="Proof" className="w-full rounded-xl max-h-[70vh] object-contain bg-[var(--card-bg)]" />
          </div>
        </div>
      )}

      {/* Photo Proof Upload Modal */}
      {proofTask && (
        <ProofModal task={proofTask} onClose={() => setProofTask(null)} onSubmit={(proofUrl) => handleToggle(proofTask, proofUrl)} />
      )}
    </div>
  );
}

function ProofModal({ task, onClose, onSubmit }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('Image must be under 20MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const [uploadError, setUploadError] = useState('');
  const handleSubmit = async () => {
    if (!preview) return;
    setUploading(true);
    setUploadError('');
    try {
      const { url } = await api.uploadImage(preview, 'proofs');
      onSubmit(url);
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--input-border)] p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold">Photo Proof Required</h2>
        </div>
        <p className="text-sm text-muted mb-4">Upload a photo to complete <span className="text-primary font-medium">"{task.title}"</span></p>
        {uploadError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{uploadError}</div>}

        {preview ? (
          <div className="mb-4">
            <img src={preview} alt="Proof" className="w-full rounded-xl max-h-64 object-cover" />
            <button onClick={() => setPreview(null)} className="mt-2 text-sm text-muted hover:text-primary">Change photo</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="p-5 rounded-xl border-2 border-dashed border-[var(--input-border)] hover:border-brand-500 cursor-pointer text-center transition-colors">
              <Camera className="w-7 h-7 mx-auto mb-1.5 text-muted" />
              <p className="text-sm font-medium">Take photo</p>
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            </label>
            <label className="p-5 rounded-xl border-2 border-dashed border-[var(--input-border)] hover:border-brand-500 cursor-pointer text-center transition-colors">
              <ImagePlus className="w-7 h-7 mx-auto mb-1.5 text-muted" />
              <p className="text-sm font-medium">From gallery</p>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-[var(--card-bg-hover)] font-medium hover:bg-[var(--card-bg-hover)]">Cancel</button>
          <button onClick={handleSubmit} disabled={!preview || uploading}
            className="flex-1 py-3 rounded-xl gradient-brand font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete with Proof'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskSection({ title, groupId, color, tasks, completing, onToggle, onViewProof, onSaveRemark }) {
  const completedCount = tasks.filter(t => t.completedToday).length;
  const completedPts = tasks.filter(t => t.completedToday).reduce((s, t) => s + t.weightage, 0);
  const totalPts = tasks.reduce((s, t) => s + t.weightage, 0);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        {groupId ? (
          <Link href={`/dashboard/groups/${groupId}`} className="flex items-center gap-2 group">
            <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: (color || '#8b5cf6') + '30', color: color || '#8b5cf6' }}>{title.charAt(0)}</div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{title}</h2>
            <ChevronRight className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100" />
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted" />
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</h2>
          </div>
        )}
        <span className="text-xs text-muted ml-auto">{completedCount}/{tasks.length} &middot; {completedPts}/{totalPts} pts</span>
      </div>
      <div className="rounded-[24px] soft-card divide-y divide-[var(--card-border)] overflow-hidden">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} completing={completing} onToggle={onToggle} onViewProof={onViewProof} onSaveRemark={onSaveRemark} />
        ))}
      </div>
    </div>
  );
}

function TaskRow({ task, completing, onToggle, onViewProof, onSaveRemark }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.remark || '');
  const lockedByDeadline = !task.completedToday && task.deadlineTime && isPastDeadline(task.deadlineTime);

  useEffect(() => { setDraft(task.remark || ''); }, [task.remark]);

  const save = async () => {
    if ((task.remark || '') === draft.trim()) { setEditing(false); return; }
    await onSaveRemark?.(task, draft.trim());
    setEditing(false);
  };

  return (
    <div className={cn('px-4 py-3 group transition-colors',
      task.completedToday ? 'bg-green-500/5' :
      lockedByDeadline ? 'bg-red-500/5' :
      'hover:bg-white/[0.02]')}>
      <div className="flex items-center gap-3">
        <button onClick={() => onToggle(task)}
          disabled={completing === task.id || lockedByDeadline}
          title={lockedByDeadline ? 'Deadline passed — can\'t mark done' : ''}
          className={cn('flex-shrink-0', lockedByDeadline && 'cursor-not-allowed opacity-60')}>
          {completing === task.id ? <Loader2 className="w-5 h-5 animate-spin text-brand-500" /> :
           task.completedToday ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
           lockedByDeadline ? <Circle className="w-5 h-5 text-red-500/60" /> :
           <Circle className="w-5 h-5 text-muted hover:text-green-400 transition-colors" />}
        </button>
        <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: task.color || TASK_COLORS[0] }} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', task.completedToday && 'text-muted line-through')}>{task.title}</p>
          <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
            <span>{getFrequencyLabel(task.frequency)}</span>
            {task.deadlineTime && (
              <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold',
                task.completedToday ? 'bg-[var(--card-bg-hover)] text-muted' :
                isPastDeadline(task.deadlineTime) ? 'bg-red-500/15 text-red-400' :
                'bg-blue-500/15 text-blue-400')}>
                <Clock className="w-3 h-3" />
                {isPastDeadline(task.deadlineTime) && !task.completedToday ? `Overdue ${formatDeadline(task.deadlineTime)}` : `by ${formatDeadline(task.deadlineTime)}`}
              </span>
            )}
          </p>
        </div>
        {task.requiresProof && !task.completedToday && <Camera className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
        {task.proofUrl && task.completedToday && (
          <button onClick={() => onViewProof?.({ title: task.title, url: task.proofUrl })}
            className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-green-500/30 hover:border-green-500/60 transition-colors">
            <img src={task.proofUrl} alt="proof" className="w-full h-full object-cover" />
          </button>
        )}
        {task.completedToday && task.completionId && !editing && !task.remark && (
          <button onClick={() => setEditing(true)} title="Add a note"
            className="p-1.5 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted hover:text-primary opacity-60 hover:opacity-100 transition-all">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        )}
        <Link href={`/dashboard/tasks/${task.id}`} className="p-1.5 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5" /></Link>
        <div className={cn('px-2 py-0.5 rounded text-xs font-bold tabular-nums', task.completedToday ? 'bg-green-500/15 text-green-400' : 'bg-[var(--card-bg-hover)] text-muted')}>{task.weightage}pts</div>
      </div>
      {/* Remark display / editor — only when completed */}
      {task.completedToday && task.completionId && (editing ? (
        <div className="mt-2 ml-8 flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-muted mt-2 flex-shrink-0" />
          <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            onBlur={save}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); if (e.key === 'Escape') { setDraft(task.remark || ''); setEditing(false); } }}
            placeholder="A note for this completion (optional)…"
            className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-xs placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500 resize-none"
            rows={2} />
        </div>
      ) : task.remark && (
        <div className="mt-1.5 ml-8 flex items-start gap-2 group/remark">
          <MessageSquare className="w-3.5 h-3.5 text-muted mt-0.5 flex-shrink-0 opacity-60" />
          <p className="flex-1 text-xs italic text-muted">{task.remark}</p>
          <button onClick={() => setEditing(true)} title="Edit note"
            className="p-1 rounded hover:bg-[var(--card-bg-hover)] text-muted opacity-0 group-hover/remark:opacity-100 transition-opacity">
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function getLocalDateKeyToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function DailyReflection() {
  const dateKey = getLocalDateKeyToday();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.getReflection(dateKey).then(({ reflections }) => {
      if (cancelled) return;
      const t = reflections?.[0]?.text || '';
      setText(t);
      setSaved(t);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dateKey]);

  const persist = async () => {
    if (text === saved) return;
    try {
      await api.saveReflection(dateKey, text);
      setSaved(text);
      setSavedAt(new Date());
    } catch (e) { console.error('Save reflection failed:', e); }
  };

  const isDirty = text !== saved;

  return (
    <div className="mt-6 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">End-of-day reflection</h2>
        {savedAt && !isDirty && <span className="text-[10px] text-green-500 ml-1 flex items-center gap-0.5"><Check className="w-3 h-3" /> saved</span>}
      </div>
      <div className={cn('rounded-[24px] soft-card p-4 transition-all', focused && 'ring-2 ring-purple-400/30')}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); persist(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.target.blur(); } }}
          placeholder={loading ? 'Loading…' : "What's the truth about today? Just one sentence."}
          disabled={loading}
          className="w-full bg-transparent text-sm placeholder-[var(--foreground-muted)] focus:outline-none resize-none"
          rows={3} />
        <div className="flex items-center justify-between text-[10px] text-muted mt-1">
          <span className="italic">Honest beats elaborate. Two minutes max.</span>
          <span className="tabular-nums">{text.length}/500</span>
        </div>
      </div>
    </div>
  );
}
