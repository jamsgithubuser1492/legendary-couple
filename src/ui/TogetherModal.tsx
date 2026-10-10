import { useEffect, useState } from 'react';
import { Amount } from './Currency';
import { ADVENTURES, adventureFor, BIDS, LOVE_QUESTIONS, loveSet, TIERS, weekKey, type BidKind } from '../state/together';
import { dateKey } from '../state/questions';
import {
  acceptAdventure, answerWhisper, dropNote, openNote, otherPlayer, rollAdventure, sendBid, startWhisper,
  submitLoveAnswers, submitLoveGuesses, turnToward, useGameState, useMe,
} from '../state/store';
import { itemOf } from '../state/catalog';
import type { MessageKind, PlayerId } from '../types';
import ItemIcon, { ArtImg } from './ItemIcon';
import Sheet, { fieldCls, primaryBtn, softBtn } from './Sheet';

export type TogetherTab = 'whisper' | 'reach' | 'adventure' | 'lovemap' | 'gratitude' | 'log';
const TABS: { id: TogetherTab; icon: string; label: string }[] = [
  { id: 'whisper', icon: '🔥', label: 'Fireside' },
  { id: 'reach', icon: '👋', label: 'Reach out' },
  { id: 'adventure', icon: '🧭', label: 'Adventure' },
  { id: 'lovemap', icon: '🗺️', label: 'Love map' },
  { id: 'gratitude', icon: '🌳', label: 'Gratitude' },
  { id: 'log', icon: '📜', label: 'Log' },
];

const card = 'rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 font-display text-lg font-bold text-cocoa';

