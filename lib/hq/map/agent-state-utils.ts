import type { HqAgentLiveState } from "@/lib/hq/map/agent-state";

/** Interpolate agent position along home → target route. */
export function interpolateAgentPosition(
  state: HqAgentLiveState,
  progress: number
): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, progress));
  return {
    x: state.fromX + (state.toX - state.fromX) * t,
    y: state.fromY + (state.toY - state.fromY) * t,
  };
}

/** Subtle vertical bob while walking. */
export function walkingBobOffset(timeMs: number): number {
  return Math.sin(timeMs * 0.008) * 3;
}

export function currentAgentPosition(
  state: HqAgentLiveState,
  progress: number
): { x: number; y: number } {
  const pos = interpolateAgentPosition(state, progress);
  const bob = state.activity === "walking" ? walkingBobOffset(Date.now()) : 0;
  return { x: pos.x, y: pos.y + bob };
}
