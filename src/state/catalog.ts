import type { Theme } from './season';

export type Layer = 'floor' | 'wall' | 'walldecor' | 'object';
export type ShopCategory = 'floor' | 'wall' | 'walldecor' | 'furniture' | 'cafe' | 'camp' | 'street' | 'park' | 'decor' | 'pets' | 'landmark' | 'seasonal';
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
  /** Wall surface: plaster (default), pink, sage, brick, batten, wainscot, picket, hedge or glass. */
  material?: 'seasonal' | 'plaster' | 'pink' | 'sage' | 'brick' | 'batten' | 'wainscot' | 'picket' | 'hedge' | 'glass';
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
  { id: 'espresso', name: 'Espresso Machine', icon: '🫖', category: 'decor', layer: 'object', price: c(0, 25), w: 1, d: 1, h: 20, color: 0xffb3c6, color2: 0xffffff, sprite: 'prop_cafe_espresso' },
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
  { id: 'pumpkin', name: 'Pumpkin', icon: '🎃', category: 'seasonal', layer: 'object', price: c(0, 10), w: 1, d: 1, h: 10, color: 0xf59a3c, color2: 0x6a8f3a, shape: 'round', seasons: ['autumn'], sprite: 'prop_autumn_pumpkin' },
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
  { id: 'street', label: 'Street & Beach' },
  { id: 'park', label: 'Park' },
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

// ---- Downtown, boardwalk and region art (Build 7) ----
const add = (
  id: string, name: string, icon: string, category: ShopCategory, layer: Layer,
  coins: number, gems: number, w: number, d: number, sprite: string, o: Partial<CatalogItem> = {},
) => CATALOG.push({ id, name, icon, category, layer, price: c(coins, gems), w, d, h: 20, color: 0xd9a86c, sprite, ...o });

add('bw_light', 'Boardwalk Light', '🟫', 'floor', 'floor', 50, 0, 1, 1, 'bw_light');
add('bw_light2', 'Boardwalk Sand', '🟫', 'floor', 'floor', 50, 0, 1, 1, 'bw_light2');
add('bw_coral', 'Boardwalk Coral', '🟧', 'floor', 'floor', 60, 0, 1, 1, 'bw_coral');
add('bw_dark', 'Boardwalk Dark', '🟫', 'floor', 'floor', 60, 0, 1, 1, 'bw_dark');
add('bw_brown', 'Boardwalk Walnut', '🟫', 'floor', 'floor', 60, 0, 1, 1, 'bw_brown');
add('bw_green', 'Boardwalk Seafoam', '🟩', 'floor', 'floor', 70, 0, 1, 1, 'bw_green');
add('bw_coral2', 'Boardwalk Sunset', '🟧', 'floor', 'floor', 70, 0, 1, 1, 'bw_coral2');
add('bw_sand', 'Sandy Edge', '🏖️', 'floor', 'floor', 70, 0, 1, 1, 'bw_sand');

