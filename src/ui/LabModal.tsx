import { useEffect, useRef, useState } from 'react';
import { labExperiment, otherPlayer, useGameState, useMe } from '../state/store';
import { experimentsLeft, labProgress, qualityOf, tierOf, TIER_NAMES } from '../state/lab';
import type { PlayerId } from '../types';
import MenuBoardModal from './MenuBoardModal';
import RecipeBook from './RecipeBook';
import { AlchemistPanel, DecoratorPanel } from './lab/Panels';
import NameStep from './lab/NameStep';
import RecipeCard from './lab/RecipeCard';
import { Vessel } from './lab/Vessel';
import { cleanDraft, closeOf, defaultDraft, labLocked, roleOf, sweetHint, tempHint, toInput, useLabNet, verdict, type Draft } from './lab/draft';
import { LabImg, stars, useReducedMotion } from './lab/labArt';
import Sheet, { primaryBtn, softBtn } from './Sheet';

/** The sleeping cat in the corner: four frames, slow, with a tiny tail twitch. */
function Cat() {
  const reduce = useReducedMotion();
  const [f, setF] = useState(1);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => !document.hidden && setF((n) => (n % 4) + 1), 250);
    return () => clearInterval(t);
  }, [reduce]);
  return <LabImg k={`labx_cat_${f}`} className="pointer-events-none absolute bottom-1 left-2 w-16 sm:w-20" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }} />;
}

/** The back room behind everything: the painted room, dimmed so the panels stay easy to read, plus a lamp glow, steam and dust. */
function Room() {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#2b1a12]" aria-hidden>
      <LabImg k="labx_room" className="absolute inset-0 h-full w-full object-cover opacity-45 blur-[1px]" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 72% 8%, rgba(255,214,140,0.30), transparent 55%), linear-gradient(rgba(43,26,18,0.35), rgba(43,26,18,0.65))', animation: reduce ? undefined : 'olw-lamp 5s ease-in-out infinite' }} />
      <LabImg k="labx_fx_dust" className="absolute -inset-4 h-[110%] w-[110%] object-cover" style={{ mixBlendMode: 'screen', opacity: 0.8, animation: reduce ? undefined : 'olw-drift 14s ease-in-out infinite' }} />
      <Cat />
    </div>
  );
}

/** How many experiments are left today, written on the little chalkboard tag. */
function Tag({ n }: { n: number }) {
  return (
    <div className="relative shrink-0" style={{ width: 52, aspectRatio: '169 / 266' }} role="img" aria-label={`${n} experiments left today`} title="Experiments left today">
      <LabImg k="labx_tag_frame" className="absolute inset-0 h-full w-full" fallback={<div className="absolute inset-0 rounded-lg bg-[#3a3a36] ring-2 ring-[#8a6340]" />} />
      <LabImg k={`labx_tag_num_${Math.min(9, n)}`} className="absolute left-1/2 w-[30%] -translate-x-1/2" style={{ top: '49%' }} fallback={<span className="absolute inset-x-0 top-[46%] text-center font-display text-lg font-bold text-[#f3e5ab]">{n}</span>} />
    </div>
  );
}

interface Kept { id: string; text: string; discoveredNew: boolean; improved: boolean }

