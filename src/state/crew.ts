/**
 * The café crew: people you grow together, never perks you buy. Pure rules and content (nothing here touches the store),
 * so every rule is testable. The store wraps these in actions.
 *
 * Ids: each crew member has a crew id (tan, pip, ...) used for art and text, and a staff id, the one saved in
 * `cafe.staff`, `cafe.crew` and the roster. The first four keep the staff ids the game already used
 * (manager, apprentice, brewmaster, petsitter); the four islanders use their own name.
 *
 * Rules in one place: no wages, no penalties, nobody is fired. Cozy only ever goes up. An ignored crew member just
 * stays where they are.
 */
import type { CafeState, CrewMember, CrewSkill, GameState, PlayerId, Roster, ShiftId } from '../types';
import { dateKey } from './questions';

// ---------------------------------------------------------------- the people
export type CrewId = 'tan' | 'pip' | 'oren' | 'juno' | 'hana' | 'kenji' | 'maya' | 'ollie';

export interface CrewDef {
  id: CrewId;
  staff: string; // the id saved in cafe.staff
  name: string;
  role: string;
  skill: CrewSkill;
  favorite: ShiftId;
  accent: string; // their color
  blurb: string;
  arrival: number | null; // popularity needed for an islander to walk in and ask for work (null: hired with coins)
  chapters: [string, string, string]; // chapter n unlocks at level n
  perks: [string, string, string]; // what they add at levels 1, 2 and 3
}

