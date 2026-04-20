const prisma = require('../database/prisma');
const { getApplicableTasks, computeDayScore } = require('../utils/helpers');
const taskQ = require('../queries/tasks.queries');
const statsQ = require('../queries/stats.queries');

// Parse a YYYY-MM-DD key from query as UTC midnight, else fallback to UTC today
function parseToday(dateKey) {
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function getDaily(req, res, next) {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const tasks = await taskQ.findActiveTasksByUser(req.user.id);
    const completions = await statsQ.findCompletionsByUserAndDateRange(req.user.id, targetDate, nextDay);

    const applicableTasks = getApplicableTasks(tasks, targetDate);
    const completedTaskIds = new Set(completions.map(c => c.taskId));
    const score = computeDayScore(applicableTasks, completedTaskIds);
    const totalWeight = applicableTasks.reduce((sum, t) => sum + t.weightage, 0);

    res.json({ date: targetDate.toISOString().split('T')[0], totalTasks: applicableTasks.length, completedTasks: completions.length, score, totalWeight });
  } catch (error) {
    next(error);
  }
}

async function getStreak(req, res, next) {
  try {
    const tasks = await taskQ.findActiveTasksByUser(req.user.id);
    const today = parseToday(req.query.date);
    const startDate = new Date(); startDate.setDate(startDate.getDate() - 90);

    const completions = await statsQ.findCompletionsByDateRange(req.user.id, startDate, new Date());
    const completionsByDate = {};
    completions.forEach(c => {
      const dk = c.date.toISOString().split('T')[0];
      if (!completionsByDate[dk]) completionsByDate[dk] = new Set();
      completionsByDate[dk].add(c.taskId);
    });

    let currentStreak = 0, longestStreak = 0, tempStreak = 0;
    for (let i = 0; i <= 90; i++) {
      const checkDate = new Date(today); checkDate.setDate(checkDate.getDate() - i);
      const dk = checkDate.toISOString().split('T')[0];
      const applicable = getApplicableTasks(tasks, checkDate);
      const completed = completionsByDate[dk] || new Set();
      const allDone = applicable.length > 0 && applicable.every(t => completed.has(t.id));

      if (allDone) {
        tempStreak++;
        if (i === 0 || currentStreak > 0) currentStreak = tempStreak;
      } else if (i > 0) {
        tempStreak = 0;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekCompletions = completions.filter(c => new Date(c.date) >= weekStart).length;

    res.json({ currentStreak, longestStreak, weekCompletions, totalCompletions: completions.length });
  } catch (error) {
    next(error);
  }
}

async function getOverview(req, res, next) {
  try {
    const today = parseToday(req.query.date);
    const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id, isActive: true },
      include: { completions: { where: { date: { gte: today, lt: tomorrow } } }, group: { select: { id: true, name: true, color: true } } }
    });

    const applicableTasks = getApplicableTasks(tasks, today);
    const completedTaskIds = new Set(tasks.flatMap(t => t.completions.map(c => c.taskId)));
    const score = computeDayScore(applicableTasks, completedTaskIds);
    const totalWeight = applicableTasks.reduce((sum, t) => sum + t.weightage, 0);
    const groupsCount = await statsQ.countUserMemberships(req.user.id);

    res.json({
      today: { date: today.toISOString().split('T')[0], totalTasks: applicableTasks.length, completedTasks: completedTaskIds.size, score, totalWeight },
      groupsCount,
      tasksWithStatus: applicableTasks.map(t => ({ ...t, completedToday: completedTaskIds.has(t.id), completions: undefined }))
    });
  } catch (error) {
    next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const today = parseToday(req.query.date);
    const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const yesterday = new Date(today); yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const tasks = await taskQ.findActiveTasksByUser(req.user.id);

    const personalTasks = tasks.filter(t => !t.groupId);
    const personalUsed = personalTasks.reduce((sum, t) => sum + t.weightage, 0);
    const memberships = await statsQ.findUserMembershipsWithGroup(req.user.id);
    const groupBudgets = memberships.map(m => {
      const gTasks = tasks.filter(t => t.groupId === m.groupId);
      return { groupId: m.groupId, groupName: m.group.name, used: gTasks.reduce((s, t) => s + t.weightage, 0) };
    });

    const recentCompletions = await statsQ.findCompletionsByUserAndDateRange(req.user.id, yesterday, tomorrow);
    const todayCompletions = new Set(recentCompletions.filter(c => c.date >= today).map(c => c.taskId));
    const yesterdayCompletions = new Set(recentCompletions.filter(c => c.date >= yesterday && c.date < today).map(c => c.taskId));

    const todayApplicable = getApplicableTasks(tasks, today);
    const yesterdayApplicable = getApplicableTasks(tasks, yesterday);

    const todayWeight = todayApplicable.reduce((s, t) => s + t.weightage, 0);
    const yesterdayWeight = yesterdayApplicable.reduce((s, t) => s + t.weightage, 0);
    const todayCompleted = computeDayScore(todayApplicable, todayCompletions);
    const yesterdayCompleted = computeDayScore(yesterdayApplicable, yesterdayCompletions);
    const todayScore = todayWeight > 0 ? Math.round((todayCompleted / todayWeight) * 100) : 0;
    const yesterdayScore = yesterdayWeight > 0 ? Math.round((yesterdayCompleted / yesterdayWeight) * 100) : 0;

    // Weekly averages
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay() + 1);
    if (thisWeekStart > today) thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const twoWeeksCompletions = await statsQ.findCompletionsByUserAndDateRange(req.user.id, lastWeekStart, tomorrow);
    const completionsByDate = {};
    twoWeeksCompletions.forEach(c => {
      const dk = c.date.toISOString().split('T')[0];
      if (!completionsByDate[dk]) completionsByDate[dk] = new Set();
      completionsByDate[dk].add(c.taskId);
    });

    let thisWeekTotal = 0, thisWeekDays = 0;
    for (let d = new Date(thisWeekStart); d <= today; d.setDate(d.getDate() + 1)) {
      const dk = d.toISOString().split('T')[0];
      const applicable = getApplicableTasks(tasks, new Date(d));
      const completed = completionsByDate[dk] || new Set();
      const dayWeight = applicable.reduce((s, t) => s + t.weightage, 0);
      const dayCompleted = computeDayScore(applicable, completed);
      thisWeekTotal += dayWeight > 0 ? Math.round((dayCompleted / dayWeight) * 100) : 0;
      thisWeekDays++;
    }

    let lastWeekTotal = 0, lastWeekDays = 0;
    const lastWeekEnd = new Date(thisWeekStart); lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    for (let d = new Date(lastWeekStart); d <= lastWeekEnd; d.setDate(d.getDate() + 1)) {
      const dk = d.toISOString().split('T')[0];
      const applicable = getApplicableTasks(tasks, new Date(d));
      const completed = completionsByDate[dk] || new Set();
      const dayWeight = applicable.reduce((s, t) => s + t.weightage, 0);
      const dayCompleted = computeDayScore(applicable, completed);
      lastWeekTotal += dayWeight > 0 ? Math.round((dayCompleted / dayWeight) * 100) : 0;
      lastWeekDays++;
    }

    const thisWeekAvg = thisWeekDays > 0 ? Math.round(thisWeekTotal / thisWeekDays) : 0;
    const lastWeekAvg = lastWeekDays > 0 ? Math.round(lastWeekTotal / lastWeekDays) : 0;

    // Personal best
    const ninetyDaysAgo = new Date(today); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const allCompletions = await statsQ.findCompletionsByUserAndDateRange(req.user.id, ninetyDaysAgo, tomorrow);
    const allByDate = {};
    allCompletions.forEach(c => { const dk = c.date.toISOString().split('T')[0]; if (!allByDate[dk]) allByDate[dk] = new Set(); allByDate[dk].add(c.taskId); });

    let personalBest = 0;
    for (const [dk, completedSet] of Object.entries(allByDate)) {
      const d = new Date(dk + 'T12:00:00');
      const applicable = getApplicableTasks(tasks, d);
      const dayWeight = applicable.reduce((s, t) => s + t.weightage, 0);
      const dayCompleted = computeDayScore(applicable, completedSet);
      personalBest = Math.max(personalBest, dayWeight > 0 ? Math.round((dayCompleted / dayWeight) * 100) : 0);
    }

    // Streak
    let currentStreak = 0, longestStreak = 0, tempStreak = 0;
    for (let i = 0; i <= 90; i++) {
      const checkDate = new Date(today); checkDate.setDate(checkDate.getDate() - i);
      const dk = checkDate.toISOString().split('T')[0];
      const applicable = getApplicableTasks(tasks, checkDate);
      const completed = allByDate[dk] || new Set();
      const allDone = applicable.length > 0 && applicable.every(t => completed.has(t.id));
      if (allDone) { tempStreak++; if (i === 0 || currentStreak > 0) currentStreak = tempStreak; }
      else if (i > 0) { tempStreak = 0; }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    res.json({
      today: { score: todayScore, totalWeight: todayApplicable.reduce((s, t) => s + t.weightage, 0), completedTasks: todayCompletions.size, totalTasks: todayApplicable.length },
      yesterday: { score: yesterdayScore }, delta: todayScore - yesterdayScore,
      thisWeek: { avgScore: thisWeekAvg }, lastWeek: { avgScore: lastWeekAvg }, weekDelta: thisWeekAvg - lastWeekAvg,
      streak: { current: currentStreak, longest: longestStreak }, personalBest,
      budget: { personal: { used: personalUsed, remaining: 100 - personalUsed }, groups: groupBudgets }
    });
  } catch (error) { next(error); }
}

