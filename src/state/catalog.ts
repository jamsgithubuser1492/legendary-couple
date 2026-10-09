import type { Theme } from './season';

export type Layer = 'floor' | 'wall' | 'object';
export type ShopCategory = 'floor' | 'wall' | 'furniture' | 'cafe' | 'decor' | 'pets' | 'landmark' | 'seasonal';
export type Shape = 'box' | 'round' | 'tree';

export interface CatalogItem {
  id: string;
  name: string;
  icon: string;
  category: ShopCategory;
  layer: Layer;
  price: { coins: number; gems: number };
  w: number; // footprint in tiles at rotation 0
  d: number;
  h: number; // pixel height for procedural fallback
  color: number;
  color2?: number;
  variant?: 'wall' | 'window' | 'door';
  shape?: Shape;
  facing?: boolean;
  /** Texture key from spriteList. Items without one are drawn procedurally. */
  sprite?: string;
  /** Extra vertical nudge for the sprite, in px (negative lifts it). */
  oy?: number;
  /** Limited-time items are only sold while one of these themes is active. */
  seasons?: Theme[];
}

const c = (coins: number, gems = 0) => ({ coins, gems });
const WINTERISH: Theme[] = ['winter', 'holidays'];

export const CATALOG: CatalogItem[] = [
  // floors
  { id: 'floor_wood', name: 'Wood Floor', icon: '🟫', category: 'floor', layer: 'floor', price: c(40), w: 1, d: 1, h: 0, color: 0xe3c295, sprite: 'floor_wood' },
  { id: 'floor_pink', name: 'Pink Tile', icon: '🌸', category: 'floor', layer: 'floor', price: c(60), w: 1, d: 1, h: 0, color: 0xffd3de },
  { id: 'floor_checker', name: 'Café Checker', icon: '🏁', category: 'floor', layer: 'floor', price: c(80), w: 1, d: 1, h: 0, color: 0xfff4ee, color2: 0xf7b8c8 },
  // walls (the art pieces auto-tile into straight runs and corners)
  { id: 'wall_cream', name: 'Cream Wall', icon: '🧱', category: 'wall', layer: 'wall', price: c(40), w: 1, d: 1, h: 36, color: 0xf8ecd8, variant: 'wall', sprite: 'wall_single' },
  { id: 'wall_window', name: 'Window Wall', icon: '🪟', category: 'wall', layer: 'wall', price: c(70), w: 1, d: 1, h: 36, color: 0xf8ecd8, variant: 'window', sprite: 'wall_window' },
  { id: 'wall_door', name: 'Door Frame', icon: '🚪', category: 'wall', layer: 'wall', price: c(80), w: 1, d: 1, h: 36, color: 0xf8ecd8, variant: 'door', sprite: 'wall_door' },
  // furniture
  { id: 'bed_gingham', name: 'Gingham Bed', icon: '🛏️', category: 'furniture', layer: 'object', price: c(300), w: 1, d: 2, h: 14, color: 0xc9e4b8, sprite: 'bed_gingham' },
  { id: 'nightstand', name: 'Nightstand', icon: '🗄️', category: 'furniture', layer: 'object', price: c(120), w: 1, d: 1, h: 16, color: 0xd9a86c, sprite: 'nightstand' },
  { id: 'chair_sage', name: 'Sage Chair', icon: '🪑', category: 'furniture', layer: 'object', price: c(100), w: 1, d: 1, h: 12, color: 0xb8d8a8, sprite: 'chair_sage' },
  { id: 'sofa_blush', name: 'Sectional Sofa', icon: '🛋️', category: 'furniture', layer: 'object', price: c(350), w: 3, d: 2, h: 14, color: 0xffc4d2, sprite: 'couch_sectional' },
  { id: 'table_cafe', name: 'Square Table Set', icon: '🍽️', category: 'furniture', layer: 'object', price: c(180), w: 2, d: 2, h: 14, color: 0xe9c9a0, sprite: 'square_table_set' },
  { id: 'bookshelf', name: 'Bookshelf', icon: '📚', category: 'furniture', layer: 'object', price: c(150), w: 1, d: 1, h: 34, color: 0xcf9a5f, sprite: 'bookshelf_cafe' },
  // café set
  { id: 'cafe_round_set', name: 'Round Table Set', icon: '☕', category: 'cafe', layer: 'object', price: c(160), w: 2, d: 2, h: 14, color: 0xe9c9a0, sprite: 'round_table_set' },
  { id: 'cafe_cushion_set', name: 'Cushioned Set', icon: '🪑', category: 'cafe', layer: 'object', price: c(200), w: 2, d: 2, h: 14, color: 0xf0c4d0, sprite: 'cushion_set' },
  { id: 'cafe_chair_a', name: 'Wooden Chair', icon: '🪑', category: 'cafe', layer: 'object', price: c(60), w: 1, d: 1, h: 12, color: 0xc48b55, sprite: 'wooden_chair_a' },
  { id: 'cafe_chair_b', name: 'Wooden Chair 2', icon: '🪑', category: 'cafe', layer: 'object', price: c(60), w: 1, d: 1, h: 12, color: 0xc48b55, sprite: 'wooden_chair_b' },
  { id: 'cafe_counter', name: 'Service Counter', icon: '🧾', category: 'cafe', layer: 'object', price: c(420), w: 3, d: 1, h: 20, color: 0xe3b27a, sprite: 'counter_pastry' },
  { id: 'cafe_pastry_case', name: 'Pastry Case', icon: '🍰', category: 'cafe', layer: 'object', price: c(300), w: 2, d: 1, h: 20, color: 0xe3b27a, sprite: 'pastry_case' },
  { id: 'cafe_bread_shelf', name: 'Bread Shelf', icon: '🥖', category: 'cafe', layer: 'object', price: c(240), w: 2, d: 1, h: 20, color: 0xe3b27a, sprite: 'bread_shelf' },
  { id: 'cafe_menu_a', name: 'Menu Board', icon: '🪧', category: 'cafe', layer: 'object', price: c(50), w: 1, d: 1, h: 20, color: 0x4a4a4a, sprite: 'menu_stand_a' },
  { id: 'cafe_menu_b', name: 'Menu Board 2', icon: '🪧', category: 'cafe', layer: 'object', price: c(50), w: 1, d: 1, h: 20, color: 0x4a4a4a, sprite: 'menu_stand_b' },
  { id: 'food_matcha', name: 'Matcha Latte', icon: '🍵', category: 'cafe', layer: 'object', price: c(30), w: 1, d: 1, h: 6, color: 0xbfe0a8, sprite: 'food_matcha' },
  { id: 'food_tray', name: 'Tea Tray', icon: '🫖', category: 'cafe', layer: 'object', price: c(40), w: 1, d: 1, h: 6, color: 0xe9c9a0, sprite: 'food_tray' },
  { id: 'food_cake_a', name: 'Berry Cake', icon: '🍰', category: 'cafe', layer: 'object', price: c(35), w: 1, d: 1, h: 6, color: 0xffd6e0, sprite: 'food_cake_a' },
  { id: 'food_cake_b', name: 'Choco Cake', icon: '🎂', category: 'cafe', layer: 'object', price: c(35), w: 1, d: 1, h: 6, color: 0x8a5a44, sprite: 'food_cake_b' },
  { id: 'food_slice', name: 'Cake Slice', icon: '🍰', category: 'cafe', layer: 'object', price: c(30), w: 1, d: 1, h: 6, color: 0xffe0e8, sprite: 'food_slice' },
  { id: 'food_croissant', name: 'Croissants', icon: '🥐', category: 'cafe', layer: 'object', price: c(35), w: 1, d: 1, h: 6, color: 0xe8b060, sprite: 'food_croissant' },
  { id: 'food_display', name: 'Pastry Plate', icon: '🥐', category: 'cafe', layer: 'object', price: c(40), w: 1, d: 1, h: 6, color: 0xf0b0a0, sprite: 'food_display' },
  { id: 'food_macarons', name: 'Macarons', icon: '🍬', category: 'cafe', layer: 'object', price: c(40), w: 1, d: 1, h: 6, color: 0xb8e0a0, sprite: 'food_macarons' },
  { id: 'food_loaf', name: 'Bread Loaf', icon: '🍞', category: 'cafe', layer: 'object', price: c(25), w: 1, d: 1, h: 6, color: 0xd8a060, sprite: 'food_loaf' },
  { id: 'food_bread', name: 'Sliced Bread', icon: '🍞', category: 'cafe', layer: 'object', price: c(25), w: 1, d: 1, h: 6, color: 0xe0b070, sprite: 'food_bread' },
  // decor
  { id: 'plant', name: 'Potted Plant', icon: '🪴', category: 'decor', layer: 'object', price: c(60), w: 1, d: 1, h: 10, color: 0xe5a98b, color2: 0x7fc47a, shape: 'round', sprite: 'plant_a' },
  { id: 'plant_b', name: 'Flowering Plant', icon: '🌼', category: 'decor', layer: 'object', price: c(60), w: 1, d: 1, h: 10, color: 0xe5a98b, sprite: 'plant_b' },
  { id: 'plant_snake', name: 'Snake Plant', icon: '🌿', category: 'decor', layer: 'object', price: c(70), w: 1, d: 1, h: 10, color: 0xe5a98b, sprite: 'plant_snake' },
  { id: 'mug', name: 'Smiley Mug', icon: '☕', category: 'decor', layer: 'object', price: c(30), w: 1, d: 1, h: 7, color: 0xfff6ee, shape: 'round', sprite: 'mug' },
  { id: 'lamp_miffy', name: 'Cozy Lamp', icon: '💡', category: 'decor', layer: 'object', price: c(0, 20), w: 1, d: 1, h: 18, color: 0xfff0b0, color2: 0xffffff, shape: 'round', sprite: 'lamp' },
  { id: 'suitcase', name: 'Vintage Suitcase', icon: '🧳', category: 'decor', layer: 'object', price: c(90), w: 1, d: 1, h: 12, color: 0xb87a4a, sprite: 'suitcase' },
  { id: 'espresso', name: 'Espresso Machine', icon: '🫖', category: 'decor', layer: 'object', price: c(0, 25), w: 1, d: 1, h: 20, color: 0xffb3c6, color2: 0xffffff },
  { id: 'surfboards', name: 'Surfboards', icon: '🏄', category: 'decor', layer: 'object', price: c(80), w: 1, d: 1, h: 30, color: 0xbfe6f2, sprite: 'surfboards' },
  // pets and plushies
  { id: 'plush_kitty', name: 'Kitty Plushie', icon: '🎀', category: 'pets', layer: 'object', price: c(0, 15), w: 1, d: 1, h: 10, color: 0xffffff, color2: 0xff7fa1, shape: 'round', sprite: 'plush_kitty' },
  { id: 'plush_miffy', name: 'Bunny Plushie', icon: '🐰', category: 'pets', layer: 'object', price: c(0, 15), w: 1, d: 1, h: 10, color: 0xffffff, sprite: 'plush_miffy' },
  { id: 'pet_golden', name: 'Golden Retriever', icon: '🐕', category: 'pets', layer: 'object', price: c(0, 40), w: 1, d: 1, h: 10, color: 0xe0a84c, sprite: 'pet_golden' },
  { id: 'pet_corgi', name: 'Corgi', icon: '🐶', category: 'pets', layer: 'object', price: c(0, 40), w: 1, d: 1, h: 10, color: 0xe8a050, sprite: 'pet_corgi' },
  { id: 'pet_bunny', name: 'Little Bunny', icon: '🐇', category: 'pets', layer: 'object', price: c(0, 25), w: 1, d: 1, h: 10, color: 0xf6e8dc, sprite: 'pet_bunny' },
  // landmarks
  { id: 'lm_palms', name: 'Palm Grove', icon: '🌴', category: 'landmark', layer: 'object', price: c(250), w: 2, d: 2, h: 40, color: 0x7fc47a, sprite: 'palm_grove' },
  { id: 'lm_lifeguard', name: 'Lifeguard Stand', icon: '🏖️', category: 'landmark', layer: 'object', price: c(0, 35), w: 2, d: 2, h: 40, color: 0xe3b27a, sprite: 'lifeguard_stand' },
  { id: 'lm_cottage', name: 'Pastel Cottage', icon: '🏡', category: 'landmark', layer: 'object', price: c(0, 60), w: 2, d: 2, h: 40, color: 0xc4b0d8, sprite: 'cottage' },
  { id: 'lm_cafe', name: 'Sunset Café', icon: '🏪', category: 'landmark', layer: 'object', price: c(0, 80), w: 3, d: 3, h: 40, color: 0xe3b27a, sprite: 'cafe_exterior' },
  { id: 'lm_home', name: 'Dream Home', icon: '🏠', category: 'landmark', layer: 'object', price: c(0, 100), w: 3, d: 3, h: 40, color: 0xc4b0d8, sprite: 'home_house' },
  { id: 'lm_miniso', name: 'Miniso Store', icon: '🛍️', category: 'landmark', layer: 'object', price: c(0, 100), w: 3, d: 3, h: 40, color: 0xe3b27a, sprite: 'miniso' },
  { id: 'lm_lighthouse', name: 'Lighthouse', icon: '🗼', category: 'landmark', layer: 'object', price: c(0, 120), w: 3, d: 3, h: 60, color: 0xe3b27a, sprite: 'lighthouse' },
  // seasonal, limited time
  { id: 'tree_spring', name: 'Blossom Tree', icon: '🌸', category: 'seasonal', layer: 'object', price: c(0, 15), w: 1, d: 1, h: 40, color: 0xffc4d6, sprite: 'tree_spring', seasons: ['spring'] },
  { id: 'blanket_spring', name: 'Spring Picnic Blanket', icon: '🧺', category: 'seasonal', layer: 'object', price: c(0, 10), w: 1, d: 1, h: 6, color: 0xffd3de, sprite: 'blanket_spring', seasons: ['spring'] },
  { id: 'tree_summer', name: 'Sunflower Tree', icon: '🌻', category: 'seasonal', layer: 'object', price: c(0, 15), w: 1, d: 1, h: 40, color: 0xf6d860, sprite: 'tree_summer', seasons: ['summer'] },
  { id: 'blanket_summer', name: 'Summer Picnic Blanket', icon: '🧺', category: 'seasonal', layer: 'object', price: c(0, 10), w: 1, d: 1, h: 6, color: 0xf8dc7a, sprite: 'blanket_summer', seasons: ['summer'] },
  { id: 'tree_autumn', name: 'Maple Tree', icon: '🍁', category: 'seasonal', layer: 'object', price: c(0, 15), w: 1, d: 1, h: 40, color: 0xf08a3c, sprite: 'tree_autumn', seasons: ['autumn'] },
  { id: 'blanket_autumn', name: 'Autumn Picnic Blanket', icon: '🧺', category: 'seasonal', layer: 'object', price: c(0, 10), w: 1, d: 1, h: 6, color: 0xf0a060, sprite: 'blanket_autumn', seasons: ['autumn'] },
  { id: 'pumpkin', name: 'Pumpkin', icon: '🎃', category: 'seasonal', layer: 'object', price: c(0, 10), w: 1, d: 1, h: 10, color: 0xf59a3c, color2: 0x6a8f3a, shape: 'round', seasons: ['autumn'] },
  { id: 'tree_winter', name: 'Snowy Tree', icon: '⛄', category: 'seasonal', layer: 'object', price: c(0, 15), w: 1, d: 1, h: 40, color: 0xe4eff7, sprite: 'tree_winter', seasons: WINTERISH },
  { id: 'blanket_winter', name: 'Winter Picnic Blanket', icon: '🧺', category: 'seasonal', layer: 'object', price: c(0, 10), w: 1, d: 1, h: 6, color: 0xa8c8f0, sprite: 'blanket_winter', seasons: WINTERISH },
  { id: 'xmas_tree', name: 'Christmas Tree', icon: '🎄', category: 'seasonal', layer: 'object', price: c(0, 30), w: 1, d: 1, h: 46, color: 0x4fa56b, color2: 0xffd84d, shape: 'tree', sprite: 'xmas_tree', seasons: ['holidays'] },
  { id: 'blanket_red', name: 'Holiday Blanket', icon: '🧣', category: 'seasonal', layer: 'object', price: c(0, 12), w: 1, d: 1, h: 6, color: 0xe85a6a, sprite: 'blanket_red', seasons: ['holidays'] },
];

export const itemOf = (id: string): CatalogItem | undefined => CATALOG.find((i) => i.id === id);

export const CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: 'floor', label: 'Floors' },
  { id: 'wall', label: 'Walls' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'cafe', label: 'Café' },
  { id: 'decor', label: 'Decor' },
  { id: 'pets', label: 'Pets' },
  { id: 'landmark', label: 'Landmarks' },
  { id: 'seasonal', label: 'Seasonal' },
];

/** Footprint after rotation (90 degree steps swap width and depth). */
export function footprint(item: CatalogItem, rotation: number): { w: number; d: number } {
  return rotation % 180 === 0 ? { w: item.w, d: item.d } : { w: item.d, d: item.w };
}

/** Limited-time items can only be bought while their theme is active. */
export const availableIn = (item: CatalogItem, theme: Theme): boolean => !item.seasons || item.seasons.includes(theme);