export const CREW: CrewDef[] = [
  {
    id: 'tan', staff: 'manager', name: 'Mr. Tan', role: 'The Cheerful Manager', skill: 'charm', favorite: 'brunch', accent: '#f2c744', arrival: null,
    blurb: 'Round, warm and always humming. Remembers every regular by name.',
    chapters: [
      'Mr. Tan ran a tiny tea stall for years and never once forgot a regular\'s name. He joined because your café felt like the kind of place that remembers people.',
      'On slow mornings Mr. Tan hums old songs while he straightens the chairs. He says a warm hello can fix half a bad day.',
      'Mr. Tan keeps a little notebook of every kind thing guests say. He reads it aloud on Fridays, and everyone leaves a little taller.',
    ],
    perks: ['Café tips build 20% faster and hold more', 'Café tips build 30% faster and hold more', 'Café tips build 40% faster and hold more'],
  },
  {
    id: 'pip', staff: 'apprentice', name: 'Pip', role: 'The Eager Apprentice', skill: 'speed', favorite: 'rush', accent: '#8fd3b6', arrival: null,
    blurb: 'Small, big grin, an apron three sizes too big. Loves everything new.',
    chapters: [
      'Pip showed up on the first day with an apron three sizes too big and a grin to match. Everything is new and Pip loves all of it.',
      'Pip has learned to carry two cups at once and only dropped one. The tea towel on Pip\'s shoulder is now a good luck charm.',
      'Pip now teaches the newest helpers how to fold a napkin into a swan. Being the one who shows others turned out to be the best part.',
    ],
    perks: ['Stocks the pantry with 1 extra ingredient a day', 'Stocks the pantry with 2 extra ingredients a day', 'Stocks the pantry with 2 extra ingredients a day'],
  },
  {
    id: 'oren', staff: 'brewmaster', name: 'Mr. Oren', role: 'The Experienced Brewmaster', skill: 'craft', favorite: 'afternoon', accent: '#4f8a5b', arrival: null,
    blurb: 'Calm, spectacles, a tidy mustache. Matcha cannot be rushed.',
    chapters: [
      'Mr. Oren spent thirty years learning that matcha cannot be rushed. He wanted a place where slow and careful was welcome.',
      'Mr. Oren talks to the whisk like an old friend. He says it hums when the foam is just right.',
      'Mr. Oren finally shared his grandmother\'s way of warming the bowl first. He tells it as a secret, and it is the nicest one you know.',
    ],
    perks: ['+5% coins in Matcha Masters', '+7.5% coins in Matcha Masters', '+10% coins in Matcha Masters'],
  },
  {
    id: 'juno', staff: 'petsitter', name: 'Juno', role: 'The Pet Sitter', skill: 'care', favorite: 'night', accent: '#b9a0e0', arrival: null,
    blurb: 'Gentle, a soft scarf, and a nap buddy for every pet.',
    chapters: [
      'Juno loves anything with whiskers and anything that naps. The pet corner was the reason Juno said yes.',
      'Juno knows every regular pet by name and their favorite spot by the window. The cats say thank you in their own way.',
      'Juno stitched a tiny scarf for every pet in the café. Now the whole corner looks like a very cozy parade.',
    ],
    perks: ['Pet corners earn double tip bonus', 'Pet corners earn two and a half times the tip bonus', 'Pet corners earn triple tip bonus'],
  },
  {
    id: 'hana', staff: 'hana', name: 'Hana', role: 'The Pastry Artist', skill: 'craft', favorite: 'brunch', accent: '#f6b093', arrival: 3,
    blurb: 'A hair bun with a chopstick pin and a flour dusted apron.',
    chapters: [
      'Hana trained as a pastry artist and misses the smell of a warm oven. Your kitchen already smells like home.',
      'Hana hides a tiny star in every tart, just for whoever notices. Someone always does.',
      'Hana drew a pastry map of the island with a dot for every friend. She says every recipe is a way of saying you matter.',
    ],
    perks: ['+3% coins in Matcha Masters', '+4.5% coins in Matcha Masters', '+6% coins in Matcha Masters'],
  },
  {
    id: 'kenji', staff: 'kenji', name: 'Kenji', role: 'The Runner', skill: 'speed', favorite: 'rush', accent: '#7cc0ea', arrival: 5,
    blurb: 'Sporty, a headband and quick sneakers. Races the sunrise.',
    chapters: [
      'Kenji used to run along the pier every morning before dawn. Delivering warm cups feels like the same joy with a better view.',
      'Kenji races the sunrise and never spills a drop. He has a secret route through the café that only he knows.',
      'Kenji now cheers on the other runners at the finish line. He says the best speed is when everyone arrives together.',
    ],
    perks: ['Café tips build 5% faster', 'Café tips build 7.5% faster', 'Café tips build 10% faster'],
  },
  {
    id: 'maya', staff: 'maya', name: 'Maya', role: 'The Storyteller', skill: 'charm', favorite: 'night', accent: '#e58aa0', arrival: 8,
    blurb: 'Curly hair, a tote full of postcards, and a story for every guest.',
    chapters: [
      'Maya collects stories the way other people collect shells. Every guest has one, and she wants to hear them all.',
      'Maya keeps a tote bag full of postcards for the guests who have a long way to go. A small note can travel far.',
      'Maya wrote a little book of the café\'s first year, with a page for each of your guests. The last page is blank on purpose, for what happens next.',
    ],
    perks: ['Café tips build 10% faster', 'Café tips build 15% faster', 'Café tips build 20% faster'],
  },
  {
    id: 'ollie', staff: 'ollie', name: 'Ollie', role: 'The Gentle Helper', skill: 'care', favorite: 'afternoon', accent: '#b4cf9c', arrival: 12,
    blurb: 'Tall, a soft knit hat and round glasses. Notices what you need.',
    chapters: [
      'Ollie is the kind of person who notices when you need a glass of water before you do. The quiet afternoons suit Ollie best.',
      'Ollie keeps a spare sweater in the back room for anyone who feels chilly. It has been borrowed more times than anyone can count.',
      'Ollie planted a tiny herb garden by the window and named every leaf. The café smells like mint and calm because of it.',
    ],
    perks: ['Stocks the pantry with 1 extra ingredient a day', 'Stocks the pantry with 1 extra ingredient a day', 'Stocks the pantry with 2 extra ingredients a day'],
  },
];

export const crewDef = (id: string): CrewDef | undefined => CREW.find((c) => c.id === id || c.staff === id);
export const staffIdOf = (id: string): string | undefined => crewDef(id)?.staff;
export const crewIdOf = (staff: string): CrewId | undefined => crewDef(staff)?.id;
/** The islanders who walk in and ask for work as your reputation (popularity) grows. */
export const ARRIVALS: { id: CrewId; staff: string; popularity: number }[] = CREW.filter((c) => c.arrival !== null).map((c) => ({ id: c.id, staff: c.staff, popularity: c.arrival as number }));

