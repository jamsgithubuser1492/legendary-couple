import { describe, expect, it } from 'vitest';
import type { CafeState, GameState } from '../types';
import { matchaBonus, newCafe, tipCap, tipMult, tipRate } from './cafe';
import {
  ARRIVALS, BUFF_CAPS, CREW, DUET_XP, ENERGY_START, assign, clampCozy, cozyBand, crewDef, crewPerks, currentShift, daysBetween, giveFeedback, hiredCrew,
  levelGoal, linesFor, normalizeCafe, perkScale, promote, promotionNeeds, promotionReady, rosterActive, rosterDaysLeft, rosterMatch, startRoster, teamBuff, trainCrew,
  treat, unassign, welcome, withCrewEntry, xpFraction, FEEDBACK, PROMOTION_SHELLS, TRAIN_XP,
} from './crew';
import { merge3 } from './merge';
import { waitingFor } from './waiting';

const TUE = new Date(2026, 9, 20, 9, 0); // Tuesday morning: the weekday rush
const DAY = '2026-10-20';
const DAY7 = '2026-10-27';

/** A café state with the four starting crew hired (as an old or a new save would have them). */
const game = (over: Partial<CafeState> = {}, rest: Partial<GameState> = {}): GameState => {
  const cafe = normalizeCafe({ ...newCafe(), staff: ['manager', 'apprentice', 'brewmaster', 'petsitter'], ...over }, DAY);
  return { names: { A: 'James', B: 'Rachel' }, shells: 0, ingredients: 5, ...rest, cafe } as unknown as GameState;
};
const ok = <T extends { ok: boolean }>(r: T) => { expect(r.ok).toBe(true); return r as Extract<T, { ok: true }>; };
const rosterOn = (s: GameState) => ok(startRoster(s, DAY)).state;

describe('levels, cozy and perks', () => {
  it('has a promotion goal for each level but the last', () => {
    expect(levelGoal(1)).toBe(60);
    expect(levelGoal(2)).toBe(120);
    expect(levelGoal(3)).toBeNull();
  });
  it('bands cozy as Steady, Warm and Glowing, and keeps it in range', () => {
    expect(cozyBand(0)).toBe('steady');
    expect(cozyBand(33)).toBe('steady');
    expect(cozyBand(34)).toBe('warm');
    expect(cozyBand(66)).toBe('warm');
    expect(cozyBand(67)).toBe('glowing');
    expect(clampCozy(150)).toBe(100);
    expect(clampCozy(-5)).toBe(0);
    expect(clampCozy(NaN)).toBe(0);
  });
  it('scales perks by level: 1, 1.5 and 2 times', () => {
    expect([1, 2, 3].map(perkScale)).toEqual([1, 1.5, 2]);
  });
  it('knows all eight crew, by crew id and by staff id', () => {
    expect(CREW.map((c) => c.id)).toEqual(['tan', 'pip', 'oren', 'juno', 'hana', 'kenji', 'maya', 'ollie']);
    expect(crewDef('manager')?.id).toBe('tan');
    expect(crewDef('tan')?.staff).toBe('manager');
    expect(crewDef('hana')?.staff).toBe('hana');
    expect(ARRIVALS.map((a) => a.popularity)).toEqual([3, 5, 8, 12]);
    for (const c of CREW) { expect(c.chapters).toHaveLength(3); expect(c.perks).toHaveLength(3); }
  });
  it('writes no dashes in anything a player reads', () => {
    const text = [...CREW.flatMap((c) => [c.name, c.role, c.blurb, ...c.chapters, ...c.perks]), ...FEEDBACK.map((l) => l.text)];
    for (const t of text) expect(t).not.toMatch(/[-–—]/);
  });
  it('offers three skill lines and three general lines of each kind', () => {
    for (const c of CREW) for (const kind of ['praise', 'coach'] as const) {
      const lines = linesFor(c.staff, kind);
      expect(lines).toHaveLength(6);
      expect(lines.filter((l) => l.skill === c.skill)).toHaveLength(3);
      expect(lines.filter((l) => l.skill === 'any')).toHaveLength(3);
    }
  });
});

