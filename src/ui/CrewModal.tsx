import { useState } from 'react';
import {
  arrivalWaiting, cozyBand, CREW, hiredCrew, LEVEL_NAMES, levelGoal, levelName, memberOf, promotionNeeds, promotionReady, rosterActive, rosterDaysLeft, SHIFTS, TREAT_COST, xpFraction,
  type CozyBand, type CrewDef,
} from '../state/crew';
import { STAFF } from '../state/cafe';
import { dateKey } from '../state/questions';
import { giveTreat, hireStaff, promoteCrew, useGameState, welcomeCrew } from '../state/store';
import type { CrewMember } from '../types';
import { Amount } from './Currency';
import { Art, friendly, levelBadgeKey, portraitKeys, skillBadgeKey, SKILL_NAME, SKILL_NOTE, slotIconKey } from './crewArt';
import MentorMoment from './MentorMoment';
import Sheet, { primaryBtn, softBtn } from './Sheet';

const BAND_LABEL: Record<CozyBand, string> = { steady: 'Steady', warm: 'Warm', glowing: 'Glowing' };

/** How full the cozy meter looks: the marker rides the frame's inner track. */
export function CozyMeter({ cozy }: { cozy: number }) {
  const pct = Math.max(0, Math.min(100, cozy));
  return (
    <div className="relative mt-4" style={{ aspectRatio: '539 / 114' }} role="img" aria-label={`Cozy meter: ${BAND_LABEL[cozyBand(cozy)]}`}>
      <Art keys={['cu_cozy_meter_frame']} className="absolute inset-0 h-full w-full" />
      <div className="absolute" style={{ left: `${7 + pct * 0.86}%`, top: '-28%', height: '78%', transform: 'translateX(-50%)', aspectRatio: '51 / 88' }}>
        <Art keys={['cu_cozy_meter_marker']} className="h-full w-full" />
      </div>
    </div>
  );
}

/** The experience bar: the painted frame with the fill clipped to the progress. */
export function XpBar({ m }: { m: CrewMember }) {
  const f = xpFraction(m);
  return (
    <div className="relative" style={{ aspectRatio: '209 / 60' }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(f * 100)} aria-label="Experience">
      <Art keys={['cu_growth_exp_frame']} className="absolute inset-0 h-full w-full" />
      <Art keys={['cu_growth_exp_fill']} className="absolute inset-0 h-full w-full" style={{ clipPath: `inset(0 ${(1 - f) * 100}% 0 0)` }} />
    </div>
  );
}

