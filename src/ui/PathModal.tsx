import type { StartingPath } from '../types';

const OPTIONS: { id: StartingPath; icon: string; title: string; blurb: string; bg: string }[] = [
  { id: 'rv', icon: '🚐', title: 'The RV Life', blurb: 'Simple. Cozy. Mobile.', bg: 'bg-sky' },
  { id: 'shop', icon: '☕', title: 'The Shop & Café', blurb: 'Create a space for food, friends, and fun.', bg: 'bg-peach' },
  { id: 'home', icon: '🏡', title: 'The Home Foundation', blurb: 'Build your dream home from the ground up.', bg: 'bg-blush' },
];

interface Props {
  current: StartingPath | null;
  onPick: (p: StartingPath) => void;
  onClose?: () => void;
}

export default function PathModal({ current, onPick, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-cocoa/30 p-4 backdrop-blur-sm">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-3xl bg-cream p-5 shadow-2xl sm:p-8">
        <h2 className="font-display text-2xl font-bold text-cocoa sm:text-3xl">Choose Your Starting Path</h2>
        <p className="mt-1 text-sm text-cocoa/70">
          Each path is a different way to build your dream life. You can always change later!
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              className={`overflow-hidden rounded-2xl bg-white text-left shadow transition hover:scale-[1.03] active:scale-95 ${current === o.id ? 'ring-4 ring-pink-300' : ''}`}
            >
              <img src={`${import.meta.env.BASE_URL}assets/sprites/path_card_${o.id}.png`} alt={o.title} className="block aspect-[1.12] w-full object-cover" draggable={false} />
              <div className="p-3">
                <div className="font-display text-lg font-bold text-cocoa">{o.title}</div>
                <div className="text-sm text-cocoa/70">{o.blurb}</div>
              </div>
            </button>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} className="mt-5 text-sm font-semibold text-cocoa/60 underline">
            Keep my current path
          </button>
        )}
      </div>
    </div>
  );
}
