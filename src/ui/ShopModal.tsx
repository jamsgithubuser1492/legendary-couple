import { useState } from 'react';
import { Price } from './Currency';
import { availableIn, CATALOG, CATEGORIES, type ShopCategory } from '../state/catalog';
import { THEMES, useTheme } from '../state/season';
import { buyItem, useGameState } from '../state/store';
import ItemIcon from './ItemIcon';
import { CurrencyIcon } from './Currency';
import { PRESETS } from '../state/presets';
import Sheet from './Sheet';
import { useMedia } from './useMedia';

export default function ShopModal({ onClose, onPickPreset, initialCat }: { onClose: () => void; onPickPreset?: (id: string) => void; initialCat?: ShopCategory }) {
  const s = useGameState();
  const theme = useTheme();
  const [cat, setCat] = useState<ShopCategory | 'rooms'>(initialCat ?? (onPickPreset ? 'rooms' : 'furniture'));
  const items = cat === 'rooms' ? [] : CATALOG.filter((i) => i.category === cat);
  const owned = (id: string) => s.inventory.find((i) => i.id === id)?.count ?? 0;
  const placedCount = (id: string) => s.placed.filter((p) => p.itemId === id).length;
  const info = THEMES.find((t) => t.id === theme)!;
  const roomy = useMedia('(min-width: 640px)');

  const tab = (id: ShopCategory | 'rooms', label: string, idle: string) => (
    <button
      key={id}
      onClick={() => setCat(id)}
      aria-pressed={cat === id}
      className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-left font-display font-bold transition hover:brightness-95 sm:rounded-2xl sm:py-2 ${cat === id ? 'bg-pink-400 text-white' : `${idle} text-cocoa`}`}
    >
      {label}
    </button>
  );
  const buy = 'mt-2 cursor-pointer rounded-full bg-pink-400 px-3 py-1.5 font-display text-sm font-bold text-white shadow transition hover:bg-pink-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-pink-400';

  return (
    <Sheet title="Decor Shop" onClose={onClose} size="lg">
      <div className="mb-3 flex items-center justify-end gap-4 font-display font-bold text-cocoa">
        <span title="Coins"><CurrencyIcon kind="coin" size={20} /> {s.coins.toLocaleString()}</span>
        <span title="Gems"><CurrencyIcon kind="gem" size={20} /> {s.gems}</span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
        <nav aria-label="Shop categories" className="flex shrink-0 gap-2 overflow-x-auto pb-1 sm:sticky sm:top-0 sm:w-44 sm:flex-col sm:self-start sm:overflow-visible sm:pb-0">
          {onPickPreset && tab('rooms', '🏠 Room Designs', 'bg-peach')}
          {CATEGORIES.map((c) => tab(c.id, c.label, 'bg-blush'))}
        </nav>
        <div className="min-w-0 flex-1">
          {cat === 'seasonal' && (
            <p className="mb-3 rounded-xl bg-gradient-to-r from-pink-100 to-amber-100 p-2 text-sm text-cocoa">
              {info.icon} It is {info.label} on your island. Limited time items are sold only in season. Anything you own stays yours.
            </p>
          )}
          {cat === 'rooms' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PRESETS.map((p) => {
                const inSeason = !p.seasons || p.seasons.includes(theme);
                const afford = s.coins >= p.price.coins && s.gems >= p.price.gems;
                return (
                  <div key={p.id} className={`flex flex-col rounded-2xl bg-white p-3 shadow transition hover:shadow-md ${inSeason ? '' : 'opacity-60'}`}>
                    <div className="flex items-end justify-center gap-1 rounded-xl bg-gradient-to-br from-pink-50 to-amber-50 p-2">
                      {p.hero.map((id) => <ItemIcon key={id} id={id} size={roomy ? 58 : 46} />)}
                    </div>
                    <div className="mt-2 font-display font-bold text-cocoa">{p.icon} {p.name}</div>
                    <div className="text-xs text-cocoa/70">{p.blurb}</div>
                    <div className="mt-1 text-xs text-cocoa/60">{p.w} x {p.d} tiles, fully furnished</div>
                    <button disabled={!afford || !inSeason} onClick={() => onPickPreset?.(p.id)} className={buy}>
                      {!inSeason ? 'Back in winter' : <><Price coins={p.price.coins} gems={p.price.gems} /> · Place it</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 ${cat === 'rooms' ? 'hidden' : ''}`}>
            {items.map((it) => {
              const inSeason = availableIn(it, theme);
              const afford = s.coins >= it.price.coins && s.gems >= it.price.gems;
              const have = owned(it.id), used = placedCount(it.id);
              const returns = it.seasons?.map((t) => THEMES.find((x) => x.id === t)?.label).join(' / ');
              return (
                <div key={it.id} className={`flex flex-col rounded-2xl bg-white p-3 text-center shadow transition hover:shadow-md ${inSeason ? '' : 'opacity-60'}`}>
                  <div className="flex h-14 items-center justify-center sm:h-20"><ItemIcon id={it.id} size={roomy ? 72 : 52} /></div>
                  <div className="mt-1 font-display font-bold text-cocoa">{it.name}</div>
                  <div className="text-xs text-cocoa/60">{have} in bag · {used} placed</div>
                  {it.seasons && <div className="text-xs text-pink-600">Limited: {returns}</div>}
                  <button disabled={!afford || !inSeason} onClick={() => buyItem(it.id)} className={`${buy.replace('mt-2 ', '')} mt-auto pt-1.5`}>
                    {!inSeason ? `Back in ${returns}` : <Price coins={it.price.coins} gems={it.price.gems} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
