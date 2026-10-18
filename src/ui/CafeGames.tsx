import { useEffect, useRef, useState } from 'react';
import { BUS, gameBus } from '../game/events';
import { finishLatte, joinCafeEvent, otherPlayer, pullGacha, startCafeEvent, useGameState, useMe } from '../state/store';
import { eventOf, EVENT_TEAM, eventReady, EVENT_SURPRISE, EVENTS, eventToday, freePullToday, GACHA_COST, styleOf, type EventId } from '../state/cafe';
import { dateKey } from '../state/questions';
import { itemOf } from '../state/catalog';
import { Amount } from './Currency';
import ItemIcon, { SpriteImg } from './ItemIcon';
import Sheet, { primaryBtn, softBtn } from './Sheet';

const art = (k: string) => `${import.meta.env.BASE_URL}assets/sprites/${k}.png`;

// ------------------------------------------------------------------------------------------------- latte art
const PATTERNS = [
  { id: 'cat', name: 'Cat head', need: 0 },
  { id: 'frog', name: 'Frog head', need: 0 },
  { id: 'heart', name: 'Heart swirl', need: 2 },
];
const CW = 320;
const SW = 170; // stencil size on the cup
const SX = (CW - SW) / 2, SY = 86;

export function LatteModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const stars = styleOf(s).stars;
  const [pat, setPat] = useState('cat');
  const cv = useRef<HTMLCanvasElement>(null);
  const targets = useRef<{ x: number; y: number }[]>([]);
  const stroke = useRef<{ x: number; y: number }[]>([]);
  const imgs = useRef<Record<string, HTMLImageElement>>({});
  const down = useRef(false);
  const [res, setRes] = useState<{ score: number; coins: number; streak: number } | null>(null);
  const [ready, setReady] = useState(0);

  const load = (k: string) => {
    if (imgs.current[k]) return imgs.current[k];
    const im = new Image();
    im.onload = () => setReady((n) => n + 1);
    im.src = art(k);
    imgs.current[k] = im;
    return im;
  };

  const paint = () => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, CW, CW);
    g.fillStyle = '#7a5238';
    g.fillRect(0, 0, CW, CW);
    g.fillStyle = '#946a48';
    g.fillRect(0, 230, CW, 90);
    const cup = load('cy_latte_cup');
    if (cup.complete && cup.naturalWidth) g.drawImage(cup, 8, 52, 304, (cup.naturalHeight / cup.naturalWidth) * 304);
    const st = load(`cy_stencil_${pat}`);
    // the foam the player has poured
    g.fillStyle = 'rgba(255,252,240,0.96)';
    for (const p of stroke.current) { g.beginPath(); g.arc(p.x, p.y, 6, 0, Math.PI * 2); g.fill(); }
    if (st.complete && st.naturalWidth) { g.globalAlpha = 0.75; g.drawImage(st, SX, SY, SW, (st.naturalHeight / st.naturalWidth) * SW); g.globalAlpha = 1; }
  };
  useEffect(paint, [pat, ready, res]);

  // read the stencil's dashes as the points the pour should pass through
  useEffect(() => {
    setRes(null);
    stroke.current = [];
    const im = load(`cy_stencil_${pat}`);
    const go = () => {
      const h = Math.round((im.naturalHeight / im.naturalWidth) * SW);
      const off = document.createElement('canvas');
      off.width = SW; off.height = h;
      const g = off.getContext('2d')!;
      g.drawImage(im, 0, 0, SW, h);
      const d = g.getImageData(0, 0, SW, h).data;
      const pts: { x: number; y: number }[] = [];
      for (let y = 0; y < h; y += 4) for (let x = 0; x < SW; x += 4) if (d[(y * SW + x) * 4 + 3] > 128) pts.push({ x: x + SX, y: y + SY });
      targets.current = pts;
      paint();
    };
    if (im.complete && im.naturalWidth) go();
    else im.addEventListener('load', go, { once: true });
  }, [pat]);

  const at = (e: React.PointerEvent) => {
    const r = cv.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * CW, y: ((e.clientY - r.top) / r.height) * CW };
  };
  const add = (e: React.PointerEvent) => {
    if (!down.current || res) return;
    const p = at(e);
    const last = stroke.current[stroke.current.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 3) { stroke.current.push(p); paint(); }
  };
  const score = () => {
    const t = targets.current, sk = stroke.current;
    if (!t.length || sk.length < 8) return 0;
    const near = (a: { x: number; y: number }, list: { x: number; y: number }[], r: number) => list.some((b) => Math.hypot(a.x - b.x, a.y - b.y) <= r);
    const cover = t.filter((p) => near(p, sk, 12)).length / t.length;
    const off = sk.filter((p) => !near(p, t, 24)).length / sk.length;
    return Math.max(0, Math.min(100, Math.round(100 * cover * (1 - 0.6 * off))));
  };
  const done = () => {
    const sc = score();
    const r = finishLatte(sc);
    setRes({ score: sc, ...r });
  };

  const grade = res ? (res.score >= 90 ? 'Perfect!' : res.score >= 70 ? 'Lovely' : res.score >= 40 ? 'Nice try' : 'Keep practicing') : '';
  return (
    <Sheet title="Latte Art Studio ☕" onClose={onClose}>
      <div className="flex gap-2">
        {PATTERNS.map((p) => (
          <button key={p.id} disabled={stars < p.need} onClick={() => setPat(p.id)} className={`flex-1 rounded-2xl p-2 text-xs font-bold ${pat === p.id ? 'bg-pink-200 ring-2 ring-pink-400' : 'bg-white'} text-cocoa shadow disabled:opacity-40`}>
            <SpriteImg sprite={`cy_stencil_${p.id}`} size={34} />
            {p.name}{stars < p.need ? ` 🔒 ${p.need}⭐` : ''}
          </button>
        ))}
      </div>
      <canvas
        ref={cv} width={CW} height={CW}
        className="mx-auto mt-3 block w-full max-w-xs touch-none rounded-2xl shadow"
        onPointerDown={(e) => { down.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); add(e); }}
        onPointerMove={add}
        onPointerUp={() => (down.current = false)}
      />
      <p className="mt-2 text-center text-xs text-cocoa/70">Drag a finger along the dotted line to pour the foam. Stay close to the line and cover all of it.</p>
      {res ? (
        <div className="mt-2 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3 text-center text-cocoa">
          <div className="font-display text-2xl font-bold">{res.score}% · {grade}</div>
          <div className="text-sm">{res.coins > 0 ? <>Tip <Amount kind="coin" n={res.coins} size={14} /> · streak of {res.streak} good pour{res.streak === 1 ? '' : 's'} (x{(1 + 0.1 * Math.min(8, res.streak)).toFixed(1)})</> : 'You have earned your three tips for today. Keep pouring for the streak!'}</div>
          <button className={`${primaryBtn} mt-2`} onClick={() => { stroke.current = []; setRes(null); }}>Pour another</button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button className={`${softBtn} flex-1`} onClick={() => { stroke.current = []; paint(); }}>Clear</button>
          <button className={`${primaryBtn} flex-1`} onClick={done}>Done</button>
        </div>
      )}
      <p className="mt-2 text-center text-[11px] text-cocoa/60">Best today {s.cafe.latte.day ? s.cafe.latte.best : 0}% · three tips a day · 90% or better counts for the Masterclass event</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------------------------------------- lucky cat
