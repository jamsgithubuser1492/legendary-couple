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
  /** A spritesheet with a real walking cycle. Others use a placeholder bounce. */
  walkSheet?: string;
}

export const COMPANIONS: Companion[] = [
  { id: 'kitty', name: 'Hello Kitty', icon: '🎀' },
  { id: 'miffy', name: 'Miffy', icon: '🐰' },
  { id: 'snoopy', name: 'Snoopy', icon: '🐶' },
  { id: 'dog', name: 'Golden Retriever', icon: '🐕' },
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
  { id: 'outfit_miffy_winter', companion: 'miffy', name: 'Winter Coat', sprite: 'outfit_miffy_winter', price: c(200) },
  { id: 'outfit_miffy_date', companion: 'miffy', name: 'Date Night Velvet', sprite: 'outfit_miffy_date', price: c(250) },
  { id: 'outfit_miffy_concert', companion: 'miffy', name: 'Concert Night', sprite: 'outfit_miffy_concert', price: c(250) },
  { id: 'outfit_miffy_holiday', companion: 'miffy', name: 'Holiday Sweater', sprite: 'outfit_miffy_holiday', price: c(200) },
  { id: 'outfit_miffy_beach', companion: 'miffy', name: 'Beach Day', sprite: 'outfit_miffy_beach', price: c(180) },
  { id: 'outfit_miffy_barista', companion: 'miffy', name: 'Matcha Barista', sprite: 'outfit_miffy_barista', price: c(180) },
  { id: 'outfit_miffy_golden', companion: 'miffy', name: 'Golden Star Dress', sprite: 'outfit_miffy_golden', price: c(0, 40) },
  { id: 'outfit_miffy_pajamas', companion: 'miffy', name: 'Pastel Pajamas', sprite: 'outfit_miffy_pajamas', price: c(150) },
  { id: 'outfit_kitty_winter', companion: 'kitty', name: 'Winter Coat', sprite: 'outfit_kitty_winter', price: c(200) },
  { id: 'outfit_kitty_garden', companion: 'kitty', name: 'Picnic Garden', sprite: 'outfit_kitty_garden', price: c(180) },
  { id: 'outfit_kitty_chef', companion: 'kitty', name: 'Camp Chef', sprite: 'outfit_kitty_chef', price: c(220) },
  { id: 'outfit_kitty_jogger', companion: 'kitty', name: 'Sporty Jogger', sprite: 'outfit_kitty_jogger', price: c(180) },
  { id: 'outfit_snoopy_beach', companion: 'snoopy', name: 'Beach Day', sprite: 'outfit_snoopy_beach', price: c(180) },
  { id: 'outfit_snoopy_barista', companion: 'snoopy', name: 'Café Barista', sprite: 'outfit_snoopy_barista', price: c(180) },
  { id: 'outfit_snoopy_date', companion: 'snoopy', name: 'Date Night', sprite: 'outfit_snoopy_date', price: c(250) },
  { id: 'outfit_snoopy_concert', companion: 'snoopy', name: 'Concert Night', sprite: 'outfit_snoopy_concert', price: c(250) },
  { id: 'outfit_snoopy_rain', companion: 'snoopy', name: 'Rain Day', sprite: 'outfit_snoopy_rain', price: c(150) },
  { id: 'outfit_snoopy_chef', companion: 'snoopy', name: 'Camp Chef', sprite: 'outfit_snoopy_chef', price: c(220) },
  { id: 'outfit_snoopy_jogger', companion: 'snoopy', name: 'Sporty Jogger', sprite: 'outfit_snoopy_jogger', price: c(180) },
  { id: 'dog_default', companion: 'dog', name: 'Golden Coat', sprite: 'pet_golden', price: c(0), isDefault: true, walkSheet: 'dog_walk_side' },
];

export const outfitOf = (id: string) => OUTFITS.find((o) => o.id === id);
export const outfitsFor = (cid: CompanionId) => OUTFITS.filter((o) => o.companion === cid);

export const defaultWardrobe = () => ({
  owned: OUTFITS.filter((o) => o.isDefault).map((o) => o.id),
  equipped: { kitty: 'kitty_o1', miffy: 'miffy_sweater', snoopy: 'snoopy_o1', dog: 'dog_default' } as Record<CompanionId, string>,
  invited: [] as CompanionId[],
});