describe('shifts', () => {
  it('picks the shift from the time of day', () => {
    expect(currentShift(new Date(2026, 9, 20, 9))).toBe('rush'); // a Tuesday morning
    expect(currentShift(new Date(2026, 9, 24, 9))).toBe('brunch'); // a Saturday morning
    expect(currentShift(new Date(2026, 9, 25, 11))).toBe('brunch'); // a Sunday morning
    expect(currentShift(new Date(2026, 9, 20, 12))).toBe('afternoon');
    expect(currentShift(new Date(2026, 9, 20, 16, 59))).toBe('afternoon');
    expect(currentShift(new Date(2026, 9, 20, 17))).toBe('night');
    expect(currentShift(new Date(2026, 9, 20, 3))).toBe('night');
  });
});

describe('Mentor moments', () => {
  it('gives a Praise and a Coaching moment once a day each', () => {
    const s0 = game();
    const a = ok(giveFeedback(s0, 'manager', 'praise', 'ch1', 'A', DAY));
    expect(a.xp).toBe(8);
    expect(a.specific).toBe(true); // tan is a charm crew member and ch1 is a charm line
    expect(a.cozy).toBe(6);
    const m = a.state.cafe.crew.manager;
    expect(m).toMatchObject({ xp: 8, praised: true, praiseBy: 'A', praiseDay: DAY, coached: false, cozy: 26 });
    // a second Praise the same day is not allowed, even with another line
    expect(giveFeedback(a.state, 'manager', 'praise', 'gp1', 'B', DAY)).toEqual({ ok: false, reason: 'already today' });
    // the other partner can give the Coaching moment the same day
    const b = ok(giveFeedback(a.state, 'manager', 'coach', 'gc1', 'B', DAY));
    expect(b.specific).toBe(false);
    expect(b.cozy).toBe(4);
    expect(b.state.cafe.crew.manager).toMatchObject({ xp: 16, coached: true, coachBy: 'B' });
    // tomorrow both can be given again
    expect(giveFeedback(b.state, 'manager', 'praise', 'ch2', 'A', '2026-10-21').ok).toBe(true);
  });
  it('warms a crew member more for specific praise than a general line', () => {
    const generic = ok(giveFeedback(game(), 'pip', 'praise', 'gp1', 'A', DAY));
    const specific = ok(giveFeedback(game(), 'pip', 'praise', 'sp1', 'A', DAY));
    expect(generic.cozy).toBe(3);
    expect(specific.cozy).toBe(6);
  });
  it('refuses unknown crew, unknown lines and the wrong kind of line', () => {
    expect(giveFeedback(game(), 'hana', 'praise', 'gp1', 'A', DAY)).toEqual({ ok: false, reason: 'not hired' });
    expect(giveFeedback(game(), 'pip', 'praise', 'nope', 'A', DAY)).toEqual({ ok: false, reason: 'unknown line' });
    expect(giveFeedback(game(), 'pip', 'praise', 'gc1', 'A', DAY)).toEqual({ ok: false, reason: 'unknown line' });
  });
  it('never lets experience pass the goal and never adds cozy past 100', () => {
    let s = game();
    s = { ...s, cafe: { ...s.cafe, crew: { ...s.cafe.crew, apprentice: { ...s.cafe.crew.apprentice, xp: 58, cozy: 98 } } } };
    const r = ok(giveFeedback(s, 'pip', 'praise', 'sp1', 'A', DAY));
    expect(r.xp).toBe(2);
    expect(r.state.cafe.crew.apprentice.xp).toBe(60);
    expect(r.state.cafe.crew.apprentice.cozy).toBe(100);
  });
  it('keeps giving cozy at the top level but no experience', () => {
    let s = game();
    s = { ...s, cafe: { ...s.cafe, crew: { ...s.cafe.crew, apprentice: { ...s.cafe.crew.apprentice, level: 3, chapter: 3 } } } };
    const r = ok(giveFeedback(s, 'pip', 'coach', 'sc1', 'A', DAY));
    expect(r.xp).toBe(0);
    expect(r.state.cafe.crew.apprentice.xp).toBe(0);
    expect(r.state.cafe.crew.apprentice.cozy).toBe(24);
  });
});

