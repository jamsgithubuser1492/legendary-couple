import { ISLAND_STEPS } from '../state/placement';
import { CAFE_STEPS, nextCafeStep } from '../state/cafe';
import { Amount } from './Currency';
import { expandCafe, expandIsland, nextExpansion, useGameState } from '../state/store';
import Sheet, { primaryBtn, softBtn } from './Sheet';

export default function ExpandModal({ onClose, space = 'island' }: { onClose: () => void; space?: 'island' | 'cafe' }) {
  const s = useGameState();
  const cafe = space === 'cafe';
  const size = cafe ? s.cafe.size : s.islandSize;
  const next = cafe ? nextCafeStep(s) : nextExpansion();
  const steps = cafe ? CAFE_STEPS : ISLAND_STEPS;
  const side = (n: number) => (cafe ? n - 1 : n); // a café's size counts its back walls
  return (
    <Sheet title={cafe ? 'Expand your café ☕' : 'Expand your build area 🌴'} onClose={onClose}>
      <p className="text-sm text-cocoa/80">
        {cafe
          ? `Your café room is ${side(size)} x ${side(size)} tiles. Each expansion grows the room, so there is space for more tables, a bigger counter and a window bench.`
          : `Your island is ${size} x ${size} tiles. Each expansion grows it in every direction, so there is room for more rooms, gardens and friends.`}
      </p>
      <div className="mt-3 space-y-2">
        {steps.map((st) => (
          <div key={st.size} className={`flex items-center justify-between rounded-xl bg-white p-3 shadow ${size >= st.size ? 'opacity-60' : ''}`}>
            <span className="font-display font-bold text-cocoa">{side(st.size)} x {side(st.size)} tiles</span>
            <span className="text-sm text-cocoa">{size >= st.size ? '✓ Unlocked' : <Amount kind="coin" n={st.coins} />}</span>
          </div>
        ))}
      </div>
      {next ? (
        <button className={`${primaryBtn} mt-4 w-full`} disabled={s.coins < next.coins} onClick={() => { if (cafe ? expandCafe() : expandIsland()) onClose(); }}>
          Expand to {side(next.size)} x {side(next.size)} · <Amount kind="coin" n={next.coins} />
        </button>
      ) : (
        <p className="mt-4 rounded-xl bg-green-100 p-3 text-center text-sm text-cocoa">{cafe ? 'Your café is as big as it gets.' : 'Your island is as big as it gets. Explore the town for more space!'}</p>
      )}
      <button className={`${softBtn} mt-2 w-full`} onClick={onClose}>Close</button>
    </Sheet>
  );
}
