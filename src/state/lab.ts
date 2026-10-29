/**
 * The Seasonal Menu R&D Lab: the two of you invent drinks together, name them and put them on the menu board.
 * Pure rules and content (nothing here touches the store), so every rule is testable. The store wraps these in actions.
 *
 * Rules in one place: nothing is ever lost or punished. An experiment costs one pantry ingredient and one of three
 * daily tries. Making the same combination again can only make the recipe better. Rewards stay small: a gentle tip
 * bonus for what is on the menu board (labTipBonus), inside the café's normal tip math.
 *
 * Everything is keyed by id (recipes by a hash of base, flavor and topping, menu slots by "0" to "5"), so two phones
 * that experiment or name drinks at the same time merge without losing either (see state/merge.ts).
 */
import type { CafeState, GameState, LabGlass, LabRecipe, LabState, LabTier } from '../types';
import { dateKey } from './questions';
import { themeForDate } from './season';
import { ESPRESSO_RECIPE, MENU_DRINKS, styleOf } from './cafe';

// ---------------------------------------------------------------- the pantry
export type IngredientKind = 'base' | 'flavor' | 'topping';
export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Ingredient {
  id: string;
  kind: IngredientKind;
  name: string;
  swatch: string; // the color a layer of it has inside a clear cup
  layer: string | null; // the Matcha Masters ingredient it becomes when a guest orders the drink (null: it adds flavor only)
  season: SeasonKey | null; // the season it belongs to: a drink made with it counts as Seasonal
  gated: boolean; // only available in its real season (a recipe made with it stays in the book either way)
  rare?: boolean; // a rare topping can make a Signature drink
  hint: string; // warm text for what opens it
}

export const INGREDIENTS: Ingredient[] = [
  // bases
  { id: 'matcha', kind: 'base', name: 'Matcha', swatch: '#C5DCA0', layer: 'Matcha', season: null, gated: false, hint: 'Ready from the start' },
  { id: 'espresso', kind: 'base', name: 'Espresso', swatch: '#5E4B43', layer: 'Espresso', season: null, gated: false, hint: 'Ready from the start' },
  { id: 'earlgrey', kind: 'base', name: 'Earl Grey Tea', swatch: '#D2B48C', layer: 'Ice', season: null, gated: false, hint: 'Opens after 3 approved goals' },
  { id: 'turmeric', kind: 'base', name: 'Golden Turmeric', swatch: '#F3E5AB', layer: 'Milk', season: null, gated: false, hint: 'Opens after your first Matcha rush' },
  // flavors
  { id: 'strawberry', kind: 'flavor', name: 'Strawberry', swatch: '#FFAAA6', layer: 'Strawberry', season: null, gated: false, hint: 'Ready from the start' },
  { id: 'honey', kind: 'flavor', name: 'Honey', swatch: '#FFD3B6', layer: null, season: null, gated: false, hint: 'Ready from the start' },
  { id: 'saltedcaramel', kind: 'flavor', name: 'Salted Caramel', swatch: '#C98B4C', layer: null, season: null, gated: false, hint: 'Opens at a 2 star café' },
  { id: 'yuzu', kind: 'flavor', name: 'Yuzu', swatch: '#FFF5B7', layer: null, season: 'summer', gated: false, hint: 'Opens at a 3 star café' },
  { id: 'lavenderhoney', kind: 'flavor', name: 'Lavender Honey', swatch: '#D8C4EC', layer: null, season: null, gated: false, hint: 'Opens after 2 days of healthy goals' },
  { id: 'apple', kind: 'flavor', name: 'Apple', swatch: '#E8D7FF', layer: null, season: null, gated: false, hint: 'Opens after you play Orchard Harvest' },
  { id: 'blossom', kind: 'flavor', name: 'Cherry Blossom', swatch: '#FFD1DC', layer: 'Strawberry', season: 'spring', gated: true, hint: 'Only in spring' },
  { id: 'pumpkinspice', kind: 'flavor', name: 'Pumpkin Spice', swatch: '#EBB492', layer: null, season: 'autumn', gated: true, hint: 'Only in autumn' },
  { id: 'peppermint', kind: 'flavor', name: 'Peppermint', swatch: '#E0F4FF', layer: null, season: 'winter', gated: true, hint: 'Only in winter' },
  // toppings
  { id: 'boba', kind: 'topping', name: 'Boba Pearls', swatch: '#4A3C31', layer: 'Boba', season: null, gated: false, hint: 'Ready from the start' },
  { id: 'creamfoam', kind: 'topping', name: 'Cream Cheese Foam', swatch: '#FFFFF0', layer: 'Milk', season: null, gated: false, hint: 'Ready from the start' },
  { id: 'blossomsprinkles', kind: 'topping', name: 'Blossom Sprinkles', swatch: '#FADADD', layer: null, season: 'spring', gated: false, hint: 'Opens after 5 approved goals' },
  { id: 'rosepetals', kind: 'topping', name: 'Dried Rose Petals', swatch: '#E6A8B5', layer: null, season: null, gated: false, rare: true, hint: 'Opens after you open a thank you note' },
  { id: 'goldflakes', kind: 'topping', name: 'Edible Gold Flakes', swatch: '#FFE066', layer: null, season: null, gated: false, rare: true, hint: 'Opens at a 5 star café, or after a Signature drink' },
  { id: 'cinnamon', kind: 'topping', name: 'Cinnamon Dust', swatch: '#AA7A5F', layer: null, season: 'autumn', gated: true, hint: 'Autumn and winter, or after a Pumpkin Spice drink' },
];
export const ingredientOf = (id: string | null | undefined) => INGREDIENTS.find((i) => i.id === id);

