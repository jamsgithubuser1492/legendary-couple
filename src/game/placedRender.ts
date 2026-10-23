import Phaser from 'phaser';
import { cartesianToIso, tileCenter } from './iso';
import { SPRITES } from './spriteList';
import { drawPlaced } from './draw';
import { drawWall } from './walls';
import { floorKey, FLOOR_STYLES, FLOOR_VARIANTS } from './floors';
import { FLOOR_FY } from './floorOrigins';
import { decorFace, tilesOf } from '../state/placement';
import { footprint, itemOf, type CatalogItem } from '../state/catalog';
import type { GameState, PlacedObject } from '../types';

export const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
/** Which way each art wall piece runs as drawn: 'y' rises to the right, 'x' falls to the right. */
const WALL_NATIVE: Record<string, 'x' | 'y'> = { wall_single: 'y', wall_window: 'x', wall_door: 'x' };
/** A four direction piece shows front left, front right, back right and back left as it is turned. */
const TURN: Record<number, string> = { 0: 'fl', 90: 'fr', 180: 'br', 270: 'bl' };

export interface RenderOpts {
  alpha?: number;
  tint?: number;
  /** The state that walls hang decorations from (the island or the café room). */
  decor: GameState;
  /** Swap a piece's art, for example the couple on the window bench. */
  skin?: (o: PlacedObject) => string | undefined;
}

/**
 * One scale for the whole café, so nothing looks too big or small next to anything else.
 * A person stands about 54 px tall; a chair seat reaches their knee, a table their waist.
 */
const PERSON_H = 54;
const SIZE_BY_WIDTH: [RegExp, number][] = [ // [pattern, display width]
  [/^cx_chair_/, 32], [/^cy_catchair_/, 34], [/^cx_table_round_/, 40], [/^cx_table_marble_/, 44], [/^cy_loveseat_|^cy_sofa_|^cy_wicker_/, 56], [/^cx_fig_/, 34], [/^cx_pothos_/, 34], [/^cy_capy_/, 34], [/^cy_drone_/, 22],
];
const HEIGHT_BY_KEY: [RegExp, number][] = [[/^cx_p_.*(?<!_sit)$/, PERSON_H], [/^crew_/, PERSON_H], [/^crewx_.*_(walk|carry|emote)_/, PERSON_H], [/^crewl_[a-z]+_\d_(walk|carry|wobble)_/, PERSON_H], [/^oops_(pip|hana)_wobble_/, PERSON_H], [/^cx_p_.*_sit$/, 50], [/^cy_(granny|grannyb|mail|mailb|cam|coffee|crane)_\d/, PERSON_H], [/^cs_crane_/, PERSON_H], [/^cs_/, 58], [/^cw_/, PERSON_H], [/^ct_/, 50], [/^cz_t_/, PERSON_H], [/^cy_staff_/, PERSON_H], [/^cy_tray_/, PERSON_H]];

/** The on screen width for a sprite, after the café's common scale. */
export function displayWidth(key: string, natural: number): number {
  for (const [re, h] of HEIGHT_BY_KEY) if (re.test(key)) {
    const e = RATIO.get(key);
    return e ? Math.round(h / e) : (DW.get(key) ?? natural);
  }
  for (const [re, w] of SIZE_BY_WIDTH) if (re.test(key)) return w;
  return DW.get(key) ?? natural;
}
const RATIO = new Map<string, number>(SPRITES.map((s) => [s.key, s.h / s.w]));

/** A scene image fitted to its display width from the sprite list. */
export function artImage(scene: Phaser.Scene, key: string, x: number, y: number, ox: number, oy: number, flip = false, alpha = 1): Phaser.GameObjects.Image {
  const im = scene.add.image(x, y, key).setOrigin(ox, oy);
  im.setScale(displayWidth(key, im.width) / im.width);
  im.setFlipX(flip);
  im.setAlpha(alpha);
  return im;
}

/** Builds the visuals for one placed object: art sprites when available, procedural shapes otherwise. */
export function spawnPlaced(scene: Phaser.Scene, o: PlacedObject, wallAt: (x: number, y: number) => boolean, opts: RenderOpts): Phaser.GameObjects.GameObject[] {
  const alpha = opts.alpha ?? 1, tint = opts.tint;
  const item = itemOf(o.itemId);
  if (!item) return [];
  if (item.layer === 'floor' && FLOOR_STYLES[item.id]) {
    const c = tileCenter(o.tileX, o.tileY);
    const v = Math.floor((Math.sin(o.tileX * 12.9898 + o.tileY * 78.233) * 43758.5453 % 1 + 1) * 1000) % FLOOR_VARIANTS;
    const im = scene.add.image(c.x, c.y, floorKey(item.id, v)).setScale(0.5).setAlpha(alpha).setDepth(-30);
    if (tint !== undefined) im.setTint(tint);
    return [im];
  }
  if (item.layer === 'wall') {
    const g = scene.add.graphics().setDepth(o.tileX + o.tileY + 0.1);
    drawWall(g, o.tileX, o.tileY, item.variant ?? 'wall', o.rotation, {
      W: wallAt(o.tileX - 1, o.tileY), E: wallAt(o.tileX + 1, o.tileY), N: wallAt(o.tileX, o.tileY - 1), S: wallAt(o.tileX, o.tileY + 1),
    }, alpha, tint, item.material);
    return [g];
  }
  if (item.sprite && scene.textures.exists(item.sprite)) return spawnSprite(scene, item, o, wallAt, opts);
  if (item.layer === 'walldecor') return [];
  const g = scene.add.graphics();
  g.setDepth(drawPlaced(g, o, { wallAt, alpha }));
  return [g];
}

