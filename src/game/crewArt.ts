/**
 * Key helpers for the café crew art, so the scene can ask for "Pip walking toward the camera carrying a tray" and
 * always get something that exists: loops fall back to a shorter loop, then to the still, then to the old staff art.
 *
 * Crew ids are the art ids (tan, pip, oren, juno, hana, kenji, maya, ollie). Walk art faces front left (f) or back
 * left (b); the right facing views are the same frames mirrored.
 */
import type { CrewDef } from '../state/crew';

export type View = 'fl' | 'fr' | 'bl' | 'br';
export type Has = (key: string) => boolean;

/** The legacy still staff sprites, for the first four hires, used when the new art is missing. */
const LEGACY: Record<string, string> = { tan: 'cy_staff_manager', pip: 'cy_staff_apprentice', oren: 'cy_staff_brewmaster', juno: 'cy_staff_petsitter' };

/** Which two extra emotes each person has on the sheet (idle and happy are common; glow is the halo tile). */
const EMOTES: Record<string, string[]> = {
  tan: ['idle', 'happy', 'proud', 'surprised'], pip: ['idle', 'happy', 'surprised', 'eating'], juno: ['idle', 'happy', 'shy', 'cheering'],
  oren: ['idle', 'happy', 'shy', 'sitting'], kenji: ['idle', 'happy', 'surprised', 'cheering'], maya: ['idle', 'happy', 'shy', 'eating'],
  ollie: ['idle', 'happy', 'proud', 'surprised'], hana: [],
};

/** One frame of a loop by its numbered keys: `${base}_1`, `${base}_2`, ... that exist. */
export function loop(has: Has, base: string, max = 6): string[] {
  const out: string[] = [];
  for (let i = 1; i <= max; i++) if (has(`${base}_${i}`)) out.push(`${base}_${i}`);
  return out;
}

/** Still art at a level and view. Undefined when nothing exists at all. */
export function still(has: Has, def: CrewDef, level: number, view: View): string | undefined {
  const lv = Math.min(3, Math.max(1, Math.round(level) || 1));
  for (const l of [lv, 1, 2, 3]) if (has(`crew_${def.id}_${l}_${view}`)) return `crew_${def.id}_${l}_${view}`;
  const legacy = LEGACY[def.id];
  if (legacy && has(`${legacy}_${view}`)) return `${legacy}_${view}`;
  return undefined;
}

// ---- level aware loops (crewl_<id>_<level>_<kind>_<n>) -------------------------------------------------------------
// The newest sheets draw every loop in the outfit of one level, so a crew member keeps their clothes while walking.
// The lookup order is: the same level, then the nearest other level (lower first on a tie), then the older one outfit
// loops (crewx_), then nothing (the caller falls back to the still).

export type Kind = 'walk_f' | 'walk_b' | 'carry_f' | 'carry_b';
const lv = (n: number) => Math.min(3, Math.max(1, Math.round(n) || 1));
/** The levels to try for a level: itself, then the nearest others, lower first on a tie. */
export function levelOrder(level: number): number[] {
  const l = lv(level);
  return [l, ...[1, 2, 3].filter((x) => x !== l).sort((x, y) => Math.abs(x - l) - Math.abs(y - l) || x - y)];
}
const cache = new WeakMap<Has, Map<string, string[]>>();
/** A loop by its base key, remembered per `has` function so a busy scene does not probe textures every step. */
function cachedLoop(has: Has, base: string, max: number): string[] {
  let m = cache.get(has);
  if (!m) cache.set(has, (m = new Map()));
  const hit = m.get(base);
  if (hit) return hit;
  const frames = loop(has, base, max);
  m.set(base, frames);
  return frames;
}
export const crewlBase = (id: string, level: number, kind: string) => `crewl_${id}_${level}_${kind}`;

/** Walk frames for a direction on screen: front when moving down the screen, back when moving up. With a tray the carry loop of the same level comes first. */
export function walkLoop(has: Has, def: CrewDef, side: 'f' | 'b', carry: boolean, level = 1): string[] {
  const order = levelOrder(level);
  for (const l of order) {
    const c = carry ? cachedLoop(has, crewlBase(def.id, l, `carry_${side}`), 4) : [];
    if (c.length >= 2) return c;
    const w = cachedLoop(has, crewlBase(def.id, l, `walk_${side}`), 4);
    if (w.length >= 2) return w;
  }
  const c = carry ? loop(has, `crewx_${def.id}_carry_${side}`) : [];
  if (c.length >= 2) return c;
  const w = loop(has, `crewx_${def.id}_walk_${side}`);
  if (w.length) return w;
  return c; // a single carry frame is better than nothing
}

/** The level an art loop was drawn for, read from its key (crewl_<id>_<level>_...), or 0 for the older loops. */
export const loopLevel = (key: string): number => Number(/^crewl_[a-z]+_(\d)_/.exec(key)?.[1] ?? 0);

/** The work loop for a view (the station prop is part of the sprite), or an empty list. */
export function workLoop(has: Has, def: CrewDef, view: View, level = 1): string[] {
  for (const l of workLevels(level)) {
    const f = cachedLoop(has, crewlBase(def.id, l, `work_${view}`), 4);
    if (f.length >= 2) return f;
  }
  return loop(has, `crewx_${def.id}_work_${view}`, 4);
}
/** The levels a work scene may come from: the crew member's own level, then lower ones. Work scenes show the whole outfit
 * and a counter, so a Level 1 apprentice never plays a scene drawn in the Expert jacket they have not earned yet. */
