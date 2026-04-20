'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Target, Users, Loader2, Check, AlertCircle, Plus, Trash2, RotateCcw, Camera } from 'lucide-react';
import { cn, TASK_COLORS, FREQUENCIES } from '@/lib/utils';

const DEFAULT_HABIT = () => ({
  id: Math.random().toString(36).slice(2),
  title: '',
  frequency: 'DAILY',
  weightage: 100,
  requiresProof: true,
  color: TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)],
});

export default function NewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preGroupId = searchParams.get('groupId');
  const isSetup = searchParams.get('setup') === 'true';

  const [mode, setMode] = useState(preGroupId ? 'setup' : null);
  const [groups, setGroups] = useState([]);
  const habitsEndRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [budget, setBudget] = useState({ used: 0, remaining: 100, total: 100 });

  // Habit form (single habit mode — personal or adding to existing group)
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [weightage, setWeightage] = useState(10);
  const [color, setColor] = useState(TASK_COLORS[0]);
  const [requiresProof, setRequiresProof] = useState(true);
  const [groupId, setGroupId] = useState(preGroupId || null);
  const [existingTasks, setExistingTasks] = useState([]); // existing tasks in selected group for redistribution

  // Group form
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupColor, setGroupColor] = useState(TASK_COLORS[2]);
  const [groupHabits, setGroupHabits] = useState([DEFAULT_HABIT()]);

  // Setup mode (after joining a group)
  const [setupGroupName, setSetupGroupName] = useState('');
  const [setupGroupColor, setSetupGroupColor] = useState(null);
  const [setupHabits, setSetupHabits] = useState([DEFAULT_HABIT()]);

  useEffect(() => {
    api.getGroups().then(res => {
      setGroups(res.groups || []);
      if (preGroupId) {
        const g = (res.groups || []).find(g => g.id === preGroupId);
        if (g) {
          setSetupGroupName(g.name);
          setSetupGroupColor(g.color);
        }
        setMode('setup');

        // Load existing habits in this group to show current state
        api.getTaskBudget(preGroupId).then(bRes => {
          const existing = (bRes.tasks || []).map(t => ({
            id: t.id,
            title: t.title,
            weightage: t.weightage,
            frequency: 'DAILY',
            color: TASK_COLORS[0],
            isExisting: true, // mark as existing — won't be re-created
          }));
          if (existing.length > 0) {
            // Show existing + one new blank habit, redistribute equally
            const newHabit = DEFAULT_HABIT();
            setSetupHabits(distributeEqual([...existing, newHabit]));
          }
          // If no existing habits, keep the default [DEFAULT_HABIT()] which has 100pts
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [preGroupId, isSetup]);

  useEffect(() => {
    api.getTaskBudget(groupId).then(bRes => {
      setBudget(bRes);
      setExistingTasks(bRes.tasks || []);
      // New habit gets equal share: 100 / (existing + 1)
      const newCount = (bRes.tasks?.length || 0) + 1;
      setWeightage(Math.max(1, Math.floor(100 / newCount)));
    }).catch(() => {});
  }, [groupId]);

  const handleCreateHabit = async () => {
    if (!title) return;
    setLoading(true);
    setError('');
    try {
      await api.createTask({ title, frequency, color, groupId, requiresProof, redistribute: true });
      router.push(groupId ? `/dashboard/groups/${groupId}` : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName) return;
    const validHabits = groupHabits.filter(h => h.title.trim());
    const totalWeight = validHabits.reduce((s, h) => s + h.weightage, 0);
    if (totalWeight > 100) {
      setError('Total weight exceeds 100. Adjust your habits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { group } = await api.createGroup({ name: groupName, description: groupDesc, color: groupColor });
      // Create all habits for this group with their set weights
      for (const h of validHabits) {
        await api.createTask({ title: h.title, frequency: h.frequency, weightage: h.weightage, color: h.color, requiresProof: h.requiresProof, groupId: group.id });
      }
      // Note: group creation form already handles weight distribution (sum=100), no redistribute needed
      router.push(`/dashboard/groups/${group.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Setup mode: save habits to joined group
  const handleSetupHabits = async () => {
    const allHabits = setupHabits.filter(h => h.title.trim());
    if (allHabits.length === 0) {
      router.push(`/dashboard/groups/${preGroupId}`);
      return;
    }
    const totalWeight = allHabits.reduce((s, h) => s + h.weightage, 0);
    if (totalWeight > 100) {
      setError('Total weight exceeds 100. Adjust your habits.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Update existing habits with new weights
      const existingHabits = allHabits.filter(h => h.isExisting);
      const newHabits = allHabits.filter(h => !h.isExisting);

      for (const h of existingHabits) {
        await api.updateTask(h.id, { weightage: h.weightage });
      }
      // Create new habits with their set weights (no redistribute — we already calculated)
      for (const h of newHabits) {
        await api.createTask({ title: h.title, frequency: h.frequency, weightage: h.weightage, color: h.color, requiresProof: h.requiresProof, groupId: preGroupId });
      }
      router.push(`/dashboard/groups/${preGroupId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Setup habit helpers (reuse same distribution logic)
  const addSetupHabit = () => {
    setSetupHabits(prev => distributeEqual([...prev, DEFAULT_HABIT()]));
    scrollToBottom();
  };
  const removeSetupHabit = (id) => {
    if (setupHabits.length <= 1) return;
    setSetupHabits(prev => distributeEqual(prev.filter(h => h.id !== id)));
  };
  const updateSetupHabit = (id, field, value) => {
    if (field === 'weightage') {
      setSetupHabits(prev => redistributeOthers(prev, id, value));
    } else {
      setSetupHabits(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
    }
  };
  const resetSetupEqual = () => {
    setSetupHabits(prev => distributeEqual(prev));
  };

  const setupTotalWeight = setupHabits.reduce((s, h) => s + h.weightage, 0);

  // --- Weight distribution helpers ---
  function distributeEqual(habits) {
    const n = habits.length;
    if (n === 0) return habits;
    const base = Math.floor(100 / n);
    const remainder = 100 - (base * n);
    return habits.map((h, i) => ({ ...h, weightage: base + (i < remainder ? 1 : 0) }));
  }

  function redistributeOthers(habits, changedId, newWeight) {
    const others = habits.filter(h => h.id !== changedId);
    const othersTotal = others.reduce((s, h) => s + h.weightage, 0);
    const remaining = Math.max(0, 100 - newWeight);

    let updated = habits.map(h => {
      if (h.id === changedId) return { ...h, weightage: newWeight };
      if (others.length === 0) return h;
      const ratio = othersTotal > 0 ? h.weightage / othersTotal : 1 / others.length;
      return { ...h, weightage: Math.max(1, Math.round(remaining * ratio)) };
    });

    // Fix rounding so sum = 100
    const sum = updated.reduce((s, h) => s + h.weightage, 0);
    if (sum !== 100) {
      const fixTarget = updated.find(h => h.id !== changedId);
      if (fixTarget) fixTarget.weightage += (100 - sum);
    }
    return updated;
  }

  const scrollToBottom = () => {
    setTimeout(() => habitsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const addHabit = () => {
    const newHabits = [...groupHabits, DEFAULT_HABIT()];
    setGroupHabits(distributeEqual(newHabits));
    scrollToBottom();
  };

  const removeHabit = (id) => {
    if (groupHabits.length <= 1) return;
    const remaining = groupHabits.filter(h => h.id !== id);
    setGroupHabits(distributeEqual(remaining));
  };

  const updateHabit = (id, field, value) => {
    if (field === 'weightage') {
      setGroupHabits(prev => redistributeOthers(prev, id, value));
    } else {
      setGroupHabits(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
    }
  };

  const resetEqual = () => {
    setGroupHabits(prev => distributeEqual(prev));
  };

  const groupTotalWeight = groupHabits.reduce((s, h) => s + h.weightage, 0);
  const groupRemaining = 100 - groupTotalWeight;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={preGroupId ? `/dashboard/groups/${preGroupId}` : '/dashboard'} className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-muted hover:text-primary"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold">{preGroupId ? 'Add Habits' : 'Add New'}</h1>
          <p className="text-muted text-sm">{preGroupId ? `Add habits to ${setupGroupName || 'group'}` : 'Create a habit or group'}</p>
        </div>
      </div>

      {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* Mode Selection */}
      {mode === null && (
        <div className="space-y-4">
          <button onClick={() => setMode('habit')} className="w-full p-5 rounded-2xl glass-card hover:border-green-500/50 flex items-center gap-4 text-left transition-all">
            <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center"><Target className="w-7 h-7 text-green-400" /></div>
            <div>
              <p className="font-semibold text-lg">Create Habit</p>
              <p className="text-sm text-muted">Track a new daily or weekly habit</p>
            </div>
          </button>
          <button onClick={() => setMode('group')} className="w-full p-5 rounded-2xl glass-card hover:border-purple-500/50 flex items-center gap-4 text-left transition-all">
            <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center"><Users className="w-7 h-7 text-purple-400" /></div>
            <div>
              <p className="font-semibold text-lg">Create Group</p>
              <p className="text-sm text-muted">Start an accountability group with habits</p>
            </div>
          </button>
        </div>
      )}

      {/* Single Habit Form */}
      {mode === 'habit' && (
        <div className="space-y-6">
          <button onClick={() => setMode(null)} className="flex items-center gap-2 text-sm text-muted hover:text-primary"><ArrowLeft className="w-4 h-4" /> Back</button>

          {/* Weight redistribution preview */}
          <div className="p-4 rounded-xl glass-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Weight Distribution</span>
              <span className="text-sm text-green-400">100 pts total</span>
            </div>
            {existingTasks.length > 0 ? (
              <>
                <p className="text-xs text-muted mb-2">
                  Adding to {existingTasks.length} existing habit{existingTasks.length > 1 ? 's' : ''} — weights will auto-redistribute equally.
                </p>
                <div className="h-3 rounded-full bg-[var(--card-bg-hover)] overflow-hidden flex">
                  {existingTasks.map((t, i) => {
                    const newCount = existingTasks.length + 1;
                    const share = Math.floor(100 / newCount);
                    return <div key={t.id} className="h-full transition-all bg-brand-500/50" style={{ width: `${share}%` }} />;
                  })}
                  <div className="h-full transition-all bg-brand-500" style={{ width: `${Math.floor(100 / (existingTasks.length + 1))}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-muted">
                  <span>{existingTasks.length} existing → {Math.floor(100 / (existingTasks.length + 1))}pts each</span>
                  <span>New → {Math.floor(100 / (existingTasks.length + 1))}pts</span>
                </div>
              </>
            ) : (
              <>
                <div className="h-3 rounded-full bg-[var(--card-bg-hover)] overflow-hidden">
                  <div className="h-full bg-brand-500 rounded-full" style={{ width: '100%' }} />
                </div>
                <p className="text-xs text-muted mt-1.5">First habit — gets all 100 pts</p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Group (optional)</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setGroupId(null)}
                className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2', groupId === null ? 'bg-brand-500/15 text-brand-500 ring-1 ring-brand-500/30' : 'bg-[var(--card-bg)] text-muted hover:text-primary')}>
                <Target className="w-4 h-4" /> Personal
              </button>
              {groups.map(g => (
                <button key={g.id} type="button" onClick={() => setGroupId(g.id)}
                  className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2', groupId === g.id ? 'ring-1' : 'bg-[var(--card-bg)] text-muted hover:text-primary')}
                  style={groupId === g.id ? { backgroundColor: (g.color || '#8b5cf6') + '20', color: g.color || '#8b5cf6', borderColor: g.color } : {}}>
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: g.color || '#8b5cf6' }} />
                  {g.name}
                </button>
              ))}
              <button type="button" onClick={() => setMode('group')} className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--card-bg)] text-muted hover:text-primary flex items-center gap-2">
                + New Group
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Habit Name *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Morning meditation" maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Frequency</label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map(f => (
                <button key={f.value} type="button" onClick={() => setFrequency(f.value)}
                  className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors', frequency === f.value ? 'bg-brand-500 text-white' : 'bg-[var(--card-bg)] text-muted hover:text-primary')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Color</label>
            <div className="flex gap-3">
              {TASK_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('w-9 h-9 rounded-lg transition-transform hover:scale-110', color === c && 'ring-2 ring-white ring-offset-2 ring-offset-surface-0')} style={{ backgroundColor: c }}>
                  {color === c && <Check className="w-4 h-4 text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl glass-card">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-sm font-medium">Requires Photo Proof</p>
                <p className="text-xs text-muted">Must upload a photo to complete</p>
              </div>
            </div>
            <button type="button" onClick={() => setRequiresProof(!requiresProof)}
              className={cn('w-12 h-7 rounded-full transition-colors relative', requiresProof ? 'bg-amber-500' : 'bg-[var(--card-bg-hover)]')}>
              <div className={cn('w-5 h-5 rounded-full bg-white absolute top-1 transition-transform', requiresProof ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/dashboard" className="flex-1 py-3 rounded-xl bg-[var(--card-bg)] text-primary font-medium text-center hover:bg-[var(--card-bg-hover)]">Cancel</Link>
            <button onClick={handleCreateHabit} disabled={loading || !title}
              className="flex-1 py-3 rounded-xl gradient-brand text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Habit'}
            </button>
          </div>
        </div>
      )}

      {/* Group Form with Multi-Habit Builder */}
      {mode === 'group' && (
        <div className="space-y-6">
          <button onClick={() => setMode(null)} className="flex items-center gap-2 text-sm text-muted hover:text-primary"><ArrowLeft className="w-4 h-4" /> Back</button>

          {/* Group details */}
          <div className="p-5 rounded-xl glass-card space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" /> Group Details</h3>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Name *</label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g., Morning Routine Squad" maxLength={50}
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-purple-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Description (optional)</label>
              <input type="text" value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="What's this group about?" maxLength={200}
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-purple-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Color</label>
              <div className="flex gap-2">
                {TASK_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setGroupColor(c)}
                    className={cn('w-7 h-7 rounded-lg transition-transform hover:scale-110', groupColor === c && 'ring-2 ring-white ring-offset-1 ring-offset-surface-100')} style={{ backgroundColor: c }}>
                    {groupColor === c && <Check className="w-3 h-3 text-white mx-auto" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Budget bar */}
          <div className="p-4 rounded-xl glass-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Habit Budget</span>
              <span className={cn('text-sm font-bold', groupTotalWeight > 100 ? 'text-red-400' : groupTotalWeight === 100 ? 'text-green-400' : 'text-muted')}>
                {groupTotalWeight} / 100 pts
              </span>
            </div>
            <div className="h-3 rounded-full bg-[var(--card-bg-hover)] overflow-hidden flex">
              {groupHabits.map((h, i) => (
                <div key={h.id} className="h-full transition-all" style={{ width: `${h.weightage}%`, backgroundColor: h.color + 'cc' }} />
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-muted">
              <span>{groupHabits.filter(h => h.title.trim()).length} habits</span>
              {groupRemaining > 0 && <span>{groupRemaining}pts unallocated</span>}
              {groupRemaining === 0 && <span className="text-green-400">Fully allocated</span>}
              {groupRemaining < 0 && <span className="text-red-400">Over by {Math.abs(groupRemaining)}pts</span>}
            </div>
          </div>

          {/* Habits list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-green-400" /> Group Habits</h3>
              <div className="flex gap-2">
                <button onClick={resetEqual}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-sm text-muted hover:text-primary transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Equal
                </button>
                <button onClick={addHabit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-sm text-muted hover:text-primary transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {groupHabits.map((habit, idx) => {
                // Max this habit can take = 100 minus (1 per other habit, so others keep at least 1 each)
                const maxWeight = Math.max(1, 100 - (groupHabits.length - 1));

                return (
                  <div key={habit.id} className="p-4 rounded-xl glass-card space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                      <input type="text" value={habit.title} onChange={(e) => updateHabit(habit.id, 'title', e.target.value)}
                        placeholder={`Habit ${idx + 1} name`} maxLength={100}
                        className="flex-1 px-3 py-2 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500 text-sm" />
                      <span className="text-sm font-bold tabular-nums min-w-[48px] text-right text-zinc-300">
                        {habit.weightage}pts
                      </span>
                      {groupHabits.length > 1 && (
                        <button onClick={() => removeHabit(habit.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex gap-1 flex-1 flex-wrap">
                        {FREQUENCIES.map(f => (
                          <button key={f.value} type="button" onClick={() => updateHabit(habit.id, 'frequency', f.value)}
                            className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', habit.frequency === f.value ? 'bg-brand-500 text-white' : 'bg-[var(--card-bg-hover)] text-muted hover:text-primary')}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => updateHabit(habit.id, 'requiresProof', !habit.requiresProof)}
                        className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors', habit.requiresProof ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--card-bg-hover)] text-muted hover:text-primary')}>
                        <Camera className="w-3 h-3" /> Proof
                      </button>
                      <div className="flex gap-1">
                        {TASK_COLORS.map(c => (
                          <button key={c} type="button" onClick={() => updateHabit(habit.id, 'color', c)}
                            className={cn('w-5 h-5 rounded transition-transform hover:scale-125', habit.color === c && 'ring-2 ring-white ring-offset-1 ring-offset-surface-100')} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>

                    <div>
                      <input type="range" min="1" max={maxWeight} value={habit.weightage}
                        onChange={(e) => updateHabit(habit.id, 'weightage', +e.target.value)}
                        className="w-full accent-brand-500 h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={habitsEndRef} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setMode(null)} className="flex-1 py-3 rounded-xl bg-[var(--card-bg)] text-primary font-medium hover:bg-[var(--card-bg-hover)]">Cancel</button>
            <button onClick={handleCreateGroup}
              disabled={loading || !groupName || groupTotalWeight > 100 || groupHabits.every(h => !h.title.trim())}
              className="flex-1 py-3 rounded-xl gradient-accent text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Create Group${groupHabits.filter(h => h.title.trim()).length > 0 ? ` + ${groupHabits.filter(h => h.title.trim()).length} Habits` : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Setup Mode — after joining a group via invite code */}
      {mode === 'setup' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl border border-[var(--card-border)]" style={{ backgroundColor: (setupGroupColor || '#8b5cf6') + '10' }}>
            <p className="text-sm text-muted mb-1">You joined</p>
            <h2 className="text-xl font-bold">{setupGroupName || 'Group'}</h2>
            <p className="text-sm text-muted mt-1">Add your habits for this group. Weights auto-distribute to total 100.</p>
          </div>

          {/* Budget bar */}
          <div className="p-4 rounded-xl glass-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Habit Budget</span>
              <span className={cn('text-sm font-bold', setupTotalWeight > 100 ? 'text-red-400' : setupTotalWeight === 100 ? 'text-green-400' : 'text-muted')}>
                {setupTotalWeight} / 100 pts
              </span>
            </div>
            <div className="h-3 rounded-full bg-[var(--card-bg-hover)] overflow-hidden flex">
              {setupHabits.map(h => (
                <div key={h.id} className="h-full transition-all" style={{ width: `${h.weightage}%`, backgroundColor: h.color + 'cc' }} />
              ))}
            </div>
          </div>

          {/* Habits */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-green-400" /> Your Habits</h3>
              <div className="flex gap-2">
                <button onClick={resetSetupEqual}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-sm text-muted hover:text-primary transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Equal
                </button>
                <button onClick={addSetupHabit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-sm text-muted hover:text-primary transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {setupHabits.map((habit, idx) => {
                const maxWeight = Math.max(1, 100 - (setupHabits.length - 1));
                return (
                  <div key={habit.id} className={cn('p-4 rounded-xl border space-y-3', habit.isExisting ? 'bg-[var(--card-bg)]/50 border-[var(--input-border)]' : 'bg-[var(--card-bg)] border-[var(--card-border)]')}>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                      {habit.isExisting ? (
                        <div className="flex-1 px-3 py-2">
                          <p className="text-sm font-medium">{habit.title}</p>
                          <p className="text-xs text-muted">Existing habit</p>
                        </div>
                      ) : (
                        <input type="text" value={habit.title} onChange={(e) => updateSetupHabit(habit.id, 'title', e.target.value)}
                          placeholder={`Habit ${idx + 1} name`} maxLength={100}
                          className="flex-1 px-3 py-2 rounded-lg bg-[var(--card-bg-hover)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500 text-sm" />
                      )}
                      <span className="text-sm font-bold tabular-nums min-w-[48px] text-right text-zinc-300">{habit.weightage}pts</span>
                      {!habit.isExisting && setupHabits.length > 1 && (
                        <button onClick={() => removeSetupHabit(habit.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {!habit.isExisting && (
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1 flex-1 flex-wrap">
                          {FREQUENCIES.map(f => (
                            <button key={f.value} type="button" onClick={() => updateSetupHabit(habit.id, 'frequency', f.value)}
                              className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', habit.frequency === f.value ? 'bg-brand-500 text-white' : 'bg-[var(--card-bg-hover)] text-muted hover:text-primary')}>
                              {f.label}
                            </button>
                          ))}
                        </div>
                        <button type="button" onClick={() => updateSetupHabit(habit.id, 'requiresProof', !habit.requiresProof)}
                          className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors', habit.requiresProof ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--card-bg-hover)] text-muted hover:text-primary')}>
                          <Camera className="w-3 h-3" /> Proof
                        </button>
                        <div className="flex gap-1">
                          {TASK_COLORS.map(c => (
                            <button key={c} type="button" onClick={() => updateSetupHabit(habit.id, 'color', c)}
                              className={cn('w-5 h-5 rounded transition-transform hover:scale-125', habit.color === c && 'ring-2 ring-white ring-offset-1 ring-offset-surface-100')} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <input type="range" min="1" max={maxWeight} value={habit.weightage}
                        onChange={(e) => updateSetupHabit(habit.id, 'weightage', +e.target.value)}
                        className="w-full accent-brand-500 h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={habitsEndRef} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => router.push(`/dashboard/groups/${preGroupId}`)} className="flex-1 py-3 rounded-xl bg-[var(--card-bg)] text-primary font-medium hover:bg-[var(--card-bg-hover)]">Back to Group</button>
            <button onClick={handleSetupHabits}
              disabled={loading || setupTotalWeight > 100 || setupHabits.every(h => !h.title.trim())}
              className="flex-1 py-3 rounded-xl gradient-brand text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (() => {
                const newCount = setupHabits.filter(h => !h.isExisting && h.title.trim()).length;
                return newCount > 0 ? `Save (${newCount} new)` : 'Save Changes';
              })()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
