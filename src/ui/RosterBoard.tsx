import { useState } from 'react';
import {
  crewDef, currentShift, ENERGY_START, energyLeft, hiredCrew, MAX_PER_SLOT, ROSTER_TIPS, rosterActive, rosterDaysLeft, rosterMatch, shiftLabel, SHIFTS, teamBuff,
  type TeamBuff,
} from '../state/crew';
import { assignCrew, startRoster, unassignCrew, useGameState } from '../state/store';
import type { ShiftId } from '../types';
import { Art, friendly, slotIconKey, spriteUrl, tokenKeys } from './crewArt';
import Sheet, { primaryBtn, softBtn } from './Sheet';

/** The buff in plain words, one short line for each thing the current shift adds. */
export function buffLines(b: TeamBuff): string[] {
  const out: string[] = [];
  if (b.tips > 0) out.push(`Tips build ${Math.round(b.tips * 100)} percent faster`);
  if (b.patience > 0) out.push(`Guests wait about ${Math.round(b.patience * 100)} percent longer`);
  if (b.speed > 0) out.push(`The baristas work about ${Math.round(b.speed * 100)} percent quicker`);
  if (b.band > 0) out.push(`The perfect window in Matcha Masters is a little wider`);
  if (b.pantry > 0) out.push(`${b.pantry} extra pantry ${b.pantry === 1 ? 'ingredient' : 'ingredients'} when you stock up`);
  return out;
}

function Pips({ left }: { left: number }) {
  return (
    <span className="flex items-center justify-center gap-0.5" role="img" aria-label={`${left} of ${ENERGY_START} energy`}>
      {Array.from({ length: ENERGY_START }, (_, i) => (
        <Art key={i} keys={[i < left ? 'cu_roster_pip_leaf_full' : 'cu_roster_pip_leaf_empty']} className="h-4 w-auto" />
      ))}
    </span>
  );
}