describe('promotion', () => {
  const ready = (over = {}) => {
    const s = game();
    return { ...s, cafe: { ...s.cafe, crew: { ...s.cafe.crew, oren: { ...s.cafe.crew.brewmaster, xp: 60, praised: true, coached: true, ...over } } } } as GameState;
  };
  // oren is hired as 'brewmaster'; put the progress where the game keeps it
  const withOren = (over = {}) => {
    const s = game();
    return { ...s, cafe: { ...s.cafe, crew: { ...s.cafe.crew, brewmaster: { ...s.cafe.crew.brewmaster, xp: 60, praised: true, coached: true, ...over } } } } as GameState;
  };
  void ready;
  it('needs the bar full and both a Praise and a Coaching moment', () => {
    expect(promote(withOren({ xp: 59 }), 'oren')).toEqual({ ok: false, reason: 'not ready' });
    expect(promote(withOren({ praised: false }), 'oren')).toEqual({ ok: false, reason: 'not ready' });
    expect(promote(withOren({ coached: false }), 'oren')).toEqual({ ok: false, reason: 'not ready' });
    expect(promotionReady(withOren().cafe.crew.brewmaster)).toBe(true);
    expect(promotionNeeds(withOren({ xp: 10, praised: false }).cafe.crew.brewmaster)).toEqual({ xp: true, praise: true, coach: false });
  });
  it('raises the level, resets the bar and flags, unlocks the next chapter and pays 2 heart shells', () => {
    const r = ok(promote(withOren({ praiseBy: 'A', coachBy: 'B' }), 'oren'));
    expect(r.level).toBe(2);
    expect(r.shells).toBe(PROMOTION_SHELLS);
    expect(r.state.shells).toBe(2);
    expect(r.state.cafe.crew.brewmaster).toMatchObject({ level: 2, xp: 0, praised: false, coached: false, chapter: 2 });
    expect(r.state.cafe.crew.brewmaster.praiseBy).toBeUndefined();
  });
  it('stops at Expert', () => {
    const s = withOren({ level: 3, xp: 0 });
    expect(promote(s, 'oren')).toEqual({ ok: false, reason: 'already expert' });
    expect(xpFraction(s.cafe.crew.brewmaster)).toBe(1);
  });
  it('is not a way around hiring', () => {
    expect(promote(game(), 'hana')).toEqual({ ok: false, reason: 'not hired' });
  });
});

describe('treats', () => {
  it('costs 2 pantry ingredients, adds 15 cozy and is once a day per crew member', () => {
    const r = ok(treat(game(), 'juno', DAY));
    expect(r.state.ingredients).toBe(3);
    expect(r.state.cafe.crew.petsitter.cozy).toBe(35);
    expect(treat(r.state, 'juno', DAY)).toEqual({ ok: false, reason: 'already today' });
    expect(treat(r.state, 'juno', '2026-10-21').ok).toBe(true);
    expect(treat(game({}, { ingredients: 1 } as never), 'juno', DAY)).toEqual({ ok: false, reason: 'not enough ingredients' });
  });
});

