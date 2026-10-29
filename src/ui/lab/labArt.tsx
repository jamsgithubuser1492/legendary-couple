import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { LabRecipe, LabTier } from '../../types';
import { ingredientOf, seasonOfRecipe } from '../../state/lab';

const BASE = `${import.meta.env.BASE_URL}assets/sprites/`;
const ext = (k: string) => (k === 'labx_room' ? 'jpg' : 'png');
export const labUrl = (k: string) => `${BASE}${k}.${ext(k)}`;

/** An image from the lab art. If the file is missing it shows `fallback` (or nothing), so a gap in the art never breaks the screen. */
export function LabImg({ k, alt = '', className = '', style, fallback = null, title }: { k: string; alt?: string; className?: string; style?: CSSProperties; fallback?: ReactNode; title?: string }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [k]);
  if (bad) return <>{fallback}</>;
  return <img src={labUrl(k)} alt={alt} title={title} className={className} style={style} draggable={false} decoding="async" onError={() => setBad(true)} />;
}

/** True when the visitor asked for less motion: the cat, steam and dust hold still. */
export function useReducedMotion(): boolean {
  const [r, setR] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  useEffect(() => {
    let mq: MediaQueryList;
    try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch { return; }
    const f = () => setR(mq.matches);
    mq.addEventListener?.('change', f);
    return () => mq.removeEventListener?.('change', f);
  }, []);
  return r;
}

/** A jar drawn in code for the two ingredients the art does not have yet (Salted Caramel and Lavender Honey): the shared silhouette, tinted. */
export function CodeJar({ color, size }: { color: string; size: number }) {
  const w = size * 0.7;
  return (
    <svg width={w} height={size} viewBox="0 0 70 100" aria-hidden>
      <rect x="14" y="2" width="42" height="14" rx="4" fill="#b98a5a" stroke="#8a6340" strokeWidth="2" />
      <path d="M10 18 H60 Q66 22 66 34 V86 Q66 96 56 96 H14 Q4 96 4 86 V34 Q4 22 10 18Z" fill="#fff8ec" fillOpacity="0.55" stroke="#8a6340" strokeWidth="2.5" />
      <path d="M9 52 H61 V86 Q61 92 55 92 H15 Q9 92 9 86Z" fill={color} fillOpacity="0.92" />
      <path d="M13 30 V80" stroke="#fffdf0" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/** The jar for an ingredient: the painted jar when we have it, else the code drawn one. */
export function Jar({ id, h = 52 }: { id: string; h?: number }) {
  const ing = ingredientOf(id);
  const color = ing?.swatch ?? '#ddd';
  return <LabImg k={`labx_jar_${id}`} style={{ height: h, width: 'auto' }} className="max-w-none object-contain" fallback={<CodeJar color={color} size={h} />} alt={ing?.name ?? ''} />;
}

export const GLASS_KEY = { mason: 'labx_glass_mason_full', mug: 'labx_glass_mug_full', togo: 'labx_glass_togo_full' } as const;
export const RIM_KEY: Record<string, string> = {
  strawberry: 'labx_garnish_strawberry', mint: 'labx_garnish_mint', cinnamon_stick: 'labx_garnish_cinnamon', sugar_rim: 'labx_garnish_sugarrim', yuzu_wheel: 'labx_garnish_yuzu', stars: 'labx_garnish_stars',
};
export const RIM_NAME: Record<string, string> = { strawberry: 'Strawberry slice', mint: 'Mint leaves', cinnamon_stick: 'Cinnamon stick', sugar_rim: 'Sugar rim', yuzu_wheel: 'Yuzu wheel', stars: 'Gold stars' };
export const PATTERN_NAME: Record<string, string> = { cat: 'Cat head', frog: 'Frog head', heart: 'Heart swirl', bear: 'Bear', star: 'Star', bunny: 'Bunny', swirl: 'Swirl', flower: 'Flower' };
/** The five new patterns have a painted foam disc and a numbered guide. */
export const PAINTED_ART = ['bear', 'star', 'bunny', 'swirl', 'flower'];

/** Which card template a recipe uses: classic, its season, or the gold Signature card. */
export function cardKeyFor(r: Pick<LabRecipe, 'flavor' | 'topping' | 'tier'>): string {
  if (r.tier === 'signature') return 'labx_card_vip';
  if (r.tier === 'seasonal') return `labx_card_${seasonOfRecipe(r) ?? 'classic'}`;
  return 'labx_card_classic';
}
export const chipKeyFor = (t: LabTier) => (t === 'signature' ? 'labx_chip_tier_3' : t === 'seasonal' ? 'labx_chip_tier_2' : 'labx_chip_tier_1');

/** The text colors that read on each card template. */
export const cardInk = (key: string) => (key.endsWith('autumn') || key.endsWith('vip') ? '#fff3dd' : '#5b4036');

export const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
