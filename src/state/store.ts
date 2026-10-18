import { useSyncExternalStore } from 'react';
import type { CafeTheme, CompanionId, GameState, Memory, MessageKind, Moment, PlayerId, Quest, StartingPath } from '../types';
import { availableIn, itemOf } from './catalog';
import { canPlace, canPlacePreset, freeShoreTile, ISLAND_STEPS, presetOrder } from './placement';
import { cafeView, ESPRESSO_RECIPE, eventOf, EVENT_TEAM, MAX_ORDERS, newOrder, eventReady, eventToday, freePullToday, GACHA, GACHA_COST, matchaBonus, newCafe, nextCafeStep, sitToday, SIGNS, STAFF, styleOf, tipsPending, themeOf, type EventId } from './cafe';
import { setGridSize } from '../game/iso';
import { presetOf } from './presets';
import { getTheme } from './season';
import { defaultWardrobe, outfitOf } from './wardrobe';
import { BOX_PRICE_GEMS, rollReward } from './blindbox';
import { dateKey, journeyFor, prevKey, streakRun, tomorrowKey } from './questions';
import { FREEZES_PER_MONTH, LADDER, hasActivity, isSunday, lastWeekKey, mondayOf, nextWeekKey, RECAP_REWARD, recapOf, rungPrize, SURPRISE_COST, SURPRISE_DELAY_MS, SURPRISE_PAY, WEEKLY_BANNER_MS, WEEKLY_REWARD } from './weekly';
import type { MGResult } from './minigames';
import { clampReward, DAILY_MG_COINS, DAILY_QUEST_COINS, DAILY_TOKENS, DAILY_WELL_TOSSES, DUO_DAY_COINS, DUO_DAY_SHELLS, emptyDay, MG_COINS_PER_GAME, OVER_CAP_SHARE, START_COINS } from './economy';
import { BANNER_MS, BLUEPRINTS, BOTTLE_SHELLS, FINANCE_VAULT_SHARE, FOCUS_COINS, FOCUS_MS, otherP, quadrantOf, SYNERGY_MS, SYNERGY_MULT, TEA_COINS, VITALITY_MS } from './quadrants';
import { adventureFor, BID_WINDOW_MS, LOVE_QUESTIONS, loveSet, weekKey, whisperQuestion, type BidKind, type WhisperTier } from './together';

const STATE_KEY = 'olw:state:v1';
const ME_KEY = 'olw:me';

const initial = (): GameState => ({
  startingPath: null,
  coins: START_COINS,
  gems: 50,
  xp: 0,
  names: { A: 'James', B: 'Rachel' },
  quests: [],
  inventory: [
    { id: 'floor_wood', count: 4 },
    { id: 'wall_cream', count: 4 },
  ],
  placed: [],
  memories: [],
  avatars: { A: { x: 1, y: 1 }, B: { x: 2, y: 1 } },
  wardrobe: defaultWardrobe(),
  blindBoxes: 1, // a welcome box to open together
  pendingBox: null,
  lastReveal: null,
  checkins: {},
  approvedCount: 0,
  looks: { A: 'cream', B: 'cream' },
  messages: [],
  arcadeTokens: 3,
  eventTokens: 0,
  driftwood: 0,
  fauna: {},
  figures: {},
  freeFigures: [],
  recipes: [],
  mgBest: {},
  shells: 0,
  whispers: {},
  glowUntil: 0,
  auraUntil: 0,
  bid: null,
  bidStats: { sent: 0, turned: 0 },
  adventures: {},
  lovemap: {},
  gratitude: [],
  notesOpened: 0,
  islandSize: 10,
  starterRemoved: false,
  ingredients: 2, // a welcome batch for the café
  townAvatars: { A: { x: 2, y: 24 }, B: { x: 3, y: 24 } },
  healthDays: {},
  vitalityUntil: { A: 0, B: 0 },
  synergyUntil: 0,
  focus: {},
  library: [],
  vault: { coins: 0, built: [] },
  bottleCredits: { A: 0, B: 0 },
  bottles: [],
  banners: [],
  celebration: null,
  today: emptyDay(''),
  customPrompts: {},
  questDays: {},
  weekly: {},
  surprises: [],
  moment: null,
  cafe: newCafe(),
  ladder: { claimed: [], frozen: [] },
  recapClaimed: [],
});

function load(): GameState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return withDefaults(JSON.parse(raw));
    // migrate the Build 1 starting path key
    const legacy = localStorage.getItem('olw:startingPath');
    if (legacy === 'rv' || legacy === 'shop' || legacy === 'home') return { ...initial(), startingPath: legacy };
  } catch {
    /* ignore */
  }
  return initial();
}

function withDefaults(saved: Partial<GameState>): GameState {
  const base = initial();
  const townAvatars = { ...base.townAvatars, ...(saved.townAvatars ?? {}) };
  const w = saved.wardrobe;
  return {
    ...base,
    ...saved,
    townAvatars,
    looks: { ...base.looks, ...(saved.looks ?? {}) },
    vitalityUntil: { ...base.vitalityUntil, ...(saved.vitalityUntil ?? {}) },
    bottleCredits: { ...base.bottleCredits, ...(saved.bottleCredits ?? {}) },
    vault: { ...base.vault, ...(saved.vault ?? {}) },
    ladder: { ...base.ladder, ...(saved.ladder ?? {}) },
    cafe: { ...base.cafe, ...(saved.cafe ?? {}), orders: saved.cafe?.orders ?? [], avatars: { ...base.cafe.avatars, ...(saved.cafe?.avatars ?? {}) }, themes: [...new Set([...base.cafe.themes, ...(saved.cafe?.themes ?? [])])], placed: saved.cafe?.placed ?? [] },
    wardrobe: {
      ...base.wardrobe,
      ...w,
      owned: [...new Set([...base.wardrobe.owned, ...(w?.owned ?? [])])],
      equipped: { ...base.wardrobe.equipped, ...(w?.equipped ?? {}) },
    },
  };
}

let state: GameState = load();
setGridSize(state.islandSize);
let me: PlayerId = (() => {
  try {
    return localStorage.getItem(ME_KEY) === 'B' ? 'B' : 'A';
  } catch {
    return 'A';
  }
})();
const listeners = new Set<() => void>();
const meListeners = new Set<() => void>();
const stateListeners = new Set<(s: GameState, local: boolean) => void>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: GameState) {
  state = next;
  setGridSize(state.islandSize);
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  emit();
  stateListeners.forEach((l) => l(state, true));
}

/** Used by the sync layer to apply a remote snapshot without echoing it back. */
export function applyRemote(next: GameState) {
  const merged = withDefaults(next);
  // never lose a message because two phones saved at the same moment: union by id
  const byId = new Map(merged.messages.map((m) => [m.id, m]));
  for (const m of state.messages) if (!byId.has(m.id)) byId.set(m.id, m);
  merged.messages = [...byId.values()].sort((a, b) => a.ts - b.ts);
  state = merged;
  setGridSize(state.islandSize);
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  emit();
  stateListeners.forEach((l) => l(state, false));
}

