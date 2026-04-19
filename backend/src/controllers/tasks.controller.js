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
    const { active, groupId } = req.query;
    const where = {
      userId: req.user.id,
      ...(active !== undefined && { isActive: active === 'true' }),
    };
    if (groupId === 'personal') where.groupId = null;
    else if (groupId) where.groupId = groupId;

    const tasks = await taskQ.findTasks(where, getTodayRange());
    const tasksWithStatus = tasks.map(task => ({
      ...task,
      completedToday: task.completions.length > 0,
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

      for (let i = 0; i < existing.length; i++) {
        await taskQ.updateTask(existing[i].id, { weightage: base + (i < remainder ? 1 : 0) });
      }

      data.weightage = base + (existing.length < remainder ? 1 : 0);
      delete data.redistribute;
      const task = await taskQ.createTask({ ...data, userId: req.user.id });
      return res.status(201).json({ task });
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
    if (data.weightage !== undefined && data.isActive !== false) {
      const budget = await taskQ.getWeightageBudget(req.user.id, targetGroupId || null, req.params.id);
      if (data.weightage > budget.remaining) {
        const label = targetGroupId ? 'this group' : 'personal tasks';
        return res.status(400).json({ error: `Weight budget exceeded for ${label}. You have ${budget.remaining} points remaining out of 100.` });
      }
    }

    if (data.isActive === true && !existing.isActive) {
      const budget = await taskQ.getWeightageBudget(req.user.id, targetGroupId || null, req.params.id);
      const weight = data.weightage || existing.weightage;
      if (weight > budget.remaining) {
        return res.status(400).json({ error: `Cannot reactivate. You have ${budget.remaining} points remaining out of 100, but this task needs ${weight}.` });
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

async function completeTask(req, res, next) {
  try {
    const { date, notes, proofUrl } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const task = await taskQ.findTaskById(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.requiresProof && !proofUrl) {
      return res.status(400).json({ error: 'This task requires photo proof' });
    }

    const existing = await taskQ.findCompletion(req.params.id, targetDate);
    if (existing) return res.status(400).json({ error: 'Task already completed for this date' });

    const completion = await taskQ.createCompletion({ taskId: req.params.id, userId: req.user.id, date: targetDate, notes, proofUrl });

    // Award XP
    await prisma.user.update({
      where: { id: req.user.id },
      data: { totalXp: { increment: task.weightage } }
    });

    res.status(201).json({ completion, xpEarned: task.weightage });
  } catch (error) {
    next(error);
  }
}

async function uncompleteTask(req, res, next) {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const completion = await taskQ.findCompletionByUser(req.params.id, req.user.id, targetDate);
    if (!completion) return res.status(404).json({ error: 'Completion not found' });

    // Get task weight to deduct XP
    const task = await taskQ.findTaskById(req.params.id, req.user.id);
    await taskQ.deleteCompletion(completion.id);

    // Deduct XP (min 0)
    if (task) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { totalXp: true } });
      const newXp = Math.max(0, (user?.totalXp || 0) - task.weightage);
      await prisma.user.update({ where: { id: req.user.id }, data: { totalXp: newXp } });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { getBudget, listTasks, getTask, createTask, updateTask, deleteTask, completeTask, uncompleteTask };
