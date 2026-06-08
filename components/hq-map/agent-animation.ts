import type Phaser from "phaser";
import { AGENT_MARKER_SIZE } from "@/lib/hq/map";
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

export function createAnimatedAgent(
  scene: Phaser.Scene,
  state: HqAgentLiveState,
  handlers: AnimatedAgentHandlers
): AnimatedAgentHandle {
  const radius = AGENT_MARKER_SIZE / 2;
  const container = scene.add.container(state.fromX, state.fromY);

  const circle = scene.add.graphics();
  const pulseRing = scene.add.graphics();

  const emoji = scene.add.text(0, -2, state.avatarEmoji, {
    fontFamily: "Segoe UI Emoji, Apple Color Emoji, sans-serif",
    fontSize: "20px",
  });
  emoji.setOrigin(0.5);

  const label = scene.add.text(0, radius + 6, `L${state.level}`, {
    fontFamily: "system-ui, sans-serif",
    fontSize: "10px",
    color: "#cbd5e1",
  });
  label.setOrigin(0.5, 0);

  const hit = scene.add.circle(0, 0, radius, 0xffffff, 0.001);
  hit.setInteractive({ useHandCursor: true });
  hit.on("pointerover", (pointer: Phaser.Input.Pointer) => {
    handlers.onAgentHover(state, pointer);
  });
  hit.on("pointerout", () => handlers.onAgentHover(null));
  hit.on("pointerup", () => handlers.onAgentClick(state));

  container.add([circle, pulseRing, emoji, label, hit]);
  container.setDepth(10);

  let progress = state.movementProgress;
  let pulsePhase = 0;

  const drawMarker = () => {
    const pos = interpolateAgentPosition(state, progress);
    const bob = state.activity === "walking" ? walkingBobOffset(scene.game.loop.time) : 0;

    container.setPosition(pos.x, pos.y + bob);

    circle.clear();
    const fillColor =
      state.kind === "scout" ? 0x065f46 : state.isActive ? 0x1d4ed8 : 0x1e3a5f;
    const strokeColor =
      state.kind === "scout" ? 0x34d399 : state.isActive ? 0x93c5fd : 0x60a5fa;

    circle.fillStyle(fillColor, 1);
    circle.fillCircle(0, 0, radius);
    circle.lineStyle(2, strokeColor, 1);
    circle.strokeCircle(0, 0, radius);

    pulseRing.clear();
    if (state.isActive) {
      const pulse = 1 + Math.sin(pulsePhase) * 0.12;
      pulseRing.lineStyle(2, strokeColor, 0.35);
      pulseRing.strokeCircle(0, 0, radius * pulse + 4);
    }
  };

  drawMarker();

  const tick = (_time: number, delta: number) => {
    if (state.activity === "walking" && progress < 1) {
      progress = Math.min(1, progress + state.speed * (delta / 1000));
    } else if (state.activity === "walking" && progress >= 1) {
      progress = 0;
    }

    pulsePhase += delta * 0.006;
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
