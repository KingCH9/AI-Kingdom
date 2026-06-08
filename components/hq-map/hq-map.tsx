"use client";

import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import type { HqMapAgent, HqMapState } from "@/lib/hq/map";
import { createHqMapGame } from "./create-hq-map-game";
import { HqTooltip } from "./hq-tooltip";

type HqMapProps = {
  state: HqMapState;
};

export function HqMap({ state }: HqMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<HqMapAgent | null>(null);
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
    <div className="relative w-full max-w-5xl">
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-2xl border border-gray-700 bg-gray-950 shadow-inner"
        style={{ aspectRatio: "1024 / 720" }}
      />
      <HqTooltip agent={hoveredAgent} x={tooltipPos.x} y={tooltipPos.y} />
      <p className="text-xs text-gray-500 mt-3">
        Visualization only — click an agent or scout to open their profile. Click a room
        to open its department dashboard.
      </p>
    </div>
  );
}
