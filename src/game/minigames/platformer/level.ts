/**
 * Pastel Co-op Dash, level 1: "The Apple Orchard Pier". Pure data and physics (no Phaser), so the scene stays small and
 * the whole level can be checked with a headless run (tools/platformer_check.ts).
 *
 * Units are pixels. The world is 3200 wide and 540 tall, ground top at GY.
 */
export const WORLD_W = 3200;
export const GY = 430; // ground top
export const KILL_Y = 585; // below this you fall into the sea and float back up in a bubble
export const BW = 26; // body width
export const BH = 40; // body height

export interface Rect { x: number; y: number; w: number; h: number; oneWay?: boolean; bounce?: boolean; id?: number }
const R = (x: number, y: number, w: number, h: number, o: Partial<Rect> = {}): Rect => ({ x, y, w, h, ...o });

/** Ground and platforms. One way platforms can be jumped up through. Boxes and blocks are solid. */
export const GROUND: Rect[] = [
  R(0, GY, 620, 110),
  R(780, GY, 460, 110),
  R(1440, GY, 720, 110), // runs on to the bridge bank
  R(2520, GY, 680, 110),
];
export const PLATFORMS: Rect[] = [
  R(880, 360, 80, 14, { oneWay: true }), // orchard steps
  R(1000, 295, 90, 14, { oneWay: true }),
  R(1120, 360, 80, 14, { oneWay: true }),
  R(1290, 385, 80, 14, { oneWay: true }), // tea saucer over the second gap
  R(1560, 365, 110, 14, { oneWay: true }), // stacked books under Gudetama
  R(1650, 200, 110, 14, { oneWay: true }), // secret high shelf
  R(1780, 340, 80, 14, { oneWay: true }),
  R(2050, 315, 85, 14, { oneWay: true }), // the yellow bow lever shelf
  R(2100, 385, 60, 45), // a step block by the bridge (solid)
];
export const GUDETAMA: Rect[] = [R(1590, 343, 50, 22, { oneWay: true, bounce: true })];

export type BoxKind = 'bow' | 'apples' | 'crate';
export interface Box extends Rect { kind: BoxKind; id: number }
/** Sanrio gift boxes: bump one from below. */
export const BOXES: Box[] = [
  { id: 0, x: 1025, y: 205, w: 40, h: 40, kind: 'bow' },
  { id: 1, x: 1895, y: 255, w: 40, h: 40, kind: 'apples' },
  { id: 2, x: 2740, y: 255, w: 40, h: 40, kind: 'crate' },
  { id: 3, x: 2880, y: 255, w: 40, h: 40, kind: 'apples' },
];

/** The two co op levers, plates you stand on. Both held together lowers the drawbridge. */
export const PLATE_A = R(2000, GY - 12, 44, 12); // Kitty's red bow lever, on the ground
export const PLATE_B = R(2070, 315 - 12, 44, 12); // Miffy's yellow bow lever, up on the shelf
export const BRIDGE = R(2160, GY, 360, 14);
export const CHECKPOINT_X = 1700;
export const FINISH = R(3000, GY - 150, 110, 150);
export const SPAWN = { A: 120, B: 70 };
export const METER_FILL = 1.6; // seconds with both levers held

export interface Boba { a: number; b: number; speed: number; phase: number; r: number }
export const BOBAS: Boba[] = [
  { a: 1740, b: 1930, speed: 70, phase: 0, r: 17 },
  { a: 1790, b: 1950, speed: 85, phase: 400, r: 17 },
];
/** Rolling boba pearls move on a fixed schedule, so every phone agrees without sending anything. */
export function bobaX(b: Boba, t: number): number {
  const len = b.b - b.a;
  const d = (t * b.speed + b.phase) % (2 * len);
  return b.a + (d < len ? d : 2 * len - d);
}