export const GLASSES: { id: LabGlass; name: string }[] = [{ id: 'mason', name: 'Mason jar' }, { id: 'mug', name: 'Character mug' }, { id: 'togo', name: 'Pastel to go cup' }];
/** Latte art: the three the Latte Art Studio already has, plus the five new patterns. */
export const ART_IDS = ['cat', 'frog', 'heart', 'bear', 'star', 'bunny', 'swirl', 'flower'];
export const RIM_IDS = ['strawberry', 'mint', 'cinnamon_stick', 'sugar_rim', 'yuzu_wheel', 'stars'];

export const DAILY_EXPERIMENTS = 3;
export const EXPERIMENT_COST = 1; // pantry ingredients per experiment
export const MAX_NAME = 28;
export const MENU_SLOTS = 6;
export const TIER_NAMES: Record<LabTier, string> = { classic: 'Classic', seasonal: 'Seasonal', signature: 'Signature VIP' };
export const TIER_BLURB: Record<LabTier, string> = {
  classic: 'A tasty everyday drink.',
  seasonal: 'Cozy regulars love it.',
  signature: 'A drink so special that VIP guests ask for it.',
};

/** Eight name ideas, tied to real memories. */
export const LAB_NAME_IDEAS = [
  'Our First Date Sunset Matcha',
  'Pier Day Salted Caramel Latte',
  'Rainy Window Honey Chai',
  'The Lazy Sunday',
  'Midnight Study Buddy',
  'Picnic Blanket Strawberry Cloud',
  'Road Trip Golden Latte',
  'Little Wins Latte',
];

/** The real season (the Holidays count as winter). */
export function seasonKeyOf(d: Date = new Date()): SeasonKey {
  const t = themeForDate(d);
  return t === 'holidays' ? 'winter' : t;
}

// ---------------------------------------------------------------- unlocking
export const hasSignature = (s: GameState) => Object.values(s.cafe.lab?.recipes ?? {}).some((r) => r.tier === 'signature');

/** Has the couple earned this ingredient yet? Every rule reads real effort already in the game. */
export function isUnlocked(s: GameState, id: string): boolean {
  switch (id) {
    case 'earlgrey': return s.approvedCount >= 3; // approved goals
    case 'turmeric': return s.cafe.rushes >= 1; // a finished Matcha rush
    case 'saltedcaramel': return styleOf(s).stars >= 2;
    case 'yuzu': return styleOf(s).stars >= 3;
    case 'lavenderhoney': return Object.keys(s.healthDays ?? {}).length >= 2; // days with a health goal finished (the island's "garden of habits")
    case 'apple': return (s.mgBest?.ORCHARD_HARVEST ?? 0) > 0; // played Orchard Harvest
    case 'blossomsprinkles': return s.approvedCount >= 5;
    case 'rosepetals': return s.notesOpened >= 1; // opened a Gratitude note
    case 'goldflakes': return styleOf(s).stars >= 5 || hasSignature(s);
    default: return !!ingredientOf(id); // the starters and the seasonal ones (those are held back by the season instead)
  }
}

