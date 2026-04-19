'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { ArrowLeft, Loader2, Check, Trash2, Camera } from 'lucide-react';
import { cn, TASK_COLORS, FREQUENCIES } from '@/lib/utils';

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [groups, setGroups] = useState([]);
  const [budget, setBudget] = useState({ used: 0, remaining: 100, total: 100 });
  const [originalWeight, setOriginalWeight] = useState(0);

  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [weightage, setWeightage] = useState(5);
  const [color, setColor] = useState(TASK_COLORS[0]);
  const [groupId, setGroupId] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [requiresProof, setRequiresProof] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ task }, { groups: g }] = await Promise.all([
          api.getTask(taskId),
          api.getGroups(),
        ]);
        setTitle(task.title);
        setFrequency(task.frequency);
        setWeightage(task.weightage);
        setOriginalWeight(task.weightage);
        setColor(task.color || TASK_COLORS[0]);
        setGroupId(task.groupId);
        setIsActive(task.isActive);
        setRequiresProof(task.requiresProof || false);
        setGroups(g || []);
        const budgetRes = await api.getTaskBudget(task.groupId);
        setBudget(budgetRes);
      } catch (err) {
        setError('Failed to load task');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [taskId]);

  // Refresh budget when group changes
  useEffect(() => {
    if (!loading) {
      api.getTaskBudget(groupId).then(bRes => setBudget(bRes)).catch(() => {});
    }
  }, [groupId, loading]);

  // Available budget = remaining + this task's current weight (since we're editing it)
  const availableBudget = budget.remaining + originalWeight;

  const handleSave = async () => {
    if (!title) return;
    setSaving(true);
    setError('');
    try {
      await api.updateTask(taskId, { title, frequency, weightage, color, groupId, isActive, requiresProof });
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteTask(taskId);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Habit</h1>
          <p className="text-zinc-400 text-sm">Update habit settings</p>
        </div>
        <button onClick={() => setShowDelete(true)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
      </div>

      {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {showDelete && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm mb-4">Delete this habit? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDelete(false)} className="flex-1 py-2 rounded-lg bg-[var(--card-bg)] text-sm font-medium hover:bg-[var(--card-bg-hover)]">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Budget indicator */}
        <div className="p-4 rounded-xl glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Weight Budget</span>
            <span className="text-sm text-zinc-400">{budget.used - originalWeight + weightage} / 100 pts</span>
          </div>
          <div className="h-3 rounded-full bg-[var(--card-bg-hover)] overflow-hidden flex">
            <div className="h-full bg-brand-500/60 transition-all" style={{ width: `${budget.used - originalWeight}%` }} />
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${weightage}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-zinc-500">
            <span>{budget.used - originalWeight}pts other tasks</span>
            <span>{availableBudget - weightage}pts left</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl glass-card">
          <div>
            <p className="font-medium">Active</p>
            <p className="text-sm text-zinc-500">Inactive habits won't appear in daily tracking</p>
          </div>
          <button type="button" onClick={() => setIsActive(!isActive)}
            className={cn('w-12 h-7 rounded-full transition-colors relative', isActive ? 'bg-brand-500' : 'bg-[var(--card-bg-hover)]')}>
            <div className={cn('w-5 h-5 rounded-full bg-white absolute top-1 transition-transform', isActive ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl glass-card">
          <div>
            <p className="font-medium flex items-center gap-2"><Camera className="w-4 h-4 text-amber-400" /> Requires Photo Proof</p>
            <p className="text-sm text-zinc-500">Users must upload a photo when completing</p>
          </div>
          <button type="button" onClick={() => setRequiresProof(!requiresProof)}
            className={cn('w-12 h-7 rounded-full transition-colors relative', requiresProof ? 'bg-amber-500' : 'bg-[var(--card-bg-hover)]')}>
            <div className={cn('w-5 h-5 rounded-full bg-white absolute top-1 transition-transform', requiresProof ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Group</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setGroupId(null)}
              className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', groupId === null ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-[var(--card-bg)] text-zinc-400 hover:text-white')}>
              Personal
            </button>
            {groups.map(g => (
              <button key={g.id} type="button" onClick={() => setGroupId(g.id)}
                className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', groupId === g.id ? 'ring-1' : 'bg-[var(--card-bg)] text-zinc-400 hover:text-white')}
                style={groupId === g.id ? { backgroundColor: (g.color || '#8b5cf6') + '20', color: g.color } : {}}>
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Habit Name *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Frequency</label>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map(f => (
              <button key={f.value} type="button" onClick={() => setFrequency(f.value)}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors', frequency === f.value ? 'bg-brand-500 text-white' : 'bg-[var(--card-bg)] text-zinc-400 hover:text-white')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Weight: {weightage} pts</label>
          <input type="range" min="1" max={Math.max(1, availableBudget)} value={Math.min(weightage, availableBudget)} onChange={(e) => setWeightage(+e.target.value)} className="w-full accent-brand-500" />
          <div className="flex justify-between text-xs text-zinc-500 mt-1"><span>1 pt</span><span>{availableBudget} pts max</span></div>
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

        <div className="flex gap-3 pt-4">
          <Link href="/dashboard" className="flex-1 py-3 rounded-xl bg-[var(--card-bg)] text-white font-medium text-center hover:bg-[var(--card-bg-hover)]">Cancel</Link>
          <button onClick={handleSave} disabled={saving || !title}
            className="flex-1 py-3 rounded-xl gradient-brand text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