export type Pickup = { id: number; x: number; y: number; kind: 'apple' | 'crate'; bridge?: boolean };
function buildPickups(): Pickup[] {
  const out: Pickup[] = [];
  const add = (x: number, y: number, kind: Pickup['kind'] = 'apple', bridge = false) => out.push({ id: out.length, x, y, kind, bridge: bridge || undefined });
  const row = (x0: number, x1: number, y: number, step = 50) => { for (let x = x0; x <= x1; x += step) add(x, y); };
  row(160, 410, GY - 28); // the bakery gate
  [[650, 380], [685, 352], [705, 342], [725, 352], [758, 380]].forEach(([x, y]) => add(x, y)); // the first jump
  row(820, 880, GY - 28);
  row(890, 940, 330, 40); row(1010, 1070, 265, 30); row(1130, 1180, 330, 40);
  [[1262, 355], [1300, 350], [1335, 355]].forEach(([x, y]) => add(x, y));
  row(1460, 1540, GY - 28, 40);
  row(1575, 1620, 335, 45);
  row(1670, 1740, 170, 35); add(1705, 160, 'crate');
  row(1790, 1850, 310, 30);
  row(1930, 2000, GY - 28, 35);
  row(2110, 2150, 355, 40); row(2060, 2120, 285, 30);
  for (let x = 2205; x <= 2475; x += 54) add(x, GY - 34, 'apple', true); // the bridge shower
  add(2340, 340, 'crate', true);
  row(2560, 2720, GY - 28, 40);
  row(2800, 2860, 330, 30);
  row(2940, 3000, GY - 28, 30);
  return out;
}
export const PICKUPS: Pickup[] = buildPickups();
export const CRATES_TOTAL = PICKUPS.filter((p) => p.kind === 'crate').length + BOXES.filter((b) => b.kind === 'crate').length;
export const APPLES_TOTAL = PICKUPS.filter((p) => p.kind === 'apple').length + 3 * BOXES.filter((b) => b.kind === 'apples').length;

// ---------------------------------------------------------------------------------------------------------------
// Physics

export const SPEED = 230;
const ACCEL = 2200;
const GRAV = 1500;
const JUMP_V = 560;
const GLIDE_V = 95;
const GLIDE_MAX = 0.55;
export const BOUNCE_V = 780;

export interface Body {
  x: number; // centre
  y: number; // feet
  vx: number;
  vy: number;
  face: 1 | -1;
  ground: boolean;
  gliding: boolean;
  coyote: number;
  buffer: number;
  glideLeft: number;
  jumpHeld: boolean;
  invuln: number;
  ai?: number; // Mochi's own note to self: 1 once she is up on the step block
}
export const newBody = (x: number): Body => ({ x, y: GY, vx: 0, vy: 0, face: 1, ground: true, gliding: false, coyote: 0, buffer: 0, glideLeft: GLIDE_MAX, jumpHeld: false, invuln: 0 });
export interface Input { left: boolean; right: boolean; jump: boolean }
export interface StepEvents { bumped?: Box; bounced?: boolean; jumped?: boolean }

const solidsFor = (bridge: boolean): Rect[] => [...GROUND, ...PLATFORMS, ...GUDETAMA, ...BOXES, ...(bridge ? [BRIDGE] : [])];

export function step(b: Body, inp: Input, dt: number, bridge: boolean): StepEvents {
  const ev: StepEvents = {};
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (dir) b.face = dir as 1 | -1;
  const target = dir * SPEED;
  const acc = ACCEL * dt;
  b.vx = b.vx < target ? Math.min(target, b.vx + acc) : Math.max(target, b.vx - acc);

  const pressed = inp.jump && !b.jumpHeld;
  b.jumpHeld = inp.jump;
  b.buffer = pressed ? 0.12 : Math.max(0, b.buffer - dt);
  b.coyote = b.ground ? 0.1 : Math.max(0, b.coyote - dt);
  b.invuln = Math.max(0, b.invuln - dt);
  if (b.buffer > 0 && b.coyote > 0) {
    b.vy = -JUMP_V;
    b.buffer = 0;
    b.coyote = 0;
    b.ground = false;
    b.glideLeft = GLIDE_MAX;
    ev.jumped = true;
  }
  b.vy += GRAV * dt * (b.vy < 0 && !inp.jump ? 2.3 : 1); // let go early for a shorter hop
  b.gliding = false;
  if (!b.ground && b.vy > GLIDE_V && inp.jump && b.glideLeft > 0) {
    b.vy = GLIDE_V; // the bow glide
    b.glideLeft -= dt;
    b.gliding = true;
  }
  b.vy = Math.min(b.vy, 900);

  const solids = solidsFor(bridge);
  // sideways
  b.x += b.vx * dt;
  b.x = Math.max(BW / 2, Math.min(WORLD_W - BW / 2, b.x));
  for (const s of solids) {
    if (s.oneWay) continue;
    if (b.x + BW / 2 > s.x && b.x - BW / 2 < s.x + s.w && b.y > s.y + 2 && b.y - BH < s.y + s.h) {
      if (b.vx > 0 || b.x < s.x + s.w / 2) b.x = s.x - BW / 2;
      else b.x = s.x + s.w + BW / 2;
      b.vx = 0;
    }
  }
  // vertical
  const prevY = b.y;
  b.y += b.vy * dt;
  b.ground = false;
  for (const s of solids) {
    if (b.x + BW / 2 <= s.x + 1 || b.x - BW / 2 >= s.x + s.w - 1) continue;
    if (b.vy >= 0 && prevY <= s.y + 1 && b.y >= s.y) {
      b.y = s.y;
      if (s.bounce) {
        b.vy = -BOUNCE_V;
        b.glideLeft = GLIDE_MAX;
        ev.bounced = true;
      } else {
        b.vy = 0;
        b.ground = true;
        b.glideLeft = GLIDE_MAX;
      }
    } else if (!s.oneWay && b.vy < 0 && prevY - BH >= s.y + s.h - 1 && b.y - BH < s.y + s.h) {
      b.y = s.y + s.h + BH;
      b.vy = 0;
      if ((s as Box).kind) ev.bumped = s as Box;
    }
  }
  return ev;
}

