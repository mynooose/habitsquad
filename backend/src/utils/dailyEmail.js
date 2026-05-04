const cron = require('node-cron');
const prisma = require('../database/prisma');
const { sendEmail } = require('./mailer');
const { getApplicableTasks } = require('./helpers');
const { buildWeeklyPdf, buildMonthlyPdf, weekRangeFromTodayKey, monthRangeFromTodayKey } = require('./pdfReport');

function buildTasksHtml(tasks, groups) {
  let html = '';

  // Personal tasks
  const personal = tasks.filter(t => !t.groupId);
  if (personal.length > 0) {
    html += `<h3 style="color:#a78bfa;margin:16px 0 8px;">Personal</h3>`;
    html += personal.map(t => `
      <div style="padding:8px 12px;margin:4px 0;background:#1a1a2e;border-radius:8px;border-left:3px solid ${t.color || '#22c55e'};">
        <span style="color:#fff;font-weight:500;">${t.title}</span>
        <span style="color:#888;font-size:12px;margin-left:8px;">${t.weightage}pts</span>
      </div>
    `).join('');
  }

  // Group tasks
  const groupMap = {};
  tasks.filter(t => t.groupId).forEach(t => {
    if (!groupMap[t.groupId]) {
      const g = groups.find(g => g.id === t.groupId);
      groupMap[t.groupId] = { name: g?.name || 'Group', color: g?.color || '#8b5cf6', tasks: [] };
    }
    groupMap[t.groupId].tasks.push(t);
  });

  for (const [, group] of Object.entries(groupMap)) {
    html += `<h3 style="color:${group.color};margin:16px 0 8px;">${group.name}</h3>`;
    html += group.tasks.map(t => `
      <div style="padding:8px 12px;margin:4px 0;background:#1a1a2e;border-radius:8px;border-left:3px solid ${t.color || '#22c55e'};">
        <span style="color:#fff;font-weight:500;">${t.title}</span>
        <span style="color:#888;font-size:12px;margin-left:8px;">${t.weightage}pts</span>
      </div>
    `).join('');
  }

  return html;
}

// Returns the current HH (0-23) in the given IANA timezone, or null if tz invalid.
function currentHourInTimezone(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false }).formatToParts(new Date());
    const h = parts.find(p => p.type === 'hour');
    return h ? parseInt(h.value, 10) % 24 : null;
  } catch { return null; }
}

// Returns short weekday name (Sun, Mon, ...) in the user's timezone
function currentWeekdayInTimezone(tz) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date());
  } catch { return null; }
}

