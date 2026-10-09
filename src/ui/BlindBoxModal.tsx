import { BOX_PRICE_GEMS, RARITY } from '../state/blindbox';
import { itemOf } from '../state/catalog';
import { outfitOf } from '../state/wardrobe';
import { buyBlindBox, buyBlindBoxWithShells, cancelOpenBox, confirmOpenBox, otherPlayer, startOpenBox, useGameState, useMe } from '../state/store';
import type { BlindReward } from '../types';
import ItemIcon, { SpriteImg } from './ItemIcon';
import { BoxImg, boxFor, CurrencyIcon } from './Currency';
import Sheet, { primaryBtn, softBtn } from './Sheet';

export function rewardName(r: BlindReward): string {
  if (r.kind === 'coins') return `${r.amount} coins`;
  if (r.kind === 'gems') return r.duplicate ? `${r.amount} gems (duplicate refund)` : `${r.amount} gems`;
  if (r.kind === 'item') return itemOf(r.refId!)?.name ?? 'Surprise item';
  return outfitOf(r.refId!)?.name ?? 'New outfit';
}

function RewardArt({ r, size }: { r: BlindReward; size: number }) {
  if (r.kind === 'coins') return <CurrencyIcon kind="coin" size={size} />;
  if (r.kind === 'gems') return <CurrencyIcon kind="gem" size={size} />;
  if (r.kind === 'item') return <ItemIcon id={r.refId!} size={size} />;
  const o = outfitOf(r.refId!);
  return o ? <SpriteImg sprite={o.sprite} size={size} /> : null;
}

export default function BlindBoxModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const partner = s.names[otherPlayer(me)];
  const pending = s.pendingBox;

  return (
    <Sheet title="Blind Boxes 🎁" onClose={onClose}>
      <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 text-center">
        <BoxImg sprite="box_standard" size={150} className={pending ? 'animate-wiggle' : ''} />
        <div className="mt-1 font-display text-2xl font-bold text-cocoa">× {s.blindBoxes}</div>
      </div>

      <div className="mt-4 text-center">
        {pending && pending.by === me && (
          <>
            <p className="text-cocoa">Waiting for {partner} to join you…</p>
            <p className="text-xs text-cocoa/60">The box stays sealed until you both tap.</p>
            <button className={`${softBtn} mt-3`} onClick={cancelOpenBox}>Cancel</button>
          </>
        )}
        {pending && pending.by !== me && (
          <>
            <p className="text-cocoa"><b>{s.names[pending.by]}</b> is ready to open a box with you!</p>
            <button className={`${primaryBtn} mt-3`} onClick={() => { confirmOpenBox(me); onClose(); }}>Open together 🎉</button>
            <button className={`${softBtn} ml-2 mt-3`} onClick={cancelOpenBox}>Not now</button>
          </>
        )}
        {!pending && s.blindBoxes > 0 && (
          <>
            <p className="text-cocoa">Blind boxes are opened together. Tap start, then ask {partner} to join.</p>
            <button className={`${primaryBtn} mt-3`} onClick={() => startOpenBox(me)}>Start opening</button>
          </>
        )}
        {!pending && s.blindBoxes === 0 && <p className="text-cocoa/70">No boxes right now.</p>}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-3 text-sm text-cocoa shadow">
        <p className="font-display font-bold">How to earn boxes</p>
        <ul className="mt-1 list-disc pl-5 text-cocoa/80">
          <li>Scratch card dates and zero agenda days</li>
          <li>Every 5th approved quest</li>
          <li>A 7 day streak of daily check-ins</li>
        </ul>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((r) => (
            <span key={r} className={`rounded-full px-2 py-0.5 ${RARITY[r].color}`}>{RARITY[r].label}</span>
          ))}
        </div>
      </div>
      <button className={`${softBtn} mt-3 w-full`} disabled={s.gems < BOX_PRICE_GEMS} onClick={buyBlindBox}>
        Buy a box · <CurrencyIcon kind="gem" size={18} /> {BOX_PRICE_GEMS}
      </button>
      <button className={`${softBtn} mt-2 w-full`} disabled={s.shells < 10} onClick={buyBlindBoxWithShells}>
        Trade 10 Heart Shells 🐚 for a box
      </button>
    </Sheet>
  );
}

export function RevealModal({ reward, openedBy, onClose }: { reward: BlindReward; openedBy: string; onClose: () => void }) {
  const r = RARITY[reward.rarity];
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-cocoa/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xs rounded-3xl bg-cream p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-sm font-bold text-cocoa/60">Opened together 💕</p>
        <BoxImg sprite={boxFor(reward.rarity)} size={72} className="mt-1 opacity-90" />
        <div className={`animate-pop mx-auto mt-2 flex h-36 w-36 items-center justify-center rounded-3xl ${r.color}`}>
          <RewardArt r={reward} size={96} />
        </div>
        <span className={`mt-3 inline-block rounded-full px-3 py-0.5 text-xs font-bold text-cocoa ${r.color}`}>{r.label}</span>
        <h3 className="mt-2 font-display text-2xl font-bold text-cocoa">{rewardName(reward)}</h3>
        <p className="text-xs text-cocoa/60">{reward.kind === 'item' ? 'Added to your bag' : reward.kind === 'outfit' ? 'Added to your wardrobe' : 'Added to your wallet'}</p>
        <button className={`${primaryBtn} mt-4 w-full`} onClick={onClose}>Yay!</button>
        <p className="mt-2 text-[10px] text-cocoa/40">{openedBy}</p>
      </div>
    </div>
  );
}
