import type { BlindReward, Rarity } from '../types';
import { availableIn, CATALOG } from './catalog';
import { OUTFITS } from './wardrobe';
import type { Theme } from './season';

export const BOX_PRICE_GEMS = 25;
export const DUPLICATE_REFUND_GEMS = 15;

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Common', color: 'bg-green-200' },
  rare: { label: 'Rare', color: 'bg-sky' },
  epic: { label: 'Epic', color: 'bg-purple-200' },
  legendary: { label: 'Legendary', color: 'bg-amber-200' },
};

interface Entry {
  kind: 'item' | 'outfit';
  refId: string;
  value: number;
}

const valueOf = (p: { coins: number; gems: number }) => Math.max(20, p.coins + p.gems * 5);

function pool(theme: Theme): Entry[] {
  const items = CATALOG.filter((i) => i.layer !== 'floor' && availableIn(i, theme)).map<Entry>((i) => ({ kind: 'item', refId: i.id, value: valueOf(i.price) }));
  const outfits = OUTFITS.filter((o) => !o.isDefault).map<Entry>((o) => ({ kind: 'outfit', refId: o.id, value: valueOf(o.price) }));
  return [...items, ...outfits];
}

const band = (r: Rarity, v: number) =>
  r === 'common' ? v <= 70 : r === 'rare' ? v > 70 && v <= 250 : r === 'epic' ? v > 250 && v <= 550 : v > 550;

/** Rolls one surprise. Common 60%, rare 30%, epic 9%, legendary 1%. Duplicate outfits refund gems. */
export function rollReward(theme: Theme, ownedOutfits: string[], rand: () => number = Math.random): BlindReward {
  const roll = rand() * 100;
  const rarity: Rarity = roll < 60 ? 'common' : roll < 90 ? 'rare' : roll < 99 ? 'epic' : 'legendary';
  if (rarity === 'common') {
    const r = rand();
    if (r < 0.2) return { kind: 'coins', amount: 60, rarity };
    if (r < 0.3) return { kind: 'gems', amount: 6, rarity };
  }
  const all = pool(theme);
  const order: Rarity[] = ['legendary', 'epic', 'rare', 'common'];
  // if a rarity has nothing in stock, fall down to the next one
  for (const r of order.slice(order.indexOf(rarity))) {
    const options = all.filter((e) => band(r, e.value));
    if (!options.length) continue;
    const pick = options[Math.floor(rand() * options.length)];
    if (pick.kind === 'outfit' && ownedOutfits.includes(pick.refId)) {
      return { kind: 'gems', amount: DUPLICATE_REFUND_GEMS, rarity: r, duplicate: true };
    }
    return { kind: pick.kind, refId: pick.refId, rarity: r };
  }
  return { kind: 'coins', amount: 60, rarity: 'common' };
}