async function getRankings(req, res, next) {
  try {
    const today = parseToday(req.query.date);
    const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const myMemberships = await statsQ.findUserMembershipsWithGroup(req.user.id);
    if (myMemberships.length === 0) return res.json({ groups: [] });

    const groupIds = myMemberships.map(m => m.groupId);
    const memberships2 = await prisma.groupMembership.findMany({ where: { groupId: { in: groupIds } }, include: { user: { select: { id: true, name: true } } } });
    const allUserIds = Array.from(new Set(memberships2.map(m => m.userId)));

    const [tasksList, completionsList] = await Promise.all([
      prisma.task.findMany({ where: { groupId: { in: groupIds }, userId: { in: allUserIds }, isActive: true } }),
      prisma.taskCompletion.findMany({ where: { userId: { in: allUserIds }, date: { gte: today, lt: tomorrow } } })
    ]);

    // Index by (userId, groupId)
    const tasksByUserGroup = {};
    tasksList.forEach(t => {
      const key = `${t.userId}_${t.groupId}`;
      if (!tasksByUserGroup[key]) tasksByUserGroup[key] = [];
      tasksByUserGroup[key].push(t);
    });
    const completionsByUser = {};
    completionsList.forEach(c => {
      if (!completionsByUser[c.userId]) completionsByUser[c.userId] = new Set();
      completionsByUser[c.userId].add(c.taskId);
    });

    const groups = myMemberships.map(mem => {
      const members = memberships2.filter(m => m.groupId === mem.groupId);
      const memberScores = members.map(m => {
        const tasks = tasksByUserGroup[`${m.userId}_${mem.groupId}`] || [];
        const completedIds = completionsByUser[m.userId] || new Set();
        const applicable = getApplicableTasks(tasks, today);
        const weight = applicable.reduce((s, t) => s + t.weightage, 0);
        const completed = computeDayScore(applicable, completedIds);
        return { userId: m.userId, user: m.user, score: weight > 0 ? Math.round((completed / weight) * 100) : 0 };
      });
      memberScores.sort((a, b) => b.score - a.score);
      const myIndex = memberScores.findIndex(m => m.userId === req.user.id);
      const top = memberScores[0];
      return { groupId: mem.groupId, groupName: mem.group.name, groupColor: mem.group.color, myRank: myIndex + 1, totalMembers: memberScores.length, myScore: memberScores[myIndex]?.score || 0, topScore: top?.score || 0, topUser: top?.userId !== req.user.id ? { name: top?.user?.name } : null };
    });

    res.json({ groups });
  } catch (error) { next(error); }
}

module.exports = { getDaily, getStreak, getOverview, getDashboard, getRankings };
