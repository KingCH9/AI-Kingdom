export {
  AVATAR_REGISTRY,
  AVATAR_FRAME_CONFIG,
  activityToAnimationKey,
  animationKeyToPhaserAnim,
  getAllAvatarSpriteUrls,
  getAvatarDefinition,
  getAvatarTextureKey,
  type AvatarAnimationKey,
  type AvatarDefinition,
} from "./avatar-registry";

export {
  EMPIRE_MAX_LEVEL,
  buildEmpireLevelSnapshot,
  computeEmpireLevel,
  computeEmpireXp,
  xpRequiredForLevel,
  type EmpireLevelInput,
  type EmpireLevelSnapshot,
} from "./empire-levels";

export {
  buildDepartmentLevels,
  computeDepartmentXp,
  getDepartmentLevelKeyForDepartment,
  type DepartmentLevelKey,
  type DepartmentLevelSnapshot,
} from "./department-levels";

export {
  buildAchievements,
  countUnlockedAchievements,
  getRecentAchievement,
  type AchievementId,
  type AchievementSnapshot,
} from "./achievements";

export {
  buildUnlocks,
  getNextUnlock,
  type UnlockId,
  type UnlockSnapshot,
} from "./unlocks";

export {
  buildLeaderboards,
  type LeaderboardEntry,
  type LeaderboardSnapshot,
  type VentureLeaderboardEntry,
} from "./leaderboards";

export {
  getGamificationSnapshot,
  getAgentAvatarMeta,
  resolveAgentDisplayName,
  resolveScoutDisplayName,
  type GamificationSnapshot,
} from "./gamification-engine";
