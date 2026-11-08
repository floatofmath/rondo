// Generates the PNG app icons in public/ with no image dependencies.
// The design is a dark tile with a yellow Time Timer style sector. Run: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [20, 20, 28];
const RING = [58, 58, 74];
const ACCENT = [255, 200, 40];

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

function colourAt(x, y, size) {
  const dx = x + 0.5 - size / 2;
  const dy = y + 0.5 - size / 2;
  const r = Math.hypot(dx, dy) / size;
  if (r > 0.36) return r < 0.385 ? RING : BG;
  // Clockwise angle from 12 o'clock, 0..1. The sector covers the last 70 %.
  const angle = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
  return angle >= 0.3 ? ACCENT : RING;
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let i = 0;
  for (let y = 0; y < size; y++) {
    raw[i++] = 0;
    for (let x = 0; x < size; x++) {
      for (const v of colourAt(x, y, size)) raw[i++] = v;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB, no alpha: iOS renders transparent icon pixels as black
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/apple-touch-icon.png', png(180));
writeFileSync('public/icon-192.png', png(192));
writeFileSync('public/icon-512.png', png(512));
