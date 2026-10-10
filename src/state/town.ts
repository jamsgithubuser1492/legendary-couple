import { useSyncExternalStore } from 'react';
import type { GameState } from '../types';

export const TOWN = 32; // the town is a 32 x 32 tile map

export type RegionId = 'coast' | 'country' | 'mountain' | 'downtown' | 'campus';

export interface Region {
  id: RegionId;
  name: string;
  icon: string;
  unlockAt: number;
  blurb: string;
  center: { x: number; y: number };
}

export const REGIONS: Region[] = [
  { id: 'coast', name: 'Cozy Town & Coast', icon: '🏖️', unlockAt: 0, blurb: 'The beach, the boardwalk and the first little shops.', center: { x: 8, y: 22 } },
  { id: 'country', name: 'Countryside & Farms', icon: '🌾', unlockAt: 30, blurb: 'Fields, orchards and a red barn.', center: { x: 8, y: 6 } },
  { id: 'mountain', name: 'Mountain Trail & Cabin', icon: '⛰️', unlockAt: 70, blurb: 'Pines, a campfire clearing and a stargazing spot.', center: { x: 24, y: 5 } },
  { id: 'downtown', name: 'Downtown Extension', icon: '🏙️', unlockAt: 120, blurb: 'Towers, shops and a busy street.', center: { x: 25, y: 26 } },
  { id: 'campus', name: 'Future Campus & Greenhouses', icon: '🌿', unlockAt: 180, blurb: 'Where your big plans grow.', center: { x: 25, y: 16 } },
];

export const regionById = (id: RegionId) => REGIONS.find((r) => r.id === id)!;

export function regionOf(x: number, y: number): RegionId {
  if (y <= 11 && x >= 16) return 'mountain';
  if (x >= 18 && y >= 12 && y <= 21) return 'campus';
  if (x >= 18 && y >= 22) return 'downtown';
  if (y <= 13) return 'country';
  return 'coast';
}

export type LotKind = 'sprite' | 'house' | 'tower' | 'tree' | 'pine' | 'barn' | 'plaza';

export interface Lot {
  id: string;
  region: RegionId;
  x: number;
  y: number;
  w: number;
  d: number;
  kind: LotKind;
  sprite?: string;
  variant: number;
  at: number; // growth needed before it appears
  name: string;
  blurb: string;
}

export const LOTS: Lot[] = [];
let n = 0;
function add(region: RegionId, x: number, y: number, w: number, d: number, kind: LotKind, at: number, name: string, o: { sprite?: string; variant?: number; blurb?: string } = {}) {
  LOTS.push({ id: `lot${n++}`, region, x, y, w, d, kind, at, name, variant: o.variant ?? 0, sprite: o.sprite, blurb: o.blurb ?? '' });
}

