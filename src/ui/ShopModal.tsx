import { useState } from 'react';
import { availableIn, CATALOG, CATEGORIES, type ShopCategory } from '../state/catalog';
import { THEMES, useTheme } from '../state/season';
import { buyItem, useGameState } from '../state/store';
import ItemIcon from './ItemIcon';
import { PRESETS } from '../state/presets';

export default function ShopModal({ onClose, onPickPreset }: { onClose: () => void; onPickPreset?: (id: string) => void }) {
  const s = useGameState();
  const theme = useTheme();
  const [cat, setCat] = useState<ShopCategory | 'rooms'>(onPickPreset ? 'rooms' : 'furniture');
  const items = cat === 'rooms' ? [] : CATALOG.filter((i) => i.category === cat);
  const owned = (id: string) => s.inventory.find((i) => i.id === id)?.count ?? 0;
  const placedCount = (id: string) => s.placed.filter((p) => p.itemId === id).length;
  const info = THEMES.find((t) => t.id === theme)!;

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-cocoa/30 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92%] w-full max-w-2xl flex-col rounded-t-3xl bg-cream p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-cocoa">Decor Shop</h2>
          <div className="flex items-center gap-3 font-display font-bold text-cocoa">
            <span>🪙 {s.coins.toLocaleString()}</span>
            <span>💎 {s.gems}</span>
            <button onClick={onClose} className="rounded-full bg-blush px-3 py-1" aria-label="Close">✕</button>
          </div>
        </div>
        <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
          {onPickPreset && (
            <button onClick={() => setCat('rooms')} className={`shrink-0 rounded-full px-4 py-1.5 font-display font-bold ${cat === 'rooms' ? 'bg-pink-400 text-white' : 'bg-peach text-cocoa'}`}>🏠 Room Designs</button>
          )}
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-4 py-1.5 font-display font-bold ${cat === c.id ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>
              {c.label}
            </button>
          ))}
        </div>
        {cat === 'seasonal' && (
          <p className="mt-2 shrink-0 rounded-xl bg-gradient-to-r from-pink-100 to-amber-100 p-2 text-sm text-cocoa">
            {info.icon} It is {info.label} on your island. Limited time items are sold only in season. Anything you own stays yours.
          </p>
        )}
        {cat === 'rooms' && (
          <div className="mt-3 grid grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
            {PRESETS.map((p) => {
              const inSeason = !p.seasons || p.seasons.includes(theme);
              const afford = s.coins >= p.price.coins && s.gems >= p.price.gems;
              return (
                <div key={p.id} className={`flex flex-col rounded-2xl bg-white p-3 shadow ${inSeason ? '' : 'opacity-60'}`}>
                  <div className="flex items-end justify-center gap-1 rounded-xl bg-gradient-to-br from-pink-50 to-amber-50 p-2">
                    {p.hero.map((id) => <ItemIcon key={id} id={id} size={46} />)}
                  </div>
                  <div className="mt-2 font-display font-bold text-cocoa">{p.icon} {p.name}</div>
                  <div className="text-xs text-cocoa/70">{p.blurb}</div>
                  <div className="mt-1 text-xs text-cocoa/50">{p.w} x {p.d} tiles, fully furnished</div>
                  <button
                    disabled={!afford || !inSeason}
                    onClick={() => onPickPreset?.(p.id)}
                    className="mt-2 rounded-full bg-pink-400 px-3 py-1.5 font-display text-sm font-bold text-white shadow active:scale-95 disabled:opacity-40"
                  >
                    {!inSeason ? 'Back in winter' : <>{p.price.coins > 0 && `🪙 ${p.price.coins}`} {p.price.gems > 0 && `💎 ${p.price.gems}`} · Place it</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className={`mt-3 grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 ${cat === 'rooms' ? 'hidden' : ''}`}>
          {items.map((it) => {
            const inSeason = availableIn(it, theme);
            const afford = s.coins >= it.price.coins && s.gems >= it.price.gems;
            const have = owned(it.id), used = placedCount(it.id);
            const returns = it.seasons?.map((t) => THEMES.find((x) => x.id === t)?.label).join(' / ');
            return (
              <div key={it.id} className={`flex flex-col rounded-2xl bg-white p-3 text-center shadow ${inSeason ? '' : 'opacity-60'}`}>
                <div className="flex h-14 items-center justify-center"><ItemIcon id={it.id} size={52} /></div>
                <div className="mt-1 font-display font-bold text-cocoa">{it.name}</div>
                <div className="text-xs text-cocoa/60">{have} in bag · {used} placed</div>
                {it.seasons && <div className="text-xs text-pink-500">Limited: {returns}</div>}
                <button
                  disabled={!afford || !inSeason}
                  onClick={() => buyItem(it.id)}
                  className="mt-2 rounded-full bg-pink-400 px-3 py-1.5 font-display text-sm font-bold text-white shadow active:scale-95 disabled:opacity-40"
                >
                  {!inSeason ? `Back in ${returns}` : <>{it.price.coins > 0 && `🪙 ${it.price.coins}`} {it.price.gems > 0 && `💎 ${it.price.gems}`}</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
