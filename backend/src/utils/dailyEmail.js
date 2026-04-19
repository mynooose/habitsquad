const cron = require('node-cron');
const prisma = require('../database/prisma');
const { Resend } = require('resend');
const { getApplicableTasks } = require('./helpers');

let resend;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

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

async function sendDailyEmails() {
  console.log(`[${new Date().toISOString()}] Running daily email job...`);

  try {
    const users = await prisma.user.findMany({
      where: { dailyEmailEnabled: true },
      select: { id: true, email: true, name: true }
    });

    if (users.length === 0) {
      console.log('No users opted in for daily emails.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    for (const user of users) {
      try {
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
              You're receiving this because you enabled daily reminders in HabitSquad.
            </p>
          </div>
        `;

        await getResend().emails.send({
          from: 'HabitSquad <onboarding@resend.dev>',
          to: user.email,
          subject: `Your ${applicable.length} habits for today - ${dayName}`,
          html
        });

        console.log(`  Sent daily email to ${user.email}`);
      } catch (err) {
        console.error(`  Failed to send to ${user.email}:`, err.message);
      }
    }

    console.log(`Daily email job complete. Sent to ${users.length} users.`);
  } catch (err) {
    console.error('Daily email job error:', err.message);
  }
}

function startDailyEmailCron() {
  // Run at 7:00 AM every day
  cron.schedule('0 7 * * *', sendDailyEmails, {
    timezone: 'Asia/Kolkata'
  });
  console.log('Daily email cron scheduled for 7:00 AM IST');
}

module.exports = { startDailyEmailCron, sendDailyEmails };
