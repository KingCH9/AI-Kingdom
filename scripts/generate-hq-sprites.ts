/**
 * Generates HQ avatar sprite sheets (4 frames × 32×48) as PNG files.
 * Run: npx tsx scripts/generate-hq-sprites.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";

const FRAME_W = 32;
const FRAME_H = 48;
const FRAMES = 4;

type CharacterSpec = {
  file: string;
  skin: [number, number, number];
  shirt: [number, number, number];
  pants: [number, number, number];
  accent: [number, number, number];
};

const EXECUTIVES: CharacterSpec[] = [
  { file: "atlas.png", skin: [255, 220, 177], shirt: [30, 64, 175], pants: [15, 23, 42], accent: [250, 204, 21] },
  { file: "athena.png", skin: [255, 220, 177], shirt: [124, 58, 237], pants: [46, 16, 101], accent: [196, 181, 253] },
  { file: "forge.png", skin: [210, 180, 140], shirt: [234, 88, 12], pants: [67, 20, 7], accent: [251, 191, 36] },
  { file: "nova.png", skin: [255, 220, 177], shirt: [16, 185, 129], pants: [6, 78, 59], accent: [110, 231, 183] },
  { file: "mercury.png", skin: [255, 220, 177], shirt: [14, 116, 144], pants: [8, 47, 73], accent: [56, 189, 248] },
];

const SCOUTS: CharacterSpec[] = [
  { file: "scouts/shopify_scout.png", skin: [255, 220, 177], shirt: [34, 197, 94], pants: [20, 83, 45], accent: [134, 239, 172] },
  { file: "scouts/etsy_scout.png", skin: [255, 220, 177], shirt: [244, 63, 94], pants: [136, 19, 55], accent: [253, 164, 175] },
  { file: "scouts/affiliate_scout.png", skin: [210, 180, 140], shirt: [59, 130, 246], pants: [30, 58, 138], accent: [147, 197, 253] },
  { file: "scouts/content_scout.png", skin: [255, 220, 177], shirt: [168, 85, 247], pants: [88, 28, 135], accent: [216, 180, 254] },
  { file: "scouts/saas_scout.png", skin: [255, 220, 177], shirt: [6, 182, 212], pants: [21, 94, 117], accent: [103, 232, 249] },
  { file: "scouts/amazon_scout.png", skin: [210, 180, 140], shirt: [251, 146, 60], pants: [154, 52, 18], accent: [253, 186, 116] },
];

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function writePng(path: string, width: number, height: number, rgba: Uint8Array): void {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * stride + 1 + x * 4;
      raw[di] = rgba[si];
      raw[di + 1] = rgba[si + 1];
      raw[di + 2] = rgba[si + 2];
      raw[di + 3] = rgba[si + 3];
    }
  }

  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

function setPixel(
  buf: Uint8Array,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255
): void {
  if (x < 0 || y < 0 || x >= width) return;
  const i = (y * width + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
}

function fillRect(
  buf: Uint8Array,
  width: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number],
  a = 255
): void {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      setPixel(buf, width, px, py, color[0], color[1], color[2], a);
    }
  }
}

function drawFrame(
  buf: Uint8Array,
  sheetWidth: number,
  frameIndex: number,
  spec: CharacterSpec,
  pose: "idle" | "walk1" | "walk2" | "work"
): void {
  const ox = frameIndex * FRAME_W;
  const legOffset = pose === "walk1" ? 1 : pose === "walk2" ? -1 : 0;
  const armUp = pose === "work";

  fillRect(buf, sheetWidth, ox + 11, 8, 10, 10, spec.skin);
  fillRect(buf, sheetWidth, ox + 12, 6, 8, 3, spec.accent);
  fillRect(buf, sheetWidth, ox + 10, 18, 12, 14, spec.shirt);
  fillRect(buf, sheetWidth, ox + 8, 20, 4, 8, spec.shirt);
  fillRect(buf, sheetWidth, ox + 20, 20, 4, 8, spec.shirt);

  if (armUp) {
    fillRect(buf, sheetWidth, ox + 6, 16, 4, 10, spec.shirt);
    fillRect(buf, sheetWidth, ox + 22, 16, 4, 10, spec.shirt);
  } else {
    fillRect(buf, sheetWidth, ox + 7, 22 + legOffset, 5, 12, spec.pants);
    fillRect(buf, sheetWidth, ox + 20, 22 - legOffset, 5, 12, spec.pants);
    fillRect(buf, sheetWidth, ox + 8, 34 + legOffset, 4, 4, spec.pants);
    fillRect(buf, sheetWidth, ox + 21, 34 - legOffset, 4, 4, spec.pants);
  }

  if (!armUp) {
    fillRect(buf, sheetWidth, ox + 7, 22 + legOffset, 5, 12, spec.pants);
    fillRect(buf, sheetWidth, ox + 20, 22 - legOffset, 5, 12, spec.pants);
    fillRect(buf, sheetWidth, ox + 8, 34 + legOffset, 4, 4, spec.pants);
    fillRect(buf, sheetWidth, ox + 21, 34 - legOffset, 4, 4, spec.pants);
  } else {
    fillRect(buf, sheetWidth, ox + 9, 32, 5, 12, spec.pants);
    fillRect(buf, sheetWidth, ox + 18, 32, 5, 12, spec.pants);
    fillRect(buf, sheetWidth, ox + 10, 42, 4, 4, spec.pants);
    fillRect(buf, sheetWidth, ox + 19, 42, 4, 4, spec.pants);
  }
}

function generateSheet(spec: CharacterSpec): void {
  const width = FRAME_W * FRAMES;
  const height = FRAME_H;
  const buf = new Uint8Array(width * height * 4);

  drawFrame(buf, width, 0, spec, "idle");
  drawFrame(buf, width, 1, spec, "walk1");
  drawFrame(buf, width, 2, spec, "walk2");
  drawFrame(buf, width, 3, spec, "work");

  const outDir = resolve("public/hq/sprites");
  mkdirSync(resolve(outDir, "scouts"), { recursive: true });
  writePng(resolve(outDir, spec.file), width, height, buf);
}

function main(): void {
  for (const spec of [...EXECUTIVES, ...SCOUTS]) {
    generateSheet(spec);
    console.log(`Generated ${spec.file}`);
  }
  console.log("All HQ sprite sheets generated.");
}

main();
