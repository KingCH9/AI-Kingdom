import type { DepartmentKey } from "../constants";
import { DEPARTMENT_KEYS } from "../constants";

export type HqRoomId =
  | "command_center"
  | "atlas_office"
  | "athena_lab"
  | "forge_workshop"
  | "nova_growth"
  | "mercury_treasury";

export type HqRoomDefinition = {
  id: HqRoomId;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  department: DepartmentKey | null;
  emoji: string;
  accentColor: number;
  profileHref: string;
};

/**
 * HQ floor plan — matches the Phase 5A layout:
 *
 *              Atlas
 *   Athena              Mercury
 *       Command Center
 *   Forge                  Nova
 */
export const HQ_ROOMS: HqRoomDefinition[] = [
  {
    id: "atlas_office",
    name: "Atlas Office",
    x: 372,
    y: 24,
    width: 280,
    height: 140,
    department: DEPARTMENT_KEYS.CEO_OFFICE,
    emoji: "👔",
    accentColor: 0x3b82f6,
    profileHref: "/hq/atlas",
  },
  {
    id: "athena_lab",
    name: "Athena Research Lab",
    x: 24,
    y: 180,
    width: 300,
    height: 300,
    department: DEPARTMENT_KEYS.RESEARCH_LAB,
    emoji: "🔎",
    accentColor: 0x8b5cf6,
    profileHref: "/hq/scouts",
  },
  {
    id: "mercury_treasury",
    name: "Mercury Treasury",
    x: 700,
    y: 180,
    width: 300,
    height: 300,
    department: DEPARTMENT_KEYS.FINANCE,
    emoji: "💰",
    accentColor: 0x10b981,
    profileHref: "/hq/mercury",
  },
  {
    id: "command_center",
    name: "Command Center",
    x: 352,
    y: 260,
    width: 320,
    height: 160,
    department: null,
    emoji: "🎛️",
    accentColor: 0xf59e0b,
    profileHref: "/hq/command",
  },
  {
    id: "forge_workshop",
    name: "Forge Workshop",
    x: 24,
    y: 520,
    width: 300,
    height: 176,
    department: DEPARTMENT_KEYS.BUILDER_WORKSHOP,
    emoji: "🔨",
    accentColor: 0xf97316,
    profileHref: "/hq/forge",
  },
  {
    id: "nova_growth",
    name: "Nova Growth Center",
    x: 700,
    y: 520,
    width: 300,
    height: 176,
    department: DEPARTMENT_KEYS.GROWTH,
    emoji: "📈",
    accentColor: 0xec4899,
    profileHref: "/hq/nova",
  },
];

export function getRoomById(id: HqRoomId): HqRoomDefinition {
  const room = HQ_ROOMS.find((entry) => entry.id === id);
  if (!room) throw new Error(`Unknown HQ room: ${id}`);
  return room;
}

export function getRoomForDepartment(
  department: string
): HqRoomDefinition | undefined {
  return HQ_ROOMS.find((room) => room.department === department);
}

export function getDepartmentRooms(): HqRoomDefinition[] {
  return HQ_ROOMS.filter((room) => room.department != null);
}