// ---- Cozy Town & Coast: open from day one, a few places at first ----
// The Town Square is one of the very first things to appear: your first approved quest builds it.
add('coast', 0, 15, 3, 3, 'plaza', 2, 'Town Square', { blurb: 'Where celebrations and visitors gather.' });
add('coast', 4, 28, 2, 2, 'sprite', 1, 'Palm Grove', { sprite: 'palm_grove', blurb: 'Shade on the sand.' });
add('coast', 7, 19, 2, 2, 'sprite', 0, 'Bistro & Patisserie', { sprite: 'shop_bistro', blurb: 'Matcha, croissants and a table for two.' });
add('coast', 9, 21, 2, 2, 'house', 3, 'Cozy Cottage', { variant: 0 });
add('coast', 7, 28, 2, 2, 'sprite', 5, 'Surf Shack', { sprite: 'shop_surf', blurb: 'Boards, towels and sunscreen.' });
add('coast', 7, 21, 2, 2, 'sprite', 6, 'Blooms Florist', { sprite: 'shop_florist', blurb: 'Fresh flowers for no reason at all.' });
add('coast', 0, 22, 2, 2, 'sprite', 8, 'Coffee Stand', { sprite: 'stand_coffee', blurb: 'Your morning cup by the sea.' });
add('coast', 9, 19, 2, 2, 'house', 9, 'Seaside House', { variant: 1 });
add('coast', 10, 28, 2, 2, 'sprite', 11, 'Ice Cream Stand', { sprite: 'shop_icecream', blurb: 'Two scoops, one spoon.' });
add('coast', 13, 21, 2, 2, 'house', 12, 'Blue Door House', { variant: 2 });
add('coast', 0, 18, 2, 2, 'sprite', 14, 'Souvenir Shop', { sprite: 'shop_souvenir', blurb: 'Postcards from your own adventures.' });
add('coast', 13, 19, 2, 2, 'house', 15, 'Garden House', { variant: 3 });
add('coast', 13, 25, 2, 2, 'sprite', 18, 'Our Little Café', { sprite: 'cafe_exterior', blurb: 'The café you are building together.' });
add('coast', 3, 21, 2, 2, 'house', 21, 'Peach House', { variant: 4 });
add('coast', 13, 28, 3, 2, 'sprite', 20, 'Beach Volleyball', { sprite: 'volleyball_net', blurb: 'Loser buys the matcha.' });
add('coast', 0, 26, 2, 2, 'sprite', 23, 'Beach Lounge', { sprite: 'beach_set', blurb: 'Umbrella, lounger and a good book.' });
add('coast', 3, 19, 2, 2, 'house', 24, 'Lilac House', { variant: 5 });
add('coast', 16, 28, 2, 2, 'sprite', 26, 'Lifeguard Stand', { sprite: 'lifeguard_red' });
add('coast', 7, 25, 2, 2, 'house', 27, 'Mint House', { variant: 1 });
add('coast', 9, 25, 2, 2, 'house', 30, 'Rose Cottage', { variant: 0 });
add('coast', 15, 19, 2, 2, 'house', 33, 'Sunny House', { variant: 3 });
add('coast', 15, 21, 2, 2, 'house', 36, 'Sky House', { variant: 2 });
add('coast', 3, 15, 2, 2, 'house', 48, 'Dune House', { variant: 3 });
add('coast', 3, 25, 2, 2, 'house', 51, 'Shell House', { variant: 0 });
// Seaside Park: grows in as you do
add('coast', 6, 13, 4, 3, 'sprite', 36, 'Duck Pond', { sprite: 'park_pond', blurb: 'Feed the ducks and watch the lily pads.' });
add('coast', 11, 13, 2, 2, 'sprite', 40, 'Garden Gazebo', { sprite: 'park_gazebo', blurb: 'A shady spot for slow conversations.' });
add('coast', 7, 17, 3, 2, 'sprite', 44, 'Picnic Tree', { sprite: 'park_picnic', blurb: 'Blanket, snacks and nowhere to be.' });
add('coast', 10, 16, 3, 3, 'sprite', 47, 'Flower Garden', { sprite: 'park_garden', blurb: 'Pick a favorite flower for each other.' });
add('coast', 14, 13, 3, 3, 'sprite', 50, 'Playground', { sprite: 'park_playground', blurb: 'Swings, slides and a sandbox.' });
add('coast', 16, 17, 1, 1, 'sprite', 52, 'Park Sign', { sprite: 'sign_park' });
add('coast', 8, 19, 1, 1, 'sprite', 24, 'Pink Beetle', { sprite: 'car_pink', blurb: 'Parked and ready for a drive.' });
add('coast', 11, 24, 1, 1, 'sprite', 34, 'Retro Van', { sprite: 'car_van' });
add('coast', 5, 22, 1, 1, 'sprite', 26, 'Postbox', { sprite: 'mailbox_red' });
add('coast', 12, 20, 1, 1, 'sprite', 38, 'Street Bin', { sprite: 'street_bin' });
for (const [x, y, at] of [[6, 18, 4], [12, 18, 14], [6, 24, 22], [12, 24, 32]] as const) add('coast', x, y, 1, 1, 'sprite', at, 'Street Lamp', { sprite: 'street_lamp_a' });
for (const [x, y, at] of [[5, 20, 7], [11, 20, 17], [5, 24, 28], [11, 23, 38]] as const) add('coast', x, y, 1, 1, 'sprite', at, 'Bench', { sprite: x % 2 ? 'bench_a' : 'bench_b' });
for (const [x, y, at] of [[5, 16, 10], [11, 17, 19], [5, 26, 29], [15, 24, 40], [2, 14, 46]] as const) add('coast', x, y, 1, 1, 'tree', at, 'Tree', { variant: x % 3 });

