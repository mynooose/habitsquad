function getApplicableTasks(tasks, date) {
  const dayOfWeek = date.getUTCDay();
  const dateUtcMidnight = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  return tasks.filter(task => {
    const c = new Date(task.createdAt);
    const createdUtcMidnight = new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()));
    if (createdUtcMidnight > dateUtcMidnight) return false;

    switch (task.frequency) {
      case 'DAILY': return true;
      case 'WEEKDAYS': return dayOfWeek >= 1 && dayOfWeek <= 5;
      case 'WEEKENDS': return dayOfWeek === 0 || dayOfWeek === 6;
      case 'WEEKLY': return dayOfWeek === 1;
      case 'ONCE': return true;
      default: return true;
    }
  });
}

function computeDayScore(applicableTasks, completedTaskIds) {
  return applicableTasks
    .filter(t => completedTaskIds.has(t.id))
    .reduce((sum, t) => sum + t.weightage, 0);
}

function computeDayPercent(applicableTasks, completedTaskIds) {
  const totalWeight = applicableTasks.reduce((s, t) => s + t.weightage, 0);
  const completed = computeDayScore(applicableTasks, completedTaskIds);
  return totalWeight > 0 ? Math.round((completed / totalWeight) * 100) : 0;
}

function getTodayRange(dateKey) {
  // If dateKey provided (YYYY-MM-DD), use that; else UTC today
  let today;
  if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const [y, m, d] = dateKey.split('-').map(Number);
    today = new Date(Date.UTC(y, m - 1, d));
  } else {
    today = new Date();
    today.setUTCHours(0, 0, 0, 0);
  }
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { today, tomorrow };
}

const LEVELS = [
  { level: 1, xp: 0, name: 'Beginner' },
  { level: 2, xp: 100, name: 'Starter' },
  { level: 3, xp: 300, name: 'Committed' },
  { level: 4, xp: 600, name: 'Dedicated' },
  { level: 5, xp: 1000, name: 'Warrior' },
  { level: 6, xp: 1500, name: 'Champion' },
  { level: 7, xp: 2100, name: 'Legend' },
  { level: 8, xp: 2800, name: 'Master' },
  { level: 9, xp: 3600, name: 'Grandmaster' },
  { level: 10, xp: 4500, name: 'Elite' },
];

function getLevel(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) current = l;
    else break;
  }
  const nextLevel = LEVELS.find(l => l.level === current.level + 1);
  return {
    level: current.level,
    name: current.name,
    currentXp: xp,
    levelXp: current.xp,
    nextLevelXp: nextLevel ? nextLevel.xp : null,
    progress: nextLevel ? Math.round(((xp - current.xp) / (nextLevel.xp - current.xp)) * 100) : 100,
  };
}

module.exports = {
  getApplicableTasks,
  computeDayScore,
  computeDayPercent,
  getTodayRange,
  LEVELS,
  getLevel,
};
