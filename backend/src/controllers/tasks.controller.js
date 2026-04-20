const { z } = require('zod');
const { createTaskSchema, updateTaskSchema } = require('../utils/validation');
const { getTodayRange } = require('../utils/helpers');
const taskQ = require('../queries/tasks.queries');
const groupQ = require('../queries/groups.queries');
const prisma = require('../database/prisma');

async function getBudget(req, res, next) {
  try {
    const { groupId } = req.query;
    const gid = (!groupId || groupId === 'personal') ? null : groupId;
    const budget = await taskQ.getWeightageBudget(req.user.id, gid);
    res.json(budget);
  } catch (error) {
    next(error);
  }
}

async function listTasks(req, res, next) {
  try {
    const { active, groupId, date } = req.query;
    const where = {
      userId: req.user.id,
      ...(active !== undefined && { isActive: active === 'true' }),
    };
    if (groupId === 'personal') where.groupId = null;
    else if (groupId) where.groupId = groupId;

    const tasks = await taskQ.findTasks(where, getTodayRange(date));
    const tasksWithStatus = tasks.map(task => ({
      ...task,
      completedToday: task.completions.length > 0,
      proofUrl: task.completions[0]?.proofUrl || null,
      completions: undefined
    }));
    res.json({ tasks: tasksWithStatus });
  } catch (error) {
    next(error);
  }
}

async function getTask(req, res, next) {
  try {
    const task = await taskQ.findTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const data = createTaskSchema.parse(req.body);

    if (data.groupId) {
      const membership = await groupQ.findMembership(req.user.id, data.groupId);
      if (!membership) return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Redistribute mode
    if (data.redistribute) {
      const existing = await taskQ.findActiveTasksByUserAndGroup(req.user.id, data.groupId || null);
      const totalCount = existing.length + 1;
      const base = Math.floor(100 / totalCount);
      const remainder = 100 - (base * totalCount);

      data.weightage = base + (existing.length < remainder ? 1 : 0);
      delete data.redistribute;

      // Batch all updates + create in a single transaction (one network round trip)
      const [, newTask] = await prisma.$transaction([
        ...existing.map((t, i) =>
          prisma.task.update({ where: { id: t.id }, data: { weightage: base + (i < remainder ? 1 : 0) } })
        ),
        prisma.task.create({
          data: { ...data, userId: req.user.id },
          include: { group: { select: { id: true, name: true, color: true } } }
        })
      ]).then(results => [results.slice(0, -1), results[results.length - 1]]);

      return res.status(201).json({ task: newTask });
    }

    // Normal mode with budget check
    const budget = await taskQ.getWeightageBudget(req.user.id, data.groupId || null);
    if (!data.weightage) data.weightage = Math.max(1, Math.min(budget.remaining, 10));
    if (data.weightage > budget.remaining) {
      const label = data.groupId ? 'this group' : 'personal tasks';
      return res.status(400).json({ error: `Weight budget exceeded for ${label}. You have ${budget.remaining} points remaining out of 100.` });
    }

    const task = await taskQ.createTask({ ...data, userId: req.user.id });
    res.status(201).json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const data = updateTaskSchema.parse(req.body);
    const existing = await taskQ.findTaskById(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    if (data.groupId && data.groupId !== existing.groupId) {
      const membership = await groupQ.findMembership(req.user.id, data.groupId);
      if (!membership) return res.status(403).json({ error: 'Not a member of this group' });
    }

    const targetGroupId = data.groupId !== undefined ? data.groupId : existing.groupId;
    const needsBudgetCheck = (data.weightage !== undefined && data.isActive !== false) || (data.isActive === true && !existing.isActive);

    if (needsBudgetCheck) {
      const budget = await taskQ.getWeightageBudget(req.user.id, targetGroupId || null, req.params.id);
      const weight = data.weightage !== undefined ? data.weightage : existing.weightage;
      if (weight > budget.remaining) {
        const label = targetGroupId ? 'this group' : 'personal tasks';
        return res.status(400).json({ error: `Weight budget exceeded for ${label}. You have ${budget.remaining} points remaining out of 100.` });
      }
    }

    const task = await taskQ.updateTask(req.params.id, data);
    res.json({ task });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const existing = await taskQ.findTaskById(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    await taskQ.deleteTask(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// Parse a YYYY-MM-DD string as UTC midnight for stable date-only storage
function parseDateKey(key) {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

async function completeTask(req, res, next) {
  try {
    const { date, notes, proofUrl } = req.body;
    // Expect date as YYYY-MM-DD string from client; if missing, use UTC today
    let targetDate;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetDate = parseDateKey(date);
    } else {
      targetDate = new Date();
      targetDate.setUTCHours(0, 0, 0, 0);
    }

    // Parallel: fetch task + check existing completion
    const [task, existing] = await Promise.all([
      taskQ.findTaskById(req.params.id, req.user.id),
      taskQ.findCompletion(req.params.id, targetDate)
    ]);

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.requiresProof && !proofUrl) {
      return res.status(400).json({ error: 'This task requires photo proof' });
    }
    if (existing) return res.status(400).json({ error: 'Task already completed for this date' });

    // Parallel: create completion + award XP
    const [completion] = await Promise.all([
      taskQ.createCompletion({ taskId: req.params.id, userId: req.user.id, date: targetDate, notes, proofUrl }),
      prisma.user.update({ where: { id: req.user.id }, data: { totalXp: { increment: task.weightage } } })
    ]);

    res.status(201).json({ completion, xpEarned: task.weightage });
  } catch (error) {
    next(error);
  }
}

async function uncompleteTask(req, res, next) {
  try {
    const { date } = req.query;
    let targetDate;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      targetDate = parseDateKey(date);
    } else {
      targetDate = new Date();
      targetDate.setUTCHours(0, 0, 0, 0);
    }

    // Parallel: fetch completion + task
    const [completion, task] = await Promise.all([
      taskQ.findCompletionByUser(req.params.id, req.user.id, targetDate),
      taskQ.findTaskById(req.params.id, req.user.id)
    ]);

    if (!completion) return res.status(404).json({ error: 'Completion not found' });

    // Parallel: delete completion + deduct XP
    await Promise.all([
      taskQ.deleteCompletion(completion.id),
      task ? prisma.user.update({
        where: { id: req.user.id },
        data: { totalXp: { decrement: Math.min(task.weightage, Number.MAX_SAFE_INTEGER) } }
      }).catch(() => {}) : Promise.resolve()
    ]);

    // Floor at 0 (separate update only if needed)
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { totalXp: true } });
    if (user && user.totalXp < 0) {
      await prisma.user.update({ where: { id: req.user.id }, data: { totalXp: 0 } });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { getBudget, listTasks, getTask, createTask, updateTask, deleteTask, completeTask, uncompleteTask };
