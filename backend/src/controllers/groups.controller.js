const { z } = require('zod');
const prisma = require('../database/prisma');
const { createGroupSchema, inviteSchema } = require('../utils/validation');
const { sendGroupInviteEmail, sendGroupAddedEmail } = require('../utils/mailer');
const { getApplicableTasks, computeDayScore, getTodayRange } = require('../utils/helpers');
const groupQ = require('../queries/groups.queries');
const taskQ = require('../queries/tasks.queries');
const activityLog = require('../utils/activityLog');

async function listGroups(req, res, next) {
  try {
    const memberships = await groupQ.findUserMemberships(req.user.id);
    const groups = memberships.map(m => ({
      ...m.group, role: m.role, joinedAt: m.joinedAt,
      memberCount: m.group._count.memberships, taskCount: m.group._count.tasks, _count: undefined
    }));
    res.json({ groups });
  } catch (error) { next(error); }
}

async function createGroup(req, res, next) {
  try {
    const data = createGroupSchema.parse(req.body);
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const group = await groupQ.createGroup({
      ...data, inviteCode, createdById: req.user.id,
      memberships: { create: { userId: req.user.id, role: 'ADMIN' } }
    });
    res.status(201).json({ group: { ...group, memberCount: group._count.memberships, role: 'ADMIN', _count: undefined } });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    next(error);
  }
}

async function getGroup(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });
    const group = await groupQ.findGroupById(req.params.id);
    res.json({ group: { ...group, taskCount: group._count.tasks, _count: undefined }, role: membership.role });
  } catch (error) { next(error); }
}

async function joinGroup(req, res, next) {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });
    const group = await groupQ.findGroupByInviteCode(inviteCode);
    if (!group) return res.status(404).json({ error: 'Invalid invite code' });
    const existing = await groupQ.findMembership(req.user.id, group.id);
    if (existing) return res.status(400).json({ error: 'Already a member of this group' });
    await groupQ.createMembership(req.user.id, group.id);
    await groupQ.acceptInvites(group.id, req.user.email);
    activityLog.log({ groupId: group.id, userId: req.user.id, type: 'MEMBER_JOINED' });
    res.json({ group, message: 'Successfully joined group' });
  } catch (error) { next(error); }
}

async function inviteToGroup(req, res, next) {
  try {
    const data = inviteSchema.parse(req.body);
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    // Send pending invite notification + email to an existing user.
    // Membership is NOT created here — only on accept (see notifications.controller).
    const notifyAddedUser = async (userId, userEmail) => {
      const [group, inviter] = await Promise.all([
        prisma.group.findUnique({ where: { id: req.params.id }, select: { name: true } }),
        prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } })
      ]);
      await prisma.notification.create({
        data: {
          userId,
          type: 'GROUP_ADDED',
          title: `Invite to ${group.name}`,
          message: `${inviter.name} invited you to join "${group.name}". Accept to join or decline.`,
          relatedId: req.params.id,
          actionUrl: `/dashboard`,
          status: 'PENDING'
        }
      });
      if (userEmail) {
        sendGroupAddedEmail({ to: userEmail, inviterName: inviter.name, groupName: group.name })
          .catch(err => console.error('Email failed:', err.message));
      }
    };

    const hasPendingInviteNotif = async (userId) => {
      const existing = await prisma.notification.findFirst({
        where: { userId, type: 'GROUP_ADDED', relatedId: req.params.id, status: 'PENDING' }
      });
      return !!existing;
    };

    if (data.userId) {
      const targetUser = await groupQ.findUserById(data.userId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      const existingMembership = await groupQ.findMembership(data.userId, req.params.id);
      if (existingMembership) return res.status(400).json({ error: 'User is already a member' });
      if (await hasPendingInviteNotif(data.userId)) return res.status(400).json({ error: 'Invite already pending' });
      res.json({ success: true, message: 'Invite sent' });
      notifyAddedUser(data.userId, targetUser.email).catch(err => console.error('Notify failed:', err.message));
      return;
    }

    if (data.email) {
      const existingUser = await groupQ.findUserByEmail(data.email);
      if (existingUser) {
        const existingMembership = await groupQ.findMembership(existingUser.id, req.params.id);
        if (existingMembership) return res.status(400).json({ error: 'User is already a member' });
        if (await hasPendingInviteNotif(existingUser.id)) return res.status(400).json({ error: 'Invite already pending' });
        res.json({ success: true, message: 'Invite sent' });
        notifyAddedUser(existingUser.id, data.email).catch(err => console.error('Notify failed:', err.message));
        return;
      }
      const existingInvite = await groupQ.findPendingInvite(req.params.id, data.email);
      if (existingInvite && existingInvite.status === 'PENDING') return res.status(400).json({ error: 'Invite already sent to this email' });
      const invite = await groupQ.upsertInvite(req.params.id, data.email, req.user.id);

      // Respond immediately; send email in background
      res.json({ success: true, invite, message: 'Invite sent' });

      Promise.all([
        prisma.group.findUnique({ where: { id: req.params.id }, select: { name: true, inviteCode: true } }),
        prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } })
      ]).then(([group, inviter]) => {
        return sendGroupInviteEmail({ to: data.email, inviterName: inviter.name, groupName: group.name, inviteCode: group.inviteCode });
      }).catch(err => console.error('Failed to send invite email:', err.message));
      return;
    }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    next(error);
  }
}