describe('welcoming islanders', () => {
  it('lets each islander in once the café is popular enough, for free', () => {
    const s = game({ popularity: 2 });
    expect(welcome(s, 'hana', DAY)).toEqual({ ok: false, reason: 'not popular enough yet' });
    const r = ok(welcome({ ...s, cafe: { ...s.cafe, popularity: 3 } }, 'hana', DAY));
    expect(r.state.cafe.staff).toContain('hana');
    expect(r.state.cafe.crew.hana).toMatchObject({ level: 1, xp: 0, cozy: 20, chapter: 1 });
    expect(welcome(r.state, 'hana', DAY)).toEqual({ ok: false, reason: 'already hired' });
    for (const [id, pop] of [['kenji', 5], ['maya', 8], ['ollie', 12]] as const) {
      expect(welcome({ ...s, cafe: { ...s.cafe, popularity: pop - 1 } }, id, DAY).ok).toBe(false);
      expect(welcome({ ...s, cafe: { ...s.cafe, popularity: pop } }, id, DAY).ok).toBe(true);
    }
  });
  it('keeps the first four for the coin hire', () => {
    expect(welcome(game({ staff: [] }), 'tan', DAY)).toEqual({ ok: false, reason: 'hire with coins' });
  });
  it('gives someone who joins mid roster their three pips', () => {
    const s = rosterOn(game({ popularity: 3 }));
    const r = ok(welcome(s, 'hana', DAY));
    expect(r.state.cafe.roster?.energy.hana).toBe(ENERGY_START);
  });
  it('gives a crew entry to someone hired with coins', () => {
    const s = withCrewEntry({ ...game({ staff: [] }), cafe: { ...game({ staff: [] }).cafe, staff: ['manager'] } } as GameState, 'manager', DAY);
    expect(s.cafe.crew.manager.level).toBe(1);
  });
});

describe('the roster', () => {
  it('starts on any day, lasts 7 days, and can start again once it ends', () => {
    const s0 = game();
    expect(rosterActive(s0, DAY)).toBe(false);
    const s1 = ok(startRoster(s0, DAY)).state;
    expect(s1.cafe.roster).toMatchObject({ startedOn: DAY, slots: { rush: [], brunch: [], afternoon: [], night: [] } });
    expect(rosterActive(s1, DAY)).toBe(true);
    expect(rosterDaysLeft(s1, DAY)).toBe(7);
    expect(rosterDaysLeft(s1, '2026-10-26')).toBe(1);
    expect(startRoster(s1, '2026-10-26')).toEqual({ ok: false, reason: 'a roster is already running' });
    expect(rosterActive(s1, DAY7)).toBe(false);
    expect(rosterDaysLeft(s1, DAY7)).toBe(0);
    expect(startRoster(s1, DAY7).ok).toBe(true);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
  });
  it('gives everyone three pips each time a new roster starts', () => {
    const s1 = rosterOn(game());
    expect(s1.cafe.roster?.energy).toEqual({ manager: 3, apprentice: 3, brewmaster: 3, petsitter: 3 });
    const spent = ok(assign(s1, 'rush', 'pip', DAY)).state;
    expect(spent.cafe.roster?.energy.apprentice).toBe(2);
    const again = ok(startRoster(spent, DAY7)).state;
    expect(again.cafe.roster?.energy.apprentice).toBe(3);
    expect(again.cafe.roster?.slots.rush).toEqual([]);
  });
  it('spends a pip the first time someone takes a shift, and swapping back is free', () => {
    let s = rosterOn(game());
    s = ok(assign(s, 'rush', 'pip', DAY)).state;
    expect(s.cafe.roster?.energy.apprentice).toBe(2);
    s = ok(unassign(s, 'rush', 'pip')).state; // no refund
    expect(s.cafe.roster?.energy.apprentice).toBe(2);
    s = ok(assign(s, 'rush', 'pip', DAY)).state; // the same shift again: already paid
    expect(s.cafe.roster?.energy.apprentice).toBe(2);
    s = ok(assign(s, 'brunch', 'pip', DAY)).state; // a second shift costs one more
    expect(s.cafe.roster?.energy.apprentice).toBe(1);
  });
  it('allows at most 2 people on a shift and 2 shifts for one person', () => {
    let s = rosterOn(game());
    s = ok(assign(s, 'rush', 'pip', DAY)).state;
    s = ok(assign(s, 'rush', 'tan', DAY)).state;
    expect(assign(s, 'rush', 'oren', DAY)).toEqual({ ok: false, reason: 'slot full' });
    expect(assign(s, 'rush', 'pip', DAY)).toEqual({ ok: false, reason: 'already there' });
    s = ok(assign(s, 'brunch', 'pip', DAY)).state;
    expect(assign(s, 'night', 'pip', DAY)).toEqual({ ok: false, reason: 'too many shifts' });
  });
  it('refuses without a roster, after it ends, or for someone who is not hired', () => {
    expect(assign(game(), 'rush', 'pip', DAY)).toEqual({ ok: false, reason: 'no roster' });
    expect(assign(rosterOn(game()), 'rush', 'pip', DAY7)).toEqual({ ok: false, reason: 'roster ended' });
    expect(assign(rosterOn(game()), 'rush', 'hana', DAY)).toEqual({ ok: false, reason: 'not hired' });
    expect(unassign(rosterOn(game()), 'rush', 'pip')).toEqual({ ok: false, reason: 'not on that shift' });
  });
  it('stops at no energy', () => {
    let s = rosterOn(game());
    s = { ...s, cafe: { ...s.cafe, roster: { ...s.cafe.roster!, energy: { ...s.cafe.roster!.energy, apprentice: 0 } } } };
    expect(assign(s, 'rush', 'pip', DAY)).toEqual({ ok: false, reason: 'no energy left' });
  });
  it('spots favorites and Duets', () => {
    let s = rosterOn(game());
    s = ok(assign(s, 'rush', 'pip', DAY)).state; // speed, favorite rush
    s = ok(assign(s, 'rush', 'oren', DAY)).state; // craft: speed and craft make a Duet
    const m = rosterMatch(s, 'rush');
    expect(m.favorites).toEqual(['apprentice']);
    expect(m.duet).toBe(true);
    expect(m.pairs).toEqual([['apprentice', 'brewmaster']]);
    // two of the same skill do not
    let t = rosterOn(game({ staff: ['apprentice', 'kenji'] }));
    t = ok(assign(t, 'rush', 'pip', DAY)).state;
    t = ok(assign(t, 'rush', 'kenji', DAY)).state;
    expect(rosterMatch(t, 'rush').duet).toBe(false);
  });
});