for (const [k, n] of [['a', 'Classic'], ['b', 'Triple'], ['c', 'Glow'], ['d', 'Curved']] as const) {
  add(`street_lamp_${k}`, `${n} Street Lamp`, '🏮', 'street', 'object', 60, 0, 1, 1, `street_lamp_${k}`);
}
for (const [k, n] of [['a', 'Slat'], ['b', 'Walnut'], ['c', 'Scroll'], ['d', 'Weathered']] as const) {
  add(`bench_${k}`, `${n} Bench`, '🪑', 'street', 'object', 70, 0, 1, 1, `bench_${k}`);
}
add('planter_pot', 'Terracotta Pot', '🪴', 'street', 'object', 40, 0, 1, 1, 'planter_pot');
add('planter_box_a', 'Planter Box', '🌿', 'street', 'object', 70, 0, 1, 1, 'planter_box_a');
add('planter_box_b', 'Garden Box', '🌿', 'street', 'object', 70, 0, 1, 1, 'planter_box_b');
add('plant_tall', 'Tall Plant Box', '🌿', 'street', 'object', 80, 0, 1, 1, 'plant_tall');
add('phone_booth', 'Phone Booth', '☎️', 'street', 'object', 150, 0, 1, 1, 'phone_booth');
add('bus_sign', 'Bus Stop Sign', '🚏', 'street', 'object', 50, 0, 1, 1, 'bus_sign');
add('clock_post', 'Street Clock', '🕰️', 'street', 'object', 110, 0, 1, 1, 'clock_post');
add('bin_a', 'Recycling Bin', '♻️', 'street', 'object', 30, 0, 1, 1, 'bin_a');
add('bin_b', 'Trash Bin', '🗑️', 'street', 'object', 30, 0, 1, 1, 'bin_b');
add('wall_clock', 'Big Wall Clock', '🕰️', 'walldecor', 'walldecor', 90, 0, 1, 1, 'wall_clock', { lift: 36 });
add('stand_news', 'Newspaper Stand', '📰', 'street', 'object', 180, 0, 1, 1, 'stand_news');
add('stand_hotdog', 'Hot Dog Stand', '🌭', 'street', 'object', 220, 0, 2, 1, 'stand_hotdog');
add('stand_art', 'Art Vendor Table', '🖼️', 'street', 'object', 200, 0, 2, 1, 'stand_art');
add('board_message', 'Community Board', '📌', 'street', 'object', 160, 0, 2, 1, 'board_message');
add('volleyball_net', 'Volleyball Net', '🏐', 'street', 'object', 220, 0, 3, 2, 'volleyball_net');
add('beach_set', 'Umbrella & Lounger', '⛱️', 'street', 'object', 200, 0, 2, 2, 'beach_set');
add('souvenir_display', 'Souvenir Rack', '🗺️', 'street', 'object', 90, 0, 1, 1, 'souvenir_display');
add('seating_cluster', 'Outdoor Seating', '🪑', 'street', 'object', 260, 0, 2, 2, 'seating_cluster');
add('surfboard_rack', 'Surfboard Stand', '🏄', 'street', 'object', 90, 0, 1, 1, 'surfboard_rack');
add('surfboard_stack', 'Surfboard Rack', '🏄', 'street', 'object', 110, 0, 1, 1, 'surfboard_stack');
add('lifeguard_red', 'Red Lifeguard Tower', '🛟', 'landmark', 'object', 0, 35, 2, 2, 'lifeguard_red');
add('shop_bookstore', 'Vintage Bookstore', '📚', 'landmark', 'object', 0, 60, 3, 3, 'shop_bookstore');
add('shop_bistro', 'Bistro & Patisserie', '🥐', 'landmark', 'object', 0, 60, 3, 3, 'shop_bistro');
add('shop_florist', 'Blooms Florist', '💐', 'landmark', 'object', 0, 55, 3, 3, 'shop_florist');
add('shop_toy', 'Play Toy Store', '🎮', 'landmark', 'object', 0, 60, 3, 3, 'shop_toy');
add('shop_surf', 'Surf Shack', '🏄', 'landmark', 'object', 0, 55, 3, 3, 'shop_surf');
add('shop_icecream', 'Ice Cream Stand', '🍦', 'landmark', 'object', 0, 50, 2, 2, 'shop_icecream');
add('stand_coffee', 'Coffee Stand', '☕', 'landmark', 'object', 0, 45, 2, 2, 'stand_coffee');
add('shop_souvenir', 'Souvenir Shop', '🎁', 'landmark', 'object', 0, 55, 3, 3, 'shop_souvenir');
add('campus_buildings', 'Campus Buildings', '🏫', 'landmark', 'object', 0, 140, 4, 4, 'campus_buildings');
add('greenhouse_domes', 'Greenhouse Domes', '🌱', 'landmark', 'object', 0, 120, 4, 4, 'greenhouse_domes');
add('farm_tools', 'Farm Tools', '🧑‍🌾', 'camp', 'object', 50, 0, 1, 1, 'farm_tools');
add('crate_veg', 'Veggie Crates', '🥕', 'camp', 'object', 40, 0, 1, 1, 'crate_veg');
add('orange_tree', 'Orange Tree', '🍊', 'camp', 'object', 90, 0, 1, 1, 'orange_tree');
add('telescope', 'Telescope', '🔭', 'camp', 'object', 120, 0, 1, 1, 'telescope');
add('hiking_poles', 'Hiking Poles', '🥾', 'camp', 'object', 40, 0, 1, 1, 'hiking_poles');
add('golf_cart', 'Campus Cart', '🛺', 'camp', 'object', 160, 0, 1, 1, 'golf_cart');
add('vertical_farm', 'Vertical Farm', '🥬', 'camp', 'object', 140, 0, 1, 1, 'vertical_farm');
for (const [k, n] of [['grandma', 'Grandma Reading'], ['photographer', 'Photographer'], ['woman', 'Coffee Walker'], ['hat', 'Sun Hat Visitor']] as const) {
  add(`npc_${k}`, n, '🧑', 'pets', 'object', 0, 20, 1, 1, `npc_${k}`);
}

