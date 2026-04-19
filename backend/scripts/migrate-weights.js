// One-time migration: redistribute existing task weights to sum to 100 per group per user
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  const users = await prisma.user.findMany({ select: { id: true, name: true } });

  for (const user of users) {
    const tasks = await prisma.task.findMany({
      where: { userId: user.id, isActive: true },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { weightage: 'desc' }
    });

    if (tasks.length === 0) continue;

    // Group tasks by groupId (null = personal)
    const buckets = {};
    for (const t of tasks) {
      const key = t.groupId || 'personal';
      if (!buckets[key]) buckets[key] = { label: t.group?.name || 'Personal', tasks: [] };
      buckets[key].tasks.push(t);
    }

    for (const [key, bucket] of Object.entries(buckets)) {
      const currentSum = bucket.tasks.reduce((s, t) => s + t.weightage, 0);
      if (currentSum === 100) {
        console.log(`  ${user.name} / ${bucket.label}: already at 100, skipping`);
        continue;
      }

      // Scale proportionally to sum to 100
      let newWeights = bucket.tasks.map(t => Math.max(1, Math.round((t.weightage / currentSum) * 100)));
      let newSum = newWeights.reduce((s, w) => s + w, 0);

      // Adjust rounding error on the largest task
      if (newSum !== 100) {
        newWeights[0] += (100 - newSum);
      }

      console.log(`  ${user.name} / ${bucket.label}: ${currentSum} -> 100 (${bucket.tasks.length} tasks)`);

      for (let i = 0; i < bucket.tasks.length; i++) {
        await prisma.task.update({
          where: { id: bucket.tasks[i].id },
          data: { weightage: newWeights[i] }
        });
        console.log(`    ${bucket.tasks[i].title}: ${bucket.tasks[i].weightage} -> ${newWeights[i]}`);
      }
    }
  }

  console.log('Done!');
  await prisma.$disconnect();
}

migrate().catch(e => { console.error(e); process.exit(1); });