/** Unlocked and in season where it needs to be. A recipe already in the book never disappears. */
export function isAvailable(s: GameState, id: string, date: Date = new Date()): boolean {
  const ing = ingredientOf(id);
  if (!ing || !isUnlocked(s, id)) return false;
  if (!ing.gated) return true;
  const now = seasonKeyOf(date);
  if (id === 'cinnamon') return now === 'autumn' || now === 'winter' || Object.values(s.cafe.lab?.recipes ?? {}).some((r) => r.flavor === 'pumpkinspice' || r.topping === 'pumpkinspice');
  return ing.season === now;
}
export const availableIngredients = (s: GameState, date: Date = new Date()) => INGREDIENTS.filter((i) => isAvailable(s, i.id, date));
export const unlockHint = (id: string) => ingredientOf(id)?.hint ?? '';

// ---------------------------------------------------------------- the sweet spot
/** FNV-1a, so the same text always gives the same number on every phone. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h >>> 0;
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const keyOfCombo = (base: string, flavor: string, topping: string) => `${base}|${flavor}|${topping}`;

/** The hidden temperature and sweetness that taste best for a combination. Always the same for the same three ingredients. */
export function sweetSpotFor(base: string, flavor: string, topping: string): { temp: number; sweet: number } {
  const h = hash32(keyOfCombo(base, flavor, topping));
  return { temp: 0.2 + 0.6 * ((h & 0xffff) / 0xffff), sweet: 0.2 + 0.6 * (((h >>> 16) & 0xffff) / 0xffff) };
}
/** 1 on the sweet spot, falling to 0 when far away. */
export function closeness(temp: number, sweet: number, spot: { temp: number; sweet: number }): number {
  const d = Math.hypot(temp - spot.temp, sweet - spot.sweet);
  return clamp01(1 - d / 0.6);
}
/** Taste counts 60 percent and the art 40 percent. 1 to 3 stars. */
export function qualityOf(close: number, artScore: number): number {
  const score = 0.6 * clamp01(close) + 0.4 * clamp01(artScore);
  return score >= 0.8 ? 3 : score >= 0.5 ? 2 : 1;
}

export const recipeIdOf = (base: string, flavor: string, topping: string) => `r${hash32(keyOfCombo(base, flavor, topping)).toString(36)}`;

/** The season a drink belongs to (its flavor first, then its topping), or null for an everyday drink. */
export function seasonOfRecipe(r: Pick<LabRecipe, 'flavor' | 'topping'>): SeasonKey | null {
  return ingredientOf(r.flavor)?.season ?? ingredientOf(r.topping)?.season ?? null;
}
/** Classic, Seasonal or Signature. It depends only on the recipe, so every phone agrees. */
export function tierOf(r: Pick<LabRecipe, 'flavor' | 'topping' | 'quality'>): LabTier {
  const seasonal = !!seasonOfRecipe(r);
  if (r.quality >= 3) return seasonal || !!ingredientOf(r.topping)?.rare ? 'signature' : 'seasonal';
  if (r.quality === 2) return seasonal ? 'seasonal' : 'classic'; // two stars without a seasonal ingredient is a Classic with a star
  return 'classic';
}

// ---------------------------------------------------------------- recipes, layers and the menu
/** How a guest's order for this drink is filled in Matcha Masters: 2 to 5 of its seven ingredients, base first. */
export function layersOf(r: Pick<LabRecipe, 'base' | 'flavor' | 'topping'>): string[] {
  const baseLayers: Record<string, string[]> = { matcha: ['Matcha', 'Oat Milk'], espresso: ['Espresso', 'Milk'], earlgrey: ['Ice', 'Oat Milk'], turmeric: ['Milk', 'Ice'] };
  const out: string[] = [];
  const add = (l: string | null | undefined) => { if (l && !out.includes(l)) out.push(l); };
  for (const l of baseLayers[r.base] ?? []) add(l);
  add(ingredientOf(r.flavor)?.layer);
  add(ingredientOf(r.topping)?.layer);
  if (out.length < 2) add('Ice');
  if (out.length < 2) add('Milk');
  return out.slice(0, 5);
}

export const recipesOf = (s: GameState): LabRecipe[] => Object.values(s.cafe.lab?.recipes ?? {});
/** The six board slots in order, null for an empty one. */
export function menuSlots(s: GameState): (LabRecipe | null)[] {
  const lab = s.cafe.lab;
  return Array.from({ length: MENU_SLOTS }, (_, i) => (lab?.menu?.[String(i)] ? lab.recipes[lab.menu[String(i)]] ?? null : null));
}
export const menuRecipes = (s: GameState): LabRecipe[] => menuSlots(s).filter((r): r is LabRecipe => !!r);