// ---------------------------------------------------------------- levels, cozy and perks
export const MAX_LEVEL = 3;
export const LEVEL_NAMES = ['Apprentice', 'Skilled', 'Expert'] as const;
export const levelName = (level: number) => LEVEL_NAMES[Math.min(MAX_LEVEL, Math.max(1, level)) - 1];
/** Experience needed to leave this level (and a Praise and a Coaching moment). Null at the top level. */
export const levelGoal = (level: number): number | null => (level === 1 ? 60 : level === 2 ? 120 : null);
/** How full the experience bar is, 0 to 1 (1 at the top level). */
export const xpFraction = (m: CrewMember): number => { const g = levelGoal(m.level); return g === null ? 1 : Math.min(1, m.xp / g); };

export type CozyBand = 'steady' | 'warm' | 'glowing';
export const cozyBand = (cozy: number): CozyBand => (cozy > 66 ? 'glowing' : cozy >= 34 ? 'warm' : 'steady');
export const clampCozy = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

/** A perk grows with the level: 1 times, 1.5 times, 2 times. Level 1 equals what staff always gave. */
export const perkScale = (level: number): number => (level >= 3 ? 2 : level === 2 ? 1.5 : 1);

export const newCrewMember = (since = dateKey()): CrewMember => ({
  level: 1, xp: 0, cozy: 20, praised: false, coached: false, praiseDay: '', coachDay: '', treatDay: '', chapter: 1, since,
});

/** The progress of one hired crew member, with sensible defaults for an old save. Undefined if they are not hired. */
export function memberOf(s: GameState, staff: string): CrewMember | undefined {
  if (!s.cafe.staff.includes(staff)) return undefined;
  return s.cafe.crew?.[staff] ?? newCrewMember();
}
export const isHired = (s: GameState, id: string): boolean => { const d = crewDef(id); return !!d && s.cafe.staff.includes(d.staff); };

/** Everyone hired, with their definition and progress, in roster order. */
export function hiredCrew(s: GameState): { def: CrewDef; member: CrewMember }[] {
  const out: { def: CrewDef; member: CrewMember }[] = [];
  for (const def of CREW) {
    const member = memberOf(s, def.staff);
    if (member) out.push({ def, member });
  }
  return out;
}

export interface Perks { tips: number; matcha: number; petMult: number; pantry: number; glowing: number }
/** What the hired crew add all the time (not only on shift). Level 1 with no one glowing matches the old staff numbers exactly. */
export function crewPerks(s: GameState): Perks {
  const p: Perks = { tips: 0, matcha: 0, petMult: 1, pantry: 0, glowing: 0 };
  for (const { def, member } of hiredCrew(s)) {
    const k = perkScale(member.level);
    if (def.id === 'tan') p.tips += 0.2 * k;
    if (def.id === 'kenji') p.tips += 0.05 * k;
    if (def.id === 'maya') p.tips += 0.1 * k;
    if (def.id === 'oren') p.matcha += 0.05 * k;
    if (def.id === 'hana') p.matcha += 0.03 * k;
    if (def.id === 'juno') p.petMult = 1 + k; // level 1 doubles, as before
    if (def.id === 'pip') p.pantry += Math.round(k); // 1, 2, 2
    if (def.id === 'ollie') p.pantry += member.level >= 3 ? 2 : 1; // 1, 1, 2
    if (cozyBand(member.cozy) === 'glowing') p.glowing += 1;
  }
  return p;
}

// ---------------------------------------------------------------- shifts and the roster
export const SHIFTS: { id: ShiftId; label: string; when: string }[] = [
  { id: 'rush', label: 'Weekday Rush', when: 'Weekday mornings' },
  { id: 'brunch', label: 'Weekend Brunch', when: 'Weekend mornings' },
  { id: 'afternoon', label: 'Quiet Afternoon', when: 'Noon to 5 pm' },
  { id: 'night', label: 'Event Night', when: 'Evenings' },
];
export const shiftLabel = (id: ShiftId) => SHIFTS.find((x) => x.id === id)!.label;

/** Which shift is on right now: mornings are the rush (weekdays) or brunch (weekends), 12 to 17 the quiet afternoon, evenings and late nights the night shift. */
export function currentShift(d: Date = new Date()): ShiftId {
  const h = d.getHours();
  if (h >= 17 || h < 6) return 'night';
  if (h >= 12) return 'afternoon';
  const day = d.getDay();
  return day === 0 || day === 6 ? 'brunch' : 'rush';
}

