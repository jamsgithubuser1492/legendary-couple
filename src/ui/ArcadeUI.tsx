import { useEffect, useState } from 'react';
import Sheet, { fieldCls, primaryBtn, softBtn } from './Sheet';
import { SpriteImg } from './ItemIcon';
import { CurrencyIcon } from './Currency';
import { BUS, gameBus } from '../game/events';
import { FAUNA, FIGURES, GAMES, RECIPES, gameOf, type MGResult, type MGType } from '../state/minigames';
import { addBottleNote, buyToken, getMe, getState, setFigureFree, useGameState, useMe } from '../state/store';
import type { PlayerId } from '../types';

type Tab = 'play' | 'figures' | 'sea' | 'recipes';

export function ArcadeModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const [tab, setTab] = useState<Tab>('play');
  const [pick, setPick] = useState<MGType | null>(null);
  const launch = (type: MGType, mode: 'solo' | 'together', role?: PlayerId) => {
    onClose();
    gameBus.emit(BUS.mgLaunch, { type, mode, role });
  };
  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)} className={`rounded-full px-3 py-1 font-display font-bold ${tab === t ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>{label}</button>
  );
  return (
    <Sheet title="🎮 Arcade" onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-cocoa">
        <span className="rounded-full bg-white px-3 py-1 font-bold">🪙 {s.arcadeTokens} tokens</span>
        <button className={softBtn} disabled={s.coins < 100} onClick={() => buyToken()}>Buy token (100 <CurrencyIcon kind="coin" size={16} />)</button>
        <span className="opacity-70">Every approved quest earns a token.</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {tabBtn('play', 'Games')}
        {tabBtn('figures', 'Figures')}
        {tabBtn('sea', 'Aquarium')}
        {tabBtn('recipes', 'Recipe book')}
      </div>
      {tab === 'play' && (
        <div className="flex flex-col gap-3">
          {GAMES.map((g) => {
            const ok = g.unlocked(s);
            return (
              <div key={g.type} className={`rounded-2xl bg-white p-3 text-cocoa shadow ${ok ? '' : 'opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="font-display text-lg font-bold">{g.icon} {g.name}</div>
                  <div className="text-xs opacity-70">{g.where} · {g.duration} · best {s.mgBest[g.type] ?? 0}</div>
                </div>
                <p className="text-sm">{g.blurb}</p>
                {!ok && <p className="mt-1 text-sm font-bold">🔒 {g.lockedText}</p>}
                {ok && pick !== g.type && <button className={`${primaryBtn} mt-2`} onClick={() => setPick(g.type)}>Play</button>}
                {ok && pick === g.type && (
                  <div className="mt-2 flex flex-col gap-2 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button className={primaryBtn} onClick={() => launch(g.type, 'together')}>With {s.names[me === 'A' ? 'B' : 'A']} (you are {me === 'A' ? 'Partner A' : 'Partner B'})</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">Practice with Mochi as:</span>
                      <button className={softBtn} onClick={() => launch(g.type, 'solo', 'A')}>{g.roles[0].split(':')[0]}</button>
                      <button className={softBtn} onClick={() => launch(g.type, 'solo', 'B')}>{g.roles[1].split(':')[0]}</button>
                    </div>
                    <div className="opacity-80">A: {g.roles[0]}<br />B: {g.roles[1]}</div>
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-xs opacity-70">Playing together needs you both online in the same room. Only one of you needs to tap Play, the other gets an invite.</p>
        </div>
      )}
      {tab === 'figures' && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {FIGURES.map((f) => {
            const n = s.figures[f.id] ?? 0;
            const free = s.freeFigures.includes(f.id);
            return (
              <div key={f.id} className={`rounded-2xl bg-white p-2 text-center text-cocoa shadow ${n ? '' : 'opacity-40'}`}>
                <div className="flex h-20 items-end justify-center">{n ? <SpriteImg sprite={f.sprite} size={72} /> : <SpriteImg sprite="toy_secret" size={72} />}</div>
                <div className="text-xs font-bold">{n ? f.name : '???'}{f.rare ? ' ✨' : ''}{n > 1 ? ` x${n}` : ''}</div>
                <div className="text-[10px] opacity-70">{f.series}</div>
                {n > 0 && <button className={`${softBtn} mt-1 !px-2 !py-1 text-xs`} onClick={() => setFigureFree(f.id, !free)}>{free ? 'Shelve' : 'Set free'}</button>}
              </div>
            );
          })}
        </div>
      )}
      {tab === 'sea' && (
        <div className="grid grid-cols-3 gap-3 text-center text-cocoa">
          {FAUNA.map((f) => (
            <div key={f.id} className={`rounded-2xl bg-white p-3 shadow ${(s.fauna[f.id] ?? 0) ? '' : 'opacity-40'}`}>
              <div className="text-4xl">{f.icon}</div>
              <div className="text-sm font-bold">{f.name}</div>
              <div className="text-xs">caught {s.fauna[f.id] ?? 0}</div>
            </div>
          ))}
          <div className="col-span-3 text-sm">🪵 Driftwood {s.driftwood} · 🐚 Shells {s.shells}</div>
        </div>
      )}
      {tab === 'recipes' && (
        <ul className="flex flex-col gap-2 text-cocoa">
          {RECIPES.map((r) => (
            <li key={r} className={`rounded-2xl bg-white p-3 font-bold shadow ${s.recipes.includes(r) ? '' : 'opacity-40'}`}>{s.recipes.includes(r) ? `📖 ${r}` : '🔒 Earn 3 stars in Matcha Masters'}</li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/** Invite banner, result card and bottle note prompt. Returns whether a minigame is running so the HUD can hide. */
export function useMinigameActive(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const f = (p: { active: boolean }) => setActive(p.active);
    gameBus.on(BUS.mgState, f);
    return () => void gameBus.off(BUS.mgState, f);
  }, []);
  return active;
}

export function MinigameOverlays() {
  const [invite, setInvite] = useState<{ type: MGType; sessionId: string; from: PlayerId } | null>(null);
  const [result, setResult] = useState<MGResult | null>(null);
  const [bottle, setBottle] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    const a = (p: { type: MGType; sessionId: string; from: PlayerId }) => setInvite(p);
    const b = (r: MGResult) => setResult(r);
    const c = () => setBottle(true);
    gameBus.on(BUS.mgInvite, a);
    gameBus.on(BUS.mgResult, b);
    gameBus.on(BUS.mgBottle, c);
    return () => {
      gameBus.off(BUS.mgInvite, a);
      gameBus.off(BUS.mgResult, b);
      gameBus.off(BUS.mgBottle, c);
    };
  }, []);
  const s = getState();
  return (
    <>
      {invite && (
        <div className="absolute inset-x-0 top-3 z-40 mx-auto flex w-[92%] max-w-md items-center justify-between gap-2 rounded-2xl bg-cream p-3 text-cocoa shadow-2xl">
          <span className="font-display font-bold">{gameOf(invite.type).icon} {s.names[invite.from]} invites you to {gameOf(invite.type).name}!</span>
          <span className="flex gap-2">
            <button className={primaryBtn} onClick={() => { gameBus.emit(BUS.mgLaunch, { type: invite.type, mode: 'join', sessionId: invite.sessionId }); setInvite(null); }}>Join</button>
            <button className={softBtn} onClick={() => setInvite(null)}>Later</button>
          </span>
        </div>
      )}
      {result && (
        <Sheet title={`${gameOf(result.type).icon} ${gameOf(result.type).name}`} onClose={() => setResult(null)}>
          <div className="flex flex-col gap-2 text-cocoa">
            {result.stars > 0 && <div className="text-center text-3xl">{'⭐'.repeat(result.stars)}</div>}
            <div className="text-center font-display text-lg font-bold">Score {result.score}</div>
            {!result.award && <p className="text-center text-sm opacity-70">Your partner's device collects the rewards for you both.</p>}
            <div className="flex flex-wrap justify-center gap-2 text-sm font-bold">
              {result.coins > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.coins} <CurrencyIcon kind="coin" size={16} /></span>}
              {result.shells > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.shells} 🐚</span>}
              {result.driftwood > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.driftwood} 🪵</span>}
              {result.eventTokens > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.eventTokens} 🎟️</span>}
              {result.ingredients > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.ingredients} 🍏</span>}
              {Object.entries(result.fauna).map(([k, n]) => <span key={k} className="rounded-full bg-white px-3 py-1">{FAUNA.find((f) => f.id === k)?.icon} x{n}</span>)}
              {result.recipes.map((r) => <span key={r} className="rounded-full bg-white px-3 py-1">📖 {r}</span>)}
            </div>
            {result.figures.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {result.figures.map((id, i) => {
                  const f = FIGURES.find((q) => q.id === id);
                  return f ? <div key={i} className="text-center text-xs font-bold"><SpriteImg sprite={f.sprite} size={72} />{f.name}</div> : null;
                })}
              </div>
            )}
            {result.notes.map((n, i) => <p key={i} className="text-center text-sm opacity-80">{n}</p>)}
            <button className={primaryBtn} onClick={() => setResult(null)}>Lovely</button>
          </div>
        </Sheet>
      )}
      {bottle && (
        <Sheet title="🍾 A message in a bottle" onClose={() => setBottle(false)}>
          <p className="mb-2 text-sm text-cocoa">Write a secret note. It is sealed in your Beach Memory Journal for your partner to find later.</p>
          <textarea className={fieldCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Something sweet…" />
          <div className="mt-3 flex gap-2">
            <button className={primaryBtn} disabled={!note.trim()} onClick={() => { addBottleNote(getMe(), note.trim()); setNote(''); setBottle(false); }}>Seal it</button>
            <button className={softBtn} onClick={() => setBottle(false)}>Skip</button>
          </div>
        </Sheet>
      )}
    </>
  );
}
