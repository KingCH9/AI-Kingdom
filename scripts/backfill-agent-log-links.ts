/**
 * Backfill AgentLog FK links from historical action strings.
 *
 * DO NOT run automatically — review output with --dry-run first.
 *
 * Usage:
 *   npx tsx scripts/backfill-agent-log-links.ts --dry-run
 *   npx tsx scripts/backfill-agent-log-links.ts
 *
 * What it does:
 * - Sets opportunityId on logs where action contains "#<id>" and the opportunity exists
 * - Sets taskId when action references "task #<id>" or "task: <title>" (title match only)
 * - Sets storeId when action contains "store #<id>" and the store exists
 * - Skips rows that already have the target FK populated
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const OPPORTUNITY_ID_PATTERN = /#(\d+)/g;
const STORE_ID_PATTERN = /store #(\d+)/i;
const TASK_ID_PATTERN = /task #(\d+)/i;

type BackfillStats = {
  scanned: number;
  opportunityLinked: number;
  taskLinked: number;
  storeLinked: number;
  skipped: number;
};

async function backfillAgentLogLinks(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    scanned: 0,
    opportunityLinked: 0,
    taskLinked: 0,
    storeLinked: 0,
    skipped: 0,
  };

  const logs = await prisma.agentLog.findMany({
    where: {
      OR: [
        { opportunityId: null },
        { taskId: null },
        { storeId: null },
      ],
    },
    orderBy: { id: "asc" },
  });

  for (const log of logs) {
    stats.scanned += 1;

    const updates: {
      opportunityId?: number;
      taskId?: number;
      storeId?: number;
    } = {};

    if (log.opportunityId === null) {
      const matches = [...log.action.matchAll(OPPORTUNITY_ID_PATTERN)];
      for (const match of matches) {
        const candidateId = Number(match[1]);
        if (!Number.isFinite(candidateId)) {
          continue;
        }

        const exists = await prisma.opportunity.findUnique({
          where: { id: candidateId },
          select: { id: true },
        });

        if (exists) {
          updates.opportunityId = candidateId;
          break;
        }
      }
    }

    if (log.taskId === null) {
      const taskMatch = log.action.match(TASK_ID_PATTERN);
      if (taskMatch) {
        const candidateId = Number(taskMatch[1]);
        if (Number.isFinite(candidateId)) {
          const exists = await prisma.task.findUnique({
            where: { id: candidateId },
            select: { id: true },
          });
          if (exists) {
            updates.taskId = candidateId;
          }
        }
      }
    }

    if (log.storeId === null) {
      const storeMatch = log.action.match(STORE_ID_PATTERN);
      if (storeMatch) {
        const candidateId = Number(storeMatch[1]);
        if (Number.isFinite(candidateId)) {
          const exists = await prisma.store.findUnique({
            where: { id: candidateId },
            select: { id: true },
          });
          if (exists) {
            updates.storeId = candidateId;
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      stats.skipped += 1;
      continue;
    }

    if (updates.opportunityId !== undefined) {
      stats.opportunityLinked += 1;
    }
    if (updates.taskId !== undefined) {
      stats.taskLinked += 1;
    }
    if (updates.storeId !== undefined) {
      stats.storeLinked += 1;
    }

    if (dryRun) {
      console.log(
        `[dry-run] AgentLog #${log.id}: ${JSON.stringify(updates)} — ${log.action.slice(0, 80)}`
      );
    } else {
      await prisma.agentLog.update({
        where: { id: log.id },
        data: updates,
      });
    }
  }

  return stats;
}

async function main() {
  console.log(
    dryRun
      ? "🔍 Dry run — no database writes"
      : "⚙️  Backfilling AgentLog FK links"
  );

  const stats = await backfillAgentLogLinks();

  console.log("\nResults:");
  console.log(`  Scanned:              ${stats.scanned}`);
  console.log(`  Opportunity linked:   ${stats.opportunityLinked}`);
  console.log(`  Task linked:          ${stats.taskLinked}`);
  console.log(`  Store linked:         ${stats.storeLinked}`);
  console.log(`  Skipped (no match):   ${stats.skipped}`);

  if (dryRun) {
    console.log("\nRe-run without --dry-run to apply changes.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
