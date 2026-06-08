import { DEPARTMENT_KEYS, HQ_PERSONAS } from "../constants";
import { HQ_PERSONA_REGISTRY } from "../agent-registry";
import { FORGE_BUILDER_AGENTS } from "../forge/build-engine";
import { NOVA_GROWTH_AGENTS } from "../nova/growth-engine";
import { MERCURY_AGENTS } from "../mercury/profitability-engine";

export type AgentTeam = "executive" | "builder" | "growth" | "finance";

export type AgentProfileDefinition = {
  agentKey: string;
  name: string;
  department: string;
  departmentName: string;
  team: AgentTeam;
  persona: string | null;
  title: string;
  avatarEmoji: string;
  isAggregate: boolean;
};

const DEPARTMENT_NAMES: Record<string, string> = {
  [DEPARTMENT_KEYS.CEO_OFFICE]: "CEO Office",
  [DEPARTMENT_KEYS.RESEARCH_LAB]: "Research Lab",
  [DEPARTMENT_KEYS.BUILDER_WORKSHOP]: "Builder Workshop",
  [DEPARTMENT_KEYS.GROWTH]: "Growth",
  [DEPARTMENT_KEYS.FINANCE]: "Finance",
};

const EXECUTIVE_PROFILES: AgentProfileDefinition[] = [
  {
    agentKey: "atlas",
    name: "Atlas",
    department: DEPARTMENT_KEYS.CEO_OFFICE,
    departmentName: DEPARTMENT_NAMES[DEPARTMENT_KEYS.CEO_OFFICE],
    team: "executive",
    persona: HQ_PERSONAS.ATLAS,
    title: HQ_PERSONA_REGISTRY[HQ_PERSONAS.ATLAS].title,
    avatarEmoji: HQ_PERSONA_REGISTRY[HQ_PERSONAS.ATLAS].avatarEmoji,
    isAggregate: false,
  },
  {
    agentKey: "athena",
    name: "Athena",
    department: DEPARTMENT_KEYS.RESEARCH_LAB,
    departmentName: DEPARTMENT_NAMES[DEPARTMENT_KEYS.RESEARCH_LAB],
    team: "executive",
    persona: HQ_PERSONAS.ATHENA,
    title: HQ_PERSONA_REGISTRY[HQ_PERSONAS.ATHENA].title,
    avatarEmoji: HQ_PERSONA_REGISTRY[HQ_PERSONAS.ATHENA].avatarEmoji,
    isAggregate: true,
  },
  {
    agentKey: "forge",
    name: "Forge",
    department: DEPARTMENT_KEYS.BUILDER_WORKSHOP,
    departmentName: DEPARTMENT_NAMES[DEPARTMENT_KEYS.BUILDER_WORKSHOP],
    team: "executive",
    persona: HQ_PERSONAS.FORGE,
    title: HQ_PERSONA_REGISTRY[HQ_PERSONAS.FORGE].title,
    avatarEmoji: HQ_PERSONA_REGISTRY[HQ_PERSONAS.FORGE].avatarEmoji,
    isAggregate: true,
  },
  {
    agentKey: "nova",
    name: "Nova",
    department: DEPARTMENT_KEYS.GROWTH,
    departmentName: DEPARTMENT_NAMES[DEPARTMENT_KEYS.GROWTH],
    team: "executive",
    persona: HQ_PERSONAS.NOVA,
    title: HQ_PERSONA_REGISTRY[HQ_PERSONAS.NOVA].title,
    avatarEmoji: HQ_PERSONA_REGISTRY[HQ_PERSONAS.NOVA].avatarEmoji,
    isAggregate: true,
  },
  {
    agentKey: "mercury",
    name: "Mercury",
    department: DEPARTMENT_KEYS.FINANCE,
    departmentName: DEPARTMENT_NAMES[DEPARTMENT_KEYS.FINANCE],
    team: "executive",
    persona: HQ_PERSONAS.MERCURY,
    title: HQ_PERSONA_REGISTRY[HQ_PERSONAS.MERCURY].title,
    avatarEmoji: HQ_PERSONA_REGISTRY[HQ_PERSONAS.MERCURY].avatarEmoji,
    isAggregate: true,
  },
];