function CrewCard({ def, m, onMentor, onResult, celebrate }: { def: CrewDef; m: CrewMember; onMentor: () => void; onResult: (t: string, promoted?: boolean) => void; celebrate: boolean }) {
  const s = useGameState();
  const day = dateKey();
  const band = cozyBand(m.cozy);
  const goal = levelGoal(m.level);
  const ready = promotionReady(m);
  const needs = promotionNeeds(m);
  const treated = m.treatDay === day;
  const noFood = s.ingredients < TREAT_COST;
  const treatNote = treated ? 'Shared today' : noFood ? `Needs ${TREAT_COST} pantry ingredients` : '';
  const missing = [needs.xp && 'more experience', needs.praise && 'a Praise moment', needs.coach && 'a Coaching moment'].filter(Boolean).join(', ');
  const fav = SHIFTS.find((x) => x.id === def.favorite)!;
  const chapters = def.chapters;
  return (
    <article className="relative flex flex-col gap-2 rounded-3xl bg-white p-3 shadow" aria-label={def.name} style={{ borderTop: `5px solid ${def.accent}` }}>
      {celebrate && <div className="animate-pop pointer-events-none absolute inset-x-0 top-1 z-10 text-center font-display text-sm font-bold text-pink-500" aria-live="polite">🌟 Promoted! 🌟</div>}
      <div className="flex items-start gap-3">
        <div className="flex h-28 w-20 shrink-0 items-end justify-center rounded-2xl" style={{ background: `${def.accent}33` }}>
          <Art keys={portraitKeys(def.staff, m.level)} className="max-h-full max-w-full object-contain" alt={def.name} />
        </div>
        <div className="min-w-0 flex-1 text-cocoa">
          <div className="font-display text-lg font-bold leading-tight">{def.name}</div>
          <div className="text-xs opacity-70">{def.role}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold" title={SKILL_NOTE[def.skill]}>
              <Art keys={[skillBadgeKey(def.skill)]} className="h-5 w-5" />{SKILL_NAME[def.skill]}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold">
              <Art keys={[levelBadgeKey(m.level)]} className="h-5 w-5" />{levelName(m.level)}
            </span>
          </div>
          <p className="mt-1 text-xs text-cocoa/80">{def.perks[m.level - 1]}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-3">
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-cocoa/70">
            <span>Experience</span>
            <span>{goal === null ? 'Expert' : `${m.xp} of ${goal}`}</span>
          </div>
          <XpBar m={m} />
        </div>
        <div>
          <div className="flex items-center justify-between text-[11px] font-bold text-cocoa/70">
            <span>Cozy</span>
            <span>{BAND_LABEL[band]}</span>
          </div>
          <CozyMeter cozy={m.cozy} />
        </div>
      </div>
      <p className="flex items-center gap-1 text-xs text-cocoa/80">
        Favorite shift <Art keys={[slotIconKey(def.favorite)]} className="mx-1 h-5 w-auto" /> <b>{fav.label}</b>
      </p>

      <details className="rounded-xl bg-cream p-2 text-xs text-cocoa">
        <summary className="cursor-pointer font-display font-bold">Their story</summary>
        <ol className="mt-1 space-y-1.5">
          {chapters.map((c, i) => (
            i < m.level
              ? <li key={i}><b>Chapter {i + 1}.</b> {c}</li>
              : <li key={i} className="opacity-60">🔒 Chapter {i + 1} opens when {def.name} becomes {LEVEL_NAMES[i]}.</li>
          ))}
        </ol>
      </details>

      <div className="mt-auto flex flex-wrap gap-2">
        <button className={`${softBtn} !px-3 !py-1.5 text-sm`} onClick={onMentor}>💬 Mentor moment</button>
        <button
          className={`${softBtn} !px-3 !py-1.5 text-sm`}
          disabled={treated || noFood}
          title={treatNote || `Costs ${TREAT_COST} pantry ingredients`}
          onClick={() => { const r = giveTreat(def.staff); onResult(r.ok ? `${def.name} loved the treat. 💗` : friendly(r.reason)); }}
        >
          🍪 Share a treat
        </button>
        {m.level < 3 && (
          <button
            className={`${primaryBtn} !px-3 !py-1.5 text-sm`}
            disabled={!ready}
            title={ready ? 'Promote' : `Needs ${missing}`}
            onClick={() => { const r = promoteCrew(def.staff); onResult(r.ok ? `${r.text} +${r.shells} heart shells.` : friendly(r.reason), r.ok); }}
          >
            ⭐ Promote
          </button>
        )}
      </div>
      {treatNote && <p className="text-[11px] text-cocoa/60">{treatNote}.</p>}
      {m.level < 3 && !ready && <p className="text-[11px] text-cocoa/60">For a promotion: {missing}.</p>}
    </article>
  );
}

