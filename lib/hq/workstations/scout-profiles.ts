import { SCOUT_REGISTRY } from "../scouts";

export type ScoutProfileDefinition = {
  scoutKey: string;
  name: string;
  ventureTypeKey: string;
  description: string;
};

export const SCOUT_PROFILE_DEFINITIONS: ScoutProfileDefinition[] =
  SCOUT_REGISTRY.map((s) => ({
    scoutKey: s.key,
    name: s.displayName,
    ventureTypeKey: s.ventureTypeKey,
    description: s.description,
  }));

export function getScoutProfileDefinition(
  scoutKey: string
): ScoutProfileDefinition | undefined {
  return SCOUT_PROFILE_DEFINITIONS.find((s) => s.scoutKey === scoutKey);
}

export type ScoutProfile = ScoutProfileDefinition & {
  level: number;
  xp: number;
  score: number;
  opportunitiesFound: number;
  opportunitiesApproved: number;
  missionsCreated: number;
  missionsLaunched: number;
  revenueGenerated: number;
  successRate: number;
  rank: number;
  performanceTrend: "rising" | "stable" | "early";
  lastCalculatedAt: string | null;
};

type ScoutPerformanceRow = {
  scoutKey: string;
  xp: number;
  level: number;
  score: number;
  opportunitiesFound: number;
  opportunitiesApproved: number;
  missionsCreated: number;
  missionsLaunched: number;
  revenueGenerated: number;
  successRate: number;
  lastCalculatedAt: Date;
};

function deriveScoutTrend(
  level: number,
  score: number,
  missionsLaunched: number
): ScoutProfile["performanceTrend"] {
  if (level >= 3 || score >= 50 || missionsLaunched >= 2) return "rising";
  if (level >= 2 || score >= 25 || missionsLaunched >= 1) return "stable";
  return "early";
}

export function buildScoutProfiles(
  performanceRows: ScoutPerformanceRow[]
): ScoutProfile[] {
  const perfByKey = new Map(
    performanceRows.map((r) => [r.scoutKey, r])
  );

  const base = SCOUT_PROFILE_DEFINITIONS.map((def) => {
    const row = perfByKey.get(def.scoutKey);
    if (!row) {
      return {
        ...def,
        level: 1,
        xp: 0,
        score: 0,
        opportunitiesFound: 0,
        opportunitiesApproved: 0,
        missionsCreated: 0,
        missionsLaunched: 0,
        revenueGenerated: 0,
        successRate: 0,
        lastCalculatedAt: null,
      };
    }

    return {
      ...def,
      level: row.level,
      xp: row.xp,
      score: row.score,
      opportunitiesFound: row.opportunitiesFound,
      opportunitiesApproved: row.opportunitiesApproved,
      missionsCreated: row.missionsCreated,
      missionsLaunched: row.missionsLaunched,
      revenueGenerated: row.revenueGenerated,
      successRate: row.successRate,
      lastCalculatedAt: row.lastCalculatedAt.toISOString(),
    };
  });

  const ranked = [...base].sort(
    (a, b) => b.score - a.score || b.xp - a.xp
  );
  const rankByKey = new Map(
    ranked.map((s, index) => [s.scoutKey, index + 1])
  );

  return base.map((profile) => ({
    ...profile,
    rank: rankByKey.get(profile.scoutKey) ?? ranked.length,
    performanceTrend: deriveScoutTrend(
      profile.level,
      profile.score,
      profile.missionsLaunched
    ),
  }));
}

export function buildScoutAggregate(profiles: ScoutProfile[]): {
  level: number;
  xp: number;
  score: number;
  revenueGenerated: number;
  missionsCreated: number;
  missionsLaunched: number;
  lastCalculatedAt: string | null;
} {
  if (profiles.length === 0) {
    return {
      level: 1,
      xp: 0,
      score: 0,
      revenueGenerated: 0,
      missionsCreated: 0,
      missionsLaunched: 0,
      lastCalculatedAt: null,
    };
  }

  const latest = profiles
    .filter((p) => p.lastCalculatedAt)
    .sort(
      (a, b) =>
        new Date(b.lastCalculatedAt!).getTime() -
        new Date(a.lastCalculatedAt!).getTime()
    )[0];

  return {
    level: Math.round(
      profiles.reduce((s, p) => s + p.level, 0) / profiles.length
    ),
    xp: profiles.reduce((s, p) => s + p.xp, 0),
    score:
      Math.round(
        (profiles.reduce((s, p) => s + p.score, 0) / profiles.length) * 10
      ) / 10,
    revenueGenerated: profiles.reduce((s, p) => s + p.revenueGenerated, 0),
    missionsCreated: profiles.reduce((s, p) => s + p.missionsCreated, 0),
    missionsLaunched: profiles.reduce((s, p) => s + p.missionsLaunched, 0),
    lastCalculatedAt: latest?.lastCalculatedAt ?? null,
  };
}

export type { ScoutPerformanceRow };
