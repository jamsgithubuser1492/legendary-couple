import { useEffect, useState } from 'react';
import { Amount } from './Currency';
import Sheet, { fieldCls, primaryBtn, softBtn } from './Sheet';
import { SpriteImg } from './ItemIcon';
import { CurrencyIcon } from './Currency';
import { BUS, gameBus } from '../game/events';
import { ESPRESSO_RECIPE } from '../state/cafe';
import FishingFinish from './FishingFinish';
import { FAUNA, FIGURES, FIGURE_CARD, GAMES, RECIPES, gameOf, type Figure, type MGResult, type MGType } from '../state/minigames';
import { addBottleNote, buyToken, getMe, getState, setFigureFree, useGameState, useMe } from '../state/store';
import type { PlayerId } from '../types';

const GAME_ART: Record<MGType, string> = { MATCHA_MASTERS: 'cp_a_matcha', STELLAR_FISHING: 'cp_d_beach', CRANE_CRAZE: 'cp_a_crane', ORCHARD_HARVEST: 'cp_a_orchard', PASTEL_DASH: 'cp_d_road' };
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
        <span className="rounded-full bg-white px-3 py-1 font-bold"><Amount kind="token" n={s.arcadeTokens} size={18} /> tokens</span>
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
                <div className="flex items-center gap-3">
                  <SpriteImg sprite={GAME_ART[g.type]} size={64} />
                  <p className="text-sm">{g.blurb}</p>
                </div>
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
              <div key={f.id} className="text-center text-cocoa">
                <RevealCard f={f} found={n > 0} />
                <div className="mt-1 text-xs font-bold">{n ? f.name : '???'}{f.rare ? ' ✨' : ''}{n > 1 ? ` x${n}` : ''}</div>
                <div className="text-[10px] opacity-70">{f.series}</div>
                {n > 0 && <button className={`${softBtn} mt-1 !px-2 !py-1 text-xs`} onClick={() => setFigureFree(f.id, !free)}>{free ? 'Shelve' : 'Set free'}</button>}
              </div>
            );
          })}
        </div>
      )}
      {tab === 'sea' && (
        <div className="text-cocoa">
          <Aquarium />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {FAUNA.map((f) => {
              const n = s.fauna[f.id] ?? 0;
              return (
                <div key={f.id} className={`rounded-2xl bg-white p-2 shadow ${n ? '' : 'opacity-50'}`}>
                  <div className="flex h-12 items-center justify-center">{n ? <SpriteImg sprite={f.sprite} size={44} /> : <span className="text-2xl opacity-40">?</span>}</div>
                  <div className="text-xs font-bold">{n ? f.name : '???'}</div>
                  <div className="text-[10px] opacity-70">{n ? `caught ${n}` : 'not found yet'}</div>
                </div>
              );
            })}
            <div className="text-center">
              <div className="relative flex h-[150px] items-center justify-center rounded-2xl bg-white text-6xl shadow">☕{!s.recipes.includes(ESPRESSO_RECIPE) && <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-cream/80 text-3xl backdrop-blur-[2px]">🔒</div>}</div>
              <div className="mt-1 text-sm font-bold">{s.recipes.includes(ESPRESSO_RECIPE) ? ESPRESSO_RECIPE : 'A café recipe'}</div>
              {!s.recipes.includes(ESPRESSO_RECIPE) && <div className="text-[11px] opacity-70">Set up an espresso station in your café.</div>}
            </div>
          </div>
          <div className="mt-2 text-center text-sm">🪵 Driftwood {s.driftwood} · 🐚 Heart Shells {s.shells}</div>
        </div>
      )}
      {tab === 'recipes' && (
        <div className="text-cocoa">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-100 to-pink-100 p-3">
            <SpriteImg sprite="mg_book_cover" size={72} />
            <div>
              <div className="font-display text-lg font-bold">Our Recipe Memory Book</div>
              <div className="text-sm opacity-80">{RECIPES.filter((r) => s.recipes.includes(r)).length} of {RECIPES.length} recipes. Earn 3 stars in Matcha Masters to add the next one.</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {RECIPES.map((r, i) => {
              const have = s.recipes.includes(r);
              return (
                <div key={r} className="text-center">
                  <div className="relative">
                    <SpriteImg sprite={`mg_recipe_${i + 1}`} size={150} />
                    {!have && <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-cream/80 text-3xl backdrop-blur-[2px]">🔒</div>}
                  </div>
                  <div className="mt-1 text-sm font-bold">{have ? r : 'A secret recipe'}</div>
                </div>
              );
            })}
          </div>
        </div>
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
  const [invite, setInvite] = useState<{ type: MGType; sessionId: string; from: PlayerId; rush?: boolean; swap?: boolean } | null>(null);
  const [result, setResult] = useState<MGResult | null>(null);
  const [bottle, setBottle] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => {
    const a = (p: { type: MGType; sessionId: string; from: PlayerId; rush?: boolean; swap?: boolean }) => setInvite(p);
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
          <img src={`${import.meta.env.BASE_URL}assets/sprites/cz_invite.png`} alt="" className="h-12 shrink-0" draggable={false} />
          <span className="font-display font-bold">{gameOf(invite.type).icon} {s.names[invite.from]} invites you to {invite.rush ? 'a café rush' : gameOf(invite.type).name}!</span>
          <span className="flex gap-2">
            <button className={primaryBtn} onClick={() => { gameBus.emit(BUS.mgLaunch, { type: invite.type, mode: 'join', sessionId: invite.sessionId, rush: invite.rush, swap: invite.swap }); setInvite(null); }}>Join</button>
            <button className={softBtn} onClick={() => setInvite(null)}>Later</button>
          </span>
        </div>
      )}
      {result && (
        <Sheet title={`${gameOf(result.type).icon} ${gameOf(result.type).name}`} onClose={() => setResult(null)}>
          <div className="flex flex-col gap-2 text-cocoa">
            {result.type === 'STELLAR_FISHING' && <FishingFinish />}
            {result.stars > 0 && (
              <div className="relative mx-auto">
                <SpriteImg sprite="cz_result" size={130} />
                <div className="relative mx-auto mt-1 w-40"><img src={`${import.meta.env.BASE_URL}assets/sprites/cz_stars.png`} alt="" className="w-40 opacity-30" draggable={false} /><div className="absolute left-0 top-0 overflow-hidden" style={{ width: `${result.stars * 20}%` }}><img src={`${import.meta.env.BASE_URL}assets/sprites/cz_stars.png`} alt="" className="w-40 max-w-none" draggable={false} /></div></div>
                <SpriteImg sprite="cz_confetti" size={26} />
              </div>
            )}
            <div className="text-center font-display text-lg font-bold">Score {result.score}</div>
            {!result.award && <p className="text-center text-sm opacity-70">Your partner's device collects the rewards for you both.</p>}
            <div className="flex flex-wrap justify-center gap-2 text-sm font-bold">
              {result.coins > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.coins} <CurrencyIcon kind="coin" size={16} /></span>}
              {result.shells > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.shells} 🐚</span>}
              {result.driftwood > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.driftwood} 🪵</span>}
              {result.eventTokens > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.eventTokens} 🎟️</span>}
              {result.ingredients > 0 && <span className="rounded-full bg-white px-3 py-1">+{result.ingredients} 🍏</span>}
              {Object.entries(result.fauna).map(([k, n]) => <span key={k} className="rounded-full bg-white px-3 py-1">{FAUNA.find((f) => f.id === k)?.icon} x{n}</span>)}
              {result.recipes.map((r) => <span key={r} className="flex items-center gap-1 rounded-full bg-white px-3 py-1"><SpriteImg sprite={`mg_recipe_${RECIPES.indexOf(r) + 1}`} size={34} /> {r}</span>)}
            </div>
            {result.figures.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {result.figures.map((id, i) => {
                  const f = FIGURES.find((q) => q.id === id);
                  return f ? <div key={i} className="w-24 animate-pop text-center text-xs font-bold"><RevealCard f={f} found />{f.name}</div> : null;
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

/** A figure shown on its painted reveal card. A figure you have not found yet shows as a silhouette. */
function RevealCard({ f, found }: { f: Figure; found: boolean }) {
  const base = import.meta.env.BASE_URL;
  if (!found) return <div className="relative mx-auto w-full max-w-[110px]"><img src={`${base}assets/sprites/mg_card_locked.png`} alt="" className="block w-full" draggable={false} /></div>;
  return (
    <div className="relative mx-auto w-full max-w-[110px]">
      <img src={`${base}assets/sprites/mg_card_${FIGURE_CARD[f.id] ?? 1}.png`} alt="" className="block w-full" draggable={false} />
      <img src={`${base}assets/sprites/${f.sprite}.png`} alt={f.name} className="absolute left-1/2 top-[52%] max-h-[64%] max-w-[72%] -translate-x-1/2 -translate-y-1/2 object-contain" draggable={false} />
    </div>
  );
}

/** Your collection swimming in the painted tank. Each creature you have caught drifts about. */
function Aquarium() {
  const s = useGameState();
  const base = import.meta.env.BASE_URL;
  const swimmers = FAUNA.flatMap((f, fi) => Array.from({ length: Math.min(3, s.fauna[f.id] ?? 0) }, (_, k) => ({ f, key: `${f.id}${k}`, i: fi * 3 + k })));
  return (
    <div className="relative mx-auto max-w-md">
      <style>{`@keyframes olwdrift{0%{transform:translate(0,0)}50%{transform:translate(10px,-12px)}100%{transform:translate(0,0)}}`}</style>
      <img src={`${base}assets/sprites/mg_tank.png`} alt="Aquarium" className="block w-full" draggable={false} />
      <div className="absolute inset-x-[7%] bottom-[22%] top-[16%]">
        {swimmers.map(({ f, key, i }) => (
          <img key={key} src={`${base}assets/sprites/${f.sprite}.png`} alt={f.name} draggable={false} className="absolute h-[34%] object-contain"
            style={{ left: `${(i * 23 + 6) % 80}%`, top: `${(i * 31 + 8) % 56}%`, animation: `olwdrift ${4 + (i % 4)}s ease-in-out ${-i * 0.7}s infinite` }} />
        ))}
        {swimmers.length === 0 && <div className="flex h-full items-center justify-center text-center text-sm font-bold text-cocoa/60">An empty tank. Catch rare critters while fishing to fill it.</div>}
      </div>
    </div>
  );
}