// ---- Park, road and street pieces (Build 13) ----
add('park_picnic', 'Picnic Tree', '🧺', 'park', 'object', 260, 0, 3, 2, 'park_picnic');
add('park_pond', 'Duck Pond', '🦆', 'park', 'object', 380, 0, 4, 3, 'park_pond');
add('park_fountain', 'Park Fountain', '⛲', 'park', 'object', 0, 70, 3, 3, 'park_fountain');
add('park_playground', 'Playground', '🛝', 'park', 'object', 520, 0, 4, 3, 'park_playground');
add('park_tennis', 'Tennis Court', '🎾', 'park', 'object', 640, 0, 5, 3, 'park_tennis');
add('park_gazebo', 'Garden Gazebo', '🛖', 'park', 'object', 340, 0, 2, 2, 'park_gazebo');
add('park_garden', 'Flower Garden', '🌷', 'park', 'object', 300, 0, 3, 3, 'park_garden');
for (const [k, n] of [['a', 'Slat'], ['b', 'Curved'], ['c', 'Plain'], ['d', 'Scroll']] as const) add(`park_bench_${k}`, `${n} Park Bench`, '🪑', 'park', 'object', 70, 0, 1, 1, `park_bench_${k}`);
add('park_lamp_a', 'Warm Lamp Post', '🏮', 'park', 'object', 80, 0, 1, 1, 'park_lamp_a');
add('park_lamp_b', 'Iron Lamp Post', '🏮', 'park', 'object', 80, 0, 1, 1, 'park_lamp_b');
add('crosswalk_a', 'Crosswalk', '🚸', 'street', 'floor', 60, 0, 1, 1, 'crosswalk_a');
add('crosswalk_b', 'Angled Crosswalk', '🚸', 'street', 'floor', 60, 0, 1, 1, 'crosswalk_b');
add('car_pink', 'Pink Beetle', '🚗', 'street', 'object', 0, 35, 1, 1, 'car_pink');
add('car_van', 'Retro Van', '🚌', 'street', 'object', 0, 45, 2, 1, 'car_van');
add('car_scooter', 'Scooter', '🛵', 'street', 'object', 140, 0, 1, 1, 'car_scooter');
add('mailbox_red', 'Red Postbox', '📮', 'street', 'object', 70, 0, 1, 1, 'mailbox_red');
add('mailbox_green', 'Green Mailbox', '📫', 'street', 'object', 70, 0, 1, 1, 'mailbox_green');
add('street_bin', 'Street Bin', '🗑️', 'street', 'object', 30, 0, 1, 1, 'street_bin');
add('bike_rack', 'Bike Rack', '🚲', 'street', 'object', 60, 0, 1, 1, 'bike_rack');
add('sign_park', 'Park Entry Sign', '🪧', 'street', 'object', 50, 0, 1, 1, 'sign_park');
add('sign_beach', 'Beach Sign', '🪧', 'street', 'object', 50, 0, 1, 1, 'sign_beach');



