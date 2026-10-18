import { useState } from 'react';
import { completeSurprise, otherPlayer, sendSurprise, useGameState, useMe } from '../state/store';
import { SURPRISE_COST, SURPRISE_DELAY_MS, SURPRISE_IDEAS, SURPRISE_PAY } from '../state/weekly';
import { Amount } from './Currency';
import Sheet, { fieldCls, primaryBtn, softBtn } from './Sheet';

/** The postbox: send your partner a secret act of kindness, or finish the one waiting for you. */
export default function SurpriseModal({ onClose }: { onClose: () => void }) {
  const s = useGameState();
  const me = useMe();
  const partner = s.names[otherPlayer(me)];
  const [act, setAct] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const mine = s.surprises.filter((x) => x.to === me && !x.doneAt);
  const sent = s.surprises.filter((x) => x.from === me && !x.doneAt);
  const done = s.surprises.filter((x) => x.doneAt).slice(-3).reverse();
  const waitMin = (ts: number) => Math.max(0, Math.ceil((SURPRISE_DELAY_MS - (Date.now() - ts)) / 60000));

  return (
    <Sheet title="The Postbox 💌" onClose={onClose}>
      {mine.map((x) => (
        <div key={x.id} className="mb-3 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-4 text-center shadow">
          <div className="text-xs font-bold uppercase text-cocoa/60">A secret surprise from {s.names[x.from]}</div>
          <div className="mt-1 font-display text-lg font-bold text-cocoa">{x.act}</div>
          {x.note && <div className="mt-1 text-xs text-cocoa/60">There is a sealed note inside. 🎁</div>}
          <button
            className={`${primaryBtn} mt-3`}
            onClick={() => setMsg(completeSurprise(me, x.id) ?? '')}
          >
            Complete surprise
          </button>
          {waitMin(x.ts) > 0 && <div className="mt-1 text-xs text-cocoa/60">A real surprise takes a little time, about {waitMin(x.ts)} min to go.</div>}
        </div>
      ))}
      {msg && <p className="mb-2 rounded-xl bg-white p-2 text-center text-sm text-cocoa">{msg}</p>}

      <div className="rounded-2xl bg-white p-3 shadow">
        <div className="font-display font-bold text-cocoa">Send {partner} a surprise</div>
        <p className="text-xs text-cocoa/60">
          Pick a small act of kindness. You stake <Amount kind="coin" n={SURPRISE_COST} size={13} />. When {partner} does it, a gift unwraps for you both and you earn <Amount kind="coin" n={SURPRISE_PAY.coins} size={13} /> and {SURPRISE_PAY.shells} 🐚.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {SURPRISE_IDEAS.map((i) => (
            <button key={i} className={`${softBtn} !px-3 !py-1 text-xs`} onClick={() => setAct(i)}>{i}</button>
          ))}
        </div>
        <input className={`${fieldCls} mt-2`} placeholder="Or write your own small act" maxLength={120} value={act} onChange={(e) => setAct(e.target.value)} />
        <input className={`${fieldCls} mt-2`} placeholder="A sealed note for the reveal (optional)" maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          className={`${primaryBtn} mt-3 w-full`}
          disabled={!act.trim()}
          onClick={() => {
            const why = sendSurprise(me, act, note);
            setMsg(why ?? `Sent! ${partner} will find a secret surprise in their world.`);
            if (!why) { setAct(''); setNote(''); }
          }}
        >
          Send the surprise 💌
        </button>
        {sent.length > 0 && <p className="mt-2 text-center text-xs text-cocoa/60">Waiting for {partner}: “{sent[0].act}”</p>}
      </div>

      {done.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-bold uppercase text-cocoa/50">Recently unwrapped</div>
          {done.map((x) => (
            <div key={x.id} className="mt-1 rounded-xl bg-white p-2 text-sm text-cocoa shadow">🎁 {x.act}{x.note ? <span className="text-cocoa/60"> · “{x.note}”</span> : null}</div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
