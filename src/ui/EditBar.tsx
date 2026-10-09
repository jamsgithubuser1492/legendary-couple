import { itemOf } from '../state/catalog';
import { useGameState } from '../state/store';
import ItemIcon from './ItemIcon';
import { presetOf } from '../state/presets';

export interface EditState {
  mode: 'place' | 'remove';
  itemId: string | null;
  presetId?: string | null;
  rotation: 0 | 90 | 180 | 270;
}

interface Props {
  edit: EditState;
  onChange: (e: EditState) => void;
  onShop: () => void;
  onExpand: () => void;
  onDone: () => void;
}

const chip = 'pointer-events-auto rounded-full px-3 py-2 font-display font-bold shadow active:scale-95';

export default function EditBar({ edit, onChange, onShop, onExpand, onDone }: Props) {
  const s = useGameState();
  const bag = s.inventory.filter((i) => i.count > 0 && itemOf(i.id));
  const preset = edit.presetId ? presetOf(edit.presetId) : undefined;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 rounded-t-3xl bg-cream/95 p-3 shadow-2xl">
      {preset && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3">
          <div>
            <div className="font-display font-bold text-cocoa">{preset.icon} Placing {preset.name}</div>
            <div className="text-xs text-cocoa/70">Move over the island, green means it fits. Tap to buy and place the whole room. 🪙 {preset.price.coins} {preset.price.gems > 0 && `💎 ${preset.price.gems}`}</div>
          </div>
          <button className={`${chip} bg-white text-cocoa`} onClick={() => onChange({ ...edit, presetId: null })}>Cancel</button>
        </div>
      )}
      <div className={`flex items-center gap-2 ${preset ? 'hidden' : ''}`}>
        <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {bag.length === 0 && <span className="py-2 text-sm text-cocoa/60">Your bag is empty. Visit the shop or complete quests!</span>}
          {bag.map((i) => {
            const it = itemOf(i.id)!;
            const sel = edit.mode === 'place' && edit.itemId === i.id;
            return (
              <button
                key={i.id}
                onClick={() => onChange({ ...edit, mode: 'place', itemId: i.id, presetId: null })}
                className={`relative flex h-14 min-w-14 shrink-0 items-center justify-center rounded-2xl px-2 ${sel ? 'bg-pink-200 ring-4 ring-pink-400' : 'bg-white'}`}
                title={it.name}
              >
                <ItemIcon id={i.id} size={38} />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cocoa px-1 text-xs text-cream">{i.count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button className={`${chip} bg-white text-cocoa`} onClick={() => onChange({ ...edit, rotation: ((edit.rotation + 90) % 360) as EditState['rotation'] })}>↻ Rotate</button>
          <button className={`${chip} ${edit.mode === 'remove' ? 'bg-red-400 text-white' : 'bg-white text-cocoa'}`} onClick={() => onChange({ ...edit, mode: edit.mode === 'remove' ? 'place' : 'remove' })}>
            🧺 Pick up
          </button>
          <button className={`${chip} bg-peach text-cocoa`} onClick={onShop}>🛍 Shop</button>
          <button className={`${chip} bg-white text-cocoa`} onClick={onExpand}>🌴 Expand</button>
        </div>
        <button className={`${chip} bg-pink-400 text-white`} onClick={onDone}>Done ✓</button>
      </div>
      <p className="mt-1 text-xs text-cocoa/60">
        {edit.mode === 'remove' ? 'Tap an object, or your starter, to put it back in your bag.' : edit.itemId ? `Tap a tile to place ${itemOf(edit.itemId)?.name}. Green means it fits.` : 'Pick an item from your bag.'}
      </p>
    </div>
  );
}