export const getState = () => state;
export const onStateChange = (l: (s: GameState, local: boolean) => void) => {
  stateListeners.add(l);
  return () => {
    stateListeners.delete(l);
  };
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useGameState = () => useSyncExternalStore(subscribe, () => state);
export const useMe = () => useSyncExternalStore(subscribe, () => me);

export const getMe = () => me;
export const onMeChange = (l: () => void) => {
  meListeners.add(l);
  return () => {
    meListeners.delete(l);
  };
};

export function setMe(p: PlayerId) {
  me = p;
  meListeners.forEach((l) => l());
  try {
    localStorage.setItem(ME_KEY, p);
  } catch {
    /* ignore */
  }
  emit();
}

const other = (p: PlayerId): PlayerId => (p === 'A' ? 'B' : 'A');
const uid = () => Math.random().toString(36).slice(2, 10);
const MOMENT_ART: Record<Moment['kind'], string> = { goal: 'cz_highfive', streak: 'cz_highfive', grace: 'cz_waiting', surprise: 'cz_moment_3', recap: 'cz_friends', cafe: 'cz_toast' };
const moment = (kind: Moment['kind'], title: string, text: string, icon: string, art = MOMENT_ART[kind]): Moment => ({ id: uid(), kind, title, text, icon, ts: Date.now(), art });

/** Adds to the message log. Call just before the commit that saves the action. */
function addMsg(kind: MessageKind, from: PlayerId, text: string, ctx?: string, ref?: string) {
  if (!text.trim()) return;
  state = { ...state, messages: [...state.messages, { id: uid(), from, kind, text: text.trim(), ctx, ref, ts: Date.now() }] };
}

function patchQuest(id: string, fn: (q: Quest) => Quest) {
  commit({ ...state, quests: state.quests.map((q) => (q.id === id ? fn(q) : q)) });
}

// ---------- actions ----------

export function setLook(p: PlayerId, look: 'cream' | 'dark') {
  commit({ ...state, looks: { ...state.looks, [p]: look } });
}

export function setStartingPath(p: StartingPath) {
  commit({ ...state, startingPath: p, starterRemoved: false });
}

/**
 * Puts the game back to its original starting state. If you are linked to your partner, the reset syncs to them too.
 * Your names, room code and who you are playing as are kept so you stay connected.
 */
export function resetEverything() {
  const fresh = initial();
  commit({ ...fresh, names: state.names });
  try {
    for (const k of ['olw:seasonChoice', 'olw:growthPreview', 'olw:seenReveal', 'olw:startingPath']) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Picks the starter structure back up into the bag, leaving a blank build area. */
export function removeStarter() {
  if (!state.startingPath || state.starterRemoved) return;
  let inventory = state.inventory;
  if (state.startingPath === 'home') inventory = addToInventory(addToInventory(inventory, 'floor_wood', 1), 'wall_cream', 1);
  else inventory = addToInventory(inventory, state.startingPath === 'rv' ? 'lm_rv_awning' : 'lm_cafe', 1);
  commit({ ...state, starterRemoved: true, inventory });
}

/** The next island size and its price, or null at the maximum. */
export const nextExpansion = () => ISLAND_STEPS.find((s) => s.size > state.islandSize) ?? null;

export function expandIsland(): boolean {
  const step = nextExpansion();
  if (!step || state.coins < step.coins) return false;
  commit({ ...state, coins: state.coins - step.coins, islandSize: step.size });
  return true;
}

export function setTownPos(p: PlayerId, x: number, y: number) {
  const cur = state.townAvatars[p];
  if (cur.x === x && cur.y === y) return;
  commit({ ...state, townAvatars: { ...state.townAvatars, [p]: { x, y } } });
}

/** Café brewing: spends ingredients and adds a craftable treat to your bag. */
export function brewDrink(itemId: string, cost: number): boolean {
  if (state.ingredients < cost || !itemOf(itemId)) return false;
  commit({ ...state, ingredients: state.ingredients - cost, inventory: addToInventory(state.inventory, itemId, 1) });
  return true;
}

export function setNames(names: Record<PlayerId, string>) {
  commit({ ...state, names });
}

/**
 * Adds a quest. The reward is limited by who sets it: a goal you give yourself pays less than one your partner gives you,
 * so you cannot simply write yourself a huge reward. `trusted` is for built in templates and town ideas, which are already balanced.
 */
export function createQuest(input: Omit<Quest, 'id' | 'status' | 'createdAt'>, opts: { trusted?: boolean } = {}) {
  const reward = opts.trusted ? input.reward : clampReward(input.reward, { milestone: input.milestone, self: input.assignedTo === me });
  commit({
    ...state,
    quests: [{ ...input, reward, id: uid(), status: 'IN_PROGRESS', createdAt: Date.now() }, ...state.quests],
  });
}

/** Today's running totals, reset when the date changes. */
function dayStats(now = Date.now()) {
  const day = dateKey(new Date(now));
  return state.today.day === day ? state.today : emptyDay(day);
}
export const todayStats = () => dayStats();

export function deleteQuest(id: string) {
  commit({ ...state, quests: state.quests.filter((q) => q.id !== id) });
}

/** Assignee says "I did it". Waits for the partner. */
export function submitQuest(id: string, evidence: { note?: string; photo?: string }) {
  const qq = state.quests.find((x) => x.id === id);
  if (qq && (qq.status === 'IN_PROGRESS' || qq.status === 'REJECTED') && evidence.note?.trim()) addMsg('evidence', qq.assignedTo, evidence.note, qq.title, id);
  patchQuest(id, (q) =>
    q.status === 'IN_PROGRESS' || q.status === 'REJECTED'
      ? {
          ...q,
          status: 'PENDING_VERIFICATION',
          completedAt: Date.now(),
          evidenceNote: evidence.note?.trim() || undefined,
          evidencePhoto: evidence.photo,
          reviewNote: undefined,
        }
      : q,
  );
}

/** Only the partner (not the assignee) may approve. Pays out the reward exactly once. */
export function approveQuest(id: string, reviewer: PlayerId) {
  const q = state.quests.find((x) => x.id === id);
  if (!q || q.status !== 'PENDING_VERIFICATION' || q.assignedTo === reviewer) return;
  const approved: Quest = { ...q, status: 'APPROVED', reviewedAt: Date.now() };
  // Recurring habits come back as a fresh quest so they can be done again.
  const quests = state.quests.map((x) => (x.id === id ? approved : x));
  if (q.recurring) {
    quests.unshift({
      ...q,
      id: uid(),
      status: 'IN_PROGRESS',
      createdAt: Date.now(),
      notBefore: startOfTomorrow(), // a habit can be approved once a day
      completedAt: undefined,
      evidenceNote: undefined,
      evidencePhoto: undefined,
      reviewNote: undefined,
      reviewedAt: undefined,
    });
  }
  const quad = quadrantOf(q);
  const now = Date.now();
  const today = dateKey();
  const mult = coinMultiplier(now); // Synergy Aura, decided before this goal can start a new one
  const ds = dayStats(now);
  const full = Math.max(0, DAILY_QUEST_COINS - ds.questCoins); // coins still paid in full today
  const wanted = Math.round(q.reward.coins * mult);
  const coins = wanted <= full ? wanted : full + Math.round((wanted - full) * OVER_CAP_SHARE);
  const gotToken = ds.tokens < DAILY_TOKENS;
  const duoDone = [...new Set([...(state.questDays[today] ?? []), q.assignedTo])];
  const duoBonus = duoDone.length === 2 && !ds.duoPaid;
  let next: GameState = {
    ...state,
    quests,
    gems: state.gems + q.reward.gems,
    xp: state.xp + coins,
    inventory: q.reward.itemId ? addToInventory(state.inventory, q.reward.itemId, 1) : state.inventory,
    // quest boxes, plus a bonus box for every 5th approved quest (a milestone streak)
    blindBoxes: state.blindBoxes + (q.reward.blindBoxes ?? 0) + ((state.approvedCount + 1) % 5 === 0 ? 1 : 0),
    approvedCount: state.approvedCount + 1,
    arcadeTokens: state.arcadeTokens + (gotToken ? 1 : 0), // approved quests earn arcade tokens, a few a day
    ingredients: state.ingredients + (quad === 'health' || quad === 'learning' ? 2 : 0), // healthy habits stock the café
    celebration: { id: uid(), quadrant: quad, by: q.assignedTo, ts: now },
  };
  next.coins = state.coins + coins + (duoBonus ? DUO_DAY_COINS : 0);
  next.shells = state.shells + (duoBonus ? DUO_DAY_SHELLS : 0);
  next.questDays = { ...state.questDays, [today]: duoDone };
  next.today = { ...ds, questCoins: ds.questCoins + coins, quests: ds.quests + 1, tokens: ds.tokens + (gotToken ? 1 : 0), duoPaid: ds.duoPaid || duoBonus };

  if (quad === 'health') {
    // Pebble's Energy Sync: a Vitality Glow for both, and a Synergy Aura once you have both moved today
    const done = [...new Set([...(state.healthDays[today] ?? []), q.assignedTo])];
    next.healthDays = { ...state.healthDays, [today]: done };
    next.vitalityUntil = { A: now + VITALITY_MS, B: now + VITALITY_MS };
    if (done.length === 2 && now >= state.synergyUntil) next.synergyUntil = now + SYNERGY_MS;
  } else if (quad === 'learning' && q.evidenceNote) {
    // Wisdom Bookshelf: every approved takeaway becomes a book or scroll
    const n = state.library.length;
    next.library = [...state.library, { id: uid(), from: q.assignedTo, title: q.title, text: q.evidenceNote, ts: now, kind: n % 3 === 2 ? 'scroll' : 'book', hue: (n * 47) % 360 }];
  } else if (quad === 'finance') {
    // Dream Vault: a chunk of what you saved goes straight into the shared vault
    const chunk = Math.round(coins * FINANCE_VAULT_SHARE);
    next.coins -= chunk;
    next.vault = { ...state.vault, coins: state.vault.coins + chunk };
  } else if (quad === 'romance') {
    next.bottleCredits = { ...state.bottleCredits, [q.assignedTo]: state.bottleCredits[q.assignedTo] + 1 };
  } else if (quad === 'social') {
    next.banners = [...state.banners.filter((b) => b.until > now), { id: uid(), by: q.assignedTo, title: q.title, ts: now, until: now + BANNER_MS }];
  }
  commit(next);
}

const startOfTomorrow = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
};

export function requestEdit(id: string, reviewer: PlayerId, note: string) {
  const q = state.quests.find((x) => x.id === id);
  if (!q || q.status !== 'PENDING_VERIFICATION' || q.assignedTo === reviewer) return;
  addMsg('review', reviewer, note.trim() || 'Please add more detail.', q.title, id);
  patchQuest(id, (x) => ({ ...x, status: 'REJECTED', reviewNote: note.trim() || 'Please add more detail.', reviewedAt: Date.now() }));
}

// ---------- inventory, shop, placement ----------

function addToInventory(inv: GameState['inventory'], id: string, n: number) {
  const has = inv.some((i) => i.id === id);
  return has ? inv.map((i) => (i.id === id ? { ...i, count: i.count + n } : i)) : [...inv, { id, count: n }];
}

export function buyItem(itemId: string): boolean {
  const item = itemOf(itemId);
  if (!item || state.coins < item.price.coins || state.gems < item.price.gems) return false;
  if (!availableIn(item, getTheme())) return false; // limited-time items only sell in season
  commit({
    ...state,
    coins: state.coins - item.price.coins,
    gems: state.gems - item.price.gems,
    inventory: addToInventory(state.inventory, itemId, 1),
  });
  return true;
}

export type Space = 'island' | 'cafe';

export function placeObject(itemId: string, x: number, y: number, rotation: 0 | 90 | 180 | 270, extraBlocked: { x: number; y: number }[] = [], space: Space = 'island'): boolean {
  const cafe = space === 'cafe';
  if (!canPlace(cafe ? cafeView(state) : state, itemId, x, y, rotation, extraBlocked, false, cafe).ok) return false;
  const piece = { id: uid(), itemId, tileX: x, tileY: y, rotation };
  const inventory = addToInventory(state.inventory, itemId, -1);
  if (!cafe) {
    commit({ ...state, inventory, placed: [...state.placed, piece] });
    return true;
  }
  // the espresso station teaches the café a new recipe the first time it is set up
  const recipe = itemOf(itemId)?.effect === 'espresso' && !state.recipes.includes(ESPRESSO_RECIPE);
  commit({
    ...state,
    inventory,
    cafe: { ...state.cafe, placed: [...state.cafe.placed, piece] },
    recipes: recipe ? [...state.recipes, ESPRESSO_RECIPE] : state.recipes,
    moment: recipe ? moment('cafe', 'A new recipe!', `Your espresso station taught the café "${ESPRESSO_RECIPE}". Find it in the Arcade recipe book.`, '☕') : state.moment,
  });
  return true;
}

/** Buys a ready made room and lays every piece of it in one go. */
export function buyPreset(presetId: string, x: number, y: number, extraBlocked: { x: number; y: number }[] = []): boolean {
  const preset = presetOf(presetId);
  if (!preset || state.coins < preset.price.coins || state.gems < preset.price.gems) return false;
  if (preset.seasons && !preset.seasons.includes(getTheme())) return false;
  if (!canPlacePreset(state, preset, x, y, extraBlocked).ok) return false;
  const added = presetOrder(preset).map((pi) => ({ id: uid(), itemId: pi.itemId, tileX: x + pi.dx, tileY: y + pi.dy, rotation: pi.rotation ?? 0 }));
  commit({
    ...state,
    coins: state.coins - preset.price.coins,
    gems: state.gems - preset.price.gems,
    placed: [...state.placed, ...added],
  });
  return true;
}

/** Picks an object back up into the bag. */
export function removeObject(id: string, space: Space = 'island') {
  const cafe = space === 'cafe';
  const list = cafe ? state.cafe.placed : state.placed;
  const o = list.find((p) => p.id === id);
  if (!o) return;
  // taking down a wall also takes down whatever hangs on it
  const attached =
    itemOf(o.itemId)?.layer === 'wall'
      ? list.filter((p) => p.id !== id && p.tileX === o.tileX && p.tileY === o.tileY && itemOf(p.itemId)?.layer === 'walldecor')
      : [];
  const gone = new Set([id, ...attached.map((a) => a.id)]);
  let inventory = state.inventory;
  for (const r of [o, ...attached]) inventory = addToInventory(inventory, r.itemId, 1);
  const kept = list.filter((p) => !gone.has(p.id));
  commit(cafe ? { ...state, cafe: { ...state.cafe, placed: kept }, inventory } : { ...state, placed: kept, inventory });
}

// ---------- wardrobe ----------

export function buyOutfit(id: string): boolean {
  const o = outfitOf(id);
  if (!o || state.wardrobe.owned.includes(id) || state.coins < o.price.coins || state.gems < o.price.gems) return false;
  commit({
    ...state,
    coins: state.coins - o.price.coins,
    gems: state.gems - o.price.gems,
    wardrobe: { ...state.wardrobe, owned: [...state.wardrobe.owned, id] },
  });
  return true;
}

export function wearOutfit(id: string) {
  const o = outfitOf(id);
  if (!o || !state.wardrobe.owned.includes(id)) return;
  commit({ ...state, wardrobe: { ...state.wardrobe, equipped: { ...state.wardrobe.equipped, [o.companion]: id } } });
}

export function setInvited(cid: CompanionId, invited: boolean) {
  const rest = state.wardrobe.invited.filter((c) => c !== cid);
  commit({ ...state, wardrobe: { ...state.wardrobe, invited: invited ? [...rest, cid] : rest } });
}

// ---------- blind boxes: opened together ----------

export function buyBlindBox(): boolean {
  if (state.gems < BOX_PRICE_GEMS) return false;
  commit({ ...state, gems: state.gems - BOX_PRICE_GEMS, blindBoxes: state.blindBoxes + 1 });
  return true;
}

/** One partner asks to open a box. It stays sealed until the other joins. */
export function startOpenBox(by: PlayerId) {
  if (state.blindBoxes < 1) return;
  if (state.pendingBox) {
    if (state.pendingBox.by !== by) confirmOpenBox(by); // both tapped start: the second tap joins
    return;
  }
  commit({ ...state, pendingBox: { by } });
}

export function cancelOpenBox() {
  if (state.pendingBox) commit({ ...state, pendingBox: null });
}

/** The other partner joins. Rolls the reward once and stores it so both phones show the same reveal. */
export function confirmOpenBox(by: PlayerId) {
  if (!state.pendingBox || state.pendingBox.by === by || state.blindBoxes < 1) return;
  const reward = rollReward(getTheme(), state.wardrobe.owned);
  let { coins, gems, inventory, wardrobe } = state;
  if (reward.kind === 'coins') coins += reward.amount ?? 0;
  else if (reward.kind === 'gems') gems += reward.amount ?? 0;
  else if (reward.kind === 'item' && reward.refId) inventory = addToInventory(inventory, reward.refId, 1);
  else if (reward.kind === 'outfit' && reward.refId) wardrobe = { ...wardrobe, owned: [...wardrobe.owned, reward.refId] };
  commit({
    ...state,
    coins, gems, inventory, wardrobe,
    blindBoxes: state.blindBoxes - 1,
    pendingBox: null,
    lastReveal: { id: uid(), reward, ts: Date.now() },
  });
}

// ---------- daily check-in ----------

/** Records one partner's answer. When both have answered, the shared reward is paid once. */
export function answerCheckin(player: PlayerId, text: string) {
  const key = dateKey();
  const today = state.checkins[key] ?? {};
  if (today[player] || !text.trim()) return;
  const jq = journeyFor(key, state.checkins, state.customPrompts);
  addMsg('daily', player, text, jq.prompt, key);
  const next = { ...today, [player]: text.trim(), q: today.q ?? jq.prompt, theme: today.theme ?? jq.theme, n: today.n ?? jq.n, custom: today.custom ?? !!jq.custom };
  const both = next.A && next.B;
  const checkins = { ...state.checkins, [key]: { ...next, paid: both ? true : today.paid } };
  if (!both || today.paid) return commit({ ...state, checkins });
  // one streak freeze a month: a single missed day is forgiven so a busy day does not erase the run
  let frozen = state.ladder.frozen;
  const yest = prevKey(key);
  const month = key.slice(0, 7);
  if (!checkins[yest]?.paid && !frozen.includes(yest) && checkins[prevKey(yest)]?.paid && frozen.filter((f) => f.startsWith(month)).length < FREEZES_PER_MONTH) {
    frozen = [...frozen, yest];
  }
  const run = streakRun(checkins, key, frozen);
  const streak = run.n;
  const rung = LADDER.find((r) => r.days === streak && !state.ladder.claimed.includes(`${run.start}:${r.days}`));
  const milestone = !jq.custom && jq.n === 50; // the day 50 celebration
  const graceUsed = frozen.length > state.ladder.frozen.length;
  let mom: Moment | null = state.moment;
  if (rung) {
    const prize = rungPrize(rung);
    mom = moment('streak', `${rung.days} day streak!`, `The Synergy Lantern glows brighter. +${rung.coins} coins${prize ? `, ${prize}` : ''}.${graceUsed ? ' A Grace Shield held your streak.' : ''}`, '🔥');
  } else if (graceUsed) mom = moment('grace', 'Rest day used', 'Your Grace Shield kept the streak safe. Nothing lost, just keep going together.', '🛡️');
  const figures = rung?.figure ? { ...state.figures, [rung.figure]: (state.figures[rung.figure] ?? 0) + 1 } : state.figures;
  commit({
    ...state,
    checkins,
    ladder: { frozen, claimed: rung ? [...state.ladder.claimed, `${run.start}:${rung.days}`] : state.ladder.claimed },
    coins: state.coins + 15 + (rung?.coins ?? 0),
    gems: state.gems + 2 + (rung?.gems ?? 0) + (milestone ? 10 : 0),
    shells: state.shells + (rung?.shells ?? 0) + (milestone ? 10 : 0),
    arcadeTokens: state.arcadeTokens + (rung?.tokens ?? 0),
    figures,
    moment: mom,
    xp: state.xp + 15,
    blindBoxes: state.blindBoxes + (streak % 7 === 0 ? 1 : 0) + (milestone ? 1 : 0), // a week of check-ins earns a box, and so does finishing day 50
  });
}

/** Secret Prompt Drop: write tomorrow's question for your partner and yourself. It stays hidden until tomorrow. */
export function dropPrompt(from: PlayerId, text: string): boolean {
  const key = tomorrowKey();
  if (!text.trim() || state.customPrompts[key]) return false;
  commit({ ...state, customPrompts: { ...state.customPrompts, [key]: { from, text: text.trim().slice(0, 160) } } });
  return true;
}

// ---------- Together: whispers, bids, adventures, love map, gratitude ----------

/** Fireside Whispers: pick a tier, then both answer. Answers stay hidden until both are in. */
export function startWhisper(tier: WhisperTier) {
  const day = dateKey();
  if (state.whispers[day]) return;
  commit({ ...state, whispers: { ...state.whispers, [day]: { tier, q: whisperQuestion(tier, day) } } });
}

export function answerWhisper(player: PlayerId, text: string) {
  const day = dateKey();
  const w = state.whispers[day];
  if (!w || w[player] || !text.trim()) return;
  addMsg('whisper', player, text, w.q, day);
  const next = { ...w, [player]: text.trim() };
  const both = !!(next.A && next.B);
  const whispers = { ...state.whispers, [day]: { ...next, paid: both || w.paid } };
  if (!both || w.paid) return commit({ ...state, whispers });
  commit({ ...state, whispers, shells: state.shells + 2, xp: state.xp + 10, glowUntil: Date.now() + 24 * 3600 * 1000 });
}

/** A small bid for connection: a wave, a cup of tea or a flower. */
export function sendBid(from: PlayerId, kind: BidKind): boolean {
  const b = state.bid;
  if (b && !b.turned && Date.now() - b.ts < BID_WINDOW_MS) return false; // one at a time
  commit({ ...state, bid: { from, kind, ts: Date.now() }, bidStats: { ...state.bidStats, sent: state.bidStats.sent + 1 } });
  return true;
}

/** The partner turns toward the bid within 30 seconds: both are rewarded. */
export function turnToward(me: PlayerId): boolean {
  const b = state.bid;
  if (!b || b.turned || b.from === me || Date.now() - b.ts > BID_WINDOW_MS) return false;
  commit({
    ...state,
    bid: { ...b, turned: true },
    coins: state.coins + 10, // 5 each, in your shared wallet
    auraUntil: Date.now() + 5 * 60 * 1000,
    bidStats: { ...state.bidStats, turned: state.bidStats.turned + 1 },
  });
  return true;
}

export function rollAdventure() {
  const wk = weekKey();
  const cur = state.adventures[wk] ?? { rolls: 0 };
  if (cur.questId) return;
  commit({ ...state, adventures: { ...state.adventures, [wk]: { ...cur, rolls: cur.rolls + 1 } } });
}

/** Accepting the weekly adventure creates a verified quest whose reward is a Travel Capsule prop. */
export function acceptAdventure(me: PlayerId) {
  const wk = weekKey();
  const cur = state.adventures[wk] ?? { rolls: 0 };
  if (cur.questId) return;
  const adv = adventureFor(wk, cur.rolls);
  const id = uid();
  const quest: Quest = {
    id, title: adv.title, area: 'romance', description: `${adv.blurb} Reward: a Travel Capsule for your island.`,
    assignedTo: me, status: 'IN_PROGRESS', reward: { coins: 60, gems: 10, itemId: adv.capsule }, milestone: true, createdAt: Date.now(),
  };
  commit({ ...state, quests: [quest, ...state.quests], adventures: { ...state.adventures, [wk]: { ...cur, questId: id } } });
}

export function submitLoveAnswers(player: PlayerId, answers: number[]) {
  const wk = weekKey();
  const r = state.lovemap[wk] ?? { answers: {}, guesses: {} };
  if (r.answers[player]) return;
  commit({ ...state, lovemap: { ...state.lovemap, [wk]: { ...r, answers: { ...r.answers, [player]: answers } } } });
}

/** Guess your partner's answers. Correct guesses earn shells, misses reveal the truth and spawn a gesture quest. */
export function submitLoveGuesses(guesser: PlayerId, guesses: number[]) {
  const wk = weekKey();
  const r = state.lovemap[wk];
  const target = other(guesser);
  const truth = r?.answers[target];
  if (!r || !truth || r.guesses[guesser]) return;
  const set = loveSet(wk);
  let correct = 0;
  let firstMiss = -1;
  guesses.forEach((g, i) => {
    if (g === truth[i]) correct++;
    else if (firstMiss < 0) firstMiss = i;
  });
  let quests = state.quests;
  if (firstMiss >= 0) {
    const lq = LOVE_QUESTIONS[set[firstMiss]];
    quests = [{
      id: uid(), title: `Thoughtful gesture for ${state.names[target]}`, area: 'romance',
      description: `${state.names[target]} said: "${lq.q}" ${lq.options[truth[firstMiss]]}. Do something small that fits.`,
      assignedTo: guesser, status: 'IN_PROGRESS', reward: { coins: 20, gems: 0 }, createdAt: Date.now(),
    } as Quest, ...quests];
  }
  commit({ ...state, quests, shells: state.shells + correct * 2, lovemap: { ...state.lovemap, [wk]: { ...r, guesses: { ...r.guesses, [guesser]: guesses } } } });
}

/** One short thank you per person per day. Each note grows the Gratitude Tree. */
export function dropNote(player: PlayerId, text: string): boolean {
  const day = dateKey();
  if (!text.trim() || state.gratitude.some((n) => n.from === player && n.day === day)) return false;
  const id = uid();
  addMsg('gratitude', player, text.trim().slice(0, 140), undefined, id);
  commit({ ...state, gratitude: [...state.gratitude, { id, from: player, text: text.trim().slice(0, 140), day }] });
  return true;
}

/** Opening your partner's note earns a shell, and every third one unlocks floral decor. */
export function openNote(player: PlayerId, id: string) {
  const n = state.gratitude.find((x) => x.id === id);
  if (!n || n.opened || n.from === player) return;
  const count = state.notesOpened + 1;
  commit({
    ...state,
    gratitude: state.gratitude.map((x) => (x.id === id ? { ...x, opened: true } : x)),
    notesOpened: count,
    shells: state.shells + 1,
    inventory: count % 3 === 0 ? addToInventory(state.inventory, 'plant_b', 1) : state.inventory,
  });
}

// ---------- arcade ----------

export function spendToken(): boolean {
  if (state.arcadeTokens < 1) return false;
  commit({ ...state, arcadeTokens: state.arcadeTokens - 1 });
  return true;
}

export function buyToken(): boolean {
  if (state.coins < 100) return false;
  commit({ ...state, coins: state.coins - 100, arcadeTokens: state.arcadeTokens + 1 });
  return true;
}

/** Pays out a finished minigame. Only the host's device calls this, so a shared game never pays twice. */
export function applyMinigameReward(r: MGResult) {
  const mgDay = dayStats();
  const cafeBonus = r.type === 'MATCHA_MASTERS' ? 1 + matchaBonus(state) : 1; // pastry cases and a high café rating
  const mgCoins = Math.max(0, Math.min(Math.round(Math.min(r.coins, MG_COINS_PER_GAME) * coinMultiplier() * cafeBonus), DAILY_MG_COINS - mgDay.mgCoins));
  let inventory = state.inventory;
  for (const id of r.items) inventory = addToInventory(inventory, id, 1);
  const figures = { ...state.figures };
  for (const f of r.figures) figures[f] = (figures[f] ?? 0) + 1;
  const fauna = { ...state.fauna };
  for (const [k, n] of Object.entries(r.fauna)) fauna[k] = (fauna[k] ?? 0) + n;
  let cafe = state.cafe;
  let rushMoment = state.moment;
  if (r.rush) {
    const done = new Set(r.cafeServed.map((x) => x.id));
    cafe = { ...cafe, orders: cafe.orders.filter((o) => !done.has(o.id)), rushes: cafe.rushes + 1 };
    if (r.cafeServed.length) {
      const clean = r.cafeServed.every((x) => x.perfect);
      const tips = r.cafeServed.reduce((n, x) => n + x.tip, 0);
      rushMoment = moment('cafe', clean ? 'A clean rush!' : 'Rush complete!', `You served ${r.cafeServed.length} guest${r.cafeServed.length > 1 ? 's' : ''} together${clean ? ', every order perfect' : ''}. Tips ${tips}.`, clean ? '🙌' : '☕', clean ? 'cz_highfive' : 'cz_toast');
    }
  }
  commit({
    ...state,
    coins: state.coins + mgCoins,
    today: { ...mgDay, mgCoins: mgDay.mgCoins + mgCoins },
    cafe,
    moment: rushMoment,
    shells: state.shells + r.shells,
    eventTokens: state.eventTokens + r.eventTokens,
    ingredients: state.ingredients + r.ingredients,
    driftwood: state.driftwood + r.driftwood,
    xp: state.xp + Math.floor(r.score / 4),
    inventory, figures, fauna,
    recipes: [...state.recipes, ...r.recipes.filter((x) => !state.recipes.includes(x))],
    mgBest: { ...state.mgBest, [r.type]: Math.max(state.mgBest[r.type] ?? 0, r.score) },
  });
}

export function setFigureFree(id: string, free: boolean) {
  const rest = state.freeFigures.filter((f) => f !== id);
  commit({ ...state, freeFigures: free && (state.figures[id] ?? 0) > 0 ? [...rest, id] : rest });
}

/** A secret note from a bottle caught while fishing. Sealed from your partner until tomorrow. */
export function addBottleNote(from: PlayerId, text: string) {
  addMsg('bottle', from, text, 'Message in a bottle');
  commit({ ...state });
}

export function buyBlindBoxWithShells(): boolean {
  if (state.shells < 10) return false;
  commit({ ...state, shells: state.shells - 10, blindBoxes: state.blindBoxes + 1 });
  return true;
}

// ---------- avatars and memories ----------

export function setAvatarPos(p: PlayerId, x: number, y: number) {
  const cur = state.avatars[p];
  if (cur.x === x && cur.y === y) return;
  commit({ ...state, avatars: { ...state.avatars, [p]: { x, y } } });
}

export function createMemory(input: { title: string; note?: string; photo?: string; author: PlayerId; questId?: string }): Memory | null {
  const tile = freeShoreTile(state);
  if (!tile) return null;
  const memory: Memory = {
    id: uid(),
    title: input.title.trim(),
    note: input.note?.trim() || undefined,
    photo: input.photo,
    date: Date.now(),
    author: input.author,
    questId: input.questId,
    tileX: tile.x,
    tileY: tile.y,
  };
  addMsg('memory', input.author, memory.note ?? memory.title, memory.title, memory.id);
  commit({ ...state, memories: [memory, ...state.memories] });
  return memory;
}

export function deleteMemory(id: string) {
  commit({ ...state, memories: state.memories.filter((m) => m.id !== id) });
}

// ---------- selectors ----------

export const levelOf = (xp: number) => 1 + Math.floor(xp / 100);
export const pendingFor = (s: GameState, p: PlayerId) =>
  s.quests.filter((q) => q.status === 'PENDING_VERIFICATION' && q.assignedTo === other(p));
export { other as otherPlayer };


// ---------- quadrant mechanics ----------

/** 1.5x while a Synergy Aura is active. */
export const coinMultiplier = (now = Date.now()) => (now < state.synergyUntil ? SYNERGY_MULT : 1);

/** Focus Beacon: 45 minutes of deep work. */
export function startFocus(p: PlayerId) {
  if (state.focus[p] && !state.focus[p]!.paid) return;
  const now = Date.now();
  commit({ ...state, focus: { ...state.focus, [p]: { start: now, until: now + FOCUS_MS, teas: 0 } } });
}

/** The partner taps the lantern: a silent warm cup of tea, paid when the session ends. */
export function sendTea(from: PlayerId) {
  const to = otherP(from);
  const f = state.focus[to];
  if (!f || f.paid || Date.now() >= f.until || f.teas >= 1) return false;
  commit({ ...state, focus: { ...state.focus, [to]: { ...f, teas: f.teas + 1 } } });
  return true;
}

export function focusActive(p: PlayerId, now = Date.now()) {
  const f = state.focus[p];
  return !!f && !f.paid && now < f.until;
}

/** Called by the worker's own device once the timer runs out. */
export function finishFocus(p: PlayerId) {
  const f = state.focus[p];
  if (!f || f.paid || Date.now() < f.until) return null;
  const coins = FOCUS_COINS + f.teas * TEA_COINS;
  commit({ ...state, coins: state.coins + coins, xp: state.xp + coins, focus: { ...state.focus, [p]: { ...f, paid: true } } });
  return { coins, teas: f.teas };
}

export function cancelFocus(p: PlayerId) {
  const rest = { ...state.focus };
  delete rest[p];
  commit({ ...state, focus: rest });
}

/** Wisdom Bookshelf needs a takeaway before a learning goal can be sent. */
export const libraryOf = () => state.library;

/** Dream Vault */
export function depositVault(amount: number): boolean {
  if (amount <= 0 || state.coins < amount) return false;
  commit({ ...state, coins: state.coins - amount, vault: { ...state.vault, coins: state.vault.coins + amount } });
  return true;
}

export function buildBlueprint(id: string): boolean {
  if (id === 'expand') {
    const step = nextExpansion();
    if (!step || state.vault.coins < step.coins) return false;
    commit({ ...state, islandSize: step.size, vault: { ...state.vault, coins: state.vault.coins - step.coins, built: [...state.vault.built, `expand${step.size}`] } });
    return true;
  }
  const bp = BLUEPRINTS.find((b) => b.id === id);
  if (!bp || state.vault.built.includes(id) || state.vault.coins < bp.cost) return false;
  let inventory = state.inventory;
  for (const [item, n] of Object.entries(bp.items)) inventory = addToInventory(inventory, item, n);
  commit({ ...state, inventory, blindBoxes: state.blindBoxes + bp.boxes, vault: { coins: state.vault.coins - bp.cost, built: [...state.vault.built, id] } });
  return true;
}

/** Love letters: write a sealed bottle that washes up on the island shore. */
export function sealBottle(from: PlayerId, text: string, photo?: string): boolean {
  if (state.bottleCredits[from] < 1 || !text.trim()) return false;
  const tile = freeShoreTile(state, state.bottles.filter((b) => !b.opened).map((b) => ({ x: b.tileX, y: b.tileY }))) ?? { x: state.islandSize - 1, y: 0 };
  const id = uid();
  addMsg('bottle', from, text, 'Love letter in a bottle', id); // the writer can always reread it in the Memory Vault
  commit({
    ...state,
    bottleCredits: { ...state.bottleCredits, [from]: state.bottleCredits[from] - 1 },
    bottles: [...state.bottles, { id, from, text: text.trim(), photo, ts: Date.now(), tileX: tile.x, tileY: tile.y }],
  });
  return true;
}

/** Your partner walks to the shore and unwraps it. */
export function openBottle(id: string, reader: PlayerId) {
  const b = state.bottles.find((x) => x.id === id);
  if (!b || b.opened || b.from === reader) return null;
  commit({ ...state, shells: state.shells + BOTTLE_SHELLS, bottles: state.bottles.map((x) => (x.id === id ? { ...x, opened: true } : x)) });
  return b;
}

/** The Wishing Well in the Town Square: 10 coins for a wish. */
export function tossWell(): string | null {
  if (state.coins < 10) return null;
  const wd = dayStats();
  if (wd.wells >= DAILY_WELL_TOSSES) return 'The well is quiet for today. Come back tomorrow for more wishes.';
  const r = Math.random();
  let shells = 1, gems = 0, boxes = 0, text = '✨ Your wish drifts down… a Heart Shell glints in the water.';
  if (r > 0.97) { boxes = 1; text = '🌟 The well glows gold! A blind box floats up.'; }
  else if (r > 0.85) { gems = 3; shells = 2; text = '💎 A sparkle in the water: 2 shells and 3 gems.'; }
  else if (r > 0.6) { shells = 3; text = '🐚 A lucky one! 3 Heart Shells.'; }
  commit({ ...state, coins: state.coins - 10, shells: state.shells + shells, gems: state.gems + gems, blindBoxes: state.blindBoxes + boxes, today: { ...wd, wells: wd.wells + 1 } });
  return text;
}


// ---------- weekly couple goal and recap ----------

/** Either partner sets a weekly goal. On a Sunday you can also set next week's, the Sunday Covenant. */
export function setWeeklyGoal(by: PlayerId, title: string, target: number, next = false): boolean {
  const wk = next && isSunday() ? nextWeekKey() : mondayOf();
  const t = title.trim().slice(0, 60);
  if (!t || state.weekly[wk]) return false;
  commit({ ...state, weekly: { ...state.weekly, [wk]: { title: t, target: Math.min(7, Math.max(1, Math.round(target))), by, ticks: [] } } });
  return true;
}

/** "We did it today": one tick a day, and it counts once the other partner confirms. */
export function logWeeklyTick(by: PlayerId): boolean {
  const wk = mondayOf();
  const g = state.weekly[wk];
  const day = dateKey();
  if (!g || g.paid || g.ticks.some((t) => t.day === day)) return false;
  commit({ ...state, weekly: { ...state.weekly, [wk]: { ...g, ticks: [...g.ticks, { day, by }] } } });
  return true;
}

export function confirmWeeklyTick(by: PlayerId, day: string) {
  const wk = mondayOf();
  const g = state.weekly[wk];
  const tick = g?.ticks.find((t) => t.day === day);
  if (!g || !tick || tick.ok || tick.by === by) return;
  const ticks = g.ticks.map((t) => (t.day === day ? { ...t, ok: true } : t));
  const done = ticks.filter((t) => t.ok).length >= g.target && !g.paid;
  const now = Date.now();
  commit({
    ...state,
    weekly: { ...state.weekly, [wk]: { ...g, ticks, paid: g.paid || done } },
    coins: state.coins + (done ? WEEKLY_REWARD.coins : 0),
    gems: state.gems + (done ? WEEKLY_REWARD.gems : 0),
    shells: state.shells + (done ? WEEKLY_REWARD.shells : 0),
    xp: state.xp + (done ? WEEKLY_REWARD.xp : 0),
    // the Weekly Memory Banner flies over the Town Square
    banners: done ? [...state.banners.filter((b) => b.until > now), { id: uid(), by, title: g.title, ts: now, until: now + WEEKLY_BANNER_MS }] : state.banners,
    moment: done ? moment('goal', 'Weekly goal complete!', `${g.title}. +${WEEKLY_REWARD.coins} coins, +${WEEKLY_REWARD.shells} shells, and a banner flies over the Town Square.`, '📜') : state.moment,
  });
}

export function undoWeeklyTick(by: PlayerId, day: string) {
  const wk = mondayOf();
  const g = state.weekly[wk];
  const tick = g?.ticks.find((t) => t.day === day);
  if (!g || g.paid || !tick || tick.ok || tick.by !== by) return;
  commit({ ...state, weekly: { ...state.weekly, [wk]: { ...g, ticks: g.ticks.filter((t) => t.day !== day) } } });
}

/** Last week's recap pays a small bonus once, so looking back together becomes a Sunday habit. */
export function claimRecap(): boolean {
  const wk = lastWeekKey();
  if (state.recapClaimed.includes(wk) || !hasActivity(recapOf(state, wk))) return false;
  commit({ ...state, recapClaimed: [...state.recapClaimed, wk], coins: state.coins + RECAP_REWARD.coins, shells: state.shells + RECAP_REWARD.shells, moment: moment('recap', 'Looking back together', 'A week of little moments, kept. +20 coins and +2 shells.', '📅') });
  return true;
}


// ---------- surprise quests ----------

/** Sets a secret act of kindness for your partner. You stake a few coins, and it pays back more once it is done. */
export function sendSurprise(from: PlayerId, act: string, note?: string): string | null {
  const a = act.trim().slice(0, 120);
  if (!a) return 'Write what you would like them to do.';
  const to = other(from);
  if (state.surprises.some((x) => x.from === from && !x.doneAt)) return 'You already have a surprise waiting for them. Wait until they finish it.';
  const day = dateKey();
  if (state.surprises.some((x) => x.from === from && dateKey(new Date(x.ts)) === day)) return 'One surprise a day is plenty. Try again tomorrow.';
  if (state.coins < SURPRISE_COST) return `A surprise costs ${SURPRISE_COST} coins to send.`;
  commit({ ...state, coins: state.coins - SURPRISE_COST, surprises: [...state.surprises, { id: uid(), from, to, act: a, note: note?.trim().slice(0, 160) || undefined, ts: Date.now() }] });
  return null;
}

/** The receiver did the thing. The sealed note unwraps for both of you and both of you are paid. */
export function completeSurprise(by: PlayerId, id: string): string | null {
  const sp = state.surprises.find((x) => x.id === id);
  if (!sp || sp.doneAt || sp.to !== by) return null;
  if (Date.now() - sp.ts < SURPRISE_DELAY_MS) return 'Give it a little time first. A real surprise takes a few minutes.';
  if (sp.note) addMsg('surprise', sp.from, sp.note, `Secret surprise: ${sp.act}`, sp.id);
  commit({
    ...state,
    surprises: state.surprises.map((x) => (x.id === id ? { ...x, doneAt: Date.now() } : x)),
    coins: state.coins + SURPRISE_PAY.coins,
    shells: state.shells + SURPRISE_PAY.shells,
    xp: state.xp + SURPRISE_PAY.xp,
    moment: moment('surprise', 'A surprise, unwrapped!', sp.note ? `${state.names[sp.from]} left you a note: “${sp.note}”` : `${state.names[by]} did it: ${sp.act}`, '🎁'),
  });
  return null;
}


// ---------- the café interior ----------

/** Grows the café room, so there is more space inside to design. */
export function expandCafe(): boolean {
  const step = nextCafeStep(state);
  if (!step || state.coins < step.coins) return false;
  commit({ ...state, coins: state.coins - step.coins, cafe: { ...state.cafe, size: step.size } });
  return true;
}

/** Switches the room's look. The other two themes cost a little the first time. */
export function setCafeTheme(theme: CafeTheme): boolean {
  const info = themeOf(theme);
  const owned = state.cafe.themes.includes(theme);
  if (!owned && state.coins < info.price) return false;
  commit({ ...state, coins: state.coins - (owned ? 0 : info.price), cafe: { ...state.cafe, theme, themes: owned ? state.cafe.themes : [...state.cafe.themes, theme] } });
  return true;
}

export function setCafePos(p: PlayerId, x: number, y: number) {
  const cur = state.cafe.avatars[p];
  if (cur.x === x && cur.y === y) return;
  commit({ ...state, cafe: { ...state.cafe, avatars: { ...state.cafe.avatars, [p]: { x, y } } } });
}

/** Tips the café earned while it was open: it needs a seat and a table, and a higher rating earns more. */
export function collectTips(): number {
  const n = tipsPending(state);
  if (n < 1) return 0;
  commit({ ...state, coins: state.coins + n, cafe: { ...state.cafe, tipsAt: Date.now() } });
  return n;
}

/** The window bench: once a day you sit together and both of you are rewarded. */
export function sitTogether(): boolean {
  if (!styleOf(state).bench || sitToday(state)) return false;
  commit({
    ...state,
    coins: state.coins + 15,
    shells: state.shells + 1,
    xp: state.xp + 5,
    cafe: { ...state.cafe, sitDay: dateKey() },
    moment: moment('cafe', 'Sitting together', 'A few quiet minutes on the window bench. +15 coins and +1 heart shell.', '💞'),
  });
  return true;
}

/** Walking in: each day the pantry is stocked by the whisk station, the kitchen (oven and fridge) and an apprentice. */
export function stockPantry(): number {
  const day = dateKey();
  const st = styleOf(state);
  const n = (st.whisk ? 1 : 0) + (st.kitchen ? 1 : 0) + (state.cafe.staff.includes('apprentice') ? 1 : 0);
  if (!n || state.cafe.pantryDay === day) return 0;
  commit({ ...state, ingredients: state.ingredients + n, cafe: { ...state.cafe, pantryDay: day } });
  return n;
}

/** Hires a barista. There are no wages: each one just adds something to the café. */
export function hireStaff(id: string): boolean {
  const st = STAFF.find((x) => x.id === id);
  if (!st || state.cafe.staff.includes(id) || state.coins < st.price) return false;
  commit({ ...state, coins: state.coins - st.price, cafe: { ...state.cafe, staff: [...state.cafe.staff, id] }, moment: moment('cafe', `${st.name} joined!`, `${st.role}: ${st.perk}.`, '☕') });
  return true;
}

export function setSign(id: string): boolean {
  const sg = SIGNS.find((x) => x.id === id);
  if (!sg || styleOf(state).stars < sg.stars) return false;
  commit({ ...state, cafe: { ...state.cafe, sign: id } });
  return true;
}

/** One of you opens today's community event. It needs the room to be ready, and the other has to join in. */
export function startCafeEvent(by: PlayerId, id: EventId): string | null {
  const day = dateKey();
  const ev = eventToday();
  if (!ev || ev.id !== id) return 'That event is not on today.';
  if (state.cafe.event?.day === day) return 'Today’s event is already under way.';
  // never blocked: a room that is not fully ready simply earns half the bonus, so a messy event costs nothing
  commit({ ...state, cafe: { ...state.cafe, event: { day, id, by, joined: false, full: eventReady(state, id) } } });
  return null;
}

/** The other partner joins. Both of you are rewarded, and the café grows more popular. */
export function joinCafeEvent(by: PlayerId): boolean {
  const e = state.cafe.event;
  if (!e || e.day !== dateKey() || e.joined || e.by === by) return false;
  const ev = eventOf(e.id as EventId);
  const k = e.full === false ? 0.5 : 1;
  const coins = Math.round(ev.coins * k), shells = Math.max(1, Math.round(ev.shells * k));
  commit({
    ...state,
    coins: state.coins + coins,
    shells: state.shells + shells,
    xp: state.xp + 15,
    cafe: { ...state.cafe, event: { ...e, joined: true }, popularity: Math.min(10, state.cafe.popularity + (ev.popularity && k === 1 ? 1 : 0)) },
    moment: moment('cafe', `${ev.name} done!`, `You hosted it together. +${coins} coins and +${shells} shells${ev.popularity && k === 1 ? ', and your café is more popular for good' : ''}.${k < 1 ? ' (Half bonus: the room was not fully ready. Get it ready next time for the full reward.)' : ''}`, ev.icon, EVENT_TEAM[ev.id]),
  });
  return true;
}

/** The lucky cat: one free pull a day, then a few coins a pull. A rare prize is guaranteed every 10th pull. */
export function pullGacha(): { tier: 'common' | 'rare' | 'legendary'; itemId: string } | null {
  const free = freePullToday(state);
  if (!free && state.coins < GACHA_COST) return null;
  const g = state.cafe.gacha;
  const r = Math.random();
  const pity = g.pity + 1 >= 10;
  const tier: 'common' | 'rare' | 'legendary' = r > 0.96 ? 'legendary' : r > 0.74 || pity ? 'rare' : 'common';
  const list = GACHA[tier];
  const itemId = list[Math.floor(Math.random() * list.length)];
  commit({
    ...state,
    coins: state.coins - (free ? 0 : GACHA_COST),
    inventory: addToInventory(state.inventory, itemId, 1),
    cafe: { ...state.cafe, gacha: { n: g.n + 1, day: free ? dateKey() : g.day, pity: tier === 'common' ? g.pity + 1 : 0 } },
  });
  return { tier, itemId };
}

/** A finished pour. Up to three a day pay coins, and a streak of good pours raises the tip. */
export function finishLatte(score: number): { coins: number; streak: number } {
  const day = dateKey();
  const l = state.cafe.latte.day === day ? state.cafe.latte : { day, n: 0, best: 0, streak: state.cafe.latte.streak };
  const streak = score >= 80 ? l.streak + 1 : 0;
  const paid = l.n < 3;
  const coins = paid ? Math.round((score / 100) * 20 * (1 + 0.1 * Math.min(8, streak))) : 0;
  commit({
    ...state,
    coins: state.coins + coins,
    shells: state.shells + (paid && score >= 90 && l.best < 90 ? 1 : 0),
    cafe: { ...state.cafe, latte: { day, n: l.n + 1, best: Math.max(l.best, score), streak } },
  });
  return { coins, streak };
}


// ---------- café orders and the rush ----------

/** A guest sits down and orders. At most four wait on the rail, and two phones never double up. */
export function addCafeOrder(kind: string): boolean {
  const c = state.cafe;
  const now = Date.now();
  if (c.orders.length >= MAX_ORDERS || now - c.lastOrderTs < 4000) return false;
  const o = newOrder(state, kind);
  commit({ ...state, cafe: { ...c, lastOrderTs: now, orders: [...c.orders, { id: uid(), kind, drink: o.drink, pastry: o.pastry, ts: now }] } });
  return true;
}

/** One of you takes an order from the rail. */
export function takeCafeOrder(by: PlayerId, id: string) {
  commit({ ...state, cafe: { ...state.cafe, orders: state.cafe.orders.map((o) => (o.id === id && !o.by ? { ...o, by } : o)) } });
}
export function untakeCafeOrder(id: string) {
  commit({ ...state, cafe: { ...state.cafe, orders: state.cafe.orders.map((o) => (o.id === id ? { ...o, by: undefined } : o)) } });
}
