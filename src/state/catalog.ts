export type Layer = 'floor' | 'wall' | 'object';
export type ShopCategory = 'floor' | 'wall' | 'furniture' | 'decor' | 'seasonal';
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
  h: number; // pixel height
  color: number;
  color2?: number; // floor checker, plant leaves, accents
  variant?: 'wall' | 'window' | 'door';
  shape?: Shape;
  facing?: boolean; // shows a headboard/backrest so rotation is visible
}

const c = (coins: number, gems = 0) => ({ coins, gems });

export const CATALOG: CatalogItem[] = [
  // floors
  { id: 'floor_wood', name: 'Wood Floor', icon: '🟫', category: 'floor', layer: 'floor', price: c(40), w: 1, d: 1, h: 0, color: 0xe3c295 },
  { id: 'floor_pink', name: 'Pink Tile', icon: '🌸', category: 'floor', layer: 'floor', price: c(60), w: 1, d: 1, h: 0, color: 0xffd3de },
  { id: 'floor_checker', name: 'Café Checker', icon: '🏁', category: 'floor', layer: 'floor', price: c(80), w: 1, d: 1, h: 0, color: 0xfff4ee, color2: 0xf7b8c8 },
  // walls
  { id: 'wall_cream', name: 'Cream Wall', icon: '🧱', category: 'wall', layer: 'wall', price: c(40), w: 1, d: 1, h: 36, color: 0xf8ecd8, variant: 'wall' },
  { id: 'wall_window', name: 'Window Wall', icon: '🪟', category: 'wall', layer: 'wall', price: c(70), w: 1, d: 1, h: 36, color: 0xf8ecd8, variant: 'window' },
  { id: 'wall_door', name: 'Door Frame', icon: '🚪', category: 'wall', layer: 'wall', price: c(80), w: 1, d: 1, h: 36, color: 0xf8ecd8, variant: 'door' },
  // furniture
  { id: 'bed_gingham', name: 'Gingham Bed', icon: '🛏️', category: 'furniture', layer: 'object', price: c(300), w: 2, d: 1, h: 14, color: 0xc9e4b8, color2: 0xb98a5a, facing: true },
  { id: 'nightstand', name: 'Nightstand', icon: '🗄️', category: 'furniture', layer: 'object', price: c(120), w: 1, d: 1, h: 16, color: 0xd9a86c },
  { id: 'chair_sage', name: 'Sage Chair', icon: '🪑', category: 'furniture', layer: 'object', price: c(100), w: 1, d: 1, h: 12, color: 0xb8d8a8, color2: 0xa0724a, facing: true },
  { id: 'sofa_blush', name: 'Blush Sofa', icon: '🛋️', category: 'furniture', layer: 'object', price: c(250), w: 2, d: 1, h: 14, color: 0xffc4d2, color2: 0xf0a3b8, facing: true },
  { id: 'table_cafe', name: 'Café Table', icon: '☕', category: 'furniture', layer: 'object', price: c(140), w: 1, d: 1, h: 14, color: 0xe9c9a0, shape: 'round' },
  { id: 'bookshelf', name: 'Bookshelf', icon: '📚', category: 'furniture', layer: 'object', price: c(150), w: 1, d: 1, h: 34, color: 0xcf9a5f, color2: 0xf4b6c2, facing: true },
  // decor
  { id: 'plant', name: 'Potted Plant', icon: '🪴', category: 'decor', layer: 'object', price: c(60), w: 1, d: 1, h: 10, color: 0xe5a98b, color2: 0x7fc47a, shape: 'round' },
  { id: 'mug', name: 'Smiley Mug', icon: '☕', category: 'decor', layer: 'object', price: c(30), w: 1, d: 1, h: 7, color: 0xfff6ee, shape: 'round' },
  { id: 'lamp_miffy', name: 'Miffy Lamp', icon: '🐰', category: 'decor', layer: 'object', price: c(0, 20), w: 1, d: 1, h: 18, color: 0xfff0b0, color2: 0xffffff, shape: 'round' },
  { id: 'plush_kitty', name: 'Kitty Plushie', icon: '🎀', category: 'decor', layer: 'object', price: c(0, 15), w: 1, d: 1, h: 10, color: 0xffffff, color2: 0xff7fa1, shape: 'round' },
  { id: 'espresso', name: 'Espresso Machine', icon: '🫖', category: 'decor', layer: 'object', price: c(0, 25), w: 1, d: 1, h: 20, color: 0xffb3c6, color2: 0xffffff },
  // seasonal
  { id: 'xmas_tree', name: 'Christmas Tree', icon: '🎄', category: 'seasonal', layer: 'object', price: c(0, 30), w: 1, d: 1, h: 46, color: 0x4fa56b, color2: 0xffd84d, shape: 'tree' },
  { id: 'pumpkin', name: 'Pumpkin', icon: '🎃', category: 'seasonal', layer: 'object', price: c(0, 10), w: 1, d: 1, h: 10, color: 0xf59a3c, color2: 0x6a8f3a, shape: 'round' },
];

export const itemOf = (id: string): CatalogItem | undefined => CATALOG.find((i) => i.id === id);

export const CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: 'floor', label: 'Floors' },
  { id: 'wall', label: 'Walls' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'decor', label: 'Decor' },
  { id: 'seasonal', label: 'Seasonal' },
];

/** Footprint after rotation (90 degree steps swap width and depth). */
export function footprint(item: CatalogItem, rotation: number): { w: number; d: number } {
  return rotation % 180 === 0 ? { w: item.w, d: item.d } : { w: item.d, d: item.w };
}