describe('training from Matcha Masters', () => {
  const onShift = (ids: string[]) => ids.reduce((s, id) => ok(assign(s, 'rush', id, DAY)).state, rosterOn(game()));
  it('trains nobody without a roster, or when nobody is on the current shift', () => {
    expect(trainCrew(game(), 3, TUE).trained).toEqual([]);
    expect(trainCrew(rosterOn(game()), 3, TUE).trained).toEqual([]);
    const night = ok(assign(rosterOn(game()), 'night', 'juno', DAY)).state;
    expect(trainCrew(night, 3, TUE).trained).toEqual([]); // it is the rush on Tuesday morning
  });
  it('gives experience by stars to the crew on the current shift: 30, 20 and 10', () => {
    const s = onShift(['apprentice']);
    expect(TRAIN_XP).toEqual({ 3: 30, 2: 20, 1: 10 });
    for (const [stars, xp] of [[3, 30], [4, 30], [2, 20], [1, 10]] as const) {
      const r = trainCrew(s, stars, TUE);
      expect(r.trained).toEqual(['apprentice']);
      expect(r.xp).toBe(xp);
      expect(r.state.cafe.crew.apprentice.xp).toBe(xp);
      expect(r.notes[0]).toContain('Pip');
      expect(r.notes[0]).not.toMatch(/[-–—]/);
    }
    expect(trainCrew(s, 0, TUE).trained).toEqual([]);
  });
  it('adds 10 for a Duet and caps experience at the level goal', () => {
    const s = onShift(['apprentice', 'brewmaster']); // speed with craft
    const r = trainCrew(s, 3, TUE);
    expect(r.xp).toBe(30 + DUET_XP);
    expect(r.state.cafe.crew.brewmaster.xp).toBe(40);
    const twice = trainCrew(trainCrew(r.state, 3, TUE).state, 3, TUE);
    expect(twice.state.cafe.crew.apprentice.xp).toBe(60); // the goal for level 1
    expect(r.notes[0]).toMatch(/Pip and Mr\. Oren/);
  });
  it('does not train an Expert (they are done growing)', () => {
    let s = onShift(['apprentice']);
    s = { ...s, cafe: { ...s.cafe, crew: { ...s.cafe.crew, apprentice: { ...s.cafe.crew.apprentice, level: 3 } } } };
    expect(trainCrew(s, 3, TUE).trained).toEqual([]);
  });
  it('ignores a roster that has ended', () => {
    const s = onShift(['apprentice']);
    expect(trainCrew(s, 3, new Date(2026, 9, 27, 9)).trained).toEqual([]);
  });
});

