import type { CompanionId } from '../types';

export interface Companion {
  id: CompanionId;
  name: string;
  icon: string;
}

export interface Outfit {
  id: string;
  companion: CompanionId;
  name: string;
  sprite: string;
  price: { coins: number; gems: number };
  isDefault?: boolean;
}

export const COMPANIONS: Companion[] = [
  { id: 'kitty', name: 'Hello Kitty', icon: '🎀' },
  { id: 'miffy', name: 'Miffy', icon: '🐰' },
  { id: 'snoopy', name: 'Snoopy', icon: '🐶' },
];

const c = (coins: number, gems = 0) => ({ coins, gems });

export const OUTFITS: Outfit[] = [
  { id: 'kitty_o1', companion: 'kitty', name: 'Plaid and Overalls', sprite: 'kitty_o1', price: c(0), isDefault: true },
  { id: 'kitty_o2', companion: 'kitty', name: 'Green Parka', sprite: 'kitty_o2', price: c(150) },
  { id: 'kitty_o4', companion: 'kitty', name: 'Red Plaid Hiker', sprite: 'kitty_o4', price: c(200) },
  { id: 'miffy_sweater', companion: 'miffy', name: 'Blue Knit Sweater', sprite: 'miffy_sweater', price: c(0), isDefault: true },
  { id: 'miffy_raincoat', companion: 'miffy', name: 'Yellow Raincoat', sprite: 'miffy_raincoat', price: c(150) },
  { id: 'miffy_boots', companion: 'miffy', name: 'Trail Boots', sprite: 'miffy_boots', price: c(200) },
  { id: 'snoopy_o1', companion: 'snoopy', name: 'Scout Vest', sprite: 'snoopy_o1', price: c(0), isDefault: true },
  { id: 'snoopy_o2', companion: 'snoopy', name: 'Red Scarf Hiker', sprite: 'snoopy_o2', price: c(150) },
  { id: 'snoopy_o3', companion: 'snoopy', name: 'Cooler Break', sprite: 'snoopy_o3', price: c(0, 15) },
  { id: 'snoopy_o4', companion: 'snoopy', name: 'Backpacker', sprite: 'snoopy_o4', price: c(200) },
];

export const outfitOf = (id: string) => OUTFITS.find((o) => o.id === id);
export const outfitsFor = (cid: CompanionId) => OUTFITS.filter((o) => o.companion === cid);

export const defaultWardrobe = () => ({
  owned: OUTFITS.filter((o) => o.isDefault).map((o) => o.id),
  equipped: { kitty: 'kitty_o1', miffy: 'miffy_sweater', snoopy: 'snoopy_o1' } as Record<CompanionId, string>,
  invited: [] as CompanionId[],
});
