export type EmpireLevelInput = {
  totalRevenue: number;
  missionCount: number;
  totalAgentXp: number;
  totalScoutXp: number;
  empireScore: number;
};

export type EmpireLevelSnapshot = {
  empireLevel: number;
  empireXp: number;
  nextLevelXp: number;
  progressPercent: number;
  xpToNextLevel: number;
};

export const EMPIRE_MAX_LEVEL = 100;

/** XP required to reach a given level (cumulative). */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(500 * Math.pow(level - 1, 1.45));
}

export function computeEmpireXp(input: EmpireLevelInput): number {
  return Math.floor(
    input.totalRevenue * 0.5 +
      input.missionCount * 120 +
      input.totalAgentXp * 0.12 +
      input.totalScoutXp * 0.12 +
      input.empireScore * 15
  );
}

export function computeEmpireLevel(empireXp: number): EmpireLevelSnapshot {
  let level = 1;
  while (level < EMPIRE_MAX_LEVEL && empireXp >= xpRequiredForLevel(level + 1)) {
    level++;
  }

  const currentThreshold = xpRequiredForLevel(level);
  const nextThreshold =
    level >= EMPIRE_MAX_LEVEL
      ? currentThreshold
      : xpRequiredForLevel(level + 1);

  const span = Math.max(1, nextThreshold - currentThreshold);
  const progress = level >= EMPIRE_MAX_LEVEL ? 100 : ((empireXp - currentThreshold) / span) * 100;

  return {
    empireLevel: level,
    empireXp,
    nextLevelXp: nextThreshold,
    progressPercent: Math.min(100, Math.max(0, Math.round(progress))),
    xpToNextLevel: level >= EMPIRE_MAX_LEVEL ? 0 : nextThreshold - empireXp,
  };
}

export function buildEmpireLevelSnapshot(input: EmpireLevelInput): EmpireLevelSnapshot {
  return computeEmpireLevel(computeEmpireXp(input));
}
