'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Users, Trophy, Crown, Copy, Check, Loader2, UserPlus, Mail, Search, Target, Plus, CheckCircle2, Circle, Edit2, LogOut, X, ChevronDown, ChevronRight, Zap, AlertTriangle, Star, Camera, Skull, MoreVertical, Settings, ShieldPlus, Shield, UserX, BarChart3, TrendingUp, Activity, Flame } from 'lucide-react';
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
  const [showSettings, setShowSettings] = useState(false);
  const [memberMenuFor, setMemberMenuFor] = useState(null);
  const [transferTo, setTransferTo] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [expandedAnalyticsMember, setExpandedAnalyticsMember] = useState(null);
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

  useEffect(() => {
    if (tab !== 'analytics' || !groupId) return;
    let cancelled = false;
    setAnalyticsLoading(true);
    api.getGroupAnalytics(groupId, 30).then(res => { if (!cancelled) setAnalytics(res); })
      .catch(() => {}).finally(() => { if (!cancelled) setAnalyticsLoading(false); });
    return () => { cancelled = true; };
  }, [tab, groupId]);

  const copyCode = () => {
    navigator.clipboard.writeText(group?.inviteCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await api.leaveGroup(groupId, transferTo || null);
      router.push('/dashboard/groups');
    } catch (err) {
      alert(err.message);
      setLeaving(false);
    }
  };

  const handlePromote = async (userId) => {
    setMemberMenuFor(null);
    try {
      await api.updateMemberRole(groupId, userId, 'ADMIN');
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDemote = async (userId) => {
    setMemberMenuFor(null);
    try {
      await api.updateMemberRole(groupId, userId, 'MEMBER');
      fetchData();
    } catch (err) { alert(err.message); }
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
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/groups" className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-muted hover:text-primary"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: (group.color || '#8b5cf6') + '20' }}>{group.name.charAt(0)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold truncate">{group.name}</h1>
            {role === 'ADMIN' && <Crown className="w-5 h-5 text-yellow-500 shrink-0" />}
          </div>
          {group.description && <p className="text-muted text-sm truncate">{group.description}</p>}
        </div>
        {role === 'ADMIN' && (
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg hover:bg-[var(--card-bg)] text-muted hover:text-primary" title="Group settings">
            <Settings className="w-5 h-5" />
          </button>
        )}
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
        {[{ id: 'habits', label: 'Habits', icon: Target }, { id: 'leaderboard', label: 'Leaderboard', icon: Trophy }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }, { id: 'members', label: 'Members', icon: Users }].map(t => (
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

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <AnalyticsTab
          analytics={analytics}
          setAnalytics={setAnalytics}
          loading={analyticsLoading}
          currentUserId={user?.id}
          expandedMember={expandedAnalyticsMember}
          setExpandedMember={setExpandedAnalyticsMember}
        />
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div>
          <div className="rounded-xl glass-card overflow-hidden mb-4">
            {group.memberships?.map(m => (
              <div key={m.user.id} className="flex items-center gap-4 p-4 border-b border-[var(--card-border)] last:border-0 relative">
                {m.user.avatar ? (
                  <img src={m.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-sm font-medium">{getInitials(m.user.name)}</div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{m.user.name} {m.user.id === user?.id && <span className="text-muted">(You)</span>}</p>
                  <p className="text-xs text-muted">{m.user.email}</p>
                </div>
                {m.role === 'ADMIN' && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" /> Admin</span>}
                {m.user.id !== user?.id && role === 'ADMIN' && (
                  <div className="relative">
                    <button onClick={() => setMemberMenuFor(memberMenuFor === m.user.id ? null : m.user.id)} className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)]">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {memberMenuFor === m.user.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMemberMenuFor(null)} />
                        <div className="absolute right-0 top-10 z-20 min-w-[180px] p-1 rounded-xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] shadow-xl">
                          {m.role === 'MEMBER' ? (
                            <button onClick={() => handlePromote(m.user.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--card-bg-hover)] text-sm text-left">
                              <ShieldPlus className="w-4 h-4 text-yellow-500" /> Make admin
                            </button>
                          ) : (
                            <button onClick={() => handleDemote(m.user.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--card-bg-hover)] text-sm text-left">
                              <Shield className="w-4 h-4 text-muted" /> Demote to member
                            </button>
                          )}
                          <button onClick={() => { setMemberMenuFor(null); handleRemoveMember(m.user.id); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 text-left">
                            <UserX className="w-4 h-4" /> Remove from group
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
        {showLeave ? (() => {
          const adminCount = (group.memberships || []).filter(m => m.role === 'ADMIN').length;
          const otherMembers = (group.memberships || []).filter(m => m.user.id !== user?.id);
          const isSoleAdmin = role === 'ADMIN' && adminCount === 1 && otherMembers.length > 0;
          return (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm mb-3 font-medium">Leave this group?</p>
              {isSoleAdmin && (
                <>
                  <p className="text-xs text-muted mb-2">You're the only admin. Pick a successor, or leave it blank to auto-transfer to the highest-XP member.</p>
                  <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)] text-sm">
                    <option value="">Auto-transfer (highest XP)</option>
                    {otherMembers.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
                  </select>
                </>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowLeave(false); setTransferTo(''); }} className="flex-1 py-2 rounded-lg bg-[var(--card-bg)] text-sm font-medium">Cancel</button>
                <button onClick={handleLeave} disabled={leaving} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-50">
                  {leaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Leave'}
                </button>
              </div>
            </div>
          );
        })() : (
          <button onClick={() => setShowLeave(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm">
            <LogOut className="w-4 h-4" /> Leave Group
          </button>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && <InviteModal group={group} onClose={() => setShowInvite(false)} onInvited={fetchData} />}

      {/* Settings Modal */}
      {showSettings && <SettingsModal group={group} onClose={() => setShowSettings(false)} onSaved={fetchData} />}

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

function SettingsModal({ group, onClose, onSaved }) {
  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [color, setColor] = useState(group.color || TASK_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await api.updateGroup(group.id, { name: name.trim(), description: description.trim() || null, color });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSave} className="w-full max-w-md p-6 rounded-2xl bg-[var(--card-bg-solid)] border border-[var(--card-border)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5" /> Group Settings</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)]"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-muted">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--input-border)] focus:outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-muted">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={200}
              className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--input-border)] focus:outline-none focus:border-brand-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-muted">Color</label>
            <div className="flex flex-wrap gap-2">
              {TASK_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('w-8 h-8 rounded-lg transition-all', color === c ? 'ring-2 ring-offset-2 ring-offset-[var(--card-bg-solid)] scale-110' : 'hover:scale-105')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-[var(--card-bg-hover)] font-medium">Cancel</button>
          <button type="submit" disabled={saving || !name.trim()} className="flex-1 py-3 rounded-xl btn-primary font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

const REACTION_EMOJIS = ['🎉', '💪', '🔥', '❤️', '👏'];

function AnalyticsTab({ analytics, setAnalytics, loading, currentUserId, expandedMember, setExpandedMember }) {
  const [pickerFor, setPickerFor] = useState(null);

  const applyLocalReaction = (completionId, emoji) => {
    setAnalytics(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        activityFeed: prev.activityFeed.map(a => {
          if (a.completionId !== completionId) return a;
          const my = new Set(a.myReactions || []);
          const counts = { ...(a.reactions || {}) };
          if (my.has(emoji)) {
            my.delete(emoji);
            counts[emoji] = Math.max(0, (counts[emoji] || 1) - 1);
            if (counts[emoji] === 0) delete counts[emoji];
          } else {
            my.add(emoji);
            counts[emoji] = (counts[emoji] || 0) + 1;
          }
          return { ...a, reactions: counts, myReactions: Array.from(my) };
        })
      };
    });
  };

  const toggleReaction = async (completionId, emoji) => {
    applyLocalReaction(completionId, emoji);
    setPickerFor(null);
    try { await api.toggleReaction(completionId, emoji); }
    catch { applyLocalReaction(completionId, emoji); } // revert
  };

  if (loading && !analytics) {
    return <div className="py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }
  if (!analytics) return null;

  const { groupPulse, members, activityFeed, days } = analytics;
  const streakLeaders = [...members].sort((a, b) => b.showUpStreak.current - a.showUpStreak.current).slice(0, 3);
  const activeTodayCount = members.filter(m => (m.history[m.history.length - 1]?.completedCount || 0) > 0).length;

  return (
    <div className="space-y-8">
      {/* Group Pulse — colored KPI tiles with icons */}
      <section>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-brand-500" /> Group Pulse</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <PulseTile color="blue" icon={<Activity className="w-5 h-5" />} label="Today avg" value={`${groupPulse.todayAvg}%`} sub={`${activeTodayCount} of ${members.length} active`} />
          <PulseTile color="purple" icon={<TrendingUp className="w-5 h-5" />} label="7-day avg" value={`${groupPulse.weekAvg}%`} sub="across all members" />
          <PulseTile color="green" icon={<CheckCircle2 className="w-5 h-5" />} label="Week completions" value={groupPulse.weekCompletions} sub="last 7 days" />
          <PulseTile color="orange" icon={<Flame className="w-5 h-5" />} label="Most active" value={groupPulse.mostActiveWeekday || '—'} sub="peak weekday" />
        </div>
      </section>

      {/* Top streakers — podium */}
      {streakLeaders.some(m => m.showUpStreak.current > 0) && (
        <section>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Top Show-up Streaks</h2>
          <div className="grid grid-cols-3 gap-3 items-end">
            {/* Render as podium: 2nd, 1st (taller), 3rd */}
            {[1, 0, 2].map(idx => {
              const m = streakLeaders[idx];
              if (!m || m.showUpStreak.current === 0) return <div key={idx} />;
              const rank = idx + 1;
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const isBronze = rank === 3;
              return (
                <div key={m.user.id} className={cn('p-4 rounded-2xl text-center relative',
                  isGold ? 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10 border border-yellow-500/40 shadow-lg shadow-yellow-500/10 transform sm:scale-105' :
                  isSilver ? 'bg-gradient-to-br from-zinc-300/15 to-zinc-400/5 border border-zinc-400/30' :
                  'bg-gradient-to-br from-amber-700/15 to-amber-800/5 border border-amber-700/30')}>
                  <div className={cn('absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-md',
                    isGold ? 'bg-yellow-500 text-white' : isSilver ? 'bg-zinc-400 text-white' : 'bg-amber-700 text-white')}>
                    {rank}
                  </div>
                  <div className="flex justify-center mb-2 mt-2">
                    {m.user.avatar ? (
                      <img src={m.user.avatar} alt="" className={cn('rounded-full object-cover', isGold ? 'w-14 h-14 ring-2 ring-yellow-500' : 'w-12 h-12')} />
                    ) : (
                      <div className={cn('rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center font-bold', isGold ? 'w-14 h-14 text-base ring-2 ring-yellow-500' : 'w-12 h-12 text-sm')}>{getInitials(m.user.name)}</div>
                    )}
                  </div>
                  <p className={cn('font-semibold truncate', isGold ? 'text-base' : 'text-sm')}>{m.user.id === currentUserId ? 'You' : m.user.name.split(' ')[0]}</p>
                  <p className={cn('font-black tabular-nums', isGold ? 'text-2xl text-yellow-500' : isSilver ? 'text-xl text-zinc-400' : 'text-xl text-amber-600')}>{m.showUpStreak.current}<span className="text-xs font-semibold ml-0.5 opacity-70">d</span></p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">in a row</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Per-member history — redesigned cards */}
      <section>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-brand-500" /> Member History <span className="text-xs text-muted font-normal">(last {days} days)</span></h2>
        <div className="space-y-3">
          {[...members].sort((a, b) => (a.user.id === currentUserId ? -1 : b.user.id === currentUserId ? 1 : b.totalXp - a.totalXp)).map(m => {
            const isMe = m.user.id === currentUserId;
            const isOpen = expandedMember === m.user.id;
            const lvl = getLevel(m.totalXp || 0);
            return (
              <div key={m.user.id} className={cn('rounded-2xl glass-card overflow-hidden transition-all',
                isMe && 'ring-1 ring-brand-500/30 bg-brand-500/5')}>
                <div className="p-4">
                  {/* Top row: avatar + name + level + chevron */}
                  <div className="flex items-center gap-3 mb-3">
                    {m.user.avatar ? (
                      <img src={m.user.avatar} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-sm font-bold shrink-0">{getInitials(m.user.name)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold truncate">{isMe ? 'You' : m.user.name}</p>
                        {m.role === 'ADMIN' && <span className="flex items-center gap-1 text-[10px] bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded-full font-bold"><Crown className="w-3 h-3" /> Admin</span>}
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--card-bg-hover)]', lvl.color)}>Lv.{lvl.level} {lvl.name}</span>
                      </div>
                      {m.topHabit && (
                        <p className="text-xs text-muted mt-0.5 truncate">Favorite: <span className="font-medium text-primary">{m.topHabit.title}</span> <span className="opacity-60">({m.topHabit.completions}×)</span></p>
                      )}
                    </div>
                    <button onClick={() => setExpandedMember(isOpen ? null : m.user.id)} className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted shrink-0">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Stat row */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <InlineStat label="Streak" value={`${m.showUpStreak.current}d`} accent="text-orange-400" />
                    <InlineStat label="Longest" value={`${m.showUpStreak.longest}d`} />
                    <InlineStat label="Done" value={m.totalCompletions} accent="text-green-500" />
                    <InlineStat label="XP" value={m.totalXp} accent="text-yellow-500" />
                  </div>

                  {/* Full-width heatmap */}
                  <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${Math.min(m.history.length, days)}, 1fr)` }}>
                    {m.history.map((h, idx, arr) => {
                      const pending = idx === arr.length - 1 && h.totalCount > 0 && h.completedCount === 0;
                      return (
                        <div key={h.date} title={`${h.date}: ${pending ? 'In progress' : `${h.completedCount}/${h.totalCount} · ${h.score}%`}`}
                          className={cn('h-5 rounded-sm',
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
                </div>

                {isOpen && (
                  <div className="border-t border-[var(--card-border)] p-4 bg-[var(--card-bg-hover)]/30">
                    <p className="text-xs uppercase tracking-wider text-muted mb-3 font-semibold">Last 7 days breakdown</p>
                    <div className="flex items-end justify-between gap-2 h-20">
                      {m.last7Days.map(d => {
                        const date = new Date(d.date + 'T12:00:00');
                        const label = date.toLocaleDateString('en-US', { weekday: 'short' });
                        const pending = d === m.last7Days[m.last7Days.length - 1] && d.totalCount > 0 && d.completedCount === 0;
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5" title={`${d.date}: ${pending ? 'In progress' : `${d.completedCount}/${d.totalCount} · ${d.score}%`}`}>
                            <div className="relative w-full flex items-end" style={{ height: '64px' }}>
                              <div className={cn('w-full rounded-lg',
                                pending ? 'bg-[var(--card-bg-hover)] border-2 border-dashed border-blue-400' :
                                d.totalCount === 0 ? 'bg-[var(--card-bg-hover)]' :
                                d.score >= 80 ? 'bg-gradient-to-t from-green-500 to-green-400' :
                                d.score >= 50 ? 'bg-gradient-to-t from-blue-500 to-blue-400' :
                                d.score > 0 ? 'bg-gradient-to-t from-amber-500 to-amber-400' :
                                'bg-red-500/30')}
                                style={{ height: `${Math.max(d.score, 8)}%` }} />
                            </div>
                            <span className="text-[10px] font-semibold text-muted">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" />≥80%</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" />≥50%</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" />&lt;50%</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500/30" />Missed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-dashed border-blue-400" />Today</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[var(--card-bg-hover)]" />No habits</span>
        </div>
      </div>

      {/* Activity feed */}
      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Recent Activity</h2>
        {activityFeed.length === 0 ? (
          <div className="p-6 rounded-2xl glass-card text-center text-sm text-muted">No completions yet.</div>
        ) : (
          <div className="rounded-2xl glass-card overflow-hidden">
            {activityFeed.map((a) => {
              const activeReactions = Object.entries(a.reactions || {}).filter(([, n]) => n > 0);
              const isMine = a.userId === currentUserId;
              return (
                <div key={a.completionId} className="p-3 border-b border-[var(--card-border)] last:border-0">
                  <div className="flex items-center gap-3">
                    {a.userAvatar ? (
                      <img src={a.userAvatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-xs font-bold shrink-0">{getInitials(a.userName)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{isMine ? 'You' : a.userName}</span>
                        {' '}completed{' '}
                        <span className="font-medium">{a.taskTitle}</span>
                      </p>
                      <p className="text-xs text-muted">{new Date(a.completedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    {a.proofUrl && (
                      <img src={a.proofUrl} alt="proof" className="w-10 h-10 rounded-md object-cover border border-green-500/30 shrink-0" />
                    )}
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 ml-12 flex-wrap">
                    {activeReactions.map(([emoji, count]) => {
                      const mine = (a.myReactions || []).includes(emoji);
                      return (
                        <button key={emoji} type="button"
                          disabled={isMine}
                          onClick={() => !isMine && toggleReaction(a.completionId, emoji)}
                          className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors',
                            mine ? 'bg-brand-500/15 border border-brand-500/40 text-brand-500' : 'bg-[var(--card-bg-hover)] border border-[var(--card-border)] hover:bg-[var(--card-bg-solid)]',
                            isMine && 'cursor-default')}>
                          <span>{emoji}</span><span className="tabular-nums">{count}</span>
                        </button>
                      );
                    })}
                    {!isMine && (
                      <div className="relative">
                        <button type="button" onClick={() => setPickerFor(pickerFor === a.completionId ? null : a.completionId)}
                          className="px-2 py-0.5 rounded-full text-xs bg-[var(--card-bg-hover)] border border-[var(--card-border)] hover:bg-[var(--card-bg-solid)] text-muted">
                          +
                        </button>
                        {pickerFor === a.completionId && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setPickerFor(null)} />
                            <div className="absolute left-0 top-7 z-20 flex items-center gap-1 p-1.5 rounded-xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] shadow-xl">
                              {REACTION_EMOJIS.map(e => {
                                const mine = (a.myReactions || []).includes(e);
                                return (
                                  <button key={e} type="button" onClick={() => toggleReaction(a.completionId, e)}
                                    className={cn('w-9 h-9 rounded-lg text-lg transition-transform hover:scale-125', mine && 'bg-brand-500/15')}>
                                    {e}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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

function InlineStat({ label, value, accent }) {
  return (
    <div className="p-2 rounded-lg bg-[var(--card-bg-hover)] text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">{label}</p>
      <p className={cn('font-black text-sm tabular-nums', accent || 'text-primary')}>{value}</p>
    </div>
  );
}
