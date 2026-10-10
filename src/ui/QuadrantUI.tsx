import { useEffect, useState } from 'react';
import Sheet, { fieldCls, primaryBtn, softBtn } from './Sheet';
import { CurrencyIcon } from './Currency';
import { shrinkImage } from './imageUtil';
import { ArtImg } from './ItemIcon';
import { BUS, gameBus } from '../game/events';
import {
  buildBlueprint, cancelFocus, depositVault, finishFocus, focusActive, nextExpansion, openBottle, sealBottle, sendTea, startFocus, useGameState, useMe,
} from '../state/store';
import { BLUEPRINTS, FOCUS_COINS, FOCUS_MS, SYNERGY_MULT, TEA_COINS, otherP } from '../state/quadrants';
import { dateKey } from '../state/questions';
import type { SealedBottle } from '../types';

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
function useNow(every = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(t);
  }, [every]);
  return now;
}

/** "Today's Synergy" strip under the top bar. */
export function SynergyBanner() {
  const s = useGameState();
  const me = useMe();
  const now = useNow(15000);
  const partner = otherP(me);
  const done = s.healthDays[dateKey()] ?? [];
  if (now < s.synergyUntil) {
    const h = Math.ceil((s.synergyUntil - now) / 3600000);
    return <div className="pointer-events-none mx-auto mt-1 w-fit rounded-full bg-gradient-to-r from-green-200 to-amber-200 px-4 py-1 text-center font-display text-xs font-bold text-cocoa shadow">☀️ Today’s Synergy: Health Boost active! {SYNERGY_MULT}x coins for {h}h</div>;
  }
  if (done.length === 1) {
    const who = done[0];
    return <div className="pointer-events-none mx-auto mt-1 w-fit rounded-full bg-green-100/95 px-4 py-1 text-center font-display text-xs font-bold text-cocoa shadow">🍃 {s.names[who]} finished a health goal. {who === me ? `Cheer ${s.names[partner]} on to unlock Synergy!` : 'Your turn to unlock Synergy!'}</div>;
  }
  return null;
}

/** While you are in a Deep Work session the whole game is locked. */
export function FocusOverlay() {
  const s = useGameState();
  const me = useMe();
  const now = useNow(1000);
  const f = s.focus[me];
  const active = !!f && !f.paid && now < f.until;
  const due = !!f && !f.paid && now >= f.until;
  const [reward, setReward] = useState<{ coins: number; teas: number } | null>(null);
  useEffect(() => {
    if (due) {
      const r = finishFocus(me);
      if (r) setReward(r);
    }
  }, [due, me]);
  if (reward)
    return (
      <Sheet title="🏮 Deep work complete" onClose={() => setReward(null)}>
        <p className="text-center text-cocoa">Lovely focus. You earned <b>{reward.coins}</b> <CurrencyIcon kind="coin" size={18} />{reward.teas > 0 && ` including ${reward.teas * TEA_COINS} from a warm cup of tea 🍵`}.</p>
        <button className={`${primaryBtn} mt-3 w-full`} onClick={() => setReward(null)}>Back to our world</button>
      </Sheet>
    );
  if (!active || !f) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-cocoa/70 p-6 text-center text-white backdrop-blur-sm">
      <div className="animate-pulse text-7xl">🏮</div>
      <div className="font-display text-6xl font-bold tabular-nums">{clock(f.until - now)}</div>
      <p className="max-w-xs font-display text-lg">Deep work. Your avatar is resting by the lantern and the game is locked until the timer ends.</p>
      {f.teas > 0 && <p className="rounded-full bg-white/20 px-4 py-1 text-sm">🍵 {s.names[otherP(me)]} sent you a warm cup of tea</p>}
      <button className="mt-4 text-sm underline opacity-70" onClick={() => { if (confirm('End early? You will not get the focus reward.')) cancelFocus(me); }}>End early</button>
    </div>
  );
}