const TIERS = { common: { label: 'Common', bubble: 'cy_bubble_common', cls: 'bg-sky-100' }, rare: { label: 'Rare', bubble: 'cy_bubble_rare', cls: 'bg-purple-100' }, legendary: { label: 'Legendary', bubble: 'cy_bubble_legendary', cls: 'bg-amber-100' } } as const;

export function GachaModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const [frame, setFrame] = useState<'idle' | 'coin' | 'wobble' | 'burst'>('idle');
  const [win, setWin] = useState<ReturnType<typeof pullGacha>>(null);
  const [busy, setBusy] = useState(false);
  const free = freePullToday(s);
  const can = free || s.coins >= GACHA_COST;
  const pull = () => {
    if (busy || !can) return;
    setBusy(true); setWin(null); setFrame('coin');
    setTimeout(() => setFrame('wobble'), 700);
    setTimeout(() => { const r = pullGacha(); setWin(r); setFrame('burst'); }, 1700);
    setTimeout(() => { setBusy(false); setFrame('idle'); }, 3200);
  };
  return (
    <Sheet title="Lucky Cat Tip Jar 🐱" onClose={onClose}>
      <div className="rounded-2xl bg-gradient-to-b from-amber-50 to-pink-50 p-3 text-center">
        <SpriteImg sprite={`cy_cat_${frame}`} size={150} />
        {win ? (
          <div className={`animate-pop mx-auto mt-1 max-w-xs rounded-2xl p-3 ${TIERS[win.tier].cls}`}>
            <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/80 shadow-inner ${win.tier === 'legendary' ? 'bg-amber-200' : win.tier === 'rare' ? 'bg-purple-200' : 'bg-sky-200'}`}><ItemIcon id={win.itemId} size={58} /></div>
            <div className="font-display text-xs font-bold uppercase text-cocoa/60">{TIERS[win.tier].label} prize</div>
            <div className="font-display text-lg font-bold text-cocoa">{itemOf(win.itemId)?.name}</div>
            <div className="text-xs text-cocoa/60">Added to your bag. Place it in your café!</div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-cocoa/70">{free ? 'Your free pull for today is ready.' : `Drop in ${GACHA_COST} coins for a surprise.`}</p>
        )}
      </div>
      <button className={`${primaryBtn} mt-3 w-full`} disabled={!can || busy} onClick={pull}>
        {free ? 'Free pull today 🎁' : <>Drop a coin · <Amount kind="coin" n={GACHA_COST} size={16} /></>}
      </button>
      <p className="mt-2 text-center text-xs text-cocoa/60">Every 10th pull without a rare prize guarantees one. Prizes: bakery goods, cozy furniture, a prism suncatcher, and rarely a Vintage Jukebox.</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------------------------------------- community board
export function EventsModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const partner = s.names[otherPlayer(me)];
  const today = eventToday();
  const live = s.cafe.event && s.cafe.event.day === dateKey() ? s.cafe.event : null;
  const [msg, setMsg] = useState('');
  const dnames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const Row = ({ id }: { id: EventId }) => {
    const ev = eventOf(id);
    const ok = eventReady(s, id);
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow">
        <SpriteImg sprite={ev.badge} size={36} />
        <div className="flex-1 text-xs text-cocoa">
          <div className="font-display text-sm font-bold">{ev.name} <span className="font-normal opacity-60">· {dnames[ev.day]}</span></div>
          <div className="opacity-70">{ev.need}</div>
        </div>
        <span className="text-lg">{ok ? '✅' : '⬜'}</span>
      </div>
    );
  };
  return (
    <Sheet title="Community Board 📌" onClose={onClose}>
      {today ? (
        <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3 text-cocoa">
          <div className="text-xs font-bold uppercase text-cocoa/60">On today</div>
          <div className="font-display text-xl font-bold">{today.icon} {today.name}</div>
          <p className="text-sm">{today.blurb}</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <SpriteImg sprite={EVENT_TEAM[today.id]} size={72} />
            <span className="text-xs text-cocoa/70">Team work: you do this one side by side.</span>
          </div>
          {today.flyer && <img src={art(today.flyer)} alt="" className="mx-auto mt-2 max-h-40 rounded-xl shadow" draggable={false} />}
          <div className="mt-2 text-xs">Reward when you both take part: <Amount kind="coin" n={today.coins} size={13} /> + {today.shells} 🐚{today.popularity ? ' + a lasting popularity boost' : ''}</div>
          {live?.joined ? (
            <p className="mt-2 rounded-xl bg-emerald-100 p-2 text-center text-sm font-bold text-emerald-800">Hosted together today. 🎉</p>
          ) : live && live.by !== me ? (
            <button className={`${primaryBtn} mt-2 w-full`} onClick={() => joinCafeEvent(me)}>Join {s.names[live.by]} 🎉</button>
          ) : live ? (
            <div className="mt-2 text-center"><img src={art('cz_waiting')} alt="" className="mx-auto max-h-28 rounded-xl" draggable={false} /><p className="mt-1 text-sm text-cocoa/70">Waiting for {partner} to join you…</p></div>
          ) : (
            <button className={`${primaryBtn} mt-2 w-full`} onClick={() => setMsg(startCafeEvent(me, today.id) ?? '')}>Host it with {partner}</button>
          )}
          {!live && !eventReady(s, today.id) && <p className="mt-2 text-center text-xs text-cocoa/70">Not fully ready ({today.need}). You can still host it together for half the bonus.</p>}
          {msg && <p className="mt-2 text-center text-xs text-cocoa">{msg}</p>}
          <button className={`${softBtn} mt-2 w-full text-sm`} onClick={() => gameBus.emit(BUS.openFocus, 'surprise')}>💌 Surprise idea: {EVENT_SURPRISE[today.id]}</button>
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-3 text-center text-sm text-cocoa shadow">No event today. Check the calendar below and get your café ready for the next one.</p>
      )}
      <div className="mt-3 text-xs font-bold uppercase text-cocoa/50">This week's calendar</div>
      <div className="mt-1 space-y-2">{EVENTS.map((e) => <Row key={e.id} id={e.id} />)}</div>
      <p className="mt-3 text-center text-xs text-cocoa/60">Events are a team effort. One of you opens it, the other joins, and a friendly crowd only needs your room to be ready.</p>
    </Sheet>
  );
}
