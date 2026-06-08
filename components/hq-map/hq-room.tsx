import type Phaser from "phaser";
import type { HqMapRoomState } from "@/lib/hq/map";

export function drawRoom(
  scene: Phaser.Scene,
  room: HqMapRoomState,
  onRoomClick: (href: string) => void
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  const bg = scene.add.graphics();
  bg.fillStyle(0x111827, room.isActive ? 0.98 : 0.92);
  bg.fillRoundedRect(room.x, room.y, room.width, room.height, 12);
  bg.lineStyle(room.isActive ? 3 : 2, room.accentColor, room.isActive ? 1 : 0.85);
  bg.strokeRoundedRect(room.x, room.y, room.width, room.height, 12);

  if (room.isActive) {
    bg.lineStyle(1, room.accentColor, 0.25);
    bg.strokeRoundedRect(room.x - 3, room.y - 3, room.width + 6, room.height + 6, 14);
  }

  const title = scene.add.text(room.x + 12, room.y + 10, `${room.emoji} ${room.name}`, {
    fontFamily: "system-ui, sans-serif",
    fontSize: "13px",
    color: "#e2e8f0",
    fontStyle: "bold",
  });

  const subtitle = scene.add.text(
    room.x + 12,
    room.y + 28,
    room.currentMission ? `Mission: ${truncate(room.currentMission, 34)}` : `${room.agentCount} stationed`,
    {
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      color: "#94a3b8",
    }
  );

  const hit = scene.add.zone(
    room.x + room.width / 2,
    room.y + room.height / 2,
    room.width,
    room.height
  );
  hit.setInteractive({ useHandCursor: true });
  hit.on("pointerup", () => onRoomClick(room.profileHref));

  container.add([bg, title, subtitle, hit]);
  return container;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