describe('the team buff', () => {
  const crewOn = (staff: string[], shift: 'rush' | 'afternoon', over: Record<string, object> = {}) => {
    let s = rosterOn(game({ staff }));
    for (const id of staff) s = ok(assign(s, shift, id, DAY)).state;
    return { ...s, cafe: { ...s.cafe, crew: Object.fromEntries(Object.entries(s.cafe.crew).map(([k, v]) => [k, { ...v, ...(over[k] ?? {}) }])) } } as GameState;
  };
  it('is nothing without a roster or with nobody on shift', () => {
    expect(teamBuff(game(), TUE)).toEqual({ tips: 0, patience: 0, band: 0, speed: 0, pantry: 0 });
    expect(teamBuff(rosterOn(game()), TUE)).toEqual({ tips: 0, patience: 0, band: 0, speed: 0, pantry: 0 });
  });
  it('adds what each skill is good at, for the crew on the current shift only', () => {
    const rush = crewOn(['apprentice'], 'rush'); // speed, level 1, steady, and it is their favorite shift
    const b = teamBuff(rush, TUE);
    expect(b.speed).toBeCloseTo(0.06 * 1.25, 3);
    expect(b.tips).toBeCloseTo(0.03 * 1.25, 2);
    expect(b.band).toBe(0);
    expect(teamBuff(rush, new Date(2026, 9, 20, 14))).toEqual({ tips: 0, patience: 0, band: 0, speed: 0, pantry: 0 }); // the afternoon shift is empty
  });
  it('is bigger for a glowing crew and a Duet', () => {
    const calm = teamBuff(crewOn(['apprentice', 'brewmaster'], 'rush'), TUE);
    const glow = teamBuff(crewOn(['apprentice', 'brewmaster'], 'rush', { apprentice: { cozy: 90 }, brewmaster: { cozy: 90 } }), TUE);
    expect(glow.tips).toBeGreaterThan(calm.tips);
    expect(glow.speed).toBeGreaterThan(calm.speed);
  });
  it('is capped', () => {
    const top = { level: 3, cozy: 100 };
    const maxed = teamBuff(crewOn(['brewmaster', 'petsitter'], 'afternoon', { brewmaster: top, petsitter: top }), new Date(2026, 9, 20, 14));
    expect(maxed.band).toBe(BUFF_CAPS.band); // oren is craft and loves the afternoon
    expect(maxed.tips).toBeLessThanOrEqual(BUFF_CAPS.tips);
    const charm = teamBuff(crewOn(['manager', 'maya'], 'rush', { manager: top, maya: top }), TUE);
    expect(charm.patience).toBeLessThanOrEqual(BUFF_CAPS.patience);
    const quick = teamBuff(crewOn(['apprentice', 'kenji'], 'rush', { apprentice: top, kenji: top }), TUE); // two glowing experts on their favorite shift
    expect(quick.tips).toBe(BUFF_CAPS.tips);
    expect(quick.speed).toBe(BUFF_CAPS.speed);
    const care = teamBuff(crewOn(['petsitter', 'ollie'], 'rush', { petsitter: top, ollie: top }), TUE);
    expect(care.pantry).toBeLessThanOrEqual(BUFF_CAPS.pantry);
    expect(care.pantry).toBeGreaterThan(0);
  });
  it('makes the passive tip pile grow while a matched crew is on shift', () => {
    const matched = crewOn(['apprentice', 'brewmaster'], 'rush');
    const noRoster = { ...matched, cafe: { ...matched.cafe, roster: null } } as GameState;
    expect(tipRate(matched, TUE)).toBeGreaterThan(tipRate(noRoster, TUE));
    expect(tipRate(matched, new Date(2026, 9, 20, 14))).toBe(tipRate(noRoster, new Date(2026, 9, 20, 14))); // nobody is on the afternoon shift
  });
});

