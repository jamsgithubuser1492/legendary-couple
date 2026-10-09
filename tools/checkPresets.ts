// Verifies every room preset fits on an empty island and lists any problem. Run via npm run check:presets
import { PRESETS } from '../src/state/presets';
import { canPlacePreset } from '../src/state/placement';
import { itemOf } from '../src/state/catalog';
import type { GameState } from '../src/types';

const empty = { placed: [], inventory: [], memories: [], avatars: { A: { x: 0, y: 0 }, B: { x: 0, y: 0 } } } as unknown as GameState;
let bad = 0;
for (const p of PRESETS) {
  for (const i of p.items) if (!itemOf(i.itemId)) { console.log(`UNKNOWN ITEM ${i.itemId} in ${p.id}`); bad++; }
  // the island is 10 x 10 and the starter spot is tile 4,4, so find any anchor where it fits
  let fit: string | null = null;
  for (let x = 0; x <= 10 - p.w && !fit; x++) for (let y = 0; y <= 10 - p.d && !fit; y++) if (canPlacePreset(empty, p, x, y).ok) fit = `${x},${y}`;
  const bounds = p.items.every((i) => i.dx < p.w && i.dy < p.d);
  console.log(`${p.id.padEnd(18)} ${p.w}x${p.d}  fits at ${fit ?? 'NOWHERE'}  inside its footprint: ${bounds}`);
  if (!fit || !bounds) bad++;
}
process.exit(bad ? 1 : 0);
