export type UnlockId =
  | "TREND_HUNTER_SCOUT"
  | "ADVANCED_RESEARCH"
  | "VENTURE_ACCELERATOR"
  | "STRATEGIC_PORTFOLIO";

export type UnlockSnapshot = {
  id: UnlockId;
  name: string;
  description: string;
  requiredEmpireLevel: number;
  unlocked: boolean;
  visualOnly: true;
};

const UNLOCK_DEFS: Omit<UnlockSnapshot, "unlocked">[] = [
  {
    id: "TREND_HUNTER_SCOUT",
    name: "Trend Hunter Scout",
    description: "Unlock Trend Hunter Scout visual badge at Empire Level 5.",
    requiredEmpireLevel: 5,
    visualOnly: true,
  },
  {
    id: "ADVANCED_RESEARCH",
    name: "Advanced Research",
    description: "Unlock Advanced Research visual badge at Empire Level 10.",
    requiredEmpireLevel: 10,
    visualOnly: true,
  },
  {
    id: "VENTURE_ACCELERATOR",
    name: "Venture Accelerator",
    description: "Unlock Venture Accelerator visual badge at Empire Level 15.",
    requiredEmpireLevel: 15,
    visualOnly: true,
  },
  {
    id: "STRATEGIC_PORTFOLIO",
    name: "Strategic Portfolio View",
    description: "Unlock Strategic Portfolio visual badge at Empire Level 20.",
    requiredEmpireLevel: 20,
    visualOnly: true,
  },
];

export function buildUnlocks(empireLevel: number): UnlockSnapshot[] {
  return UNLOCK_DEFS.map((def) => ({
    ...def,
    unlocked: empireLevel >= def.requiredEmpireLevel,
  }));
}

export function getNextUnlock(empireLevel: number): UnlockSnapshot | null {
  return buildUnlocks(empireLevel).find((u) => !u.unlocked) ?? null;
}
