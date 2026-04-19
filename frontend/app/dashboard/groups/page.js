'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Users, Plus, UserPlus, Crown, ChevronRight, Loader2 } from 'lucide-react';

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const fetchGroups = useCallback(async () => {
    try {
      const { groups } = await api.getGroups();
      setGroups(groups || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode) return;
    setJoining(true);
    setError('');
    try {
      const { group } = await api.joinGroup(inviteCode);
      setShowJoin(false);
      setInviteCode('');
      router.push(`/dashboard/new?groupId=${group.id}&setup=true`);
    } catch (err) {
      setError(err.message || 'Invalid invite code');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Groups</h1>
          <p className="text-muted">Compete and stay accountable with your squad</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowJoin(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-sm font-medium">
            <UserPlus className="w-4 h-4" /> Join
          </button>
          <Link href="/dashboard/new" className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-brand text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Create
          </Link>
        </div>
      </div>

      {/* Join Modal */}
      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowJoin(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--input-border)] p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Join Group</h2>
            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Invite Code</label>
                <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Enter invite code"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--card-bg-hover)] border border-[var(--input-border)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-brand-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowJoin(false)} className="flex-1 py-3 rounded-xl bg-[var(--card-bg-hover)] font-medium hover:bg-[var(--card-bg-hover)]">Cancel</button>
                <button type="submit" disabled={joining || !inviteCode} className="flex-1 py-3 rounded-xl gradient-brand font-medium hover:opacity-90 disabled:opacity-50">
                  {joining ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="text-center py-16 rounded-2xl glass-card">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted" />
          <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
          <p className="text-muted mb-6">Create or join a group to compete with friends</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setShowJoin(true)} className="px-6 py-3 rounded-xl bg-[var(--card-bg-hover)] font-medium hover:bg-[var(--card-bg-hover)]">Join Group</button>
            <Link href="/dashboard/new" className="px-6 py-3 rounded-xl gradient-brand font-medium">Create Group</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((group, i) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`}
              className="p-5 rounded-2xl glass-card flex items-center gap-4 hover:border-[var(--input-border)] transition-all animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: (group.color || '#8b5cf6') + '20' }}>
                {group.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{group.name}</h3>
                  {group.role === 'ADMIN' && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
                <p className="text-sm text-muted">{group.memberCount} members • {group.taskCount || 0} habits</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
