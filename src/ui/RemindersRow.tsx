import { useCallback, useEffect, useState } from 'react';
import { getPrefs, getPushStatus, isIOS, sendTest, subscribe, unsubscribe, updateQuietHours, type PushStatus } from '../lib/push';

const NOTE: Record<PushStatus, string> = {
  unsupported: 'This browser cannot send reminders. A recent Chrome, Edge, Firefox or Safari on a computer works, and so does the installed app on iPhone.',
  'needs-install': 'On iPhone, tap Share, then Add to Home Screen, and open the game from there. Then you can turn reminders on.',
  'no-key': 'Reminders are not set up for this copy of the game yet.',
  'no-room': 'Connect your shared room above first, so your partner can reach this phone.',
  blocked: 'Reminders are blocked in your browser settings. Allow notifications for this site, then come back.',
  off: 'A gentle nudge when your partner leaves something for you, like a goal to approve. A few a day at most.',
  on: 'Reminders are on for this phone. Your partner can reach you with a small, kind nudge.',
};

const QUIET: [string, number, number][] = [
  ['None', 0, 0],
  ['22:00 to 08:00', 22 * 60, 8 * 60],
  ['21:00 to 09:00', 21 * 60, 9 * 60],
  ['23:00 to 07:00', 23 * 60, 7 * 60],
];

/** Reminders by push: turn on, quiet hours, a test, and turn off. Never blocks the rest of the Us panel. */
export default function RemindersRow() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [quiet, setQuiet] = useState(() => getPrefs());
  const [tested, setTested] = useState(false);
  const refresh = useCallback(() => void getPushStatus().then(setStatus), []);
  useEffect(refresh, [refresh]);
  const run = async (f: () => Promise<PushStatus>) => {
    setBusy(true);
    try {
      setStatus(await f());
    } finally {
      setBusy(false);
    }
  };
  const chip = (on: boolean) => `rounded-full px-3 py-1 text-sm font-bold ${on ? 'bg-pink-400 text-white' : 'bg-blush text-cocoa'}`;
  return (
    <div data-testid="reminders">
      <p className="mt-3 text-sm font-bold text-cocoa">Reminders 🔔</p>
      <p className="text-xs text-cocoa/60">{status ? NOTE[status] : 'Checking…'}</p>
      {status === 'off' && !isIOS() && <p className="mt-1 text-xs text-cocoa/60">On a computer, Chrome, Edge, Firefox and Safari can send reminders without installing anything. They arrive while the browser is running, even when this tab is in the background.</p>}
      {status === 'off' && (
        <button disabled={busy} onClick={() => void run(subscribe)} className="mt-1 rounded-full bg-pink-400 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50">Enable reminders</button>
      )}
      {status === 'on' && (
        <>
          <p className="mt-2 text-xs font-bold text-cocoa">Quiet hours</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {QUIET.map(([label, s, e]) => (
              <button key={label} onClick={() => { setQuiet({ quietStart: s, quietEnd: e }); void updateQuietHours(s, e); }} className={chip(quiet.quietStart === s && quiet.quietEnd === e)}>{label}</button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => { sendTest(); setTested(true); setTimeout(() => setTested(false), 4000); }} className="rounded-full bg-peach px-4 py-1.5 text-sm font-bold text-cocoa">{tested ? 'Sent, look for it' : 'Send me a test'}</button>
            <button disabled={busy} onClick={() => void run(unsubscribe)} className="rounded-full bg-blush px-4 py-1.5 text-sm font-bold text-cocoa disabled:opacity-50">Turn off</button>
          </div>
        </>
      )}
    </div>
  );
}
