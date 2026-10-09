import type { HoverPayload } from '../game/events';
import type { StartingPath } from '../types';

const LABEL: Record<StartingPath, string> = {
  rv: '🚐 The RV Life',
  shop: '☕ The Shop & Café',
  home: '🏡 The Home Foundation',
};

interface Props {
  path: StartingPath | null;
  hover: HoverPayload;
  onCenter: () => void;
  onZoom: (d: number) => void;
  onChangePath: () => void;
}

const btn =
  'pointer-events-auto rounded-full bg-cream/90 px-4 py-2 font-display text-base font-bold text-cocoa shadow active:scale-95';

export default function Hud({ path, hover, onCenter, onZoom, onChangePath }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 rounded-full bg-cream/90 px-3 py-1.5 shadow">
          <span className="text-xl">🧑</span>
          <span className="font-display text-sm font-bold text-cocoa">Lv. 1</span>
          <span className="font-display text-sm text-cocoa">🪙 1,000</span>
          <span className="font-display text-sm text-cocoa">💎 50</span>
        </div>
        <div className="rounded-2xl bg-cream/90 px-3 py-1.5 text-right shadow">
          <div className="font-display text-sm font-bold text-cocoa">Our Little World ♡</div>
          <div className="text-xs text-cocoa/70">{path ? LABEL[path] : 'Pick a path'}</div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="rounded-full bg-cream/90 px-3 py-1.5 text-xs text-cocoa shadow">
          {hover ? `Tile (${hover.x}, ${hover.y})` : 'Tap a tile to walk'}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button className={btn} onClick={() => onZoom(-0.2)} aria-label="Zoom out">−</button>
          <button className={btn} onClick={() => onZoom(0.2)} aria-label="Zoom in">+</button>
          <button className={btn} onClick={onCenter}>🎯 Center</button>
          <button className={btn} onClick={onChangePath}>🗺️ Path</button>
        </div>
      </div>
    </div>
  );
}