/** Partner’s tea prompt when the other person is focusing. */
export function TeaPrompt() {
  const s = useGameState();
  const me = useMe();
  const now = useNow(1000);
  const p = otherP(me);
  const f = s.focus[p];
  if (!f || f.paid || now >= f.until) return null;
  return (
    <div className="pointer-events-auto mx-auto mt-1 flex w-fit items-center gap-2 rounded-full bg-cream/95 px-4 py-2 shadow-xl">
      <span className="font-display text-sm font-bold text-cocoa">🏮 {s.names[p]} is focusing ({clock(f.until - now)})</span>
      <button className={`${softBtn} !px-3 !py-1 text-sm`} disabled={f.teas > 0} onClick={() => sendTea(me)}>{f.teas > 0 ? '🍵 Tea sent' : '🍵 Send tea'}</button>
    </div>
  );
}

const hsl = (h: number) => `hsl(${h} 55% 72%)`;

function Bookshelf() {
  const s = useGameState();
  const [open, setOpen] = useState<string | null>(null);
  const book = s.library.find((b) => b.id === open);
  const n = s.library.length;
  const speak = (t: string) => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(t));
    } catch {
      /* no speech on this device */
    }
  };
  return (
    <div>
      <p className="mb-2 text-sm text-cocoa/80">Every learning goal your partner approves adds a book or scroll. Tap one to hear the Key Takeaway read aloud.</p>
      {s.library.length === 0 && <p className="rounded-xl bg-white p-4 text-center text-sm text-cocoa/70">The shelf is empty. Finish a 📚 Learning goal with a Key Takeaway to place the first book.</p>}
      <img src={`${import.meta.env.BASE_URL}assets/sprites/mech_bookshelf_${n === 0 ? 1 : n < 3 ? 2 : n < 6 ? 3 : n < 12 ? 4 : 5}.png`} alt="Wisdom Bookshelf" className="mx-auto mb-3 max-h-40 object-contain" draggable={false} />
      <div className="flex flex-wrap items-end gap-1 rounded-xl bg-[#d9b88a] p-3">
        {s.library.map((b) => (
          <button key={b.id} onClick={() => { setOpen(b.id); speak(`${s.names[b.from]} learned: ${b.text}`); }} title={b.title}
            className={`flex ${b.kind === 'book' ? 'h-16 w-6 rounded-sm' : 'h-6 w-16 rounded-full'} items-center justify-center text-[10px] shadow active:scale-95`} style={{ background: hsl(b.hue) }}>
            {b.kind === 'scroll' ? '📜' : ''}
          </button>
        ))}
      </div>
      {book && (
        <div className="mt-3 rounded-2xl bg-white p-3 text-cocoa shadow">
          <div className="text-xs opacity-60">{s.names[book.from]} · {book.title}</div>
          <p className="mt-1 font-display">“{book.text}”</p>
          <button className={`${softBtn} mt-2 !py-1 text-sm`} onClick={() => speak(book.text)}>🔊 Play again</button>
        </div>
      )}
    </div>
  );
}

/** Blueprint art: the plan while saving, scaffolding when half funded, and the finished building once built. */
const ART: Record<string, [string, string, string]> = {
  glass_cafe: ['bp_glass_cafe', 'bp_glass_cafe', 'glass_cafe_done'],
  rooftop: ['bp_rooftop', 'bp_rooftop', 'rooftop_done'],
  expand: ['bp_island', 'scaffold_island', 'island_ext_done'],
};
function BlueprintArt({ id, pct, built }: { id: string; pct: number; built: boolean }) {
  const [plan, mid, done] = ART[id] ?? ART.expand;
  const name = built ? done : pct >= 0.5 ? mid : plan;
  return (
    <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-50">
      <img src={`${import.meta.env.BASE_URL}assets/sprites/${name}.png`} alt="" className={`max-h-full max-w-full object-contain ${built || pct >= 0.5 ? '' : 'opacity-90'}`} style={{ filter: !built && pct < 1 ? `saturate(${0.4 + pct})` : undefined }} draggable={false} />
    </div>
  );
}

