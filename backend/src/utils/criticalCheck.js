const cron = require('node-cron');
const prisma = require('../database/prisma');
const { sendEmail } = require('./mailer');
const { getApplicableTasks } = require('./helpers');
const activityLog = require('./activityLog');

const SHAME_DAYS = 2; // miss any-task in a group for this many calendar days in a row -> wall

function ymd(d) { return d.toISOString().split('T')[0]; }

// User-local "today" UTC midnight, derived from their IANA tz.
function localTodayUtc(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const y = parseInt(parts.find(p => p.type === 'year').value, 10);
    const m = parseInt(parts.find(p => p.type === 'month').value, 10);
    const d = parseInt(parts.find(p => p.type === 'day').value, 10);
    return new Date(Date.UTC(y, m - 1, d));
  } catch { return null; }
}

// Walk back from today's eve, find the last `count` calendar days where the user
// had at least one applicable active task in this group.
function lastApplicableDaysBefore(userTasks, today, count) {
  const days = [];
  let i = 1;
  while (days.length < count && i < 365) {
    const d = new Date(today); d.setUTCDate(today.getUTCDate() - i);
    const apps = getApplicableTasks(userTasks, d);
    if (apps.length > 0) days.push(d);
    i++;
  }
  return days;
}

async function checkInactivityForMember({ userId, userEmail, userName, userTimezone, groupId, groupName, shameEmailEnabled = false }) {
  const today = localTodayUtc(userTimezone || 'UTC');
  if (!today) return false;

  const userTasks = await prisma.task.findMany({
    where: { userId, groupId, isActive: true }
  });
  if (userTasks.length === 0) return false; // no group habits => not eligible

  const days = lastApplicableDaysBefore(userTasks, today, SHAME_DAYS);
  if (days.length < SHAME_DAYS) return false; // not enough history yet

  const earliest = days[days.length - 1];
  const dayAfterLatest = new Date(days[0]); dayAfterLatest.setUTCDate(dayAfterLatest.getUTCDate() + 1);
  const tomorrow = new Date(today); tomorrow.setUTCDate(today.getUTCDate() + 1);

  const [completionsInWindow, completionsToday] = await Promise.all([
    prisma.taskCompletion.count({
      where: { userId, task: { groupId }, date: { gte: earliest, lt: dayAfterLatest } }
    }),
    prisma.taskCompletion.count({
      where: { userId, task: { groupId }, date: { gte: today, lt: tomorrow } }
    })
  ]);

  const allMissed = completionsInWindow === 0;

  const existing = await prisma.shameEvent.findFirst({
    where: { groupId, userId, resolvedAt: null }
  });

  // If there's no open event but the user had one resolved within the last day
  // (e.g. they completed earlier today then uncompleted), reopen it so we
  // preserve the original "since" date rather than spawning a fresh event.
  let recentlyResolved = null;
  if (!existing) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    recentlyResolved = await prisma.shameEvent.findFirst({
      where: { groupId, userId, resolvedAt: { gte: oneDayAgo } },
      orderBy: { resolvedAt: 'desc' }
    });
  }

  // Completing anything today clears the wall — even if the prior 2 days are still empty.
  if (completionsToday > 0) {
    if (existing) {
      await prisma.shameEvent.update({
        where: { id: existing.id },
        data: { resolvedAt: new Date() }
      });
    }
    return false;
  }

  // No completion today, but the prior window is still missed.
  // If we have a recently-resolved event, just reopen it (preserve since date).
  if (allMissed && !existing && recentlyResolved) {
    await prisma.shameEvent.update({
      where: { id: recentlyResolved.id },
      data: { resolvedAt: null }
    });
    return false; // not "newly triggered" — just restored
  }

  if (allMissed && !existing) {
    await prisma.shameEvent.create({
      data: { groupId, userId, daysMissed: SHAME_DAYS }
    });

    // Shame email — opt-in only, default off.
    if (shameEmailEnabled && userEmail) {
      sendEmail({
        to: userEmail,
        subject: `You went silent for ${SHAME_DAYS} days in ${groupName || 'your group'}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;background:#0a0a0a;color:#fff;border-radius:12px;">
            <h2 style="color:#ef4444;margin-bottom:4px;">Heads up, ${(userName || 'there').split(' ')[0]}</h2>
            <p style="color:#888;margin-top:0;">You haven't completed any habit in ${groupName || 'your group'} for ${SHAME_DAYS} days in a row.</p>
            <div style="padding:16px;background:#111;border-radius:8px;margin:16px 0;border-left:3px solid #ef4444;">
              <p style="color:#fff;font-weight:600;margin:0;">The group can see you on the Wall of Shame.</p>
              <p style="color:#aaa;font-size:13px;margin:4px 0 0;">Show up today — completing any one habit clears the wall.</p>
            </div>
            <div style="text-align:center;margin-top:20px;">
              <a href="${process.env.FRONTEND_URL}/dashboard" style="background:#ef4444;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">Open HabitSquad</a>
            </div>
          </div>`
      }).catch(err => console.error('Shame email failed:', err.message));
    }

    activityLog.log({
      groupId, userId,
      type: 'INACTIVE_STREAK',
      detail: `${SHAME_DAYS} days with no completions`
    });
    return true;
  }

  if (!allMissed && existing) {
    await prisma.shameEvent.update({
      where: { id: existing.id },
      data: { resolvedAt: new Date() }
    });
  } else if (allMissed && existing) {
    const daysSinceOpen = Math.max(SHAME_DAYS, Math.round((today - new Date(existing.createdAt)) / (1000 * 60 * 60 * 24)) + SHAME_DAYS);
    if (existing.daysMissed !== daysSinceOpen) {
      await prisma.shameEvent.update({
        where: { id: existing.id },
        data: { daysMissed: daysSinceOpen }
      });
    }
  }

  return false;
}

async function runCriticalCheck() {
  try {
    // Iterate every (group, member) pair
    const memberships = await prisma.groupMembership.findMany({
      include: {
        user: { select: { id: true, email: true, name: true, timezone: true, deletedAt: true, shameEmailEnabled: true } },
        group: { select: { id: true, name: true } }
      }
    });

    let triggered = 0;
    for (const m of memberships) {
      if (!m.user || m.user.deletedAt) continue;
      try {
        const fired = await checkInactivityForMember({
          userId: m.user.id,
          userEmail: m.user.email,
          userName: m.user.name,
          userTimezone: m.user.timezone,
          shameEmailEnabled: !!m.user.shameEmailEnabled,
          groupId: m.groupId,
          groupName: m.group?.name
        });
        if (fired) triggered++;
      } catch (err) {
        console.error(`  inactivity check failed for ${m.user.email} in ${m.groupId}:`, err.message);
      }
    }
    if (triggered > 0) console.log(`Inactivity check: ${triggered} new shame event(s).`);
  } catch (err) {
    console.error('Inactivity check job error:', err.message);
  }
}

function startCriticalCheckCron() {
  // Hourly at :15 UTC
  cron.schedule('15 * * * *', runCriticalCheck, { timezone: 'UTC' });
  console.log('Inactivity-shame cron scheduled hourly at :15 UTC');
}

module.exports = { startCriticalCheckCron, runCriticalCheck, checkInactivityForMember };
