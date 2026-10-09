import { useState } from 'react';
import { dateKey, questionFor, streakOf } from '../state/questions';
import { answerCheckin, otherPlayer, useGameState, useMe } from '../state/store';
import Sheet, { fieldCls, primaryBtn } from './Sheet';

export default function CheckinModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const key = dateKey();
  const today = s.checkins[key] ?? {};
  const partnerId = otherPlayer(me);
  const mine = today[me];
  const theirs = today[partnerId];
  const [text, setText] = useState('');
  const streak = streakOf(s.checkins, key);
  const past = Object.entries(s.checkins)
    .filter(([k, c]) => k !== key && c.A && c.B)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7);

  return (
    <Sheet title="Daily Question 💬" onClose={onClose}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-cocoa">🔥 {streak} day streak</span>
        <span className="text-cocoa/60">{streak % 7 === 0 && streak > 0 ? 'Box earned!' : `${7 - (streak % 7)} to your next box`}</span>
      </div>
      <p className="mt-3 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 font-display text-lg font-bold text-cocoa">{questionFor(key)}</p>

      {!mine && (
        <div className="mt-3">
          <textarea className={fieldCls} rows={3} placeholder="Your answer. It stays hidden until you both answer." value={text} onChange={(e) => setText(e.target.value)} />
          <button className={`${primaryBtn} mt-2 w-full`} disabled={!text.trim()} onClick={() => answerCheckin(me, text)}>Lock in my answer</button>
        </div>
      )}
      {mine && !theirs && (
        <p className="mt-3 rounded-xl bg-white p-3 text-center text-cocoa shadow">
          ✅ Locked in. Waiting for {s.names[partnerId]} to answer. Their answer, and yours, will appear here together.
        </p>
      )}
      {mine && theirs && (
        <div className="mt-3 space-y-2">
          {([me, partnerId] as const).map((p) => (
            <div key={p} className="rounded-2xl bg-white p-3 shadow">
              <div className="text-xs font-bold text-cocoa/60">{s.names[p]}</div>
              <p className="text-cocoa">{today[p]}</p>
            </div>
          ))}
          <p className="rounded-xl bg-green-100 p-3 text-center text-sm text-cocoa">
            🪙 15 · 💎 2 earned. Now put the phone down and talk about it, on a call or in person. 💞
          </p>
        </div>
      )}

      {past.length > 0 && (
        <details className="mt-4 text-sm text-cocoa">
          <summary className="cursor-pointer font-display font-bold">Past check-ins</summary>
          <div className="mt-2 space-y-2">
            {past.map(([k, c]) => (
              <div key={k} className="rounded-xl bg-white p-3 shadow">
                <div className="text-xs font-bold text-cocoa/60">{k}</div>
                <p className="font-bold">{questionFor(k)}</p>
                <p><b>{s.names.A}:</b> {c.A}</p>
                <p><b>{s.names.B}:</b> {c.B}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </Sheet>
  );
}