// ---- Build 18: home, outdoor, wall decor, seasonal and café items (sheet 44) ----
type Row = [id: string, name: string, icon: string, cat: ShopCategory, layer: Layer, coins: number, gems: number, w: number, d: number, sprite: string, extra?: Partial<CatalogItem>];
const WALL = { lift: 38 };
const SPR: Theme[] = ['spring'], SUM: Theme[] = ['summer'], AUT: Theme[] = ['autumn'], WIN: Theme[] = ['winter', 'holidays'];
const NEW_ITEMS: Row[] = [
  // kitchen and dining
  ['kitchen_oven', 'Antique Oven', '🍳', 'furniture', 'object', 320, 0, 1, 1, 'prop_kitchen_oven'],
  ['kitchen_fridge', 'Fridge', '🧊', 'furniture', 'object', 380, 0, 1, 1, 'prop_kitchen_fridge'],
  ['kitchen_island', 'Kitchen Island', '🍽️', 'furniture', 'object', 360, 0, 2, 1, 'prop_kitchen_island'],
  ['kitchen_sink', 'Farmhouse Sink', '🚰', 'furniture', 'object', 420, 0, 2, 1, 'prop_kitchen_sink'],
  ['kitchen_potrack', 'Copper Pot Rack', '🍳', 'walldecor', 'walldecor', 120, 0, 1, 1, 'prop_kitchen_potrack', { lift: 44 }],
  ['dining_table', 'Dining Table', '🍽️', 'furniture', 'object', 340, 0, 2, 2, 'prop_dining_table'],
  ['kitchen_dishes', 'Ceramic Dishes', '🍽️', 'furniture', 'object', 60, 0, 1, 1, 'prop_kitchen_dishes'],
  // living
  ['living_cushions', 'Floor Cushions', '🛋️', 'furniture', 'object', 90, 0, 1, 1, 'prop_living_cushions'],
  ['living_tv', 'TV and Console', '📺', 'furniture', 'object', 320, 0, 2, 1, 'prop_living_tv'],
  ['living_record', 'Record Player', '🎵', 'furniture', 'object', 200, 0, 1, 1, 'prop_living_record'],
  ['living_piano', 'Upright Piano', '🎹', 'furniture', 'object', 700, 0, 2, 1, 'prop_living_piano'],
  ['living_desk', 'Desk and Laptop', '💻', 'furniture', 'object', 240, 0, 1, 1, 'prop_living_desk'],
  ['living_easel', 'Painting Easel', '🎨', 'furniture', 'object', 120, 0, 1, 1, 'prop_living_easel'],
  ['living_yoga', 'Yoga Mat', '🧘', 'furniture', 'object', 40, 0, 1, 1, 'prop_living_yoga'],
  // bedroom and bathroom
  ['bed_wardrobe', 'Wardrobe', '🚪', 'furniture', 'object', 280, 0, 1, 1, 'prop_bed_wardrobe'],
  ['bed_dresser', 'Dresser', '🗄️', 'furniture', 'object', 220, 0, 1, 1, 'prop_bed_dresser'],
  ['bed_vanity', 'Vanity', '🪞', 'furniture', 'object', 260, 0, 1, 1, 'prop_bed_vanity'],
  ['bed_nightlight_a', 'Flame Nightlight', '💡', 'furniture', 'object', 40, 0, 1, 1, 'prop_bed_nightlight_a'],
  ['bed_nightlight_b', 'Soft Nightlight', '💡', 'furniture', 'object', 40, 0, 1, 1, 'prop_bed_nightlight_b'],
  ['bath_tub', 'Clawfoot Tub', '🛁', 'furniture', 'object', 360, 0, 2, 1, 'prop_bath_tub'],
  ['bath_sink', 'Vanity Sink', '🚰', 'furniture', 'object', 200, 0, 1, 1, 'prop_bath_sink'],
  ['bath_plant_a', 'Leafy Plant', '🪴', 'decor', 'object', 70, 0, 1, 1, 'prop_bath_plant_a'],
  ['bath_plant_b', 'Small Plant', '🪴', 'decor', 'object', 40, 0, 1, 1, 'prop_bath_plant_b'],
  ['bath_plant_c', 'Tall Plant', '🪴', 'decor', 'object', 80, 0, 1, 1, 'prop_bath_plant_c'],
  // outdoors
  ['outdoor_hottub', 'Hot Tub', '♨️', 'park', 'object', 600, 0, 2, 2, 'prop_outdoor_hottub'],
  ['outdoor_hammock', 'Hammock', '🛏️', 'park', 'object', 260, 0, 2, 1, 'prop_outdoor_hammock'],
  ['outdoor_firepit', 'Fire Pit', '🔥', 'park', 'object', 180, 0, 1, 1, 'prop_outdoor_firepit'],
  ['outdoor_bbq', 'BBQ Grill', '🍖', 'park', 'object', 220, 0, 1, 1, 'prop_outdoor_bbq'],
  ['outdoor_garden_a', 'Garden Bed', '🥬', 'park', 'object', 150, 0, 2, 1, 'prop_outdoor_garden_a'],
  ['outdoor_garden_b', 'Herb Bed', '🌿', 'park', 'object', 150, 0, 2, 1, 'prop_outdoor_garden_b'],
  ['outdoor_garden_c', 'Veggie Bed', '🥕', 'park', 'object', 150, 0, 2, 1, 'prop_outdoor_garden_c'],
  ['outdoor_palm', 'Potted Palm', '🌴', 'park', 'object', 90, 0, 1, 1, 'prop_outdoor_palm'],
  ['outdoor_greenhouse', 'Greenhouse', '🏡', 'park', 'object', 900, 0, 3, 3, 'prop_outdoor_greenhouse'],
  ['outdoor_coop', 'Chicken Coop', '🐔', 'park', 'object', 300, 0, 2, 2, 'prop_outdoor_coop'],
  ['outdoor_swing', 'Swing Set', '🛝', 'park', 'object', 420, 0, 3, 2, 'prop_outdoor_swing'],
  ['outdoor_gazebo', 'Gazebo', '🛖', 'park', 'object', 800, 0, 3, 3, 'prop_outdoor_gazebo'],
  ['outdoor_pergola', 'Pergola', '🏛️', 'park', 'object', 500, 0, 3, 3, 'prop_outdoor_pergola'],
  // wall decor and neon
  ['wall_print_a', 'Blossom Print', '🖼️', 'walldecor', 'walldecor', 60, 0, 1, 1, 'prop_wall_print_a', WALL],
  ['wall_print_b', 'Sunflower Print', '🖼️', 'walldecor', 'walldecor', 60, 0, 1, 1, 'prop_wall_print_b', WALL],
  ['wall_mirror_round', 'Round Mirror', '🪞', 'walldecor', 'walldecor', 80, 0, 1, 1, 'prop_wall_mirror_round', WALL],
  ['wall_mirror_oval', 'Oval Mirror', '🪞', 'walldecor', 'walldecor', 80, 0, 1, 1, 'prop_wall_mirror_oval', WALL],
  ['wall_shelf', 'Hanging Shelf', '📚', 'walldecor', 'walldecor', 70, 0, 1, 1, 'prop_wall_shelf', { lift: 34 }],
  ['wall_bunting', 'Pennant Bunting', '🎏', 'walldecor', 'walldecor', 60, 0, 1, 1, 'prop_wall_bunting', { lift: 46 }],
  ['neon_cafe', 'Matcha Masters Neon', '🍵', 'cafe', 'walldecor', 0, 30, 1, 1, 'prop_wall_neon_cafe', WALL],
  ['neon_cup', 'Neon Coffee Cup', '☕', 'cafe', 'walldecor', 0, 25, 1, 1, 'prop_wall_neon_cup', WALL],
  ['neon_sign', 'Neon Signature', '✨', 'walldecor', 'walldecor', 0, 20, 1, 1, 'prop_wall_neon_sign', { lift: 40 }],
  // pets
  ['pet_bed_a', 'Wooden Pet Bed', '🛏️', 'pets', 'object', 120, 0, 1, 1, 'prop_pet_bed_a'],
  ['pet_bed_b', 'Blue Pet Bed', '🛏️', 'pets', 'object', 120, 0, 1, 1, 'prop_pet_bed_b'],
  ['pet_bed_c', 'Pink Pet Bed', '🛏️', 'pets', 'object', 120, 0, 1, 1, 'prop_pet_bed_c'],
  ['pet_bowls', 'Colorful Bowls', '🥣', 'pets', 'object', 60, 0, 1, 1, 'prop_pet_bowls'],
  ['pet_toy', 'Pet Toys', '🧸', 'pets', 'object', 50, 0, 1, 1, 'prop_pet_toy'],
  // café
  ['cafe_espresso_pro', 'Pro Espresso Machine', '☕', 'cafe', 'object', 520, 0, 1, 1, 'prop_cafe_espresso'],
  ['cafe_espresso_small', 'Espresso Machine', '☕', 'cafe', 'object', 360, 0, 1, 1, 'prop_cafe_espresso_small'],
  ['cafe_pastry_glass', 'Glass Pastry Case', '🍰', 'cafe', 'object', 340, 0, 2, 1, 'prop_cafe_pastry_case'],
  ['cafe_patio', 'Patio Seating', '🪑', 'cafe', 'object', 220, 0, 1, 1, 'prop_cafe_patio'],
  ['cafe_menu_a', 'Large Menu Board', '📋', 'cafe', 'object', 90, 0, 1, 1, 'prop_cafe_menu_a'],
  ['cafe_menu_b', 'Café Menu Board', '📋', 'cafe', 'object', 90, 0, 1, 1, 'prop_cafe_menu_b'],
  ['cafe_hangplant_a', 'Hanging Plant', '🪴', 'cafe', 'walldecor', 70, 0, 1, 1, 'prop_cafe_hangplant_a', { lift: 40 }],
  ['cafe_hangplant_b', 'Trailing Plant', '🪴', 'cafe', 'walldecor', 70, 0, 1, 1, 'prop_cafe_hangplant_b', { lift: 40 }],
  ['cafe_lamp_a', 'Cream Pendant Lamp', '💡', 'cafe', 'walldecor', 80, 0, 1, 1, 'prop_cafe_lamp_a', { lift: 44 }],
  ['cafe_lamp_b', 'Bronze Pendant Lamp', '💡', 'cafe', 'walldecor', 80, 0, 1, 1, 'prop_cafe_lamp_b', { lift: 44 }],
  ['cafe_counter_dark', 'Walnut Counter', '🧾', 'cafe', 'object', 300, 0, 2, 1, 'prop_cafe_counter_dark'],
  ['cafe_counter_light', 'Light Wood Counter', '🧾', 'cafe', 'object', 300, 0, 2, 1, 'prop_cafe_counter_light'],
  ['cafe_counter_pink', 'Pastel Pink Counter', '🧾', 'cafe', 'object', 300, 0, 2, 1, 'prop_cafe_counter_pink'],
  ['cafe_stool_a', 'Wood Bar Stool', '🪑', 'cafe', 'object', 60, 0, 1, 1, 'prop_cafe_stool_a'],
  ['cafe_stool_b', 'Pink Bar Stool', '🪑', 'cafe', 'object', 60, 0, 1, 1, 'prop_cafe_stool_b'],
  ['cafe_records', 'Record Corner', '🎶', 'cafe', 'object', 260, 0, 2, 1, 'prop_cafe_records'],
  ['cafe_chalkboard', 'Daily Special Board', '📝', 'cafe', 'object', 120, 0, 1, 1, 'prop_cafe_chalkboard'],
  // seasonal sets (sold only in season)
  ['sp_wateringcan', 'Watering Can', '🚿', 'seasonal', 'object', 0, 8, 1, 1, 'prop_spring_wateringcan', { seasons: SPR }],
  ['sp_blossom', 'Cherry Blossom Branch', '🌸', 'seasonal', 'object', 0, 8, 1, 1, 'prop_spring_blossom', { seasons: SPR }],
  ['sp_seeds', 'Seed Packets', '🌱', 'seasonal', 'object', 0, 6, 1, 1, 'prop_spring_seeds', { seasons: SPR }],
  ['sp_gnome', 'Garden Gnome', '🧙', 'seasonal', 'object', 0, 10, 1, 1, 'prop_spring_gnome', { seasons: SPR }],
  ['sp_kite', 'Kite', '🪁', 'seasonal', 'object', 0, 8, 1, 1, 'prop_spring_kite', { seasons: SPR }],
  ['sp_birdfeeder', 'Birdfeeder', '🐦', 'seasonal', 'object', 0, 8, 1, 1, 'prop_spring_birdfeeder', { seasons: SPR }],
  ['sp_wreath', 'Spring Door Wreath', '💐', 'seasonal', 'walldecor', 0, 8, 1, 1, 'prop_spring_wreath', { seasons: SPR, lift: 40 }],
  ['su_palm', 'Little Palm', '🌴', 'seasonal', 'object', 0, 10, 1, 1, 'prop_summer_palm', { seasons: SUM }],
  ['su_ball', 'Beach Ball', '🏐', 'seasonal', 'object', 0, 6, 1, 1, 'prop_summer_ball', { seasons: SUM }],
  ['su_cart', 'Ice Cream Cart', '🍦', 'seasonal', 'object', 0, 16, 1, 1, 'prop_summer_cart', { seasons: SUM }],
  ['su_surfboards', 'Surfboards', '🏄', 'seasonal', 'object', 0, 10, 1, 1, 'prop_summer_surfboards', { seasons: SUM }],
  ['su_shells', 'Shell Collection', '🐚', 'seasonal', 'object', 0, 6, 1, 1, 'prop_summer_shells', { seasons: SUM }],
  ['su_fan', 'Standing Fan', '🌀', 'seasonal', 'object', 0, 8, 1, 1, 'prop_summer_fan', { seasons: SUM }],
  ['su_basket', 'Picnic Basket', '🧺', 'seasonal', 'object', 0, 8, 1, 1, 'prop_summer_basket', { seasons: SUM }],
  ['su_hammock', 'Net Hammock', '🛏️', 'seasonal', 'object', 0, 14, 2, 1, 'prop_summer_hammock', { seasons: SUM }],
  ['au_rake', 'Garden Rake', '🍂', 'seasonal', 'object', 0, 6, 1, 1, 'prop_autumn_rake', { seasons: AUT }],
  ['au_blanket', 'Cozy Blanket', '🧣', 'seasonal', 'object', 0, 8, 1, 1, 'prop_autumn_blanket', { seasons: AUT }],
  ['au_basket', 'Apple Basket', '🍎', 'seasonal', 'object', 0, 8, 1, 1, 'prop_autumn_basket', { seasons: AUT }],
  ['au_scarecrow', 'Scarecrow', '🎃', 'seasonal', 'object', 0, 12, 1, 1, 'prop_autumn_scarecrow', { seasons: AUT }],
  ['au_wreath', 'Harvest Wreath', '🍁', 'seasonal', 'walldecor', 0, 8, 1, 1, 'prop_autumn_wreath', { seasons: AUT, lift: 40 }],
  ['au_candle', 'Autumn Candle', '🕯️', 'seasonal', 'object', 0, 6, 1, 1, 'prop_autumn_candle', { seasons: AUT }],
  ['wi_bauble', 'Snow Ornament', '❄️', 'seasonal', 'object', 0, 6, 1, 1, 'prop_winter_bauble', { seasons: WIN }],
  ['wi_sled', 'Sled', '🛷', 'seasonal', 'object', 0, 10, 1, 1, 'prop_winter_sled', { seasons: WIN }],
  ['wi_scarf', 'Knitted Scarf', '🧣', 'seasonal', 'object', 0, 8, 1, 1, 'prop_winter_scarf', { seasons: WIN }],
  ['wi_gingerbread', 'Gingerbread Man', '🍪', 'seasonal', 'object', 0, 8, 1, 1, 'prop_winter_gingerbread', { seasons: WIN }],
  ['wi_mistletoe', 'Mistletoe', '🌿', 'seasonal', 'walldecor', 0, 8, 1, 1, 'prop_winter_mistletoe', { seasons: WIN, lift: 44 }],
  ['wi_boots', 'Snow Boots', '🥾', 'seasonal', 'object', 0, 8, 1, 1, 'prop_winter_boots', { seasons: WIN }],
  ['wi_cocoa', 'Warm Cocoa Mug', '☕', 'seasonal', 'object', 0, 6, 1, 1, 'prop_winter_cocoa', { seasons: WIN }],
];
for (const [id, name, icon, cat, layer, coins, gems, w, d, sprite, extra] of NEW_ITEMS) add(id, name, icon, cat, layer, coins, gems, w, d, sprite, extra);