// ---- Countryside & Farms ----
add('country', 3, 2, 5, 5, 'sprite', 30, 'The Farmstead', { sprite: 'region_farm', blurb: 'Crops, greenhouse and a winding stream.' });
add('country', 9, 1, 2, 2, 'barn', 33, 'Red Barn', { variant: 0 });
add('country', 11, 3, 1, 1, 'sprite', 34, 'Orange Tree', { sprite: 'orange_tree' });
add('country', 9, 5, 2, 2, 'house', 36, 'Farmhouse', { variant: 2 });
add('country', 13, 1, 2, 2, 'barn', 39, 'Hay Barn', { variant: 1 });
add('country', 8, 8, 1, 1, 'sprite', 40, 'Farm Tools', { sprite: 'farm_tools' });
add('country', 13, 5, 2, 2, 'house', 42, 'Orchard House', { variant: 1 });
add('country', 12, 8, 1, 1, 'sprite', 44, 'Orange Tree', { sprite: 'orange_tree' });
add('country', 11, 10, 2, 2, 'sprite', 46, 'Windmill', { sprite: 'house_windmill', blurb: 'Grinding flour for tomorrow\'s croissants.' });
add('country', 9, 9, 2, 2, 'barn', 45, 'Little Barn', { variant: 0 });
add('country', 3, 9, 2, 2, 'house', 48, 'Meadow House', { variant: 3 });
add('country', 6, 11, 1, 1, 'sprite', 50, 'Veggie Crates', { sprite: 'crate_veg' });
add('country', 13, 9, 2, 2, 'house', 52, 'Creek House', { variant: 5 });

// ---- Mountain Trail & Cabin ----
add('mountain', 22, 2, 5, 5, 'sprite', 70, 'The Mountain Cabin', { sprite: 'region_mountain', blurb: 'A cabin with a view and a winding trail.' });
add('mountain', 18, 1, 1, 1, 'pine', 72, 'Pine');
add('mountain', 28, 3, 2, 2, 'sprite', 84, 'Waterfall', { sprite: 'waterfall_big', blurb: 'A hidden pool to cool off in.' });
add('mountain', 19, 7, 1, 1, 'sprite', 76, 'Trail Gear', { sprite: 'hiking_poles' });
add('mountain', 19, 4, 1, 1, 'pine', 74, 'Pine');
add('mountain', 24, 8, 3, 3, 'sprite', 80, 'Campfire Clearing', { sprite: 'camp_site', blurb: 'Marshmallows and long talks.' });
add('mountain', 28, 6, 1, 1, 'pine', 78, 'Pine');
add('mountain', 29, 2, 1, 1, 'pine', 82, 'Pine');
add('mountain', 29, 9, 1, 1, 'sprite', 86, 'Stargazing Spot', { sprite: 'telescope' });
add('mountain', 20, 9, 1, 1, 'pine', 88, 'Pine');
add('mountain', 27, 10, 1, 1, 'pine', 90, 'Pine');

