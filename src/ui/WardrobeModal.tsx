import { useState } from 'react';
import type { CompanionId } from '../types';
import { COMPANIONS, outfitOf, outfitsFor } from '../state/wardrobe';
import { buyOutfit, setInvited, setLook, useGameState, wearOutfit } from '../state/store';
import { SpriteImg } from './ItemIcon';
import Sheet, { primaryBtn, softBtn } from './Sheet';

export default function WardrobeModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const [cid, setCid] = useState<CompanionId>('kitty');
  const comp = COMPANIONS.find((c) => c.id === cid)!;
  const invited = s.wardrobe.invited.includes(cid);
  const wearing = outfitOf(s.wardrobe.equipped[cid]);

  return (
    <Sheet title="Wardrobe 👗" onClose={onClose} wide>
      <div className="flex items-center justify-between text-sm font-bold text-cocoa">
        <span>🪙 {s.coins.toLocaleString()}  💎 {s.gems}</span>
      </div>
      <div className="mt-2 rounded-2xl bg-white p-3 shadow">
        <div className="font-display font-bold text-cocoa">Your looks</div>
        {(['A', 'B'] as const).map((p) => (
          <div key={p} className="mt-1 flex items-center gap-2 text-sm text-cocoa">
            <span className="w-20 font-bold">{s.names[p]}</span>
            {([['cream', '🧢 Cream cap'], ['dark', '🖤 Dark cap & beanie']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setLook(p, id)} className={`rounded-full px-3 py-1 font-display font-bold ${s.looks[p] === id ? 'bg-pink-400 text-white' : 'bg-blush'}`}>{label}</button>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        {COMPANIONS.map((c) => (
          <button key={c.id} onClick={() => setCid(c.id)} className={`rounded-full px-4 py-1.5 font-display font-bold ${cid === c.id ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3">
        <div className="flex h-28 w-24 items-end justify-center">{wearing && <SpriteImg sprite={wearing.sprite} size={104} />}</div>
        <div className="flex-1">
          <div className="font-display text-lg font-bold text-cocoa">{comp.name}</div>
          <div className="text-sm text-cocoa/70">Wearing {wearing?.name}</div>
          <button className={`${invited ? softBtn : primaryBtn} mt-2`} onClick={() => setInvited(cid, !invited)}>
            {invited ? 'Send home' : 'Invite to the island'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {outfitsFor(cid).map((o) => {
          const owned = s.wardrobe.owned.includes(o.id);
          const equipped = s.wardrobe.equipped[cid] === o.id;
          const afford = s.coins >= o.price.coins && s.gems >= o.price.gems;
          return (
            <div key={o.id} className={`flex flex-col rounded-2xl bg-white p-3 text-center shadow ${equipped ? 'ring-4 ring-pink-300' : ''}`}>
              <div className="flex h-24 items-end justify-center"><SpriteImg sprite={o.sprite} size={88} /></div>
              <div className="mt-1 font-display font-bold text-cocoa">{o.name}</div>
              {owned ? (
                <button disabled={equipped} onClick={() => wearOutfit(o.id)} className="mt-2 rounded-full bg-pink-400 px-3 py-1.5 font-display text-sm font-bold text-white shadow active:scale-95 disabled:bg-green-300">
                  {equipped ? 'Wearing ✓' : 'Wear'}
                </button>
              ) : (
                <button disabled={!afford} onClick={() => buyOutfit(o.id)} className="mt-2 rounded-full bg-pink-400 px-3 py-1.5 font-display text-sm font-bold text-white shadow active:scale-95 disabled:opacity-40">
                  {o.price.coins > 0 && `🪙 ${o.price.coins}`} {o.price.gems > 0 && `💎 ${o.price.gems}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-cocoa/60">
        Outfits for the two of you need new character sprites. They are on the art wish list, and this wardrobe is ready for them.
      </p>
    </Sheet>
  );
}
