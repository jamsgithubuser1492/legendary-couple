import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { drinkOf, newCafe, newOrder, tipMult, MENU_DRINKS } from './cafe';
import {
  DAILY_EXPERIMENTS, INGREDIENTS, LAB_NAME_IDEAS, applyExperiment, applyMemoryLink, applyMenuSlot, applyName, applySpotlight, availableIngredients, closeness,
  customDrinkOf, defaultName, experimentsLeft, hash32, isAvailable, isUnlocked, labDrinkPool, labProgress, labTipBonus, layersOf, menuSlots, newLab, normalizeLab,
  qualityOf, recipeIdOf, seasonKeyOf, seasonOfRecipe, sweetSpotFor, tierOf, validateName, type ExperimentInput,
} from './lab';
import { merge3 } from './merge';

const DAY = '2026-10-20';
const AUTUMN = new Date(2026, 9, 20);
const SPRING = new Date(2026, 3, 10);
const game = (rest: Partial<GameState> = {}): GameState =>
  ({ names: { A: 'James', B: 'Rachel' }, shells: 0, ingredients: 6, approvedCount: 0, notesOpened: 0, healthDays: {}, mgBest: {}, memories: [], recipes: [], cafe: normalizeLab(newCafe()), ...rest }) as unknown as GameState;
/** An input that lands on the sweet spot, with perfect art, so the drink comes out at 3 stars. */
const perfect = (base: string, flavor: string, topping: string): ExperimentInput => {
  const spot = sweetSpotFor(base, flavor, topping);
  return { base, flavor, topping, temp: spot.temp, sweet: spot.sweet, glass: 'mason', art: 'bear', rim: null, artScore: 1 };
};
const poor = (base: string, flavor: string, topping: string): ExperimentInput => ({ base, flavor, topping, temp: 0, sweet: 1, glass: 'mug', art: null, rim: null, artScore: 0 });
const ok = <T extends { ok: boolean }>(r: T) => { expect(r.ok).toBe(true); return r as T & { state: GameState } };

