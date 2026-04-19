'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Target, LayoutDashboard, Calendar, Users, Settings, LogOut, Plus, ChevronRight, Flame, Zap } from 'lucide-react';
import { cn, getLevel } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/dashboard/groups', icon: Users, label: 'Groups' },
];

export default function DashboardLayout({ children }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [groups, setGroups] = useState([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      api.getGroups().then(res => setGroups(res.groups || [])).catch(() => {});
      api.getStreak().then(res => setStreak(res.currentStreak || 0)).catch(() => {});
    }
  }, [isAuthenticated]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 flex">
      <aside className="w-64 border-r border-white/5 flex flex-col fixed h-full">
        <div className="h-16 px-6 flex items-center border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">HabitSquad</span>
          </Link>
        </div>

        <div className="p-4 border-b border-white/5">
          <Link href="/dashboard/profile" className="flex items-center gap-3 p-3 rounded-xl bg-surface-100 hover:bg-surface-200 transition-colors">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-10 h-10 rounded-full bg-surface-200 object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className={getLevel(user?.totalXp || 0).color}>Lv.{getLevel(user?.totalXp || 0).level} {getLevel(user?.totalXp || 0).name}</span>
              </p>
            </div>
          </Link>
        </div>

        <div className="p-4">
          <Link href="/dashboard/new" className="w-full py-2.5 rounded-xl gradient-brand text-white font-medium flex items-center justify-center gap-2 hover:opacity-90">
            <Plus className="w-4 h-4" /> Add New
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link href={item.href}
                    className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-500/10 text-brand-400' : 'text-zinc-400 hover:text-white hover:bg-surface-100')}>
                    <item.icon className="w-5 h-5" />
                    {item.label}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </Link>
                </li>
              );
            })}
          </ul>

          {groups.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider px-3 mb-2">Your Groups</p>
              {groups.map(group => (
                <Link key={group.id} href={`/dashboard/groups/${group.id}`}
                  className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors mb-1',
                    pathname === `/dashboard/groups/${group.id}` ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-surface-100')}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: (group.color || '#8b5cf6') + '30', color: group.color || '#8b5cf6' }}>
                    {group.name.charAt(0)}
                  </div>
                  <span className="truncate flex-1">{group.name}</span>
                  <span className="text-xs text-zinc-500">{group.memberCount}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="p-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-orange-400">Current Streak</span>
            </div>
            <p className="text-2xl font-bold">{streak} days</p>
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={() => { logout(); router.push('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-surface-100">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-auto">{children}</main>
    </div>
  );
}
