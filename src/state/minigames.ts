import type { GameState } from '../types';
import { growthOf } from './town';

export type MGType = 'MATCHA_MASTERS' | 'STELLAR_FISHING' | 'CRANE_CRAZE' | 'ORCHARD_HARVEST';

export const MG_SCENE: Record<MGType, string> = {
  MATCHA_MASTERS: 'MatchaMastersScene',
  STELLAR_FISHING: 'StellarFishingScene',
  CRANE_CRAZE: 'CraneCrazeScene',
  ORCHARD_HARVEST: 'OrchardScene',
};

export interface GameInfo {
  type: MGType;
  name: string;
  icon: string;
  where: string;
  duration: string;
  blurb: string;
  roles: [string, string]; // what partner A and partner B do
  lockedText: string;
  unlocked: (s: GameState) => boolean;
}

const hasCafe = (s: GameState) =>
  (s.startingPath === 'shop' && !s.starterRemoved) || s.placed.some((o) => ['cafe_counter', 'cafe_pastry_case', 'lm_cafe'].includes(o.itemId));

export const GAMES: GameInfo[] = [
  {
    type: 'MATCHA_MASTERS', name: 'Matcha Masters', icon: '🍵', where: 'The Café', duration: '1:30',
    blurb: 'A co op cooking rush. One of you preps, the other brews and serves.',
    roles: ['Sous Chef: read recipes, scoop ingredients, pass drinks', 'Barista: time the steamer, decorate, serve'],
    lockedText: 'Place the café or a storefront module on your island.', unlocked: hasCafe,
  },
  {
    type: 'STELLAR_FISHING', name: 'Stellar Fishing', icon: '🎣', where: 'The Wooden Pier', duration: 'Endless',
    blurb: 'Cast together, sync your taps, and look out for messages in bottles.',
    roles: ['Cast near the glowing co op fish. Pull left on rare critters', 'Cast near the glowing co op fish. Pull right on rare critters'],
    lockedText: '', unlocked: () => true,
  },
  {
    type: 'CRANE_CRAZE', name: 'Blind Box Crane Craze', icon: '🧸', where: 'Downtown Arcade', duration: '3 tries',
    blurb: 'One steers across, one steers deep and drops. Cheer to keep the grip.',
    roles: ['Moves the claw across, then locks it. Cheers on the lift', 'Moves the claw deep and presses DROP'],
    lockedText: 'Grow your town to 120 so Downtown opens and the Arcade is built.', unlocked: (s) => growthOf(s) >= 120,
  },
  {
    type: 'ORCHARD_HARVEST', name: 'Orchard Harvest', icon: '🍏', where: 'Town Park', duration: '1:15',
    blurb: 'Shake the trees and catch the apples, then swap roles halfway.',
    roles: ['Shakes first, then catches', 'Catches first, then shakes'],
    lockedText: 'Grow your town to 36 so the park opens.', unlocked: (s) => growthOf(s) >= 36,
  },
];
export const gameOf = (t: MGType) => GAMES.find((g) => g.type === t)!;

// ---------- collectibles ----------
export interface Figure { id: string; name: string; series: string; sprite: string; rare?: boolean }
export const FIGURES: Figure[] = [
  { id: 'fig_kitty_beach', name: 'Beach Kitty', series: 'Beach Vacation', sprite: 'toy_beach_kitty' },
  { id: 'fig_miffy_beach', name: 'Beach Miffy', series: 'Beach Vacation', sprite: 'toy_beach_miffy' },
  { id: 'fig_snoopy_beach', name: 'Beach Snoopy', series: 'Beach Vacation', sprite: 'toy_beach_snoopy' },
  { id: 'fig_kitty_barista', name: 'Barista Kitty', series: 'Barista', sprite: 'toy_barista_kitty' },
  { id: 'fig_miffy_barista', name: 'Barista Miffy', series: 'Barista', sprite: 'toy_barista_miffy' },
  { id: 'fig_snoopy_barista', name: 'Barista Snoopy', series: 'Barista', sprite: 'toy_barista_snoopy' },
  { id: 'fig_kitty_pj', name: 'Sleepy Kitty', series: 'Sleepy Pajama', sprite: 'toy_sleepy_kitty' },
  { id: 'fig_miffy_pj', name: 'Sleepy Miffy', series: 'Sleepy Pajama', sprite: 'toy_sleepy_miffy' },
  { id: 'fig_snoopy_pj', name: 'Sleepy Snoopy', series: 'Sleepy Pajama', sprite: 'toy_sleepy_snoopy' },
  { id: 'fig_golden_kitty', name: 'Golden Kitty', series: 'Golden', sprite: 'toy_golden_kitty', rare: true },
  { id: 'fig_golden_miffy', name: 'Golden Miffy', series: 'Golden', sprite: 'toy_golden_miffy', rare: true },
  { id: 'fig_golden_snoopy', name: 'Golden Snoopy', series: 'Golden', sprite: 'toy_golden_snoopy', rare: true },
];
export const figureOf = (id: string) => FIGURES.find((f) => f.id === id);
export const COMMON_FIGURES = FIGURES.filter((f) => !f.rare).map((f) => f.id);
export const RARE_FIGURES = FIGURES.filter((f) => f.rare).map((f) => f.id);

export const FAUNA: { id: string; name: string; icon: string }[] = [
  { id: 'octopus', name: 'Cute Octopus', icon: '🐙' },
  { id: 'starfish', name: 'Starfish', icon: '⭐' },
  { id: 'jellyfish', name: 'Pastel Jellyfish', icon: '🪼' },
];

export const RECIPES = ['Our First Date Matcha', 'Sunset Strawberry Cloud', 'Pier Day Boba', 'Cozy Rainy Latte'];
export const CAFE_DECOR = ['espresso', 'cafe_pastry_case', 'seating_cluster', 'neon_cafe'];

export interface MGResult {
  type: MGType;
  score: number;
  stars: number;
  coins: number;
  shells: number;
  eventTokens: number;
  ingredients: number;
  driftwood: number;
  fauna: Record<string, number>;
  figures: string[];
  items: string[];
  recipes: string[];
  notes: string[];
  award: boolean; // only the host's device applies the reward, so a synced game never pays twice
}
export const emptyResult = (type: MGType): MGResult => ({ type, score: 0, stars: 0, coins: 0, shells: 0, eventTokens: 0, ingredients: 0, driftwood: 0, fauna: {}, figures: [], items: [], recipes: [], notes: [], award: true });
