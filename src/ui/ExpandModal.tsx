import { ISLAND_STEPS } from '../state/placement';
import { expandIsland, nextExpansion, useGameState } from '../state/store';
import Sheet, { primaryBtn, softBtn } from './Sheet';

export default function ExpandModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const next = nextExpansion();
  return (
    <Sheet title="Expand your build area 🌴" onClose={onClose}>
      <p className="text-sm text-cocoa/80">Your island is {s.islandSize} x {s.islandSize} tiles. Each expansion grows it in every direction, so there is room for more rooms, gardens and friends.</p>
      <div className="mt-3 space-y-2">
        {ISLAND_STEPS.map((st) => (
          <div key={st.size} className={`flex items-center justify-between rounded-xl bg-white p-3 shadow ${s.islandSize >= st.size ? 'opacity-60' : ''}`}>
            <span className="font-display font-bold text-cocoa">{st.size} x {st.size} tiles</span>
            <span className="text-sm text-cocoa">{s.islandSize >= st.size ? '✓ Unlocked' : `🪙 ${st.coins.toLocaleString()}`}</span>
          </div>
        ))}
      </div>
      {next ? (
        <button className={`${primaryBtn} mt-4 w-full`} disabled={s.coins < next.coins} onClick={() => { if (expandIsland()) onClose(); }}>
          Expand to {next.size} x {next.size} · 🪙 {next.coins.toLocaleString()}
        </button>
      ) : (
        <p className="mt-4 rounded-xl bg-green-100 p-3 text-center text-sm text-cocoa">Your island is as big as it gets. Explore the town for more space!</p>
      )}
      <button className={`${softBtn} mt-2 w-full`} onClick={onClose}>Close</button>
    </Sheet>
  );
}