export const ROSTER_DAYS = 7;
export const ENERGY_START = 3;
export const MAX_PER_SLOT = 2;
export const MAX_SLOTS_PER_CREW = 2;

const dayNumber = (key: string) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000); };
export const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);

export const emptySlots = (): Record<ShiftId, string[]> => ({ rush: [], brunch: [], afternoon: [], night: [] });
export const rosterActive = (s: GameState, day = dateKey()): boolean => !!s.cafe.roster && daysBetween(s.cafe.roster.startedOn, day) < ROSTER_DAYS;
export const rosterDaysLeft = (s: GameState, day = dateKey()): number => (s.cafe.roster && rosterActive(s, day) ? Math.max(0, ROSTER_DAYS - Math.max(0, daysBetween(s.cafe.roster.startedOn, day))) : 0);
/** Pips a crew member has left this roster (3 at the start). */
export const energyLeft = (s: GameState, staff: string): number => (s.cafe.roster ? s.cafe.roster.energy[staff] ?? ENERGY_START : 0);

/** Pairs with different strengths make a Duet when they share a shift. */
export const DUET_PAIRS: [CrewSkill, CrewSkill][] = [['craft', 'speed'], ['charm', 'care'], ['speed', 'charm'], ['craft', 'care']];
const isDuet = (a: CrewSkill, b: CrewSkill) => DUET_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export interface ShiftMatch { crew: string[]; favorites: string[]; duet: boolean; pairs: [string, string][] }
/** Who is on a shift, who is working their favorite, and whether two of them make a Duet. All ids are staff ids. */
export function rosterMatch(s: GameState, shift: ShiftId): ShiftMatch {
  const crew = (s.cafe.roster?.slots[shift] ?? []).filter((id) => s.cafe.staff.includes(id));
  const favorites = crew.filter((id) => crewDef(id)?.favorite === shift);
  const pairs: [string, string][] = [];
  for (let i = 0; i < crew.length; i++) for (let j = i + 1; j < crew.length; j++) {
    const a = crewDef(crew[i]), b = crewDef(crew[j]);
    if (a && b && isDuet(a.skill, b.skill)) pairs.push([crew[i], crew[j]]);
  }
  return { crew, favorites, duet: pairs.length > 0, pairs };
}

export interface TeamBuff { tips: number; patience: number; band: number; speed: number; pantry: number }
export const BUFF_CAPS: TeamBuff = { tips: 0.3, patience: 0.25, band: 0.08, speed: 0.3, pantry: 2 };
const NO_BUFF: TeamBuff = { tips: 0, patience: 0, band: 0, speed: 0, pantry: 0 };
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The boost the crew on the current shift give. Only while a roster is running. Skill picks what they add: speed
 * quickens the baristas, craft widens the perfect window, charm makes guests more patient, care stocks the pantry.
 * Everyone adds a little to the tip pile. A glowing crew member, or one on their favorite shift, adds more. All capped.
 */
export function teamBuff(s: GameState, now: Date = new Date()): TeamBuff {
  if (!rosterActive(s, dateKey(now))) return { ...NO_BUFF };
  const shift = currentShift(now);
  const m = rosterMatch(s, shift);
  if (!m.crew.length) return { ...NO_BUFF };
  const b = { ...NO_BUFF };
  let carePoints = 0;
  for (const id of m.crew) {
    const def = crewDef(id), mem = memberOf(s, id);
    if (!def || !mem) continue;
    const band = cozyBand(mem.cozy);
    const mul = (band === 'glowing' ? 1.4 : band === 'warm' ? 1.2 : 1) * (def.favorite === shift ? 1.25 : 1);
    const lv = mem.level;
    b.tips += 0.03 * lv * mul;
    if (def.skill === 'speed') b.speed += 0.06 * lv * mul;
    if (def.skill === 'craft') b.band += 0.02 * lv * mul;
    if (def.skill === 'charm') b.patience += 0.06 * lv * mul;
    if (def.skill === 'care') carePoints += lv * mul;
  }
  if (m.duet) { b.tips += 0.05; b.patience += 0.03; }
  b.pantry = Math.floor(carePoints / 2);
  return {
    tips: r3(Math.min(BUFF_CAPS.tips, b.tips)), patience: r3(Math.min(BUFF_CAPS.patience, b.patience)), band: r3(Math.min(BUFF_CAPS.band, b.band)),
    speed: r3(Math.min(BUFF_CAPS.speed, b.speed)), pantry: Math.min(BUFF_CAPS.pantry, b.pantry),
  };
}