async function cancelInvite(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership || membership.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can cancel invites' });
    await groupQ.deleteInvite(req.params.inviteId, req.params.id);
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function getMemberTasks(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const members = await groupQ.findGroupMembers(req.params.id);
    const { today, tomorrow } = getTodayRange(req.query.date);
    const memberIds = members.map(m => m.userId);

    // Batched queries — 3 total instead of N*3
    const [allTasks, xpList] = await Promise.all([
      prisma.task.findMany({
        where: { userId: { in: memberIds }, groupId: req.params.id, isActive: true },
        include: { completions: { where: { date: { gte: today, lt: tomorrow } } }, group: { select: { id: true, name: true, color: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, totalXp: true } })
    ]);

    const xpMap = Object.fromEntries(xpList.map(u => [u.id, u.totalXp]));
    const tasksByUser = {};
    allTasks.forEach(t => { if (!tasksByUser[t.userId]) tasksByUser[t.userId] = []; tasksByUser[t.userId].push(t); });

    const memberTasks = members.map(m => {
      const tasks = tasksByUser[m.userId] || [];
      const tasksWithStatus = tasks.map(t => ({
        id: t.id, title: t.title, frequency: t.frequency, weightage: t.weightage, color: t.color,
        requiresProof: t.requiresProof, deadlineTime: t.deadlineTime, groupId: t.groupId, group: t.group,
        completedToday: t.completions.length > 0,
        proofUrl: t.completions[0]?.proofUrl || null
      }));
      const totalWeight = tasksWithStatus.reduce((sum, t) => sum + t.weightage, 0);
      const completedWeight = tasksWithStatus.filter(t => t.completedToday).reduce((sum, t) => sum + t.weightage, 0);
      const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
      return { user: m.user, role: m.role, tasks: tasksWithStatus, score, completedCount: tasksWithStatus.filter(t => t.completedToday).length, totalCount: tasksWithStatus.length, totalXp: xpMap[m.userId] || 0 };
    });
    memberTasks.sort((a, b) => b.score - a.score);
    res.json({ memberTasks });
  } catch (error) { next(error); }
}

async function getActivityFeed(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const limit = Math.min(50, Math.max(5, parseInt(req.query.limit) || 20));
    const before = req.query.before ? new Date(req.query.before) : new Date();

    const memberIds = (await groupQ.findGroupMembers(req.params.id)).map(m => m.userId);

    // Pull both event types separately, then merge by createdAt desc.
    const [completions, events] = await Promise.all([
      prisma.taskCompletion.findMany({
        where: {
          userId: { in: memberIds },
          task: { groupId: req.params.id },
          createdAt: { lt: before }
        },
        include: {
          task: { select: { id: true, title: true, color: true } },
          reactions: { select: { emoji: true, userId: true } },
          comments: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      prisma.groupActivity.findMany({
        where: { groupId: req.params.id, createdAt: { lt: before } },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          targetUser: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    ]);

    // Lookup map for completion users (since reactions/comments don't carry user info)
    const memberMap = Object.fromEntries((await groupQ.findGroupMembers(req.params.id)).map(m => [m.userId, m.user]));

    const completionItems = completions.map(c => {
      const counts = {};
      let myEmoji = null;
      (c.reactions || []).forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        if (r.userId === req.user.id) myEmoji = r.emoji;
      });
      return {
        id: 'c_' + c.id,
        kind: 'COMPLETED',
        createdAt: c.createdAt,
        completionId: c.id,
        userId: c.userId,
        userName: memberMap[c.userId]?.name || 'Member',
        userAvatar: memberMap[c.userId]?.avatar || null,
        taskId: c.taskId,
        taskTitle: c.task?.title || 'Task',
        taskColor: c.task?.color || null,
        proofUrl: c.proofUrl || null,
        remark: c.notes || null,
        reactions: counts,
        myEmoji,
        comments: (c.comments || []).map(co => ({
          id: co.id, body: co.body, createdAt: co.createdAt,
          userId: co.userId, userName: co.user?.name || 'Member', userAvatar: co.user?.avatar || null
        }))
      };
    });

    const eventItems = events.map(e => ({
      id: 'e_' + e.id,
      kind: e.type,
      createdAt: e.createdAt,
      userId: e.userId,
      userName: e.user?.name || 'Member',
      userAvatar: e.user?.avatar || null,
      targetUserId: e.targetUserId,
      targetUserName: e.targetUser?.name || null,
      habitTitle: e.habitTitle,
      habitColor: e.habitColor,
      detail: e.detail
    }));

    const merged = [...completionItems, ...eventItems]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    const oldestTs = merged.length > 0 ? merged[merged.length - 1].createdAt : null;
    // hasMore: if either source returned `limit` items there may be more
    const hasMore = completions.length === limit || events.length === limit;

    res.json({ items: merged, hasMore, nextBefore: hasMore ? oldestTs : null });
  } catch (error) { next(error); }
}

async function getAnalytics(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 7), 90);
    const members = await groupQ.findGroupMembers(req.params.id);
    const memberIds = members.map(m => m.userId);

    // Use user-local date if provided, else UTC today
    const { today: now, tomorrow } = getTodayRange(req.query.date);
    const startDate = new Date(now); startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    const weekStart = new Date(now); weekStart.setUTCDate(weekStart.getUTCDate() - 6);

    // Calendar-month start (UTC) for "this month" shame counts
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [allTasks, allCompletions, xpList, shameEvents] = await Promise.all([
      prisma.task.findMany({ where: { userId: { in: memberIds }, groupId: req.params.id } }),
      prisma.taskCompletion.findMany({
        where: { userId: { in: memberIds }, task: { groupId: req.params.id }, date: { gte: startDate, lt: tomorrow } },
        include: {
          task: { select: { id: true, title: true, color: true, weightage: true, isActive: true } },
          reactions: { select: { emoji: true, userId: true } },
          comments: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, totalXp: true } }),
      prisma.shameEvent.findMany({
        where: { groupId: req.params.id, userId: { in: memberIds }, createdAt: { gte: monthStart } },
        select: { userId: true, daysMissed: true, resolvedAt: true, createdAt: true }
      })
    ]);

    const xpMap = Object.fromEntries(xpList.map(u => [u.id, u.totalXp]));
    const shameByUser = {};
    shameEvents.forEach(e => {
      if (!shameByUser[e.userId]) shameByUser[e.userId] = { count: 0, totalDaysMissed: 0, currentlyOpen: false };
      shameByUser[e.userId].count += 1;
      shameByUser[e.userId].totalDaysMissed += (e.daysMissed || 2);
      if (!e.resolvedAt) shameByUser[e.userId].currentlyOpen = true;
    });
    const tasksByUser = {};
    allTasks.forEach(t => { if (!tasksByUser[t.userId]) tasksByUser[t.userId] = []; tasksByUser[t.userId].push(t); });

    const dateKey = (d) => d.toISOString().split('T')[0];
    const completionsByUserDate = {};
    allCompletions.forEach(c => {
      const dk = dateKey(c.date);
      if (!completionsByUserDate[c.userId]) completionsByUserDate[c.userId] = {};
      if (!completionsByUserDate[c.userId][dk]) completionsByUserDate[c.userId][dk] = new Set();
      completionsByUserDate[c.userId][dk].add(c.taskId);
    });

    // Per-member analytics
    const memberAnalytics = members.map(m => {
      const myTasks = tasksByUser[m.userId] || [];
      const activeTasks = myTasks.filter(t => t.isActive);
      const byDate = completionsByUserDate[m.userId] || {};

      const history = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate); d.setUTCDate(d.getUTCDate() + i);
        const dk = dateKey(d);
        const applicable = getApplicableTasks(activeTasks, d);
        const completed = byDate[dk] || new Set();
        const weight = applicable.reduce((s, t) => s + t.weightage, 0);
        const done = computeDayScore(applicable, completed);
        history.push({
          date: dk,
          score: weight > 0 ? Math.round((done / weight) * 100) : 0,
          completedCount: completed.size,
          totalCount: applicable.length
        });
      }

      // Current streak — walk backward from today; today pending and
      // no-habit days are neutral. Longest — any window.
      let showUpCurrent = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h.completedCount > 0) showUpCurrent++;
        else if (h.totalCount === 0) continue;
        else if (i === history.length - 1) continue;
        else break;
      }
      let showUpLongest = 0, temp = 0;
      for (const h of history) {
        if (h.completedCount > 0) { temp++; showUpLongest = Math.max(showUpLongest, temp); }
        else if (h.totalCount > 0) temp = 0;
      }

      // Top habit — most completions in window
      const myCompletions = allCompletions.filter(c => c.userId === m.userId);
      const habitCounts = {};
      myCompletions.forEach(c => { habitCounts[c.taskId] = (habitCounts[c.taskId] || 0) + 1; });
      let topHabit = null, topCount = 0;
      for (const [tid, count] of Object.entries(habitCounts)) {
        if (count > topCount) { topCount = count; const task = myTasks.find(t => t.id === tid); if (task) topHabit = { id: tid, title: task.title, color: task.color, completions: count }; }
      }

      return {
        user: m.user,
        role: m.role,
        totalXp: xpMap[m.userId] || 0,
        history,
        last7Days: history.slice(-7),
        showUpStreak: { current: showUpCurrent, longest: showUpLongest },
        topHabit,
        totalCompletions: myCompletions.length,
        shameStats: shameByUser[m.userId] || { count: 0, totalDaysMissed: 0, currentlyOpen: false }
      };
    });

    // Group pulse — only average over member-days that had habits scheduled.
    // Days with no habits (just-joined members, etc.) would otherwise dilute.
    const todayKey = dateKey(now);
    const todayMemberScores = memberAnalytics
      .map(ma => ma.history[ma.history.length - 1])
      .filter(h => h && h.totalCount > 0)
      .map(h => h.score);
    const todayAvg = todayMemberScores.length
      ? Math.round(todayMemberScores.reduce((s, v) => s + v, 0) / todayMemberScores.length)
      : 0;

    const weekScores = [];
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    memberAnalytics.forEach(ma => {
      ma.history.slice(-7).forEach(h => {
        if (h.totalCount > 0) weekScores.push(h.score);
        const d = new Date(h.date + 'T12:00:00');
        weekdayCounts[d.getUTCDay()] += h.completedCount;
      });
    });
    const weekAvg = weekScores.length ? Math.round(weekScores.reduce((s, v) => s + v, 0) / weekScores.length) : 0;
    const weekCompletions = allCompletions.filter(c => c.date >= weekStart).length;
    const mostActiveIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts));
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostActiveWeekday = weekdayCounts[mostActiveIdx] > 0 ? weekdayNames[mostActiveIdx] : null;

    // Activity feed — last 20 completions
    const memberUserMap = Object.fromEntries(members.map(m => [m.userId, m.user]));
    const activityFeed = allCompletions.slice(0, 20).map(c => {
      const counts = {};
      let myEmoji = null;
      (c.reactions || []).forEach(r => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        if (r.userId === req.user.id) myEmoji = r.emoji;
      });
      return {
        completionId: c.id,
        userId: c.userId,
        userName: memberUserMap[c.userId]?.name || 'Member',
        userAvatar: memberUserMap[c.userId]?.avatar || null,
        taskId: c.taskId,
        taskTitle: c.task?.title || 'Task',
        taskColor: c.task?.color || null,
        completedAt: c.createdAt,
        date: dateKey(c.date),
        proofUrl: c.proofUrl || null,
        reactions: counts,
        myEmoji,
        comments: (c.comments || []).map(co => ({
          id: co.id, body: co.body, createdAt: co.createdAt,
          userId: co.userId, userName: co.user?.name || 'Member', userAvatar: co.user?.avatar || null
        }))
      };
    });

    res.json({
      days,
      groupPulse: { todayAvg, weekAvg, weekCompletions, mostActiveWeekday },
      members: memberAnalytics,
      activityFeed
    });
  } catch (error) { next(error); }
}