describe('perks scale with level, and a level 1 crew changes nothing', () => {
  const lone = (staff: string, over: object = {}) => {
    const s = game({ staff: [staff] });
    return { ...s, cafe: { ...s.cafe, crew: { [staff]: { ...s.cafe.crew[staff], ...over } } } } as GameState;
  };
  const none = game({ staff: [] });
  it('matches the old staff numbers exactly for level 1 crew with no roster', () => {
    expect(tipMult(lone('manager'))).toBeCloseTo(tipMult(none) + 0.2, 6);
    expect(matchaBonus(lone('brewmaster'))).toBeCloseTo(matchaBonus(none) + 0.05, 6);
    expect(crewPerks(lone('petsitter')).petMult).toBe(2);
    expect(crewPerks(lone('apprentice')).pantry).toBe(1);
    // an old save with no crew entries at all behaves the same way
    const old = { ...game(), cafe: { ...newCafe(), staff: ['manager', 'brewmaster'] } } as unknown as GameState;
    expect(tipMult(old)).toBeCloseTo(tipMult(none) + 0.2, 6);
    expect(matchaBonus(old)).toBeCloseTo(matchaBonus(none) + 0.05, 6);
    expect(tipCap(old)).toBe(tipCap({ ...none, cafe: { ...none.cafe, staff: ['manager'] } } as GameState));
  });
  it('grows perks 1.5 times at level 2 and 2 times at level 3', () => {
    expect(tipMult(lone('manager', { level: 2 }))).toBeCloseTo(tipMult(none) + 0.3, 6);
    expect(tipMult(lone('manager', { level: 3 }))).toBeCloseTo(tipMult(none) + 0.4, 6);
    expect(matchaBonus(lone('brewmaster', { level: 3 }))).toBeCloseTo(matchaBonus(none) + 0.1, 6);
    expect(crewPerks(lone('petsitter', { level: 2 })).petMult).toBe(2.5);
    expect(crewPerks(lone('petsitter', { level: 3 })).petMult).toBe(3);
    expect(crewPerks(lone('apprentice', { level: 2 })).pantry).toBe(2);
  });
  it('adds a little for each glowing crew member', () => {
    expect(tipMult(lone('manager', { cozy: 90 }))).toBeCloseTo(tipMult(lone('manager')) + 0.03, 6);
    expect(matchaBonus(lone('brewmaster', { cozy: 90 }))).toBeCloseTo(matchaBonus(lone('brewmaster')) + 0.01, 6);
  });
  it('gives the new islanders their own perks', () => {
    const hana = lone('hana');
    expect(matchaBonus(hana)).toBeCloseTo(matchaBonus(none) + 0.03, 6);
    expect(tipMult(lone('maya'))).toBeCloseTo(tipMult(none) + 0.1, 6);
    expect(tipMult(lone('kenji'))).toBeCloseTo(tipMult(none) + 0.05, 6);
    expect(crewPerks(lone('ollie', { level: 3 })).pantry).toBe(2);
    expect(hiredCrew(hana).map((h) => h.def.id)).toEqual(['hana']);
  });
});

describe('old saves', () => {
  it('gives hired staff a crew entry at level 1 and a cafe with no roster', () => {
    const old = { ...newCafe(), staff: ['manager', 'petsitter'] } as Partial<CafeState> as CafeState;
    delete (old as Partial<CafeState>).crew;
    delete (old as Partial<CafeState>).roster;
    const c = normalizeCafe(old, DAY);
    expect(Object.keys(c.crew)).toEqual(['manager', 'petsitter']);
    expect(c.crew.manager).toMatchObject({ level: 1, xp: 0, cozy: 20, chapter: 1, praised: false, coached: false, since: DAY });
    expect(c.roster).toBeNull();
  });
  it('keeps every number in range and fills a half made roster', () => {
    const c = normalizeCafe({
      ...newCafe(), staff: ['pip', 'apprentice'], crew: { apprentice: { level: 9, xp: 999, cozy: 250, chapter: 7 } as never },
      roster: { startedOn: DAY, slots: { rush: ['apprentice'] } as never, energy: { apprentice: 2 }, paid: undefined as never },
    }, DAY);
    expect(c.crew.apprentice).toMatchObject({ level: 3, xp: 0, cozy: 100, chapter: 3 });
    expect(c.roster?.slots).toEqual({ rush: ['apprentice'], brunch: [], afternoon: [], night: [] });
    expect(c.roster?.paid).toEqual({});
    expect(c.crew.pip).toBeUndefined(); // only known staff ids get progress
  });
});