// ---- Build 19: painted floors (sheets 36 and 37) ----
// These three read as flat tile or wood, so the game paints them itself and they join with no seam. The rest are decorative patches and rugs.
const PROCEDURAL_FLOORS = new Set(['floor_wood_plank', 'floor_cream_stone', 'floor_terracotta']);
for (const [id, name, icon, coins] of [
  ['floor_rug_blue', 'Pastel Rug Blue', '🟦', 90], ['floor_rug_pink', 'Pastel Rug Pink', '🟪', 90], ['floor_rug_yellow', 'Pastel Rug Yellow', '🟨', 90],
  ['floor_grass_flowers', 'Flower Meadow', '🌼', 70], ['floor_stone_path', 'Stone Path', '🪨', 70],
  ['floor_wood_plank', 'Parquet Wood', '🟫', 60], ['floor_cream_stone', 'Cream Stone Tile', '⬜', 80], ['floor_mosaic', 'Inlay Mosaic', '🔶', 140],
  ['floor_terracotta', 'Terracotta Tile', '🟧', 80], ['floor_wood_light', 'Light Wood Stain', '🟫', 50], ['floor_wood_mid', 'Mid Wood Stain', '🟫', 55],
  ['floor_wood_dark', 'Dark Wood Stain', '🟫', 60], ['floor_tatami', 'Tatami Mat', '🟩', 70], ['floor_carpet_plush', 'Plush Carpet', '🩷', 75],
] as const) add(id, name, icon, 'floor', 'floor', coins, 0, 1, 1, id, PROCEDURAL_FLOORS.has(id) ? { sprite: undefined, color: 0xe3c295 } : {});