describe('ingredients and unlocking', () => {
  it('has 19 ingredients in three kinds with the agreed swatches', () => {
    expect(INGREDIENTS).toHaveLength(19);
    expect(INGREDIENTS.filter((i) => i.kind === 'base')).toHaveLength(4);
    expect(INGREDIENTS.filter((i) => i.kind === 'flavor')).toHaveLength(9);
    expect(INGREDIENTS.filter((i) => i.kind === 'topping')).toHaveLength(6);
    expect(INGREDIENTS.find((i) => i.id === 'matcha')!.swatch).toBe('#C5DCA0');
    expect(INGREDIENTS.find((i) => i.id === 'goldflakes')!.swatch).toBe('#FFE066');
  });
  it('opens the starters at once and the rest through real effort', () => {
    const s = game();
    for (const id of ['matcha', 'espresso', 'strawberry', 'honey', 'boba', 'creamfoam']) expect(isUnlocked(s, id)).toBe(true);
    expect(isUnlocked(s, 'earlgrey')).toBe(false);
    expect(isUnlocked(game({ approvedCount: 3 }), 'earlgrey')).toBe(true);
    expect(isUnlocked(s, 'turmeric')).toBe(false);
    expect(isUnlocked(game({ cafe: normalizeLab({ ...newCafe(), rushes: 1 }) }), 'turmeric')).toBe(true);
    expect(isUnlocked(game({ approvedCount: 4 }), 'blossomsprinkles')).toBe(false);
    expect(isUnlocked(game({ approvedCount: 5 }), 'blossomsprinkles')).toBe(true);
    expect(isUnlocked(game({ notesOpened: 1 }), 'rosepetals')).toBe(true);
    expect(isUnlocked(game({ mgBest: { ORCHARD_HARVEST: 40 } }), 'apple')).toBe(true);
    expect(isUnlocked(game({ healthDays: { a: ['A'] } }), 'lavenderhoney')).toBe(false);
    expect(isUnlocked(game({ healthDays: { a: ['A'], b: ['B'] } }), 'lavenderhoney')).toBe(true);
    expect(isUnlocked(s, 'saltedcaramel')).toBe(false); // a new café has no stars yet
  });
  it('holds seasonal ingredients to their real season', () => {
    const s = game();
    expect(isAvailable(s, 'pumpkinspice', AUTUMN)).toBe(true);
    expect(isAvailable(s, 'pumpkinspice', SPRING)).toBe(false);
    expect(isAvailable(s, 'blossom', SPRING)).toBe(true);
    expect(isAvailable(s, 'blossom', AUTUMN)).toBe(false);
    expect(isAvailable(s, 'peppermint', new Date(2026, 11, 25))).toBe(true); // the Holidays count as winter
    expect(isAvailable(s, 'peppermint', new Date(2026, 0, 6))).toBe(true);
    expect(isAvailable(s, 'peppermint', new Date(2026, 0, 7))).toBe(true); // January is winter
    expect(isAvailable(s, 'peppermint', new Date(2026, 2, 1))).toBe(false);
    expect(availableIngredients(s, AUTUMN).map((i) => i.id)).toContain('pumpkinspice');
  });
  it('follows the app\'s own season edges', () => {
    expect(seasonKeyOf(new Date(2026, 1, 28))).toBe('winter');
    expect(seasonKeyOf(new Date(2026, 2, 1))).toBe('spring');
    expect(seasonKeyOf(new Date(2026, 5, 1))).toBe('summer');
    expect(seasonKeyOf(new Date(2026, 8, 1))).toBe('autumn');
    expect(seasonKeyOf(new Date(2026, 10, 30))).toBe('autumn');
    expect(seasonKeyOf(new Date(2026, 11, 1))).toBe('winter');
  });
  it('keeps cinnamon for autumn and winter, or after a Pumpkin Spice drink', () => {
    const s = game();
    expect(isAvailable(s, 'cinnamon', AUTUMN)).toBe(true);
    expect(isAvailable(s, 'cinnamon', SPRING)).toBe(false);
    const made = ok(applyExperiment(s, perfect('matcha', 'pumpkinspice', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state;
    expect(isAvailable(made, 'cinnamon', SPRING)).toBe(true);
  });
  it('unlocks gold flakes after a Signature drink even at a low star rating', () => {
    const s = game();
    expect(isUnlocked(s, 'goldflakes')).toBe(false);
    expect(applyExperiment(s, perfect('matcha', 'honey', 'rosepetals'), { by: 'A', day: DAY, date: AUTUMN }).ok).toBe(false); // rose petals are closed until a thank you note is opened
    const r = ok(applyExperiment(game({ notesOpened: 1 }), perfect('matcha', 'honey', 'rosepetals'), { by: 'A', day: DAY, date: AUTUMN }));
    expect(r.recipe!.tier).toBe('signature');
    expect(isUnlocked(r.state, 'goldflakes')).toBe(true);
  });
});

describe('the sweet spot and quality', () => {
  it('is always the same for the same three ingredients, and inside a friendly range', () => {
    const a = sweetSpotFor('matcha', 'honey', 'boba');
    expect(sweetSpotFor('matcha', 'honey', 'boba')).toEqual(a);
    expect(sweetSpotFor('matcha', 'honey', 'creamfoam')).not.toEqual(a);
    for (const id of ['x', 'y', 'z', 'q1', 'q2']) { const p = sweetSpotFor(id, 'honey', 'boba'); expect(p.temp).toBeGreaterThanOrEqual(0.2); expect(p.temp).toBeLessThanOrEqual(0.8); expect(p.sweet).toBeGreaterThanOrEqual(0.2); expect(p.sweet).toBeLessThanOrEqual(0.8); }
    expect(hash32('abc')).toBe(hash32('abc'));
  });
  it('scores closeness from 1 on the spot down to 0', () => {
    const spot = { temp: 0.5, sweet: 0.5 };
    expect(closeness(0.5, 0.5, spot)).toBe(1);
    expect(closeness(0.5, 0.8, spot)).toBeCloseTo(0.5, 5);
    expect(closeness(0, 1, spot)).toBe(0);
  });
  it('mixes taste 60 percent with art 40 percent', () => {
    expect(qualityOf(1, 1)).toBe(3);
    expect(qualityOf(1, 0)).toBe(2); // 0.6
    expect(qualityOf(0, 1)).toBe(1); // 0.4
    expect(qualityOf(0.7, 0.8)).toBe(2); // 0.74
    expect(qualityOf(0.9, 0.9)).toBe(3);
    expect(qualityOf(0, 0)).toBe(1);
  });
  it('tiers depend only on the recipe: Classic, Seasonal and Signature', () => {
    expect(tierOf({ flavor: 'honey', topping: 'boba', quality: 1 })).toBe('classic');
    expect(tierOf({ flavor: 'honey', topping: 'boba', quality: 2 })).toBe('classic'); // two stars without a seasonal ingredient
    expect(tierOf({ flavor: 'blossom', topping: 'boba', quality: 2 })).toBe('seasonal');
    expect(tierOf({ flavor: 'honey', topping: 'boba', quality: 3 })).toBe('seasonal');
    expect(tierOf({ flavor: 'blossom', topping: 'boba', quality: 3 })).toBe('signature');
    expect(tierOf({ flavor: 'honey', topping: 'goldflakes', quality: 3 })).toBe('signature'); // a rare topping
    expect(tierOf({ flavor: 'blossom', topping: 'boba', quality: 1 })).toBe('classic');
    expect(seasonOfRecipe({ flavor: 'yuzu', topping: 'boba' })).toBe('summer');
    expect(seasonOfRecipe({ flavor: 'honey', topping: 'cinnamon' })).toBe('autumn');
    expect(seasonOfRecipe({ flavor: 'honey', topping: 'boba' })).toBeNull();
  });
});

describe('experiments', () => {
  it('makes a new recipe, spends one ingredient and one try, and remembers what you used', () => {
    const s = game();
    const r = ok(applyExperiment(s, perfect('matcha', 'honey', 'boba'), { by: 'B', day: DAY, date: AUTUMN }));
    expect(r.discoveredNew).toBe(true);
    expect(r.quality).toBe(3);
    expect(r.recipe!.tier).toBe('seasonal');
    expect(r.recipe!.by).toBe('B');
    expect(r.recipe!.name).toBe('Honey Matcha');
    expect(r.state.ingredients).toBe(5);
    expect(experimentsLeft(r.state, DAY)).toBe(DAILY_EXPERIMENTS - 1);
    expect(r.state.cafe.lab.seen.sort()).toEqual(['boba', 'honey', 'matcha']);
    expect(Object.keys(r.state.cafe.lab.recipes)).toEqual([recipeIdOf('matcha', 'honey', 'boba')]);
    expect(s.ingredients).toBe(6); // the old state is untouched
  });
  it('announces a new Signature recipe', () => {
    const r = ok(applyExperiment(game(), perfect('matcha', 'strawberry', 'boba'), { by: 'A', day: DAY, date: AUTUMN }));
    expect(r.recipe!.tier).toBe('seasonal'); // nothing seasonal in it
    const sig = ok(applyExperiment(game(), perfect('matcha', 'pumpkinspice', 'boba'), { by: 'A', day: DAY, date: AUTUMN }));
    expect(sig.recipe!.tier).toBe('signature');
    expect(sig.text).toBe('New Signature Recipe discovered!');
  });
  it('only improves a combination you already know, never duplicates or downgrades it', () => {
    let s = ok(applyExperiment(game(), poor('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state;
    expect(Object.values(s.cafe.lab.recipes)[0].quality).toBe(1);
    const again = ok(applyExperiment(s, perfect('matcha', 'honey', 'boba'), { by: 'B', day: DAY, date: AUTUMN }));
    expect(again.discoveredNew).toBe(false);
    expect(again.improved).toBe(true);
    expect(Object.keys(again.state.cafe.lab.recipes)).toHaveLength(1);
    expect(Object.values(again.state.cafe.lab.recipes)[0].quality).toBe(3);
    expect(Object.values(again.state.cafe.lab.recipes)[0].by).toBe('A'); // the first finder stays
    s = again.state;
    const worse = ok(applyExperiment(s, poor('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN }));
    expect(worse.improved).toBe(false);
    expect(Object.values(worse.state.cafe.lab.recipes)[0].quality).toBe(3);
  });
  it('allows three a day, resets on a new day, and says so kindly', () => {
    let s = game({ ingredients: 20 });
    const combos: [string, string, string][] = [['matcha', 'honey', 'boba'], ['matcha', 'strawberry', 'boba'], ['espresso', 'honey', 'boba'], ['espresso', 'strawberry', 'creamfoam']];
    for (let i = 0; i < 3; i++) s = ok(applyExperiment(s, perfect(...combos[i]), { by: 'A', day: DAY, date: AUTUMN })).state;
    expect(experimentsLeft(s, DAY)).toBe(0);
    const no = applyExperiment(s, perfect(...combos[3]), { by: 'A', day: DAY, date: AUTUMN });
    expect(no.ok).toBe(false);
    expect(no.reason).toMatch(/tomorrow/);
    expect(experimentsLeft(s, '2026-10-21')).toBe(3);
    expect(applyExperiment(s, perfect(...combos[3]), { by: 'A', day: '2026-10-21', date: AUTUMN }).ok).toBe(true);
  });
  it('needs a pantry ingredient and an open, in season pantry', () => {
    expect(applyExperiment(game({ ingredients: 0 }), perfect('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN }).reason).toMatch(/pantry/);
    expect(applyExperiment(game(), perfect('earlgrey', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN }).reason).toMatch(/3 approved goals/);
    expect(applyExperiment(game(), perfect('matcha', 'blossom', 'boba'), { by: 'A', day: DAY, date: AUTUMN }).reason).toMatch(/out of season/);
    expect(applyExperiment(game(), perfect('honey', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN }).ok).toBe(false); // wrong kind in the base slot
    expect(applyExperiment(game(), { ...perfect('matcha', 'honey', 'boba'), temp: NaN }, { by: 'A', day: DAY, date: AUTUMN }).ok).toBe(false);
  });
  it('ignores unknown glass, art and rim values instead of saving junk', () => {
    const r = ok(applyExperiment(game(), { ...perfect('matcha', 'honey', 'boba'), glass: 'bucket' as never, art: 'dragon', rim: 'mud' }, { by: 'A', day: DAY, date: AUTUMN }));
    expect(r.recipe!.glass).toBe('mason');
    expect(r.recipe!.art).toBeNull();
    expect(r.recipe!.rim).toBeNull();
  });
});

describe('naming, the menu board and the Spotlight', () => {
  const made = () => ok(applyExperiment(game({ ingredients: 20 }), perfect('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state;
  const second = (s: GameState) => ok(applyExperiment(s, perfect('espresso', 'strawberry', 'creamfoam'), { by: 'A', day: DAY, date: AUTUMN })).state;
  const id1 = recipeIdOf('matcha', 'honey', 'boba'), id2 = recipeIdOf('espresso', 'strawberry', 'creamfoam');
  it('validates names', () => {
    const s = made();
    expect(validateName('  Our   First Date Sunset Matcha  ', s)).toEqual({ ok: true, name: 'Our First Date Sunset Matcha' });
    expect(validateName('', s).ok).toBe(false);
    expect(validateName('   ', s).ok).toBe(false);
    expect(validateName('x'.repeat(29), s).ok).toBe(false);
    expect(validateName('x'.repeat(28), s).ok).toBe(true);
    expect(validateName('matcha latte', s).ok).toBe(false); // a built in drink
    expect(validateName('honey matcha', s).ok).toBe(false); // another recipe
    expect(validateName('Honey Matcha', s, id1).ok).toBe(true); // its own name
    expect(validateName('bad\u0007name', s).ok).toBe(false);
    for (const n of LAB_NAME_IDEAS) expect(n.length).toBeLessThanOrEqual(28 + 12);
    expect(LAB_NAME_IDEAS).toHaveLength(8);
  });
  it('renames a recipe and refuses a clash', () => {
    const s = second(made());
    const r = ok(applyName(s, id1, 'Pier Day Matcha'));
    expect(r.state.cafe.lab.recipes[id1].name).toBe('Pier Day Matcha');
    expect(applyName(r.state, id2, 'pier day matcha').ok).toBe(false);
    expect(applyName(r.state, 'nope', 'Anything').ok).toBe(false);
  });
  it('puts recipes on six slots, moves them, and retires the Spotlight with the slot', () => {
    let s = second(made());
    s = ok(applyMenuSlot(s, 0, id1)).state;
    s = ok(applyMenuSlot(s, 3, id2)).state;
    expect(menuSlots(s).map((r) => r?.id ?? null)).toEqual([id1, null, null, id2, null, null]);
    s = ok(applyMenuSlot(s, 5, id1)).state; // moving it leaves its old slot
    expect(menuSlots(s).map((r) => r?.id ?? null)).toEqual([null, null, null, id2, null, id1]);
    expect(applySpotlight(s, 'nope').ok).toBe(false);
    s = ok(applySpotlight(s, id1)).state;
    expect(s.cafe.lab.spotlight).toBe(id1);
    s = ok(applyMenuSlot(s, 5, null)).state;
    expect(s.cafe.lab.spotlight).toBeNull();
    expect(applyMenuSlot(s, 6, id1).ok).toBe(false);
    expect(applyMenuSlot(s, -1, id1).ok).toBe(false);
    expect(applyMenuSlot(s, 0, 'missing').ok).toBe(false);
    expect(applySpotlight(s, id1).ok).toBe(false); // it is off the board now
  });
  it('links a recipe to a Journal memory that exists', () => {
    const s = { ...made(), memories: [{ id: 'm1' }] } as unknown as GameState;
    expect(ok(applyMemoryLink(s, id1, 'm1')).state.cafe.lab.recipes[id1].memoryId).toBe('m1');
    expect(applyMemoryLink(s, id1, 'm2').ok).toBe(false);
    expect(applyMemoryLink(s, 'nope', 'm1').ok).toBe(false);
  });
});

describe('guests, layers and the tip bonus', () => {
  it('turns a recipe into 2 to 5 Matcha Masters ingredients, base first, never empty', () => {
    for (const b of ['matcha', 'espresso', 'earlgrey', 'turmeric']) for (const f of INGREDIENTS.filter((i) => i.kind === 'flavor')) for (const t of INGREDIENTS.filter((i) => i.kind === 'topping')) {
      const l = layersOf({ base: b, flavor: f.id, topping: t.id });
      expect(l.length).toBeGreaterThanOrEqual(2);
      expect(l.length).toBeLessThanOrEqual(5);
      expect(new Set(l).size).toBe(l.length);
      for (const n of l) expect(['Matcha', 'Oat Milk', 'Milk', 'Ice', 'Boba', 'Strawberry', 'Espresso']).toContain(n);
    }
    expect(layersOf({ base: 'matcha', flavor: 'strawberry', topping: 'boba' })).toEqual(['Matcha', 'Oat Milk', 'Strawberry', 'Boba']);
  });
  const withMenu = () => {
    let s = game({ ingredients: 20 });
    s = ok(applyExperiment(s, perfect('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state; // seasonal tier
    s = ok(applyExperiment(s, perfect('matcha', 'pumpkinspice', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state; // signature
    return ok(applyMenuSlot(ok(applyMenuSlot(s, 0, recipeIdOf('matcha', 'honey', 'boba'))).state, 1, recipeIdOf('matcha', 'pumpkinspice', 'boba'))).state;
  };
  it('lets drinkOf find a custom drink and leaves the built in menu alone', () => {
    const s = withMenu();
    expect(drinkOf('Matcha Latte', s)!.recipe).toEqual(['Matcha', 'Oat Milk', 'Ice']);
    expect(drinkOf('Honey Matcha', s)!.recipe).toEqual(layersOf({ base: 'matcha', flavor: 'honey', topping: 'boba' }));
    expect(drinkOf('Honey Matcha')).toBeUndefined(); // without the state it only knows the built in drinks
    expect(customDrinkOf(s, 'Nope')).toBeUndefined();
  });
  it('draws menu board drinks twice and the Spotlight three times', () => {
    let s = withMenu();
    const built = MENU_DRINKS.map((d) => d.name);
    let pool = labDrinkPool(s, 'student', built);
    expect(pool.filter((n) => n === 'Honey Matcha')).toHaveLength(2);
    s = ok(applySpotlight(s, recipeIdOf('matcha', 'honey', 'boba'))).state;
    pool = labDrinkPool(s, 'student', built);
    expect(pool.filter((n) => n === 'Honey Matcha')).toHaveLength(3);
    expect(pool.filter((n) => n === 'Matcha Latte')).toHaveLength(1);
    expect(labDrinkPool(game(), 'student', built)).toEqual(built);
  });
  it('has VIP guests ask for a Signature drink when the board has one', () => {
    const s = withMenu();
    const built = MENU_DRINKS.map((d) => d.name);
    expect(labDrinkPool(s, 'vip_kitty', built, () => 0.1)).toEqual([s.cafe.lab.recipes[recipeIdOf('matcha', 'pumpkinspice', 'boba')].name]);
    expect(labDrinkPool(s, 'vip_kitty', built, () => 0.9).length).toBeGreaterThan(built.length);
    expect(labDrinkPool(game(), 'vip_kitty', built, () => 0.1)).toEqual(built); // no Signature on the board
  });
  it('lets newOrder pick custom drinks that always resolve', () => {
    const s = withMenu();
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) { const o = newOrder(s, 'student'); if (o.drink) { seen.add(o.drink); expect(drinkOf(o.drink, s)).toBeDefined(); } }
    expect(seen.has('Honey Matcha')).toBe(true);
  });
  it('adds a small tip bonus for what is on the board, capped at 0.3', () => {
    expect(labTipBonus(game())).toBe(0);
    const s = withMenu();
    expect(labTipBonus(s)).toBeCloseTo(0.04 + 0.08, 5);
    const sp = ok(applySpotlight(s, recipeIdOf('matcha', 'honey', 'boba'))).state;
    expect(labTipBonus(sp)).toBeCloseTo(0.17, 5);
    expect(tipMult(sp) - tipMult(s)).toBeCloseTo(0.05, 5);
    // a recipe that is only in the book gives nothing
    const off = ok(applyMenuSlot(s, 0, null)).state;
    expect(labTipBonus(off)).toBeCloseTo(0.08, 5);
    // the cap
    const many = { ...s, cafe: { ...s.cafe, lab: { ...s.cafe.lab, recipes: Object.fromEntries([...Array(6)].map((_, i) => [`s${i}`, { id: `s${i}`, name: `S${i}`, base: 'matcha', flavor: 'blossom', topping: 'boba', glass: 'mason', art: null, rim: null, quality: 3, tier: 'signature', by: 'A', day: DAY }])), menu: { 0: 's0', 1: 's1', 2: 's2', 3: 's3', 4: 's4', 5: 's5' }, spotlight: 's0' } } } as unknown as GameState;
    expect(labTipBonus(many)).toBe(0.3);
  });
  it('gives the summary the screens need', () => {
    const s = withMenu();
    const p = labProgress(s, DAY);
    expect(p).toMatchObject({ recipeCount: 2, menuFilled: 2, byTier: { classic: 0, seasonal: 1, signature: 1 } });
    expect(p.experimentsLeft).toBe(1);
    expect(p.nextUnlock).toMatch(/Earl Grey Tea: Opens after 3 approved goals/);
    const open = game({ approvedCount: 9, notesOpened: 2, mgBest: { ORCHARD_HARVEST: 10 }, healthDays: { a: [], b: [] }, cafe: normalizeLab({ ...newCafe(), rushes: 2 }) });
    expect(labProgress(open).nextUnlock).toMatch(/Salted Caramel/);
  });
});

describe('old saves and two phones', () => {
  it('adds the Lab to a café that has none, and cleans a damaged one', () => {
    const old = { ...newCafe() } as Record<string, unknown>;
    delete old.lab;
    expect(normalizeLab(old as never).lab).toEqual(newLab());
    const bad = normalizeLab({
      ...newCafe(),
      lab: {
        daily: { day: DAY, A: 99, B: 0 },
        recipes: {
          good: { id: 'good', name: 'Good', base: 'matcha', flavor: 'blossom', topping: 'boba', glass: 'jug', art: null, rim: null, quality: 7, tier: 'classic', by: 'A', day: DAY },
          junk: { id: 'junk', name: 'Junk', base: 'nope', flavor: 'honey', topping: 'boba', glass: 'mug', art: null, rim: null, quality: 2, tier: 'classic', by: 'A', day: DAY },
        },
        menu: { 0: 'good', 1: 'junk', 2: 'good', 9: 'good' }, spotlight: 'junk', seen: ['matcha', 'matcha', 'zzz'],
      },
    } as never).lab;
    expect(Object.keys(bad.recipes)).toEqual(['good']);
    expect(bad.recipes.good.quality).toBe(3);
    expect(bad.recipes.good.glass).toBe('mason');
    expect(bad.recipes.good.tier).toBe('signature'); // recomputed from quality and the seasonal flavor
    expect(bad.menu).toEqual({ 0: 'good' });
    expect(bad.spotlight).toBeNull();
    expect(bad.seen).toEqual(['matcha']);
    expect(bad.daily.A).toBeLessThanOrEqual(DAILY_EXPERIMENTS * 2);
  });
  it('merges two phones that discover, name and experiment at the same time', () => {
    const base = game({ ingredients: 10 });
    const a = ok(applyExperiment(base, perfect('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state; // James
    const b = ok(applyExperiment(base, perfect('espresso', 'strawberry', 'creamfoam'), { by: 'B', day: DAY, date: AUTUMN })).state; // Rachel
    const merged = merge3(base, a, b);
    expect(Object.keys(merged.cafe.lab.recipes)).toHaveLength(2); // both recipes kept
    expect(merged.cafe.lab.daily).toEqual({ day: DAY, A: 1, B: 1 }); // both phones' tries count
    expect(merged.ingredients).toBe(8); // both spent one
    expect(merged.cafe.lab.seen.sort()).toEqual(['boba', 'creamfoam', 'espresso', 'honey', 'matcha', 'strawberry']);
  });
  it('keeps the best quality when both discover the same drink, and recomputes the tier', () => {
    const base = game({ ingredients: 10 });
    const a = ok(applyExperiment(base, poor('matcha', 'blossom', 'boba'), { by: 'A', day: DAY, date: SPRING })).state;
    const b = ok(applyExperiment(base, perfect('matcha', 'blossom', 'boba'), { by: 'B', day: DAY, date: SPRING })).state;
    const merged = normalizeLab(merge3(base, a, b).cafe);
    const r = Object.values(merged.lab.recipes);
    expect(r).toHaveLength(1);
    expect(r[0].quality).toBe(3);
    expect(r[0].tier).toBe('signature');
  });
  it('merges one phone naming a drink while the other puts it on the board', () => {
    const start = ok(applyExperiment(game(), perfect('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state;
    const id = recipeIdOf('matcha', 'honey', 'boba');
    const named = ok(applyName(start, id, 'Our First Date Matcha')).state;
    const onBoard = ok(applyMenuSlot(start, 2, id)).state;
    const merged = merge3(start, named, onBoard);
    expect(merged.cafe.lab.recipes[id].name).toBe('Our First Date Matcha');
    expect(merged.cafe.lab.menu).toEqual({ 2: id });
  });
  it('keeps both phones\' menu slots when they fill different slots', () => {
    let start = ok(applyExperiment(game({ ingredients: 10 }), perfect('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state;
    start = ok(applyExperiment(start, perfect('espresso', 'strawberry', 'creamfoam'), { by: 'A', day: DAY, date: AUTUMN })).state;
    const i1 = recipeIdOf('matcha', 'honey', 'boba'), i2 = recipeIdOf('espresso', 'strawberry', 'creamfoam');
    const a = ok(applyMenuSlot(start, 0, i1)).state, b = ok(applyMenuSlot(start, 4, i2)).state;
    expect(merge3(start, a, b).cafe.lab.menu).toEqual({ 0: i1, 4: i2 });
  });
  it('rolls the daily count to the newer day without touching the recipes', () => {
    const start = ok(applyExperiment(game({ ingredients: 10 }), perfect('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state;
    const nextDay = ok(applyExperiment(start, perfect('espresso', 'strawberry', 'creamfoam'), { by: 'B', day: '2026-10-21', date: AUTUMN })).state;
    const merged = merge3(start, start, nextDay);
    expect(merged.cafe.lab.daily).toEqual({ day: '2026-10-21', A: 0, B: 1 });
    expect(Object.keys(merged.cafe.lab.recipes)).toHaveLength(2);
  });
  it('picks a default name that never clashes', () => {
    const s = ok(applyExperiment(game(), perfect('matcha', 'honey', 'boba'), { by: 'A', day: DAY, date: AUTUMN })).state;
    expect(defaultName(s, { base: 'matcha', flavor: 'honey', topping: 'creamfoam' })).toBe('Honey Matcha 2');
    expect(defaultName(game(), { base: 'espresso', flavor: 'strawberry', topping: 'boba' })).toBe('Strawberry Espresso');
  });
});

describe('default names', () => {
  it('never cut a word in half', () => {
    const n = defaultName(game(), { base: 'turmeric', flavor: 'saltedcaramel', topping: 'boba' });
    expect(n.length).toBeLessThanOrEqual(28);
    expect(n.endsWith('Turmer')).toBe(false);
  });
});