async function getLeaderboard(req, res, next) {
  try {
    const { period = 'week' } = req.query;
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const members = await groupQ.findGroupMembers(req.params.id);
    const { today: endDate } = getTodayRange(req.query.date);
    const startDate = new Date(endDate);
    if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else startDate.setMonth(startDate.getMonth() - 1);

    const memberIds = members.map(m => m.userId);
    const [allTasks, allCompletions] = await Promise.all([
      prisma.task.findMany({ where: { userId: { in: memberIds }, groupId: req.params.id, isActive: true } }),
      prisma.taskCompletion.findMany({ where: { userId: { in: memberIds }, date: { gte: startDate, lte: endDate } } })
    ]);

    const tasksByUser = {};
    allTasks.forEach(t => { if (!tasksByUser[t.userId]) tasksByUser[t.userId] = []; tasksByUser[t.userId].push(t); });
    const completionsByUser = {};
    allCompletions.forEach(c => { if (!completionsByUser[c.userId]) completionsByUser[c.userId] = []; completionsByUser[c.userId].push(c); });

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const leaderboard = members.map(m => {
      const userTasks = tasksByUser[m.userId] || [];
      const completions = completionsByUser[m.userId] || [];
      const totalWeight = userTasks.reduce((sum, t) => sum + t.weightage, 0);
      const completedWeight = completions.reduce((sum, c) => { const task = userTasks.find(t => t.id === c.taskId); return sum + (task?.weightage || 0); }, 0);
      const maxWeight = totalWeight * days;
      const avgScore = maxWeight > 0 ? Math.round((completedWeight / maxWeight) * 100) : 0;
      return { user: m.user, role: m.role, score: Math.min(avgScore, 100), completions: completions.length, tasks: userTasks.length };
    });
    leaderboard.sort((a, b) => b.score - a.score);
    const rankedLeaderboard = leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));
    res.json({ leaderboard: rankedLeaderboard, period });
  } catch (error) { next(error); }
}

