import type { Theme } from './season';

export interface PresetItem {
  itemId: string;
  dx: number;
  dy: number;
  rotation?: 0 | 90 | 180 | 270;
}

/** A ready made, fully designed room. Buy once and the whole layout places itself. */
export interface Preset {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  price: { coins: number; gems: number };
  w: number; // footprint in tiles
  d: number;
  hero: string[]; // catalog ids shown on the shop card
  items: PresetItem[];
  seasons?: Theme[]; // limited time designs
}

const it = (itemId: string, dx: number, dy: number, rotation: 0 | 90 | 180 | 270 = 0): PresetItem => ({ itemId, dx, dy, rotation });

/** Fills a rectangle with one floor type. */
const floors = (id: string, w: number, d: number): PresetItem[] => {
  const out: PresetItem[] = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < d; y++) out.push(it(id, x, y));
  return out;
};

/** Back walls along the north and west edges, with a window and a door. */
const walls = (w: number, d: number, windowAt: number, doorAt: number): PresetItem[] => {
  const out: PresetItem[] = [];
  for (let x = 0; x < w; x++) out.push(it(x === windowAt ? 'wall_window' : 'wall_cream', x, 0));
  for (let y = 1; y < d; y++) out.push(it(y === doorAt ? 'wall_door' : 'wall_cream', 0, y));
  return out;
};

export const PRESETS: Preset[] = [
  {
    id: 'cozy_bedroom', name: 'Cozy Bedroom', icon: '🛏️', blurb: 'A wooden bed, a glowing lamp and a little reading nook.',
    price: { coins: 450, gems: 0 }, w: 6, d: 5, hero: ['bed_wood', 'lamp_floor', 'bookshelf_small'],
    items: [
      ...floors('floor_wood', 6, 5), ...walls(6, 5, 2, 3),
      it('bed_wood', 3, 1), it('nightstand', 4, 1), it('lamp_floor', 5, 1), it('bookshelf_small', 1, 1), it('plant_floor', 5, 4), it('bedding_cozy', 2, 3),
      it('print_palm', 0, 2), it('print_sunset', 4, 0), it('string_lights', 1, 0),
    ],
  },
  {
    id: 'sunny_cafe', name: 'Sunny Café Corner', icon: '☕', blurb: 'Counter, pastry case and two cozy tables, ready to serve.',
    price: { coins: 700, gems: 0 }, w: 7, d: 6, hero: ['cafe_counter', 'cafe_pastry_case', 'cafe_round_set'],
    items: [
      ...floors('floor_checker', 7, 6), ...walls(7, 6, 3, 4),
      it('cafe_counter', 1, 1), it('cafe_pastry_case', 4, 1), it('plant', 6, 1), it('cafe_round_set', 2, 3), it('cafe_round_set', 5, 3), it('cafe_menu_a', 1, 5), it('food_matcha', 6, 5),
      it('print_coffee', 0, 2), it('string_lights', 5, 0), it('shelf_plant', 1, 0),
    ],
  },
  {
    id: 'living_room', name: 'Little Living Room', icon: '🛋️', blurb: 'A big sectional, books and plants for slow evenings.',
    price: { coins: 620, gems: 0 }, w: 6, d: 5, hero: ['sofa_blush', 'bookshelf_small', 'plant_floor'],
    items: [
      ...floors('floor_wood', 6, 5), ...walls(6, 5, 3, 4),
      it('sofa_blush', 1, 2), it('bookshelf_small', 1, 1), it('bookshelf', 2, 1), it('lamp_floor', 4, 1), it('plant_floor', 5, 1), it('chair_sage', 5, 3), it('books_blanket', 4, 3),
      it('print_palm', 0, 2), it('shelf_plant', 2, 0), it('print_sunset', 4, 0),
    ],
  },
  {
    id: 'matcha_kitchen', name: 'Matcha Kitchenette', icon: '🍵', blurb: 'A pink tiled kitchen with a booth for two.',
    price: { coins: 540, gems: 0 }, w: 5, d: 4, hero: ['kitchenette', 'dinette_seating', 'food_matcha'],
    items: [
      ...floors('floor_pink', 5, 4), ...walls(5, 4, 2, 2),
      it('kitchenette', 1, 1), it('food_matcha', 3, 1), it('plant_rack', 4, 1), it('dinette_seating', 2, 2), it('bin_a', 4, 3),
      it('shelf_books', 4, 0), it('print_coffee', 0, 1),
    ],
  },
  {
    id: 'camper_cozy', name: 'Camper Cozy Interior', icon: '🚐', blurb: 'A tiny home on wheels: galley, dinette and a snug bed.',
    price: { coins: 640, gems: 0 }, w: 6, d: 5, hero: ['kitchenette', 'dinette_seating', 'bed_wood'],
    items: [
      ...floors('floor_wood', 6, 5), ...walls(6, 5, 4, 3),
      it('kitchenette', 1, 1), it('dinette_seating', 3, 1), it('cabinet_shelving', 5, 1), it('bed_wood', 1, 3), it('lamp_floor', 2, 3), it('plant_rack', 5, 4), it('radio', 3, 4),
      it('print_palm', 0, 2), it('string_lights', 3, 0),
    ],
  },
  {
    id: 'campfire_night', name: 'Campfire Night', icon: '🔥', blurb: 'A starry clearing with a fire, lanterns and sleeping bags.',
    price: { coins: 380, gems: 0 }, w: 5, d: 5, hero: ['camp_site', 'lantern_oil', 'sleeping_bag_a'],
    items: [
      it('camp_site', 1, 1), it('cooler', 4, 1), it('lantern_oil', 4, 3), it('firewood', 0, 1), it('sleeping_bag_a', 0, 3), it('sleeping_bag_pink', 1, 4),
      it('radio', 4, 4), it('mugs_enamel', 0, 0), it('camp_stove', 4, 0),
    ],
  },
  {
    id: 'boardwalk_lounge', name: 'Boardwalk Beach Lounge', icon: '🏖️', blurb: 'Planked boardwalk, an umbrella lounger and a surf stand.',
    price: { coins: 520, gems: 0 }, w: 6, d: 4, hero: ['beach_set', 'surfboard_rack', 'seating_cluster'],
    items: [
      ...floors('bw_light', 6, 4),
      it('beach_set', 0, 0), it('surfboard_rack', 3, 0), it('street_lamp_c', 5, 0), it('bench_a', 3, 1), it('seating_cluster', 2, 2), it('planter_pot', 0, 3), it('bin_b', 5, 3), it('souvenir_display', 5, 1),
    ],
  },
  {
    id: 'holiday_cabin', name: 'Holiday Cabin', icon: '🎄', blurb: 'Tree, wreath, star lights and a blanket by the sofa. Limited time.',
    price: { coins: 0, gems: 45 }, w: 6, d: 5, hero: ['xmas_tree', 'wreath_holiday', 'sofa_blush'], seasons: ['holidays', 'winter'],
    items: [
      ...floors('floor_wood', 6, 5), ...walls(6, 5, 3, 4),
      it('sofa_blush', 1, 2), it('xmas_tree', 5, 1), it('blanket_red', 4, 3), it('lamp_floor', 4, 1), it('bookshelf_small', 1, 1), it('plant_floor', 5, 4),
      it('wreath_holiday', 2, 0), it('garland_stars', 4, 0), it('print_sunset', 0, 2),
    ],
  },
];

export const presetOf = (id: string) => PRESETS.find((p) => p.id === id);

const ORDER: Record<string, number> = { floor: 0, wall: 1, object: 2, walldecor: 3 };
export { ORDER as PRESET_ORDER };