/** The Test Kitchen: the two of you invent a drink at one counter. One shapes the flavor, the other the look. */
export default function LabModal({ onClose, start }: { onClose: () => void; start?: 'board' | 'book' }) {
  const s = useGameState();
  const me = useMe();
  const partner: PlayerId = otherPlayer(me);
  const reduce = useReducedMotion();
  const [draft, setDraftState] = useState<Draft>(() => defaultDraft(s));
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [tab, setTab] = useState<'alchemist' | 'decorator'>('alchemist');
  const [mixing, setMixing] = useState(false);
  const [tasted, setTasted] = useState<null | { close: number; q: number; tier: string }>(null);
  const [kept, setKept] = useState<Kept | null>(null);
  const [msg, setMsg] = useState('');
  const [sub, setSub] = useState<null | 'board' | 'book'>(start ?? null);
  const busy = useRef(false);

  const swappedRef = useRef(false);
  const net = useLabNet(me, {
    onDraft: (d, from) => setDraftState((cur) => ({ ...cur, ...cleanDraft(d, roleOf(from, swappedRef.current)) })),
    onKept: (info) => { setKept({ id: info.recipeId, text: info.text, discoveredNew: info.discoveredNew, improved: info.improved }); setMsg(''); },
  });
  swappedRef.current = net.swapped;
  const mine = roleOf(me, net.swapped);
  const solo = !net.online;
  const can = (p: 'alchemist' | 'decorator') => solo || mine === p;

  /** A change made on this phone: apply it and tell the partner (only the controls I run, or all of them when I am alone). */
  const set = (p: Partial<Draft>) => {
    const next = { ...draftRef.current, ...p };
    if (p.base || p.flavor || p.topping) { setTasted(null); }
    setDraftState(next);
    net.sendDraft(next);
  };

  const left = experimentsLeft(s);
  const noPantry = s.ingredients < 1;
  const practice = left < 1 || noPantry;
  const why = left < 1 ? 'You have done today\'s three experiments. Playing around is still free: nothing is spent in practice mode.' : noPantry ? 'The pantry is empty, so this is practice. Healthy goals and the Orchard fill it back up.' : '';
  const locked = labLocked(s);
  const close = closeOf(draft);
  const prog = labProgress(s);

  const taste = () => {
    const q = qualityOf(close, draft.art ? draft.artScore : 0.5);
    const tier = tierOf({ flavor: draft.flavor, topping: draft.topping, quality: q });
    setTasted({ close, q, tier });
  };
  const mix = () => { setMixing(true); setTimeout(() => { setMixing(false); taste(); }, reduce ? 150 : 1300); };

  const keep = () => {
    if (busy.current || practice) return;
    if (Date.now() - net.lastKeepAt() < 4000) return; // the partner just pressed Keep: one drink, not two
    busy.current = true;
    setTimeout(() => (busy.current = false), 1200);
    net.markKeep();
    const res = labExperiment(toInput(draftRef.current));
    if (!res.ok || !res.recipe) { setMsg(res.reason ?? 'That did not work just now. Try again.'); return; }
    const info = { recipeId: res.recipe.id, text: res.text ?? '', discoveredNew: !!res.discoveredNew, improved: !!res.improved };
    net.sendKept(info);
    setKept({ id: info.recipeId, text: info.text, discoveredNew: info.discoveredNew, improved: info.improved });
    setMsg('');
  };

  if (sub === 'board') return <MenuBoardModal onClose={() => setSub(null)} onBook={() => setSub('book')} />;
  if (sub === 'book') return <RecipeBook onClose={() => setSub(null)} onBoard={() => setSub('board')} />;

  const note = (p: 'alchemist' | 'decorator') => {
    const who: PlayerId = roleOf('A', net.swapped) === p ? 'A' : 'B';
    return who === me ? 'You' : net.online ? s.names[who] : 'open together';
  };
  const recipe = kept ? s.cafe.lab?.recipes?.[kept.id] : null;

  return (
    <Sheet title="Test Kitchen ☕" onClose={onClose} size="xl">
      <div className="relative overflow-hidden rounded-3xl p-2 sm:p-4" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).getAttribute?.('role') === 'slider') { e.preventDefault(); keep(); } }}>
        <Room />
        <div className="relative z-10">
          {locked ? (
            <div className="mx-auto max-w-md rounded-3xl bg-cream/95 p-6 text-center text-cocoa shadow-lg">
              <LabImg k="labx_door_closed" className="mx-auto h-24" />
              <div className="mt-2 font-display text-xl font-bold">The Test Kitchen is still closed</div>
              <p className="text-sm text-cocoa/80">{locked}</p>
              <p className="mt-1 text-xs text-cocoa/60">When it opens, the two of you can invent drinks, name them and put them on the menu board.</p>
              <div className="mt-3 flex justify-center gap-2"><button className={softBtn} onClick={() => setSub('board')}>Menu board 🪧</button><button className={softBtn} onClick={() => setSub('book')}>Recipe book 📖</button></div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-cream/90 p-2 text-cocoa shadow">
                <Tag n={left} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base font-bold leading-tight">{left > 0 ? `${left} ${left === 1 ? 'experiment' : 'experiments'} left today` : 'All three experiments done today'}</div>
                  <div className="text-xs text-cocoa/70">{prog.recipeCount} {prog.recipeCount === 1 ? 'recipe' : 'recipes'} found · {prog.menuFilled} of 6 on the board · pantry {s.ingredients}</div>
                  <div className="text-xs text-cocoa/60">{prog.nextUnlock ? `Next to open: ${prog.nextUnlock}` : 'Every ingredient is open.'}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={`${softBtn} !px-3 !py-1.5 text-sm`} onClick={() => net.setSwapped(!net.swapped)} title="Trade places: the Alchemist becomes the Decorator">🔄 Swap roles</button>
                  <button className={`${softBtn} !px-3 !py-1.5 text-sm`} onClick={() => setSub('board')}>Menu board 🪧</button>
                  <button className={`${softBtn} !px-3 !py-1.5 text-sm`} onClick={() => setSub('book')}>Recipe book 📖</button>
                </div>
              </div>

              <div className="mt-2 flex gap-1.5 lg:hidden" role="tablist" aria-label="Roles">
                {(['alchemist', 'decorator'] as const).map((p) => (
                  <button key={p} role="tab" aria-selected={tab === p} className={`flex-1 cursor-pointer rounded-full px-3 py-1.5 text-sm font-bold transition ${tab === p ? 'bg-pink-400 text-white' : 'bg-cream/90 text-cocoa'}`} onClick={() => setTab(p)}>{p === 'alchemist' ? 'Flavor 🧪' : 'Look 🎨'}</button>
                ))}
              </div>

              <div className="mt-2 grid items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_240px_minmax(0,1fr)]">
                <div className={tab === 'alchemist' ? '' : 'hidden lg:block'}><AlchemistPanel s={s} draft={draft} set={set} disabled={!can('alchemist')} seen={s.cafe.lab?.seen ?? []} note={note('alchemist')} /></div>

                <div className="order-first flex flex-col items-center lg:order-none">
                  <div className="relative w-full max-w-[250px]" style={{ minHeight: 210 }}>
                    <LabImg k="labx_counter_top" className="absolute bottom-0 left-1/2 w-[220px] max-w-none -translate-x-1/2" fallback={<div className="absolute bottom-0 left-1/2 h-16 w-[220px] -translate-x-1/2 rounded-xl bg-[#b98a5a]" />} />
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 34 }}><Vessel draft={draft} size={150} mix={mixing} /></div>
                    <LabImg k="labx_fx_steam" className="pointer-events-none absolute left-1/2 w-28 -translate-x-1/2" style={{ bottom: 150, mixBlendMode: 'screen', opacity: 0.9, animation: reduce ? undefined : 'olw-drift 6s ease-in-out infinite' }} />
                  </div>
                  <div className="mt-1 flex gap-2">
                    <button className={`${softBtn} !px-4 !py-1.5 text-sm`} onClick={mix} disabled={mixing} title="Swirl the layers together">🥄 Mix</button>
                    <button className={`${softBtn} !px-4 !py-1.5 text-sm`} onClick={taste} title="Take a sip and see how it tastes">👅 Taste</button>
                    <button className={`${primaryBtn} !px-4 !py-1.5 text-sm`} onClick={keep} disabled={practice || !!kept} title={practice ? why : 'Keep this drink in your recipe book'}>Keep ✨</button>
                  </div>
                  {practice && <div className="mt-1 max-w-[250px] rounded-xl bg-cream/90 px-2 py-1 text-center text-[11px] font-bold text-cocoa" role="status">Practice mode. {why}</div>}
                  {tasted && (
                    <div className="mt-2 w-full max-w-[250px] rounded-2xl bg-cream/95 p-2 text-center text-cocoa shadow" role="status" aria-live="polite">
                      <div className="font-display text-sm font-bold">{verdict(tasted.close)}</div>
                      <div className="text-xs">{stars(tasted.q)} · would be a {TIER_NAMES[tasted.tier as keyof typeof TIER_NAMES]} drink</div>
                      {tasted.close < 0.9 && <div className="text-[11px] text-cocoa/70">Try {tempHint(draft) === 'just right' ? 'the temperature as it is' : tempHint(draft)}, and {sweetHint(draft) === 'just right' ? 'the sweetness as it is' : sweetHint(draft)}.</div>}
                    </div>
                  )}
                  {msg && <div className="mt-2 max-w-[250px] rounded-xl bg-white/95 px-2 py-1 text-center text-xs font-bold text-pink-600" role="status">{msg}</div>}
                </div>

                <div className={tab === 'decorator' ? '' : 'hidden lg:block'}><DecoratorPanel draft={draft} set={set} disabled={!can('decorator')} note={note('decorator')} /></div>
              </div>
              <p className="mt-2 rounded-xl bg-cream/80 px-3 py-1 text-center text-[11px] text-cocoa/80">
                {solo ? `${s.names[partner]} is not here right now, so you can shape everything yourself. Open the Test Kitchen on both phones to work side by side.` : `Working side by side with ${s.names[partner]}. Either of you can press Keep.`}
              </p>
            </>
          )}
        </div>
      </div>

      {kept && (
        <div className="olw-backdrop fixed inset-0 z-[90] flex items-center justify-center bg-cocoa/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Your new drink">
          <div className="olw-dialog max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-cream p-5 shadow-2xl">
            {kept.discoveredNew ? (
              <NameStep recipeId={kept.id} headline={kept.text} celebrate={!reduce} onDone={() => { setKept(null); setTasted(null); }} />
            ) : (
              <div className="grid items-center gap-4 text-cocoa sm:grid-cols-[170px_1fr]">
                <div className="mx-auto">{recipe ? <RecipeCard r={recipe} width={160} /> : <p className="text-sm">Opening your recipe book&hellip;</p>}</div>
                <div>
                  <div className="font-display text-xl font-bold">{kept.text || 'Tasty again.'}</div>
                  <p className="mt-1 text-sm text-cocoa/80">{kept.improved ? 'You made it better. The new look is in your book.' : 'Your best version stays in the book. Try a new mix of ingredients to discover another drink.'}</p>
                  <button className={`${primaryBtn} mt-3`} onClick={() => { setKept(null); setTasted(null); }}>Back to the counter</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
