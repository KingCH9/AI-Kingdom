import type Phaser from "phaser";
import {
  AVATAR_FRAME_CONFIG,
  AVATAR_REGISTRY,
  type AvatarDefinition,
} from "@/lib/hq/gamification/avatar-registry";

export function preloadAvatarSprites(scene: Phaser.Scene): void {
  for (const avatar of AVATAR_REGISTRY) {
    scene.load.image(avatar.key, avatar.sprite);
  }
}

export function createAvatarAnimations(scene: Phaser.Scene): void {
  for (const avatar of AVATAR_REGISTRY) {
    ensureAvatarFrames(scene, avatar);
    registerAvatarAnimations(scene, avatar);
  }
}

function ensureAvatarFrames(scene: Phaser.Scene, avatar: AvatarDefinition): void {
  const texture = scene.textures.get(avatar.key);
  if (!texture || texture.frameTotal > 1) return;

  const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const width = source.width;
  const height = source.height;
  const frameWidth = Math.max(AVATAR_FRAME_CONFIG.frameWidth, Math.floor(width / 4));
  const frameHeight = height;

  for (let i = 0; i < 4; i++) {
    texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
  }
}

function registerAvatarAnimations(scene: Phaser.Scene, avatar: AvatarDefinition): void {
  if (!scene.anims.exists(avatar.idleAnimation)) {
    scene.anims.create({
      key: avatar.idleAnimation,
      frames: [{ key: avatar.key, frame: 0 }],
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(avatar.walkAnimation)) {
    scene.anims.create({
      key: avatar.walkAnimation,
      frames: scene.anims.generateFrameNumbers(avatar.key, { start: 1, end: 2 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(avatar.workAnimation)) {
    scene.anims.create({
      key: avatar.workAnimation,
      frames: [{ key: avatar.key, frame: 3 }],
      frameRate: 1,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(avatar.celebrateAnimation)) {
    scene.anims.create({
      key: avatar.celebrateAnimation,
      frames: [
        { key: avatar.key, frame: 3 },
        { key: avatar.key, frame: 0 },
      ],
      frameRate: 4,
      repeat: -1,
    });
  }
}
