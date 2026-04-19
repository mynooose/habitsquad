const prisma = require('../database/prisma');

async function getWeightageBudget(userId, groupId = null, excludeTaskId = null) {
  const where = { userId, isActive: true, groupId: groupId || null };
  if (excludeTaskId) where.id = { not: excludeTaskId };
  const tasks = await prisma.task.findMany({ where, select: { id: true, title: true, weightage: true } });
  const used = tasks.reduce((sum, t) => sum + t.weightage, 0);
  return { used, remaining: 100 - used, total: 100, tasks, groupId: groupId || 'personal' };
}

async function findTasks(where, todayRange) {
  return prisma.task.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    include: {
      group: { select: { id: true, name: true, color: true } },
      completions: {
        where: { date: { gte: todayRange.today, lt: todayRange.tomorrow } }
      }
    }
  });
}

async function findTaskById(id, userId) {
  return prisma.task.findFirst({
    where: { id, userId },
    include: { group: { select: { id: true, name: true, color: true } } }
  });
}

async function createTask(data) {
  return prisma.task.create({
    data,
    include: { group: { select: { id: true, name: true, color: true } } }
  });
}

async function updateTask(id, data) {
  return prisma.task.update({
    where: { id },
    data,
    include: { group: { select: { id: true, name: true, color: true } } }
  });
}

async function deleteTask(id) {
  return prisma.task.delete({ where: { id } });
}

async function findActiveTasksByUser(userId) {
  return prisma.task.findMany({ where: { userId, isActive: true } });
}

async function findActiveTasksByUserAndGroup(userId, groupId) {
  return prisma.task.findMany({ where: { userId, groupId, isActive: true } });
}

async function createCompletion({ taskId, userId, date, notes }) {
  return prisma.taskCompletion.create({ data: { taskId, userId, date, notes } });
}

async function findCompletion(taskId, date) {
  return prisma.taskCompletion.findUnique({ where: { taskId_date: { taskId, date } } });
}

async function findCompletionByUser(taskId, userId, date) {
  return prisma.taskCompletion.findFirst({ where: { taskId, userId, date } });
}

async function deleteCompletion(id) {
  return prisma.taskCompletion.delete({ where: { id } });
}

module.exports = {
  getWeightageBudget,
  findTasks,
  findTaskById,
  createTask,
  updateTask,
  deleteTask,
  findActiveTasksByUser,
  findActiveTasksByUserAndGroup,
  createCompletion,
  findCompletion,
  findCompletionByUser,
  deleteCompletion,
};
