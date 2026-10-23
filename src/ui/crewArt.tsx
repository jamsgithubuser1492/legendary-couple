import { useState } from 'react';
import type { ShiftId } from '../types';
import { crewIdOf, type CrewDef } from '../state/crew';

const BASE = `${import.meta.env.BASE_URL}assets/sprites/`;
export const spriteUrl = (key: string) => `${BASE}${key}.png`;

/** An image that tries each key in turn and shows nothing if every one is missing, so a gap in the art never breaks a screen. */
export function Art({ keys, alt = '', className = '', style }: { keys: string[]; alt?: string; className?: string; style?: React.CSSProperties }) {
  const [at, setAt] = useState(0);
  const key = keys[at];
  if (!key) return null;
  return <img src={spriteUrl(key)} alt={alt} className={className} style={style} draggable={false} decoding="async" onError={() => setAt((n) => n + 1)} />;
}

/** The look for a level (1 to 3), with the other levels as fallbacks. */
export const portraitKeys = (id: string, level: number) => {
  const c = crewIdOf(id) ?? id;
  return [level, 3, 2, 1].map((l) => `crew_${c}_${l}_fl`);
};
/** An emote, then the idle emote, then the still portrait. Hana only has a glow tile, so she falls back to her still. */
export const emoteKeys = (id: string, name: string, level = 1) => {
  const c = crewIdOf(id) ?? id;
  return [`crewx_${c}_emote_${name}`, `crewx_${c}_emote_idle`, ...portraitKeys(id, level)];
};
export const tokenKeys = (id: string) => [`cu_roster_token_${crewIdOf(id) ?? id}`, 'cu_roster_token_empty'];
export const skillBadgeKey = (skill: string) => `cu_skill_${skill}_badge`;
export const levelBadgeKey = (level: number) => (level >= 3 ? 'cu_level_expert' : level === 2 ? 'cu_level_skilled' : 'cu_level_apprentice');
export const slotIconKey = (shift: ShiftId) => ({ rush: 'cu_roster_slot_weekday', brunch: 'cu_roster_slot_weekend', afternoon: 'cu_roster_slot_quiet', night: 'cu_roster_slot_event' })[shift];

export const SKILL_NAME: Record<string, string> = { speed: 'Speed', craft: 'Craft', charm: 'Charm', care: 'Care' };
export const SKILL_NOTE: Record<string, string> = {
  speed: 'Quickens the baristas',
  craft: 'Widens the perfect window',
  charm: 'Guests wait a little longer',
  care: 'Keeps the pantry stocked',
};

/** Kind, plain words for the short reasons the crew actions give back. Nothing here is ever shown as an error. */
export function friendly(reason?: string): string {
  switch (reason) {
    case 'already today': return 'That is done for today. Come back tomorrow.';
    case 'not enough ingredients': return 'A treat needs 2 pantry ingredients.';
    case 'not ready': return 'Not ready for a promotion yet.';
    case 'already expert': return 'Already an Expert. Nothing left to climb.';
    case 'a roster is already running': return 'A roster is already running.';
    case 'no roster': return 'Start a roster first.';
    case 'roster ended': return 'That roster has ended. Start a new one.';
    case 'slot full': return 'That shift already has two people.';
    case 'too many shifts': return 'Two shifts is the most for one person.';
    case 'no energy left': return 'Out of energy for this roster. It refills with the next one.';
    case 'already there': return 'Already on that shift.';
    case 'not hired': return 'They have not joined the crew yet.';
    case 'not popular enough yet': return 'The café needs a little more popularity first.';
    default: return 'That did not work just now. Try again in a moment.';
  }
}

export const defLabel = (d: CrewDef) => `${d.name}, ${d.role}`;
