import Phaser from 'phaser';

/** Floors are painted procedurally so neighbouring tiles join with no seams, bevels or grid lines. */
export type FloorKind = 'planks' | 'tiles' | 'checker' | 'sand';
export interface FloorStyle {
  kind: FloorKind;
  a: number;
  b: number;
  grout: number;
  strips?: number;
}

const planks = (a: number, b: number, grout: number, strips = 4): FloorStyle => ({ kind: 'planks', a, b, grout, strips });

export const FLOOR_STYLES: Record<string, FloorStyle> = {
  floor_wood: planks(0xeccfa4, 0xdcb98a, 0xc29a68, 4),
  floor_pink: { kind: 'tiles', a: 0xffe3ea, b: 0xffd6e0, grout: 0xf4bccb },
  floor_checker: { kind: 'checker', a: 0xfff6ee, b: 0xf6b9c9, grout: 0xe8a0b4 },
  floor_wood_plank: planks(0xf0cfa0, 0xe6c08c, 0xcfa670, 6),
  floor_cream_stone: { kind: 'tiles', a: 0xf6ead6, b: 0xefdfc4, grout: 0xdcc8a6 },
  floor_terracotta: { kind: 'tiles', a: 0xe08a68, b: 0xd67c5a, grout: 0xbf6446 },
  bw_light: planks(0xe8d8bc, 0xdccaa8, 0xc3aa86, 5),
  bw_light2: planks(0xeadfc8, 0xdfd0b2, 0xc8b690, 5),
  bw_coral: planks(0xe49a82, 0xd8886e, 0xb86e58, 4),
  bw_dark: planks(0x8a6f5c, 0x7c624f, 0x5c4637, 5),
  bw_brown: planks(0xa88364, 0x9a7658, 0x7a5a42, 5),
  bw_green: planks(0x9ec4b0, 0x8cb49f, 0x6f9684, 4),
  bw_coral2: planks(0xe8a88a, 0xd89478, 0xb87762, 4),
  bw_sand: { kind: 'sand', a: 0xf0dcaa, b: 0xe6cf96, grout: 0xd8bf84 },
};

export const FLOOR_W = 132;
export const FLOOR_H = 68;
export const FLOOR_VARIANTS = 3;
const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const tweak = (c: number, f: number) => {
  const m = (s: number) => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * f)));
  return (m(16) << 16) | (m(8) << 8) | m(0);
};
const seeded = (seed: number) => {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/** Paints one tile of floor. Tile space (u, v) in 0..1 maps onto the isometric diamond. */
export function paintFloor(c: CanvasRenderingContext2D, st: FloorStyle, variant: number): void {
  const cx = FLOOR_W / 2, cy = FLOOR_H / 2;
  const rnd = seeded(variant * 7919 + st.a);
  c.clearRect(0, 0, FLOOR_W, FLOOR_H);
  c.save();
  c.beginPath(); // a hair larger than the tile so neighbours overlap instead of leaving cracks
  c.moveTo(cx, cy - 33.6);
  c.lineTo(cx + 66, cy);
  c.lineTo(cx, cy + 33.6);
  c.lineTo(cx - 66, cy);
  c.closePath();
  c.clip();
  c.setTransform(64, 32, -64, 32, cx, cy - 32);
  const O = 0.04; // bleed past the tile edge
  if (st.kind === 'planks') {
    const n = st.strips ?? 4;
    for (let k = 0; k < n; k++) {
      const col = tweak((k + variant) % 2 ? st.a : st.b, 0.97 + rnd() * 0.06);
      c.fillStyle = css(col);
      c.fillRect(-O, k / n - (k === 0 ? O : 0), 1 + 2 * O, 1 / n + (k === 0 || k === n - 1 ? O : 0.002));
      c.strokeStyle = css(0x000000, 0.045);
      c.lineWidth = 0.006;
      for (let g = 0; g < 3; g++) {
        const y = k / n + (0.15 + rnd() * 0.7) / n;
        c.beginPath();
        c.moveTo(rnd() * 0.4 - O, y);
        c.lineTo(0.6 + rnd() * 0.4 + O, y);
        c.stroke();
      }
      if (k > 0) {
        c.strokeStyle = css(st.grout, 0.75);
        c.lineWidth = 0.013;
        c.beginPath();
        c.moveTo(-O, k / n);
        c.lineTo(1 + O, k / n);
        c.stroke();
      }
      const seam = 0.25 + rnd() * 0.5;
      c.strokeStyle = css(st.grout, 0.6);
      c.lineWidth = 0.009;
      c.beginPath();
      c.moveTo(seam, k / n);
      c.lineTo(seam, (k + 1) / n);
      c.stroke();
    }
  } else if (st.kind === 'tiles' || st.kind === 'checker') {
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const alt = (i + j) % 2 === 0;
        c.fillStyle = css(st.kind === 'checker' ? (alt ? st.a : st.b) : tweak(alt ? st.a : st.b, 0.98 + rnd() * 0.04));
        c.fillRect(i / 2 - O, j / 2 - O, 0.5 + 2 * O, 0.5 + 2 * O);
      }
    c.strokeStyle = css(st.grout, st.kind === 'checker' ? 0.0 : 0.85);
    c.lineWidth = 0.016;
    for (const t of [0, 0.5]) {
      c.beginPath();
      c.moveTo(t, -O);
      c.lineTo(t, 1 + O);
      c.stroke();
      c.beginPath();
      c.moveTo(-O, t);
      c.lineTo(1 + O, t);
      c.stroke();
    }
  } else {
    c.fillStyle = css(st.a);
    c.fillRect(-O, -O, 1 + 2 * O, 1 + 2 * O);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = css(rnd() > 0.5 ? st.b : st.grout, 0.5);
      c.fillRect(rnd(), rnd(), 0.012, 0.012);
    }
  }
  c.restore();
}

export const floorKey = (id: string, variant: number) => `floor:${id}:${variant}`;

/** Creates the textures once. */
export function ensureFloorTextures(scene: Phaser.Scene): void {
  for (const [id, st] of Object.entries(FLOOR_STYLES))
    for (let v = 0; v < FLOOR_VARIANTS; v++) {
      const key = floorKey(id, v);
      if (scene.textures.exists(key)) continue;
      const tex = scene.textures.createCanvas(key, FLOOR_W, FLOOR_H);
      if (!tex) continue;
      paintFloor(tex.getContext(), st, v);
      tex.refresh();
    }
}

const icons = new Map<string, string>();
/** A small picture of a floor for shop cards. */
export function floorIconUrl(id: string): string | null {
  const st = FLOOR_STYLES[id];
  if (!st) return null;
  if (icons.has(id)) return icons.get(id)!;
  const c = document.createElement('canvas');
  c.width = FLOOR_W;
  c.height = FLOOR_H;
  paintFloor(c.getContext('2d')!, st, 0);
  const url = c.toDataURL();
  icons.set(id, url);
  return url;
}
