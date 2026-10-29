import { useEffect, useRef, useState } from 'react';
import { MinigameNet } from '../../game/minigames/net';
import { getRoom } from '../../lib/sync';
import type { GameState, LabGlass, PlayerId } from '../../types';
import { ART_IDS, RIM_IDS, availableIngredients, closeness, ingredientOf, sweetSpotFor, type ExperimentInput } from '../../state/lab';

/** Everything the two of you are shaping at the counter right now. */
export interface Draft {
  base: string; flavor: string; topping: string;
  temp: number; sweet: number;
  glass: LabGlass; rim: string | null;
  art: string | null; artScore: number;
}
export const ALCHEMIST_KEYS = ['base', 'flavor', 'topping', 'temp', 'sweet'] as const;
export const DECORATOR_KEYS = ['glass', 'rim', 'art', 'artScore'] as const;

/** A first draft from whatever the couple can use today. */
export function defaultDraft(s: GameState): Draft {
  const av = availableIngredients(s);
  const pick = (kind: string, fallback: string) => av.find((i) => i.kind === kind)?.id ?? fallback;
  return { base: pick('base', 'matcha'), flavor: pick('flavor', 'strawberry'), topping: pick('topping', 'boba'), temp: 0.5, sweet: 0.5, glass: 'mason', rim: null, art: null, artScore: 0.5 };
}

export const toInput = (d: Draft): ExperimentInput => ({ ...d, artScore: d.art ? d.artScore : 0.5 });
export const spotOf = (d: Draft) => sweetSpotFor(d.base, d.flavor, d.topping);
export const closeOf = (d: Draft) => closeness(d.temp, d.sweet, spotOf(d));

/** A gentle three level hint for one slider, never a verdict. */
export function nudge(value: number, target: number, warm: [string, string]): string {
  const d = target - value;
  const a = Math.abs(d);
  if (a < 0.08) return 'just right';
  const how = a < 0.2 ? 'a touch' : 'quite a bit';
  return `${how} ${d > 0 ? warm[0] : warm[1]}`;
}
export const tempHint = (d: Draft) => nudge(d.temp, spotOf(d).temp, ['warmer', 'cooler']);
export const sweetHint = (d: Draft) => nudge(d.sweet, spotOf(d).sweet, ['sweeter', 'less sweet']);

export function verdict(close: number): string {
  if (close >= 0.9) return 'Pure magic. The balance is perfect.';
  if (close >= 0.7) return 'So close. It tastes lovely already.';
  if (close >= 0.45) return 'A good start. A little tuning could make it sing.';
  return 'A rough match, but still a cozy drink. Try nudging the dials.';
}

/** The color bands of the drink from the bottom up: base, flavor, topping. */
export const bandsOf = (d: Draft) => [d.base, d.flavor, d.topping].map((id) => ({ id, color: ingredientOf(id)?.swatch ?? '#ddd' }));

// ------------------------------------------------------------------ live co op
export interface LabNet {
  online: boolean; // the partner is here right now
  swapped: boolean; // false: partner A is the Flavor Alchemist; true: partner A decorates
  setSwapped: (v: boolean) => void;
  sendDraft: (d: Draft) => void;
  sendKept: (info: { recipeId: string; text: string; discoveredNew: boolean; improved: boolean }) => void;
  lastKeepAt: () => number; // when the partner last pressed Keep (ms), or 0
  markKeep: () => void;
}
export interface NetHandlers {
  onDraft: (d: Partial<Draft>, from: PlayerId) => void;
  onKept: (info: { recipeId: string; text: string; discoveredNew: boolean; improved: boolean }) => void;
}

/**
 * Joins a small broadcast channel for this room so both partners see each other's picks live. With no room (or no partner)
 * the hook reports offline and one person simply drives every control. It never blocks the screen and never throws.
 */
