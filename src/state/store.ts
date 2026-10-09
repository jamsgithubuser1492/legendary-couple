import { useSyncExternalStore } from 'react';
import type { CompanionId, GameState, Memory, PlayerId, Quest, StartingPath } from '../types';
import { availableIn, itemOf } from './catalog';
import { canPlace, canPlacePreset, freeShoreTile, presetOrder } from './placement';
import { presetOf } from './presets';
import { getTheme } from './season';
import { defaultWardrobe, outfitOf } from './wardrobe';
import { BOX_PRICE_GEMS, rollReward } from './blindbox';
import { dateKey, streakOf } from './questions';

const STATE_KEY = 'olw:state:v1';
const ME_KEY = 'olw:me';

const initial = (): GameState => ({
  startingPath: null,
  coins: 1000,
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
  const w = saved.wardrobe;
  return {
    ...base,
    ...saved,
    wardrobe: {
      ...base.wardrobe,
      ...w,
      owned: [...new Set([...base.wardrobe.owned, ...(w?.owned ?? [])])],
      equipped: { ...base.wardrobe.equipped, ...(w?.equipped ?? {}) },
    },
  };
}

let state: GameState = load();
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
  state = withDefaults(next);
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

function patchQuest(id: string, fn: (q: Quest) => Quest) {
  commit({ ...state, quests: state.quests.map((q) => (q.id === id ? fn(q) : q)) });
}

// ---------- actions ----------

export function setStartingPath(p: StartingPath) {
  commit({ ...state, startingPath: p });
}

export function setNames(names: Record<PlayerId, string>) {
  commit({ ...state, names });
}

export function createQuest(input: Omit<Quest, 'id' | 'status' | 'createdAt'>) {
  commit({
    ...state,
    quests: [{ ...input, id: uid(), status: 'IN_PROGRESS', createdAt: Date.now() }, ...state.quests],
  });
}

export function deleteQuest(id: string) {
  commit({ ...state, quests: state.quests.filter((q) => q.id !== id) });
}

/** Assignee says "I did it". Waits for the partner. */
export function submitQuest(id: string, evidence: { note?: string; photo?: string }) {
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
      completedAt: undefined,
      evidenceNote: undefined,
      evidencePhoto: undefined,
      reviewNote: undefined,
      reviewedAt: undefined,
    });
  }
  commit({
    ...state,
    quests,
    coins: state.coins + q.reward.coins,
    gems: state.gems + q.reward.gems,
    xp: state.xp + q.reward.coins,
    inventory: q.reward.itemId ? addToInventory(state.inventory, q.reward.itemId, 1) : state.inventory,
    // quest boxes, plus a bonus box for every 5th approved quest (a milestone streak)
    blindBoxes: state.blindBoxes + (q.reward.blindBoxes ?? 0) + ((state.approvedCount + 1) % 5 === 0 ? 1 : 0),
    approvedCount: state.approvedCount + 1,
  });
}

export function requestEdit(id: string, reviewer: PlayerId, note: string) {
  const q = state.quests.find((x) => x.id === id);
  if (!q || q.status !== 'PENDING_VERIFICATION' || q.assignedTo === reviewer) return;
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

export function placeObject(itemId: string, x: number, y: number, rotation: 0 | 90 | 180 | 270, extraBlocked: { x: number; y: number }[] = []): boolean {
  if (!canPlace(state, itemId, x, y, rotation, extraBlocked).ok) return false;
  commit({
    ...state,
    inventory: addToInventory(state.inventory, itemId, -1),
    placed: [...state.placed, { id: uid(), itemId, tileX: x, tileY: y, rotation }],
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
export function removeObject(id: string) {
  const o = state.placed.find((p) => p.id === id);
  if (!o) return;
  // taking down a wall also takes down whatever hangs on it
  const attached =
    itemOf(o.itemId)?.layer === 'wall'
      ? state.placed.filter((p) => p.id !== id && p.tileX === o.tileX && p.tileY === o.tileY && itemOf(p.itemId)?.layer === 'walldecor')
      : [];
  const gone = new Set([id, ...attached.map((a) => a.id)]);
  let inventory = state.inventory;
  for (const r of [o, ...attached]) inventory = addToInventory(inventory, r.itemId, 1);
  commit({ ...state, placed: state.placed.filter((p) => !gone.has(p.id)), inventory });
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
  if (state.blindBoxes < 1 || state.pendingBox) return;
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
  const next = { ...today, [player]: text.trim() };
  const both = next.A && next.B;
  const checkins = { ...state.checkins, [key]: { ...next, paid: both ? true : today.paid } };
  if (!both || today.paid) return commit({ ...state, checkins });
  const streak = streakOf(checkins, key);
  commit({
    ...state,
    checkins,
    coins: state.coins + 15,
    gems: state.gems + 2,
    xp: state.xp + 15,
    blindBoxes: state.blindBoxes + (streak % 7 === 0 ? 1 : 0), // a week of check-ins earns a box
  });
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
