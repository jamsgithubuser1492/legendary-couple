import type { Wardrobe } from '../types';

/**
 * VIP guests: the companions the couple owns (Hello Kitty, Miffy and Snoopy) drop in to the café now and then.
 * This file holds the pure parts (who may visit, which outfit look to wear, which art keys to use, when the next
 * visit is) so they can be tested; CafeScene does the walking, sitting and ordering.
 */
export type VipId = 'kitty' | 'miffy' | 'snoopy';
export const VIP_IDS: VipId[] = ['kitty', 'miffy', 'snoopy'];
export const VIP_NAMES: Record<VipId, string> = { kitty: 'Hello Kitty', miffy: 'Miffy', snoopy: 'Snoopy' };

/** The guest kind used for orders and on the order rail (the rail draws cz_t_<kind>). */
export const vipKind = (id: VipId) => `vip_${id}`;
export const vipIdOf = (kind?: string | null): VipId | null => {
  const id = kind?.startsWith('vip_') ? kind.slice(4) : '';
  return (VIP_IDS as string[]).includes(id) ? (id as VipId) : null;
};

/** A VIP stops by about once every 8 to 15 minutes, and the first one shows up sooner so a new café feels alive. */
export const VISIT_MIN_S = 480;
export const VISIT_MAX_S = 900;
export const FIRST_MIN_S = 60;
export const FIRST_MAX_S = 240;
export const nextVisitIn = (rand: number, first = false) => (first ? FIRST_MIN_S + rand * (FIRST_MAX_S - FIRST_MIN_S) : VISIT_MIN_S + rand * (VISIT_MAX_S - VISIT_MIN_S));

/** A companion visits when the couple owns any outfit of theirs (the starting outfits count) or has invited them to the island. */
export function eligibleVips(w: Pick<Wardrobe, 'owned' | 'invited'> | undefined, ownerOf: (outfitId: string) => string | undefined): VipId[] {
  if (!w) return [];
  return VIP_IDS.filter((id) => w.invited?.includes(id) || (w.owned ?? []).some((o) => ownerOf(o) === id));
}

/** The look to wear: the one that matches the outfit they wear in the Wardrobe when the sheet has it, else the default look. */
export function vipVariant(id: VipId, equipped?: string): string {
  if (id === 'kitty') return equipped === 'kitty_o2' ? 'green' : 'plaid';
  if (id === 'miffy') return equipped === 'miffy_boots' ? 'brown' : 'yellow';
  return 'olive';
}

export interface VipKeys {
  stand: string;
  down: string[]; // walking toward the camera, in step order (left facing, mirrored for the right)
  up: string[]; // walking away
  sit: string[]; // seated poses (none for Miffy: she stands beside a table)
  order: string; // the pose while the order is placed
  taste: string; // while waiting
  jump: string | null; // art for the delighted hop (others hop in code)
  wave: string | null; // art for the goodbye wave (others rock side to side)
}

const seq = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}_${i + 1}`);

/** All the art keys for one look, or null when any needed texture is missing (the visit is then skipped). */
export function vipKeys(id: VipId, variant: string, has: (k: string) => boolean): VipKeys | null {
  let k: VipKeys;
  if (id === 'kitty') {
    const green = variant === 'green';
    const down = seq(green ? 'vip_kitty_green_walk_f' : 'vip_kitty_walk_f', 4);
    const up = green ? down : seq('vip_kitty_walk_b', 4); // the green look has no back view on the sheet yet
    k = { stand: down[0], down, up, sit: ['vip_kitty_sit_1', 'vip_kitty_sit_2'], order: 'vip_kitty_sit_1', taste: 'vip_kitty_sit_2', jump: null, wave: null };
  } else if (id === 'miffy') {
    const f = `vip_miffy_${variant === 'brown' ? 'brown' : 'yellow'}_f`, b = `vip_miffy_${variant === 'brown' ? 'brown' : 'yellow'}_b`;
    k = { stand: f, down: [f], up: [b], sit: [], order: f, taste: f, jump: null, wave: null };
  } else {
    const down = seq('vip_snoopy_walk', 4);
    k = { stand: down[0], down, up: down, sit: ['vip_snoopy_sit_1'], order: 'vip_snoopy_order_1', taste: 'vip_snoopy_taste_1', jump: 'vip_snoopy_jump_1', wave: 'vip_snoopy_wave_1' };
  }
  const need = [...k.down, ...k.up, k.stand, k.order, k.taste];
  if (!need.every(has)) return null;
  // optional art falls back quietly
  k.sit = k.sit.filter(has);
  if (k.jump && !has(k.jump)) k.jump = null;
  if (k.wave && !has(k.wave)) k.wave = null;
  return k;
}