// ---- Downtown Extension ----
const dt: [number, number, LotKind, string, string?][] = [
  [19, 22, 'tower', 'Sky Tower'], [22, 22, 'sprite', 'Miniso', 'miniso'], [25, 22, 'tower', 'Glass Tower'], [28, 22, 'sprite', 'Play Toy Store', 'shop_toy'],
  [19, 25, 'sprite', 'Vintage Bookstore', 'shop_bookstore'], [22, 25, 'tower', 'Pastel Tower'], [25, 25, 'tower', 'Plaza Tower'], [28, 25, 'tower', 'Harbor Tower'],
  [19, 28, 'tower', 'Garden Tower'], [22, 28, 'sprite', 'Hot Dog Stand', 'stand_hotdog'], [25, 28, 'tower', 'Clock Tower'], [28, 28, 'tower', 'Skyline Tower'],
];
dt.forEach(([x, y, kind, name, sprite], i) => add('downtown', x, y, 2, 2, kind, 120 + i * 4, name, { sprite, variant: i % 4 }));
add('downtown', 24, 24, 1, 1, 'sprite', 124, 'Street Lamp', { sprite: 'street_lamp_b' });
add('downtown', 27, 24, 1, 1, 'sprite', 136, 'Clock Post', { sprite: 'clock_post' });
add('downtown', 21, 27, 1, 1, 'sprite', 148, 'Phone Booth', { sprite: 'phone_booth' });
add('downtown', 24, 27, 1, 1, 'sprite', 156, 'Bus Stop', { sprite: 'bus_sign' });

// ---- Future Campus & Greenhouses ----
add('campus', 20, 13, 4, 4, 'sprite', 180, 'The Future Campus', { sprite: 'campus_buildings', blurb: 'Labs, classrooms and room to grow.' });
add('campus', 25, 13, 4, 4, 'sprite', 188, 'Greenhouses', { sprite: 'greenhouse_domes', blurb: 'Growing food and ideas.' });
add('campus', 21, 19, 1, 1, 'sprite', 196, 'Campus Cart', { sprite: 'golf_cart' });
add('campus', 28, 19, 1, 1, 'sprite', 204, 'Vertical Farm', { sprite: 'vertical_farm' });
add('campus', 19, 18, 1, 1, 'tree', 184, 'Tree', { variant: 0 });
add('campus', 24, 19, 1, 1, 'tree', 192, 'Tree', { variant: 1 });
add('campus', 30, 16, 1, 1, 'tree', 200, 'Tree', { variant: 2 });

export type Activity =
  | { kind: 'brew' }
  | { kind: 'shop'; cat: string; line: string }
  | { kind: 'together'; tab: string; title: string; line: string }
  | { kind: 'tip'; title: string; ideas: string[] };

const tip = (title: string, ...ideas: string[]): Activity => ({ kind: 'tip', title, ideas });