/** The crew's weekly plan: tap a person, then a shift (or drag them there). A roster lasts 7 days and can start on any day. */
export default function RosterBoard({ onClose, onCrew }: { onClose: () => void; onCrew: () => void }) {
  const s = useGameState();
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const active = rosterActive(s);
  const left = rosterDaysLeft(s);
  const roster = s.cafe.roster;
  const hired = hiredCrew(s);
  const now = currentShift();
  const nowMatch = rosterMatch(s, now);
  const buff = teamBuff(s);
  const lines = buffLines(buff);
  const tip = ROSTER_TIPS[Math.floor(Date.now() / 86400000) % ROSTER_TIPS.length];
  const nameOf = (staff: string) => crewDef(staff)?.name ?? staff;

  const put = (shift: ShiftId, staff: string) => {
    const r = assignCrew(shift, staff);
    setNote(r.ok ? '' : friendly(r.reason));
    if (r.ok) setPick(null);
  };
  const take = (shift: ShiftId, staff: string) => { const r = unassignCrew(shift, staff); setNote(r.ok ? `${nameOf(staff)} is off ${shiftLabel(shift)}.` : friendly(r.reason)); };
  const begin = () => { const r = startRoster(); setNote(r.ok ? 'A new roster has started. Everyone is rested and ready.' : friendly(r.reason)); };

  return (
    <Sheet title="Roster board 🗓️" onClose={onClose} size="lg">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3 text-cocoa">
        <Art keys={[active ? 'cu_roster_cal_active' : roster ? 'cu_roster_cal_ended' : 'cu_roster_cal_blank']} className="h-12 w-auto" />
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-display text-base font-bold">
            {active ? `Roster running: ${left} ${left === 1 ? 'day' : 'days'} left` : roster ? 'Your last roster has ended' : 'No roster yet'}
          </div>
          <p className="text-xs opacity-80">Start one on any day. It lasts 7 days, everyone's energy refills, and you can move people around whenever you like.</p>
        </div>
        <button className={`${primaryBtn} !px-4 !py-1.5 text-sm`} disabled={active} title={active ? `A roster is running, ${left} ${left === 1 ? 'day' : 'days'} left` : 'Start a 7 day roster'} onClick={begin}>
          Start a new roster
        </button>
      </div>
      {note && <p role="status" className="mt-2 rounded-xl bg-white p-2 text-center text-sm font-bold text-cocoa shadow">{note}</p>}

      <div
        className={`relative mt-3 rounded-3xl p-3 shadow ${active ? '' : 'opacity-70'}`}
        style={{ backgroundImage: `url(${spriteUrl('cu_roster_board_flat')})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundColor: '#f6e7d4' }}
        aria-label="Shifts"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SHIFTS.map((sh) => {
            const m = rosterMatch(s, sh.id);
            const full = m.crew.length >= MAX_PER_SLOT;
            const canDrop = active && !!pick && !full && !m.crew.includes(pick);
            const isNow = sh.id === now;
            return (
              <section
                key={sh.id}
                aria-label={sh.label}
                onDragOver={(e) => { if (active) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) put(sh.id, id); }}
                className={`flex min-h-[210px] flex-col items-center gap-1 rounded-2xl bg-white/70 p-2 text-center text-cocoa ${isNow ? 'ring-4 ring-pink-300' : ''} ${canDrop ? 'ring-4 ring-emerald-300' : ''}`}
              >
                <Art keys={[slotIconKey(sh.id)]} className="h-9 w-auto" />
                <div className="font-display text-sm font-bold leading-tight">{sh.label}</div>
                <div className="text-[10px] opacity-70">{sh.when}{isNow ? ' · now' : ''}</div>
                <div className="mt-1 flex flex-1 flex-col items-center justify-center gap-1">
                  {m.crew.map((staff, i) => {
                    const fav = crewDef(staff)?.favorite === sh.id;
                    const duetWithNext = m.pairs.some(([a, b]) => (a === staff && b === m.crew[i + 1]) || (b === staff && a === m.crew[i + 1]));
                    return (
                      <div key={staff} className="flex flex-col items-center">
                        <button
                          onClick={() => take(sh.id, staff)}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', staff)}
                          title={`${nameOf(staff)}${fav ? ', their favorite shift' : ''}. Tap to take off this shift.`}
                          aria-label={`${nameOf(staff)} on ${sh.label}. Take off this shift.`}
                          className="relative cursor-pointer rounded-full transition hover:scale-105 active:scale-95"
                        >
                          <Art keys={tokenKeys(staff)} className="h-14 w-14 object-contain" alt={nameOf(staff)} />
                          {fav && <Art keys={['cu_roster_favorite_star']} className="absolute -right-1 -top-1 h-5 w-5" />}
                          {fav && <Art keys={['cu_roster_sparkle']} className="absolute -left-2 -top-1 h-5 w-5 opacity-80" />}
                        </button>
                        <span className="text-[11px] font-bold">{nameOf(staff)}</span>
                        {duetWithNext && <Art keys={['cu_roster_duetlink']} className="h-5 w-auto" alt="Duet" />}
                      </div>
                    );
                  })}
                  {m.crew.length === 0 && <span className="text-[11px] opacity-60">{active ? (pick ? 'Tap below to place' : 'Nobody yet') : 'Start a roster'}</span>}
                </div>
                {m.duet && <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">💞 A Duet!</span>}
                {active && pick && (
                  <button className={`${softBtn} w-full !px-2 !py-1 text-xs`} disabled={!canDrop} onClick={() => put(sh.id, pick)}>
                    {m.crew.includes(pick) ? 'Already here' : full ? 'Full' : `Put ${nameOf(pick)} here`}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 shadow">
        <div className="flex items-center justify-between">
          <div className="font-display font-bold text-cocoa">Your crew</div>
          <button className="cursor-pointer text-xs font-bold text-pink-500 underline" onClick={onCrew}>Open crew cards</button>
        </div>
        <p className="text-xs text-cocoa/60">{active ? 'Tap a person, then a shift. Or drag them. Moving them between shifts is free.' : 'Start a roster to plan shifts.'}</p>
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {hired.map(({ def }) => {
            const e = energyLeft(s, def.staff);
            const on = pick === def.staff;
            return (
              <li key={def.id}>
                <button
                  aria-pressed={on}
                  disabled={!active}
                  draggable={active}
                  onDragStart={(ev) => ev.dataTransfer.setData('text/plain', def.staff)}
                  onClick={() => setPick(on ? null : def.staff)}
                  className={`flex w-full cursor-pointer flex-col items-center gap-0.5 rounded-2xl p-2 text-cocoa transition active:scale-95 disabled:cursor-default disabled:opacity-60 ${on ? 'bg-pink-100 ring-4 ring-pink-300' : 'bg-cream hover:bg-pink-50'}`}
                >
                  <Art keys={tokenKeys(def.staff)} className="h-12 w-12 object-contain" alt="" />
                  <span className="text-xs font-bold">{def.name}</span>
                  <Pips left={active ? e : 0} />
                  <span className="text-[10px] opacity-70">Likes {shiftLabel(def.favorite)}</span>
                </button>
              </li>
            );
          })}
          {hired.length === 0 && <li className="col-span-full text-xs text-cocoa/70">Nobody on the crew yet. Hire or welcome someone first.</li>}
        </ul>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-3 text-cocoa shadow">
        <div className="font-display font-bold">Right now: {shiftLabel(now)}</div>
        <p className="text-xs opacity-80">{nowMatch.crew.length ? `${nowMatch.crew.map(nameOf).join(' and ')} ${nowMatch.crew.length === 1 ? 'is' : 'are'} working.` : 'Nobody is on this shift.'}</p>
        <ul className="mt-1 space-y-0.5 text-sm">
          {active && lines.length > 0 ? lines.map((l) => <li key={l}>✨ {l}</li>) : <li className="text-xs opacity-70">{active ? 'No team boost right now. Put someone on this shift to add one.' : 'Teams give a boost while a roster is running.'}</li>}
        </ul>
        <p className="mt-2 rounded-xl bg-cream p-2 text-xs">💡 {tip}</p>
      </div>
    </Sheet>
  );
}