/** A custom drink by name, in the same shape as a built in one. Any recipe in the book works, so an order placed before a rename still fills. */
export function customDrinkOf(s: GameState, name: string): { name: string; recipe: string[] } | undefined {
  const r = recipesOf(s).find((x) => x.name === name);
  return r ? { name: r.name, recipe: layersOf(r) } : undefined;
}

/** What a guest may order: the café's usual drinks once each, a menu board recipe twice and the Spotlight three times.
 * A VIP guest (kind starting with vip_) often asks for a Signature drink when one is on the board. */
export function labDrinkPool(s: GameState, kind: string, builtIn: string[], rng: () => number = Math.random): string[] {
  const on = menuRecipes(s);
  const spot = s.cafe.lab?.spotlight ?? null;
  if (kind.startsWith('vip_')) {
    const sig = on.filter((r) => r.tier === 'signature');
    if (sig.length && rng() < 0.5) return sig.map((r) => r.name);
  }
  const pool = [...builtIn];
  for (const r of on) for (let i = 0; i < (r.id === spot ? 3 : 2); i++) pool.push(r.name);
  return pool;
}

/** A small, kind bonus to what the café earns from the drinks on the board. Recipes off the board give nothing. */
export function labTipBonus(s: GameState): number {
  const on = menuRecipes(s);
  let b = 0.04 * on.filter((r) => r.tier === 'seasonal').length + 0.08 * on.filter((r) => r.tier === 'signature').length;
  if (s.cafe.lab?.spotlight && on.some((r) => r.id === s.cafe.lab.spotlight)) b += 0.05;
  return Math.min(0.3, b);
}
export const menuBonus = labTipBonus;

// ---------------------------------------------------------------- names
const KNOWN_NAMES = () => [...MENU_DRINKS.map((d) => d.name), ESPRESSO_RECIPE];
export function validateName(raw: string, s: GameState, selfId?: string): { ok: boolean; name: string; reason?: string } {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!name) return { ok: false, name, reason: 'Give it a name first.' };
  if (name.length > MAX_NAME) return { ok: false, name, reason: `Keep it to ${MAX_NAME} letters or fewer.` };
  if (/[\u0000-\u001f\u007f]/.test(name)) return { ok: false, name, reason: 'That name has a character we cannot use.' };
  const low = name.toLowerCase();
  if (KNOWN_NAMES().some((n) => n.toLowerCase() === low) || recipesOf(s).some((r) => r.id !== selfId && r.name.toLowerCase() === low)) return { ok: false, name, reason: 'A drink already has that name. Try another.' };
  return { ok: true, name };
}
/** "Honey Matcha", or with the topping when that is taken, then a number, so a new drink always has its own name. */
export function defaultName(s: GameState, r: Pick<LabRecipe, 'base' | 'flavor' | 'topping'>): string {
  const f = ingredientOf(r.flavor)?.name ?? '', b = (ingredientOf(r.base)?.name ?? '').replace(' Tea', ''), t = ingredientOf(r.topping)?.name ?? '';
  const tries = [`${f} ${b}`.trim(), `${f} ${b} with ${t}`.trim()];
  for (const n of tries) if (validateName(n, s).ok) return n.slice(0, MAX_NAME);
  for (let i = 2; i < 99; i++) { const n = `${tries[0]} ${i}`.slice(0, MAX_NAME); if (validateName(n, s).ok) return n; }
  return tries[0].slice(0, MAX_NAME);
}

// ---------------------------------------------------------------- state
export const newLab = (): LabState => ({ daily: { day: '', n: 0 }, recipes: {}, menu: {}, spotlight: null, seen: [] });

export function experimentsLeft(s: GameState, day: string = dateKey()): number {
  const d = s.cafe.lab?.daily;
  return Math.max(0, DAILY_EXPERIMENTS - (d && d.day === day ? d.n : 0));
}

const patchLab = (s: GameState, lab: LabState): GameState => ({ ...s, cafe: { ...s.cafe, lab } });

