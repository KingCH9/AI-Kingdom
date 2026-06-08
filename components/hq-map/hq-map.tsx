"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import type { HqAgentLiveState, HqMapLiveState } from "@/lib/hq/map";
import { ActivityPanel } from "./activity-panel";
import { createHqMapGame } from "./create-hq-map-game";
import { LiveFeed } from "./live-feed";
import { HqTooltip } from "./hq-tooltip";

type HqMapProps = {
  state: HqMapLiveState;
};

export function HqMap({ state }: HqMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<HqAgentLiveState | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;

    void (async () => {
      const PhaserModule = await import("phaser");
      const Phaser = PhaserModule.default;
      if (destroyed || !containerRef.current) return;

      gameRef.current?.destroy(true);
      gameRef.current = createHqMapGame({
        parent: containerRef.current,
        Phaser,
        state,
        onAgentHover: (agent, pointer) => {
          setHoveredAgent(agent);
          if (agent && pointer && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setTooltipPos({
              x: pointer.x - rect.left,
              y: pointer.y - rect.top,
            });
          }
        },
        onAgentClick: (agent) => {
          window.location.href = agent.profileHref;
        },
      });
    })();

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [state]);

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-4">
      <div className="relative w-full min-w-0">
        <div
          ref={containerRef}
          className="w-full overflow-hidden rounded-2xl border border-gray-700 bg-gray-950 shadow-inner"
          style={{ aspectRatio: "1024 / 720" }}
        />
        <HqTooltip agent={hoveredAgent} x={tooltipPos.x} y={tooltipPos.y} />
        <p className="text-xs text-gray-500 mt-3">
          Live visualization — agents move between departments based on mission status.
          Read-only; no mutations.
        </p>
      </div>

      <div className="space-y-4">
        <LiveFeed entries={state.activityFeed} />
        <ActivityPanel state={state} />
      </div>
    </div>
  );
}