// Returns YYYY-MM-DD in the user's local timezone for "today"
function localDateKey(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    return `${y}-${m}-${d}`;
  } catch { return null; }
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function reviewEmailHtml({ name, kind, dateLabel }) {
  const title = kind === 'month' ? 'Monthly summary' : 'Sunday review';
  const verb = kind === 'month' ? 'last month' : 'last week';
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:20px;background:#0a0a0a;color:#fff;border-radius:12px;">
      <h2 style="color:#a78bfa;margin-bottom:4px;">${title} — ${name.split(' ')[0]}</h2>
      <p style="color:#888;margin-top:0;">${dateLabel}</p>
      <div style="padding:16px;background:#111;border-radius:8px;margin:16px 0;">
        <p style="color:#fff;margin:0;font-size:14px;">Your ${verb} as a PDF is attached. Numbers, daily breakdown, habit completion rates, your reflections, and any notes you wrote on completions.</p>
      </div>
      <div style="text-align:center;margin-top:20px;">
        <a href="${process.env.FRONTEND_URL}/dashboard/analytics" style="background:#a78bfa;color:#000;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Open analytics
        </a>
      </div>
      <p style="color:#555;font-size:11px;text-align:center;margin-top:20px;">
        Don't want this? <a href="${process.env.FRONTEND_URL}/dashboard/profile" style="color:#888;text-decoration:underline;">Turn it off</a> in your profile.
      </p>
    </div>`;
}

async function sendWeeklyReview(user) {
  const tz = user.timezone || 'UTC';
  const todayKey = localDateKey(tz);
  if (!todayKey) return;
  const range = weekRangeFromTodayKey(todayKey);
  const pdf = await buildWeeklyPdf(user.id, range);
  const labelStart = range.start.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  const labelEndDate = new Date(range.endExclusive); labelEndDate.setUTCDate(labelEndDate.getUTCDate() - 1);
  const labelEnd = labelEndDate.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });

  await sendEmail({
    to: user.email,
    subject: `Your week — ${labelStart} – ${labelEnd}`,
    html: reviewEmailHtml({ name: user.name, kind: 'week', dateLabel: `Week of ${labelStart} – ${labelEnd}` }),
    attachments: [{ filename: `habitsquad-week-${todayKey}.pdf`, content: pdf, contentType: 'application/pdf' }]
  });
}

async function sendMonthlyReview(user) {
  const tz = user.timezone || 'UTC';
  const todayKey = localDateKey(tz);
  if (!todayKey) return;
  const range = monthRangeFromTodayKey(todayKey);
  const pdf = await buildMonthlyPdf(user.id, range);
  const monthLabel = range.start.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });

  await sendEmail({
    to: user.email,
    subject: `Your month — ${monthLabel}`,
    html: reviewEmailHtml({ name: user.name, kind: 'month', dateLabel: monthLabel }),
    attachments: [{ filename: `habitsquad-month-${todayKey}.pdf`, content: pdf, contentType: 'application/pdf' }]
  });
}

async function sendWeeklyReviews() {
  try {
    const users = await prisma.user.findMany({
      where: { weeklyReviewEnabled: true, deletedAt: null },
      select: { id: true, email: true, name: true, timezone: true, weeklyReviewHour: true }
    });
    if (users.length === 0) return;

    const dueUsers = users.filter(u => {
      const tz = u.timezone || 'UTC';
      const preferredH = parseInt((u.weeklyReviewHour || '21:00').split(':')[0], 10);
      const nowH = currentHourInTimezone(tz);
      const wd = currentWeekdayInTimezone(tz);
      return nowH !== null && nowH === preferredH && wd === 'Sun';
    });
    if (dueUsers.length === 0) return;

    for (const user of dueUsers) {
      try {
        await sendWeeklyReview(user);
        console.log(`  Sent weekly review to ${user.email}`);
      } catch (err) {
        console.error(`  Weekly review failed for ${user.email}:`, err.message);
      }
    }
    console.log(`Weekly review job complete. Sent to ${dueUsers.length} user(s).`);
  } catch (err) {
    console.error('Weekly review job error:', err.message);
  }
}

function currentDayOfMonthInTimezone(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: '2-digit' }).formatToParts(new Date());
    const d = parts.find(p => p.type === 'day');
    return d ? parseInt(d.value, 10) : null;
  } catch { return null; }
}

async function sendMonthlyReviews() {
  try {
    const users = await prisma.user.findMany({
      where: { monthlySummaryEnabled: true, deletedAt: null },
      select: { id: true, email: true, name: true, timezone: true, weeklyReviewHour: true }
    });
    if (users.length === 0) return;

    // Fires on the 1st of each month at user's weeklyReviewHour (reusing same hour)
    const dueUsers = users.filter(u => {
      const tz = u.timezone || 'UTC';
      const preferredH = parseInt((u.weeklyReviewHour || '21:00').split(':')[0], 10);
      const nowH = currentHourInTimezone(tz);
      const dom = currentDayOfMonthInTimezone(tz);
      return nowH !== null && nowH === preferredH && dom === 1;
    });
    if (dueUsers.length === 0) return;

    for (const user of dueUsers) {
      try {
        await sendMonthlyReview(user);
        console.log(`  Sent monthly summary to ${user.email}`);
      } catch (err) {
        console.error(`  Monthly summary failed for ${user.email}:`, err.message);
      }
    }
    console.log(`Monthly summary job complete. Sent to ${dueUsers.length} user(s).`);
  } catch (err) {
    console.error('Monthly summary job error:', err.message);
  }
}

async function sendDailyEmails() {
  const runTs = new Date().toISOString();
  console.log(`[${runTs}] Running hourly daily-email job...`);

  // Always check weekly + monthly reviews on the same hourly tick (separate criteria)
  sendWeeklyReviews().catch(err => console.error('weekly review error:', err.message));
  sendMonthlyReviews().catch(err => console.error('monthly review error:', err.message));

  try {
    const users = await prisma.user.findMany({
      where: { dailyEmailEnabled: true, deletedAt: null },
      select: { id: true, email: true, name: true, timezone: true, dailyEmailTime: true }
    });

    if (users.length === 0) return;

    // Filter users whose preferred hour matches their local current hour
    const dueUsers = users.filter(u => {
      const tz = u.timezone || 'UTC';
      const preferred = (u.dailyEmailTime || '07:00').split(':')[0];
      const preferredH = parseInt(preferred, 10);
      const nowH = currentHourInTimezone(tz);
      return nowH !== null && nowH === preferredH;
    });

    if (dueUsers.length === 0) return;

    for (const user of dueUsers) {
      try {
        const tz = user.timezone || 'UTC';
        const userLocalDate = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
        const today = new Date(userLocalDate); today.setHours(0, 0, 0, 0);
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        const tasks = await prisma.task.findMany({
          where: { userId: user.id, isActive: true }
        });

        const applicable = getApplicableTasks(tasks, today);
        if (applicable.length === 0) continue;

        const memberships = await prisma.groupMembership.findMany({
          where: { userId: user.id },
          include: { group: { select: { id: true, name: true, color: true } } }
        });
        const groups = memberships.map(m => m.group);

        const totalWeight = applicable.reduce((s, t) => s + t.weightage, 0);
        const tasksHtml = buildTasksHtml(applicable, groups);

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#0a0a0a;color:#fff;border-radius:12px;">
            <h2 style="color:#22c55e;margin-bottom:4px;">Good Morning, ${user.name.split(' ')[0]}!</h2>
            <p style="color:#888;margin-top:0;">${dayName}</p>
            <div style="padding:16px;background:#111;border-radius:8px;margin:16px 0;text-align:center;">
              <p style="color:#888;font-size:12px;margin:0;">Today's Target</p>
              <p style="font-size:32px;font-weight:800;color:#22c55e;margin:4px 0;">${applicable.length} habits</p>
              <p style="color:#888;font-size:14px;margin:0;">${totalWeight} points possible</p>
            </div>
            ${tasksHtml}
            <div style="text-align:center;margin-top:24px;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#22c55e;color:#000;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Start Your Day
              </a>
            </div>
            <p style="color:#555;font-size:11px;text-align:center;margin-top:20px;">
              Don't want this reminder? Turn it off any time in your <a href="${process.env.FRONTEND_URL}/dashboard/profile" style="color:#888;text-decoration:underline;">profile settings</a>.
            </p>
          </div>
        `;

        await sendEmail({
          to: user.email,
          subject: `Your ${applicable.length} habits for today - ${dayName}`,
          html
        });

        console.log(`  Sent daily email to ${user.email}`);
      } catch (err) {
        console.error(`  Failed to send to ${user.email}:`, err.message);
      }
    }

    console.log(`Daily email job complete. Sent to ${dueUsers.length} user(s).`);
  } catch (err) {
    console.error('Daily email job error:', err.message);
  }
}

function startDailyEmailCron() {
  // Every hour on minute 0 — each user gets the email only when their
  // local preferred hour matches. See sendDailyEmails for the filter.
  cron.schedule('0 * * * *', sendDailyEmails, { timezone: 'UTC' });
  console.log('Daily email cron scheduled hourly (UTC) — fires per-user at their local preferred time');
}

module.exports = { startDailyEmailCron, sendDailyEmails };
