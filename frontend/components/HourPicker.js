'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function pad(n) { return String(n).padStart(2, '0'); }

function parse(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return { hour12: 9, minute: 0, period: 'PM' }; // safe default
  }
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 || 12;
  return { hour12, minute: m, period };
}

function build(hour12, minute, period) {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

export default function HourPicker({ value, onChange, accent = 'brand' }) {
  const { hour12, minute, period } = useMemo(() => parse(value), [value]);

  const accentText = accent === 'blue' ? 'text-blue-500' : 'text-brand-500';
  const accentBg = accent === 'blue' ? 'bg-blue-500' : 'bg-brand-500';

  const setHour = (h) => onChange(build(h, minute, period));
  const setMinute = (m) => onChange(build(hour12, m, period));
  const setPeriod = (p) => onChange(build(hour12, minute, p));

  return (
    <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[var(--card-bg)] border border-[var(--input-border)]">
      {/* Hour */}
      <Spinner value={hour12} onChange={setHour} options={HOURS} accentText={accentText} />
      <span className="text-lg font-bold text-muted px-0.5 select-none">:</span>
      {/* Minute */}
      <Spinner value={minute} onChange={setMinute} options={MINUTES} accentText={accentText} format={pad} />
      {/* AM/PM */}
      <div className="flex flex-col gap-0.5 ml-1">
        {['AM', 'PM'].map(p => (
          <button key={p} type="button" onClick={() => setPeriod(p)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors',
              period === p ? `${accentBg} text-white shadow-sm` : 'text-muted hover:bg-[var(--card-bg-hover)]'
            )}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function Spinner({ value, onChange, options, accentText, format = String }) {
  const idx = options.indexOf(value);
  const safeIdx = idx >= 0 ? idx : 0;
  const next = () => onChange(options[(safeIdx + 1) % options.length]);
  const prev = () => onChange(options[(safeIdx - 1 + options.length) % options.length]);
  return (
    <div className="flex flex-col items-center select-none">
      <button type="button" onClick={next} aria-label="Increase"
        className="w-7 h-4 flex items-center justify-center text-muted hover:text-primary text-[10px] leading-none">▲</button>
      <div className={cn('w-10 text-center text-xl font-black tabular-nums leading-none py-1', accentText)}>
        {format(value)}
      </div>
      <button type="button" onClick={prev} aria-label="Decrease"
        className="w-7 h-4 flex items-center justify-center text-muted hover:text-primary text-[10px] leading-none">▼</button>
    </div>
  );
}
