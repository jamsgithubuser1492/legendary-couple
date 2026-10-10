import { useState } from 'react';
import { Amount } from './Currency';
import { ArtImg } from './ItemIcon';
import { BANK, dateKey, journeyFor, legacyQuestionFor, streakOf, THEME_INFO, THEME_ORDER, tomorrowKey, type QTheme } from '../state/questions';
import { answerCheckin, dropPrompt, otherPlayer, useGameState, useMe } from '../state/store';
import Sheet, { fieldCls, primaryBtn, softBtn } from './Sheet';

export default function CheckinModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const key = dateKey();
  const today = s.checkins[key] ?? {};
  const partnerId = otherPlayer(me);
  const mine = today[me];
  const theirs = today[partnerId];
  const [text, setText] = useState('');
  const [drop, setDrop] = useState('');
  const [tab, setTab] = useState<'today' | 'library'>('today');
  const [filter, setFilter] = useState<QTheme | 'all'>('all');
  const streak = streakOf(s.checkins, key);
  const jq = journeyFor(key, s.checkins, s.customPrompts);
  const info = THEME_INFO[jq.custom ? 'Love Maps' : jq.theme];
  const done = Object.values(s.checkins).filter((c) => c.paid && !c.custom).length;
  const dropped = s.customPrompts[tomorrowKey()];
  const library = Object.entries(s.checkins)
    .filter(([, c]) => c.A && c.B)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([k, c]) => ({ k, c, theme: (c.theme ?? '') as QTheme }))
    .filter((x) => filter === 'all' || x.theme === filter);

  return (
    <Sheet title="Daily Question 💬" onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <button onClick={() => setTab('today')} className={`rounded-full px-3 py-1 font-display font-bold ${tab === 'today' ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>Today</button>
        <button onClick={() => setTab('library')} className={`rounded-full px-3 py-1 font-display font-bold ${tab === 'library' ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>Our Love Map library ({library.length || Object.values(s.checkins).filter((c) => c.A && c.B).length})</button>
      </div>

      {tab === 'today' && (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-cocoa"><ArtImg name={`ui_streak_${streak < 3 ? 1 : streak < 7 ? 2 : streak < 14 ? 3 : streak < 30 ? 4 : 5}`} size={30} /> {streak} day streak</span>
            <span className="text-cocoa/60">{streak % 7 === 0 && streak > 0 ? 'Box earned!' : `${7 - (streak % 7)} to your next box`}</span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs font-bold text-cocoa/70">
              <span>{done < 50 ? `Journey: ${Math.min(done + 1, 50)} of 50` : `Day ${done + 1} of our journey`}</span>
              <span>{done >= 50 ? '🏆 50 day journey complete' : `${50 - done} to the celebration`}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-blush"><div className="h-full rounded-full bg-pink-400" style={{ width: `${Math.min(100, (done / BANK.length) * 100)}%` }} /></div>
          </div>
          <div className={`mt-3 rounded-2xl p-4 ${info.color}`}>
            <div className="text-xs font-bold uppercase tracking-wide text-cocoa/60">{info.icon} {jq.custom ? `A secret prompt from ${s.names[jq.custom.from]}` : jq.theme}</div>
            <p className="mt-1 font-display text-lg font-bold text-cocoa">{jq.prompt}</p>
            {!jq.custom && <p className="mt-1 text-[11px] text-cocoa/60">{info.blurb} · {info.research}</p>}
          </div>

          {!mine && (
            <div className="mt-3">
              <textarea className={fieldCls} rows={3} placeholder="Your answer. It stays hidden until you both answer." value={text} onChange={(e) => setText(e.target.value)} />
              <button className={`${primaryBtn} mt-2 w-full`} disabled={!text.trim()} onClick={() => answerCheckin(me, text)}>Lock in my answer</button>
            </div>
          )}
          {mine && !theirs && (
            <p className="mt-3 rounded-xl bg-white p-3 text-center text-cocoa shadow">
              ✅ Locked in. {s.names[me]} dropped a note in the box. Waiting for {s.names[partnerId]} to answer, and then both answers open together.
            </p>
          )}
          {mine && theirs && (
            <div className="mt-3 space-y-2">
              {([me, partnerId] as const).map((p) => (
                <div key={p} className="animate-pop rounded-2xl bg-white p-3 shadow">
                  <div className="text-xs font-bold text-cocoa/60">{s.names[p]}</div>
                  <p className="text-cocoa">{today[p]}</p>
                </div>
              ))}
              <p className="rounded-xl bg-green-100 p-3 text-center text-sm text-cocoa">
                💗 <Amount kind="coin" n={15} /> <Amount kind="gem" n={2} /> earned. Now put the phone down and talk about it, on a call or in person.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-white p-3 shadow">
            <div className="font-display font-bold text-cocoa">🤫 Secret prompt for tomorrow</div>
            {dropped ? (
              <p className="mt-1 text-sm text-cocoa/70">{dropped.from === me ? 'Your prompt is waiting for tomorrow.' : `${s.names[dropped.from]} dropped a secret prompt for tomorrow. It stays a surprise.`}</p>
            ) : (
              <>
                <p className="mt-1 text-xs text-cocoa/60">Write tomorrow's question for the two of you, like "What treat should I bring home?". It stays hidden until tomorrow.</p>
                <input className={`${fieldCls} mt-2`} maxLength={160} value={drop} onChange={(e) => setDrop(e.target.value)} placeholder="Tomorrow's question" />
                <button className={`${softBtn} mt-2 w-full`} disabled={!drop.trim()} onClick={() => { if (dropPrompt(me, drop)) setDrop(''); }}>Drop it in the box</button>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'library' && (
        <>
          <p className="text-sm text-cocoa/70">Every question you have answered together lives here. Come back when you want a boost of warmth.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={() => setFilter('all')} className={`rounded-full px-3 py-1 text-xs font-bold ${filter === 'all' ? 'bg-cocoa text-cream' : 'bg-white text-cocoa'}`}>All</button>
            {[...THEME_ORDER, 'Milestone' as const].map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={`rounded-full px-3 py-1 text-xs font-bold text-cocoa ${THEME_INFO[t].color} ${filter === t ? 'ring-2 ring-pink-400' : 'opacity-75'}`}>{THEME_INFO[t].icon} {t}</button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {library.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-sm text-cocoa/70">Nothing here yet. Answer today's question together to start your library.</p>}
            {library.map(({ k, c }) => (
              <div key={k} className="rounded-xl bg-white p-3 shadow">
                <div className="flex items-center justify-between text-xs font-bold text-cocoa/60">
                  <span>{k}</span>
                  <span>{c.theme ? `${THEME_INFO[c.theme as QTheme]?.icon ?? ''} ${c.theme}` : 'Early days'}{c.n ? ` · ${c.n}` : ''}</span>
                </div>
                <p className="font-bold text-cocoa">{c.q ?? legacyQuestionFor(k)}</p>
                <p className="text-cocoa"><b>{s.names.A}:</b> {c.A}</p>
                <p className="text-cocoa"><b>{s.names.B}:</b> {c.B}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
