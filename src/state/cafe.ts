/**
 * The café interior. It is its own space: a walled room with its own grid, so inside and outside never mix.
 * Everything here is pure (it reads the game state and returns answers); the store applies the changes.
 */
import type { CafeState, CafeTheme, GameState, PlacedObject } from '../types';
import { itemOf, type CatalogItem } from './catalog';
import { dateKey } from './questions';

export interface ThemeInfo { id: CafeTheme; name: string; blurb: string; wall: 'plaster' | 'brick' | 'lavender'; floor: string; preview: string; price: number }
export const THEMES: ThemeInfo[] = [
  { id: 'matcha', name: 'Traditional Matcha Sanctuary', blurb: 'Soft cream plaster, bamboo trim and warm tatami and wood.', wall: 'plaster', floor: 'cx_floor_light', preview: 'cx_room_matcha', price: 0 },
  { id: 'bistro', name: 'Sunset Pastry Bistro', blurb: 'Dusty rose brick, hanging ivy and a herringbone oak floor.', wall: 'brick', floor: 'cx_floor_herring', preview: 'cx_room_bistro', price: 400 },
  { id: 'cloud', name: 'Minimalist Cloud Café', blurb: 'Lavender walls, rounded arches and polished cream terrazzo.', wall: 'lavender', floor: 'cx_floor_terrazzo', preview: 'cx_room_cloud', price: 400 },
];
export const themeOf = (id: CafeTheme) => THEMES.find((t) => t.id === id)!;

/** Café sizes include the back walls, so 9 is an 8 by 8 room. Every step is a bigger room to design. */
export const CAFE_START = 9;
export const CAFE_STEPS: { size: number; coins: number }[] = [
  { size: 11, coins: 500 }, { size: 13, coins: 1200 }, { size: 15, coins: 2500 }, { size: 17, coins: 4500 }, { size: 21, coins: 8000 }, { size: 25, coins: 14000 },
];

export const newCafe = (): CafeState => ({
  theme: 'matcha', themes: ['matcha'], size: CAFE_START, placed: [], avatars: { A: { x: 3, y: 2 }, B: { x: 4, y: 2 } }, tipsAt: Date.now(), sitDay: '', pantryDay: '',
});

export const DOOR_X = 3; // the front door is in the back right wall, here
export const ENTRY = { x: DOOR_X, y: 1 }; // the first floor tile inside the door

/** The back two walls, a front door and windows, as placed pieces. They are part of the room, not of your bag. */
export function shellPieces(theme: CafeTheme, size: number): PlacedObject[] {
  const m = themeOf(theme).wall;
  const id = (variant: '' | '_window' | '_door') => (m === 'plaster' ? ({ '': 'wall_cream', _window: 'wall_window', _door: 'wall_door' } as const)[variant] : `wall_${m}${variant}`);
  const out: PlacedObject[] = [];
  const piece = (x: number, y: number, v: '' | '_window' | '_door') => out.push({ id: `shell:${x},${y}`, itemId: id(v), tileX: x, tileY: y, rotation: 0 });
  for (let x = 0; x < size; x++) piece(x, 0, x === DOOR_X ? '_door' : x % 3 === 1 ? '_window' : '');
  for (let y = 1; y < size; y++) piece(0, y, y % 3 === 1 ? '_window' : '');
  return out;
}

/** The café seen as if it were a small island of its own, so the placement rules can be reused as they are. */
export function cafeView(s: GameState): GameState {
  return { ...s, placed: [...shellPieces(s.cafe.theme, s.cafe.size), ...s.cafe.placed], islandSize: s.cafe.size, starterRemoved: true, memories: [] };
}

/** Tiles people cannot walk through. */
export function cafeBlocked(s: GameState): Set<string> {
  const set = new Set<string>();
  for (const o of cafeView(s).placed) {
    const it = itemOf(o.itemId);
    if (!it || it.layer === 'floor' || it.layer === 'walldecor') continue;
    const swap = o.rotation % 180 === 90;
    const w = swap ? it.d : it.w, d = swap ? it.w : it.d;
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) set.add(`${o.tileX + i},${o.tileY + j}`);
  }
  return set;
}

// ---------------------------------------------------------------------------------------------------------------
// Style score, rating and what the room does for you

export const STAR_AT = [0, 25, 60, 100, 150]; // style needed for 1 to 5 stars
export interface Style { score: number; stars: number; sets: string[]; seats: number; tables: number; pastry: number; espresso: boolean; bench: boolean; whisk: boolean; next: number | null }

export const SET_NAMES: Record<string, string> = { maple: 'Maple and wood', bistro: 'Bistro and marble' };

export function styleOf(s: GameState): Style {
  const counts = new Map<string, number>();
  let seats = 0, tables = 0, pastry = 0, espresso = false, bench = false, whisk = false;
  const parts: Record<string, { chair: number; table: number }> = {};
  for (const o of s.cafe.placed) {
    const it = itemOf(o.itemId);
    if (!it) continue;
    counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
    if (it.role === 'chair') { seats++; if (it.set) (parts[it.set] ??= { chair: 0, table: 0 }).chair++; }
    if (it.role === 'table') { tables++; if (it.set) (parts[it.set] ??= { chair: 0, table: 0 }).table++; }
    if (it.effect === 'pastry') pastry++;
    if (it.effect === 'espresso') espresso = true;
    if (it.effect === 'bench') { bench = true; seats += 2; }
    if (it.effect === 'whisk') whisk = true;
  }
  let score = 0;
  for (const [id, n] of counts) {
    const it = itemOf(id)!;
    score += (it.style ?? 0) * Math.min(n, it.styleCap ?? 3); // the first few of a kind count, then it is just clutter
  }
  const sets = Object.entries(parts).filter(([, p]) => p.table >= 1 && p.chair >= 2).map(([k]) => k);
  score += sets.length * 10;
  const stars = STAR_AT.filter((t) => score >= t).length;
  return { score, stars, sets, seats, tables, pastry, espresso, bench, whisk, next: STAR_AT[stars] ?? null };
}

/** Every pastry case adds 10 percent to Matcha Masters coins (two count), and each star above the first adds 2 percent. */
export function matchaBonus(s: GameState): number {
  const st = styleOf(s);
  return Math.min(2, st.pastry) * 0.1 + (st.stars - 1) * 0.02;
}

/** The café earns tips while it is open (it needs a seat and a table). Tips build up and you collect them. */
export const tipRate = (stars: number) => stars * 2; // coins an hour
export const tipCap = (stars: number) => 20 + stars * 10;
export function tipsPending(s: GameState, now = Date.now()): number {
  const st = styleOf(s);
  if (st.seats < 1 || st.tables < 1) return 0;
  const hours = Math.max(0, (now - s.cafe.tipsAt) / 3600000);
  return Math.min(tipCap(st.stars), Math.floor(hours * tipRate(st.stars)));
}

export const nextCafeStep = (s: GameState) => CAFE_STEPS.find((x) => x.size > s.cafe.size) ?? null;
export const sitToday = (s: GameState) => s.cafe.sitDay === dateKey();

export const ESPRESSO_RECIPE = 'Velvet Espresso Matcha';
export const isCafeItem = (it: CatalogItem) => it.category !== 'landmark';
