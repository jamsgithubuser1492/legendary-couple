import { useState } from 'react';
import { resetEverything } from '../state/store';
import { getRoom } from '../lib/sync';
import Sheet, { fieldCls, softBtn } from './Sheet';

const PHRASE = 'reset everything';

export default function CheatsModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const ready = text.trim().toLowerCase() === PHRASE;
  const linked = !!getRoom();
  return (
    <Sheet title="Cheats 🧪" onClose={onClose}>
      <div className="rounded-2xl bg-red-50 p-4">
        <div className="font-display font-bold text-red-700">Reset everything</div>
        <p className="mt-1 text-sm text-cocoa/80">
          Puts the whole game back to its original starting state: quests, coins, items, rooms, memories, town growth, check-ins, outfits and island size.
          {linked && <b> You are linked to a room, so this resets your partner's game too.</b>} Your names and room code are kept.
        </p>
        <p className="mt-2 text-xs text-cocoa/70">To unlock the button, type: <code className="font-bold">{PHRASE}</code></p>
        <input className={`${fieldCls} mt-2`} value={text} onChange={(e) => setText(e.target.value)} placeholder={PHRASE} autoCapitalize="off" autoCorrect="off" />
        <button
          disabled={!ready}
          className="mt-3 w-full rounded-full bg-red-500 py-2 font-display font-bold text-white shadow active:scale-95 disabled:opacity-30"
          onClick={() => {
            resetEverything();
            setTimeout(() => location.reload(), 900); // let the reset sync before the page restarts
          }}
        >
          Reset everything
        </button>
      </div>
      <button className={`${softBtn} mt-3 w-full`} onClick={onClose}>Close</button>
    </Sheet>
  );
}