/** Fills in the Lab for an old save and keeps every value in range. Tiers are recomputed, so two phones always agree. */
export function normalizeLab(c: CafeState): CafeState {
  const have = c.lab;
  const recipes: Record<string, LabRecipe> = {};
  for (const [id, r] of Object.entries(have?.recipes ?? {})) {
    if (!r || !ingredientOf(r.base) || !ingredientOf(r.flavor) || !ingredientOf(r.topping)) continue;
    const quality = Math.max(1, Math.min(3, Math.round(r.quality || 1)));
    const glass = GLASSES.some((g) => g.id === r.glass) ? r.glass : 'mason';
    recipes[id] = { ...r, id, quality, glass, tier: tierOf({ flavor: r.flavor, topping: r.topping, quality }), name: String(r.name ?? '').slice(0, MAX_NAME) || id };
  }
  const menu: Record<string, string> = {};
  const used = new Set<string>();
  for (let i = 0; i < MENU_SLOTS; i++) {
    const id = have?.menu?.[String(i)];
    if (id && recipes[id] && !used.has(id)) { menu[String(i)] = id; used.add(id); }
  }
  const spotlight = have?.spotlight && used.has(have.spotlight) ? have.spotlight : null;
  const d = have?.daily;
  const lab: LabState = {
    daily: { day: typeof d?.day === 'string' ? d.day : '', n: Math.max(0, Math.min(DAILY_EXPERIMENTS * 2, Math.round(d?.n ?? 0))) }, // two phones can each do their share, so allow a little over
    recipes, menu, spotlight, seen: [...new Set((have?.seen ?? []).filter((x) => !!ingredientOf(x)))],
  };
  return { ...c, lab };
}

// ---------------------------------------------------------------- actions (pure: state in, new state out)
export interface ExperimentInput {
  base: string; flavor: string; topping: string;
  temp: number; sweet: number; // 0 to 1, where the two sliders were left
  glass: LabGlass;
  art: string | null; rim: string | null;
  artScore: number; // 0 to 1, how well the latte art was traced (use 0.5 when there is no art)
}
export interface LabResult {
  ok: boolean;
  reason?: string; // a short, plain, kind reason when ok is false
  text?: string;
}
export interface ExperimentResult extends LabResult {
  state?: GameState;
  recipe?: LabRecipe;
  quality?: number;
  stars?: number;
  closeness?: number;
  sweetSpot?: { temp: number; sweet: number };
  discoveredNew?: boolean;
  improved?: boolean; // the same combination again, but better than before
}
const fail = (reason: string): ExperimentResult => ({ ok: false, reason });

/** One experiment. Costs a pantry ingredient and one of three daily tries. */
export function applyExperiment(s: GameState, input: ExperimentInput, opts: { by: string; day?: string; date?: Date } = { by: 'A' }): ExperimentResult {
  const day = opts.day ?? dateKey(), date = opts.date ?? new Date();
  const { base, flavor, topping } = input;
  if (ingredientOf(base)?.kind !== 'base' || ingredientOf(flavor)?.kind !== 'flavor' || ingredientOf(topping)?.kind !== 'topping') return fail('Pick a base, a flavor and a topping.');
  for (const id of [base, flavor, topping]) {
    if (!isUnlocked(s, id)) return fail(`${ingredientOf(id)!.name} is still closed. ${ingredientOf(id)!.hint}.`);
    if (!isAvailable(s, id, date)) return fail(`${ingredientOf(id)!.name} is out of season right now.`);
  }
  if (![input.temp, input.sweet, input.artScore].every((n) => Number.isFinite(n))) return fail('Set the temperature and sweetness first.');
  const glass: LabGlass = GLASSES.some((g) => g.id === input.glass) ? input.glass : 'mason';
  const art = input.art && ART_IDS.includes(input.art) ? input.art : null;
  const rim = input.rim && RIM_IDS.includes(input.rim) ? input.rim : null;
  if (experimentsLeft(s, day) < 1) return fail('You have done today\'s three experiments. Come back tomorrow.');
  if (s.ingredients < EXPERIMENT_COST) return fail('The pantry is empty. Healthy goals and the Orchard fill it back up.');

  const spot = sweetSpotFor(base, flavor, topping);
  const close = closeness(clamp01(input.temp), clamp01(input.sweet), spot);
  const quality = qualityOf(close, art ? clamp01(input.artScore) : 0.5);
  const lab0 = s.cafe.lab ?? newLab();
  const id = recipeIdOf(base, flavor, topping);
  const old = lab0.recipes[id];
  const improved = !!old && quality > old.quality;
  let recipe: LabRecipe;
  if (!old) {
    const draft = { base, flavor, topping, quality };
    recipe = { id, name: defaultName(s, draft), base, flavor, topping, glass, art, rim, quality, tier: tierOf(draft), by: opts.by, day };
  } else if (improved) {
    recipe = { ...old, glass, art, rim, quality, tier: tierOf({ flavor, topping, quality }) };
  } else recipe = old;
  const used = lab0.daily.day === day ? lab0.daily.n : 0;
  const lab: LabState = {
    ...lab0,
    daily: { day, n: used + 1 },
    recipes: { ...lab0.recipes, [id]: recipe },
    seen: [...new Set([...lab0.seen, base, flavor, topping])],
  };
  const next = { ...patchLab(s, lab), ingredients: s.ingredients - EXPERIMENT_COST };
  const text = !old
    ? recipe.tier === 'signature' ? 'New Signature Recipe discovered!' : `New ${TIER_NAMES[recipe.tier]} recipe discovered!`
    : improved ? `Better than before: now ${quality} stars.` : 'Tasty again. Your best stays in the book.';
  return { ok: true, state: next, recipe, quality, stars: quality, closeness: close, sweetSpot: spot, discoveredNew: !old, improved, text };
}

