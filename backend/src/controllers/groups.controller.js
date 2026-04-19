const { z } = require('zod');
const prisma = require('../database/prisma');
const { createGroupSchema, inviteSchema } = require('../utils/validation');
const { sendGroupInviteEmail } = require('../utils/mailer');
const { getApplicableTasks, computeDayScore, getTodayRange } = require('../utils/helpers');
const groupQ = require('../queries/groups.queries');
const taskQ = require('../queries/tasks.queries');

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
    res.json({ group, message: 'Successfully joined group' });
  } catch (error) { next(error); }
}

async function inviteToGroup(req, res, next) {
  try {
    const data = inviteSchema.parse(req.body);
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    if (data.userId) {
      const targetUser = await groupQ.findUserById(data.userId);
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      const existingMembership = await groupQ.findMembership(data.userId, req.params.id);
      if (existingMembership) return res.status(400).json({ error: 'User is already a member' });
      await groupQ.createMembership(data.userId, req.params.id);
      return res.json({ success: true, message: 'User added to group' });
    }

    if (data.email) {
      const existingUser = await groupQ.findUserByEmail(data.email);
      if (existingUser) {
        const existingMembership = await groupQ.findMembership(existingUser.id, req.params.id);
        if (existingMembership) return res.status(400).json({ error: 'User is already a member' });
        await groupQ.createMembership(existingUser.id, req.params.id);
        return res.json({ success: true, message: 'User added to group' });
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
    const { today, tomorrow } = getTodayRange();
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
        requiresProof: t.requiresProof, groupId: t.groupId, group: t.group,
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

async function getLeaderboard(req, res, next) {
  try {
    const { period = 'week' } = req.query;
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    const members = await groupQ.findGroupMembers(req.params.id);
    const endDate = new Date();
    const startDate = new Date();
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
        if (memberCount > 1) return res.status(400).json({ error: 'Cannot leave as the only admin. Transfer ownership first.' });
        await groupQ.deleteGroup(req.params.id);
        return res.json({ success: true, groupDeleted: true });
      }
    }
    await groupQ.deleteMembershipById(membership.id);
    res.json({ success: true });
  } catch (error) { next(error); }
}

async function updateGroup(req, res, next) {
  try {
    const membership = await groupQ.findMembership(req.user.id, req.params.id);
    if (!membership || membership.role !== 'ADMIN') return res.status(403).json({ error: 'Only admins can update group' });
    const data = createGroupSchema.partial().parse(req.body);
    const group = await groupQ.updateGroup(req.params.id, data);
    res.json({ group });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    next(error);
  }
}

module.exports = { listGroups, createGroup, getGroup, joinGroup, inviteToGroup, cancelInvite, getMemberTasks, getLeaderboard, removeMember, leaveGroup, updateGroup };
