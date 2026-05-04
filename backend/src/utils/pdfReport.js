const PDFDocument = require('pdfkit');
const prisma = require('../database/prisma');
const { getApplicableTasks } = require('./helpers');

const COLORS = {
  brand: '#7c3aed',
  green: '#22c55e',
  blue: '#3b82f6',
  amber: '#f59e0b',
  red: '#ef4444',
  muted: '#888888',
  fg: '#111111',
  rule: '#dddddd',
  card: '#f5f3ff',
};

function pickBandColor(score) {
  if (score >= 80) return COLORS.green;
  if (score >= 50) return COLORS.blue;
  if (score > 0)   return COLORS.amber;
  return COLORS.red;
}

function ymd(date) {
  return date.toISOString().split('T')[0];
}

function dayLabel(d) {
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
}

async function gatherData(userId, startDate, endExclusive) {
  const [tasks, completions, reflections] = await Promise.all([
    prisma.task.findMany({ where: { userId, isActive: true } }),
    prisma.taskCompletion.findMany({
      where: { userId, date: { gte: startDate, lt: endExclusive } },
      include: { task: { select: { id: true, title: true, color: true, weightage: true } } },
      orderBy: { date: 'asc' }
    }),
    prisma.reflection.findMany({
      where: { userId, date: { gte: startDate, lt: endExclusive } },
      orderBy: { date: 'asc' }
    })
  ]);

  const days = [];
  const dayCount = Math.round((endExclusive - startDate) / (24 * 60 * 60 * 1000));
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate); d.setUTCDate(startDate.getUTCDate() + i);
    const k = ymd(d);
    const applicable = getApplicableTasks(tasks, d);
    const totalWeight = applicable.reduce((s, t) => s + t.weightage, 0);
    const dayComps = completions.filter(c => ymd(c.date) === k);
    const completedWeight = dayComps.reduce((s, c) => s + (c.task?.weightage || 0), 0);
    const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    days.push({
      key: k, date: d, label: dayLabel(d),
      applicable: applicable.length, completed: dayComps.length,
      score, completedWeight, totalWeight,
      completions: dayComps
    });
  }

  const reflectionsByDate = Object.fromEntries(reflections.map(r => [ymd(r.date), r.text]));
  return { tasks, completions, reflections, reflectionsByDate, days };
}

