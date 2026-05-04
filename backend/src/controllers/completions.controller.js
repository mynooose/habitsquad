const compQ = require('../queries/completions.queries');
const prisma = require('../database/prisma');
const { getApplicableTasks, computeDayScore } = require('../utils/helpers');

async function listCompletions(req, res, next) {
  try {
    const { date, startDate, endDate } = req.query;
    let dateFilter = {};

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      dateFilter = { date: { gte: targetDate, lt: nextDay } };
    } else if (startDate && endDate) {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      dateFilter = { date: { gte: start, lte: end } };
    } else {
      const end = new Date();
      const start = new Date(); start.setDate(start.getDate() - 30);
      dateFilter = { date: { gte: start, lte: end } };
    }

    const completions = await compQ.findCompletions(req.user.id, dateFilter);
    res.json({ completions });
  } catch (error) {
    next(error);
  }
}

async function getCalendar(req, res, next) {
  try {
    const { year, month } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const completions = await compQ.findCompletionsForCalendar(req.user.id, startDate, endDate);
    const tasks = await compQ.findActiveTasksForCalendar(req.user.id);

    const completionsByDate = {};
    completions.forEach(c => {
      const dateKey = c.date.toISOString().split('T')[0];
      if (!completionsByDate[dateKey]) completionsByDate[dateKey] = [];
      completionsByDate[dateKey].push(c);
    });

    const calendarData = {};
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dateKey = date.toISOString().split('T')[0];

      const applicableTasks = tasks.filter(task => {
        const createdDate = new Date(task.createdAt);
        createdDate.setHours(0, 0, 0, 0);
        if (createdDate > date) return false;
        const dayOfWeek = date.getDay();
        switch (task.frequency) {
          case 'DAILY': return true;
          case 'WEEKDAYS': return dayOfWeek >= 1 && dayOfWeek <= 5;
          case 'WEEKENDS': return dayOfWeek === 0 || dayOfWeek === 6;
          case 'WEEKLY': return dayOfWeek === 1;
          default: return true;
        }
      });

      const dayCompletions = completionsByDate[dateKey] || [];
      const totalWeight = applicableTasks.reduce((sum, t) => sum + t.weightage, 0);
      const completedWeight = dayCompletions.reduce((sum, c) => sum + (c.task?.weightage || 0), 0);
      const completionByTaskId = Object.fromEntries(dayCompletions.map(c => [c.taskId, c]));

      calendarData[dateKey] = {
        date: dateKey,
        completions: dayCompletions.length,
        totalTasks: applicableTasks.length,
        score: totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0,
        tasks: applicableTasks.map(t => {
          const c = completionByTaskId[t.id];
          return {
            id: t.id, title: t.title, color: t.color, weightage: t.weightage, frequency: t.frequency,
            requiresProof: t.requiresProof, deadlineTime: t.deadlineTime,
            groupId: t.groupId, groupName: t.group?.name || null, groupColor: t.group?.color || null,
            completed: !!c,
            completionId: c?.id || null,
            remark: c?.notes || null
          };
        })
      };
    }

    res.json({ calendar: calendarData, month: targetMonth, year: targetYear });
  } catch (error) {
    next(error);
  }
}

async function updateRemark(req, res, next) {
  try {
    const { id } = req.params;
    const { remark } = req.body || {};
    const trimmed = (remark ?? '').toString().slice(0, 500);

    const completion = await prisma.taskCompletion.findUnique({ where: { id }, select: { userId: true } });
    if (!completion) return res.status(404).json({ error: 'Completion not found' });
    if (completion.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.taskCompletion.update({
      where: { id },
      data: { notes: trimmed.trim() ? trimmed : null }
    });
    res.json({ completion: updated });
  } catch (error) {
    next(error);
  }
}

module.exports = { listCompletions, getCalendar, updateRemark };
