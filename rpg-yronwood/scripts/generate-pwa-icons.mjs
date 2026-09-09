import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BG = [0x14, 0x18, 0x1c];
const GOLD = [0xc4, 0xa5, 0x74];
const GEM = [0xe8, 0xc9, 0x8c];

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let b = 0; b < 8; b++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgbaRows) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    const row = rgbaRows[y];
    for (let x = 0; x < width; x++) {
      const i = x * 3;
      raw[offset++] = row[i];
      raw[offset++] = row[i + 1];
      raw[offset++] = row[i + 2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function inSquare(nx, ny, half) {
  return Math.max(Math.abs(nx), Math.abs(ny)) <= half;
}

function inDiamond(nx, ny, half) {
  return Math.abs(nx) + Math.abs(ny) <= half * Math.SQRT2;
}

function inStar(nx, ny, half) {
  return inSquare(nx, ny, half) || inDiamond(nx, ny, half);
}

function sample(nx, ny, half) {
  const outer = inStar(nx, ny, half);
  const hole = inStar(nx, ny, half * 0.52);
  const gem = inDiamond(nx, ny, half * 0.28);
  if (gem) return GEM;
  if (outer && !hole) return GOLD;
  return BG;
}

function renderIcon(size) {
  const scale = 2;
  const ss = size * scale;
  const cx = (ss - 1) / 2;
  const cy = (ss - 1) / 2;
  const half = ss * 0.28;
  const hi = Buffer.alloc(ss * ss * 3);

  for (let y = 0; y < ss; y++) {
    for (let x = 0; x < ss; x++) {
      const color = sample(x - cx, y - cy, half);
      const i = (y * ss + x) * 3;
      hi[i] = color[0];
      hi[i + 1] = color[1];
      hi[i + 2] = color[2];
    }
  }

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 3);
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let oy = 0; oy < scale; oy++) {
        for (let ox = 0; ox < scale; ox++) {
          const i = ((y * scale + oy) * ss + (x * scale + ox)) * 3;
          r += hi[i];
          g += hi[i + 1];
          b += hi[i + 2];
        }
      }
      const n = scale * scale;
      const i = x * 3;
      row[i] = Math.round(r / n);
      row[i + 1] = Math.round(g / n);
      row[i + 2] = Math.round(b / n);
    }
    rows.push(row);
  }

  return encodePng(size, size, rows);
}

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(publicDir, { recursive: true });

const outputs = [
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

for (const [name, size] of outputs) {
  const file = join(publicDir, name);
  writeFileSync(file, renderIcon(size));
  console.log(`wrote ${name} (${size}x${size})`);
}