function buildPdf({ user, range, days, completions, tasks, reflectionsByDate }) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const buffers = [];
  doc.on('data', b => buffers.push(b));

  const scoredDays = days.filter(d => d.applicable > 0);
  const avg = scoredDays.length ? Math.round(scoredDays.reduce((s, d) => s + d.score, 0) / scoredDays.length) : 0;
  const totalCompletions = completions.length;
  const bestDay = scoredDays.slice().sort((a, b) => b.score - a.score)[0] || null;
  const totalWeightedDone = days.reduce((s, d) => s + d.completedWeight, 0);

  // Header
  doc.fillColor(COLORS.brand).fontSize(24).font('Helvetica-Bold').text(`${range === 'month' ? 'Monthly' : 'Weekly'} Review`, { continued: false });
  doc.moveDown(0.2);
  doc.fillColor(COLORS.muted).fontSize(11).font('Helvetica').text(`${user.name} · ${days[0].label} – ${days[days.length - 1].label}`);
  doc.moveDown(0.8);

  // Summary cards row
  const cardY = doc.y;
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cards = [
    { label: range === 'month' ? 'Month avg' : 'Week avg', value: `${avg}%`, color: COLORS.green },
    { label: 'Completions', value: String(totalCompletions), color: COLORS.fg },
    { label: 'Best day', value: bestDay ? `${bestDay.date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' })} ${bestDay.score}%` : '—', color: COLORS.amber },
    { label: 'Points earned', value: String(totalWeightedDone), color: COLORS.brand }
  ];
  const cardW = (pageW - 3 * 8) / 4;
  cards.forEach((c, i) => {
    const x = doc.page.margins.left + i * (cardW + 8);
    doc.roundedRect(x, cardY, cardW, 56, 6).fillColor(COLORS.card).fill();
    doc.fillColor(COLORS.muted).fontSize(8).font('Helvetica-Bold').text(c.label.toUpperCase(), x + 10, cardY + 8, { width: cardW - 20 });
    doc.fillColor(c.color).fontSize(18).font('Helvetica-Bold').text(c.value, x + 10, cardY + 22, { width: cardW - 20 });
  });
  doc.y = cardY + 56 + 16;

  // Heatmap / daily bars
  doc.fillColor(COLORS.brand).fontSize(13).font('Helvetica-Bold').text('Daily breakdown');
  doc.moveDown(0.4);

  const heatX = doc.page.margins.left;
  const cellGap = 3;
  // For weekly: 7 wider cells with labels. For monthly: grid layout
  if (range === 'week') {
    const heatW = (pageW - cellGap * 6) / 7;
    const heatY = doc.y;
    days.forEach((d, i) => {
      const cellX = heatX + i * (heatW + cellGap);
      const color = d.applicable === 0 ? '#e5e7eb' : pickBandColor(d.score);
      doc.roundedRect(cellX, heatY, heatW, 60, 4).fillColor(color).fill();
      doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold').text(d.date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' }).toUpperCase(), cellX, heatY + 8, { width: heatW, align: 'center' });
      doc.fillColor('#fff').fontSize(16).font('Helvetica-Bold').text(d.applicable === 0 ? '—' : `${d.score}%`, cellX, heatY + 22, { width: heatW, align: 'center' });
      doc.fillColor('#ffffffcc').fontSize(7).font('Helvetica').text(d.applicable === 0 ? 'no habits' : `${d.completed}/${d.applicable}`, cellX, heatY + 44, { width: heatW, align: 'center' });
    });
    doc.y = heatY + 60 + 14;
  } else {
    // Monthly: 7-col grid
    const cellSize = 26;
    const gridX = heatX;
    let row = 0, col = days[0].date.getUTCDay();
    const startY = doc.y;
    days.forEach((d) => {
      const cellX = gridX + col * (cellSize + cellGap);
      const cellY = startY + row * (cellSize + cellGap);
      const color = d.applicable === 0 ? '#e5e7eb' : pickBandColor(d.score);
      doc.roundedRect(cellX, cellY, cellSize, cellSize, 3).fillColor(color).fill();
      doc.fillColor('#fff').fontSize(7).font('Helvetica-Bold').text(d.date.toLocaleDateString('en-US', { timeZone: 'UTC', day: 'numeric' }), cellX, cellY + 4, { width: cellSize, align: 'center' });
      doc.fillColor('#ffffffdd').fontSize(8).font('Helvetica-Bold').text(d.applicable === 0 ? '' : `${d.score}`, cellX, cellY + 14, { width: cellSize, align: 'center' });
      col++;
      if (col > 6) { col = 0; row++; }
    });
    doc.y = startY + (row + 1) * (cellSize + cellGap) + 14;
    // Legend
    doc.fillColor(COLORS.muted).fontSize(8).font('Helvetica').text('Color band: green ≥80%  ·  blue ≥50%  ·  amber >0%  ·  red 0%  ·  grey no habits');
    doc.moveDown(0.5);
  }

  // Per-habit breakdown
  const habitStats = {};
  tasks.forEach(t => { habitStats[t.id] = { task: t, applicable: 0, completed: 0 }; });
  days.forEach(d => {
    const apps = getApplicableTasks(tasks, d.date);
    apps.forEach(t => { if (habitStats[t.id]) habitStats[t.id].applicable++; });
  });
  completions.forEach(c => { if (habitStats[c.taskId]) habitStats[c.taskId].completed++; });
  const habits = Object.values(habitStats).filter(h => h.applicable > 0);

  if (habits.length > 0) {
    if (doc.y > doc.page.height - 200) doc.addPage();
    doc.fillColor(COLORS.brand).fontSize(13).font('Helvetica-Bold').text('Habit breakdown');
    doc.moveDown(0.4);

    habits.sort((a, b) => (b.completed / b.applicable) - (a.completed / a.applicable));
    habits.forEach(h => {
      const rate = Math.round((h.completed / h.applicable) * 100);
      const yStart = doc.y;
      // bullet
      doc.rect(heatX, yStart + 3, 4, 12).fillColor(h.task.color || COLORS.brand).fill();
      doc.fillColor(COLORS.fg).fontSize(10).font('Helvetica-Bold').text(h.task.title, heatX + 12, yStart + 1, { width: pageW - 200 });
      doc.fillColor(COLORS.muted).fontSize(9).font('Helvetica').text(`${h.completed}/${h.applicable}`, heatX + pageW - 130, yStart + 1, { width: 50, align: 'right' });
      doc.fillColor(pickBandColor(rate)).fontSize(11).font('Helvetica-Bold').text(`${rate}%`, heatX + pageW - 70, yStart + 1, { width: 70, align: 'right' });
      // bar
      const barY = yStart + 18;
      const barW = pageW;
      doc.roundedRect(heatX, barY, barW, 5, 2.5).fillColor('#eee').fill();
      doc.roundedRect(heatX, barY, Math.max(barW * rate / 100, 2), 5, 2.5).fillColor(pickBandColor(rate)).fill();
      doc.y = barY + 5 + 8;
    });
    doc.moveDown(0.6);
  }

  // Reflections
  const reflectionEntries = Object.entries(reflectionsByDate);
  if (reflectionEntries.length > 0) {
    if (doc.y > doc.page.height - 150) doc.addPage();
    doc.fillColor(COLORS.brand).fontSize(13).font('Helvetica-Bold').text('Your reflections');
    doc.moveDown(0.3);
    reflectionEntries.sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, text]) => {
      const d = new Date(k + 'T00:00:00.000Z');
      doc.fillColor(COLORS.muted).fontSize(8).font('Helvetica-Bold').text(dayLabel(d).toUpperCase());
      doc.fillColor(COLORS.fg).fontSize(10).font('Helvetica-Oblique').text(`"${text}"`, { width: pageW });
      doc.moveDown(0.5);
    });
  }

  // Remarks (notes on completions)
  const completionsWithRemarks = completions.filter(c => c.notes);
  if (completionsWithRemarks.length > 0) {
    if (doc.y > doc.page.height - 100) doc.addPage();
    doc.fillColor(COLORS.brand).fontSize(13).font('Helvetica-Bold').text('Notes on completions');
    doc.moveDown(0.3);
    completionsWithRemarks.forEach(c => {
      const yStart = doc.y;
      doc.rect(heatX, yStart + 3, 3, 10).fillColor(c.task?.color || COLORS.brand).fill();
      doc.fillColor(COLORS.fg).fontSize(9).font('Helvetica-Bold').text(`${c.task?.title || 'Habit'} · ${dayLabel(c.date)}`, heatX + 10, yStart, { width: pageW - 10 });
      doc.fillColor(COLORS.muted).fontSize(9).font('Helvetica').text(c.notes, heatX + 10, doc.y, { width: pageW - 10 });
      doc.moveDown(0.4);
    });
  }

  if (reflectionEntries.length === 0) {
    doc.moveDown(0.6);
    doc.fillColor(COLORS.muted).fontSize(9).font('Helvetica-Oblique').text(
      `Tip: jot down one sentence at the end of each day in HabitSquad — what's the truth about today? Looking back over a week of these is the single most useful tracking habit.`,
      { width: pageW }
    );
  }

  doc.end();
  return new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(buffers))));
}

async function buildWeeklyPdf(userId, range) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const data = await gatherData(userId, range.start, range.endExclusive);
  return buildPdf({ user, range: 'week', ...data });
}

async function buildMonthlyPdf(userId, range) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const data = await gatherData(userId, range.start, range.endExclusive);
  return buildPdf({ user, range: 'month', ...data });
}

function weekRangeFromTodayKey(todayKey) {
  // Last 7 days inclusive of today
  const [y, m, d] = todayKey.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1, d));
  const endExclusive = new Date(end); endExclusive.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end); start.setUTCDate(end.getUTCDate() - 6);
  return { start, endExclusive };
}

function monthRangeFromTodayKey(todayKey) {
  // Previous calendar month relative to today (so 1st-of-month cron sends the just-completed month)
  const [y, m, d] = todayKey.split('-').map(Number);
  const today = new Date(Date.UTC(y, m - 1, d));
  // first day of current month
  const firstThis = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(firstThis); start.setUTCMonth(firstThis.getUTCMonth() - 1);
  const endExclusive = firstThis;
  return { start, endExclusive };
}

module.exports = { buildWeeklyPdf, buildMonthlyPdf, weekRangeFromTodayKey, monthRangeFromTodayKey };
