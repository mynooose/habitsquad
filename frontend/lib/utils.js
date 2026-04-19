import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatDate(date, options = {}) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

export function getDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getScoreColor(score) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

export function getScoreBgColor(score) {
  if (score >= 80) return 'bg-green-500/20';
  if (score >= 60) return 'bg-yellow-500/20';
  if (score >= 40) return 'bg-orange-500/20';
  return 'bg-red-500/20';
}

export const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKDAYS', label: 'Weekdays' },
  { value: 'WEEKENDS', label: 'Weekends' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'ONCE', label: 'One-time' },
];

export function getFrequencyLabel(frequency) {
  return FREQUENCIES.find(f => f.value === frequency)?.label || frequency;
}

export const TASK_COLORS = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f97316', '#eab308', '#14b8a6', '#ef4444',
];

export function getRandomColor() {
  return TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)];
}

export function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export const LEVELS = [
  { level: 1, xp: 0, name: 'Beginner', color: 'text-zinc-400' },
  { level: 2, xp: 100, name: 'Starter', color: 'text-blue-400' },
  { level: 3, xp: 300, name: 'Committed', color: 'text-cyan-400' },
  { level: 4, xp: 600, name: 'Dedicated', color: 'text-green-400' },
  { level: 5, xp: 1000, name: 'Warrior', color: 'text-yellow-400' },
  { level: 6, xp: 1500, name: 'Champion', color: 'text-orange-400' },
  { level: 7, xp: 2100, name: 'Legend', color: 'text-red-400' },
  { level: 8, xp: 2800, name: 'Master', color: 'text-purple-400' },
  { level: 9, xp: 3600, name: 'Grandmaster', color: 'text-fuchsia-400' },
  { level: 10, xp: 4500, name: 'Elite', color: 'text-amber-300' },
];

export function getLevel(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) current = l;
    else break;
  }
  const next = LEVELS.find(l => l.level === current.level + 1);
  return {
    level: current.level,
    name: current.name,
    color: current.color,
    currentXp: xp,
    nextLevelXp: next ? next.xp : null,
    progress: next ? Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100) : 100,
  };
}