function Whisper() {
  const s = useGameState();
  const me = useMe();
  const [text, setText] = useState('');
  const day = dateKey();
  const w = s.whispers[day];
  const partner = s.names[otherPlayer(me)];
  const glowing = s.glowUntil > Date.now();
  if (!w) {
    return (
      <>
        <div className="mb-2 flex items-end justify-center gap-3 rounded-2xl bg-gradient-to-b from-indigo-900 to-indigo-700 p-3">
          <ArtImg name="fx_star_2" size={22} className="animate-pulse" /><ArtImg name="prop_campfire" size={84} /><ArtImg name="fx_star_5" size={26} className="animate-pulse" />
        </div>
        <p className="text-sm text-cocoa/80">Sit by the fire and answer one question each. Answers stay hidden until you both answer. Pick how deep tonight goes.</p>
        <div className="mt-3 grid gap-2">
          {TIERS.map((t) => (
            <button key={t.id} className={`${softBtn} text-left`} onClick={() => startWhisper(t.id)}><ArtImg name={`ui_whisper_${t.id === 'medium' ? 'med' : t.id}`} size={34} className="mr-2" /> {t.icon} {t.label} <span className="font-normal text-cocoa/60">· {t.blurb}</span></button>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <div className="text-xs font-bold text-cocoa/60">{TIERS.find((t) => t.id === w.tier)?.icon} {w.tier} question</div>
      <p className={card}>{w.q}</p>
      {!w[me] && (
        <div className="mt-3">
          <textarea className={fieldCls} rows={3} placeholder="Your honest answer" value={text} onChange={(e) => setText(e.target.value)} />
          <button className={`${primaryBtn} mt-2 w-full`} disabled={!text.trim()} onClick={() => answerWhisper(me, text)}>Whisper it</button>
        </div>
      )}
      {w[me] && !w[otherPlayer(me)] && <p className="mt-3 rounded-xl bg-white p-3 text-center text-cocoa shadow">✅ Locked in. Waiting for {partner} to whisper theirs.</p>}
      {w.A && w.B && (
        <div className="mt-3 space-y-2">
          {([me, otherPlayer(me)] as const).map((p) => (
            <div key={p} className="rounded-2xl bg-white p-3 shadow"><div className="text-xs font-bold text-cocoa/60">{s.names[p]}</div><p className="text-cocoa">{w[p]}</p></div>
          ))}
          <p className="rounded-xl bg-green-100 p-3 text-center text-sm text-cocoa">🐚 2 Heart Shells earned. Look up: your island has a starry glow tonight. Now talk about it. 💞</p>
        </div>
      )}
      {glowing && <p className="mt-2 text-center text-xs text-cocoa/60">✨ Starry fireside glow is active on your island.</p>}
    </>
  );
}

function Reach() {
  const s = useGameState();
  const me = useMe();
  const st = s.bidStats;
  const rate = st.sent ? Math.round((st.turned / st.sent) * 100) : 0;
  return (
    <>
      <p className="text-sm text-cocoa/80">A small bid for connection. When {s.names[otherPlayer(me)]} turns toward it within 30 seconds, you both get a Connected aura and 5 coins each. Best when you are both on.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {BIDS.map((b) => (
          <button key={b.id} className="flex flex-col items-center rounded-2xl bg-white p-3 shadow active:scale-95" onClick={() => sendBid(me, b.id as BidKind)}>
            <ArtImg name={`ui_bid_${b.id}_2`} size={64} /><span className="mt-1 font-display text-sm font-bold text-cocoa">{b.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-white p-3 text-center text-sm text-cocoa shadow">You have sent {st.sent} bids and been turned toward {st.turned} times{st.sent > 0 && ` (${rate}%)`}. Healthy couples turn toward each other most of the time.</p>
    </>
  );
}

function Adventure() {
  const s = useGameState();
  const me = useMe();
  const wk = weekKey();
  const cur = s.adventures[wk] ?? { rolls: 0 };
  const adv = adventureFor(wk, cur.rolls);
  const quest = s.quests.find((q) => q.id === cur.questId);
  const cap = itemOf(adv.capsule);
  return (
    <>
      <p className="text-sm text-cocoa/80">Novelty keeps a relationship alive. Each week, try something new together in real life. Your partner verifies it, then a Travel Capsule builds a miniature of the memory on your island.</p>
      <p className={`${card} mt-3`}>{adv.title}</p>
      <p className="mt-1 text-sm text-cocoa/70">{adv.blurb}</p>
      <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white p-3 shadow">
        {cap && <ItemIcon id={cap.id} size={44} />}
        <div className="text-sm text-cocoa"><b>Travel Capsule:</b> {cap?.name}<div className="text-xs text-cocoa/60">+ <Amount kind="coin" n={60} /> and <Amount kind="gem" n={10} /> when approved</div></div>
      </div>
      {cur.questId ? (
        <p className="mt-3 rounded-xl bg-green-100 p-3 text-center text-sm text-cocoa">📋 Accepted. {quest?.status === 'APPROVED' ? 'Completed! Your capsule is in your bag.' : 'Find it on your Quest Board.'}</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button className={`${softBtn} flex-1`} onClick={rollAdventure}>🎲 Mystery date</button>
          <button className={`${primaryBtn} flex-1`} onClick={() => acceptAdventure(me)}>Accept</button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">{Array.from({ length: 9 }, (_, i) => <ArtImg key={i} name={`ui_reveal_${i + 1}`} size={34} className="rounded-lg shadow" />)}</div>
      <p className="mt-2 text-center text-xs text-cocoa/50">{ADVENTURES.length} adventures and counting. A new week brings a new one.</p>
    </>
  );
}

function LoveMap() {
  const s = useGameState();
  const me = useMe();
  const partnerId = otherPlayer(me);
  const partner = s.names[partnerId];
  const wk = weekKey();
  const set = loveSet(wk);
  const r = s.lovemap[wk] ?? { answers: {}, guesses: {} };
  const [pick, setPick] = useState<number[]>([-1, -1, -1]);
  const full = pick.every((n) => n >= 0);
  const chips = (i: number, label: string) => (
    <div key={i} className="mt-3">
      <div className="font-display font-bold text-cocoa">{label}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {LOVE_QUESTIONS[set[i]].options.map((o, k) => (
          <button key={o} onClick={() => setPick(pick.map((v, j) => (j === i ? k : v)))} className={`rounded-full px-3 py-1 text-sm ${pick[i] === k ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>{o}</button>
        ))}
      </div>
    </div>
  );
  const myAns = r.answers[me], theirAns = r.answers[partnerId], myGuess = r.guesses[me];
  const hearts = myGuess && theirAns ? myGuess.filter((g, i) => g === theirAns[i]).length : 0;
  const header = (
    <div className="mb-2 flex items-center justify-center gap-4 rounded-2xl bg-gradient-to-b from-pink-100 to-amber-50 p-3">
      <ArtImg name="ui_lovemap_card" size={96} />
      <div className="text-center"><div className="flex justify-center gap-1">{[0, 1, 2].map((i) => <span key={i} className={i < hearts ? '' : 'opacity-25 grayscale'}><ArtImg name="ui_quad_romance" size={26} /></span>)}</div><div className="mt-1 text-xs text-cocoa/70">This week's Love Map</div></div>
    </div>
  );
  if (!myAns) {
    return (
      <>
        {header}
        <p className="text-sm text-cocoa/80">Three quick questions about how you are feeling this week. Then {partner} tries to guess your answers.</p>
        {set.map((qi, i) => chips(i, LOVE_QUESTIONS[qi].q))}
        <button className={`${primaryBtn} mt-4 w-full`} disabled={!full} onClick={() => { submitLoveAnswers(me, pick); setPick([-1, -1, -1]); }}>Save my answers</button>
      </>
    );
  }
  if (!theirAns) return <><>{header}</><p className="rounded-xl bg-white p-3 text-center text-cocoa shadow">✅ Your answers are saved. Waiting for {partner} to answer theirs.</p></>;
  if (!myGuess) {
    return (
      <>
        {header}
        <p className="text-sm text-cocoa/80">How did {partner} answer? Each right guess earns 2 Heart Shells. Wrong guesses show the truth and add a gesture quest.</p>
        {set.map((qi, i) => chips(i, LOVE_QUESTIONS[qi].q))}
        <button className={`${primaryBtn} mt-4 w-full`} disabled={!full} onClick={() => { submitLoveGuesses(me, pick); setPick([-1, -1, -1]); }}>Lock in my guesses</button>
      </>
    );
  }
  const right = myGuess.filter((g, i) => g === theirAns[i]).length;
  return (
    <>
      {header}
      <p className={card}>You got {right} of 3 about {partner}! 🐚 +{right * 2}</p>
      <div className="mt-3 space-y-2">
        {set.map((qi, i) => (
          <div key={i} className="rounded-2xl bg-white p-3 shadow text-sm text-cocoa">
            <div className="font-bold">{LOVE_QUESTIONS[qi].q}</div>
            <div>{partner} said <b>{LOVE_QUESTIONS[qi].options[theirAns[i]]}</b>. {myGuess[i] === theirAns[i] ? '✅ You knew it.' : `❌ You guessed ${LOVE_QUESTIONS[qi].options[myGuess[i]]}.`}</div>
          </div>
        ))}
      </div>
      {right < 3 && <p className="mt-2 rounded-xl bg-peach p-3 text-sm text-cocoa">📋 A Thoughtful Gesture quest was added to your board, based on what you missed.</p>}
    </>
  );
}

function Gratitude() {
  const s = useGameState();
  const me = useMe();
  const [text, setText] = useState('');
  const day = dateKey();
  const done = s.gratitude.some((n) => n.from === me && n.day === day);
  const n = s.gratitude.length;
  const stage = n === 0 ? 'A little sapling' : n < 10 ? 'Sprouting leaves' : n < 20 ? 'Full of green' : 'In blossom 🌸';
  const theirs = s.gratitude.filter((x) => x.from !== me).slice().reverse();
  return (
    <>
      <div className="rounded-2xl bg-gradient-to-b from-sky to-green-100 p-3 text-center">
        <div className="flex items-end justify-center gap-3"><ArtImg name={n > 0 ? 'prop_jar_full' : 'prop_jar_closed'} size={64} /><span className="text-5xl">{n < 10 ? '🌱' : n < 20 ? '🌳' : '🌸'}</span></div>
        <div className="font-display font-bold text-cocoa">{stage}</div>
        <div className="text-xs text-cocoa/70">{n} thank you notes. It also grows on your island.</div>
      </div>
      {done ? (
        <p className="mt-3 rounded-xl bg-green-100 p-3 text-center text-sm text-cocoa">🍃 You dropped today's note. Come back tomorrow.</p>
      ) : (
        <div className="mt-3">
          <input className={fieldCls} maxLength={140} placeholder="Thanks for making coffee this morning" value={text} onChange={(e) => setText(e.target.value)} />
          <button className={`${primaryBtn} mt-2 w-full`} disabled={!text.trim()} onClick={() => { if (dropNote(me, text)) setText(''); }}>Drop a thank you</button>
        </div>
      )}
      <div className="mt-3 space-y-2">
        {theirs.map((x) => (
          <div key={x.id} className="rounded-2xl bg-white p-3 shadow">
            {x.opened ? (
              <><div className="text-xs font-bold text-cocoa/60">{s.names[x.from]} · {x.day}</div><p className="text-cocoa">{x.text}</p></>
            ) : (
              <button className="flex w-full items-center justify-between text-cocoa" onClick={() => openNote(me, x.id)}>
                <span>💌 A note from {s.names[x.from]}</span><span className="rounded-full bg-pink-400 px-3 py-1 font-display text-sm font-bold text-white">Open</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-cocoa/50">Opening a note earns a Heart Shell, and every third one unlocks floral decor.</p>
    </>
  );
}

const KIND: Record<MessageKind, { icon: string; label: string }> = {
  daily: { icon: '💬', label: 'Daily question' },
  whisper: { icon: '🔥', label: 'Fireside' },
  gratitude: { icon: '🌳', label: 'Thank you' },
  memory: { icon: '📔', label: 'Memory' },
  evidence: { icon: '📋', label: 'Quest note' },
  review: { icon: '🔎', label: 'Review note' },
  bottle: { icon: '🍾', label: 'Bottle' },
};
const fmtDay = (ts: number) => new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** Everything either of you has written, newest first. Sealed messages stay hidden until they are unlocked. */
function Log() {
  const s = useGameState();
  const me = useMe();
  const [who, setWho] = useState<'all' | PlayerId>('all');
  const [kind, setKind] = useState<'all' | MessageKind>('all');
  const visible = (m: (typeof s.messages)[number]) => {
    if (m.from === me) return true;
    if (m.kind === 'daily') return !!s.checkins[m.ref ?? '']?.paid;
    if (m.kind === 'whisper') return !!s.whispers[m.ref ?? '']?.paid;
    if (m.kind === 'bottle') return Date.now() - m.ts > 12 * 3600 * 1000; // sealed until tomorrow
    if (m.kind === 'gratitude') return !!s.gratitude.find((n) => n.id === m.ref)?.opened;
    return true;
  };
  const list = s.messages
    .filter(visible)
    .filter((m) => (who === 'all' || m.from === who) && (kind === 'all' || m.kind === kind))
    .slice()
    .reverse();
  const groups: { day: string; items: typeof list }[] = [];
  for (const m of list) {
    const day = fmtDay(m.ts);
    const g = groups[groups.length - 1];
    if (g && g.day === day) g.items.push(m);
    else groups.push({ day, items: [m] });
  }
  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1 text-xs font-bold ${on ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`;
  return (
    <>
      <div className="flex gap-1 overflow-x-auto">
        <button className={chip(who === 'all')} onClick={() => setWho('all')}>Both</button>
        {(['A', 'B'] as const).map((p) => <button key={p} className={chip(who === p)} onClick={() => setWho(p)}>{s.names[p]}</button>)}
      </div>
      <div className="mt-1 flex gap-1 overflow-x-auto">
        <button className={chip(kind === 'all')} onClick={() => setKind('all')}>All</button>
        {(Object.keys(KIND) as MessageKind[]).map((k) => <button key={k} className={chip(kind === k)} onClick={() => setKind(k)}>{KIND[k].icon} {KIND[k].label}</button>)}
      </div>
      {list.length === 0 && <p className="py-8 text-center text-cocoa/60">Nothing here yet. Answer a daily question, whisper by the fire or leave a thank you, and it will be kept here. 💞</p>}
      {groups.map((g) => (
        <div key={g.day} className="mt-3">
          <div className="text-xs font-bold uppercase text-cocoa/50">{g.day}</div>
          <div className="mt-1 space-y-2">
            {g.items.map((m) => (
              <div key={m.id} className={`rounded-2xl p-3 shadow ${m.from === 'A' ? 'bg-white' : 'bg-pink-50'}`}>
                <div className="flex items-center justify-between text-xs text-cocoa/60">
                  <span className="font-bold text-cocoa">{s.names[m.from]}</span>
                  <span>{KIND[m.kind].icon} {KIND[m.kind].label} · {fmtTime(m.ts)}</span>
                </div>
                {m.ctx && <div className="mt-0.5 text-xs italic text-cocoa/60">{m.ctx}</div>}
                <p className="mt-1 text-cocoa">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function TogetherModal({ tab, onTab, onClose }: { tab: TogetherTab; onTab: (t: TogetherTab) => void; onClose: () => void }) {
  const s = useGameState();
  return (
    <Sheet title="Together 💞" onClose={onClose}>
      <div className="mb-2 text-right text-sm font-bold text-cocoa">🐚 {s.shells} Heart Shells</div>
      <div className="mb-3 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => onTab(t.id)} className={`shrink-0 rounded-full px-3 py-1.5 font-display text-sm font-bold ${tab === t.id ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>{t.icon} {t.label}</button>
        ))}
      </div>
      {tab === 'whisper' && <Whisper />}
      {tab === 'reach' && <Reach />}
      {tab === 'adventure' && <Adventure />}
      {tab === 'lovemap' && <LoveMap />}
      {tab === 'gratitude' && <Gratitude />}
      {tab === 'log' && <Log />}
    </Sheet>
  );
}

/** Appears for the partner who received a bid, with a 30 second window to turn toward it. */
export function BidBanner() {
  const s = useGameState();
  const me = useMe();
  const [now, setNow] = useState(Date.now());
  const b = s.bid;
  const live = !!b && !b.turned && b.from !== me && now - b.ts < 30000;
  useTicker(!!b && !b.turned, () => setNow(Date.now()));
  if (!b || !live) return null;
  const info = BIDS.find((x) => x.id === b.kind)!;
  return (
    <div className="absolute inset-x-0 top-16 z-30 flex justify-center px-4">
      <div className="animate-pop flex items-center gap-3 rounded-2xl bg-cream px-4 py-3 shadow-2xl">
        <ArtImg name={`ui_bid_${b.kind}_4`} size={52} />
        <div className="font-display text-sm font-bold text-cocoa">{s.names[b.from]} {info.text}<div className="text-xs font-normal text-cocoa/60">{Math.max(0, 30 - Math.floor((now - b.ts) / 1000))}s left</div></div>
        <button className={primaryBtn} onClick={() => turnToward(me)}>Turn towards 💞</button>
      </div>
    </div>
  );
}

function useTicker(active: boolean, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const id = setInterval(fn, 1000);
    return () => clearInterval(id);
  }, [active, fn]);
}
