'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Circle, ExternalLink, Camera } from 'lucide-react';
// Link still used for group name links
import { cn, getScoreColor, getScoreBgColor, getDateKey, isToday, getFrequencyLabel } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getDateKey(new Date()));
  const [completing, setCompleting] = useState(null);

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

  const todayKey = getDateKey(new Date());
  const isTodaySelected = selectedDate === todayKey;

  const [proofTask, setProofTask] = useState(null);

  const handleToggle = async (task, proofUrl = null) => {
    if (!isTodaySelected) return;
    if (!task.completed && task.requiresProof && !proofUrl) {
      setProofTask(task);
      return;
    }
    setCompleting(task.id);
    try {
      if (task.completed) {
        await api.uncompleteTask(task.id);
      } else {
        await api.completeTask(task.id, null, proofUrl);
      }
      await fetchCalendar();
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setCompleting(null);
      setProofTask(null);
    }
  };

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
          <p className="text-muted">Track your habit completion over time</p>
        </div>
        <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(getDateKey(new Date())); }} className="px-4 py-2 rounded-lg bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] text-sm font-medium">Today</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[var(--card-border)]">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)]"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded-lg hover:bg-[var(--card-bg-hover)]"><ChevronRight className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--card-border)]">
            {DAYS.map(d => <div key={d} className="p-3 text-center text-xs font-medium text-muted">{d}</div>)}
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
                    className={cn('aspect-square p-2 border-b border-r border-[var(--card-border)] flex flex-col items-center justify-center gap-1 relative',
                      day.isCurrentMonth ? 'hover:bg-[var(--card-bg-hover)]' : 'text-muted cursor-default',
                      day.dateKey === selectedDate && 'bg-brand-500/10 ring-1 ring-brand-500',
                      isTodayDate && 'bg-[var(--card-bg-hover)]')}>
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
        <div className="rounded-2xl glass-card p-5 h-fit sticky top-8 max-h-[calc(100vh-120px)] overflow-y-auto">
          {selectedDate && selectedData ? (
            <>
              <h3 className="font-semibold mb-4">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>

              {/* Score card */}
              <div className={cn('p-4 rounded-xl mb-4', getScoreBgColor(selectedData.score))}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted mb-1">Score</p>
                    <p className={cn('text-2xl font-bold', getScoreColor(selectedData.score))}>{selectedData.score}%</p>
                  </div>
                  <p className="text-sm text-muted">{selectedData.completions}/{selectedData.totalTasks} done</p>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-black/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white/30 transition-all" style={{ width: `${selectedData.score}%` }} />
                </div>
              </div>

              {/* Personal tasks */}
              {groupedTasks?.personal?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Personal</p>
                  <div className="space-y-1">
                    {groupedTasks.personal.map(t => (
                      <CalendarTask key={t.id} task={t} canToggle={isTodaySelected} completing={completing} onToggle={handleToggle} />
                    ))}
                  </div>
                </div>
              )}

              {/* Group tasks */}
              {groupedTasks?.groups?.map(g => (
                <div key={g.id} className="mb-4">
                  <Link href={`/dashboard/groups/${g.id}`} className="flex items-center gap-2 mb-2 group">
                    <div className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: (g.color || '#8b5cf6') + '30', color: g.color || '#8b5cf6' }}>{g.name.charAt(0)}</div>
                    <p className="text-xs font-medium text-muted uppercase tracking-wider group-hover:text-zinc-300 transition-colors">{g.name}</p>
                    <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100" />
                  </Link>
                  <div className="space-y-1">
                    {g.tasks.map(t => (
                      <CalendarTask key={t.id} task={t} canToggle={isTodaySelected} completing={completing} onToggle={handleToggle} />
                    ))}
                  </div>
                </div>
              ))}

              {/* No tasks */}
              {selectedData.totalTasks === 0 && (
                <p className="text-muted text-sm text-center py-4">No habits scheduled</p>
              )}
            </>
          ) : (
            <p className="text-muted text-center py-8">Select a date to see details</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mt-6">
        {[{ color: 'bg-green-500', label: '80%+' }, { color: 'bg-yellow-500', label: '60%+' }, { color: 'bg-orange-500', label: '40%+' }, { color: 'bg-red-500', label: '<40%' }].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', item.color)} />
            <span className="text-xs text-muted">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Proof Modal */}
      {proofTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setProofTask(null)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--input-border)] p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Camera className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold">Photo Proof Required</h2>
            </div>
            <p className="text-sm text-muted mb-4">Upload a photo to complete <span className="text-primary font-medium">"{proofTask.title}"</span></p>
            <ProofUpload onSubmit={(url) => handleToggle(proofTask, url)} onCancel={() => setProofTask(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function ProofUpload({ onSubmit, onCancel }) {
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
    <>
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
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-[var(--card-bg-hover)] font-medium hover:bg-[var(--card-bg-hover)]">Cancel</button>
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
    </>
  );
}

function CalendarTask({ task, canToggle, completing, onToggle }) {
  const t = task;
  return (
    <div className={cn('flex items-center gap-2.5 p-2.5 rounded-lg transition-colors', t.completed ? 'bg-green-500/5' : 'hover:bg-[var(--card-bg-hover)]')}>
      {canToggle ? (
        <button onClick={() => onToggle(t)} disabled={completing === t.id} className="flex-shrink-0">
          {completing === t.id ? <Loader2 className="w-4 h-4 animate-spin text-brand-500" /> : t.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted hover:text-green-400 transition-colors" />}
        </button>
      ) : (
        <div className="flex-shrink-0">
          {t.completed ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted" />}
        </div>
      )}
      <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color || '#22c55e' }} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', t.completed ? 'text-muted line-through' : 'text-primary')}>{t.title}</p>
        <p className="text-xs text-muted">{getFrequencyLabel(t.frequency)}</p>
      </div>
      {t.requiresProof && !t.completed && <Camera className="w-3 h-3 text-amber-400 flex-shrink-0" />}
    </div>
  );
}
