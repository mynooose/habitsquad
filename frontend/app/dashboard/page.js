'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Plus, CheckCircle2, Circle, Flame, Target, TrendingUp, TrendingDown, Trophy, ArrowUp, ArrowDown, Edit2, Loader2, ChevronRight, Minus, Zap, Camera, X } from 'lucide-react';
import { cn, formatDate, getScoreColor, getFrequencyLabel, TASK_COLORS, getLevel } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
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

  const handleToggle = async (task, proofUrl = null) => {
    if (!task.completedToday && task.requiresProof && !proofUrl) {
      setProofTask(task);
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
      console.error('Failed:', error);
    } finally {
      setCompleting(null);
      setProofTask(null);
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
          <h1 className="text-xl font-bold">{greeting}, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-muted">{formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link href="/dashboard/new" className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-sm font-medium">
          <Plus className="w-4 h-4" /> New Habit
        </Link>
      </div>

      {/* Hero Score */}
      <div className="p-6 rounded-[20px] gradient-brand text-white mb-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNTAiIGN5PSI1MCIgcj0iMTIwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIxNTAiIHI9IjgwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9zdmc+')] opacity-60" />
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

      {/* Trends + Streaks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {/* Trends */}
        <div className="p-5 rounded-[20px] stat-blue glass-card-interactive">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Trends</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">This week</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{dashStats?.thisWeek?.avgScore || 0}% avg</span>
                {dashStats?.weekDelta !== 0 && dashStats?.weekDelta !== undefined && (
                  <span className={cn('text-xs font-bold', dashStats.weekDelta > 0 ? 'text-green-400' : 'text-red-400')}>
                    {dashStats.weekDelta > 0 ? '+' : ''}{dashStats.weekDelta}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Last week</span>
              <span className="text-sm font-bold">{dashStats?.lastWeek?.avgScore || 0}% avg</span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-2">
              <span className="text-sm text-zinc-400">Personal best</span>
              <span className="text-sm font-bold text-yellow-400">{dashStats?.personalBest || 0}%</span>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="p-5 rounded-[20px] stat-orange glass-card-interactive">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-orange flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Streaks</span>
          </div>
          <div className="flex items-end gap-1 mb-3">
            <span className="text-4xl font-black text-orange-400">{dashStats?.streak?.current || 0}</span>
            <span className="text-sm text-muted mb-1.5">days</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Longest</span>
            <span className="font-bold">{dashStats?.streak?.longest || 0} days</span>
          </div>
        </div>
      </div>

      {/* Level & XP */}
      {user?.totalXp !== undefined && (() => {
        const lvl = getLevel(user.totalXp || 0);
        return (
          <div className="p-5 rounded-[20px] stat-yellow glass-card-interactive mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Level</span>
              </div>
              <span className="text-xs text-muted font-medium">{user.totalXp || 0} XP</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-xl font-black text-yellow-400">{lvl.level}</div>
              <div className="flex-1">
                <p className={cn('font-bold', lvl.color)}>{lvl.name}</p>
                <p className="text-xs text-muted">{lvl.nextLevelXp ? `${lvl.nextLevelXp - lvl.currentXp} XP to Level ${lvl.level + 1}` : 'Max level reached!'}</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-[var(--card-bg-hover)] overflow-hidden">
              <div className="h-full rounded-full bg-yellow-500 transition-all duration-500" style={{ width: `${lvl.progress}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Rankings */}
      {rankings?.groups?.length > 0 && (
        <div className="p-5 rounded-[20px] stat-purple glass-card-interactive mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">My Rankings</span>
          </div>
          <div className="space-y-2">
            {rankings.groups.map(g => (
              <Link key={g.groupId} href={`/dashboard/groups/${g.groupId}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black', g.myRank === 1 ? 'bg-yellow-500/20 text-yellow-400' : g.myRank === 2 ? 'bg-zinc-400/20 text-zinc-400' : g.myRank === 3 ? 'bg-amber-600/20 text-amber-500' : 'bg-[var(--card-bg-hover)] text-muted')}>
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
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="text-center py-16 rounded-2xl glass-card">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted" />
          <h3 className="text-lg font-semibold mb-2">No habits yet</h3>
          <p className="text-zinc-400 mb-6">Create your first habit to start tracking</p>
          <Link href="/dashboard/new" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand font-medium"><Plus className="w-4 h-4" /> Create Habit</Link>
        </div>
      )}

      {/* Personal Tasks */}
      {personalTasks.length > 0 && (
        <TaskSection title="Personal" tasks={personalTasks} completing={completing} onToggle={handleToggle} onViewProof={setViewProof} />
      )}

      {/* Group Tasks */}
      {groupedTasks.map(({ group, tasks: gTasks }) => (
        <TaskSection key={group.id} title={group.name} groupId={group.id} color={group.color} tasks={gTasks} completing={completing} onToggle={handleToggle} onViewProof={setViewProof} />
      ))}

      {/* Proof Viewer */}
      {viewProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewProof(null)}>
          <div className="max-w-lg w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Proof: {viewProof.title}</p>
              <button onClick={() => setViewProof(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
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
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!preview) return;
    setUploading(true);
    onSubmit(preview);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--input-border)] p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold">Photo Proof Required</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">Upload a photo to complete <span className="text-white font-medium">"{task.title}"</span></p>

        {preview ? (
          <div className="mb-4">
            <img src={preview} alt="Proof" className="w-full rounded-xl max-h-64 object-cover" />
            <button onClick={() => setPreview(null)} className="mt-2 text-sm text-zinc-400 hover:text-white">Change photo</button>
          </div>
        ) : (
          <label className="block mb-4 p-8 rounded-xl border-2 border-dashed border-[var(--input-border)] hover:border-brand-500 cursor-pointer text-center transition-colors">
            <Camera className="w-8 h-8 mx-auto mb-2 text-muted" />
            <p className="text-sm text-zinc-400">Click to upload photo</p>
            <p className="text-xs text-muted mt-1">JPG, PNG — max 2MB</p>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
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

function TaskSection({ title, groupId, color, tasks, completing, onToggle, onViewProof }) {
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
      <div className="rounded-[20px] glass-card divide-y divide-[var(--card-border)] overflow-hidden">
        {tasks.map(task => (
          <div key={task.id} className={cn('flex items-center gap-3 px-4 py-3 group transition-colors', task.completedToday ? 'bg-green-500/5' : 'hover:bg-white/[0.02]')}>
            <button onClick={() => onToggle(task)} disabled={completing === task.id} className="flex-shrink-0">
              {completing === task.id ? <Loader2 className="w-5 h-5 animate-spin text-brand-500" /> : task.completedToday ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted hover:text-green-400 transition-colors" />}
            </button>
            <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: task.color || TASK_COLORS[0] }} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', task.completedToday && 'text-muted line-through')}>{task.title}</p>
              <p className="text-xs text-muted">{getFrequencyLabel(task.frequency)}</p>
            </div>
            {task.requiresProof && !task.completedToday && <Camera className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
            {task.proofUrl && task.completedToday && (
              <button onClick={() => onViewProof?.({ title: task.title, url: task.proofUrl })}
                className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-green-500/30 hover:border-green-500/60 transition-colors">
                <img src={task.proofUrl} alt="proof" className="w-full h-full object-cover" />
              </button>
            )}
            <Link href={`/dashboard/tasks/${task.id}`} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-white opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5" /></Link>
            <div className={cn('px-2 py-0.5 rounded text-xs font-bold tabular-nums', task.completedToday ? 'bg-green-500/15 text-green-400' : 'bg-[var(--card-bg-hover)] text-muted')}>{task.weightage}pts</div>
          </div>
        ))}
      </div>
    </div>
  );
}