function spawnSprite(scene: Phaser.Scene, item: CatalogItem, o: PlacedObject, wallAt: (x: number, y: number) => boolean, opts: RenderOpts) {
  const alpha = opts.alpha ?? 1, tint = opts.tint;
  let key = opts.skin?.(o) ?? item.sprite!;
  const four = item.sprite4 && !opts.skin?.(o);
  if (four) {
    const k4 = `${item.sprite4}_${TURN[o.rotation]}`;
    if (scene.textures.exists(k4)) key = k4;
  }
  const mk = (k: string, x: number, y: number, ox: number, oy: number, flip = false) => {
    const im = artImage(scene, k, x, y, ox, oy, flip, alpha);
    if (tint !== undefined) im.setTint(tint);
    return im;
  };
  if (item.layer === 'floor') {
    const c = tileCenter(o.tileX, o.tileY);
    return [mk(key, c.x, c.y, 0.5, FLOOR_FY[key] ?? (key.startsWith('cx_floor_') ? 0.5 : 0.39)).setDepth(-30 + (o.tileX + o.tileY) * 0.0005)]; // tiles in front cover the edge of the ones behind
  }
  if (item.layer === 'wall') {
    const { tileX: x, tileY: y } = o;
    const hasX = wallAt(x - 1, y) || wallAt(x + 1, y);
    const hasY = wallAt(x, y - 1) || wallAt(x, y + 1);
    const depth = x + y + 0.1;
    if (hasX && hasY && scene.textures.exists('wall_corner')) {
      const back = cartesianToIso(x, y), left = cartesianToIso(x, y + 1);
      return [mk('wall_corner', back.x, left.y + 2, 0.5, 1).setDepth(depth)];
    }
    const run: 'x' | 'y' = hasX ? 'x' : hasY ? 'y' : o.rotation % 180 === 0 ? 'x' : 'y';
    const flip = WALL_NATIVE[key] !== run;
    if (run === 'y') {
      const left = cartesianToIso(x, y + 1); // west edge, left vertex
      return [mk(key, left.x, left.y + 2, 0, 1, flip).setDepth(depth)];
    }
    const right = cartesianToIso(x + 1, y); // north edge, right vertex
    return [mk(key, right.x, right.y + 2, 1, 1, flip).setDepth(depth)];
  }
  if (item.layer === 'walldecor') {
    const face = decorFace(opts.decor, o.tileX, o.tileY, o.rotation);
    if (!face) return [];
    const { tileX: x, tileY: y } = o;
    // sit on the middle of the wall's visible face, a little in front of it
    const mid = face === 'y' ? cartesianToIso(x, y + 0.5) : cartesianToIso(x + 0.5, y);
    const nx = face === 'y' ? 2.6 : -2.6;
    const im = mk(key, mid.x + nx, mid.y + 1.3 - (item.lift ?? 34), 0.5, 0.5, face === 'x');
    return [im.setDepth(x + y + 0.3)]; // always just above its wall (wall depth is x + y + 0.1)
  }
  const fp = footprint(item, o.rotation);
  const front = cartesianToIso(o.tileX + fp.w, o.tileY + fp.d);
  let depth = o.tileX + fp.w - 1 + (o.tileY + fp.d - 1) + 0.4;
  let lift = 0;
  if (item.onSurface) {
    // stand on the table, counter or case under it
    const base = opts.decor.placed.find((p) => itemOf(p.itemId)?.surface && tilesOf(p.itemId, p.tileX, p.tileY, p.rotation).some((a) => a.x === o.tileX && a.y === o.tileY));
    const bi = itemOf(base?.itemId ?? '');
    lift = Math.round((bi?.h ?? 16) * 0.9);
    if (base && bi) {
      const bf = footprint(bi, base.rotation);
      depth = base.tileX + bf.w - 1 + (base.tileY + bf.d - 1) + 0.5; // just above what it stands on
    }
  }
  return [mk(key, front.x, front.y - 8 - lift + (item.oy ?? 0), 0.5, 1, !four && o.rotation % 180 === 90).setDepth(depth)];
}
