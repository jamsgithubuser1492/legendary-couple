import { useState } from 'react';
import { generateRoomCode, getRoom, joinRoom, syncAvailable, useSyncStatus } from '../lib/sync';
import { setNames, setMe, useGameState, useMe } from '../state/store';
import { setSeasonChoice, THEMES, useSeasonChoice, useTheme } from '../state/season';

const STATUS: Record<string, string> = {
  local: 'Offline mode (saved on this device)',
  connecting: 'Connecting…',
  synced: 'Synced ✓',
  pending: 'Changes waiting to sync',
  error: 'Sync problem, will retry',
};

export default function PairingModal({ onClose, onChangePath }: { onClose: () => void; onChangePath?: () => void }) {
  const s = useGameState();
  const me = useMe();
  const status = useSyncStatus();
  const choice = useSeasonChoice();
  const theme = useTheme();
  const [code, setCode] = useState(getRoom() ?? '');
  const field = 'w-full rounded-xl border-2 border-blush bg-white px-3 py-2 text-cocoa outline-none focus:border-pink-400';
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-cocoa/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-cream p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-bold text-cocoa">Us 💕</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['A', 'B'] as const).map((p) => (
            <input key={p} className={field} value={s.names[p]} onChange={(e) => setNames({ ...s.names, [p]: e.target.value })} aria-label={`Partner ${p} name`} />
          ))}
        </div>
        <p className="mt-3 text-sm font-bold text-cocoa">I am playing as</p>
        <div className="mt-1 flex gap-2">
          {(['A', 'B'] as const).map((p) => (
            <button key={p} onClick={() => setMe(p)} className={`rounded-full px-4 py-1 font-display font-bold ${me === p ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>{s.names[p]}</button>
          ))}
        </div>
        <p className="mt-4 text-sm font-bold text-cocoa">Shared room code</p>
        {syncAvailable() ? (
          <>
            <p className="text-xs text-cocoa/60">Create a code on one phone, then enter the same code on the other.</p>
            <div className="mt-1 flex gap-2">
              <input className={field} value={code} maxLength={8} placeholder="e.g. K7M2QX" onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <button className="rounded-full bg-blush px-3 font-bold text-cocoa" onClick={() => setCode(generateRoomCode())}>New</button>
            </div>
            <button className="mt-2 w-full rounded-full bg-pink-400 py-2 font-display font-bold text-white" onClick={() => joinRoom(code)}>Connect</button>
          </>
        ) : (
          <p className="mt-1 rounded-xl bg-peach p-3 text-xs text-cocoa">
            Real time sync is not configured yet. Add your Supabase URL and key (see <code>.env.example</code>) to link both phones. Until then everything saves on this device.
          </p>
        )}
        <p className="mt-4 text-sm font-bold text-cocoa">Season</p>
        <p className="text-xs text-cocoa/60">Your island follows the calendar ({THEMES.find((t) => t.id === theme)?.label} now). Preview another on this device.</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {(['auto', ...THEMES.map((t) => t.id)] as const).map((c) => (
            <button key={c} onClick={() => setSeasonChoice(c)} className={`rounded-full px-3 py-1 text-sm font-bold ${choice === c ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`}>
              {c === 'auto' ? 'Auto' : `${THEMES.find((t) => t.id === c)!.icon} ${THEMES.find((t) => t.id === c)!.label}`}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-cocoa/60">Status: {STATUS[status]}</p>
        {onChangePath && <button className="mt-3 w-full rounded-full bg-peach py-2 font-display font-bold text-cocoa" onClick={() => { onClose(); onChangePath(); }}>🗺️ Change starting path</button>}
        <button className="mt-3 w-full rounded-full bg-blush py-2 font-display font-bold text-cocoa" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
