'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Users, Trophy, Crown, Copy, Check, Loader2, UserPlus, Mail, Search, Target, Plus, CheckCircle2, Circle, Edit2, LogOut, X, ChevronDown, ChevronRight, Zap, AlertTriangle, Star, Camera, Skull } from 'lucide-react';
import { cn, getFrequencyLabel, getScoreColor, TASK_COLORS, getInitials, getLevel } from '@/lib/utils';

const MEMBER_COLORS = [
  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', accent: 'text-indigo-400', avatarBg: 'bg-indigo-500/25' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', accent: 'text-emerald-400', avatarBg: 'bg-emerald-500/25' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', accent: 'text-amber-400', avatarBg: 'bg-amber-500/25' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/20', accent: 'text-rose-400', avatarBg: 'bg-rose-500/25' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', accent: 'text-cyan-400', avatarBg: 'bg-cyan-500/25' },
  { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', accent: 'text-fuchsia-400', avatarBg: 'bg-fuchsia-500/25' },
  { bg: 'bg-lime-500/10', border: 'border-lime-500/20', accent: 'text-lime-400', avatarBg: 'bg-lime-500/25' },
  { bg: 'bg-sky-500/10', border: 'border-sky-500/20', accent: 'text-sky-400', avatarBg: 'bg-sky-500/25' },
];

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id;
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [role, setRole] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [memberTasks, setMemberTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expandedMembers, setExpandedMembers] = useState({});
  const [proofTask, setProofTask] = useState(null);
  const [viewProof, setViewProof] = useState(null); // { title, url }
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('habits');
  const [period, setPeriod] = useState('week');
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [completing, setCompleting] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [groupRes, leaderboardRes, tasksRes, memberTasksRes] = await Promise.all([
        api.getGroup(groupId),
        api.getLeaderboard(groupId, period),
        api.getTasks({ groupId }),
        api.getMemberTasks(groupId),
      ]);
      setGroup(groupRes.group);
      setRole(groupRes.role);
      setLeaderboard(leaderboardRes.leaderboard || []);
      setTasks(tasksRes.tasks || []);
      setMemberTasks(memberTasksRes.memberTasks || []);
    } catch (error) {
      console.error('Failed:', error);
      if (error.status === 403 || error.status === 404) router.push('/dashboard/groups');
    } finally {
      setLoading(false);
    }
  }, [groupId, period, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyCode = () => {
    navigator.clipboard.writeText(group?.inviteCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await api.leaveGroup(groupId);
      router.push('/dashboard/groups');
    } catch (err) {
      alert(err.message);
      setLeaving(false);
    }
  };

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

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.removeMember(groupId, userId);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleMember = (userId) => {
    setExpandedMembers(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await api.cancelInvite(groupId, inviteId);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  if (!group) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/groups" className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-muted hover:text-primary"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: (group.color || '#8b5cf6') + '20' }}>{group.name.charAt(0)}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {role === 'ADMIN' && <Crown className="w-5 h-5 text-yellow-500" />}
          </div>
          {group.description && <p className="text-muted text-sm">{group.description}</p>}
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand font-medium hover:opacity-90">
          <UserPlus className="w-4 h-4" /> Invite
        </button>
      </div>

      {/* Invite Code */}
      <div className="p-4 rounded-xl glass-card flex items-center gap-4 mb-6">
        <div className="flex-1">
          <p className="text-xs text-muted mb-1">Invite Code</p>
          <code className="text-lg font-mono">{group.inviteCode}</code>
        </div>
        <button onClick={copyCode} className="px-4 py-2 rounded-lg bg-[var(--card-bg-hover)] hover:bg-[var(--card-bg-hover)] flex items-center gap-2 text-sm">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{ id: 'habits', label: 'Habits', icon: Target }, { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }, { id: 'members', label: 'Members', icon: Users }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === t.id ? 'bg-brand-500/15 text-brand-500' : 'text-muted hover:text-primary hover:bg-[var(--card-bg)]')}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Habits Tab - All Members' Tasks */}
      {tab === 'habits' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Member Activity</h2>
            <Link href={`/dashboard/new?groupId=${groupId}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-sm">
              <Plus className="w-4 h-4" /> Add Habit
            </Link>
          </div>

          {memberTasks.length === 0 ? (
            <div className="text-center py-12 rounded-xl glass-card">
              <Target className="w-8 h-8 mx-auto mb-3 text-muted" />
              <p className="text-muted">No members with tasks yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...memberTasks].sort((a, b) => (a.user.id === user?.id ? -1 : b.user.id === user?.id ? 1 : 0)).map((member, idx) => {
                const isMe = member.user.id === user?.id;
                const isExpanded = expandedMembers[member.user.id] !== false;
                const mColor = MEMBER_COLORS[idx % MEMBER_COLORS.length];
                const isShamed = member.totalCount > 0 && member.score < 50;
                const isPerfect = member.totalCount > 0 && member.score === 100;
                const noActivity = member.totalCount > 0 && member.completedCount === 0;
                const lvl = getLevel(member.totalXp || 0);

                return (
                  <div key={member.user.id} className={cn('rounded-xl border overflow-hidden',
                    isPerfect ? 'bg-green-500/10 border-green-500/30 ring-1 ring-green-500/20' :
                    isShamed ? 'bg-red-500/8 border-red-500/25' :
                    cn(mColor.bg, mColor.border))}>
                    {/* Member Header */}
                    <button onClick={() => toggleMember(member.user.id)} className="w-full flex items-center gap-4 p-4 hover:bg-[var(--card-bg-hover)] transition-colors">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                        isPerfect ? 'bg-green-500/25 text-green-400' :
                        isShamed ? 'bg-red-500/20 text-red-400' :
                        cn(mColor.avatarBg, mColor.accent))}>
                        {isPerfect ? <Star className="w-5 h-5" /> : isShamed ? <Skull className="w-5 h-5" /> : getInitials(member.user.name)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium flex items-center gap-1.5">
                          {member.user.name} {isMe && <span className="text-muted">(You)</span>}
                          {member.role === 'ADMIN' && <span className="ml-1 text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">Admin</span>}
                          <span className={cn('text-xs px-1.5 py-0.5 rounded font-bold', lvl.color, 'bg-[var(--card-bg)]')}>Lv.{lvl.level}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {noActivity ? <span className="text-red-400 font-medium">No activity today</span> :
                            <>{member.completedCount}/{member.totalCount} completed</>}
                          {' '}&middot; {member.totalXp || 0} XP
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={cn('text-xl font-bold', isPerfect ? 'text-green-400' : isShamed ? 'text-red-400' : mColor.accent)}>{member.score}%</div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
                      </div>
                    </button>

                    {/* Member Tasks */}
                    {isExpanded && member.tasks.length > 0 && (
                      <div className="border-t border-[var(--card-border)]">
                        {/* Progress bar */}
                        <div className="px-4 pt-3 pb-1">
                          <div className="h-1.5 rounded-full bg-[var(--card-bg-hover)] overflow-hidden">
                            <div className="h-full rounded-full gradient-brand transition-all duration-500" style={{ width: `${member.score}%` }} />
                          </div>
                        </div>
                        <div className="p-2">
                          {member.tasks.map(task => (
                            <div key={task.id} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg', task.completedToday ? 'bg-green-500/5' : 'hover:bg-[var(--card-bg-hover)]')}>
                              {/* If it's my task, make it toggleable */}
                              {isMe ? (
                                <button onClick={() => handleToggle(task)} disabled={completing === task.id} className="flex-shrink-0">
                                  {completing === task.id ? <Loader2 className="w-5 h-5 animate-spin text-brand-500" /> : task.completedToday ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted hover:text-green-400 transition-colors" />}
                                </button>
                              ) : (
                                <div className="flex-shrink-0">
                                  {task.completedToday ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted" />}
                                </div>
                              )}
                              <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: task.color || TASK_COLORS[0] }} />
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium', task.completedToday && 'text-muted line-through')}>{task.title}</p>
                                <p className="text-xs text-muted">
                                  {getFrequencyLabel(task.frequency)}
                                  {task.group && <span> &middot; {task.group.name}</span>}
                                </p>
                              </div>
                              {task.requiresProof && !task.completedToday && <Camera className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                              {task.proofUrl && task.completedToday && (
                                <button onClick={(e) => { e.stopPropagation(); setViewProof({ title: task.title, url: task.proofUrl }); }}
                                  className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-green-500/30 hover:border-green-500/60 transition-colors">
                                  <img src={task.proofUrl} alt="proof" className="w-full h-full object-cover" />
                                </button>
                              )}
                              <div className="px-2 py-0.5 rounded bg-[var(--card-bg-hover)] text-xs text-muted">{task.weightage}pts</div>
                              {isMe && <Link href={`/dashboard/tasks/${task.id}`} className="p-1.5 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></Link>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No tasks state */}
                    {isExpanded && member.tasks.length === 0 && (
                      <div className="border-t border-[var(--card-border)] p-4 text-center text-sm text-muted">
                        No active habits yet
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {tab === 'leaderboard' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Leaderboard</h2>
            <div className="flex gap-2">
              {['week', 'month'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', period === p ? 'bg-brand-500 text-white' : 'bg-[var(--card-bg)] text-muted hover:text-primary')}>
                  {p === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl glass-card overflow-hidden">
            {leaderboard.map((entry, i) => {
              const isMe = entry.user.id === user?.id;
              return (
                <div key={entry.user.id} className={cn('flex items-center gap-4 p-4 border-b border-[var(--card-border)] last:border-0', isMe && 'bg-green-500/5')}>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold', i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-zinc-500/20 text-muted' : i === 2 ? 'bg-amber-600/20 text-amber-600' : 'bg-[var(--card-bg-hover)] text-muted')}>
                    {entry.rank}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-sm font-medium">{getInitials(entry.user.name)}</div>
                  <div className="flex-1">
                    <p className="font-medium">{entry.user.name} {isMe && <span className="text-muted">(You)</span>}</p>
                    <p className="text-xs text-muted">{entry.completions} completions</p>
                  </div>
                  <div className={cn('text-2xl font-bold', i === 0 ? 'text-yellow-500' : i === 1 ? 'text-muted' : i === 2 ? 'text-amber-600' : 'text-primary')}>{entry.score}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div>
          <div className="rounded-xl glass-card overflow-hidden mb-4">
            {group.memberships?.map(m => (
              <div key={m.user.id} className="flex items-center gap-4 p-4 border-b border-[var(--card-border)] last:border-0">
                <div className="w-10 h-10 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-sm font-medium">{getInitials(m.user.name)}</div>
                <div className="flex-1">
                  <p className="font-medium">{m.user.name} {m.user.id === user?.id && <span className="text-muted">(You)</span>}</p>
                  <p className="text-xs text-muted">{m.user.email}</p>
                </div>
                {m.role === 'ADMIN' && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full">Admin</span>}
                {m.user.id !== user?.id && role === 'ADMIN' && (
                  <button onClick={() => handleRemoveMember(m.user.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                )}
              </div>
            ))}
          </div>

          {group.invites?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted mb-2">Pending Invites</h3>
              <div className="rounded-xl glass-card overflow-hidden">
                {group.invites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-4 p-4 border-b border-[var(--card-border)] last:border-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center"><Mail className="w-4 h-4 text-muted" /></div>
                    <div className="flex-1">
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-muted">Invited {new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">Pending</span>
                    {role === 'ADMIN' && <button onClick={() => handleCancelInvite(inv.id)} className="text-xs text-muted hover:text-primary">Cancel</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leave Group */}
      <div className="mt-8">
        {showLeave ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm mb-4">Leave this group?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeave(false)} className="flex-1 py-2 rounded-lg bg-[var(--card-bg)] text-sm font-medium">Cancel</button>
              <button onClick={handleLeave} disabled={leaving} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-50">
                {leaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Leave'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowLeave(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm">
            <LogOut className="w-4 h-4" /> Leave Group
          </button>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && <InviteModal group={group} onClose={() => setShowInvite(false)} onInvited={fetchData} />}

      {/* Proof Upload Modal */}
      {proofTask && <ProofModal task={proofTask} onClose={() => setProofTask(null)} onSubmit={(proofUrl) => handleToggle(proofTask, proofUrl)} />}

      {/* Proof Viewer Modal */}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--input-border)] p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold">Photo Proof Required</h2>
        </div>
        <p className="text-sm text-muted mb-4">Upload a photo to complete <span className="text-primary font-medium">"{task.title}"</span></p>
        {preview ? (
          <div className="mb-4">
            <img src={preview} alt="Proof" className="w-full rounded-xl max-h-64 object-cover" />
            <button onClick={() => setPreview(null)} className="mt-2 text-sm text-muted hover:text-primary">Change photo</button>
          </div>
        ) : (
          <label className="block mb-4 p-8 rounded-xl border-2 border-dashed border-[var(--input-border)] hover:border-brand-500 cursor-pointer text-center transition-colors">
            <Camera className="w-8 h-8 mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">Click to upload photo</p>
            <p className="text-xs text-muted mt-1">JPG, PNG — max 20MB</p>
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-[var(--card-bg-hover)] font-medium hover:bg-[var(--card-bg-hover)]">Cancel</button>
          <button onClick={async () => {
              if (!preview) return;
              setUploading(true);
              try {
                const { url } = await api.uploadImage(preview, 'proofs');
                onSubmit(url);
              } catch (err) {
                alert(err.message || 'Upload failed');
                setUploading(false);
              }
            }} disabled={!preview || uploading}
            className="flex-1 py-3 rounded-xl gradient-brand font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete with Proof'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({ group, onClose, onInvited }) {
  const [tab, setTab] = useState('search');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (search.length >= 2) {
      api.searchUsers(search, group.id).then(res => setUsers(res.users || [])).catch(() => {});
    } else {
      setUsers([]);
    }
  }, [search, group.id]);

  const handleInviteUser = async (userId) => {
    setLoading(true);
    try {
      await api.inviteToGroup(group.id, { userId });
      setInvited(prev => [...prev, userId]);
      onInvited();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteEmail = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    setError('');
    try {
      await api.inviteToGroup(group.id, { email });
      setInvited(prev => [...prev, email]);
      setEmail('');
      onInvited();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--input-border)] p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Invite to {group.name}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)]"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('search')} className={cn('flex-1 py-2 rounded-lg text-sm font-medium', tab === 'search' ? 'bg-[var(--card-bg-hover)]' : 'text-muted hover:text-primary')}>
            <Users className="w-4 h-4 inline mr-2" />Search Users
          </button>
          <button onClick={() => setTab('email')} className={cn('flex-1 py-2 rounded-lg text-sm font-medium', tab === 'email' ? 'bg-[var(--card-bg-hover)]' : 'text-muted hover:text-primary')}>
            <Mail className="w-4 h-4 inline mr-2" />Email Invite
          </button>
        </div>

        {tab === 'search' && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {users.length === 0 && search.length >= 2 && <p className="text-center text-muted py-4">No users found</p>}
              {users.map(u => {
                const isInvited = invited.includes(u.id);
                return (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card-bg-hover)]">
                    <div className="w-10 h-10 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-sm font-medium">{getInitials(u.name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted truncate">{u.email}</p>
                    </div>
                    <button onClick={() => handleInviteUser(u.id)} disabled={isInvited || loading}
                      className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', isInvited ? 'bg-green-500/20 text-green-400' : 'bg-brand-500 text-white hover:bg-brand-600')}>
                      {isInvited ? <Check className="w-4 h-4" /> : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'email' && (
          <form onSubmit={handleInviteEmail} className="space-y-4">
            <p className="text-sm text-muted">Invite someone who isn't on HabitSquad yet.</p>
            <div className="flex gap-2">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="friend@example.com"
                className="flex-1 px-4 py-3 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
              <button type="submit" disabled={loading || !email.includes('@')} className="px-4 py-3 rounded-xl gradient-brand font-medium disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send'}
              </button>
            </div>
            {invited.filter(i => i.includes('@')).map(e => (
              <div key={e} className="flex items-center gap-2 text-sm text-green-400"><Check className="w-4 h-4" /> {e}</div>
            ))}
          </form>
        )}

        <button onClick={onClose} className="w-full mt-6 py-3 rounded-xl bg-[var(--card-bg-hover)] font-medium hover:bg-[var(--card-bg-hover)]">Done</button>
      </div>
    </div>
  );
}
