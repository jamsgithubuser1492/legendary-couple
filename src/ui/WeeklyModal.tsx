import { useState } from 'react';
import { claimRecap, confirmWeeklyTick, logWeeklyTick, otherPlayer, setWeeklyGoal, undoWeeklyTick, useGameState, useMe } from '../state/store';
import { dateKey, streakRun } from '../state/questions';
import { GOAL_PRESETS, hasActivity, isSunday, LADDER, lanternTier, lastWeekKey, mondayOf, nextRung, nextWeekKey, progressOf, RECAP_REWARD, recapOf, rungPrize, WEEKLY_REWARD, type Recap } from '../state/weekly';
import { Amount } from './Currency';
import { SpriteImg } from './ItemIcon';
import { useWide } from './useMedia';
import Sheet, { fieldCls, primaryBtn, softBtn, onEnter } from './Sheet';

const DUO = ['cp_d_sunset', 'cp_d_beach', 'cp_d_adventure', 'cp_d_picnic', 'cp_d_hands', 'cp_d_dance', 'cp_d_road'];
export type Tab = 'goal' | 'streak' | 'recap';
const TABS: { id: Tab; label: string }[] = [
  { id: 'goal', label: 'Couple goal' },
  { id: 'streak', label: 'Streak' },
  { id: 'recap', label: 'Recap' },
];
const fmtDay = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function Goal() {
  const s = useGameState();
  const me = useMe();
  const partner = s.names[otherPlayer(me)];
  const [next, setNext] = useState(false); // on a Sunday you can plan the coming week
  const wk = next ? nextWeekKey() : mondayOf();
  const g = s.weekly[wk];
  const today = dateKey();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(2);

  const sundayTabs = isSunday() && (
    <div className="mb-3 flex gap-2">
      <button className={`${!next ? primaryBtn : softBtn} !px-3 !py-1 text-sm`} onClick={() => setNext(false)}>This week</button>
      <button className={`${next ? primaryBtn : softBtn} !px-3 !py-1 text-sm`} onClick={() => setNext(true)}>Next week 📜</button>
    </div>
  );

  if (!g) {
    return (
      <div>
        {sundayTabs}
        <p className="text-sm text-cocoa/80">Pick one thing to do together {next ? 'next' : 'this'} week. Each time you do it, one of you logs it and the other confirms.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {GOAL_PRESETS.map((p) => (
            <button key={p.title} className={`${softBtn} !px-3 !py-1 text-sm`} onClick={() => { setTitle(p.title); setTarget(p.target); }}>{p.title} <span className="text-[10px] opacity-60">{p.area}</span></button>
          ))}
        </div>
        <input className={`${fieldCls} mt-3`} placeholder="Or write your own" aria-label="Your own weekly goal" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} onKeyDown={onEnter(() => setWeeklyGoal(me, title, target, next), !!title.trim())} />
        <div className="mt-3 flex items-center gap-3 text-cocoa">
          <span className="text-sm font-bold">Times this week</span>
          <button className={`${softBtn} !px-3 !py-1`} onClick={() => setTarget((t) => Math.max(1, t - 1))} aria-label="Fewer">−</button>
          <span className="font-display text-xl font-bold">{target}</span>
          <button className={`${softBtn} !px-3 !py-1`} onClick={() => setTarget((t) => Math.min(7, t + 1))} aria-label="More">+</button>
        </div>
        <p className="mt-3 text-xs text-cocoa/60">Finish it for <Amount kind="coin" n={WEEKLY_REWARD.coins} size={14} /> <Amount kind="gem" n={WEEKLY_REWARD.gems} size={14} /> and {WEEKLY_REWARD.shells} 🐚, plus a banner over the Town Square.</p>
        <button className={`${primaryBtn} mt-3 w-full`} disabled={!title.trim()} onClick={() => setWeeklyGoal(me, title, target, next)}>Set our goal</button>
      </div>
    );
  }

  if (next) {
    return (
      <div>
        {sundayTabs}
        <div className="rounded-2xl bg-white p-4 text-center shadow">
          <div className="text-xs font-bold uppercase text-cocoa/60">Our covenant for next week</div>
          <div className="mt-1 font-display text-lg font-bold text-cocoa">{g.title}</div>
          <div className="text-sm text-cocoa/70">{g.target} times together</div>
        </div>
        <p className="mt-3 text-center text-xs text-cocoa/60">It becomes active on Monday. Sleep well, and enjoy the Sunday.</p>
      </div>
    );
  }
  const done = progressOf(g);
  const todayTick = g.ticks.find((t) => t.day === today);
  const waiting = g.ticks.filter((t) => !t.ok && t.by !== me);
  return (
    <div>
      {sundayTabs}
      <div className="rounded-2xl bg-white p-4 text-center shadow">
        <div className="font-display text-lg font-bold text-cocoa">{g.title}</div>
        <div className="mt-2 flex justify-center gap-2">
          {Array.from({ length: g.target }, (_, i) => (
            <span key={i} className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${i < done ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa/40'}`}>{i < done ? '♥' : '♡'}</span>
          ))}
        </div>
        <div className="mt-1 text-sm text-cocoa/70">{done} of {g.target} done</div>
        {g.paid && <div className="mt-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">Goal complete. Reward paid 🎉</div>}
      </div>

      {waiting.map((t) => (
        <div key={t.day} className="mt-3 rounded-2xl bg-peach/60 p-3 text-sm text-cocoa">
          <b>{s.names[t.by]}</b> says you did this on {fmtDay(t.day)}.
          <button className={`${primaryBtn} ml-2 !px-4 !py-1`} onClick={() => confirmWeeklyTick(me, t.day)}>We did!</button>
        </div>
      ))}

      {!g.paid && !todayTick && <button className={`${primaryBtn} mt-3 w-full`} onClick={() => logWeeklyTick(me)}>We did it today</button>}
      {!g.paid && todayTick && !todayTick.ok && todayTick.by === me && (
        <div className="mt-3 text-center text-sm text-cocoa/70">
          Waiting for {partner} to confirm.
          <button className={`${softBtn} ml-2 !px-3 !py-1`} onClick={() => undoWeeklyTick(me, today)}>Undo</button>
        </div>
      )}
      <p className="mt-3 text-center text-xs text-cocoa/60">One tick a day. Reward: <Amount kind="coin" n={WEEKLY_REWARD.coins} size={13} /> <Amount kind="gem" n={WEEKLY_REWARD.gems} size={13} /> {WEEKLY_REWARD.shells} 🐚 and a banner over the Town Square</p>
    </div>
  );
}

