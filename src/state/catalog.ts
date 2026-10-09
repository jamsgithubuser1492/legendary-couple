import type { Theme } from './season';

export type Layer = 'floor' | 'wall' | 'walldecor' | 'object';
export type ShopCategory = 'floor' | 'wall' | 'walldecor' | 'furniture' | 'cafe' | 'camp' | 'decor' | 'pets' | 'landmark' | 'seasonal';
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
  /** Wall decor only: how high above the floor the piece hangs, in px. */
  lift?: number;
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
  // --- Build 6 art: starter furniture ---
  { id: 'bed_wood', name: 'Wooden Bed', icon: '🛏️', category: 'furniture', layer: 'object', price: c(320), w: 1, d: 2, h: 14, color: 0xc9a070, sprite: 'bed_wood' },
  { id: 'bookshelf_small', name: 'Small Bookshelf', icon: '📚', category: 'furniture', layer: 'object', price: c(140), w: 1, d: 1, h: 34, color: 0xcf9a5f, sprite: 'bookshelf_small' },
  { id: 'bedding_cozy', name: 'Cozy Bedding', icon: '🛌', category: 'furniture', layer: 'object', price: c(160), w: 1, d: 2, h: 8, color: 0xf6d6e0, sprite: 'bedding_cozy' },
  { id: 'kitchenette', name: 'Kitchenette', icon: '🍳', category: 'furniture', layer: 'object', price: c(380), w: 2, d: 1, h: 30, color: 0xc78e5c, sprite: 'kitchenette' },
  { id: 'dinette_seating', name: 'Dinette Booth', icon: '🪑', category: 'furniture', layer: 'object', price: c(260), w: 2, d: 2, h: 14, color: 0x9ccfc0, sprite: 'dinette_seating' },
  { id: 'cabinet_shelving', name: 'Cabinet Shelving', icon: '🗄️', category: 'furniture', layer: 'object', price: c(160), w: 1, d: 1, h: 34, color: 0xe0b080, sprite: 'cabinet_shelving' },
  { id: 'bathroom_module', name: 'Bathroom Module', icon: '🚿', category: 'furniture', layer: 'object', price: c(220), w: 1, d: 1, h: 40, color: 0xeaf4f6, sprite: 'bathroom_module' },
  { id: 'plant_rack', name: 'Plant Rack', icon: '🪴', category: 'furniture', layer: 'object', price: c(90), w: 1, d: 1, h: 34, color: 0xd9b078, sprite: 'plant_rack' },
  // --- wall decor (hangs on a wall piece) ---
  { id: 'print_palm', name: 'Palm Print', icon: '🖼️', category: 'walldecor', layer: 'walldecor', price: c(50), w: 1, d: 1, h: 0, color: 0xd9a86c, sprite: 'print_palm', lift: 36 },
  { id: 'print_coffee', name: 'Coffee Print', icon: '🖼️', category: 'walldecor', layer: 'walldecor', price: c(50), w: 1, d: 1, h: 0, color: 0xd9a86c, sprite: 'print_coffee', lift: 36 },
  { id: 'print_sunset', name: 'Sunset Print', icon: '🖼️', category: 'walldecor', layer: 'walldecor', price: c(60), w: 1, d: 1, h: 0, color: 0xd9a86c, sprite: 'print_sunset', lift: 36 },
  { id: 'shelf_plant', name: 'Plant Shelf', icon: '🪴', category: 'walldecor', layer: 'walldecor', price: c(70), w: 1, d: 1, h: 0, color: 0xb87a4a, sprite: 'shelf_plant', lift: 30 },
  { id: 'shelf_books', name: 'Book Shelf', icon: '📖', category: 'walldecor', layer: 'walldecor', price: c(70), w: 1, d: 1, h: 0, color: 0xb87a4a, sprite: 'shelf_books', lift: 30 },
  { id: 'string_lights', name: 'String Lights', icon: '💡', category: 'walldecor', layer: 'walldecor', price: c(90), w: 1, d: 1, h: 0, color: 0xffe08a, sprite: 'string_lights', lift: 42 },
  // --- camping ---
  { id: 'camp_site', name: 'Campfire Site', icon: '🔥', category: 'camp', layer: 'object', price: c(0, 40), w: 3, d: 3, h: 40, color: 0xf08a3c, sprite: 'camp_site' },
  { id: 'kitty_picnic', name: 'Picnic Table', icon: '🧺', category: 'camp', layer: 'object', price: c(220), w: 2, d: 2, h: 14, color: 0xc48b55, sprite: 'kitty_picnic' },
  { id: 'camp_chair_pink', name: 'Camp Chair Pink', icon: '🪑', category: 'camp', layer: 'object', price: c(70), w: 1, d: 1, h: 12, color: 0xf0a0b4, sprite: 'camp_chair_pink' },
  { id: 'camp_chair_blue', name: 'Camp Chair Blue', icon: '🪑', category: 'camp', layer: 'object', price: c(70), w: 1, d: 1, h: 12, color: 0x9cc8e0, sprite: 'camp_chair_blue' },
  { id: 'lantern_camp', name: 'Camp Lantern', icon: '🏮', category: 'camp', layer: 'object', price: c(45), w: 1, d: 1, h: 14, color: 0x8a9a5a, sprite: 'lantern_camp' },
  { id: 'lantern_soft', name: 'Soft Lantern', icon: '🏮', category: 'camp', layer: 'object', price: c(45), w: 1, d: 1, h: 14, color: 0xaab4c4, sprite: 'lantern_soft' },
  { id: 'lantern_oil', name: 'Oil Lantern', icon: '🏮', category: 'camp', layer: 'object', price: c(45), w: 1, d: 1, h: 14, color: 0xe0a860, sprite: 'lantern_oil' },
  { id: 'sleeping_bag_a', name: 'Sleeping Bag', icon: '🛌', category: 'camp', layer: 'object', price: c(60), w: 1, d: 1, h: 8, color: 0xe8a090, sprite: 'sleeping_bag_a' },
  { id: 'sleeping_bag_b', name: 'Teal Sleeping Bag', icon: '🛌', category: 'camp', layer: 'object', price: c(60), w: 1, d: 1, h: 8, color: 0x8ac4b8, sprite: 'sleeping_bag_b' },
  { id: 'sleeping_bag_pink', name: 'Pink Sleeping Bag', icon: '🛌', category: 'camp', layer: 'object', price: c(60), w: 1, d: 1, h: 8, color: 0xf0a0c0, sprite: 'sleeping_bag_pink' },
  { id: 'mugs_enamel', name: 'Enamel Mugs', icon: '☕', category: 'camp', layer: 'object', price: c(30), w: 1, d: 1, h: 6, color: 0xe0b090, sprite: 'mugs_enamel' },
  { id: 'coffee_pot', name: 'Camp Coffee Pot', icon: '☕', category: 'camp', layer: 'object', price: c(40), w: 1, d: 1, h: 10, color: 0xaab0b8, sprite: 'coffee_pot' },
  { id: 'camp_percolator', name: 'Percolator', icon: '☕', category: 'camp', layer: 'object', price: c(40), w: 1, d: 1, h: 10, color: 0xaab0b8, sprite: 'camp_percolator' },
  { id: 'firewood', name: 'Firewood', icon: '🪵', category: 'camp', layer: 'object', price: c(30), w: 1, d: 1, h: 8, color: 0xb87a4a, sprite: 'firewood' },
  { id: 'cooler', name: 'Cooler', icon: '🧊', category: 'camp', layer: 'object', price: c(70), w: 1, d: 1, h: 12, color: 0xf0b0c0, sprite: 'cooler' },
  { id: 'radio', name: 'Retro Radio', icon: '📻', category: 'camp', layer: 'object', price: c(60), w: 1, d: 1, h: 10, color: 0xc78e5c, sprite: 'radio' },
  { id: 'camp_stove', name: 'Camp Stove', icon: '🍳', category: 'camp', layer: 'object', price: c(60), w: 1, d: 1, h: 10, color: 0x8ab090, sprite: 'camp_stove' },
  { id: 'camp_pan', name: 'Frying Pan', icon: '🍳', category: 'camp', layer: 'object', price: c(35), w: 1, d: 1, h: 4, color: 0x555555, sprite: 'camp_pan' },
  { id: 'pet_bed', name: 'Pet Bed', icon: '🐾', category: 'pets', layer: 'object', price: c(50), w: 1, d: 1, h: 6, color: 0xe8a0a8, sprite: 'pet_bed' },
  // --- extra decor ---
  { id: 'lamp_floor', name: 'Floor Lamp', icon: '💡', category: 'decor', layer: 'object', price: c(90), w: 1, d: 1, h: 30, color: 0xfff0b0, sprite: 'lamp_floor' },
  { id: 'plant_floor', name: 'Fiddle Leaf Plant', icon: '🪴', category: 'decor', layer: 'object', price: c(80), w: 1, d: 1, h: 40, color: 0x7fc47a, sprite: 'plant_floor' },
  { id: 'latte_gold', name: 'Golden Latte', icon: '☕', category: 'decor', layer: 'object', price: c(30), w: 1, d: 1, h: 6, color: 0xfff6ee, sprite: 'latte_gold' },
  { id: 'pastry_trio', name: 'Pastry Trio', icon: '🥐', category: 'decor', layer: 'object', price: c(40), w: 1, d: 1, h: 6, color: 0xf0b0a0, sprite: 'pastry_trio' },
  { id: 'books_blanket', name: 'Books and Blanket', icon: '📚', category: 'decor', layer: 'object', price: c(40), w: 1, d: 1, h: 8, color: 0xc0a0b8, sprite: 'books_blanket' },
  { id: 'laundry_basket', name: 'Laundry Basket', icon: '🧺', category: 'decor', layer: 'object', price: c(40), w: 1, d: 1, h: 10, color: 0xe0b888, sprite: 'laundry_basket' },
  // --- landmarks ---
  { id: 'lm_rv', name: 'Camper Van', icon: '🚐', category: 'landmark', layer: 'object', price: c(0, 80), w: 2, d: 2, h: 40, color: 0x9ccfc0, sprite: 'rv_a' },
  { id: 'lm_rv_awning', name: 'Camper with Awning', icon: '🚐', category: 'landmark', layer: 'object', price: c(0, 80), w: 2, d: 2, h: 40, color: 0x9ccfc0, sprite: 'rv_b' },
  // --- seasonal wall decor ---
  { id: 'wreath_spring', name: 'Blossom Wreath', icon: '🌸', category: 'seasonal', layer: 'walldecor', price: c(0, 8), w: 1, d: 1, h: 0, color: 0xffc4d6, sprite: 'wreath_spring', lift: 36, seasons: ['spring'] },
  { id: 'garland_spring', name: 'Blossom Garland', icon: '🌸', category: 'seasonal', layer: 'walldecor', price: c(0, 8), w: 1, d: 1, h: 0, color: 0xffc4d6, sprite: 'garland_spring', lift: 44, seasons: ['spring'] },
  { id: 'wreath_summer', name: 'Sunflower Wreath', icon: '🌻', category: 'seasonal', layer: 'walldecor', price: c(0, 8), w: 1, d: 1, h: 0, color: 0xf6d860, sprite: 'wreath_summer', lift: 36, seasons: ['summer'] },
  { id: 'garland_summer', name: 'Sunflower Garland', icon: '🌻', category: 'seasonal', layer: 'walldecor', price: c(0, 8), w: 1, d: 1, h: 0, color: 0xf6d860, sprite: 'garland_summer', lift: 44, seasons: ['summer'] },
  { id: 'wreath_autumn', name: 'Autumn Wreath', icon: '🍁', category: 'seasonal', layer: 'walldecor', price: c(0, 8), w: 1, d: 1, h: 0, color: 0xf08a3c, sprite: 'wreath_autumn', lift: 36, seasons: ['autumn'] },
  { id: 'garland_autumn', name: 'Autumn Garland', icon: '🍁', category: 'seasonal', layer: 'walldecor', price: c(0, 8), w: 1, d: 1, h: 0, color: 0xf08a3c, sprite: 'garland_autumn', lift: 44, seasons: ['autumn'] },
  { id: 'wreath_winter', name: 'Frost Wreath', icon: '❄️', category: 'seasonal', layer: 'walldecor', price: c(0, 8), w: 1, d: 1, h: 0, color: 0xbcd8f0, sprite: 'wreath_winter', lift: 36, seasons: WINTERISH },
  { id: 'garland_winter', name: 'Frost Garland', icon: '❄️', category: 'seasonal', layer: 'walldecor', price: c(0, 8), w: 1, d: 1, h: 0, color: 0xbcd8f0, sprite: 'garland_winter', lift: 44, seasons: WINTERISH },
  { id: 'wreath_xmas', name: 'Bunny Wreath', icon: '🎄', category: 'seasonal', layer: 'walldecor', price: c(0, 12), w: 1, d: 1, h: 0, color: 0x4fa56b, sprite: 'wreath_xmas', lift: 36, seasons: ['holidays'] },
  { id: 'wreath_holiday', name: 'Evergreen Wreath', icon: '🎄', category: 'seasonal', layer: 'walldecor', price: c(0, 12), w: 1, d: 1, h: 0, color: 0x4fa56b, sprite: 'wreath_holiday', lift: 36, seasons: ['holidays'] },
  { id: 'garland_stars', name: 'Star Lights', icon: '⭐', category: 'seasonal', layer: 'walldecor', price: c(0, 12), w: 1, d: 1, h: 0, color: 0xffd84d, sprite: 'garland_stars', lift: 44, seasons: ['holidays'] },
];

export const itemOf = (id: string): CatalogItem | undefined => CATALOG.find((i) => i.id === id);

export const CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: 'floor', label: 'Floors' },
  { id: 'wall', label: 'Walls' },
  { id: 'walldecor', label: 'Wall Decor' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'cafe', label: 'Café' },
  { id: 'camp', label: 'Camping' },
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
