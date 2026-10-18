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
  staff: [], sign: 'latte', popularity: 0, event: null, latte: { day: '', n: 0, best: 0, streak: 0 }, gacha: { n: 0, day: '', pity: 0 },
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

export const STAR_AT = [0, 25, 60, 100, 150, 220]; // style needed for 1 to 5 stars (the last is a bonus rung)
export interface Style { score: number; stars: number; sets: string[]; seats: number; tables: number; pastry: number; espresso: boolean; bench: boolean; whisk: boolean; register: boolean; kitchen: boolean; pets: number; wifi: boolean; power: boolean; luckycat: boolean; sign: boolean; board: boolean; next: number | null }

export const SET_NAMES: Record<string, string> = { maple: 'Maple and wood', bistro: 'Bistro and marble' };

export function styleOf(s: GameState): Style {
  const counts = new Map<string, number>();
  let seats = 0, tables = 0, pastry = 0, pets = 0, espresso = false, bench = false, whisk = false, register = false, oven = false, fridge = false, wifi = false, power = false, luckycat = false, sign = false, board = false;
  const parts: Record<string, { chair: number; table: number }> = {};
  for (const o of s.cafe.placed) {
    const it = itemOf(o.itemId);
    if (!it) continue;
    counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
    if (it.role === 'chair') { seats += it.seats ?? 1; if (it.set) (parts[it.set] ??= { chair: 0, table: 0 }).chair++; }
    else if (it.seats) seats += it.seats;
    if (it.role === 'table') { tables++; if (it.set) (parts[it.set] ??= { chair: 0, table: 0 }).table++; }
    if (it.effect === 'pastry') pastry++;
    if (it.effect === 'espresso') espresso = true;
    if (it.effect === 'bench') { bench = true; seats += 2; }
    if (it.effect === 'whisk') whisk = true;
    if (it.effect === 'register') register = true;
    if (it.effect === 'oven') oven = true;
    if (it.effect === 'fridge') fridge = true;
    if (it.effect === 'pet') pets++;
    if (it.effect === 'wifi') wifi = true;
    if (it.effect === 'power') power = true;
    if (it.effect === 'luckycat') luckycat = true;
    if (it.effect === 'sign') sign = true;
    if (it.effect === 'board') board = true;
  }
  let score = 0;
  for (const [id, n] of counts) {
    const it = itemOf(id)!;
    score += (it.style ?? 0) * Math.min(n, it.styleCap ?? 3); // the first few of a kind count, then it is just clutter
  }
  const sets = Object.entries(parts).filter(([, p]) => p.table >= 1 && p.chair >= 2).map(([k]) => k);
  score += sets.length * 10;
  score += (oven && fridge ? 8 : 0) + (pets >= 3 ? 8 : 0);
  const stars = Math.min(5, STAR_AT.filter((t) => score >= t).length);
  return { score, stars, sets, seats, tables, pastry, espresso, bench, whisk, register, kitchen: oven && fridge, pets, wifi, power, luckycat, sign, board, next: STAR_AT[stars] ?? null };
}

/** Every pastry case adds 10 percent to Matcha Masters coins (two count), each star above the first adds 2, and a brewmaster adds 5. */
export function matchaBonus(s: GameState): number {
  const st = styleOf(s);
  return Math.min(2, st.pastry) * 0.1 + (st.stars - 1) * 0.02 + (s.cafe.staff.includes('brewmaster') ? 0.05 : 0);
}

// ---- staff: hired baristas who keep the café running. No wages and no penalties, each one adds something.
export interface Staff { id: string; name: string; role: string; perk: string; price: number; sprite: string }
export const STAFF: Staff[] = [
  { id: 'manager', name: 'Mr. Tan', role: 'The Cheerful Manager', perk: 'Café tips build 20% faster and hold more', price: 300, sprite: 'cy_staff_manager' },
  { id: 'apprentice', name: 'Pip', role: 'The Eager Apprentice', perk: 'Stocks the pantry with 1 extra ingredient a day', price: 600, sprite: 'cy_staff_apprentice' },
  { id: 'brewmaster', name: 'Mr. Oren', role: 'The Experienced Brewmaster', perk: '+5% coins in Matcha Masters', price: 900, sprite: 'cy_staff_brewmaster' },
  { id: 'petsitter', name: 'Juno', role: 'The Pet Sitter', perk: 'Pet corners earn double tip bonus', price: 1200, sprite: 'cy_staff_petsitter' },
];

// ---- chalkboard signs: whom you draw in, and a small tip boost for matching the day's guests
export interface Sign { id: string; name: string; art: string; draws: string[]; boost: number; stars: number }
export const SIGNS: Sign[] = [
  { id: 'latte', name: 'A Latte Reasons to Smile', art: 'cy_chalk_latte', draws: ['creative', 'regular', 'scholar', 'artist'], boost: 0.1, stars: 1 },
  { id: 'hoppy', name: "Don't Worry, Be Hoppy", art: 'cy_chalk_hoppy', draws: ['student', 'gardener', 'enthusiast'], boost: 0.1, stars: 1 },
  { id: 'brew', name: "Today's Brew-tiful", art: 'cy_chalk_brew', draws: ['creative', 'nomad', 'enthusiast'], boost: 0.08, stars: 2 },
  { id: 'frappe', name: 'Feeling Frappe-tastic', art: 'cy_chalk_frappe', draws: ['student', 'nomad', 'artist', 'gardener'], boost: 0.12, stars: 4 },
];