/** The café crew: the people you hire and grow together. */
export default function CrewModal({ onClose, onRoster }: { onClose: () => void; onRoster: () => void }) {
  const s = useGameState();
  const [mentor, setMentor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [promoted, setPromoted] = useState<string | null>(null);
  const hired = hiredCrew(s);
  const door = arrivalWaiting(s);
  const hireable = STAFF.filter((x) => !s.cafe.staff.includes(x.id));
  const later = CREW.filter((d) => d.arrival !== null && !s.cafe.staff.includes(d.staff) && s.cafe.popularity < (d.arrival as number));
  const active = rosterActive(s);
  const say = (t: string) => { setNote(t); };
  return (
    <>
      <Sheet title="Our Café Crew ☕" onClose={onClose} size="xl">
        <div className="rounded-2xl bg-gradient-to-r from-pink-100 to-amber-100 p-3 text-sm text-cocoa">
          <p className="font-display text-base font-bold">People you grow together</p>
          <p className="text-xs opacity-80">No wages and nobody is ever let go. Say kind, specific things, share a treat, and plan who works when. A crew member you do not visit simply waits for you.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className={`${primaryBtn} !px-4 !py-1.5 text-sm`} onClick={onRoster}>🗓️ Roster board</button>
            <span className="text-xs font-bold">{hired.length} on the crew · {active ? `roster running, ${rosterDaysLeft(s)} ${rosterDaysLeft(s) === 1 ? 'day' : 'days'} left` : 'no roster yet, start one any day'}</span>
          </div>
        </div>
        {note && <p role="status" className="mt-2 rounded-xl bg-white p-2 text-center text-sm font-bold text-cocoa shadow">{note}</p>}

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {hired.map(({ def, member }) => (
            <CrewCard key={def.id} def={def} m={member} celebrate={promoted === def.staff} onMentor={() => setMentor(def.staff)} onResult={(t, up) => { say(t); if (up) { setPromoted(def.staff); setTimeout(() => setPromoted(null), 2200); } }} />
          ))}
          {door.map((d) => (
            <article key={d.id} className="flex flex-col gap-2 rounded-3xl border-2 border-dashed border-pink-300 bg-pink-50/60 p-3 text-cocoa" aria-label={`${d.name} is at the door`}>
              <div className="flex items-start gap-3">
                <div className="flex h-28 w-20 shrink-0 items-end justify-center rounded-2xl" style={{ background: `${d.accent}33` }}>
                  <Art keys={portraitKeys(d.staff, 1)} className="max-h-full max-w-full object-contain" alt={d.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-xs font-bold uppercase text-pink-500">Someone is at the door</div>
                  <div className="font-display text-lg font-bold leading-tight">{d.name}</div>
                  <div className="text-xs opacity-70">{d.role}</div>
                  <p className="mt-1 text-xs">{d.blurb}</p>
                </div>
              </div>
              <p className="text-xs">{d.name} heard about your café and would love to help. Welcoming is free.</p>
              <button className={`${primaryBtn} mt-auto`} onClick={() => { const r = welcomeCrew(d.staff); say(r.ok ? `${r.text} 🎉` : friendly(r.reason)); }}>Welcome {d.name}</button>
            </article>
          ))}
          {hireable.map((h) => {
            const d = CREW.find((c) => c.staff === h.id)!;
            return (
              <article key={h.id} className="flex flex-col gap-2 rounded-3xl bg-white/70 p-3 text-cocoa shadow" aria-label={`${h.name} can be hired`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-28 w-20 shrink-0 items-end justify-center rounded-2xl" style={{ background: `${d.accent}22` }}>
                    <Art keys={portraitKeys(h.id, 1)} className="max-h-full max-w-full object-contain opacity-80" alt={h.name} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg font-bold leading-tight">{h.name}</div>
                    <div className="text-xs opacity-70">{h.role}</div>
                    <p className="mt-1 text-xs">{d.blurb}</p>
                    <p className="mt-1 text-xs font-bold">{d.perks[0]}</p>
                  </div>
                </div>
                <button className={`${softBtn} mt-auto`} disabled={s.coins < h.price} onClick={() => { const ok = hireStaff(h.id); say(ok ? `${h.name} joined the crew! ☕` : 'You need a few more coins for that.'); }}>
                  Hire <Amount kind="coin" n={h.price} size={14} />
                </button>
              </article>
            );
          })}
        </div>
        {later.length > 0 && (
          <p className="mt-3 rounded-2xl bg-white p-3 text-xs text-cocoa/70 shadow">
            More islanders will come as your café grows more popular: {later.map((d) => `${d.name} at popularity ${d.arrival}`).join(', ')}. Hosting events together raises it.
          </p>
        )}
        {hired.length === 0 && door.length === 0 && hireable.length === 0 && <p className="mt-3 text-center text-sm text-cocoa/70">No crew yet.</p>}
      </Sheet>
      {mentor && memberOf(s, mentor) && <MentorMoment staff={mentor} onClose={() => setMentor(null)} />}
    </>
  );
}
