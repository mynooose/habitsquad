'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import api from '@/lib/api';
import { Target, LayoutDashboard, Calendar, Users, LogOut, Plus, ChevronRight, Flame, Zap, Menu, X, Sun, Moon, User, Bell, Check, CheckCheck } from 'lucide-react';
import { cn, getLevel } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/dashboard/groups', icon: Users, label: 'Groups' },
];

const mobileNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/dashboard/groups', icon: Users, label: 'Groups' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
];

export default function DashboardLayout({ children }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [groups, setGroups] = useState([]);
  const [streak, setStreak] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { notifications: n, unreadCount: u } = await api.getNotifications();
      setNotifications(n || []);
      setUnreadCount(u || 0);
    } catch {}
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      api.getGroups().then(res => setGroups(res.groups || [])).catch(() => {});
      api.getStreak().then(res => setStreak(res.currentStreak || 0)).catch(() => {});
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // poll every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lvl = getLevel(user?.totalXp || 0);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[var(--card-border)]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-primary">HabitSquad</span>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowNotifications(true)} className="relative p-2 rounded-xl hover:bg-[var(--card-bg-hover)] text-muted transition-colors">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--sidebar-bg)]" />
            )}
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-[var(--card-bg-hover)] text-muted transition-colors">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* User card */}
      <div className="p-4">
        <Link href="/dashboard/profile" className="flex items-center gap-3 p-3 rounded-2xl glass-card transition-all hover:scale-[1.01]">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-brand-500/30" />
          ) : (
            <div className="w-11 h-11 rounded-full gradient-accent flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-primary truncate">{user?.name}</p>
            <p className="text-xs text-muted flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className={lvl.color}>Lv.{lvl.level} {lvl.name}</span>
            </p>
          </div>
        </Link>
      </div>

      {/* Add New */}
      <div className="px-4 pb-2">
        <Link href="/dashboard/new" className="w-full py-2.5 rounded-xl gradient-brand text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-brand-500/20">
          <Plus className="w-4 h-4" /> Add New
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link href={item.href}
                  className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive ? 'glass-card text-brand-400 shadow-sm' : 'text-muted hover:text-primary hover:bg-[var(--card-bg)]')}>
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              </li>
            );
          })}
        </ul>

        {groups.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--card-border)]">
            <p className="text-xs text-muted uppercase tracking-wider px-3 mb-2 font-medium">Your Groups</p>
            {groups.map(group => (
              <Link key={group.id} href={`/dashboard/groups/${group.id}`}
                className={cn('flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all mb-0.5',
                  pathname === `/dashboard/groups/${group.id}` ? 'glass-card text-primary' : 'text-muted hover:text-primary hover:bg-[var(--card-bg)]')}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: (group.color || '#8b5cf6') + '20', color: group.color || '#8b5cf6' }}>
                  {group.name.charAt(0)}
                </div>
                <span className="truncate flex-1">{group.name}</span>
                <span className="text-xs text-muted">{group.memberCount}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Streak */}
      <div className="p-4">
        <div className="p-4 rounded-2xl glass-card bg-gradient-to-br from-orange-500/10 to-red-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-medium text-orange-400">Streak</span>
          </div>
          <p className="text-2xl font-black text-primary">{streak} <span className="text-sm font-normal text-muted">days</span></p>
        </div>
      </div>

      {/* Logout */}
      <div className="p-4 pt-0">
        <button onClick={() => { logout(); router.push('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-red-400 hover:bg-red-500/5 transition-colors">
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-page">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 glass-sidebar flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-[var(--card-bg)] text-primary">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-primary">HabitSquad</span>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowNotifications(true)} className="relative p-2 rounded-xl hover:bg-[var(--card-bg)] text-muted">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-[var(--card-bg)] text-muted">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 glass-sidebar flex flex-col animate-slide-in-left">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-[var(--card-bg)] text-muted">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 fixed h-full flex-col glass-sidebar z-30">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen overflow-auto">
        {children}
      </main>

      {/* Notifications drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-96 glass-sidebar flex flex-col animate-slide-in-right">
            <div className="h-16 px-5 flex items-center justify-between border-b border-[var(--card-border)]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-500" />
                <span className="font-bold">Notifications</span>
                {unreadCount > 0 && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 text-xs font-bold">{unreadCount}</span>}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={async () => { await api.markAllNotificationsRead(); fetchNotifications(); }}
                    className="p-2 rounded-xl hover:bg-[var(--card-bg)] text-muted hover:text-primary" title="Mark all read">
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setShowNotifications(false)} className="p-2 rounded-xl hover:bg-[var(--card-bg)] text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-16">
                  <Bell className="w-10 h-10 mx-auto mb-3 text-muted opacity-40" />
                  <p className="text-muted text-sm">No notifications yet</p>
                </div>
              ) : notifications.map(n => (
                <div key={n.id} className={cn('p-4 rounded-2xl glass-card', !n.read && 'ring-1 ring-brand-500/30')}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5">{n.message}</p>
                      <p className="text-xs text-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>

                      {n.type === 'GROUP_ADDED' && n.status === 'PENDING' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={async () => {
                            await api.respondToNotification(n.id, 'accept');
                            fetchNotifications();
                            if (n.actionUrl) router.push(n.actionUrl);
                            setShowNotifications(false);
                          }} className="flex-1 py-1.5 rounded-lg btn-primary text-xs font-semibold flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Accept
                          </button>
                          <button onClick={async () => {
                            await api.respondToNotification(n.id, 'decline');
                            fetchNotifications();
                          }} className="flex-1 py-1.5 rounded-lg bg-[var(--card-bg-hover)] text-xs font-semibold text-muted hover:text-primary">
                            Decline
                          </button>
                        </div>
                      )}
                      {n.status === 'ACCEPTED' && <p className="text-xs text-green-500 mt-2 font-medium">✓ Accepted</p>}
                      {n.status === 'DECLINED' && <p className="text-xs text-red-500 mt-2 font-medium">✗ Declined</p>}
                    </div>
                    {!n.read && (
                      <button onClick={async () => { await api.markNotificationRead(n.id); fetchNotifications(); }}
                        className="text-xs text-brand-500 hover:underline flex-shrink-0">Mark read</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* Mobile bottom tabs */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-sidebar border-t border-[var(--card-border)]">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/dashboard/profile' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={cn('flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-[60px]',
                  isActive ? 'text-brand-400' : 'text-muted')}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
