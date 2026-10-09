import { useState } from 'react';
import { CATALOG, CATEGORIES, type ShopCategory } from '../state/catalog';
import { buyItem, useGameState } from '../state/store';

export default function ShopModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const [cat, setCat] = useState<ShopCategory>('furniture');
  const items = CATALOG.filter((i) => i.category === cat);
  const owned = (id: string) => s.inventory.find((i) => i.id === id)?.count ?? 0;
  const placedCount = (id: string) => s.placed.filter((p) => p.itemId === id).length;

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
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-4 py-1.5 font-display font-bold ${cat === c.id ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {items.map((it) => {
            const afford = s.coins >= it.price.coins && s.gems >= it.price.gems;
            const have = owned(it.id), used = placedCount(it.id);
            return (
              <div key={it.id} className="flex flex-col rounded-2xl bg-white p-3 text-center shadow">
                <div className="text-4xl">{it.icon}</div>
                <div className="mt-1 font-display font-bold text-cocoa">{it.name}</div>
                <div className="text-xs text-cocoa/60">{have} in bag · {used} placed</div>
                <button
                  disabled={!afford}
                  onClick={() => buyItem(it.id)}
                  className="mt-2 rounded-full bg-pink-400 px-3 py-1.5 font-display text-sm font-bold text-white shadow active:scale-95 disabled:opacity-40"
                >
                  {it.price.coins > 0 && `🪙 ${it.price.coins}`} {it.price.gems > 0 && `💎 ${it.price.gems}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