// ---- Build 19: wall materials (sheet 36), drawn on the game's own wall shape so they join, corner and cross on their own ----
const WALL_MATS: [id: string, name: string, icon: string, coins: number, color: number, open: boolean][] = [
  ['pink', 'Pastel Pink', '🌸', 50, 0xf8cfdc, true], ['sage', 'Sage Green', '🌿', 50, 0xbcd6aa, true], ['brick', 'Exposed Brick', '🧱', 90, 0xc9725a, true],
  ['batten', 'Board and Batten', '🪵', 70, 0xeec9a2, true], ['wainscot', 'Wainscot', '🏠', 70, 0xf3e6d2, true],
  ['picket', 'White Picket Fence', '🏡', 40, 0xf8f4ec, false], ['hedge', 'Boxwood Hedge', '🌳', 60, 0x6aa04c, false], ['glass', 'Glass Panel Wall', '🪟', 110, 0xcfeaf5, false],
];
for (const [m, name, icon, coins, color, open] of WALL_MATS) {
  const material = m as CatalogItem['material'];
  CATALOG.push({ id: `wall_${m}`, name: `${name} Wall`, icon, category: 'wall', layer: 'wall', price: c(coins), w: 1, d: 1, h: 36, color, variant: 'wall', material });
  if (open) {
    CATALOG.push({ id: `wall_${m}_window`, name: `${name} Window`, icon: '🪟', category: 'wall', layer: 'wall', price: c(coins + 30), w: 1, d: 1, h: 36, color, variant: 'window', material });
    CATALOG.push({ id: `wall_${m}_door`, name: `${name} Door`, icon: '🚪', category: 'wall', layer: 'wall', price: c(coins + 40), w: 1, d: 1, h: 36, color, variant: 'door', material });
  }
}

// A wall that follows the season (soft green, golden, warm ochre, frosty white), with its own window and door
CATALOG.push(
  { id: 'wall_seasonal', name: 'Seasonal Wall', icon: '🍃', category: 'wall', layer: 'wall', price: c(80), w: 1, d: 1, h: 36, color: 0xcbe3b6, variant: 'wall', material: 'seasonal' },
  { id: 'wall_seasonal_window', name: 'Seasonal Window', icon: '🪟', category: 'wall', layer: 'wall', price: c(110), w: 1, d: 1, h: 36, color: 0xcbe3b6, variant: 'window', material: 'seasonal' },
  { id: 'wall_seasonal_door', name: 'Seasonal Door', icon: '🚪', category: 'wall', layer: 'wall', price: c(120), w: 1, d: 1, h: 36, color: 0xcbe3b6, variant: 'door', material: 'seasonal' },
);
