import { useSyncExternalStore } from 'react';
import type { GameState, PlayerId, Quest, StartingPath } from '../types';

const STATE_KEY = 'olw:state:v1';
const ME_KEY = 'olw:me';

const initial = (): GameState => ({
  startingPath: null,
  coins: 1000,
  gems: 50,
  xp: 0,
  names: { A: 'James', B: 'Rachel' },
  quests: [],
  inventory: [],
  placed: [],
});

function load(): GameState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return { ...initial(), ...JSON.parse(raw) };
    // migrate the Build 1 starting path key
    const legacy = localStorage.getItem('olw:startingPath');
    if (legacy === 'rv' || legacy === 'shop' || legacy === 'home') return { ...initial(), startingPath: legacy };
  } catch {
    /* ignore */
  }
  return initial();
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
  state = { ...initial(), ...next };
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

export function setMe(p: PlayerId) {
  me = p;
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
  });
}

export function requestEdit(id: string, reviewer: PlayerId, note: string) {
  const q = state.quests.find((x) => x.id === id);
  if (!q || q.status !== 'PENDING_VERIFICATION' || q.assignedTo === reviewer) return;
  patchQuest(id, (x) => ({ ...x, status: 'REJECTED', reviewNote: note.trim() || 'Please add more detail.', reviewedAt: Date.now() }));
}

// ---------- selectors ----------

export const levelOf = (xp: number) => 1 + Math.floor(xp / 100);
export const pendingFor = (s: GameState, p: PlayerId) =>
  s.quests.filter((q) => q.status === 'PENDING_VERIFICATION' && q.assignedTo === other(p));
export { other as otherPlayer };
