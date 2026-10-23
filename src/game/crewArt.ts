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

/** Walk frames for a direction on screen: front when moving down the screen, back when moving up. Carry loops are used with a tray when there are any. */
export function walkLoop(has: Has, def: CrewDef, side: 'f' | 'b', carry: boolean): string[] {
  const c = carry ? loop(has, `crewx_${def.id}_carry_${side}`) : [];
  if (c.length >= 2) return c;
  const w = loop(has, `crewx_${def.id}_walk_${side}`);
  if (w.length) return w;
  return c; // a single carry frame is better than nothing
}

/** The work loop for a view (the station prop is part of the sprite), or an empty list. */
export function workLoop(has: Has, def: CrewDef, view: View): string[] {
  return loop(has, `crewx_${def.id}_work_${view}`, 4);
}
export function anyWorkView(has: Has, def: CrewDef): View | undefined {
  for (const v of ['fl', 'fr', 'bl', 'br'] as View[]) if (workLoop(has, def, v).length >= 2) return v;
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

/** Wobble frames for an apprentice's tray oopsie (Pip and Hana have them). */
export function wobbleLoop(has: Has, def: CrewDef): string[] {
  return loop(has, `oops_${def.id}_wobble`, 4);
}
export const OOPS_PROPS = ['oops_prop_crumbs', 'oops_prop_puddle_oat_s', 'oops_prop_tipped_cup'];