export function useLabNet(me: PlayerId, handlers: NetHandlers): LabNet {
  const [online, setOnline] = useState(false);
  const [swapped, setSwappedState] = useState(false);
  const net = useRef<MinigameNet | null>(null);
  const seen = useRef(0);
  const keepAt = useRef(0);
  const lastSend = useRef(0);
  const pending = useRef<Draft | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const hs = useRef(handlers);
  hs.current = handlers;

  useEffect(() => {
    const room = getRoom() ?? (MinigameNet.localOnly() ? 'LOCAL' : null);
    if (!room) return;
    let dead = false;
    const n = new MinigameNet(`lab:${room}`, me);
    net.current = n;
    const off = n.on((m) => {
      if (dead || m.from === me) return;
      seen.current = Date.now();
      setOnline(true);
      if (m.t === 'hello') n.send('here');
      else if (m.t === 'draft' && m.p && typeof m.p === 'object') hs.current.onDraft(m.p as Partial<Draft>, m.from);
      else if (m.t === 'role' && typeof (m.p as { swapped?: unknown })?.swapped === 'boolean') setSwappedState((m.p as { swapped: boolean }).swapped);
      else if (m.t === 'keep') keepAt.current = Date.now();
      else if (m.t === 'kept' && m.p && typeof m.p === 'object') hs.current.onKept(m.p as Parameters<NetHandlers['onKept']>[0]);
    });
    void n.join().then(() => { if (!dead) n.send('hello'); }).catch(() => undefined);
    const tick = setInterval(() => {
      if (document.hidden) return;
      n.send('here');
      if (seen.current && Date.now() - seen.current > 9000) setOnline(false);
    }, 3000);
    return () => {
      dead = true;
      clearInterval(tick);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = undefined;
      off();
      void n.leave().catch(() => undefined);
      net.current = null;
    };
  }, [me]);

  return {
    online,
    swapped,
    setSwapped: (v) => { setSwappedState(v); net.current?.send('role', { swapped: v }); },
    sendDraft: (d) => {
      pending.current = d;
      if (timer.current) return; // at most ten a second, and the last picks always go out
      const wait = Math.max(0, 100 - (Date.now() - lastSend.current));
      timer.current = window.setTimeout(() => {
        timer.current = undefined;
        lastSend.current = Date.now();
        if (pending.current) net.current?.send('draft', pending.current);
      }, wait);
    },
    sendKept: (info) => net.current?.send('kept', info),
    lastKeepAt: () => keepAt.current,
    markKeep: () => { keepAt.current = Date.now(); net.current?.send('keep'); },
  };
}

// ------------------------------------------------------------------ the lock
import { styleOf } from '../../state/cafe';
/** The Test Kitchen opens once the café has two stars and a whisk station. Returns a kind hint while it is closed. */
export function labLocked(s: GameState): string | null {
  const st = styleOf(s);
  if (st.stars >= 2 && st.whisk) return null;
  return st.stars < 2 && !st.whisk ? 'Opens at 2 stars with a whisk station.' : st.stars < 2 ? 'Opens at 2 stars. Keep decorating your café.' : 'Opens once your café has a whisk station.';
}

/** Which role a partner plays: partner A is the Flavor Alchemist until you swap. */
export const roleOf = (p: PlayerId, swapped: boolean): 'alchemist' | 'decorator' => ((p === 'A') !== swapped ? 'alchemist' : 'decorator');

/** Accepts only well formed picks from the partner's phone, so a damaged message can never break the screen. */
export function cleanDraft(raw: Partial<Draft>, role: 'alchemist' | 'decorator'): Partial<Draft> {
  const out: Partial<Draft> = {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : undefined);
  if (role === 'alchemist') {
    for (const k of ['base', 'flavor', 'topping'] as const) {
      const v = raw[k];
      if (typeof v === 'string' && ingredientOf(v)?.kind === k) out[k] = v;
    }
    const t = num(raw.temp), w = num(raw.sweet);
    if (t !== undefined) out.temp = t;
    if (w !== undefined) out.sweet = w;
  } else {
    if (raw.glass === 'mason' || raw.glass === 'mug' || raw.glass === 'togo') out.glass = raw.glass;
    if (raw.rim === null || (typeof raw.rim === 'string' && RIM_IDS.includes(raw.rim))) out.rim = raw.rim;
    if (raw.art === null || (typeof raw.art === 'string' && ART_IDS.includes(raw.art))) out.art = raw.art;
    const a = num(raw.artScore);
    if (a !== undefined) out.artScore = a;
  }
  return out;
}
