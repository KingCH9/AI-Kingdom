import type Phaser from "phaser";
import {
  HQ_MAP_HEIGHT,
  HQ_MAP_WIDTH,
  type HqAgentLiveState,
  type HqMapLiveState,
} from "@/lib/hq/map";
import { createAnimatedAgent, type AnimatedAgentHandle } from "./agent-animation";
import { createAvatarAnimations, preloadAvatarSprites } from "./avatar-sprites";
import { drawRoom } from "./hq-room";

type CreateHqMapGameOptions = {
  parent: HTMLElement;
  Phaser: typeof import("phaser");
  state: HqMapLiveState;
  onAgentHover: (agent: HqAgentLiveState | null, pointer?: Phaser.Input.Pointer) => void;
  onAgentClick: (agent: HqAgentLiveState) => void;
};

export function createHqMapGame({
  parent,
  Phaser,
  state,
  onAgentHover,
  onAgentClick,
}: CreateHqMapGameOptions): Phaser.Game {
  class HqMapScene extends Phaser.Scene {
    private agentHandles: AnimatedAgentHandle[] = [];
    private pendingState = state;

    constructor() {
      super({ key: "HqMapScene" });
    }

    preload() {
      preloadAvatarSprites(this);
    }

    create() {
      createAvatarAnimations(this);
      this.buildScene(this.pendingState);
    }

    buildScene(liveState: HqMapLiveState) {
      this.children.removeAll(true);
      this.agentHandles = [];

      const bg = this.add.graphics();
      bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 1);
      bg.fillRect(0, 0, HQ_MAP_WIDTH, HQ_MAP_HEIGHT);

      this.add
        .text(HQ_MAP_WIDTH / 2, 8, "AI Kingdom HQ — Live Activity View", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#64748b",
        })
        .setOrigin(0.5, 0);

      for (const room of liveState.rooms) {
        drawRoom(this, room, (href) => {
          window.location.href = href;
        });
      }

      this.agentHandles = liveState.agentStates.map((agent) =>
        createAnimatedAgent(this, agent, {
          onAgentHover,
          onAgentClick,
        })
      );

      this.cameras.main.setBounds(0, 0, HQ_MAP_WIDTH, HQ_MAP_HEIGHT);
    }

    shutdown() {
      for (const handle of this.agentHandles) {
        handle.destroy();
      }
      this.agentHandles = [];
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