/** What you can do at each place once you are standing at it. */
export const ACTIVITIES: Record<string, Activity> = {
  'Bistro & Patisserie': { kind: 'brew' },
  'Our Little Café': { kind: 'brew' },
  'Coffee Stand': { kind: 'brew' },
  'Blooms Florist': { kind: 'shop', cat: 'decor', line: 'Fresh flowers and plants for your home.' },
  'Surf Shack': { kind: 'shop', cat: 'street', line: 'Boards, beach gear and boardwalk finds.' },
  'Souvenir Shop': { kind: 'shop', cat: 'decor', line: 'Little keepsakes and cozy things.' },
  Miniso: { kind: 'shop', cat: 'pets', line: 'Plushies and cute things, just how you like them.' },
  'Play Toy Store': { kind: 'shop', cat: 'pets', line: 'Plush friends and playful finds.' },
  'Ice Cream Stand': tip('Two scoops, one spoon 🍦', 'Share a scoop and each tell the other your favorite flavor memory.', 'Pick a flavor for each other without asking, then swap.', 'Take a walk with your cones and name three things you are grateful for today.'),
  'Vintage Bookstore': tip('Pick a book for each other 📚', 'Choose a book for each other and tell them why.', 'Read the first page out loud to each other.', 'Find a cookbook and plan one meal to cook together.'),
  'Hot Dog Stand': tip('Street food date 🌭', 'Try a food you have never had before, together.', 'Eat standing up and people watch for ten minutes.'),
  'Beach Volleyball': tip('Loser buys the matcha 🏐', 'Play a friendly game. Loser buys the drinks.', 'Make up a silly rule that has to be followed all game.'),
  'Campfire Clearing': { kind: 'together', tab: 'whisper', title: 'Fireside Whispers 🔥', line: 'Sit by the fire and trade one honest answer each.' },
  'Stargazing Spot': tip('Look up together 🔭', 'Find one star or planet each and name it after something you love.', 'Make a wish out loud, then tell each other one.'),
  'Lifeguard Stand': tip('Sunset on the sand 🌅', 'Watch the sunset with phones away.', 'Collect one shell each and tell its story.'),
  'Duck Pond': tip('Feed the ducks 🦆', 'Bring bread (or oats) and name every duck.', 'Sit by the water and each share one thing you are proud of this month.'),
  'Picnic Tree': tip('Picnic under the tree 🧺', 'Pack a picnic and put the phones away for an hour.', 'Play twenty questions about your favorite memories.'),
  Playground: tip('Be kids again 🛝', 'Race to the swings. Loser plans the next date.', 'Take silly photos of each other.'),
  'Garden Gazebo': tip('Gazebo talk 🛖', 'Ask each other: what do you want more of this season?', 'Read a letter or note you saved from each other.'),
  'Flower Garden': tip('Flowers for no reason 🌷', 'Pick or buy a flower for each other and say why you chose it.', 'Learn the names of three flowers together.'),
  'The Farmstead': tip('Grow something 🌱', 'Plant something together, even a herb on the windowsill.', 'Plan a dinner using only things you grew or picked.'),
  'The Mountain Cabin': tip('A cozy cabin day ⛰️', 'Plan a zero agenda cozy day: blankets, tea, no chores.', 'Pick a trail to walk together soon.'),
};
export const activityOf = (name: string): Activity | undefined => ACTIVITIES[name];

/** Where the "Your Home Island" marker stands, on the west beach. */
export const HOME_PIN = { x: 1, y: 24 };

/**
 * Town growth: what the two of you have built together in real life and in the game.
 * Quests, memories and daily check-ins count most, decorating counts a little.
 */
export function actualGrowth(s: GameState): number {
  const checkins = Object.values(s.checkins).filter((c) => c.paid).length;
  return Math.floor(s.approvedCount * 3 + s.memories.length * 5 + checkins * 2 + Math.min(s.placed.length, 40) * 0.5 + s.xp / 20);
}

// Local only: lets you preview a fully grown town on this device.
const KEY = 'olw:growthPreview';
let preview: number | null = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
})();
const listeners = new Set<() => void>();
export const getGrowthPreview = () => preview;
export function setGrowthPreview(v: number | null) {
  preview = v;
  try {
    if (v === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(v));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}
export const onGrowthPreviewChange = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export const useGrowthPreview = () => useSyncExternalStore(onGrowthPreviewChange, getGrowthPreview);

export const growthOf = (s: GameState): number => preview ?? actualGrowth(s);
export const unlockedRegions = (growth: number): RegionId[] => REGIONS.filter((r) => growth >= r.unlockAt).map((r) => r.id);
export const nextMilestone = (growth: number): { label: string; at: number } | null => {
  const upcoming = [
    ...REGIONS.filter((r) => r.unlockAt > growth).map((r) => ({ label: `${r.icon} ${r.name} opens`, at: r.unlockAt })),
    ...LOTS.filter((l) => l.at > growth && l.kind === 'sprite' && l.w >= 2 && growth >= regionById(l.region).unlockAt).map((l) => ({ label: `${l.name} appears`, at: l.at })),
  ].sort((a, b) => a.at - b.at);
  return upcoming[0] ?? null;
};
