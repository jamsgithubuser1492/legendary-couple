import { starterStage } from '../state/town';
import { useGameState } from '../state/store';
import Sheet, { primaryBtn } from './Sheet';

const TITLE = { rv: 'The RV Life', shop: 'The Shop & Café', home: 'The Home Foundation' } as const;
const STEPS = {
  rv: ['RV (starter)', 'Outdoor Decor', 'RV Upgrades', 'Expanded Plot'],
  shop: ['Basic Shop', 'Add Seating', 'Expand Menu', 'Full Café'],
  home: ['Foundation', 'Add Rooms', 'Decorate', 'Your Dream Home'],
} as const;
const base = import.meta.env.BASE_URL;

/** Your place on the island, the way it will look as it grows. The picture is your original art for the path. */
export default function SeeOnIsland({ onClose, onShowIsland }: { onClose: () => void; onShowIsland: () => void }) {
  const s = useGameState();
  const path = s.startingPath;
  if (!path) return null;
  const stage = starterStage(s); // 1 to 3
  const built = s.approvedCount >= 12 ? 4 : stage; // a fourth, fully grown step after 12 approved goals
  return (
    <Sheet title={`Your place on the island`} onClose={onClose} wide>
      <div className="overflow-hidden rounded-2xl shadow-lg">
        <img src={`${base}assets/sprites/path_scene_${path}.png`} alt={TITLE[path]} className="animate-pop block w-full" draggable={false} />
      </div>
      <div className="mt-3 font-display text-lg font-bold text-cocoa">{TITLE[path]}</div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {STEPS[path].map((label, i) => (
          <div key={label} className={`rounded-xl p-2 text-center ${i + 1 <= built ? 'bg-white shadow' : 'bg-white/50 opacity-60'}`}>
            <div className="flex h-14 items-center justify-center">
              <img src={`${base}assets/sprites/path_${path}_${i + 1}.png`} alt={label} className={`max-h-14 max-w-full object-contain ${i + 1 > built ? 'grayscale' : ''}`} draggable={false} />
            </div>
            <div className="mt-1 text-[11px] font-bold leading-tight text-cocoa">{label}</div>
            {i + 1 === built && <div className="text-[10px] font-bold text-pink-500">You are here</div>}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-cocoa/70">It grows as your partner approves your goals: a new step at 2, 6 and 12 approved goals. You have {s.approvedCount}.</p>
      <button className={`${primaryBtn} mt-3 w-full`} onClick={() => { onClose(); onShowIsland(); }}>Zoom to my build 🔍</button>
    </Sheet>
  );
}
