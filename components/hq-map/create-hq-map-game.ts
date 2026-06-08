import type Phaser from "phaser";
import {
  HQ_MAP_HEIGHT,
  HQ_MAP_WIDTH,
  type HqMapAgent,
  type HqMapState,
} from "@/lib/hq/map";
import { drawAgent } from "./hq-agent";
import { drawRoom } from "./hq-room";

type CreateHqMapGameOptions = {
  parent: HTMLElement;
  Phaser: typeof import("phaser");
  state: HqMapState;
  onAgentHover: (agent: HqMapAgent | null, pointer?: Phaser.Input.Pointer) => void;
  onAgentClick: (agent: HqMapAgent) => void;
};

export function createHqMapGame({
  parent,
  Phaser,
  state,
  onAgentHover,
  onAgentClick,
}: CreateHqMapGameOptions): Phaser.Game {
  class HqMapScene extends Phaser.Scene {
    constructor() {
      super({ key: "HqMapScene" });
    }

    create() {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 1);
      bg.fillRect(0, 0, HQ_MAP_WIDTH, HQ_MAP_HEIGHT);

      this.add
        .text(HQ_MAP_WIDTH / 2, 8, "AI Kingdom HQ — Live Operations View", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#64748b",
        })
        .setOrigin(0.5, 0);

      for (const room of state.rooms) {
        drawRoom(this, room, (href) => {
          window.location.href = href;
        });
      }

      for (const agent of state.agents) {
        drawAgent(this, agent, {
          onAgentHover,
          onAgentClick,
        });
      }

      this.cameras.main.setBounds(0, 0, HQ_MAP_WIDTH, HQ_MAP_HEIGHT);
    }
  }

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: HQ_MAP_WIDTH,
    height: HQ_MAP_HEIGHT,
    backgroundColor: "#020617",
    scene: HqMapScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: {
      target: 30,
    },
  });
}