// ---------------------------------------------------------------- mentor feedback
export type FeedbackKind = 'praise' | 'coach';
export interface FeedbackLine { id: string; kind: FeedbackKind; skill: CrewSkill | 'any'; text: string }
/** Kind, specific, soft start up. Coaching is a gentle suggestion, never a criticism. */
export const FEEDBACK: FeedbackLine[] = [
  { id: 'sp1', kind: 'praise', skill: 'speed', text: 'You kept every cup moving and still smiled. Thank you.' },
  { id: 'sp2', kind: 'praise', skill: 'speed', text: 'I loved how quickly you spotted the next order.' },
  { id: 'sp3', kind: 'praise', skill: 'speed', text: 'Thank you for staying calm during the rush.' },
  { id: 'sc1', kind: 'coach', skill: 'speed', text: 'Could we try the oat milk first next time?' },
  { id: 'sc2', kind: 'coach', skill: 'speed', text: 'What if we lined up the cups before the next wave?' },
  { id: 'sc3', kind: 'coach', skill: 'speed', text: 'I wonder if one calm breath before the busiest part would help.' },
  { id: 'cr1', kind: 'praise', skill: 'craft', text: 'That pour was so neat, I noticed every layer.' },
  { id: 'cr2', kind: 'praise', skill: 'craft', text: 'Thank you for taking the extra moment to get it just right.' },
  { id: 'cr3', kind: 'praise', skill: 'craft', text: 'Your latte art made a guest smile today.' },
  { id: 'cc1', kind: 'coach', skill: 'craft', text: 'Could we try warming the cup first next time?' },
  { id: 'cc2', kind: 'coach', skill: 'craft', text: 'I wonder if a slower pour might show off the layers even more.' },
  { id: 'cc3', kind: 'coach', skill: 'craft', text: 'What if we tasted one before sending it out?' },
  { id: 'ch1', kind: 'praise', skill: 'charm', text: 'The way you greeted that guest made their whole day.' },
  { id: 'ch2', kind: 'praise', skill: 'charm', text: 'Thank you for remembering the regulars\' favorites.' },
  { id: 'ch3', kind: 'praise', skill: 'charm', text: 'You have such a kind voice. Guests relax around you.' },
  { id: 'chc1', kind: 'coach', skill: 'charm', text: 'Could we say hello a little sooner when someone walks in?' },
  { id: 'chc2', kind: 'coach', skill: 'charm', text: 'What if we asked how their day is going before taking the order?' },
  { id: 'chc3', kind: 'coach', skill: 'charm', text: 'I wonder if a smile while they wait would make the line feel shorter.' },
  { id: 'ca1', kind: 'praise', skill: 'care', text: 'Thank you for noticing who needed a hand.' },
  { id: 'ca2', kind: 'praise', skill: 'care', text: 'You kept the pantry full before anyone had to ask.' },
  { id: 'ca3', kind: 'praise', skill: 'care', text: 'The pet corner feels so safe because of you.' },
  { id: 'cac1', kind: 'coach', skill: 'care', text: 'Could we check in with the team halfway through the shift?' },
  { id: 'cac2', kind: 'coach', skill: 'care', text: 'What if we took a short breather together after the rush?' },
  { id: 'cac3', kind: 'coach', skill: 'care', text: 'I wonder if labels on the shelves would make things easier to find.' },
  { id: 'gp1', kind: 'praise', skill: 'any', text: 'Thank you for being part of this team.' },
  { id: 'gp2', kind: 'praise', skill: 'any', text: 'I appreciate how much care you put in today.' },
  { id: 'gp3', kind: 'praise', skill: 'any', text: 'It is a joy to work beside you.' },
  { id: 'gc1', kind: 'coach', skill: 'any', text: 'Could we try one small thing differently tomorrow?' },
  { id: 'gc2', kind: 'coach', skill: 'any', text: 'What would make this part feel easier for you?' },
  { id: 'gc3', kind: 'coach', skill: 'any', text: 'Let us pick one thing to practice together.' },
];
/** The lines to offer for one crew member and kind: three that fit their skill, then three general ones. */
export const linesFor = (staff: string, kind: FeedbackKind): FeedbackLine[] => {
  const skill = crewDef(staff)?.skill;
  return [...FEEDBACK.filter((l) => l.kind === kind && l.skill === skill), ...FEEDBACK.filter((l) => l.kind === kind && l.skill === 'any')];
};
export const feedbackLine = (id: string) => FEEDBACK.find((l) => l.id === id);

