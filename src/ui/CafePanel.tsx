import { collectTips, expandCafe, setCafeTheme, useGameState } from '../state/store';
import { CAFE_STEPS, matchaBonus, nextCafeStep, SET_NAMES, sitToday, STAR_AT, styleOf, THEMES, tipCap, tipRate, tipsPending } from '../state/cafe';
import { Amount } from './Currency';
import { SpriteImg } from './ItemIcon';
import Sheet, { primaryBtn, softBtn } from './Sheet';

/** The café's front desk: its rating, what the room earns, the theme, and how big it is. */
export default function CafePanel({ onClose, onDecorate }: { onClose: () => void; onDecorate: () => void }) {
  const s = useGameState();
  const st = styleOf(s);
  const tips = tipsPending(s);
  const next = nextCafeStep(s);
  const open = st.seats > 0 && st.tables > 0;
  const room = s.cafe.size - 1;
  const bonus = Math.round(matchaBonus(s) * 100);

  return (
    <Sheet title="Our Café ☕" onClose={onClose}>
      <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 text-center">
        <div className="text-3xl">{'⭐'.repeat(st.stars)}<span className="opacity-30">{'⭐'.repeat(5 - st.stars)}</span></div>
        <div className="font-display text-lg font-bold text-cocoa">Style score {st.score}</div>
        <div className="text-xs text-cocoa/70">{st.next ? `${st.next - st.score} more for the next star` : 'A five star café!'} · stars at {STAR_AT.slice(1).join(', ')}</div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 shadow">
        <div className="font-display font-bold text-cocoa">Tips jar 🪙</div>
        <p className="text-xs text-cocoa/60">
          {open ? `Your café is open. It earns ${tipRate(st.stars)} coins an hour (up to ${tipCap(st.stars)}) and more with a higher rating.` : 'Add at least one seat and one table to open the café for business.'}
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
          <li>🪑 Matching sets: {st.sets.length ? st.sets.map((k) => SET_NAMES[k]).join(', ') + ' (+10 each)' : 'a table with two matching chairs gives +10 style'}</li>
        </ul>
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
