import { DEPARTMENT_KEYS } from "../constants";
import { xpRequiredForLevel } from "./empire-levels";

export type DepartmentLevelKey = "atlas" | "athena" | "forge" | "nova" | "mercury";

export type DepartmentLevelInput = {
  departmentXp: number;
  revenue: number;
  missionCount: number;
};

export type DepartmentLevelSnapshot = {
  key: DepartmentLevelKey;
  name: string;
  departmentKey: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  progressPercent: number;
  revenue: number;
  missionCount: number;
};

const DEPARTMENT_META: Array<{
  key: DepartmentLevelKey;
  name: string;
  departmentKey: string;
}> = [
  { key: "atlas", name: "Atlas", departmentKey: DEPARTMENT_KEYS.CEO_OFFICE },
  { key: "athena", name: "Athena", departmentKey: DEPARTMENT_KEYS.RESEARCH_LAB },
  { key: "forge", name: "Forge", departmentKey: DEPARTMENT_KEYS.BUILDER_WORKSHOP },
  { key: "nova", name: "Nova", departmentKey: DEPARTMENT_KEYS.GROWTH },
  { key: "mercury", name: "Mercury", departmentKey: DEPARTMENT_KEYS.FINANCE },
];

export function computeDepartmentXp(input: DepartmentLevelInput): number {
  return Math.floor(input.departmentXp + input.revenue * 0.35 + input.missionCount * 80);
}

function levelFromXp(xp: number): Pick<DepartmentLevelSnapshot, "level" | "nextLevelXp" | "progressPercent"> {
  let level = 1;
  while (level < 50 && xp >= xpRequiredForLevel(level + 1)) {
    level++;
  }
  const current = xpRequiredForLevel(level);
  const next = level >= 50 ? current : xpRequiredForLevel(level + 1);
  const span = Math.max(1, next - current);
  const progress = level >= 50 ? 100 : ((xp - current) / span) * 100;
  return {
    level,
    nextLevelXp: next,
    progressPercent: Math.min(100, Math.max(0, Math.round(progress))),
  };
}

export function buildDepartmentLevels(
  inputs: Record<DepartmentLevelKey, DepartmentLevelInput>
): DepartmentLevelSnapshot[] {
  return DEPARTMENT_META.map((meta) => {
    const input = inputs[meta.key];
    const xp = computeDepartmentXp(input);
    const levelInfo = levelFromXp(xp);
    return {
      key: meta.key,
      name: meta.name,
      departmentKey: meta.departmentKey,
      xp,
      revenue: input.revenue,
      missionCount: input.missionCount,
      ...levelInfo,
    };
  });
}

export function getDepartmentLevelKeyForDepartment(
  departmentKey: string
): DepartmentLevelKey {
  const match = DEPARTMENT_META.find((d) => d.departmentKey === departmentKey);
  return match?.key ?? "atlas";
}