const workLevels = (level: number) => [lv(level), ...[lv(level) - 1, lv(level) - 2].filter((l) => l >= 1)];
export type WorkScene = { view: View; frames: string[]; station: string };
/** Stations a crew member can work at. '' is the default station (the first set of loops); the others are named in the key:
 * crewl_<id>_<level>_work_<station>_<view>_<n>. Juno has a pet shelf counter and a kneeling play scene, Oren the espresso bar. */
const STATIONS = ['', 'shelf', 'play'];
/** Every work scene for this crew member at their level: loops with two or more frames, or, when a level only has single
 * frame views (Juno with her pets at Level 1), the views one after another. */
export function workScenes(has: Has, def: CrewDef, level = 1): WorkScene[] {
  const out: WorkScene[] = [];
  const views = ['fl', 'fr', 'bl', 'br'] as View[];
  for (const st of STATIONS) {
    const base = (l: number, v: View) => crewlBase(def.id, l, st ? `work_${st}_${v}` : `work_${v}`);
    for (const l of workLevels(level)) {
      const loops = views.map((v) => ({ v, f: cachedLoop(has, base(l, v), 4) })).filter((x) => x.f.length >= 2);
      if (loops.length) {
        // prefer the longest loop, the front left view first on a tie
        loops.sort((x, y) => y.f.length - x.f.length);
        out.push({ view: loops[0].v, frames: loops[0].f, station: st });
        break;
      }
      const singles = views.map((v) => cachedLoop(has, base(l, v), 4)[0]).filter(Boolean) as string[];
      if (singles.length >= 2) { out.push({ view: 'fl', frames: singles.slice(0, 2), station: st }); break; }
    }
  }
  if (out.length) return out;
  const v = anyWorkView(has, def);
  return v ? [{ view: v, frames: workLoop(has, def, v, level), station: '' }] : [];
}
/** The first work scene (kept for callers that only need to know whether one exists). */
export function workScene(has: Has, def: CrewDef, level = 1): { view: View; frames: string[] } | undefined {
  return workScenes(has, def, level)[0];
}
/** A random work scene, so a crew member with two stations (Juno) does not always play the same one. */
export function pickWorkScene(has: Has, def: CrewDef, level = 1, rnd: () => number = Math.random): WorkScene | undefined {
  const all = workScenes(has, def, level);
  const real = all.filter((w) => w.frames.length > 2); // true loops beat a two picture alternation
  const pool = real.length ? real : all;
  return pool.length ? pool[Math.floor(rnd() * pool.length) % pool.length] : undefined;
}
export function anyWorkView(has: Has, def: CrewDef, level = 1): View | undefined {
  for (const v of ['fl', 'fr', 'bl', 'br'] as View[]) if (loop(has, `crewx_${def.id}_work_${v}`, 4).length >= 2) return v;
  void level;
  return undefined;
}

/** An emote portrait key by name, if the sheet has it. */
export function emote(has: Has, def: CrewDef, name: string): string | undefined {
  const k = `crewx_${def.id}_emote_${name}`;
  return has(k) ? k : undefined;
}
/** A calm emote to show in a bubble when someone is at rest: happy first, then idle, then a third one. */
export function restEmote(has: Has, def: CrewDef, pick: number): string | undefined {
  const list = (EMOTES[def.id] ?? []).filter((n) => n !== 'idle' || pick % 2 === 0);
  const names = list.length ? list : [];
  const name = names[pick % Math.max(1, names.length)];
  return name ? emote(has, def, name) : undefined;
}

/** Wobble frames for a tray oopsie at the level the art was drawn for (the older apprentice wobbles are level 1 only). */
export function wobbleLoop(has: Has, def: CrewDef, level = 1): string[] {
  const l = lv(level);
  const f = cachedLoop(has, crewlBase(def.id, l, 'wobble'), 4);
  if (f.length >= 2) return f;
  return l === 1 ? loop(has, `oops_${def.id}_wobble`, 4) : [];
}
export const OOPS_PROPS = ['oops_prop_crumbs', 'oops_prop_puddle_oat_s', 'oops_prop_tipped_cup'];
/** Little cute messes that play as a short sequence: a puddle that spreads, crumbs that fall, a cup that tips. */
export const OOPS_SEQUENCES = ['oops_prop_puddle_oat', 'oops_prop_puddle_matcha', 'oops_prop_crumbs', 'oops_prop_tipped_cup'];
export function oopsSequence(has: Has, base: string): string[] {
  return cachedLoop(has, base, 5);
}

/** Which loops exist for each crew member and level, as frame counts: used by tests and for reporting what to redraw. */
export function loopReport(has: Has, defs: CrewDef[]): Record<string, Record<number, Record<string, number>>> {
  const out: Record<string, Record<number, Record<string, number>>> = {};
  for (const d of defs) {
    out[d.id] = {};
    for (const l of [1, 2, 3]) {
      const row: Record<string, number> = {};
      for (const k of ['walk_f', 'walk_b', 'carry_f', 'carry_b', 'work_fl', 'work_fr', 'work_bl', 'work_br', 'work_shelf_fl', 'work_shelf_fr', 'work_play_fl', 'work_play_fr', 'wobble']) {
        const n = loop(has, crewlBase(d.id, l, k), 5).length;
        if (n) row[k] = n;
      }
      out[d.id][l] = row;
    }
  }
  return out;
}