export const ROSTER_TIPS = [
  'Match people to their favorite shift for a happy sparkle.',
  'Two people with different strengths make a Duet.',
  'A cozy crew gives a bigger team boost.',
  'Energy refills when you start a new roster.',
  'You can move people around any time during the 7 days.',
];

// ---------------------------------------------------------------- actions (pure: state in, state out)
export type Fail = { ok: false; reason: string };
export type Done<T = unknown> = { ok: true; state: GameState } & T;

const patch = (s: GameState, cafe: Partial<CafeState>, rest: Partial<GameState> = {}): GameState => ({ ...s, ...rest, cafe: { ...s.cafe, ...cafe } });
const setMember = (s: GameState, staff: string, m: CrewMember) => ({ ...(s.cafe.crew ?? {}), [staff]: m });

/** Makes sure a hired crew member has a progress entry (and energy in a running roster). Used by hiring and welcoming. */
export function withCrewEntry(s: GameState, staff: string, day = dateKey()): GameState {
  const crew = { ...(s.cafe.crew ?? {}) };
  if (CREW.some((d) => d.staff === staff) && !crew[staff]) crew[staff] = newCrewMember(day);
  let roster = s.cafe.roster;
  if (roster && rosterActive(s, day) && roster.energy[staff] === undefined) roster = { ...roster, energy: { ...roster.energy, [staff]: ENERGY_START } };
  return patch(s, { crew, roster });
}

/** An islander asks for work once your café is popular enough. Free. The first four are hired with coins instead. */
export function welcome(s: GameState, id: string, day = dateKey()): Done<{ def: CrewDef }> | Fail {
  const def = crewDef(id);
  if (!def) return { ok: false, reason: 'unknown' };
  if (def.arrival === null) return { ok: false, reason: 'hire with coins' };
  if (s.cafe.staff.includes(def.staff)) return { ok: false, reason: 'already hired' };
  if (s.cafe.popularity < def.arrival) return { ok: false, reason: 'not popular enough yet' };
  const hired = patch(s, { staff: [...s.cafe.staff, def.staff] });
  return { ok: true, state: withCrewEntry(hired, def.staff, day), def };
}

/** Whether an islander is at the door right now (popular enough and not yet hired). */
export const arrivalWaiting = (s: GameState): CrewDef[] => CREW.filter((d) => d.arrival !== null && !s.cafe.staff.includes(d.staff) && s.cafe.popularity >= (d.arrival as number));

export interface FeedbackDone { crew: CrewDef; kind: FeedbackKind; xp: number; cozy: number; specific: boolean; ready: boolean }
/** A Mentor moment: one Praise and one Coaching a day for each crew member. Specific praise warms them more. */
export function giveFeedback(s: GameState, id: string, kind: FeedbackKind, lineId: string, by: PlayerId, day = dateKey()): Done<FeedbackDone> | Fail {
  const def = crewDef(id), mem = def && memberOf(s, def.staff);
  if (!def || !mem) return { ok: false, reason: 'not hired' };
  const line = feedbackLine(lineId);
  if (!line || line.kind !== kind) return { ok: false, reason: 'unknown line' };
  if ((kind === 'praise' ? mem.praiseDay : mem.coachDay) === day) return { ok: false, reason: 'already today' };
  const specific = line.skill === def.skill;
  const cozyGain = kind === 'praise' ? (specific ? 6 : 3) : 4;
  const goal = levelGoal(mem.level);
  const xp = goal === null ? 0 : Math.min(8, goal - mem.xp);
  const next: CrewMember = {
    ...mem,
    xp: goal === null ? 0 : mem.xp + xp,
    cozy: clampCozy(mem.cozy + cozyGain),
    ...(kind === 'praise' ? { praised: true, praiseBy: by, praiseDay: day } : { coached: true, coachBy: by, coachDay: day }),
  };
  const state = patch(s, { crew: setMember(s, def.staff, next) });
  return { ok: true, state, crew: def, kind, xp, cozy: cozyGain, specific, ready: promotionReady(next) };
}

