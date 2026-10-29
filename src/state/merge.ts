/**
 * Three way merge for the shared game state. Two phones edit at the same time, so "the last save wins" would drop
 * one of them. Given what both started from (base), what this phone has (local) and what the server has (remote),
 * this keeps both phones' changes: counters add up, lists of things with ids combine, and only a true clash on one
 * plain value falls back to the server's value. Pure and generic, so it can be tested without a browser.
 */
type J = unknown;
type Obj = Record<string, J>;

/**
 * Numbers that are counted up and down by actions, so two phones' changes should be added together.
 * `*` stands for any key and `[]` for an item of a list. Every other number takes the larger value, which is right
 * for times (glowUntil), sizes (islandSize) and best scores (mgBest).
 */
const COUNTERS = [
  'coins', 'gems', 'xp', 'shells', 'driftwood', 'ingredients', 'blindBoxes', 'arcadeTokens', 'eventTokens',
  'approvedCount', 'notesOpened', 'vault.coins', 'bidStats.sent', 'bidStats.turned', 'bottleCredits.*',
  'fauna.*', 'figures.*', 'inventory[].count',
  'today.questCoins', 'today.quests', 'today.tokens', 'today.mgCoins', 'today.wells', // reset by day, see below
  'cafe.popularity', 'cafe.rushes', 'cafe.latte.n', 'cafe.gacha.n', 'cafe.gacha.pity', 'cafe.lab.daily.n', // today's Lab experiments (its own object, so a new day never replaces the recipes)
  'cafe.crew.*.xp', 'cafe.crew.*.cozy', // two phones each giving a Mentor moment or a treat both count (cozy is clamped to 100 when the game loads)
];
// a `*` stands for exactly one key, anywhere in the path
const COUNTER_RES = COUNTERS.map((c) => new RegExp(`^${c.split('*').map((p) => p.replace(/[.\\[\]]/g, '\\$&')).join('[^.]+')}$`));
const isCounter = (path: string) => COUNTER_RES.some((re) => re.test(path));

const isObj = (v: J): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const same = (a: J, b: J) => a === b || JSON.stringify(a) === JSON.stringify(b);
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function merge3<T>(base: T, local: T, remote: T): T {
  return walk(base, local, remote, '') as T;
}

function walk(base: J, local: J, remote: J, path: string): J {
  if (same(local, base)) return clone(remote);
  if (same(remote, base)) return clone(local);
  if (typeof local === 'number' && typeof remote === 'number') {
    if (isCounter(path)) { // two phones that each added one did two things, even if the totals match
      const b = typeof base === 'number' ? base : 0;
      return Math.max(0, b + (local - b) + (remote - b)); // never below zero
    }
    return Math.max(local, remote);
  }
  if (same(local, remote)) return clone(local);
  if (Array.isArray(local) && Array.isArray(remote)) return mergeList(Array.isArray(base) ? base : [], local, remote, path);
  if (isObj(local) && isObj(remote)) return mergeObj(isObj(base) ? base : {}, local, remote, path);
  return clone(remote); // a real clash on one plain value: the server's value stands
}

function mergeObj(base: Obj, local: Obj, remote: Obj, path: string): Obj {
  // a daily record (today, latte, gacha, event) that rolled over on one phone: the newer day replaces the older one
  if (typeof local.day === 'string' && typeof remote.day === 'string' && local.day !== remote.day) return clone(local.day > remote.day ? local : remote);
  const out: Obj = {};
  const keys = new Set([...Object.keys(remote), ...Object.keys(local)]);
  for (const k of keys) {
    const inL = k in local, inR = k in remote, inB = k in base;
    const sub = path ? `${path}.${k}` : k;
    if (inL && inR) out[k] = walk(base[k], local[k], remote[k], sub);
    else if (inL) { if (!inB || !same(local[k], base[k])) out[k] = clone(local[k]); } // added or edited here, else removed there
    else if (inR) { if (!inB || !same(remote[k], base[k])) out[k] = clone(remote[k]); }
  }
  return out;
}

/** What identifies a list item: its id when it has one, else its whole content (so a list of strings acts as a set). */
const keyOf = (v: J) => (isObj(v) && typeof v.id === 'string' ? `id:${v.id}` : `v:${JSON.stringify(v)}`);

function mergeList(base: J[], local: J[], remote: J[], path: string): J[] {
  const b = new Map(base.map((v) => [keyOf(v), v])), l = new Map(local.map((v) => [keyOf(v), v])), r = new Map(remote.map((v) => [keyOf(v), v]));
  const out: J[] = [];
  const seen = new Set<string>();
  const take = (k: string) => {
    seen.add(k);
    const inB = b.has(k), inL = l.has(k), inR = r.has(k);
    if (inL && inR) return out.push(walk(b.get(k), l.get(k), r.get(k), `${path}[]`));
    if (inL) { // not on the server: new here, or deleted there
      if (!inB) return out.push(clone(l.get(k)));
      if (!same(l.get(k), b.get(k))) return out.push(clone(l.get(k))); // edited here beats a delete there
      return;
    }
    if (inR) {
      if (!inB) return out.push(clone(r.get(k)));
      if (!same(r.get(k), b.get(k))) return out.push(clone(r.get(k)));
    }
  };
  for (const v of remote) if (!seen.has(keyOf(v))) take(keyOf(v)); // the server's order first
  for (const v of local) if (!seen.has(keyOf(v))) take(keyOf(v)); // then what is only here
  if (path === 'messages') out.sort((x, y) => ((x as { ts: number }).ts ?? 0) - ((y as { ts: number }).ts ?? 0));
  return out;
}