export function applyName(s: GameState, id: string, raw: string): LabResult & { state?: GameState } {
  const r = s.cafe.lab?.recipes?.[id];
  if (!r) return { ok: false, reason: 'That recipe is not in the book.' };
  const v = validateName(raw, s, id);
  if (!v.ok) return { ok: false, reason: v.reason };
  return { ok: true, state: patchLab(s, { ...s.cafe.lab, recipes: { ...s.cafe.lab.recipes, [id]: { ...r, name: v.name } } }), text: `Now called ${v.name}.` };
}

/** Puts a recipe on a board slot (or clears the slot with null). A recipe sits in one slot, so placing it moves it. */
export function applyMenuSlot(s: GameState, slot: number, id: string | null): LabResult & { state?: GameState } {
  if (!Number.isInteger(slot) || slot < 0 || slot >= MENU_SLOTS) return { ok: false, reason: 'That slot is not on the board.' };
  const lab = s.cafe.lab;
  if (id !== null && !lab.recipes[id]) return { ok: false, reason: 'That recipe is not in the book.' };
  const menu = { ...lab.menu };
  if (id !== null) for (const k of Object.keys(menu)) if (menu[k] === id) delete menu[k];
  if (id === null) delete menu[String(slot)]; else menu[String(slot)] = id;
  const on = new Set(Object.values(menu));
  const spotlight = lab.spotlight && on.has(lab.spotlight) ? lab.spotlight : null; // taking the Spotlight drink off the board retires the Spotlight
  return { ok: true, state: patchLab(s, { ...lab, menu, spotlight }), text: id ? 'On the menu board.' : 'Slot cleared.' };
}

export function applySpotlight(s: GameState, id: string | null): LabResult & { state?: GameState } {
  const lab = s.cafe.lab;
  if (id !== null && !Object.values(lab.menu).includes(id)) return { ok: false, reason: 'Put the drink on the menu board first.' };
  return { ok: true, state: patchLab(s, { ...lab, spotlight: id }), text: id ? 'Today\'s Spotlight Drink.' : 'No Spotlight today.' };
}

export function applyMemoryLink(s: GameState, id: string, memoryId: string): LabResult & { state?: GameState } {
  const r = s.cafe.lab?.recipes?.[id];
  if (!r) return { ok: false, reason: 'That recipe is not in the book.' };
  if (!s.memories.some((m) => m.id === memoryId)) return { ok: false, reason: 'That memory is not in your Journal.' };
  return { ok: true, state: patchLab(s, { ...s.cafe.lab, recipes: { ...s.cafe.lab.recipes, [id]: { ...r, memoryId } } }), text: 'Linked to a memory.' };
}

// ---------------------------------------------------------------- for the screens
export interface LabProgress {
  experimentsLeft: number;
  recipeCount: number;
  byTier: Record<LabTier, number>;
  menuFilled: number;
  nextUnlock: string | null; // warm text for the next closed ingredient, or null when everything is open
}
export function labProgress(s: GameState, day: string = dateKey()): LabProgress {
  const rs = recipesOf(s);
  const byTier: Record<LabTier, number> = { classic: 0, seasonal: 0, signature: 0 };
  for (const r of rs) byTier[r.tier]++;
  const next = INGREDIENTS.find((i) => !i.gated && !isUnlocked(s, i.id));
  return { experimentsLeft: experimentsLeft(s, day), recipeCount: rs.length, byTier, menuFilled: menuRecipes(s).length, nextUnlock: next ? `${next.name}: ${next.hint}` : null };
}