/** Needs the bar full and one Praise and one Coaching moment, because a good team has both. */
export const promotionReady = (m: CrewMember): boolean => { const g = levelGoal(m.level); return g !== null && m.xp >= g && m.praised && m.coached; };
/** What still stands between a crew member and a promotion, for the UI to say kindly. */
export function promotionNeeds(m: CrewMember): { xp: boolean; praise: boolean; coach: boolean } {
  const g = levelGoal(m.level);
  return g === null ? { xp: false, praise: false, coach: false } : { xp: m.xp < g, praise: !m.praised, coach: !m.coached };
}
export const PROMOTION_SHELLS = 2;

export function promote(s: GameState, id: string): Done<{ crew: CrewDef; level: number; shells: number }> | Fail {
  const def = crewDef(id), mem = def && memberOf(s, def.staff);
  if (!def || !mem) return { ok: false, reason: 'not hired' };
  if (mem.level >= MAX_LEVEL) return { ok: false, reason: 'already expert' };
  if (!promotionReady(mem)) return { ok: false, reason: 'not ready' };
  const level = mem.level + 1;
  const next: CrewMember = { ...mem, level, xp: 0, praised: false, coached: false, praiseBy: undefined, coachBy: undefined, chapter: level };
  return { ok: true, state: patch(s, { crew: setMember(s, def.staff, next) }, { shells: s.shells + PROMOTION_SHELLS }), crew: def, level, shells: PROMOTION_SHELLS };
}

export const TREAT_COST = 2;
export const TREAT_COZY = 15;
/** A treat from the pantry: two ingredients, once a day for each crew member, and they feel a little more at home. */
export function treat(s: GameState, id: string, day = dateKey()): Done<{ crew: CrewDef }> | Fail {
  const def = crewDef(id), mem = def && memberOf(s, def.staff);
  if (!def || !mem) return { ok: false, reason: 'not hired' };
  if (mem.treatDay === day) return { ok: false, reason: 'already today' };
  if (s.ingredients < TREAT_COST) return { ok: false, reason: 'not enough ingredients' };
  return { ok: true, state: patch(s, { crew: setMember(s, def.staff, { ...mem, cozy: clampCozy(mem.cozy + TREAT_COZY), treatDay: day }) }, { ingredients: s.ingredients - TREAT_COST }), crew: def };
}

/** Starts a 7 day roster on any day, once there is none or the last one has ended. Everyone's energy refills. */
export function startRoster(s: GameState, day = dateKey()): Done | Fail {
  if (rosterActive(s, day)) return { ok: false, reason: 'a roster is already running' };
  const energy: Record<string, number> = {};
  for (const id of s.cafe.staff) if (crewDef(id)) energy[id] = ENERGY_START;
  const roster: Roster = { startedOn: day, slots: emptySlots(), energy, paid: {} };
  return { ok: true, state: patch(s, { roster }) };
}

/**
 * Puts a crew member on a shift. The first time they take a particular shift in this roster it costs one of their
 * three pips; taking it again after a swap is free. At most 2 people per shift and 2 shifts per person.
 */
