import type Phaser from "phaser";
import type { HqMapAgent } from "@/lib/hq/map";
import { AGENT_MARKER_SIZE } from "@/lib/hq/map";

export type AgentPointerHandlers = {
  onAgentHover: (agent: HqMapAgent | null, pointer?: Phaser.Input.Pointer) => void;
  onAgentClick: (agent: HqMapAgent) => void;
};

export function drawAgent(
  scene: Phaser.Scene,
  agent: HqMapAgent,
  handlers: AgentPointerHandlers
): Phaser.GameObjects.Container {
  const radius = AGENT_MARKER_SIZE / 2;
  const container = scene.add.container(agent.x, agent.y);

  const circle = scene.add.graphics();
  const fillColor = agent.kind === "scout" ? 0x065f46 : 0x1e3a5f;
  circle.fillStyle(fillColor, 1);
  circle.fillCircle(0, 0, radius);
  circle.lineStyle(2, agent.kind === "scout" ? 0x34d399 : 0x60a5fa, 1);
  circle.strokeCircle(0, 0, radius);

  const emoji = scene.add.text(0, -2, agent.avatarEmoji, {
    fontFamily: "Segoe UI Emoji, Apple Color Emoji, sans-serif",
    fontSize: "20px",
  });
  emoji.setOrigin(0.5);

  const label = scene.add.text(0, radius + 6, `L${agent.level}`, {
    fontFamily: "system-ui, sans-serif",
    fontSize: "10px",
    color: "#cbd5e1",
  });
  label.setOrigin(0.5, 0);

  const hit = scene.add.circle(0, 0, radius, 0xffffff, 0.001);
  hit.setInteractive({ useHandCursor: true });
  hit.on("pointerover", (pointer: Phaser.Input.Pointer) => {
    handlers.onAgentHover(agent, pointer);
  });
  hit.on("pointerout", () => handlers.onAgentHover(null));
  hit.on("pointerup", () => handlers.onAgentClick(agent));

  container.add([circle, emoji, label, hit]);
  container.setDepth(10);
  return container;
}

export function drawAgentNameTag(
  scene: Phaser.Scene,
  agent: HqMapAgent
): Phaser.GameObjects.Text {
  return scene.add
    .text(agent.x, agent.y - AGENT_MARKER_SIZE / 2 - 8, truncate(agent.name, 16), {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      color: "#f8fafc",
      backgroundColor: "#0f172acc",
      padding: { x: 4, y: 2 },
    })
    .setOrigin(0.5, 1)
    .setDepth(11);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
