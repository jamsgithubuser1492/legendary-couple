// Headless check: two bots play Pastel Co-op Dash level 1 and must reach the archway together.
// Run:  npx esbuild tools/platformer_check.ts --bundle --platform=node --outfile=/tmp/pc.cjs && node /tmp/pc.cjs
import { BOBAS, BOXES, bobaX, botInput, GY, KILL_Y, newBody, onPlate, PICKUPS, PLATE_A, PLATE_B, step, FINISH, BW, type Body } from '../src/game/minigames/platformer/level';

const dt = 1 / 60;
function run(seed: number) {
  const A = newBody(120), B = newBody(70);
  let bridge = false, meter = 0, t = 0, falls = 0, traps = 0, bubA = 0, bubB = 0;
  let log = '';
  const bub: Record<string, number> = { A: 0, B: 0 };
  const bodies: Record<string, Body> = { A, B };
  for (let i = 0; i < 60 * 120; i++) {
    t += dt;
    const plA = onPlate(A, PLATE_A) ? 1 : onPlate(B, PLATE_A) ? 1 : 0;
    const aOn: 0 | 1 | 2 = onPlate(A, PLATE_A) ? 1 : onPlate(A, PLATE_B) ? 2 : 0;
    const bOn: 0 | 1 | 2 = onPlate(B, PLATE_A) ? 1 : onPlate(B, PLATE_B) ? 2 : 0;
    void plA;
    const both = (aOn === 1 && bOn === 2) || (aOn === 2 && bOn === 1);
    if (!bridge) { meter = both ? Math.min(1.6, meter + dt) : Math.max(0, meter - dt * 0.5); if (meter >= 1.6) bridge = true; }
    for (const id of ['A', 'B'] as const) {
      const me = bodies[id], other = bodies[id === 'A' ? 'B' : 'A'];
      if (bub[id] > 0) {
        // bubble drifts toward the partner; popped when touching
        me.x += Math.sign(other.x - me.x) * 70 * dt; me.y += (other.y - 40 - me.y) * 0.8 * dt; me.vy = 0; me.vx = 0;
        if (Math.hypot(me.x - other.x, me.y - 20 - (other.y - 20)) < 40 || (bub[id === 'A' ? 'B' : 'A'] > 0 && Math.hypot(me.x - other.x, me.y - other.y) < 40)) { bub[id] = 0; me.invuln = 1.2; me.vy = -300; }
        continue;
      }
      const lead = id === 'A';
      const human: Body = lead ? { ...other, x: bridge || me.x < 1850 ? me.x + 150 : me.x, y: me.y, face: 1 } : other;
      const inp = botInput(me, { human, humanOnPlate: id === 'A' ? bOn : aOn, bridge, humanBubbled: bub[id === 'A' ? 'B' : 'A'] > 0, bubble: bub[id === 'A' ? 'B' : 'A'] > 0 ? { x: other.x, y: other.y } : null, t }, id === 'A' ? 1 : 2);
      step(me, inp, dt, bridge);
      if (me.y > KILL_Y) { bub[id] = 1; falls++; me.y = 480; log += `fall ${id}@${me.x | 0} `; }
      else if (me.invuln <= 0 && BOBAS.some((b) => Math.abs(bobaX(b, t) - me.x) < BW / 2 + b.r && me.y > GY - b.r * 2)) { bub[id] = 1; traps++; log += `boba ${id}@${me.x | 0} `; }
    }
    const inFin = (b: Body) => b.x > FINISH.x && b.x < FINISH.x + FINISH.w && b.ground;
    if (inFin(A) && inFin(B)) return { ok: true, t: +t.toFixed(1), falls, traps, bridge, log };
  }
  return { ok: false, t, falls, traps, bridge, A: [A.x | 0, A.y | 0], B: [B.x | 0, B.y | 0], log };
}
console.log(JSON.stringify(run(1)));
console.log('pickups', PICKUPS.length, 'boxes', BOXES.length);