function Vault() {
  const s = useGameState();
  const next = nextExpansion();
  const list = [
    ...BLUEPRINTS.map((b) => ({ id: b.id, name: b.name, icon: b.icon, cost: b.cost, blurb: b.blurb, built: s.vault.built.includes(b.id) })),
    ...(next ? [{ id: 'expand', name: `Island ${next.size} x ${next.size}`, icon: '🏝️', cost: next.coins, blurb: 'A bigger island for everything you are dreaming of.', built: false }] : []),
  ];
  const target = list.find((b) => !b.built);
  return (
    <div className="space-y-3 text-cocoa">
      <p className="text-sm">Saving together builds your dream. Finish a 💰 Finance goal and half the coins go straight into the vault. You can also add coins yourselves.</p>
      <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow">
        <span className="flex items-center gap-2 font-display text-lg font-bold"><ArtImg name={`mech_vault_${s.vault.coins < 150 ? 1 : s.vault.coins < 500 ? 2 : 3}`} size={40} /> Vault: <CurrencyIcon kind="coin" size={20} /> {s.vault.coins.toLocaleString()}</span>
        <span className="flex gap-1">
          {[25, 50, 100].map((n) => <button key={n} className={`${softBtn} !px-3 !py-1 text-sm`} disabled={s.coins < n} onClick={() => depositVault(n)}>+{n}</button>)}
        </span>
      </div>
      {list.map((b) => {
        const pct = b.built ? 1 : Math.min(1, s.vault.coins / b.cost);
        return (
          <div key={b.id} className={`flex items-center gap-3 rounded-2xl bg-white p-3 shadow ${b.built ? 'opacity-60' : ''} ${target?.id === b.id ? 'ring-2 ring-pink-300' : ''}`}>
            <BlueprintArt id={b.id} pct={pct} built={b.built} />
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold">{b.name}</div>
              <div className="text-xs opacity-70">{b.blurb}</div>
              <div className="mt-1 h-2 rounded-full bg-blush"><div className="h-full rounded-full bg-pink-400" style={{ width: `${pct * 100}%` }} /></div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span>{b.built ? '✓ Built' : `${s.vault.coins.toLocaleString()} / ${b.cost.toLocaleString()}`}</span>
                {!b.built && <button className={`${primaryBtn} !px-3 !py-1 text-xs`} disabled={s.vault.coins < b.cost} onClick={() => buildBlueprint(b.id)}>Build</button>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Letters({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const credits = s.bottleCredits[me];
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const waiting = s.bottles.filter((b) => !b.opened && b.from !== me);
  const sent = s.bottles.filter((b) => !b.opened && b.from === me);
  return (
    <div className="space-y-3 text-cocoa">
      <p className="text-sm">Finish a 💕 Romance goal to earn a sealed bottle. Write something sweet, and {s.names[otherP(me)]} must walk to the island shore to unwrap it. They earn 🐚 shells for finding it.</p>
      {credits > 0 ? (
        <div className="rounded-2xl bg-white p-3 shadow">
          <div className="mb-1 font-display font-bold">💌 You have {credits} bottle{credits > 1 ? 's' : ''} to seal</div>
          <textarea className={fieldCls} rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="A secret message…" />
          <div className="mt-2 flex items-center gap-2">
            <label className={`${softBtn} cursor-pointer text-sm`}>📷 Photo<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await shrinkImage(f)); }} /></label>
            {photo && <img src={photo} alt="" className="h-12 w-12 rounded-lg object-cover" />}
            <button className={`${primaryBtn} ml-auto`} disabled={!text.trim()} onClick={() => { if (sealBottle(me, text, photo)) { setText(''); setPhoto(undefined); onClose(); } }}>Seal & send to the shore</button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-white p-3 text-center text-sm opacity-70">No bottles to write yet. Complete a Romance goal and your partner approves it.</p>
      )}
      {waiting.length > 0 && <p className="rounded-xl bg-pink-100 p-3 text-sm font-bold">🍾 {waiting.length} bottle{waiting.length > 1 ? 's are' : ' is'} waiting for you on the island shore. Walk there to unwrap!</p>}
      {sent.length > 0 && <p className="text-xs opacity-70">{sent.length} of yours {sent.length > 1 ? 'are' : 'is'} drifting on the shore, waiting for {s.names[otherP(me)]}.</p>}
    </div>
  );
}

function Focus({ onClose }: { onClose: () => void }) {
  const me = useMe();
  return (
    <div className="space-y-3 text-center text-cocoa">
      <div className="text-6xl">🏮</div>
      <p className="text-sm">Start a {FOCUS_MS / 60000} minute Deep Work session. A lantern glows over you on the island and the game locks until the timer ends so you can focus. Your partner can silently send a 🍵 warm tea worth +{TEA_COINS} coins.</p>
      <p className="text-sm font-bold">Finish to earn {FOCUS_COINS} coins.</p>
      <button className={`${primaryBtn} w-full`} disabled={focusActive(me)} onClick={() => { startFocus(me); onClose(); }}>Light the lantern</button>
    </div>
  );
}

function Square() {
  const s = useGameState();
  const now = useNow(30000);
  const live = s.banners.filter((b) => b.until > now);
  return (
    <div className="space-y-2 text-cocoa">
      <p className="text-sm">Finish a 🫶 Social goal (host friends, call family) and a celebration banner flies over the Town Square for a day. Cute visitors gather to cheer you on. Visit the 🌍 town map to see them.</p>
      {live.length === 0 && <p className="rounded-xl bg-white p-3 text-center text-sm opacity-70">The square is quiet. Plan something with friends!</p>}
      {live.map((b) => <div key={b.id} className="rounded-xl bg-orange-100 p-3 text-sm font-bold">🎉 {s.names[b.by]}: {b.title}<span className="block text-xs font-normal opacity-70">{Math.ceil((b.until - now) / 3600000)}h left</span></div>)}
    </div>
  );
}

type Tab = 'focus' | 'books' | 'vault' | 'letters' | 'square';
export function RitualsModal({ onClose, start = 'focus' }: { onClose: () => void; start?: Tab }) {
  const s = useGameState();
  const me = useMe();
  const [tab, setTab] = useState<Tab>(start);
  const tabs: [Tab, string][] = [['focus', '🏮 Focus'], ['books', `📚 Library ${s.library.length}`], ['vault', '🏦 Vault'], ['letters', `💌 Letters${s.bottleCredits[me] ? ` ${s.bottleCredits[me]}` : ''}`], ['square', '🎉 Square']];
  return (
    <Sheet title="Our Rituals" onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 font-display font-bold ${tab === t ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>{l}</button>)}
      </div>
      {tab === 'focus' && <Focus onClose={onClose} />}
      {tab === 'books' && <Bookshelf />}
      {tab === 'vault' && <Vault />}
      {tab === 'letters' && <Letters onClose={onClose} />}
      {tab === 'square' && <Square />}
    </Sheet>
  );
}

/** Opens when your avatar reaches a sealed bottle on the shore. */
export function BottleReader() {
  const me = useMe();
  const s = useGameState();
  const [b, setB] = useState<SealedBottle | null>(null);
  useEffect(() => {
    const on = (id: string) => {
      const got = openBottle(id, me);
      if (got) setB(got);
    };
    gameBus.on(BUS.bottleOpen, on);
    return () => void gameBus.off(BUS.bottleOpen, on);
  }, [me]);
  if (!b) return null;
  return (
    <Sheet title="💌 A love letter in a bottle" onClose={() => setB(null)}>
      <div className="space-y-2 text-cocoa">
        <p className="rounded-2xl bg-white p-4 font-display text-lg shadow">“{b.text}”</p>
        {b.photo && <img src={b.photo} alt="" className="max-h-60 rounded-2xl" />}
        <p className="text-sm opacity-70">From {s.names[b.from]} · you found 3 🐚</p>
        <button className={`${primaryBtn} w-full`} onClick={() => setB(null)}>Keep it forever</button>
      </div>
    </Sheet>
  );
}
