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
  // Miffy's default Blue Knit Sweater has the full animation set (walks, her own chair, jump and wave); the yellow and brown looks are stills
  if (id === 'miffy') return equipped === 'miffy_boots' ? 'brown' : equipped === 'miffy_raincoat' ? 'yellow' : 'blue';
  // the four starter Snoopy outfits wear the olive look; anything else gets plain white Snoopy from the expanded sheet
  return equipped && /^snoopy_o[1-4]$/.test(equipped) ? 'olive' : equipped ? 'plain' : 'olive';
}

export interface VipKeys {
  stand: string;
  down: string[]; // walking toward the camera, in step order (left facing, mirrored for the right)
  up: string[]; // walking away
  sit: string[]; // seated poses, the first is the order pose
  sitFaces: 'front' | 'right'; // which way the seated art looks ('right' art is mirrored for a chair that faces the other way)
  sitHasChair: boolean; // the seated art draws its own chair, so the placed chair is hidden while they sit
  order: string; // the pose while the order is placed
  taste: string; // while waiting
  jump: string | null; // art for the delighted hop (others hop in code)
  wave: string | null; // art for the goodbye wave (others rock side to side)
  waveFrames: string[]; // two or more frames to alternate while waving (a back view wave)
  exitJump: string[]; // a back view hop played at the door before the wave, for looks whose jump art faces away
}

const seq = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}_${i + 1}`);
const base = (): Pick<VipKeys, 'sitFaces' | 'sitHasChair' | 'waveFrames' | 'exitJump'> => ({ sitFaces: 'front', sitHasChair: false, waveFrames: [], exitJump: [] });

/** All the art keys for one look, or null when any needed texture is missing (the visit is then skipped). */
export function vipKeys(id: VipId, variant: string, has: (k: string) => boolean): VipKeys | null {
  let k: VipKeys;
  if (id === 'kitty') {
    const green = variant === 'green';
    const down = seq(green ? 'vip_kitty_green_walk_f' : 'vip_kitty_walk_f', 4);
    const greenBack = seq('vip_kitty_green_walk_b', 4);
    const up = green ? (greenBack.every(has) ? greenBack : down) : seq('vip_kitty_walk_b', 4); // without the green back view the front frames stand in
    const gSit = ['vip_kitty_green_sit_1', 'vip_kitty_green_sit_2'];
    const sit = green && gSit.every(has) ? gSit : ['vip_kitty_sit_1', 'vip_kitty_sit_2'];
    const jumpB = seq('vip_kitty_green_jump_b', 3), waveB = seq('vip_kitty_green_wave_b', 2);
    const backArt = green && up === greenBack && jumpB.every(has) && waveB.every(has);
    k = { ...base(), stand: down[0], down, up, sit, order: sit[0], taste: sit[1], jump: null, wave: backArt ? waveB[0] : null, waveFrames: backArt ? waveB : [], exitJump: backArt ? jumpB : [] };
  } else if (id === 'miffy') {
    const blue = variant === 'blue';
    const bDown = seq('vip_miffy_blue_walk_f', 4), bUp = seq('vip_miffy_blue_walk_b', 4), bSit = ['vip_miffy_blue_sit_1', 'vip_miffy_blue_sit_2'];
    if (blue && [...bDown, ...bUp, ...bSit].every(has)) {
      k = { ...base(), stand: bDown[0], down: bDown, up: bUp, sit: bSit, sitFaces: 'right', sitHasChair: true, order: bDown[0], taste: bDown[0], jump: 'vip_miffy_blue_jump_1', wave: 'vip_miffy_blue_wave_1' };
    } else {
      // the yellow and brown looks (and the blue one if its art is missing) are single poses: she stands beside a table, as before
      const look = variant === 'brown' ? 'brown' : 'yellow';
      const f = `vip_miffy_${look}_f`, b = `vip_miffy_${look}_b`;
      k = { ...base(), stand: f, down: [f], up: [b], sit: [], order: f, taste: f, jump: null, wave: null };
    }
  } else {
    const plain = variant === 'plain';
    const left = seq('vip_snoopy_walkl', 4);
    const down = plain ? seq('vip_snoopy_plain_walk', 4) : left.every(has) ? left : seq('vip_snoopy_walk', 4); // the olive art faced right, so left facing copies are preferred
    const pSit = ['vip_snoopy_plain_sit_1', 'vip_snoopy_plain_sit_2'];
    if (plain && [...down, ...pSit, 'vip_snoopy_plain_jump_1', 'vip_snoopy_plain_wave_1'].every(has)) {
      k = { ...base(), stand: down[0], down, up: down, sit: pSit, order: pSit[0], taste: pSit[1], jump: 'vip_snoopy_plain_jump_1', wave: 'vip_snoopy_plain_wave_1' };
    } else {
      const o = seq('vip_snoopy_walkl', 4).every(has) ? left : seq('vip_snoopy_walk', 4);
      k = { ...base(), stand: o[0], down: o, up: o, sit: ['vip_snoopy_sit_1'], order: 'vip_snoopy_order_1', taste: 'vip_snoopy_taste_1', jump: 'vip_snoopy_jump_1', wave: 'vip_snoopy_wave_1' };
    }
  }
  const need = [...k.down, ...k.up, k.stand, k.order, k.taste];
  if (!need.every(has)) return null;
  // optional art falls back quietly
  k.sit = k.sit.filter(has);
  if (k.jump && !has(k.jump)) k.jump = null;
  if (k.wave && !has(k.wave)) k.wave = null;
  k.waveFrames = k.waveFrames.filter(has);
  k.exitJump = k.exitJump.every(has) ? k.exitJump : [];
  return k;
}
