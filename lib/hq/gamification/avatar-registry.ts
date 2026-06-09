import type { AgentActivityType } from "../map/activity-registry";
import { DEPARTMENT_KEYS } from "../constants";

export type AvatarAnimationKey = "idle" | "walk" | "work" | "celebrate";

export type AvatarDefinition = {
  key: string;
  sprite: string;
  department: string;
  idleAnimation: string;
  walkAnimation: string;
  workAnimation: string;
  celebrateAnimation: string;
};

const SPRITE_BASE = "/hq/sprites";
const FRAME = { frameWidth: 32, frameHeight: 48 };

export const AVATAR_FRAME_CONFIG = FRAME;

const EXECUTIVE_AVATARS: AvatarDefinition[] = [
  avatarDef("atlas", "atlas.png", DEPARTMENT_KEYS.CEO_OFFICE),
  avatarDef("athena", "athena.png", DEPARTMENT_KEYS.RESEARCH_LAB),
  avatarDef("forge", "forge.png", DEPARTMENT_KEYS.BUILDER_WORKSHOP),
  avatarDef("nova", "nova.png", DEPARTMENT_KEYS.GROWTH),
  avatarDef("mercury", "mercury.png", DEPARTMENT_KEYS.FINANCE),
];

const SCOUT_AVATARS: AvatarDefinition[] = [
  avatarDef("shopify_scout", "scouts/shopify_scout.png", DEPARTMENT_KEYS.RESEARCH_LAB),
  avatarDef("etsy_scout", "scouts/etsy_scout.png", DEPARTMENT_KEYS.RESEARCH_LAB),
  avatarDef("affiliate_scout", "scouts/affiliate_scout.png", DEPARTMENT_KEYS.RESEARCH_LAB),
  avatarDef("content_scout", "scouts/content_scout.png", DEPARTMENT_KEYS.RESEARCH_LAB),
  avatarDef("saas_scout", "scouts/saas_scout.png", DEPARTMENT_KEYS.RESEARCH_LAB),
  avatarDef("amazon_scout", "scouts/amazon_scout.png", DEPARTMENT_KEYS.RESEARCH_LAB),
];

function avatarDef(
  key: string,
  spriteFile: string,
  department: string
): AvatarDefinition {
  return {
    key,
    sprite: `${SPRITE_BASE}/${spriteFile}`,
    department,
    idleAnimation: `${key}_idle`,
    walkAnimation: `${key}_walk`,
    workAnimation: `${key}_work`,
    celebrateAnimation: `${key}_celebrate`,
  };
}

export const AVATAR_REGISTRY: AvatarDefinition[] = [
  ...EXECUTIVE_AVATARS,
  ...SCOUT_AVATARS,
];

const registryByKey = new Map(AVATAR_REGISTRY.map((a) => [a.key, a]));

const departmentFallback: Record<string, string> = {
  [DEPARTMENT_KEYS.CEO_OFFICE]: "atlas",
  [DEPARTMENT_KEYS.RESEARCH_LAB]: "athena",
  [DEPARTMENT_KEYS.BUILDER_WORKSHOP]: "forge",
  [DEPARTMENT_KEYS.GROWTH]: "nova",
  [DEPARTMENT_KEYS.FINANCE]: "mercury",
};

export function getAvatarDefinition(agentKey: string, department: string): AvatarDefinition {
  return (
    registryByKey.get(agentKey) ??
    registryByKey.get(departmentFallback[department] ?? "atlas") ??
    registryByKey.get("atlas")!
  );
}

export function getAvatarTextureKey(agentKey: string, department: string): string {
  return getAvatarDefinition(agentKey, department).key;
}

/** Map live activity to sprite animation. */
export function activityToAnimationKey(activity: AgentActivityType): AvatarAnimationKey {
  switch (activity) {
    case "walking":
      return "walk";
    case "researching":
    case "reviewing":
    case "building":
    case "launching":
    case "analyzing":
      return "work";
    case "idle":
    default:
      return "idle";
  }
}

export function animationKeyToPhaserAnim(
  avatar: AvatarDefinition,
  animKey: AvatarAnimationKey
): string {
  switch (animKey) {
    case "walk":
      return avatar.walkAnimation;
    case "work":
      return avatar.workAnimation;
    case "celebrate":
      return avatar.celebrateAnimation;
    case "idle":
    default:
      return avatar.idleAnimation;
  }
}

export function getAllAvatarSpriteUrls(): string[] {
  return [...new Set(AVATAR_REGISTRY.map((a) => a.sprite))];
}