function subAgentProfile(
  agentKey: string,
  name: string,
  department: string,
  team: AgentTeam,
  persona: string
): AgentProfileDefinition {
  return {
    agentKey,
    name,
    department,
    departmentName: DEPARTMENT_NAMES[department] ?? department,
    team,
    persona,
    title: name,
    avatarEmoji:
      team === "builder"
        ? "🔨"
        : team === "growth"
          ? "📈"
          : "💰",
    isAggregate: false,
  };
}

export const SUB_AGENT_PROFILES: AgentProfileDefinition[] = [
  ...FORGE_BUILDER_AGENTS.map((a) =>
    subAgentProfile(
      a.key,
      a.name,
      DEPARTMENT_KEYS.BUILDER_WORKSHOP,
      "builder",
      HQ_PERSONAS.FORGE
    )
  ),
  ...NOVA_GROWTH_AGENTS.map((a) =>
    subAgentProfile(
      a.key,
      a.name,
      DEPARTMENT_KEYS.GROWTH,
      "growth",
      HQ_PERSONAS.NOVA
    )
  ),
  ...MERCURY_AGENTS.map((a) =>
    subAgentProfile(
      a.key,
      a.name,
      DEPARTMENT_KEYS.FINANCE,
      "finance",
      HQ_PERSONAS.MERCURY
    )
  ),
];

export const ALL_AGENT_PROFILE_DEFINITIONS: AgentProfileDefinition[] = [
  ...EXECUTIVE_PROFILES,
  ...SUB_AGENT_PROFILES,
];

export function getAgentProfileDefinition(
  agentKey: string
): AgentProfileDefinition | undefined {
  return ALL_AGENT_PROFILE_DEFINITIONS.find((a) => a.agentKey === agentKey);
}

export type PerformanceTrend = "rising" | "stable" | "early";

export type RecentActivity = {
  action: string;
  detail: string | null;
  missionTitle: string;
  createdAt: string;
};

export type AgentProfile = AgentProfileDefinition & {
  level: number;
  xp: number;
  score: number;
  revenueInfluenced: number;
  missionsWorked: number;
  missionsCompleted: number;
  rank: number;
  performanceTrend: PerformanceTrend;
  recentActivity: RecentActivity[];
  strengths: string[];
  weaknesses: string[];
  lastCalculatedAt: string | null;
};

type PerformanceRow = {
  agentKey: string;
  department: string;
  xp: number;
  level: number;
  score: number;
  missionsWorked: number;
  missionsCompleted: number;
  revenueInfluenced: number;
  lastCalculatedAt: Date;
};

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function sum(values: number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
}

function deriveTrend(
  level: number,
  score: number,
  missionsCompleted: number
): PerformanceTrend {
  if (level >= 3 || score >= 60 || missionsCompleted >= 5) return "rising";
  if (level >= 2 || score >= 30 || missionsCompleted >= 2) return "stable";
  return "early";
}

function deriveAgentStrengths(profile: {
  score: number;
  level: number;
  revenueInfluenced: number;
  missionsCompleted: number;
}): string[] {
  const strengths: string[] = [];
  if (profile.score >= 50) strengths.push("High performance score");
  if (profile.level >= 3) strengths.push(`Level ${profile.level} veteran`);
  if (profile.revenueInfluenced >= 50)
    strengths.push(`£${profile.revenueInfluenced} revenue influenced`);
  if (profile.missionsCompleted >= 3)
    strengths.push(`${profile.missionsCompleted} missions completed`);
  if (strengths.length === 0) strengths.push("Building track record");
  return strengths.slice(0, 3);
}

function deriveAgentWeaknesses(profile: {
  score: number;
  missionsWorked: number;
  missionsCompleted: number;
  revenueInfluenced: number;
}): string[] {
  const weaknesses: string[] = [];
  if (profile.score < 30) weaknesses.push("Score below target");
  if (profile.missionsWorked > 0 && profile.missionsCompleted === 0)
    weaknesses.push("No completed missions yet");
  if (profile.revenueInfluenced === 0) weaknesses.push("No revenue attributed");
  if (profile.missionsWorked === 0) weaknesses.push("Awaiting mission assignment");
  if (weaknesses.length === 0) weaknesses.push("No critical gaps identified");
  return weaknesses.slice(0, 3);
}

