import { useState } from 'react';
import { crewDef, linesFor, memberOf, promotionNeeds, type FeedbackKind } from '../state/crew';
import { dateKey } from '../state/questions';
import { giveFeedback, useGameState, useMe } from '../state/store';
import { Art, emoteKeys, friendly } from './crewArt';
import Sheet, { softBtn } from './Sheet';

/** A calm moment with one crew member: pick one kind, specific line to tell them. Praise and Coaching are once a day each. */
export default function MentorMoment({ staff, onClose }: { staff: string; onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const def = crewDef(staff);
  const m = memberOf(s, staff);
  const [kind, setKind] = useState<FeedbackKind>('praise');
  const [note, setNote] = useState('');
  const [pop, setPop] = useState(0);
  const [mood, setMood] = useState('idle');
  if (!def || !m) return null;
  const day = dateKey();
  const done = (k: FeedbackKind) => (k === 'praise' ? m.praiseDay : m.coachDay) === day;
  const needs = promotionNeeds(m);
  const lines = linesFor(staff, kind);
  const give = (id: string) => {
    const r = giveFeedback(staff, kind, id, me);
    if (!r.ok) { setNote(friendly(r.reason)); return; }
    setMood(kind === 'praise' ? 'happy' : 'idle');
    setPop((n) => n + 1);
    setNote(`${r.text ?? ''}${r.ready ? ` ${def.name} is ready for a promotion!` : ''}`.trim());
  };
  const tab = (k: FeedbackKind, label: string) => (
    <button
      key={k}
      role="tab"
      aria-selected={kind === k}
      onClick={() => { setKind(k); setNote(''); }}
      className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 font-display text-sm font-bold transition active:scale-95 ${kind === k ? 'bg-pink-400 text-white shadow' : 'bg-blush text-cocoa hover:brightness-95'}`}
    >
      {label}{done(k) ? ' ✓' : ''}
    </button>
  );
  return (
    <Sheet title={`Mentor moment with ${def.name}`} onClose={onClose} size="sm">
      <div className="flex items-end gap-3 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3">
        <div className="relative h-28 w-20 shrink-0">
          <Art keys={emoteKeys(staff, mood, m.level)} className="mx-auto h-full w-auto object-contain" />
          {pop > 0 && <span key={pop} className="animate-pop absolute -right-1 top-0 text-2xl" aria-hidden>💗</span>}
        </div>
        <p className="min-w-0 flex-1 text-sm text-cocoa">
          Kind, specific words help a team grow. Pick one thing to tell {def.name}. {def.name} will remember it.
        </p>
      </div>
      <div role="tablist" aria-label="Kind of moment" className="mt-3 flex gap-2">
        {tab('praise', 'Praise')}
        {tab('coach', 'Coaching')}
      </div>
      <p className="mt-2 text-xs text-cocoa/70">
        {kind === 'praise' ? 'Say what you noticed and thank them for it.' : 'A gentle idea to try together, never a criticism.'} One of each a day for each crew member.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {lines.map((l) => (
          <button
            key={l.id}
            disabled={done(kind)}
            onClick={() => give(l.id)}
            className="cursor-pointer rounded-2xl bg-white p-3 text-left text-sm text-cocoa shadow transition hover:bg-pink-50 active:scale-[0.99] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-white"
          >
            {l.skill === def.skill && <span className="mr-1 text-[10px] font-bold uppercase text-pink-500">Fits {def.name}</span>}
            <span className="block">“{l.text}”</span>
          </button>
        ))}
      </div>
      {done(kind) && <p className="mt-2 rounded-xl bg-white p-2 text-center text-xs text-cocoa/80">Today's {kind === 'praise' ? 'Praise' : 'Coaching'} for {def.name} is done. Come back tomorrow, or try the other tab.</p>}
      {note && <p role="status" className="mt-2 rounded-xl bg-emerald-50 p-2 text-center text-sm font-bold text-emerald-800">{note}</p>}
      <div className="mt-3 rounded-2xl bg-white p-3 text-xs text-cocoa/80 shadow">
        <b className="font-display text-sm text-cocoa">Toward a promotion</b>
        <p className="mt-1">A promotion needs a full experience bar, one Praise and one Coaching moment. It is nicest when you each give one.</p>
        <ul className="mt-1 flex flex-wrap gap-2">
          <li className={`rounded-full px-2 py-0.5 ${m.praised ? 'bg-emerald-100 text-emerald-800' : 'bg-blush'}`}>{m.praised ? '✓' : '○'} Praise</li>
          <li className={`rounded-full px-2 py-0.5 ${m.coached ? 'bg-emerald-100 text-emerald-800' : 'bg-blush'}`}>{m.coached ? '✓' : '○'} Coaching</li>
          <li className={`rounded-full px-2 py-0.5 ${needs.xp ? 'bg-blush' : 'bg-emerald-100 text-emerald-800'}`}>{needs.xp ? '○' : '✓'} Experience</li>
        </ul>
      </div>
      <button className={`${softBtn} mt-3 w-full`} onClick={onClose}>Done</button>
    </Sheet>
  );
}