/** Everything that multiplies what the café earns. */
export function tipMult(s: GameState): number {
  const st = styleOf(s);
  const sign = SIGNS.find((g) => g.id === s.cafe.sign);
  const petBonus = 0.03 * Math.min(5, st.pets) * (s.cafe.staff.includes('petsitter') ? 2 : 1);
  return 1 + (st.register ? 0.15 : 0) + petBonus + (sign && st.sign ? sign.boost : 0) + 0.05 * Math.min(10, s.cafe.popularity) + (s.cafe.staff.includes('manager') ? 0.2 : 0);
}

/** The café earns tips while it is open (it needs a seat and a table). Tips build up and you collect them. */
export const tipRate = (s: GameState) => styleOf(s).stars * 2 * tipMult(s); // coins an hour
export const tipCap = (s: GameState) => Math.round((20 + styleOf(s).stars * 10) * tipMult(s));
export function tipsPending(s: GameState, now = Date.now()): number {
  const st = styleOf(s);
  if (st.seats < 1 || st.tables < 1) return 0;
  const hours = Math.max(0, (now - s.cafe.tipsAt) / 3600000);
  return Math.min(tipCap(s), Math.floor(hours * tipRate(s)));
}

// ---- the community board: a rotating calendar. Hosting an event takes both of you: one starts it, the other joins.
export type EventId = 'adopt' | 'study' | 'jazz' | 'latte';
export interface CafeEvent { id: EventId; name: string; icon: string; badge: string; flyer: string; day: number; blurb: string; need: string; coins: number; shells: number; popularity: boolean }
export const EVENTS: CafeEvent[] = [
  { id: 'adopt', name: 'Adopt-a-Pet Drive', icon: '🐾', badge: 'cy_badge_pet', flyer: 'cy_flyer_pet', day: 6, blurb: 'A local shelter visits. Clear a 4 by 4 patch of floor for a playpen and welcome the visitors together.', need: 'A free 4 by 4 patch of floor', coins: 70, shells: 4, popularity: true },
  { id: 'study', name: 'Study Slam', icon: '🎓', badge: 'cy_badge_study', flyer: '', day: 3, blurb: 'Students flood in with laptops. Give them power and Wi-Fi and enough tables, and keep the paths clear.', need: 'A Wi-Fi router, a power strip tile and 3 tables', coins: 80, shells: 3, popularity: false },
  { id: 'jazz', name: 'Rainy Day Jazz Night', icon: '☔', badge: 'cy_badge_jazz', flyer: 'cy_flyer_jazz', day: 5, blurb: 'Moody lights, rain on the window and warm music. A slow evening to spend together.', need: 'A record player or the Vintage Jukebox', coins: 60, shells: 5, popularity: false },
  { id: 'latte', name: 'Latte Art Masterclass', icon: '☕', badge: 'cy_badge_coffee', flyer: 'cy_flyer_latte', day: 0, blurb: 'Pour a cat, a frog or a heart that scores 90 percent or better, then raise a toast.', need: 'A latte art score of 90% or more today', coins: 60, shells: 4, popularity: false },
];
export const eventOf = (id: EventId) => EVENTS.find((e) => e.id === id)!;
export const eventToday = (day = new Date()) => EVENTS.find((e) => e.day === day.getDay());

/** Looks for a free square of floor for the adoption playpen. */
export function freePatch(s: GameState, n = 4): { x: number; y: number } | null {
  const blocked = cafeBlocked(s);
  for (let x = 1; x + n <= s.cafe.size; x++) for (let y = 1; y + n <= s.cafe.size; y++) {
    let ok = true;
    for (let i = 0; i < n && ok; i++) for (let j = 0; j < n; j++) if (blocked.has(`${x + i},${y + j}`)) { ok = false; break; }
    if (ok) return { x, y };
  }
  return null;
}
const has = (s: GameState, ids: string[]) => s.cafe.placed.some((o) => ids.includes(o.itemId));
export function eventReady(s: GameState, id: EventId): boolean {
  const st = styleOf(s);
  if (id === 'adopt') return !!freePatch(s);
  if (id === 'study') return st.wifi && st.power && st.tables >= 3;
  if (id === 'jazz') return has(s, ['cy_jukebox', 'living_record']);
  return s.cafe.latte.day === dateKey() && s.cafe.latte.best >= 90;
}

// ---- the lucky cat: coins go in, a surprise comes out
export const GACHA_COST = 40;
export const GACHA = {
  common: ['cx_g_cake', 'cx_g_croissant', 'cy_g_curry', 'cy_g_focaccia', 'cy_g_hamcroissant', 'cy_g_baguette', 'cy_g_bobajar', 'cy_g_oatmilk', 'cy_g_tote', 'cy_g_tallboba', 'cy_g_crate_berries', 'cy_g_crate_bottles', 'cy_clu_pens', 'cy_clu_book'],
  rare: ['cy_catchair', 'cy_tea', 'cy_sun', 'cy_cart', 'cy_tunnel', 'cy_catbed', 'cy_wicker'],
  legendary: ['cy_jukebox', 'cy_bobalamp', 'cy_bobalamp2'],
} as const;
export const freePullToday = (s: GameState) => s.cafe.gacha.day !== dateKey();

export const nextCafeStep = (s: GameState) => CAFE_STEPS.find((x) => x.size > s.cafe.size) ?? null;
export const sitToday = (s: GameState) => s.cafe.sitDay === dateKey();

export const ESPRESSO_RECIPE = 'Velvet Espresso Matcha';
export const isCafeItem = (it: CatalogItem) => it.category !== 'landmark';