describe('two phones at once (merge)', () => {
  it('keeps a Praise from one phone and a Coaching from the other for the same crew member', () => {
    const base = game();
    const a = ok(giveFeedback(base, 'tan', 'praise', 'ch1', 'A', DAY)).state;
    const b = ok(giveFeedback(base, 'tan', 'coach', 'gc1', 'B', DAY)).state;
    const merged = merge3(base, a, b);
    expect(merged.cafe.crew.manager).toMatchObject({ praised: true, coached: true, praiseBy: 'A', coachBy: 'B', praiseDay: DAY, coachDay: DAY });
    expect(merged.cafe.crew.manager.xp).toBe(16); // both moments count
    expect(merged.cafe.crew.manager.cozy).toBe(20 + 6 + 4);
    expect(promotionReady({ ...merged.cafe.crew.manager, xp: 60 })).toBe(true);
  });
  it('adds the cozy of a treat and a Mentor moment given at the same time', () => {
    const base = game();
    const a = ok(giveFeedback(base, 'juno', 'praise', 'ca1', 'A', DAY)).state;
    const b = ok(treat(base, 'juno', DAY)).state;
    const merged = merge3(base, a, b);
    expect(merged.cafe.crew.petsitter.cozy).toBe(20 + 6 + 15);
    expect(merged.ingredients).toBe(3);
  });
  it('combines two phones putting different crew on the same shift', () => {
    const base = rosterOn(game());
    const a = ok(assign(base, 'rush', 'pip', DAY)).state;
    const b = ok(assign(base, 'rush', 'tan', DAY)).state;
    const merged = merge3(base, a, b);
    expect([...merged.cafe.roster!.slots.rush].sort()).toEqual(['apprentice', 'manager']);
    expect(merged.cafe.roster!.energy).toMatchObject({ apprentice: 2, manager: 2 });
  });
});

describe('waiting on a promotion', () => {
  it('asks the partner to add their Mentor moment once the bar is full', () => {
    let s = { ...game(), quests: [], checkins: {}, whispers: {}, pendingBox: null, surprises: [], weekly: {} } as unknown as GameState;
    s = { ...s, cafe: { ...s.cafe, crew: { ...s.cafe.crew, manager: { ...s.cafe.crew.manager, xp: 60, praised: true, praiseBy: 'A', praiseDay: DAY } } } };
    const b = waitingFor(s, 'B', DAY).filter((w) => w.kind === 'crew');
    expect(b).toHaveLength(1);
    expect(b[0].id).toBe('crew:manager:1');
    expect(b[0].text).toContain('Mr. Tan');
    expect(waitingFor(s, 'A', DAY).filter((w) => w.kind === 'crew')).toEqual([]); // they gave theirs
    // not when the bar is not full, or when both moments are in
    expect(waitingFor({ ...s, cafe: { ...s.cafe, crew: { ...s.cafe.crew, manager: { ...s.cafe.crew.manager, xp: 30 } } } }, 'B', DAY).filter((w) => w.kind === 'crew')).toEqual([]);
    expect(waitingFor({ ...s, cafe: { ...s.cafe, crew: { ...s.cafe.crew, manager: { ...s.cafe.crew.manager, coached: true, coachBy: 'B' } } } }, 'B', DAY).filter((w) => w.kind === 'crew')).toEqual([]);
  });
});
