import { prisma } from "@/lib/prisma";
import { getPerformanceSnapshot } from "../performance/performance-queries";
import { getEmpireScoreV2Summary } from "../empire/score-v2-dashboard";
import { getAgentProfileDefinition } from "../workstations/agent-profiles";
import { getScoutProfileDefinition } from "../workstations/scout-profiles";
import {
  buildAchievements,
  countUnlockedAchievements,
  getRecentAchievement,
  type AchievementSnapshot,
} from "./achievements";
import { getAvatarDefinition } from "./avatar-registry";
import {
  buildDepartmentLevels,
  type DepartmentLevelSnapshot,
} from "./department-levels";
import {
  buildEmpireLevelSnapshot,
  type EmpireLevelSnapshot,
} from "./empire-levels";
import { buildLeaderboards, type LeaderboardSnapshot } from "./leaderboards";
import { buildUnlocks, getNextUnlock, type UnlockSnapshot } from "./unlocks";

export type GamificationSnapshot = {
  generatedAt: string;
  empire: EmpireLevelSnapshot;
  departments: DepartmentLevelSnapshot[];
  achievements: AchievementSnapshot[];
  unlockedAchievementCount: number;
  recentAchievement: AchievementSnapshot | null;
  unlocks: UnlockSnapshot[];
  nextUnlock: UnlockSnapshot | null;
  leaderboards: LeaderboardSnapshot;
};

/** Read-only gamification snapshot — no mutations or pipeline changes. */
export async function getGamificationSnapshot(): Promise<GamificationSnapshot> {
  const [performance, empireSummary, missionAgg, storeCount, revenueAgg, missions] =
    await Promise.all([
      getPerformanceSnapshot(),
      getEmpireScoreV2Summary(),
      prisma.mission.count(),
      prisma.store.count(),
      prisma.revenue.aggregate({ _sum: { amount: true } }),
      prisma.mission.findMany({
        select: {
          revenueStream: true,
          department: { select: { key: true } },
          store: { select: { revenue: true } },
          ventureType: { select: { key: true } },
        },
      }),
    ]);

  const totalRevenue = revenueAgg._sum.amount ?? 0;
  const totalAgentXp = performance.agents.reduce((sum, a) => sum + a.xp, 0);
  const totalScoutXp = performance.scouts.reduce((sum, s) => sum + s.xp, 0);
  const topScoutLevel = Math.max(0, ...performance.scouts.map((s) => s.level));

  const empire = buildEmpireLevelSnapshot({
    totalRevenue,
    missionCount: missionAgg,
    totalAgentXp,
    totalScoutXp,
    empireScore: empireSummary.empireScoreV2,
  });

  const departmentXp = new Map<string, number>();
  for (const agent of performance.agents) {
    departmentXp.set(
      agent.department,
      (departmentXp.get(agent.department) ?? 0) + agent.xp
    );
  }

  const departmentRevenue = new Map<string, number>();
  const departmentMissions = new Map<string, number>();
  for (const mission of missions) {
    const departmentKey = mission.department.key;
    departmentMissions.set(
      departmentKey,
      (departmentMissions.get(departmentKey) ?? 0) + 1
    );
    const missionRevenue = mission.store?.revenue ?? 0;
    departmentRevenue.set(
      departmentKey,
      (departmentRevenue.get(departmentKey) ?? 0) + missionRevenue
    );
  }

  const departments = buildDepartmentLevels({
    atlas: {
      departmentXp: departmentXp.get("ceo_office") ?? 0,
      revenue: departmentRevenue.get("ceo_office") ?? 0,
      missionCount: departmentMissions.get("ceo_office") ?? 0,
    },
    athena: {
      departmentXp: departmentXp.get("research_lab") ?? 0,
      revenue: departmentRevenue.get("research_lab") ?? 0,
      missionCount: departmentMissions.get("research_lab") ?? 0,
    },
    forge: {
      departmentXp: departmentXp.get("builder_workshop") ?? 0,
      revenue: departmentRevenue.get("builder_workshop") ?? 0,
      missionCount: departmentMissions.get("builder_workshop") ?? 0,
    },
    nova: {
      departmentXp: departmentXp.get("growth") ?? 0,
      revenue: departmentRevenue.get("growth") ?? 0,
      missionCount: departmentMissions.get("growth") ?? 0,
    },
    mercury: {
      departmentXp: departmentXp.get("finance") ?? 0,
      revenue: departmentRevenue.get("finance") ?? 0,
      missionCount: departmentMissions.get("finance") ?? 0,
    },
  });

  const departmentLevelMap = Object.fromEntries(
    departments.map((d) => [d.key, d.level])
  ) as Record<string, number>;

  const ventureTypes = new Set(
    missions
      .map((m) => m.ventureType?.key ?? m.revenueStream)
      .filter(Boolean) as string[]
  );

  const achievements = buildAchievements({
    missionCount: missionAgg,
    totalRevenue,
    storeCount,
    empireLevel: empire.empireLevel,
    ventureTypes,
    topScoutLevel,
    departmentLevels: departmentLevelMap,
  });

  const unlocks = buildUnlocks(empire.empireLevel);
  const nextUnlock = getNextUnlock(empire.empireLevel);

  const ventureMap = new Map<string, { missionCount: number; revenue: number }>();
  for (const mission of missions) {
    const ventureTypeKey = mission.ventureType?.key ?? mission.revenueStream;
    if (!ventureTypeKey) continue;
    const current = ventureMap.get(ventureTypeKey) ?? {
      missionCount: 0,
      revenue: 0,
    };
    current.missionCount++;
    current.revenue += mission.store?.revenue ?? 0;
    ventureMap.set(ventureTypeKey, current);
  }

  const leaderboards = buildLeaderboards({
    agents: performance.agents.map((a) => ({
      agentKey: a.agentKey,
      department: a.department,
      xp: a.xp,
      level: a.level,
      score: a.score,
      revenueInfluenced: a.revenueInfluenced,
    })),
    scouts: performance.scouts.map((s) => ({
      scoutKey: s.scoutKey,
      xp: s.xp,
      level: s.level,
      score: s.score,
      revenueGenerated: s.revenueGenerated,
    })),
    departments: departments.map((d) => ({
      key: d.key,
      name: d.name,
      xp: d.xp,
      level: d.level,
      score: d.level * 100 + d.missionCount * 10,
      revenue: d.revenue,
    })),
    ventures: [...ventureMap.entries()].map(([ventureTypeKey, stats]) => ({
      ventureTypeKey,
      ...stats,
    })),
  });

  return {
    generatedAt: new Date().toISOString(),
    empire,
    departments,
    achievements,
    unlockedAchievementCount: countUnlockedAchievements(achievements),
    recentAchievement: getRecentAchievement(achievements),
    unlocks,
    nextUnlock,
    leaderboards,
  };
}

export function resolveAgentDisplayName(agentKey: string): string {
  return getAgentProfileDefinition(agentKey)?.name ?? agentKey;
}

export function resolveScoutDisplayName(scoutKey: string): string {
  return getScoutProfileDefinition(scoutKey)?.name ?? scoutKey;
}

export function getAgentAvatarMeta(agentKey: string, department: string) {
  const avatar = getAvatarDefinition(agentKey, department);
  return {
    avatarKey: avatar.key,
    sprite: avatar.sprite,
  };
}

export type { AchievementSnapshot, DepartmentLevelSnapshot, EmpireLevelSnapshot, LeaderboardSnapshot, UnlockSnapshot };