function Streak() {
  const s = useGameState();
  const run = streakRun(s.checkins, dateKey(), s.ladder.frozen);
  const nxt = nextRung(run.n);
  const month = dateKey().slice(0, 7);
  const freezeUsed = s.ladder.frozen.some((f) => f.startsWith(month));
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 text-center">
        <div className="font-display text-4xl font-bold text-cocoa">🏮 {run.n}</div>
        <div className="text-xs text-cocoa/60">{['The lantern is waiting to be lit', 'Pastel blue flame', 'Soft pink flame', 'Golden sparkle', 'Radiant rainbow aura'][lanternTier(run.n)]}</div>
        <div className="text-sm text-cocoa/70">{run.n === 1 ? 'day' : 'days'} in a row answering the daily question together</div>
        {nxt && <div className="mt-1 text-xs text-cocoa/60">{nxt.days - run.n} more to reach {nxt.label}</div>}
      </div>
      <ul className="mt-3 space-y-2">
        {LADDER.map((r) => {
          const got = run.n >= r.days;
          return (
            <li key={r.days} className={`flex items-center justify-between rounded-2xl px-3 py-2 ${got ? 'bg-emerald-50' : 'bg-white'} shadow`}>
              <span className="text-sm font-bold text-cocoa">{got ? '✅' : '🔒'} {r.days} days · {r.label}{rungPrize(r) ? <span className="block text-[11px] font-normal text-cocoa/60">{rungPrize(r)}</span> : null}</span>
              <span className="text-sm text-cocoa"><Amount kind="coin" n={r.coins} size={14} /> <Amount kind="gem" n={r.gems} size={14} /></span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-cocoa/60">
        Each rung pays once per run. Your Grace Shield: once a month a missed day is forgiven automatically, so a busy day never erases your streak. {freezeUsed ? '🛡️ This month’s shield is used.' : '🛡️ This month’s shield is ready.'}
      </p>
    </div>
  );
}

function Stat({ icon, n, label }: { icon: string; n: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow">
      <div className="text-xl">{icon}</div>
      <div className="font-display text-2xl font-bold text-cocoa">{n}</div>
      <div className="text-xs text-cocoa/70">{label}</div>
    </div>
  );
}

function RecapCard({ r }: { r: Recap }) {
  const s = useGameState();
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Stat icon="💬" n={r.checkins} label="Daily questions" />
        <Stat icon="🎯" n={r.goals} label="Goals approved" />
        <Stat icon="💌" n={r.notes} label="Gratitude notes" />
        <Stat icon="📔" n={r.memories} label="Memories saved" />
        <Stat icon="🔥" n={r.whispers} label="Fireside whispers" />
        <Stat icon="💞" n={progressOf(r.goal)} label={r.goal ? `Couple goal (${r.goal.target})` : 'Couple goal'} />
      </div>
      {r.goal && <p className="mt-3 text-center text-sm text-cocoa">Our goal: <b>{r.goal.title}</b> {r.goal.paid ? '✅ complete' : `(${progressOf(r.goal)} of ${r.goal.target})`}</p>}
      {r.quote && <p className="mt-3 rounded-2xl bg-white p-3 text-center text-sm italic text-cocoa shadow">“{r.quote.text}”{" "}<span className="not-italic text-cocoa/60">from {s.names[r.quote.from]}</span></p>}
    </div>
  );
}

function Recap() {
  const s = useGameState();
  const cur = mondayOf();
  const last = lastWeekKey();
  const [which, setWhich] = useState<'last' | 'this'>('last');
  const wk = which === 'last' ? last : cur;
  const claimed = s.recapClaimed.includes(last);
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button className={`${which === 'last' ? primaryBtn : softBtn} !px-4 !py-1 text-sm`} onClick={() => setWhich('last')}>Last week</button>
        <button className={`${which === 'this' ? primaryBtn : softBtn} !px-4 !py-1 text-sm`} onClick={() => setWhich('this')}>This week so far</button>
      </div>
      <div className="mb-2 text-center"><SpriteImg sprite={DUO[Math.abs(wk.charCodeAt(8) + wk.charCodeAt(9)) % DUO.length]} size={96} /></div>
      <RecapCard r={recapOf(s, wk)} />
      {which === 'last' && (
        <button className={`${primaryBtn} mt-4 w-full`} disabled={claimed || !hasActivity(recapOf(s, last))} onClick={claimRecap}>
          {claimed ? 'Recap bonus taken ✓' : `Look back together: +${RECAP_REWARD.coins} coins +${RECAP_REWARD.shells} shells`}
        </button>
      )}
    </div>
  );
}

export default function WeeklyModal({ onClose, tab: first = 'goal' }: { onClose: () => void; tab?: Tab }) {
  const [tab, setTab] = useState<Tab>(first);
  const wide = useWide();
  if (wide) {
    // a wide window shows the week as a whole: the goal and the streak on the left, the recap on the right
    const h = 'mb-2 font-display text-lg font-bold text-cocoa';
    return (
      <Sheet title="Our Week 📅" onClose={onClose} size="xl">
        <div className="grid grid-cols-2 gap-8">
          <section aria-label="Our weekly goal">
            <h3 className={h}>Our goal</h3>
            <Goal />
            <h3 className={`${h} mt-6`}>Streak ladder</h3>
            <Streak />
          </section>
          <section aria-label="Weekly recap">
            <h3 className={h}>Recap</h3>
            <Recap />
          </section>
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title="Our Week 📅" onClose={onClose}>
      <div className="mb-3 flex gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`${tab === t.id ? primaryBtn : softBtn} !px-4 !py-1 text-sm`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === 'goal' && <Goal />}
      {tab === 'streak' && <Streak />}
      {tab === 'recap' && <Recap />}
    </Sheet>
  );
}
