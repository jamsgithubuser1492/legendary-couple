import type { LifeArea, PlayerId, Quadrant, Quest } from '../types';

export interface QuadrantInfo {
  id: Quadrant;
  label: string;
  icon: string;
  color: string; // tailwind chip colour
  aura: string; // emojis that burst over the avatar when a goal in this quadrant is approved
  tint: number; // aura ring colour
  area: LifeArea; // the older life area this maps to
  hook: string;
  mechanic: string;
}

export const QUADRANTS: QuadrantInfo[] = [
  { id: 'health', label: 'Health', icon: '💪', color: 'bg-green-200', aura: '🍃🌿✨', tint: 0x8fdc9b, area: 'body', hook: 'Habit stacking and a partner make it easier.', mechanic: 'Pebble’s Energy Sync' },
  { id: 'career', label: 'Career', icon: '💼', color: 'bg-rose-200', aura: '💡⭐🏮', tint: 0xffc86b, area: 'mission', hook: 'Structure produces focus.', mechanic: 'Focus Beacon' },
  { id: 'learning', label: 'Learning', icon: '📚', color: 'bg-sky', aura: '📖✨💭', tint: 0x8fc8ff, area: 'mind', hook: 'Teaching a partner makes it stick.', mechanic: 'Wisdom Bookshelf' },
  { id: 'finance', label: 'Finance', icon: '💰', color: 'bg-amber-200', aura: '🪙💰✨', tint: 0xffd23f, area: 'money', hook: 'Saving is building toward a shared dream.', mechanic: 'Dream Vault' },
  { id: 'romance', label: 'Romance', icon: '💕', color: 'bg-pink-200', aura: '💗💕💖', tint: 0xff8fb1, area: 'romance', hook: 'Small affirmations build the emotional bank account.', mechanic: 'Bottle Mail' },
  { id: 'social', label: 'Social', icon: '🫶', color: 'bg-orange-200', aura: '🎉🎈🎊', tint: 0xffb36b, area: 'friends', hook: 'Friends bring fresh energy in.', mechanic: 'Town Square Hospitality' },
  { id: 'environment', label: 'Home', icon: '🏡', color: 'bg-yellow-200', aura: '🌼🏠✨', tint: 0xf2e27a, area: 'family', hook: 'A calm space makes a calm mind.', mechanic: 'Cozy bonus' },
  { id: 'recreation', label: 'Fun', icon: '🎈', color: 'bg-purple-200', aura: '🎈🎵✨', tint: 0xc9a7ff, area: 'soul', hook: 'Play keeps you both lighter.', mechanic: 'Playful bonus' },
];
export const quadrantInfo = (id: Quadrant) => QUADRANTS.find((q) => q.id === id)!;

/** Older quests have only a life area. This maps them onto a quadrant so they work with the new mechanics too. */
const FROM_AREA: Record<LifeArea, Quadrant> = {
  body: 'health', mind: 'learning', money: 'finance', romance: 'romance', friends: 'social', family: 'social', mission: 'career', soul: 'recreation',
};
export const quadrantOf = (q: Pick<Quest, 'quadrant' | 'area'>): Quadrant => q.quadrant ?? FROM_AREA[q.area];

// ---------- Pebble's Energy Sync ----------
export const SYNERGY_MULT = 1.5;
export const SYNERGY_MS = 24 * 3600 * 1000;
export const VITALITY_MS = 6 * 3600 * 1000;

// ---------- Focus Beacon ----------
export const FOCUS_MS = 45 * 60 * 1000;
export const FOCUS_COINS = 15;
export const TEA_COINS = 5;

// ---------- Town Square ----------
export const BANNER_MS = 24 * 3600 * 1000;

// ---------- Love letters ----------
export const BOTTLE_SHELLS = 3;

// ---------- Dream Vault ----------
export interface Blueprint { id: string; name: string; icon: string; cost: number; blurb: string; items: Record<string, number>; boxes: number }
export const BLUEPRINTS: Blueprint[] = [
  { id: 'glass_cafe', name: 'Glass Café', icon: '🏛️', cost: 400, blurb: 'A sunlit café with a full counter and pastry case.', items: { cafe_counter: 1, cafe_pastry_case: 1, cafe_round_set: 1 }, boxes: 1 },
  { id: 'rooftop', name: 'Rooftop Deck', icon: '🌇', cost: 800, blurb: 'Cushioned seating under the open sky.', items: { cafe_cushion_set: 2, table_cafe: 1 }, boxes: 2 },
];
/** Share of a finished finance goal that goes straight into the vault. */
export const FINANCE_VAULT_SHARE = 0.5;

export const otherP = (p: PlayerId): PlayerId => (p === 'A' ? 'B' : 'A');
