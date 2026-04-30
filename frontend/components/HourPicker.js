'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55
const PERIODS = ['AM', 'PM'];
const ITEM_H = 40;

function pad(n) { return String(n).padStart(2, '0'); }

function parse(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return { hour12: 9, minute: 0, period: 'PM' };
  }
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 || 12;
  const minute = Math.round(m / 5) * 5 % 60;
  return { hour12, minute, period };
}

function build(hour12, minute, period) {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

// iOS-style scrollable wheel column. Snap-scrolls between items;
// emits onChange after the scroll settles.
function Wheel({ items, value, onChange, format = String, accentClass }) {
  const ref = useRef(null);
  const programmatic = useRef(false);
  const settleTimeout = useRef(null);
  const [displayedIdx, setDisplayedIdx] = useState(() => Math.max(0, items.indexOf(value)));

  // Snap to selected item on mount + when value changes externally
  useEffect(() => {
    if (!ref.current) return;
    const idx = items.indexOf(value);
    if (idx < 0) return;
    setDisplayedIdx(idx);
    const target = idx * ITEM_H;
    if (Math.abs(ref.current.scrollTop - target) > 2) {
      programmatic.current = true;
      ref.current.scrollTop = target;
      setTimeout(() => { programmatic.current = false; }, 80);
    }
  }, [value, items]);

  const handleScroll = (e) => {
    if (programmatic.current) return;
    const idx = Math.round(e.currentTarget.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== displayedIdx) setDisplayedIdx(clamped);

    clearTimeout(settleTimeout.current);
    settleTimeout.current = setTimeout(() => {
      const newItem = items[clamped];
      if (newItem !== value) onChange(newItem);
    }, 120);
  };

  const handleItemClick = (idx) => {
    if (!ref.current) return;
    ref.current.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
  };

  return (
    <div className="relative flex-1" style={{ height: ITEM_H * 5 }}>
      {/* Center selection band */}
      <div className="absolute inset-x-1 pointer-events-none rounded-lg bg-[var(--card-bg-hover)] z-0"
        style={{ top: ITEM_H * 2, height: ITEM_H }} />

      {/* Top + bottom fade overlays for the iOS-style depth effect */}
      <div className="absolute top-0 inset-x-0 pointer-events-none z-10 bg-gradient-to-b from-[var(--card-bg-solid)] via-[var(--card-bg-solid)]/70 to-transparent"
        style={{ height: ITEM_H * 2 }} />
      <div className="absolute bottom-0 inset-x-0 pointer-events-none z-10 bg-gradient-to-t from-[var(--card-bg-solid)] via-[var(--card-bg-solid)]/70 to-transparent"
        style={{ height: ITEM_H * 2 }} />

      {/* Scrollable list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none touch-pan-y"
        style={{ scrollbarWidth: 'none' }}>
        <div style={{ height: ITEM_H * 2 }} />
        {items.map((item, idx) => {
          const selected = idx === displayedIdx;
          const distance = Math.abs(idx - displayedIdx);
          return (
            <button
              type="button"
              key={String(item)}
              onClick={() => handleItemClick(idx)}
              className={cn(
                'w-full snap-center flex items-center justify-center font-bold tabular-nums select-none transition-all',
                selected ? cn('text-2xl', accentClass) :
                  distance === 1 ? 'text-lg text-muted/80 opacity-80' :
                  'text-base text-muted/60 opacity-50'
              )}
              style={{ height: ITEM_H }}>
              {format(item)}
            </button>
          );
        })}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}

export default function HourPicker({ value, onChange, accent = 'brand' }) {
  const { hour12, minute, period } = useMemo(() => parse(value), [value]);
  const accentClass = accent === 'blue' ? 'text-blue-500' : 'text-brand-500';
  const accentBar = accent === 'blue' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-brand-500/10 border-brand-500/30';

  const setHour = (h) => onChange(build(h, minute, period));
  const setMinute = (m) => onChange(build(hour12, m, period));
  const setPeriod = (p) => onChange(build(hour12, minute, p));

  return (
    <div className="w-full max-w-[260px] rounded-2xl bg-[var(--card-bg-solid)] border border-[var(--card-border)] overflow-hidden relative">
      {/* Center highlight band that spans the full picker, behind the wheels */}
      <div className={cn('absolute inset-x-0 pointer-events-none border-y z-0', accentBar)}
        style={{ top: ITEM_H * 2, height: ITEM_H }} />
      <div className="flex relative z-10">
        <Wheel items={HOURS} value={hour12} onChange={setHour} accentClass={accentClass} />
        <div className="flex items-center justify-center font-black text-xl text-muted/40 select-none px-0.5" style={{ paddingTop: ITEM_H * 2, paddingBottom: ITEM_H * 2 }}>:</div>
        <Wheel items={MINUTES} value={minute} onChange={setMinute} format={pad} accentClass={accentClass} />
        <Wheel items={PERIODS} value={period} onChange={setPeriod} accentClass={accentClass} />
      </div>
    </div>
  );
}
