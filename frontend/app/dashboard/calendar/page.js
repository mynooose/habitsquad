'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Circle, ExternalLink, Users } from 'lucide-react';
import { cn, getScoreColor, getScoreBgColor, getDateKey, isToday, getFrequencyLabel } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const { calendar } = await api.getCalendar(year, month);
      setCalendarData(calendar || {});
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) calendarDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateKey = getDateKey(date);
    calendarDays.push({ day: i, isCurrentMonth: true, date, dateKey, data: calendarData[dateKey] });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) calendarDays.push({ day: i, isCurrentMonth: false });

  const selectedData = selectedDate ? calendarData[selectedDate] : null;

  // Group selected tasks by group
  const groupedTasks = selectedData?.tasks ? (() => {
    const personal = selectedData.tasks.filter(t => !t.groupId);
    const groups = {};
    selectedData.tasks.filter(t => t.groupId).forEach(t => {
      if (!groups[t.groupId]) groups[t.groupId] = { name: t.groupName, color: t.groupColor, id: t.groupId, tasks: [] };
      groups[t.groupId].tasks.push(t);
    });
    return { personal, groups: Object.values(groups) };
  })() : null;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Calendar</h1>
          <p className="text-zinc-400">Track your habit completion over time</p>
        </div>
        <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(getDateKey(new Date())); }} className="px-4 py-2 rounded-lg bg-surface-100 hover:bg-surface-200 text-sm font-medium">Today</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl bg-surface-100 border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-surface-200"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-surface-200"><ChevronRight className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-7 border-b border-white/5">
            {DAYS.map(d => <div key={d} className="p-3 text-center text-xs font-medium text-zinc-500">{d}</div>)}
          </div>

          {loading ? (
            <div className="h-80 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
          ) : (
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const score = day.data?.score || 0;
                const hasData = day.isCurrentMonth && day.data && day.data.totalTasks > 0;
                const isTodayDate = day.isCurrentMonth && isToday(day.date);
                return (
                  <button key={i} onClick={() => day.isCurrentMonth && setSelectedDate(day.dateKey)} disabled={!day.isCurrentMonth}
                    className={cn('aspect-square p-2 border-b border-r border-white/5 flex flex-col items-center justify-center gap-1 relative',
                      day.isCurrentMonth ? 'hover:bg-surface-200' : 'text-zinc-700 cursor-default',
                      day.dateKey === selectedDate && 'bg-brand-500/10 ring-1 ring-brand-500',
                      isTodayDate && 'bg-surface-200')}>
                    <span className={cn('text-sm font-medium', isTodayDate && 'text-brand-400')}>{day.day}</span>
                    {hasData && (
                      <div className={cn('w-8 h-1.5 rounded-full',
                        score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : score > 0 ? 'bg-red-500' : 'bg-zinc-700')} />
                    )}
                    {isTodayDate && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="rounded-2xl bg-surface-100 border border-white/5 p-5 h-fit sticky top-8 max-h-[calc(100vh-120px)] overflow-y-auto">
          {selectedDate && selectedData ? (
            <>
              <h3 className="font-semibold mb-4">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>

              {/* Score card */}
              <div className={cn('p-4 rounded-xl mb-4', getScoreBgColor(selectedData.score))}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Score</p>
                    <p className={cn('text-2xl font-bold', getScoreColor(selectedData.score))}>{selectedData.score}%</p>
                  </div>
                  <p className="text-sm text-zinc-400">{selectedData.completions}/{selectedData.totalTasks} done</p>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-black/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white/30 transition-all" style={{ width: `${selectedData.score}%` }} />
                </div>
              </div>

              {/* Personal tasks */}
              {groupedTasks?.personal?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Personal</p>
                  <div className="space-y-1">
                    {groupedTasks.personal.map(t => (
                      <Link key={t.id} href={`/dashboard/tasks/${t.id}`} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/5 group transition-colors">
                        {t.completed ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />}
                        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color || '#22c55e' }} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm truncate', t.completed ? 'text-zinc-400 line-through' : 'text-white')}>{t.title}</p>
                          <p className="text-xs text-zinc-600">{getFrequencyLabel(t.frequency)}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Group tasks */}
              {groupedTasks?.groups?.map(g => (
                <div key={g.id} className="mb-4">
                  <Link href={`/dashboard/groups/${g.id}`} className="flex items-center gap-2 mb-2 group">
                    <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: (g.color || '#8b5cf6') + '30', color: g.color || '#8b5cf6' }}>{g.name.charAt(0)}</div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{g.name}</p>
                    <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100" />
                  </Link>
                  <div className="space-y-1">
                    {g.tasks.map(t => (
                      <Link key={t.id} href={`/dashboard/tasks/${t.id}`} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/5 group transition-colors">
                        {t.completed ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />}
                        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color || '#22c55e' }} />
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm truncate', t.completed ? 'text-zinc-400 line-through' : 'text-white')}>{t.title}</p>
                          <p className="text-xs text-zinc-600">{getFrequencyLabel(t.frequency)}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {/* No tasks */}
              {selectedData.totalTasks === 0 && (
                <p className="text-zinc-500 text-sm text-center py-4">No habits scheduled</p>
              )}
            </>
          ) : (
            <p className="text-zinc-500 text-center py-8">Select a date to see details</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mt-6">
        {[{ color: 'bg-green-500', label: '80%+' }, { color: 'bg-yellow-500', label: '60%+' }, { color: 'bg-orange-500', label: '40%+' }, { color: 'bg-red-500', label: '<40%' }].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', item.color)} />
            <span className="text-xs text-zinc-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