export function assign(s: GameState, shift: ShiftId, id: string, day = dateKey()): Done | Fail {
  const def = crewDef(id);
  const roster = s.cafe.roster;
  if (!roster) return { ok: false, reason: 'no roster' };
  if (!rosterActive(s, day)) return { ok: false, reason: 'roster ended' };
  if (!def || !s.cafe.staff.includes(def.staff)) return { ok: false, reason: 'not hired' };
  if (!SHIFTS.some((x) => x.id === shift)) return { ok: false, reason: 'unknown shift' };
  const slot = roster.slots[shift] ?? [];
  if (slot.includes(def.staff)) return { ok: false, reason: 'already there' };
  if (slot.length >= MAX_PER_SLOT) return { ok: false, reason: 'slot full' };
  const inSlots = (Object.keys(roster.slots) as ShiftId[]).filter((k) => roster.slots[k].includes(def.staff)).length;
  if (inSlots >= MAX_SLOTS_PER_CREW) return { ok: false, reason: 'too many shifts' };
  const paid = roster.paid?.[def.staff] ?? [];
  let energy = roster.energy;
  let paidAll = roster.paid ?? {};
  if (!paid.includes(shift)) {
    const left = roster.energy[def.staff] ?? ENERGY_START;
    if (left <= 0) return { ok: false, reason: 'no energy left' };
    energy = { ...energy, [def.staff]: left - 1 };
    paidAll = { ...paidAll, [def.staff]: [...paid, shift] };
  }
  return { ok: true, state: patch(s, { roster: { ...roster, slots: { ...roster.slots, [shift]: [...slot, def.staff] }, energy, paid: paidAll } }) };
}

export function unassign(s: GameState, shift: ShiftId, id: string): Done | Fail {
  const def = crewDef(id), roster = s.cafe.roster;
  if (!roster || !def) return { ok: false, reason: 'no roster' };
  const slot = roster.slots[shift] ?? [];
  if (!slot.includes(def.staff)) return { ok: false, reason: 'not on that shift' };
  return { ok: true, state: patch(s, { roster: { ...roster, slots: { ...roster.slots, [shift]: slot.filter((x) => x !== def.staff) } } }) };
}

export const TRAIN_XP: Record<number, number> = { 3: 30, 2: 20, 1: 10 };
export const DUET_XP = 10;
/**
 * Playing Matcha Masters trains the crew on the current shift of a running roster: 3 stars 30, 2 stars 20, 1 star 10
 * experience each, and 10 more when two of them make a Duet. With no roster, or no one on shift, nobody trains.
 */
export function trainCrew(s: GameState, stars: number, now: Date = new Date()): { state: GameState; notes: string[]; trained: string[]; xp: number } {
  const none = { state: s, notes: [] as string[], trained: [] as string[], xp: 0 };
  const star = Math.min(3, Math.floor(stars));
  if (star < 1 || !rosterActive(s, dateKey(now))) return none;
  const m = rosterMatch(s, currentShift(now));
  if (!m.crew.length) return none;
  const gain = TRAIN_XP[star] + (m.duet ? DUET_XP : 0);
  let crew = { ...(s.cafe.crew ?? {}) };
  const trained: string[] = [];
  for (const id of m.crew) {
    const mem = memberOf(s, id);
    const goal = mem ? levelGoal(mem.level) : null;
    if (!mem || goal === null) continue;
    crew = { ...crew, [id]: { ...mem, xp: Math.min(goal, mem.xp + gain) } };
    trained.push(id);
  }
  if (!trained.length) return none;
  const names = trained.map((id) => crewDef(id)?.name ?? id);
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return { state: patch(s, { crew }), notes: [`${who} learned from the shift: +${gain} crew experience${m.duet ? ' (a Duet!)' : ''}.`], trained, xp: gain };
}

// ---------------------------------------------------------------- old saves
/** Fills in the crew data an old save does not have and keeps every number in range. Used when a game loads or arrives from a partner. */
export function normalizeCafe(c: CafeState, day = dateKey()): CafeState {
  const crew: Record<string, CrewMember> = {};
  for (const id of c.staff ?? []) {
    if (!CREW.some((d) => d.staff === id)) continue; // only the staff ids we know get progress
    const have = c.crew?.[id];
    const base = newCrewMember(day);
    const level = Math.min(MAX_LEVEL, Math.max(1, Math.round(have?.level ?? 1)));
    const goal = levelGoal(level);
    crew[id] = {
      ...base, ...(have ?? {}), level, chapter: Math.min(level, Math.max(1, have?.chapter ?? level)),
      xp: goal === null ? 0 : Math.max(0, Math.min(goal, Math.round(have?.xp ?? 0))), cozy: clampCozy(have?.cozy ?? base.cozy),
    };
  }
  const r = c.roster;
  const roster: Roster | null = r ? { startedOn: r.startedOn, slots: { ...emptySlots(), ...(r.slots ?? {}) }, energy: { ...(r.energy ?? {}) }, paid: { ...(r.paid ?? {}) } } : null;
  return { ...c, crew, roster };
}