async function removeMember(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership || membership.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can remove members' });
    if (req.params.userId === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself. Use leave instead.' });
    await groupQ.deleteMembership(req.params.userId, req.params.id);
    activityLog.log({ groupId: req.params.id, userId: req.user.id, type: 'MEMBER_KICKED', targetUserId: req.params.userId });
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function leaveGroup(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(404).json({ error: 'Not a member of this group' });
    if (membership.role === 'ADMIN') {
      const adminCount = await groupQ.countAdmins(req.params.id);
      if (adminCount === 1) {
        const memberCount = await groupQ.countMembers(req.params.id);
        if (memberCount === 1) {
          await groupQ.deleteGroup(req.params.id);
          return res.json({ success: true, groupDeleted: true });
        }
        // Auto-transfer admin to highest-XP remaining member.
        // Optional: caller passes { transferTo: userId } to pick explicitly.
        const { transferTo } = req.body || {};
        let successorId = null;
        if (transferTo && transferTo !== req.user.id) {
          const target = await groupQ.findMembership(transferTo, req.params.id);
          if (!target) return res.status(400).json({ error: 'Transfer target is not a member of this group' });
          successorId = transferTo;
        } else {
          const others = await prisma.groupMembership.findMany({
            where: { groupId: req.params.id, userId: { not: req.user.id } },
            include: { user: { select: { id: true, totalXp: true } } }
          });
          others.sort((a, b) => (b.user.totalXp || 0) - (a.user.totalXp || 0));
          successorId = others[0]?.user.id;
        }
        if (!successorId) return res.status(400).json({ error: 'No eligible member to promote' });
        await prisma.groupMembership.update({
          where: { userId_groupId: { userId: successorId, groupId: req.params.id } },
          data: { role: 'ADMIN' }
        });
        activityLog.log({ groupId: req.params.id, userId: req.user.id, type: 'ADMIN_TRANSFERRED', targetUserId: successorId });
      }
    }
    await groupQ.deleteMembershipById(membership.id);
    activityLog.log({ groupId: req.params.id, userId: req.user.id, type: 'MEMBER_LEFT' });
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function updateMemberRole(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership || membership.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can change roles' });
    const { role } = req.body || {};
    if (role !== 'ADMIN' && role !== 'MEMBER') return res.status(400).json({ error: 'Role must be ADMIN or MEMBER' });
    if (req.params.userId === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });
    const target = await groupQ.findMembership(req.params.userId, req.params.id);
    if (!target) return res.status(404).json({ error: 'User is not a member of this group' });
    await prisma.groupMembership.update({
      where: { userId_groupId: { userId: req.params.userId, groupId: req.params.id } },
      data: { role }
    });
    activityLog.log({ groupId: req.params.id, userId: req.user.id, type: role === 'ADMIN' ? 'MEMBER_PROMOTED' : 'MEMBER_DEMOTED', targetUserId: req.params.userId });
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function updateGroup(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const data = createGroupSchema.partial().parse(req.body);

    // Name change is admin-only. Other fields (description, color, image) any member can change.
    if (data.name !== undefined && membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can change the group name' });
    }

    // Capture previous values to detect changes for the activity log.
    const before = await prisma.group.findUnique({
      where: { id: req.params.id },
      select: { name: true, description: true, color: true, image: true }
    });

    const group = await groupQ.updateGroup(req.params.id, data);

    if (before) {
      if (data.name !== undefined && data.name !== before.name) {
        activityLog.log({ groupId: req.params.id, userId: req.user.id, type: 'GROUP_RENAMED', detail: `from "${before.name}" to "${data.name}"` });
      }
      if (data.description !== undefined && data.description !== before.description) {
        activityLog.log({ groupId: req.params.id, userId: req.user.id, type: 'GROUP_DESC_CHANGED' });
      }
      if (data.color !== undefined && data.color !== before.color) {
        activityLog.log({ groupId: req.params.id, userId: req.user.id, type: 'GROUP_COLOR_CHANGED' });
      }
      if (data.image !== undefined && data.image !== before.image) {
        activityLog.log({ groupId: req.params.id, userId: req.user.id, type: data.image ? 'GROUP_PHOTO_CHANGED' : 'GROUP_PHOTO_REMOVED' });
      }
    }

    res.json({ group });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    next(error);
  }
}

async function getShameWall(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    // Self-heal: any open event whose user has completed *something* in this group today
    // gets auto-resolved before we read. Fixes any race where completeTask's fire-and-forget
    // resolve missed (server restart, network hiccup, pre-existing event from before the
    // resolve was wired in).
    const todayUtc = new Date(now); todayUtc.setUTCHours(0, 0, 0, 0);
    const tomorrowUtc = new Date(todayUtc); tomorrowUtc.setUTCDate(todayUtc.getUTCDate() + 1);
    const openBefore = await prisma.shameEvent.findMany({
      where: { groupId: req.params.id, resolvedAt: null },
      select: { id: true, userId: true }
    });
    if (openBefore.length > 0) {
      const userIdsWithCompletionsToday = await prisma.taskCompletion.findMany({
        where: {
          userId: { in: openBefore.map(e => e.userId) },
          task: { groupId: req.params.id },
          date: { gte: todayUtc, lt: tomorrowUtc }
        },
        select: { userId: true },
        distinct: ['userId']
      });
      const cleared = new Set(userIdsWithCompletionsToday.map(c => c.userId));
      const toResolve = openBefore.filter(e => cleared.has(e.userId)).map(e => e.id);
      if (toResolve.length > 0) {
        await prisma.shameEvent.updateMany({
          where: { id: { in: toResolve } },
          data: { resolvedAt: now }
        });
      }
    }

    const [openEvents, monthEvents, members, monthCompletions] = await Promise.all([
      prisma.shameEvent.findMany({
        where: { groupId: req.params.id, resolvedAt: null },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          task: { select: { id: true, title: true, color: true } }
        },
        orderBy: { createdAt: 'asc' } // oldest open first → most-haunted up top
      }),
      prisma.shameEvent.findMany({
        where: { groupId: req.params.id, createdAt: { gte: monthStart } },
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      groupQ.findGroupMembers(req.params.id),
      prisma.taskCompletion.count({
        where: { task: { groupId: req.params.id }, date: { gte: monthStart } }
      })
    ]);

    // Look up active habits for each ghost user, so we can surface what they're skipping
    const ghostUserIds = openEvents.map(e => e.userId);
    const ghostTasks = ghostUserIds.length > 0
      ? await prisma.task.findMany({
          where: { userId: { in: ghostUserIds }, groupId: req.params.id, isActive: true },
          select: { id: true, title: true, color: true, userId: true }
        })
      : [];
    const tasksByUser = {};
    ghostTasks.forEach(t => {
      if (!tasksByUser[t.userId]) tasksByUser[t.userId] = [];
      tasksByUser[t.userId].push({ id: t.id, title: t.title, color: t.color });
    });

    const items = openEvents.map(e => {
      const daysSinceOpen = Math.max(e.daysMissed || 2, Math.round((now - new Date(e.createdAt)) / (1000 * 60 * 60 * 24)) + (e.daysMissed || 2));
      return {
        id: e.id,
        userId: e.userId,
        userName: e.user?.name || 'Member',
        userAvatar: e.user?.avatar || null,
        taskId: e.taskId,
        taskTitle: e.task?.title || null,
        taskColor: e.task?.color || null,
        daysMissed: daysSinceOpen,
        since: e.createdAt,
        habits: tasksByUser[e.userId] || []
      };
    });

    // Recently cleared = resolved events this month, newest first, last 5
    const recentlyCleared = monthEvents
      .filter(e => e.resolvedAt)
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        userId: e.userId,
        userName: e.user?.name || 'Member',
        userAvatar: e.user?.avatar || null,
        daysMissed: e.daysMissed,
        since: e.createdAt,
        clearedAt: e.resolvedAt
      }));

    // Per-member monthly stats
    const byUser = {};
    monthEvents.forEach(e => {
      if (!byUser[e.userId]) byUser[e.userId] = { count: 0, totalDays: 0, currentlyOpen: false };
      byUser[e.userId].count += 1;
      byUser[e.userId].totalDays += (e.daysMissed || 2);
      if (!e.resolvedAt) byUser[e.userId].currentlyOpen = true;
    });

    const memberMap = Object.fromEntries(members.map(m => [m.userId, m.user]));
    const repeatOffenders = Object.entries(byUser)
      .map(([uid, s]) => ({
        userId: uid,
        name: memberMap[uid]?.name || 'Member',
        avatar: memberMap[uid]?.avatar || null,
        count: s.count,
        totalDays: s.totalDays,
        currentlyOpen: s.currentlyOpen
      }))
      .sort((a, b) => (b.count - a.count) || (b.totalDays - a.totalDays))
      .slice(0, 5);

    const shamedUserIds = new Set(Object.keys(byUser));
    const cleanRecord = members
      .filter(m => !shamedUserIds.has(m.userId))
      .map(m => ({ userId: m.userId, name: m.user.name, avatar: m.user.avatar || null }));

    const totalSilentDays = Object.values(byUser).reduce((s, x) => s + x.totalDays, 0);

    const stats = {
      openCount: openEvents.length,
      totalEventsThisMonth: monthEvents.length,
      totalSilentDaysThisMonth: totalSilentDays,
      monthCompletions,
      memberCount: members.length,
      cleanCount: cleanRecord.length,
      worstSilence: items.length > 0 ? Math.max(...items.map(i => i.daysMissed)) : 0,
      repeatOffenders,
      cleanRecord: cleanRecord.slice(0, 12),
      recentlyCleared
    };

    res.json({ items, stats });
  } catch (error) { next(error); }
}

