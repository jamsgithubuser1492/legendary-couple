/**
 * Things that are waiting on one partner, worked out from the shared state. Pure: the notifier compares these lists
 * before and after a change, so every item has a stable id and warm, short wording (never guilt).
 */
import type { GameState, PlayerId } from '../types';
import { dateKey } from './questions';
import { mondayOf } from './weekly';
import { hiredCrew, levelGoal } from './crew';

export type WaitingKind = 'approve' | 'daily' | 'whisper' | 'box' | 'surprise' | 'weekly' | 'event' | 'crew';
export interface Waiting { id: string; kind: WaitingKind; text: string }

const other = (p: PlayerId): PlayerId => (p === 'A' ? 'B' : 'A');

export function waitingFor(s: GameState, player: PlayerId, day = dateKey()): Waiting[] {
  const out: Waiting[] = [];
  const them = s.names[other(player)] || 'Your partner';
  // a goal they finished is waiting for you to approve it
  for (const q of s.quests) {
    if (q.status === 'PENDING_VERIFICATION' && q.assignedTo !== player) out.push({ id: `approve:${q.id}`, kind: 'approve', text: `${them} finished something. Take a look when you can.` });
  }
  // they answered today's question and the answers open when you answer too
  const c = s.checkins[day];
  if (c && c[other(player)] && !c[player]) out.push({ id: `daily:${day}`, kind: 'daily', text: `${them} answered today's question. Yours opens the answers.` });
  // a whisper they have answered
  for (const [k, w] of Object.entries(s.whispers)) {
    if (w[other(player)] && !w[player]) out.push({ id: `whisper:${k}`, kind: 'whisper', text: `${them} shared something at the fireside. Your turn when you are ready.` });
  }
  if (s.pendingBox && s.pendingBox.by !== player) out.push({ id: `box:${s.pendingBox.by}`, kind: 'box', text: `${them} would love to open a blind box with you.` });
  // a surprise act set for you, still waiting to be done
  for (const x of s.surprises) {
    if (x.to === player && !x.doneAt) out.push({ id: `surprise:${x.id}`, kind: 'surprise', text: `${them} sealed a little surprise for you.` });
  }
  // a weekly goal tick they made is waiting for you to confirm
  const wk = mondayOf(day);
  const g = s.weekly[wk];
  if (g && !g.paid) {
    for (const t of g.ticks) if (!t.ok && t.by !== player) out.push({ id: `weekly:${wk}:${t.day}`, kind: 'weekly', text: `${them} ticked your weekly goal. Confirm it when you can.` });
  }
  // a café event they are hosting that you can join
  const e = s.cafe.event;
  if (e && e.day === day && !e.joined && e.by !== player) out.push({ id: `event:${e.day}:${e.id}`, kind: 'event', text: `${them} is hosting something at the café. Come and join.` });
  // a crew member is ready for a promotion and your partner already gave their Mentor moment, so yours finishes it
  for (const { def, member } of s.cafe.staff?.length ? hiredCrew(s) : []) {
    const goal = levelGoal(member.level);
    if (goal === null || member.xp < goal) continue;
    const theirs = (member.praised && !member.coached && member.praiseBy === other(player)) || (member.coached && !member.praised && member.coachBy === other(player));
    if (theirs) out.push({ id: `crew:${def.staff}:${member.level}`, kind: 'crew', text: `${def.name} is ready for a promotion. ${them} already gave their moment, so yours would finish it.` });
  }
  return out;
}
