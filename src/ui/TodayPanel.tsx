import { dateKey } from '../state/questions';
import { otherPlayer, pendingFor, useGameState, useMe } from '../state/store';
import { mondayOf, streakNow } from '../state/weekly';
import { waitingFor, type WaitingKind } from '../state/waiting';
import type { PhoneAction } from './PocketPhone';

export type TodayAct = PhoneAction | 'quests';

const ICON: Record<WaitingKind, string> = { approve: '📋', daily: '💬', whisper: '🔥', box: '🎁', surprise: '💌', weekly: '🗓️', event: '☕' };
const GO: Record<WaitingKind, TodayAct> = { approve: 'quests', daily: 'checkin', whisper: 'together', box: 'boxes', surprise: 'surprise', weekly: 'week', event: 'cafe' };

const SUGGEST = [
  'A quiet day: say hi to each other',
  'A small thank you can make someone smile',
  'Plan one tiny thing to look forward to',
  'Take a slow walk around the island together',
  'Share one good thing from today',
  'Ask how their day felt, not only what happened',
];

const row = 'flex w-full cursor-pointer items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-left text-cocoa shadow-sm transition hover:bg-white hover:shadow active:scale-[0.99]';

/** What today looks like for the two of you: the question, the week, what is waiting, the lantern. Warm, never a to do list that scolds. */
export function TodayContent({ onAct }: { onAct: (a: TodayAct) => void }) {
  const s = useGameState();
  const me = useMe();
  const them = s.names[otherPlayer(me)] || 'your partner';
  const day = dateKey();
  const c = s.checkins[day];
  const mine = !!c?.[me], theirs = !!c?.[otherPlayer(me)];
  const daily = mine && theirs ? 'Answered together' : mine ? `Waiting for ${them}` : theirs ? `${them} answered. Yours opens it.` : "Today's question is ready";
  const wg = s.weekly[mondayOf()];
  const week = wg ? `${wg.ticks.filter((t) => t.ok).length}/${wg.target} ${wg.title}` : 'Pick a goal for this week';
  const streak = streakNow(s);
  const waiting = waitingFor(s, me);
  const pending = pendingFor(s, me).length;
  const idea = SUGGEST[Math.floor(Date.now() / 86400000) % SUGGEST.length];
  return (
    <div className="flex flex-col gap-2">
      <button className={row} onClick={() => onAct('checkin')}>
        <span className="text-xl">💬</span>
        <span className="min-w-0 flex-1"><span className="block font-display text-xs font-bold uppercase opacity-60">Daily question</span><span className="block truncate text-sm font-bold">{daily}</span></span>
      </button>
      <button className={row} onClick={() => onAct('week')}>
        <span className="text-xl">🗓️</span>
        <span className="min-w-0 flex-1"><span className="block font-display text-xs font-bold uppercase opacity-60">This week</span><span className="block truncate text-sm font-bold">{week}</span></span>
      </button>
      <button className={row} onClick={() => onAct('streak')}>
        <span className="text-xl">🏮</span>
        <span className="min-w-0 flex-1"><span className="block font-display text-xs font-bold uppercase opacity-60">Synergy Lantern</span><span className="block text-sm font-bold">{streak} {streak === 1 ? 'day' : 'days'} together</span></span>
      </button>
      {pending > 0 && (
        <button className={row} onClick={() => onAct('quests')}>
          <span className="text-xl">📋</span>
          <span className="min-w-0 flex-1"><span className="block font-display text-xs font-bold uppercase opacity-60">Quests</span><span className="block text-sm font-bold">{pending} to look at when you can</span></span>
        </button>
      )}
      {waiting.length > 0 ? (
        <>
          <div className="mt-1 font-display text-xs font-bold uppercase text-cocoa/60">Waiting for you</div>
          {waiting.map((w) => (
            <button key={w.id} className={`${row} bg-pink-50`} onClick={() => onAct(GO[w.kind])}>
              <span className="text-lg">{ICON[w.kind]}</span>
              <span className="min-w-0 flex-1 text-sm">{w.text}</span>
            </button>
          ))}
        </>
      ) : (
        <p className="mt-1 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 px-3 py-2 text-center text-sm font-bold text-cocoa">{idea}</p>
      )}
    </div>
  );
}

/** The right hand panel on wide screens. It folds away to a small pill. */
export default function TodayPanel({ open, onToggle, onAct }: { open: boolean; onToggle: () => void; onAct: (a: TodayAct) => void }) {
  const s = useGameState();
  const me = useMe();
  const n = waitingFor(s, me).length;
  if (!open) {
    return (
      <button onClick={onToggle} title="Show Today" aria-label="Show Today" className="pointer-events-auto absolute right-3 top-[76px] z-10 flex cursor-pointer items-center gap-1 rounded-full bg-cream/90 px-3 py-1.5 font-display text-sm font-bold text-cocoa shadow transition hover:bg-cream active:scale-95">
        ☀️ Today{n > 0 && <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-400 px-1 text-xs text-white">{n}</span>}
      </button>
    );
  }
  return (
    <aside aria-label="Today" className="pointer-events-auto absolute bottom-[76px] right-3 top-[76px] z-10 flex w-72 flex-col rounded-3xl bg-cream/90 p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-cocoa">☀️ Today</h2>
        <button onClick={onToggle} title="Fold away" aria-label="Fold Today away" className="cursor-pointer rounded-full bg-blush px-2.5 py-0.5 text-sm font-bold text-cocoa transition hover:brightness-95 active:scale-95">›</button>
      </div>
      <div className="olw-body min-h-0 flex-1 overflow-y-auto pr-1"><TodayContent onAct={onAct} /></div>
    </aside>
  );
}
