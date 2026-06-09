export type AchievementId =
  | "FIRST_MISSION"
  | "FIRST_SALE"
  | "FIRST_STORE"
  | "FIRST_100_REVENUE"
  | "FIRST_1000_REVENUE"
  | "TEN_MISSIONS"
  | "TWENTY_FIVE_MISSIONS"
  | "FIFTY_MISSIONS"
  | "FIRST_ETSY_VENTURE"
  | "FIRST_SAAS_VENTURE"
  | "FIRST_AMAZON_VENTURE"
  | "EMPIRE_LEVEL_5"
  | "EMPIRE_LEVEL_10"
  | "SCOUT_MASTER"
  | "FORGE_MASTER"
  | "NOVA_MASTER"
  | "MERCURY_MASTER"
  | "ATLAS_MASTER";

export type AchievementSnapshot = {
  id: AchievementId;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
};

export type AchievementInput = {
  missionCount: number;
  totalRevenue: number;
  storeCount: number;
  empireLevel: number;
  ventureTypes: Set<string>;
  topScoutLevel: number;
  departmentLevels: Record<string, number>;
};

type AchievementDef = {
  id: AchievementId;
  name: string;
  description: string;
  target: number;
  evaluate: (input: AchievementInput) => number;
};

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: "FIRST_MISSION",
    name: "First Mission",
    description: "Launch your first empire mission.",
    target: 1,
    evaluate: (i) => i.missionCount,
  },
  {
    id: "FIRST_SALE",
    name: "First Sale",
    description: "Generate your first pound of revenue.",
    target: 1,
    evaluate: (i) => (i.totalRevenue > 0 ? 1 : 0),
  },
  {
    id: "FIRST_STORE",
    name: "First Store",
    description: "Create your first store.",
    target: 1,
    evaluate: (i) => i.storeCount,
  },
  {
    id: "FIRST_100_REVENUE",
    name: "Century Club",
    description: "Reach £100 total revenue.",
    target: 100,
    evaluate: (i) => Math.min(i.totalRevenue, 100),
  },
  {
    id: "FIRST_1000_REVENUE",
    name: "Four Figures",
    description: "Reach £1,000 total revenue.",
    target: 1000,
    evaluate: (i) => Math.min(i.totalRevenue, 1000),
  },
  {
    id: "TEN_MISSIONS",
    name: "Mission Commander",
    description: "Complete 10 missions across the empire.",
    target: 10,
    evaluate: (i) => i.missionCount,
  },
  {
    id: "TWENTY_FIVE_MISSIONS",
    name: "Portfolio Builder",
    description: "Run 25 missions across ventures.",
    target: 25,
    evaluate: (i) => i.missionCount,
  },
  {
    id: "FIFTY_MISSIONS",
    name: "Empire Architect",
    description: "Run 50 missions across ventures.",
    target: 50,
    evaluate: (i) => i.missionCount,
  },
  {
    id: "FIRST_ETSY_VENTURE",
    name: "Etsy Pioneer",
    description: "Launch your first Etsy venture.",
    target: 1,
    evaluate: (i) => (i.ventureTypes.has("etsy") ? 1 : 0),
  },
  {
    id: "FIRST_SAAS_VENTURE",
    name: "SaaS Pioneer",
    description: "Launch your first SaaS venture.",
    target: 1,
    evaluate: (i) => (i.ventureTypes.has("saas") ? 1 : 0),
  },
  {
    id: "FIRST_AMAZON_VENTURE",
    name: "Amazon Pioneer",
    description: "Launch your first Amazon venture.",
    target: 1,
    evaluate: (i) => (i.ventureTypes.has("amazon") ? 1 : 0),
  },
  {
    id: "EMPIRE_LEVEL_5",
    name: "Rising Empire",
    description: "Reach Empire Level 5.",
    target: 5,
    evaluate: (i) => i.empireLevel,
  },
  {
    id: "EMPIRE_LEVEL_10",
    name: "Established Empire",
    description: "Reach Empire Level 10.",
    target: 10,
    evaluate: (i) => i.empireLevel,
  },
  {
    id: "SCOUT_MASTER",
    name: "Scout Master",
    description: "Raise a scout to Level 10.",
    target: 10,
    evaluate: (i) => i.topScoutLevel,
  },
  {
    id: "FORGE_MASTER",
    name: "Forge Master",
    description: "Raise Forge department to Level 10.",
    target: 10,
    evaluate: (i) => i.departmentLevels.forge ?? 0,
  },
  {
    id: "NOVA_MASTER",
    name: "Nova Master",
    description: "Raise Nova department to Level 10.",
    target: 10,
    evaluate: (i) => i.departmentLevels.nova ?? 0,
  },
  {
    id: "MERCURY_MASTER",
    name: "Mercury Master",
    description: "Raise Mercury department to Level 10.",
    target: 10,
    evaluate: (i) => i.departmentLevels.mercury ?? 0,
  },
  {
    id: "ATLAS_MASTER",
    name: "Atlas Master",
    description: "Raise Atlas department to Level 10.",
    target: 10,
    evaluate: (i) => i.departmentLevels.atlas ?? 0,
  },
];

export function buildAchievements(input: AchievementInput): AchievementSnapshot[] {
  const now = new Date().toISOString();
  return ACHIEVEMENT_DEFS.map((def) => {
    const current = def.evaluate(input);
    const unlocked = current >= def.target;
    const progress = Math.min(100, Math.round((current / def.target) * 100));
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      unlocked,
      unlockedAt: unlocked ? now : null,
      progress,
    };
  });
}

export function countUnlockedAchievements(achievements: AchievementSnapshot[]): number {
  return achievements.filter((a) => a.unlocked).length;
}

export function getRecentAchievement(
  achievements: AchievementSnapshot[]
): AchievementSnapshot | null {
  return achievements.filter((a) => a.unlocked).slice(-1)[0] ?? null;
}
