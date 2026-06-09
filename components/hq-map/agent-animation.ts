import type Phaser from "phaser";
import {
  activityToAnimationKey,
  animationKeyToPhaserAnim,
  getAvatarDefinition,
} from "@/lib/hq/gamification/avatar-registry";
import type { HqAgentLiveState } from "@/lib/hq/map/agent-state";
import { interpolateAgentPosition, walkingBobOffset } from "@/lib/hq/map/agent-state-utils";

export type AnimatedAgentHandlers = {
  onAgentHover: (agent: HqAgentLiveState | null, pointer?: Phaser.Input.Pointer) => void;
  onAgentClick: (agent: HqAgentLiveState) => void;
};

export type AnimatedAgentHandle = {
  container: Phaser.GameObjects.Container;
  state: HqAgentLiveState;
  destroy: () => void;
};

const AVATAR_SCALE = 1.35;
const HIT_RADIUS = 18;

export function createAnimatedAgent(
  scene: Phaser.Scene,
  state: HqAgentLiveState,
  handlers: AnimatedAgentHandlers
): AnimatedAgentHandle {
  const avatar = getAvatarDefinition(state.avatarKey || state.key, state.department);
  const container = scene.add.container(state.fromX, state.fromY);

  const sprite = scene.add.sprite(0, 0, avatar.key, 0);
  sprite.setScale(AVATAR_SCALE);
  sprite.setOrigin(0.5, 0.85);

  const levelBadge = scene.add.graphics();
  const levelText = scene.add.text(0, -34, `L${state.level}`, {
    fontFamily: "system-ui, sans-serif",
    fontSize: "9px",
    color: "#f8fafc",
    fontStyle: "bold",
  });
  levelText.setOrigin(0.5);

  const xpBarBg = scene.add.graphics();
  const xpBarFill = scene.add.graphics();

  const achievementIcon = state.unlockedAchievementCount > 0
    ? scene.add.text(14, -30, "🏆", { fontSize: "10px" })
    : null;
  achievementIcon?.setOrigin(0.5);

  const activityLabel = scene.add.text(0, 18, "", {
    fontFamily: "system-ui, sans-serif",
    fontSize: "8px",
    color: "#67e8f9",
  });
  activityLabel.setOrigin(0.5, 0);

  const hit = scene.add.circle(0, -4, HIT_RADIUS, 0xffffff, 0.001);
  hit.setInteractive({ useHandCursor: true });
  hit.on("pointerover", (pointer: Phaser.Input.Pointer) => {
    handlers.onAgentHover(state, pointer);
  });
  hit.on("pointerout", () => handlers.onAgentHover(null));
  hit.on("pointerup", () => handlers.onAgentClick(state));

  const children: Phaser.GameObjects.GameObject[] = [
    sprite,
    xpBarBg,
    xpBarFill,
    levelBadge,
    levelText,
    activityLabel,
    hit,
  ];
  if (achievementIcon) children.splice(3, 0, achievementIcon);
  container.add(children);
  container.setDepth(10);

  let progress = state.movementProgress;
  let currentAnimKey = "";
  let flipX = state.toX < state.fromX;

  const playAnimation = (activity: HqAgentLiveState["activity"]) => {
    const animKey = activityToAnimationKey(activity);
    const phaserAnim = animationKeyToPhaserAnim(avatar, animKey);
    if (currentAnimKey !== phaserAnim) {
      sprite.play(phaserAnim, true);
      currentAnimKey = phaserAnim;
    }
  };

  const drawXpBar = () => {
    const barW = 28;
    const barH = 3;
    const barX = -barW / 2;
    const barY = 8;
    const pct = Math.min(1, state.xpProgressPercent / 100);

    xpBarBg.clear();
    xpBarBg.fillStyle(0x1e293b, 0.9);
    xpBarBg.fillRoundedRect(barX, barY, barW, barH, 1);

    xpBarFill.clear();
    xpBarFill.fillStyle(state.isActive ? 0x22d3ee : 0x64748b, 1);
    xpBarFill.fillRoundedRect(barX, barY, barW * pct, barH, 1);

    levelBadge.clear();
    levelBadge.fillStyle(0x0f172a, 0.85);
    levelBadge.fillRoundedRect(-14, -38, 28, 12, 3);
    levelBadge.lineStyle(1, state.isActive ? 0x38bdf8 : 0x475569, 1);
    levelBadge.strokeRoundedRect(-14, -38, 28, 12, 3);
  };

  playAnimation(state.activity);
  sprite.setFlipX(flipX);
  drawXpBar();
  activityLabel.setText(state.activity === "idle" ? "" : state.activity);

  const drawMarker = () => {
    const pos = interpolateAgentPosition(state, progress);
    const bob = state.activity === "walking" ? walkingBobOffset(scene.game.loop.time) : 0;

    container.setPosition(pos.x, pos.y + bob);
    flipX = state.toX < state.fromX;
    sprite.setFlipX(flipX);
    playAnimation(state.activity);
    drawXpBar();
    activityLabel.setText(
      state.activity === "walking" || state.activity === "idle" ? "" : state.activity
    );
  };

  drawMarker();

  const tick = (_time: number, delta: number) => {
    if (state.activity === "walking" && progress < 1) {
      progress = Math.min(1, progress + state.speed * (delta / 1000));
    } else if (state.activity === "walking" && progress >= 1) {
      progress = 0;
    }

    drawMarker();
  };

  scene.events.on("update", tick);

  return {
    container,
    state,
    destroy: () => {
      scene.events.off("update", tick);
      container.destroy(true);
    },
  };
}
