import { collectTips, expandCafe, hireStaff, setCafeTheme, setSign, useGameState } from '../state/store';
import { CAFE_STEPS, matchaBonus, nextCafeStep, SET_NAMES, SIGNS, sitToday, STAFF, STAR_AT, styleOf, THEMES, tipCap, tipMult, tipRate, tipsPending } from '../state/cafe';
import { labLocked } from './lab/draft';
import { menuRecipes, recipesOf } from '../state/lab';
import { crewDef, currentShift, hiredCrew, rosterActive, rosterDaysLeft, rosterMatch, shiftLabel } from '../state/crew';
import { Amount } from './Currency';
import { SpriteImg } from './ItemIcon';
import Sheet, { primaryBtn, softBtn } from './Sheet';

/** The café's front desk: its rating, what the room earns, the theme, and how big it is. */
export default function CafePanel({ onClose, onDecorate, onCrew, onRoster, onLab }: { onClose: () => void; onDecorate: () => void; onCrew: () => void; onRoster: () => void; onLab: (w: 'lab' | 'board' | 'book') => void }) {
  const s = useGameState();
  const st = styleOf(s);
  const tips = tipsPending(s);
  const next = nextCafeStep(s);
  const open = st.seats > 0 && st.tables > 0;
  const room = s.cafe.size - 1;
  const bonus = Math.round(matchaBonus(s) * 100);
  const crew = hiredCrew(s);
  const onShift = rosterMatch(s, currentShift()).crew.map((id) => crewDef(id)?.name).filter(Boolean);
  const rosterOn = rosterActive(s);

  return (
    <Sheet title="Our Café ☕" onClose={onClose}>
      <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 text-center">
        <div className="relative mx-auto w-44"><img src={`${import.meta.env.BASE_URL}assets/sprites/cz_stars.png`} alt="" className="w-44 opacity-30" draggable={false} /><div className="absolute left-0 top-0 overflow-hidden" style={{ width: `${st.stars * 20}%` }}><img src={`${import.meta.env.BASE_URL}assets/sprites/cz_stars.png`} alt="" className="w-44 max-w-none" draggable={false} /></div></div>
        <div className="font-display text-lg font-bold text-cocoa">Style score {st.score}</div>
        <div className="text-xs text-cocoa/70">{st.next ? `${st.next - st.score} more for the next star` : 'A five star café!'} · stars at {STAR_AT.slice(1).join(', ')}</div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 shadow">
        <div className="font-display font-bold text-cocoa">Tips jar 🪙</div>
        <p className="text-xs text-cocoa/60">
          {open ? `Your café is open. It earns ${tipRate(s).toFixed(1)} coins an hour (up to ${tipCap(s)}), x${tipMult(s).toFixed(2)} from your rating, register, pets, sign, popularity and staff.` : 'Add at least one seat and one table to open the café for business.'}
        </p>
        <button className={`${primaryBtn} mt-2 w-full`} disabled={tips < 1} onClick={collectTips}>
          Collect <Amount kind="coin" n={tips} size={16} />
        </button>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-cocoa shadow">
        <div className="font-display font-bold">What your room does</div>
        <ul className="mt-1 space-y-1 text-xs text-cocoa/80">
          <li>🍵 Matcha Masters coins: <b>+{bonus}%</b> ({Math.min(2, st.pastry)} pastry case{st.pastry === 1 ? '' : 's'} count, plus your rating)</li>
          <li>☕ Espresso station: {st.espresso ? 'placed, and it taught the café a recipe' : 'not placed yet, it unlocks a new recipe'}</li>
          <li>💞 Window bench: {st.bench ? (sitToday(s) ? 'you sat together today' : 'tap it to sit together today (+15 coins, +1 shell)') : 'not placed yet'}</li>
          <li>🍵 Whisk station: {st.whisk ? 'stocks your pantry each day you visit' : 'not placed yet'}</li>
          <li>🧾 Register {st.register ? '✓ +15% tips' : '(a point of sale counter adds 15% tips)'} · 🐾 Pet corner {st.pets} (+3% each, up to 5) · 🍳 Kitchen {st.kitchen ? '✓ oven and fridge stock the pantry' : '(an oven and fridge stock the pantry)'}</li>
          <li>🪑 Matching sets: {st.sets.length ? st.sets.map((k) => SET_NAMES[k]).join(', ') + ' (+10 each)' : 'a table with two matching chairs gives +10 style'}</li>
        </ul>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 shadow">
        <div className="font-display font-bold text-cocoa">Your crew 👥</div>
        <p className="text-xs text-cocoa/70">
          {crew.length} on the crew. {rosterOn ? `Roster running, ${rosterDaysLeft(s)} ${rosterDaysLeft(s) === 1 ? 'day' : 'days'} left. ${shiftLabel(currentShift())}: ${onShift.length ? onShift.join(' and ') : 'nobody yet'}.` : 'No roster running. You can start one any day.'}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className={`${primaryBtn} !px-3 !py-1.5 text-sm`} onClick={onCrew}>Café crew</button>
          <button className={`${softBtn} !px-3 !py-1.5 text-sm`} onClick={onRoster}>Roster</button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 shadow">
        <div className="font-display font-bold text-cocoa">Test Kitchen 🧪</div>
        <p className="text-xs text-cocoa/70">
          {labLocked(s) ?? `${recipesOf(s).length} ${recipesOf(s).length === 1 ? 'recipe' : 'recipes'} found, ${menuRecipes(s).length} of 6 on the menu board.`}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button className={`${primaryBtn} !px-2 !py-1.5 text-sm`} onClick={() => onLab('lab')}>Test Kitchen</button>
          <button className={`${softBtn} !px-2 !py-1.5 text-sm`} onClick={() => onLab('board')}>Menu board</button>
          <button className={`${softBtn} !px-2 !py-1.5 text-sm`} onClick={() => onLab('book')}>Recipe book</button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 shadow">
        <div className="font-display font-bold text-cocoa">Baristas ☕</div>
        <p className="text-xs text-cocoa/60">Hire help over time. There are no wages and nothing to manage, each one just adds a perk. Open the Café crew to grow them.</p>
        <div className="mt-2 space-y-2">
          {STAFF.map((m) => {
            const own = s.cafe.staff.includes(m.id);
            return (
              <div key={m.id} className="flex items-center gap-2 rounded-xl bg-cream p-2">
                <SpriteImg sprite={`${m.sprite}_fl`} size={44} />
                <div className="flex-1 text-xs text-cocoa"><div className="font-display text-sm font-bold">{m.name} · {m.role}</div><div className="opacity-70">{m.perk}</div></div>
                {own ? <span className="text-xs font-bold text-emerald-700">Hired ✓</span> : <button className={`${softBtn} !px-3 !py-1 text-xs`} disabled={s.coins < m.price} onClick={() => hireStaff(m.id)}><Amount kind="coin" n={m.price} size={12} /></button>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 shadow">
        <div className="font-display font-bold text-cocoa">Sidewalk chalkboard 🪧</div>
        <p className="text-xs text-cocoa/60">{st.sign ? 'Pick today’s message. It decides which guests drop in and adds a small tip boost.' : 'Place the Sidewalk Chalkboard in your café to choose a message.'}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {SIGNS.map((g) => (
            <button key={g.id} disabled={!st.sign || st.stars < g.stars} onClick={() => setSign(g.id)} className={`relative overflow-hidden rounded-xl ${s.cafe.sign === g.id ? 'ring-4 ring-amber-300' : ''} disabled:opacity-50`}>
              <img src={`${import.meta.env.BASE_URL}assets/sprites/${g.art}.png`} alt={g.name} draggable={false} />
              {st.stars < g.stars && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">🔒 {g.stars}⭐</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="font-display font-bold text-cocoa">Room theme</div>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const owned = s.cafe.themes.includes(t.id);
            const on = s.cafe.theme === t.id;
            return (
              <button key={t.id} onClick={() => setCafeTheme(t.id)} disabled={!owned && s.coins < t.price} className={`rounded-2xl bg-white p-2 text-center shadow ${on ? 'ring-4 ring-pink-300' : ''} disabled:opacity-50`}>
                <SpriteImg sprite={t.preview} size={64} />
                <div className="mt-1 text-[11px] font-bold leading-tight text-cocoa">{t.name.replace('Traditional ', '').replace('Minimalist ', '')}</div>
                <div className="text-[10px] text-cocoa/60">{on ? 'In use' : owned ? 'Switch' : <Amount kind="coin" n={t.price} size={11} />}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 shadow">
        <div className="flex items-center justify-between">
          <div className="font-display font-bold text-cocoa">Room size {room} x {room}</div>
          <div className="text-xs text-cocoa/60">{CAFE_STEPS.filter((x) => x.size <= s.cafe.size).length} of {CAFE_STEPS.length} expansions</div>
        </div>
        {next ? (
          <button className={`${softBtn} mt-2 w-full`} disabled={s.coins < next.coins} onClick={expandCafe}>
            Expand to {next.size - 1} x {next.size - 1} · <Amount kind="coin" n={next.coins} size={14} />
          </button>
        ) : (
          <p className="mt-1 text-xs text-cocoa/60">Your café is as big as it gets.</p>
        )}
      </div>

      <button className={`${primaryBtn} mt-3 w-full`} onClick={() => { onClose(); onDecorate(); }}>Decorate the café 🎨</button>
    </Sheet>
  );
}
