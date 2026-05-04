'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Users, Trophy, Crown, Copy, Check, Loader2, UserPlus, Mail, Search, Target, Plus, CheckCircle2, Circle, Edit2, LogOut, X, ChevronDown, ChevronRight, Zap, AlertTriangle, Star, Camera, Skull, MoreVertical, Settings, ShieldPlus, Shield, UserX, BarChart3, TrendingUp, TrendingDown, Activity, Flame, Hourglass, Link2, CopyPlus, ImagePlus, Clock } from 'lucide-react';
import { cn, getFrequencyLabel, getScoreColor, TASK_COLORS, getInitials, getLevel, formatDeadline, isPastDeadline } from '@/lib/utils';
import ImageCropper from '@/components/ImageCropper';

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copyingHabit, setCopyingHabit] = useState(null);
  const [copyConfirm, setCopyConfirm] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [memberMenuFor, setMemberMenuFor] = useState(null);
  const [transferTo, setTransferTo] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [expandedAnalyticsMember, setExpandedAnalyticsMember] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [shameUserIds, setShameUserIds] = useState(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [groupRes, leaderboardRes, tasksRes, memberTasksRes, shameRes] = await Promise.all([
        api.getGroup(groupId),
        api.getLeaderboard(groupId, period),
        api.getTasks({ groupId }),
        api.getMemberTasks(groupId),
        api.getShameWall(groupId).catch(() => ({ items: [] })),
      ]);
      setGroup(groupRes.group);
      setRole(groupRes.role);
      setLeaderboard(leaderboardRes.leaderboard || []);
      setTasks(tasksRes.tasks || []);
      setMemberTasks(memberTasksRes.memberTasks || []);
      setShameUserIds(new Set((shameRes.items || []).map(i => i.userId)));
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

  const copyLink = async () => {
    if (!group?.inviteCode || typeof window === 'undefined') return;
    const link = `${window.location.origin}/join?code=${group.inviteCode}`;
    const shareText = `Join my "${group.name}" group on HabitSquad: ${link}`;

    // Prefer the native share sheet (HTTPS only — iOS Safari blocks on plain HTTP)
    if (navigator.share && window.isSecureContext) {
      try {
        await navigator.share({ title: `Join "${group.name}" on HabitSquad`, text: shareText, url: link });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback: open our custom share menu
    setShowShare(true);
  };

  const copyLinkToClipboard = async () => {
    if (!group?.inviteCode || typeof window === 'undefined') return;
    const link = `${window.location.origin}/join?code=${group.inviteCode}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000);
        setShowShare(false);
        return;
      }
    } catch {}
    const ta = document.createElement('textarea');
    ta.value = link;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    if (copied) {
      setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000);
      setShowShare(false);
    } else {
      window.prompt('Copy this invite link:', link);
    }
  };

  const handleCopyHabit = async (task) => {
    if (!task || copyingHabit) return;
    setCopyingHabit(task.id);
    try {
      await api.createTask({
        title: task.title,
        frequency: task.frequency,
        weightage: 5,
        color: task.color,
        groupId: groupId,
        requiresProof: task.requiresProof,
        redistribute: true
      });
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to copy habit');
    } finally {
      setCopyingHabit(null);
    }
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
        {group.image ? (
          <button onClick={() => setViewProof({ title: group.name, url: group.image })}
            className="w-12 h-12 rounded-xl shrink-0 overflow-hidden hover:ring-2 hover:ring-brand-500/40 transition-all">
            <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
          </button>
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: (group.color || '#8b5cf6') + '20' }}>
            {group.name.charAt(0)}
          </div>
        )}
        <button onClick={() => setShowInfo(true)} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold truncate">{group.name}</h1>
            {role === 'ADMIN' && <Crown className="w-5 h-5 text-yellow-500 shrink-0" />}
            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
          </div>
          {group.description ? (
            <p className="text-muted text-sm truncate">{group.description}</p>
          ) : (
            <p className="text-muted text-xs italic truncate">Tap for group info</p>
          )}
        </button>
        <button onClick={copyLink} className="flex items-center gap-2 px-3 py-2 rounded-lg gradient-brand text-white text-sm font-semibold hover:opacity-90 shrink-0">
          <UserPlus className="w-4 h-4" /> Invite
        </button>
      </div>


      {/* Tabs */}
      <div className="grid grid-cols-5 gap-1 mb-6 p-1 rounded-xl bg-[var(--card-bg)]">
        {[{ id: 'habits', label: 'Habits', icon: Target }, { id: 'shame', label: 'Shame', icon: Skull }, { id: 'activity', label: 'Activity', icon: Activity }, { id: 'leaderboard', label: 'Ranks', icon: Trophy }, { id: 'analytics', label: 'Stats', icon: BarChart3 }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-semibold transition-colors',
              tab === t.id ? 'bg-brand-500/15 text-brand-500' : 'text-muted hover:text-primary hover:bg-[var(--card-bg-hover)]')}>
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
                const isPerfect = member.totalCount > 0 && member.score === 100;
                const isBehind = member.totalCount > 0 && member.score > 0 && member.score < 50;
                const noActivity = member.totalCount > 0 && member.completedCount === 0;
                const hasNoTasks = member.totalCount === 0;
                const lvl = getLevel(member.totalXp || 0);
                const isShamed = shameUserIds.has(member.user.id);

                // Shamed members get a loud red treatment so the group can see who's slipping.
                return (
                  <div key={member.user.id} className={cn('rounded-xl border overflow-hidden relative',
                    isShamed ? 'bg-red-500/10 border-red-500/50 ring-2 ring-red-500/40 shadow-lg shadow-red-500/10' :
                    cn(mColor.bg, mColor.border, isPerfect && 'ring-1 ring-green-500/40'))}>
                    {/* Member Header */}
                    <button onClick={() => toggleMember(member.user.id)} className={cn('w-full flex items-center gap-4 p-4 transition-colors',
                      isShamed ? 'hover:bg-red-500/15' : 'hover:bg-[var(--card-bg-hover)]')}>
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 relative',
                        isShamed ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500' :
                        cn(mColor.avatarBg, mColor.accent))}>
                        {member.user.avatar ? (
                          <img src={member.user.avatar} alt="" className={cn('w-full h-full rounded-full object-cover', isShamed && 'grayscale')} />
                        ) : getInitials(member.user.name)}
                        {isShamed ? (
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center ring-2 ring-[var(--card-bg-solid)] animate-pulse">
                            <Skull className="w-3 h-3 text-white" />
                          </span>
                        ) : isPerfect && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-[var(--card-bg-solid)]">
                            <Star className="w-2.5 h-2.5 text-white fill-white" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={cn('font-semibold truncate flex items-center gap-1.5', isShamed && 'text-red-500')}>
                          {isMe ? 'You' : member.user.name}
                          {member.role === 'ADMIN' && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                          {isShamed && (
                            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-md whitespace-nowrap">
                              <Skull className="w-3 h-3" /> SHAMED · 2d silent
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className={cn('font-bold', lvl.color)}>Lv.{lvl.level}</span>
                          <span>·</span>
                          <span className={cn(isShamed && 'text-red-500 font-semibold')}>
                            {hasNoTasks ? 'No habits yet' :
                              noActivity ? "Hasn't started today" :
                              `${member.completedCount}/${member.totalCount} done`}
                          </span>
                          {isPerfect && !isShamed && <span className="ml-1 text-[10px] bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Star className="w-2.5 h-2.5 fill-green-600" /> Perfect</span>}
                          {isBehind && !isShamed && <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1"><TrendingDown className="w-2.5 h-2.5" /> Behind</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={cn('text-xl font-bold tabular-nums', isPerfect ? 'text-green-500' : isBehind ? 'text-amber-500' : mColor.accent)}>{member.score}%</div>
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
                          {member.tasks.map(task => {
                            const lockedByDeadline = isMe && !task.completedToday && task.deadlineTime && isPastDeadline(task.deadlineTime);
                            return (
                            <div key={task.id} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg',
                              task.completedToday ? 'bg-green-500/5' :
                              lockedByDeadline ? 'bg-red-500/5' :
                              'hover:bg-[var(--card-bg-hover)]')}>
                              {/* If it's my task, make it toggleable */}
                              {isMe ? (
                                <button onClick={() => handleToggle(task)}
                                  disabled={completing === task.id || lockedByDeadline}
                                  title={lockedByDeadline ? 'Deadline passed — can\'t mark done' : ''}
                                  className={cn('flex-shrink-0', lockedByDeadline && 'cursor-not-allowed opacity-60')}>
                                  {completing === task.id ? <Loader2 className="w-5 h-5 animate-spin text-brand-500" /> :
                                   task.completedToday ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                                   lockedByDeadline ? <Circle className="w-5 h-5 text-red-500/60" /> :
                                   <Circle className="w-5 h-5 text-muted hover:text-green-400 transition-colors" />}
                                </button>
                              ) : (
                                <div className="flex-shrink-0">
                                  {task.completedToday ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted" />}
                                </div>
                              )}
                              <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: task.color || TASK_COLORS[0] }} />
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium', task.completedToday && 'text-muted line-through')}>{task.title}</p>
                                <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                                  <span>{getFrequencyLabel(task.frequency)}</span>
                                  {task.group && <span>&middot; {task.group.name}</span>}
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
                                <button onClick={(e) => { e.stopPropagation(); setViewProof({ title: task.title, url: task.proofUrl }); }}
                                  className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-green-500/30 hover:border-green-500/60 transition-colors">
                                  <img src={task.proofUrl} alt="proof" className="w-full h-full object-cover" />
                                </button>
                              )}
                              <div className="px-2 py-0.5 rounded bg-[var(--card-bg-hover)] text-xs text-muted">{task.weightage}pts</div>
                              {!isMe && (
                                <button onClick={() => setCopyConfirm({ task, fromName: member.user.name })} disabled={copyingHabit === task.id}
                                  title="Copy this habit to my list"
                                  className="p-1.5 rounded-lg hover:bg-brand-500/15 text-muted hover:text-brand-500 transition-colors disabled:opacity-50">
                                  {copyingHabit === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CopyPlus className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              {isMe && <Link href={`/dashboard/tasks/${task.id}`} className="p-1.5 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></Link>}
                            </div>
                          );
                          })}
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

      {/* Activity Tab */}
      {tab === 'activity' && (
        <ActivityTab
          groupId={groupId}
          currentUserId={user?.id}
          onViewProof={setViewProof}
        />
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <AnalyticsTab
          analytics={analytics}
          loading={analyticsLoading}
          currentUserId={user?.id}
          expandedMember={expandedAnalyticsMember}
          setExpandedMember={setExpandedAnalyticsMember}
          groupId={groupId}
        />
      )}

      {/* Shame Tab */}
      {tab === 'shame' && <ShameTab groupId={groupId} currentUserId={user?.id} />}

      {/* Invite Modal */}
      {showInvite && <InviteModal group={group} onClose={() => setShowInvite(false)} onInvited={fetchData} />}

      {/* Share sheet — WhatsApp + Copy link only */}
      {showShare && (() => {
        const link = `${window.location.origin}/join?code=${group.inviteCode}`;
        const text = `Join my "${group.name}" group on HabitSquad: ${link}`;
        const whatsappHref = `https://wa.me/?text=${encodeURIComponent(text)}`;
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowShare(false)}>
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold">Share invite</h2>
                <button onClick={() => setShowShare(false)} className="p-1.5 rounded-lg hover:bg-[var(--card-bg-hover)] text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                  onClick={() => setTimeout(() => setShowShare(false), 200)}
                  className="w-full p-3 rounded-xl bg-[var(--card-bg-hover)] hover:bg-[var(--card-bg)] flex items-center gap-3 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center text-xl">💬</div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold">WhatsApp</p>
                    <p className="text-xs text-muted">Share via WhatsApp chat</p>
                  </div>
                </a>
                <button onClick={copyLinkToClipboard}
                  className="w-full p-3 rounded-xl bg-[var(--card-bg-hover)] hover:bg-[var(--card-bg)] flex items-center gap-3 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-500 flex items-center justify-center">
                    {copiedLink ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold">{copiedLink ? 'Link copied!' : 'Copy link'}</p>
                    <p className="text-xs text-muted truncate">{link}</p>
                  </div>
                </button>
                <button onClick={() => { setShowShare(false); setShowInvite(true); }}
                  className="w-full p-3 rounded-xl bg-[var(--card-bg-hover)] hover:bg-[var(--card-bg)] flex items-center gap-3 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold">Find a user / email invite</p>
                    <p className="text-xs text-muted">Search by name or invite via email</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Group Info Modal — opens when tapping the group name */}
      {showInfo && (
        <GroupInfoModal
          group={group}
          role={role}
          currentUserId={user?.id}
          memberMenuFor={memberMenuFor}
          setMemberMenuFor={setMemberMenuFor}
          onClose={() => setShowInfo(false)}
          onSaved={fetchData}
          onRemoveMember={handleRemoveMember}
          onPromote={handlePromote}
          onDemote={handleDemote}
          onCancelInvite={handleCancelInvite}
          onLeave={() => { setShowInfo(false); setShowLeave(true); }}
          onEditSettings={() => { setShowInfo(false); setShowSettings(true); }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsModal group={group} role={role} onClose={() => setShowSettings(false)} onSaved={fetchData} />}

      {/* Leave Group Modal (existing flow) */}
      {showLeave && (() => {
        const adminCount = (group.memberships || []).filter(m => m.role === 'ADMIN').length;
        const otherMembers = (group.memberships || []).filter(m => m.user.id !== user?.id);
        const isSoleAdmin = role === 'ADMIN' && adminCount === 1 && otherMembers.length > 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowLeave(false); setTransferTo(''); }}>
            <div className="w-full max-w-sm p-6 rounded-2xl bg-[var(--card-bg-solid)] border border-[var(--card-border)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-500">
                  <LogOut className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold">Leave this group?</h2>
              </div>
              {isSoleAdmin && (
                <>
                  <p className="text-xs text-muted mb-2">You're the only admin. Pick a successor or leave blank to auto-transfer to the highest-XP member.</p>
                  <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)] text-sm">
                    <option value="">Auto-transfer (highest XP)</option>
                    {otherMembers.map(m => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
                  </select>
                </>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowLeave(false); setTransferTo(''); }} className="flex-1 py-2.5 rounded-xl bg-[var(--card-bg)] text-sm font-medium hover:bg-[var(--card-bg-hover)]">Cancel</button>
                <button onClick={handleLeave} disabled={leaving} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50">
                  {leaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Leave'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Copy Habit Confirmation */}
      {copyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCopyConfirm(null)}>
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[var(--card-bg-solid)] border border-[var(--card-border)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-500">
                <CopyPlus className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold">Copy this habit?</h2>
            </div>
            <p className="text-sm text-muted mb-1">Add <span className="font-semibold text-primary">"{copyConfirm.task.title}"</span> to your habits in this group.</p>
            <p className="text-xs text-muted mb-5">From {copyConfirm.fromName}'s list. Weightage will be balanced against your existing tasks.</p>
            <div className="flex gap-3">
              <button onClick={() => setCopyConfirm(null)} disabled={!!copyingHabit}
                className="flex-1 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] font-medium text-sm">
                Cancel
              </button>
              <button onClick={async () => {
                  const t = copyConfirm.task;
                  setCopyConfirm(null);
                  await handleCopyHabit(t);
                }} disabled={!!copyingHabit}
                className="flex-1 py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {copyingHabit ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CopyPlus className="w-4 h-4" /> Copy habit</>}
              </button>
            </div>
          </div>
        </div>
      )}

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

function GroupInfoModal({ group, role, currentUserId, memberMenuFor, setMemberMenuFor, onClose, onSaved, onRemoveMember, onPromote, onDemote, onCancelInvite, onLeave, onEditSettings }) {
  const isAdmin = role === 'ADMIN';
  const memberships = group.memberships || [];
  const invites = group.invites || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full sm:max-w-md h-[92dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        {/* Always-visible close button — fixed to the modal frame, doesn't scroll */}
        <button onClick={onClose} className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm shadow-lg">
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero header */}
          <div className="aspect-square w-full max-h-[280px] flex items-center justify-center text-6xl font-bold overflow-hidden"
            style={{ backgroundColor: (group.color || '#8b5cf6') + '20' }}>
            {group.image ? (
              <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              <span style={{ color: group.color || '#8b5cf6' }}>{group.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="p-5 space-y-5">
          {/* Name + description */}
          <div>
            <div className="flex items-start gap-2">
              <h2 className="text-xl font-bold flex-1 break-words">{group.name}</h2>
              {role === 'ADMIN' && <Crown className="w-5 h-5 text-yellow-500 mt-1 shrink-0" />}
            </div>
            {group.description ? (
              <p className="text-sm text-muted mt-1">{group.description}</p>
            ) : (
              <p className="text-sm text-muted italic mt-1">No description</p>
            )}

            {/* Creation meta */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted">
              {group.createdBy?.avatar ? (
                <img src={group.createdBy.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-[9px] font-bold">
                  {group.createdBy?.name ? getInitials(group.createdBy.name) : '?'}
                </div>
              )}
              <span>
                Created by <span className="font-medium text-primary">{group.createdBy?.id === currentUserId ? 'you' : (group.createdBy?.name || 'someone')}</span>
                {' '}on{' '}
                <span className="font-medium text-primary">
                  {new Date(group.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </span>
            </div>

            <button onClick={onEditSettings} className="mt-3 text-xs text-brand-500 hover:underline font-semibold flex items-center gap-1">
              <Settings className="w-3.5 h-3.5" /> Edit group info
            </button>
          </div>

          {/* Members */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Members ({memberships.length})</p>
            <div className="rounded-xl glass-card overflow-hidden">
              {memberships.map(m => (
                <div key={m.user.id} className="flex items-center gap-3 p-3 border-b border-[var(--card-border)] last:border-0 relative">
                  {m.user.avatar ? (
                    <img src={m.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-sm font-medium shrink-0">{getInitials(m.user.name)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.user.id === currentUserId ? 'You' : m.user.name}</p>
                    <p className="text-xs text-muted truncate">{m.user.email}</p>
                  </div>
                  {m.role === 'ADMIN' && <span className="text-[10px] bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold shrink-0"><Crown className="w-3 h-3" /> Admin</span>}
                  {m.user.id !== currentUserId && isAdmin && (
                    <div className="relative shrink-0">
                      <button onClick={() => setMemberMenuFor(memberMenuFor === m.user.id ? null : m.user.id)} className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)]">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {memberMenuFor === m.user.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMemberMenuFor(null)} />
                          <div className="absolute right-0 top-10 z-40 min-w-[180px] p-1 rounded-xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] shadow-xl">
                            {m.role === 'MEMBER' ? (
                              <button onClick={() => onPromote(m.user.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--card-bg-hover)] text-sm text-left">
                                <ShieldPlus className="w-4 h-4 text-yellow-500" /> Make admin
                              </button>
                            ) : (
                              <button onClick={() => onDemote(m.user.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--card-bg-hover)] text-sm text-left">
                                <Shield className="w-4 h-4 text-muted" /> Demote to member
                              </button>
                            )}
                            <button onClick={() => { setMemberMenuFor(null); onRemoveMember(m.user.id); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm text-red-400 text-left">
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
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Pending Invites</p>
              <div className="rounded-xl glass-card overflow-hidden">
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 p-3 border-b border-[var(--card-border)] last:border-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-muted" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted">Invited {new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold shrink-0">Pending</span>
                    {isAdmin && <button onClick={() => onCancelInvite(inv.id)} className="text-xs text-muted hover:text-red-400 font-medium">Cancel</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave group */}
          <button onClick={onLeave}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold">
            <LogOut className="w-4 h-4" /> Leave Group
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ group, role, onClose, onSaved }) {
  const isAdmin = role === 'ADMIN';
  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [color, setColor] = useState(group.color || TASK_COLORS[0]);
  const [image, setImage] = useState(group.image || '');
  const [cropSrc, setCropSrc] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError('Image must be under 20MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isAdmin && !name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { description: description.trim() || null, color, image: image || null };
      if (isAdmin) payload.name = name.trim();
      await api.updateGroup(group.id, payload);
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
            <label className="block text-sm font-medium mb-2 text-muted">Group photo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold shrink-0" style={{ backgroundColor: (color || '#8b5cf6') + '20' }}>
                {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : (name || group.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                <label className="px-3 py-2 rounded-lg bg-[var(--card-bg-hover)] hover:bg-[var(--card-bg)] cursor-pointer text-sm font-medium flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" /> {image ? 'Change' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
                {image && (
                  <button type="button" onClick={() => setImage('')} className="px-3 py-2 rounded-lg bg-[var(--card-bg-hover)] hover:bg-red-500/10 hover:text-red-400 text-sm font-medium">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-muted flex items-center gap-2">
              Name {!isAdmin && <span className="text-[10px] font-normal text-muted/80 italic">(admins only)</span>}
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
              disabled={!isAdmin}
              className={cn('w-full px-4 py-3 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--input-border)] focus:outline-none focus:border-brand-500', !isAdmin && 'opacity-60 cursor-not-allowed')} />
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
          <button type="submit" disabled={saving || (isAdmin && !name.trim()) || uploadingImage} className="flex-1 py-3 rounded-xl btn-primary font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save'}
          </button>
        </div>
      </form>

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          title="Crop group photo"
          onCancel={() => setCropSrc(null)}
          onConfirm={async (dataUrl) => {
            setUploadingImage(true);
            try {
              const { url } = await api.uploadImage(dataUrl, 'groups');
              setImage(url);
              setCropSrc(null);
            } catch (err) {
              setError(err.message || 'Upload failed');
              setCropSrc(null);
            } finally {
              setUploadingImage(false);
            }
          }}
        />
      )}
    </div>
  );
}

const REACTION_EMOJIS = ['🎉', '💪', '🔥', '❤️', '👏'];

function AnalyticsTab({ analytics, loading, currentUserId, expandedMember, setExpandedMember, groupId }) {

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-brand-500" /> Group Pulse</h2>
          {groupId && (
            <Link href={`/dashboard/groups/${groupId}/compare`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 text-sm font-medium">
              Compare members <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-green-500" />≥80%</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-blue-500" />≥50%</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-amber-500" />&lt;50%</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-red-500/30" />Missed</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm border border-dashed border-blue-400" />Today</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="w-3 h-3 rounded-sm bg-[var(--card-bg-hover)]" />No habits</span>
        </div>
      </section>
    </div>
  );
}

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  switch (n % 10) {
    case 1: return n + 'st';
    case 2: return n + 'nd';
    case 3: return n + 'rd';
    default: return n + 'th';
  }
}

// Build a data-driven sub-line. No hardcoded jokes.
function autoTaunt(item, stats) {
  const since = new Date(item.since);
  const sinceLabel = since.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const parts = [`On the wall since ${sinceLabel}`];

  const offender = stats?.repeatOffenders?.find(o => o.userId === item.userId);
  if (offender && offender.count > 1) parts.push(`${ordinal(offender.count)} offence this month`);
  if (item.daysMissed >= 7) parts.push('over a week silent');

  return parts.join(' · ');
}

function ShameTab({ groupId, currentUserId }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getShameWall(groupId).then(res => {
      if (cancelled) return;
      setItems(res.items || []);
      setStats(res.stats || null);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId]);

  if (loading) {
    return <div className="py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  const meIsShamed = items.some(i => i.userId === currentUserId);
  const ghostPct = stats && stats.memberCount > 0 ? Math.round((stats.openCount / stats.memberCount) * 100) : 0;

  const hasRealRepeats = stats && stats.repeatOffenders.some(o => o.count >= 2);
  const recentCleared = stats?.recentlyCleared || [];

  return (
    <div className="space-y-5">
      {/* Header — compact */}
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          items.length > 0 ? 'bg-red-500/15 text-red-500' : 'bg-emerald-500/15 text-emerald-500')}>
          <Skull className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg leading-tight">Wall of Shame</h2>
          <p className="text-xs text-muted mt-0.5">
            Skip every habit for 2 days in a row → you land here. Complete any habit to clear it.
          </p>
        </div>
      </div>

      {/* Self banner — when you're on the wall */}
      {meIsShamed && (
        <div className="rounded-2xl bg-gradient-to-br from-red-500/15 to-rose-500/10 border-2 border-red-500/40 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shrink-0 animate-pulse">
              <Skull className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-500 mb-0.5">You're on the wall</p>
              <p className="text-sm text-muted">Complete any habit in the <span className="font-semibold text-primary">Habits</span> tab today to clear your name.</p>
            </div>
          </div>
        </div>
      )}

      {/* All-clear celebration */}
      {!meIsShamed && items.length === 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/30 p-5 text-center">
          <Star className="w-8 h-8 text-emerald-500 fill-emerald-500 mx-auto mb-2" />
          <p className="font-bold text-emerald-600">All clear</p>
          <p className="text-sm text-muted">Nobody's been silent for 2+ days. The whole group is showing up.</p>
        </div>
      )}

      {/* Group stats — KPI tiles */}
      {stats && (stats.openCount > 0 || stats.totalEventsThisMonth > 0) && (
        <div>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">This month</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <SmallStat color="red" icon={<Skull className="w-4 h-4" />} value={stats.openCount} label="On the wall" sub={`of ${stats.memberCount} members`} />
            <SmallStat color="orange" icon={<Flame className="w-4 h-4" />} value={`${stats.totalSilentDaysThisMonth}d`} label="Total silent" sub="across all events" />
            <SmallStat color="purple" icon={<Activity className="w-4 h-4" />} value={stats.totalEventsThisMonth} label="Shame events" sub="from the 1st" />
            <SmallStat color="green" icon={<Star className="w-4 h-4" />} value={stats.cleanCount} label="Clean record" sub="never shamed" />
          </div>
        </div>
      )}

      {/* Currently on the wall — rich rows showing missed habits */}
      {items.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Skull className="w-3.5 h-3.5" /> On the wall right now
          </h3>
          <div className="space-y-2">
            {items.map((it) => {
              const isMine = it.userId === currentUserId;
              const sinceLabel = new Date(it.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const offender = stats?.repeatOffenders?.find(o => o.userId === it.userId);
              const isRepeat = offender && offender.count > 1;
              const overWeek = it.daysMissed >= 7;
              return (
                <div key={it.id} className={cn('rounded-2xl border p-3',
                  isMine ? 'bg-red-500/10 border-red-500/50' : 'bg-[var(--card-bg)] border-red-500/20')}>
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {it.userAvatar
                        ? <img src={it.userAvatar} alt="" className="w-12 h-12 rounded-full object-cover grayscale" />
                        : <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center text-sm font-black">{getInitials(it.userName)}</div>}
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center ring-2 ring-[var(--card-bg-solid)]">
                        <Skull className="w-3 h-3 text-white" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={cn('font-bold text-sm', isMine && 'text-red-500')}>{isMine ? 'You' : it.userName}</p>
                        {isRepeat && <span className="text-[9px] bg-orange-500/15 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-bold">{ordinal(offender.count)} TIME</span>}
                        {overWeek && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">OVER A WEEK</span>}
                      </div>
                      <p className="text-[11px] text-muted">Since {sinceLabel}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-red-500 tabular-nums leading-none">{it.daysMissed}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">days silent</p>
                    </div>
                  </div>
                  {/* Habits being skipped */}
                  {it.habits && it.habits.length > 0 && (
                    <div className="mt-2.5 ml-15 pl-15 pt-2 border-t border-red-500/15">
                      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5">Skipping {it.habits.length} habit{it.habits.length === 1 ? '' : 's'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {it.habits.slice(0, 5).map(h => (
                          <span key={h.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--card-bg-hover)] text-[11px] line-through opacity-70">
                            <span className="w-1.5 h-3 rounded-sm shrink-0" style={{ backgroundColor: h.color || '#ef4444' }} />
                            {h.title}
                          </span>
                        ))}
                        {it.habits.length > 5 && <span className="text-[11px] text-muted self-center">+{it.habits.length - 5}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Repeat offenders — only when someone has 2+ events */}
      {hasRealRepeats && (
        <div>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" /> Repeat offenders this month
          </h3>
          <div className="rounded-2xl glass-card overflow-hidden divide-y divide-[var(--card-border)]">
            {stats.repeatOffenders.filter(o => o.count >= 2).map((m, i) => {
              const isMe = m.userId === currentUserId;
              return (
                <div key={m.userId} className={cn('flex items-center gap-3 p-3', isMe && 'bg-red-500/10')}>
                  <div className="w-6 h-6 rounded-md bg-red-500/15 text-red-500 flex items-center justify-center text-[11px] font-black tabular-nums shrink-0">#{i + 1}</div>
                  {m.avatar
                    ? <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center text-xs font-bold shrink-0">{getInitials(m.name)}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                      {isMe ? 'You' : m.name}
                      {m.currentlyOpen && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">LIVE</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-red-500 tabular-nums">{m.count}</span>
                    <span className="text-[11px] text-muted ml-1">events · {m.totalDays}d total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently cleared — comeback wins */}
      {recentCleared.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500" /> Recently cleared
          </h3>
          <div className="rounded-2xl glass-card overflow-hidden divide-y divide-[var(--card-border)]">
            {recentCleared.map(c => {
              const cleared = new Date(c.clearedAt);
              const sinceDate = new Date(c.since);
              const isMe = c.userId === currentUserId;
              return (
                <div key={c.id} className="flex items-center gap-3 p-3">
                  {c.userAvatar
                    ? <img src={c.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    : <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">{getInitials(c.userName)}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{isMe ? 'You' : c.userName} <span className="text-emerald-500 font-normal">came back</span></p>
                    <p className="text-[11px] text-muted">Was silent {c.daysMissed}d (from {sinceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}) · cleared {cleared.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="text-emerald-500 shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hall of Honor — compact pill row */}
      {stats && stats.cleanRecord.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Star className="w-3 h-3 text-emerald-500 fill-emerald-500" /> Clean record this month
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {stats.cleanRecord.map(m => (
              <div key={m.userId} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                {m.avatar
                  ? <img src={m.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  : <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-[9px] font-bold">{getInitials(m.name)}</div>}
                <span className="text-[11px] font-medium">{m.userId === currentUserId ? 'You' : m.name}</span>
              </div>
            ))}
            {stats.cleanCount > stats.cleanRecord.length && (
              <span className="text-[11px] text-muted self-center">+{stats.cleanCount - stats.cleanRecord.length} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SmallStat({ color, icon, value, label, sub }) {
  const map = {
    red: 'text-red-500',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
    green: 'text-emerald-500'
  };
  return (
    <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn(map[color])}>{icon}</span>
        <p className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</p>
      </div>
      <p className={cn('text-xl font-black tabular-nums', map[color])}>{value}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function ActivityTab({ groupId, currentUserId, onViewProof }) {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [nextBefore, setNextBefore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pickerFor, setPickerFor] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [submittingComment, setSubmittingComment] = useState(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getGroupActivity(groupId, null, 20).then(res => {
      if (cancelled) return;
      setItems(res.items || []);
      setHasMore(!!res.hasMore);
      setNextBefore(res.nextBefore);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !nextBefore) return;
    setLoadingMore(true);
    try {
      const res = await api.getGroupActivity(groupId, nextBefore, 20);
      setItems(prev => [...prev, ...(res.items || [])]);
      setHasMore(!!res.hasMore);
      setNextBefore(res.nextBefore);
    } finally {
      setLoadingMore(false);
    }
  };

  const setReactionLocal = (completionId, fromEmoji, toEmoji) => {
    setItems(prev => prev.map(a => {
      if (a.completionId !== completionId) return a;
      const counts = { ...(a.reactions || {}) };
      if (fromEmoji) {
        counts[fromEmoji] = Math.max(0, (counts[fromEmoji] || 1) - 1);
        if (counts[fromEmoji] === 0) delete counts[fromEmoji];
      }
      if (toEmoji) counts[toEmoji] = (counts[toEmoji] || 0) + 1;
      return { ...a, reactions: counts, myEmoji: toEmoji };
    }));
  };

  const handleReaction = async (a, emoji) => {
    const previous = a.myEmoji;
    const next = previous === emoji ? null : emoji; // toggle off if same
    setReactionLocal(a.completionId, previous, next);
    setPickerFor(null);
    try { await api.toggleReaction(a.completionId, emoji); }
    catch { setReactionLocal(a.completionId, next, previous); }
  };

  const handleAddComment = async (completionId) => {
    const body = (commentDrafts[completionId] || '').trim();
    if (!body) return;
    setSubmittingComment(completionId);
    try {
      const { comment } = await api.addComment(completionId, body);
      setItems(prev => prev.map(a => a.completionId === completionId
        ? { ...a, comments: [...(a.comments || []), {
            id: comment.id, body: comment.body, createdAt: comment.createdAt,
            userId: comment.userId, userName: comment.user?.name || 'You', userAvatar: comment.user?.avatar || null
          }] }
        : a));
      setCommentDrafts(prev => ({ ...prev, [completionId]: '' }));
    } catch (err) {
      alert(err.message || 'Could not post comment');
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleDeleteComment = async (completionId, commentId) => {
    setItems(prev => prev.map(a => a.completionId === completionId
      ? { ...a, comments: (a.comments || []).filter(c => c.id !== commentId) }
      : a));
    try { await api.deleteComment(commentId); }
    catch (err) { alert(err.message || 'Could not delete comment'); }
  };

  if (loading) {
    return <div className="py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  return (
    <section>
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-brand-500" /> Recent Activity</h2>
      {items.length === 0 ? (
        <div className="p-6 rounded-2xl glass-card text-center text-sm text-muted">No activity yet — be the first to do something.</div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            if (a.kind !== 'COMPLETED') return <EventRow key={a.id} a={a} currentUserId={currentUserId} />;
            const activeReactions = Object.entries(a.reactions || {}).filter(([, n]) => n > 0);
            const isMine = a.userId === currentUserId;
            const comments = a.comments || [];
            return (
              <div key={a.id} className="rounded-2xl glass-card p-3">
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
                    <p className="text-xs text-muted">{new Date(a.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    {a.remark && <p className="text-xs italic text-muted mt-1 break-words">"{a.remark}"</p>}
                  </div>
                  {a.proofUrl && (
                    <button onClick={() => onViewProof?.({ title: a.taskTitle, url: a.proofUrl })}
                      className="w-10 h-10 rounded-md overflow-hidden border border-green-500/30 hover:border-green-500/60 transition-colors shrink-0">
                      <img src={a.proofUrl} alt="proof" className="w-full h-full object-cover" />
                    </button>
                  )}
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                </div>

                {/* Reactions row */}
                <div className="flex items-center gap-1.5 mt-2 ml-12 flex-wrap">
                  {activeReactions.map(([emoji, count]) => {
                    const mine = a.myEmoji === emoji;
                    return (
                      <button key={emoji} type="button"
                        disabled={isMine}
                        onClick={() => !isMine && handleReaction(a, emoji)}
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
                        {a.myEmoji ? 'Change' : '+'}
                      </button>
                      {pickerFor === a.completionId && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setPickerFor(null)} />
                          <div className="absolute left-0 top-7 z-20 flex items-center gap-1 p-1.5 rounded-xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] shadow-xl">
                            {REACTION_EMOJIS.map(e => (
                              <button key={e} type="button" onClick={() => handleReaction(a, e)}
                                className={cn('w-9 h-9 rounded-lg text-lg transition-transform hover:scale-125', a.myEmoji === e && 'bg-brand-500/15')}>
                                {e}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Comments */}
                {comments.length > 0 && (
                  <div className="mt-3 ml-12 space-y-2">
                    {comments.map(c => {
                      const ownComment = c.userId === currentUserId;
                      return (
                        <div key={c.id} className="flex items-start gap-2 group">
                          {c.userAvatar ? (
                            <img src={c.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{getInitials(c.userName)}</div>
                          )}
                          <div className="flex-1 min-w-0 px-3 py-1.5 rounded-2xl bg-[var(--card-bg-hover)]">
                            <p className="text-[11px] font-semibold">{ownComment ? 'You' : c.userName}</p>
                            <p className="text-sm text-primary break-words">{c.body}</p>
                          </div>
                          {ownComment && (
                            <button onClick={() => handleDeleteComment(a.completionId, c.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted hover:text-red-400" title="Delete">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comment input */}
                <div className="mt-3 ml-12 flex items-center gap-2">
                  <input
                    type="text"
                    value={commentDrafts[a.completionId] || ''}
                    onChange={(e) => setCommentDrafts(prev => ({ ...prev, [a.completionId]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(a.completionId); } }}
                    placeholder="Write a comment..."
                    maxLength={500}
                    disabled={submittingComment === a.completionId}
                    className="flex-1 px-3 py-1.5 rounded-full bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-sm placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500"
                  />
                  <button onClick={() => handleAddComment(a.completionId)}
                    disabled={!commentDrafts[a.completionId]?.trim() || submittingComment === a.completionId}
                    className="px-3 py-1.5 rounded-full bg-brand-500 text-white text-xs font-semibold disabled:opacity-40">
                    {submittingComment === a.completionId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
                  </button>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button onClick={loadMore} disabled={loadingMore}
                className="px-5 py-2.5 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                {loadingMore ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : 'Load older'}
              </button>
            </div>
          )}
          {!hasMore && items.length >= 20 && (
            <p className="text-center text-xs text-muted py-2 italic">You've reached the start.</p>
          )}
        </div>
      )}
    </section>
  );
}

const EVENT_VERB = {
  HABIT_ADDED: 'added a habit',
  HABIT_DELETED: 'deleted a habit',
  HABIT_EDITED: 'edited a habit',
  MEMBER_JOINED: 'joined the group',
  MEMBER_LEFT: 'left the group',
  MEMBER_KICKED: 'removed',
  MEMBER_PROMOTED: 'promoted',
  MEMBER_DEMOTED: 'demoted',
  ADMIN_TRANSFERRED: 'transferred admin to',
  GROUP_RENAMED: 'renamed the group',
  GROUP_PHOTO_CHANGED: 'changed the group photo',
  GROUP_PHOTO_REMOVED: 'removed the group photo',
  GROUP_DESC_CHANGED: 'updated the description',
  GROUP_COLOR_CHANGED: 'changed the group color'
};

function EventRow({ a, currentUserId }) {
  const isMine = a.userId === currentUserId;
  const verb = EVENT_VERB[a.kind] || 'did something';
  const targets = ['MEMBER_KICKED', 'MEMBER_PROMOTED', 'MEMBER_DEMOTED', 'ADMIN_TRANSFERRED'].includes(a.kind);
  const isHabit = ['HABIT_ADDED', 'HABIT_DELETED', 'HABIT_EDITED'].includes(a.kind);

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--card-bg)]/50 border border-[var(--card-border)]/50">
      {a.userAvatar ? (
        <img src={a.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[var(--card-bg-hover)] flex items-center justify-center text-[10px] font-bold shrink-0">{getInitials(a.userName)}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{isMine ? 'You' : a.userName}</span>
          {' '}<span className="text-muted">{verb}</span>
          {targets && a.targetUserName && (<>{' '}<span className="font-medium">{a.targetUserId === currentUserId ? 'you' : a.targetUserName}</span></>)}
          {isHabit && a.habitTitle && (<>{' '}<span className="font-medium">"{a.habitTitle}"</span></>)}
        </p>
        <p className="text-xs text-muted">
          {new Date(a.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          {a.detail && <span> · {a.detail}</span>}
        </p>
      </div>
      {isHabit && a.habitColor && (
        <span className="w-1 h-7 rounded-full shrink-0" style={{ backgroundColor: a.habitColor }} />
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

function InlineStat({ label, value, accent }) {
  return (
    <div className="p-2 rounded-lg bg-[var(--card-bg-hover)] text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted font-semibold">{label}</p>
      <p className={cn('font-black text-sm tabular-nums', accent || 'text-primary')}>{value}</p>
    </div>
  );
}
