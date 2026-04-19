function getApplicableTasks(tasks, date) {
  const dayOfWeek = date.getDay();

  return tasks.filter(task => {
    const createdDate = new Date(task.createdAt);
    createdDate.setHours(0, 0, 0, 0);
    if (createdDate > date) return false;

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

function getTodayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

module.exports = {
  getApplicableTasks,
  computeDayScore,
  computeDayPercent,
  getTodayRange,
};