export const onPlate = (b: Body, p: Rect) => b.ground && Math.abs(b.y - (p.y + p.h)) < 3 && b.x > p.x - 6 && b.x < p.x + p.w + 6;
export const bodyBox = (b: Body) => ({ l: b.x - BW / 2, r: b.x + BW / 2, t: b.y - BH, b: b.y });

// ---------------------------------------------------------------------------------------------------------------
// Mochi, the practice partner

export interface BotCtx { human: Body; humanOnPlate: 0 | 1 | 2; bridge: boolean; humanBubbled: boolean; bubble?: { x: number; y: number } | null; t: number }

/** Walks to a spot, hops what is in the way, and stands on whichever lever the human is not using. */
export function botInput(me: Body, ctx: BotCtx, prefer?: 1 | 2): Input {
  const { human } = ctx;
  let tx = human.x - 36 * human.face;
  const nearBridge = !ctx.bridge && me.x > 1850 && me.x < 2200 && human.x > 1850 && human.x < 2200;
  let plateTarget = false;
  let atLever = false;
  if (nearBridge) {
    const want = prefer ?? (ctx.humanOnPlate === 1 ? 2 : ctx.humanOnPlate === 2 ? 1 : Math.abs(human.x - 2022) < Math.abs(human.x - 2092) ? 2 : 1);
    tx = want === 1 ? PLATE_A.x + PLATE_A.w / 2 : PLATE_B.x + PLATE_B.w / 2;
    // the yellow lever is up on the shelf: climb the step block first
    if (me.ground && me.y > 330 && me.y < 400 && me.x >= 2095) me.ai = 1;
    if (me.ground && me.y < 330) me.ai = 1; // already up on the shelf
    if (me.ground && me.y > 420) me.ai = 0;
    const staged = want === 2 && me.ai !== 1;
    if (want === 2 && me.ai === 1 && me.y > 330) tx = 2118; // hop straight up from the step block onto the shelf
    if (staged) tx = 2135;
    plateTarget = true;
    atLever = !staged && Math.abs(tx - me.x) <= 10 && (want === 1 ? me.y > 400 : me.y < 330);
  }
  if (ctx.humanBubbled && ctx.bubble) tx = ctx.bubble.x;
  const dx = tx - me.x;
  const inp: Input = { left: dx < -10, right: dx > 10, jump: false };
  if (atLever) return inp; // wait on the lever
  const dir = Math.sign(dx);
  const ahead = me.x + dir * 40;
  const solids = solidsFor(ctx.bridge);
  const floorAt = (x: number) => solids.some((s) => x > s.x && x < s.x + s.w && s.y >= me.y - 4 && s.y <= me.y + 4);
  // jump at a ledge, at a wall, or to climb to a target above
  const gapAhead = me.ground && dir !== 0 && !floorAt(ahead) && !floorAt(me.x + dir * 12);
  const wall = me.ground && dir !== 0 && solids.some((s) => !s.oneWay && !s.bounce && ahead > s.x && ahead < s.x + s.w && s.y < me.y - 6 && s.y > me.y - 90);
  const above = (plateTarget ? (tx > 2050 ? 315 : GY) : ctx.humanBubbled && ctx.bubble ? ctx.bubble.y : human.y) < me.y - 40;
  const stepUp = plateTarget && me.ai === 1 && me.y > 330;
  const climb = me.ground && above && Math.abs(dx) < (stepUp ? 16 : 120) && (me.x > 860 || plateTarget);
  const boba = BOBAS.some((b) => Math.abs(bobaX(b, ctx.t) - me.x) < 70 && me.y > GY - 6);
  // hold the jump on the way down so it can glide over a gap
  inp.jump = gapAhead || wall || climb || boba || (!me.ground && (me.vy > -100 || me.gliding) && Math.abs(dx) > 30) || (!me.ground && me.vy < 0 && me.jumpHeld);
  if (me.ground && (me.jumpHeld || (!gapAhead && !wall && !climb && !boba))) inp.jump = false; // let go between hops so every jump is a fresh press
  return inp;
}