function aggregatePerformance(
  rows: PerformanceRow[],
  def: AgentProfileDefinition
): Omit<
  AgentProfile,
  | "rank"
  | "performanceTrend"
  | "recentActivity"
  | "strengths"
  | "weaknesses"
> {
  if (rows.length === 0) {
    return {
      ...def,
      level: 1,
      xp: 0,
      score: 0,
      revenueInfluenced: 0,
      missionsWorked: 0,
      missionsCompleted: 0,
      lastCalculatedAt: null,
    };
  }

  return {
    ...def,
    level: Math.round(avg(rows.map((r) => r.level))),
    xp: Math.round(sum(rows.map((r) => r.xp))),
    score: avg(rows.map((r) => r.score)),
    revenueInfluenced: sum(rows.map((r) => r.revenueInfluenced)),
    missionsWorked: sum(rows.map((r) => r.missionsWorked)),
    missionsCompleted: sum(rows.map((r) => r.missionsCompleted)),
    lastCalculatedAt:
      rows.sort(
        (a, b) => b.lastCalculatedAt.getTime() - a.lastCalculatedAt.getTime()
      )[0]?.lastCalculatedAt.toISOString() ?? null,
  };
}

export function buildAgentProfiles(input: {
  performanceRows: PerformanceRow[];
  scoutAggregate?: {
    level: number;
    xp: number;
    score: number;
    revenueGenerated: number;
    missionsCreated: number;
    missionsLaunched: number;
    lastCalculatedAt: string | null;
  };
  recentActivityByPersona: Map<string, RecentActivity[]>;
}): AgentProfile[] {
  const perfByKey = new Map(
    input.performanceRows.map((r) => [r.agentKey, r])
  );
  const byDept = new Map<string, PerformanceRow[]>();
  for (const row of input.performanceRows) {
    const list = byDept.get(row.department) ?? [];
    list.push(row);
    byDept.set(row.department, list);
  }

  const baseProfiles = ALL_AGENT_PROFILE_DEFINITIONS.map((def) => {
    if (def.agentKey === "athena" && input.scoutAggregate) {
      const s = input.scoutAggregate;
      return {
        ...def,
        level: s.level,
        xp: s.xp,
        score: s.score,
        revenueInfluenced: s.revenueGenerated,
        missionsWorked: s.missionsCreated,
        missionsCompleted: s.missionsLaunched,
        lastCalculatedAt: s.lastCalculatedAt,
      };
    }

    if (def.isAggregate) {
      const deptRows = byDept.get(def.department) ?? [];
      return aggregatePerformance(deptRows, def);
    }

    const row = perfByKey.get(def.agentKey);
    if (!row) {
      return {
        ...def,
        level: 1,
        xp: 0,
        score: 0,
        revenueInfluenced: 0,
        missionsWorked: 0,
        missionsCompleted: 0,
        lastCalculatedAt: null,
      };
    }

    return {
      ...def,
      level: row.level,
      xp: row.xp,
      score: row.score,
      revenueInfluenced: row.revenueInfluenced,
      missionsWorked: row.missionsWorked,
      missionsCompleted: row.missionsCompleted,
      lastCalculatedAt: row.lastCalculatedAt.toISOString(),
    };
  });

  const ranked = [...baseProfiles].sort(
    (a, b) => b.score - a.score || b.xp - a.xp
  );
  const rankByKey = new Map(
    ranked.map((p, index) => [p.agentKey, index + 1])
  );

  return baseProfiles.map((profile) => {
    const activityKey = profile.persona ?? profile.agentKey;
    const recentActivity =
      input.recentActivityByPersona.get(activityKey) ??
      input.recentActivityByPersona.get(profile.agentKey) ??
      [];

    return {
      ...profile,
      rank: rankByKey.get(profile.agentKey) ?? ranked.length,
      performanceTrend: deriveTrend(
        profile.level,
        profile.score,
        profile.missionsCompleted
      ),
      recentActivity,
      strengths: deriveAgentStrengths(profile),
      weaknesses: deriveAgentWeaknesses(profile),
    };
  });
}

export type { PerformanceRow };
