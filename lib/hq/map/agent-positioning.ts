import {
  AGENT_COL_GAP,
  AGENT_MARKER_SIZE,
  AGENT_ROW_GAP,
  ROOM_INNER_PADDING,
} from "./hq-layout";
import type { HqRoomDefinition } from "./room-registry";

export type PositionedMapEntity = {
  x: number;
  y: number;
};

function columnsForCount(count: number, roomWidth: number): number {
  const usable = roomWidth - ROOM_INNER_PADDING * 2;
  const maxCols = Math.max(
    1,
    Math.floor((usable + AGENT_COL_GAP) / (AGENT_MARKER_SIZE + AGENT_COL_GAP))
  );
  return Math.min(maxCols, Math.max(1, count));
}

/** Static grid placement for agents inside a room — no movement simulation. */
export function positionEntitiesInRoom(
  room: HqRoomDefinition,
  count: number
): PositionedMapEntity[] {
  if (count <= 0) return [];

  const cols = columnsForCount(count, room.width);
  const rows = Math.ceil(count / cols);
  const gridWidth = cols * AGENT_MARKER_SIZE + (cols - 1) * AGENT_COL_GAP;
  const gridHeight = rows * AGENT_MARKER_SIZE + (rows - 1) * AGENT_ROW_GAP;

  const startX =
    room.x + ROOM_INNER_PADDING + Math.max(0, (room.width - ROOM_INNER_PADDING * 2 - gridWidth) / 2);
  const startY =
    room.y +
    ROOM_INNER_PADDING +
    36 +
    Math.max(0, (room.height - ROOM_INNER_PADDING * 2 - 36 - gridHeight) / 2);

  const positions: PositionedMapEntity[] = [];

  for (let index = 0; index < count; index++) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    positions.push({
      x: startX + col * (AGENT_MARKER_SIZE + AGENT_COL_GAP) + AGENT_MARKER_SIZE / 2,
      y: startY + row * (AGENT_MARKER_SIZE + AGENT_ROW_GAP) + AGENT_MARKER_SIZE / 2,
    });
  }

  return positions;
}