async function getCompare(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    // Resolve & validate inputs
    const memberIdsParam = (req.query.members || '').split(',').filter(Boolean);
    const fromKey = req.query.from && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? req.query.from : null;
    const toKey = req.query.to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? req.query.to : null;
    if (!fromKey || !toKey) return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' });

    const [yF, mF, dF] = fromKey.split('-').map(Number);
    const [yT, mT, dT] = toKey.split('-').map(Number);
    const start = new Date(Date.UTC(yF, mF - 1, dF));
    const end = new Date(Date.UTC(yT, mT - 1, dT));
    const endExclusive = new Date(end); endExclusive.setUTCDate(end.getUTCDate() + 1);
    if (start > end) return res.status(400).json({ error: 'from must be <= to' });

    const allMembers = await groupQ.findGroupMembers(req.params.id);
    const memberIds = memberIdsParam.length
      ? allMembers.filter(m => memberIdsParam.includes(m.userId)).map(m => m.userId)
      : allMembers.map(m => m.userId);
    if (memberIds.length < 1) return res.status(400).json({ error: 'No valid members selected' });

    const memberMap = Object.fromEntries(allMembers.map(m => [m.userId, m.user]));

    const [tasks, completions] = await Promise.all([
      prisma.task.findMany({
        where: { userId: { in: memberIds }, groupId: req.params.id, isActive: true }
      }),
      prisma.taskCompletion.findMany({
        where: { userId: { in: memberIds }, task: { groupId: req.params.id }, date: { gte: start, lt: endExclusive } },
        include: { task: { select: { id: true, title: true, color: true, weightage: true, userId: true } } }
      })
    ]);

    // Build a list of date keys for the range (inclusive)
    const dayCount = Math.round((endExclusive - start) / (24 * 60 * 60 * 1000));
    const dateKeys = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
      dateKeys.push({ key: d.toISOString().split('T')[0], date: d });
    }

    // For each member, daily score arrays + per-habit summary
    const result = memberIds.map(uid => {
      const userTasks = tasks.filter(t => t.userId === uid);
      const userCompletions = completions.filter(c => c.userId === uid);
      const days = dateKeys.map(({ key, date }) => {
        const apps = getApplicableTasks(userTasks, date);
        const totalWeight = apps.reduce((s, t) => s + t.weightage, 0);
        const dayComps = userCompletions.filter(c => c.date.toISOString().split('T')[0] === key);
        const completedWeight = dayComps.reduce((s, c) => s + (c.task?.weightage || 0), 0);
        return {
          date: key,
          applicable: apps.length, completed: dayComps.length,
          score: totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
        };
      });

      // Per-habit
      const habitMap = {};
      userTasks.forEach(t => { habitMap[t.id] = { id: t.id, title: t.title, color: t.color, applicable: 0, completed: 0 }; });
      dateKeys.forEach(({ date }) => {
        getApplicableTasks(userTasks, date).forEach(t => { if (habitMap[t.id]) habitMap[t.id].applicable++; });
      });
      userCompletions.forEach(c => { if (habitMap[c.taskId]) habitMap[c.taskId].completed++; });
      const habits = Object.values(habitMap).map(h => ({
        ...h,
        rate: h.applicable > 0 ? Math.round((h.completed / h.applicable) * 100) : 0
      }));

      // Total stats
      const scoredDays = days.filter(d => d.applicable > 0);
      const avg = scoredDays.length ? Math.round(scoredDays.reduce((s, d) => s + d.score, 0) / scoredDays.length) : 0;
      const totalCompletions = userCompletions.length;
      const bestDay = scoredDays.slice().sort((a, b) => b.score - a.score)[0] || null;

      return {
        userId: uid,
        name: memberMap[uid]?.name || 'Member',
        avatar: memberMap[uid]?.avatar || null,
        days,
        habits,
        avg,
        totalCompletions,
        bestDay: bestDay ? { date: bestDay.date, score: bestDay.score } : null
      };
    });

    res.json({ from: fromKey, to: toKey, members: result });
  } catch (error) { next(error); }
}

module.exports = { listGroups, createGroup, getGroup, joinGroup, inviteToGroup, cancelInvite, getMemberTasks, getLeaderboard, removeMember, leaveGroup, updateGroup, updateMemberRole, getAnalytics, getActivityFeed, getShameWall, getCompare };
