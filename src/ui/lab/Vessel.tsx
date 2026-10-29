import { useId } from 'react';
import type { LabGlass } from '../../types';
import { bandsOf, type Draft } from './draft';
import { LabImg, RIM_KEY, useReducedMotion } from './labArt';

/** The shape of each glass as an SVG path in a 100 by 140 box, and where its liquid sits. */
const SHAPE: Record<LabGlass, { body: string; liquid: [number, number, number, number]; lid?: boolean; handle?: string; strawX?: number }> = {
  mason: { body: 'M22 26 H78 Q84 30 84 40 V118 Q84 132 70 132 H30 Q16 132 16 118 V40 Q16 30 22 26Z', liquid: [19, 46, 62, 82] },
  mug: { body: 'M14 40 H72 V108 Q72 128 52 128 H34 Q14 128 14 108Z', liquid: [17, 46, 52, 78], handle: 'M72 52 H84 Q96 52 96 70 Q96 92 80 92 H72' },
  togo: { body: 'M24 30 H76 L70 128 Q69 132 64 132 H36 Q31 132 30 128Z', liquid: [28, 44, 44, 82], lid: true, strawX: 56 },
};

/**
 * The drink in its glass, drawn in code so the layers can be any color: base at the bottom, flavor above it, topping on top.
 * `mix` swirls the bands for a moment. The outline, cream highlight stripe and soft tint follow the painted glass look.
 */
export function Vessel({ draft, size = 150, mix = false, label }: { draft: Draft; size?: number; mix?: boolean; label?: string }) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const g = SHAPE[draft.glass];
  const bands = bandsOf(draft);
  const [lx, ly, lw, lh] = g.liquid;
  const bh = lh / 3;
  const rimKey = draft.rim ? RIM_KEY[draft.rim] : null;
  const sugar = draft.rim === 'sugar_rim';
  return (
    <div className="relative mx-auto" style={{ width: size * 0.78, height: size }} role="img" aria-label={label ?? 'Your drink'}>
      <svg viewBox="0 0 110 150" width="100%" height="100%" className="absolute inset-0" aria-hidden>
        <defs>
          <clipPath id={`c${id}`}><path d={g.body} /></clipPath>
          <linearGradient id={`h${id}`} x1="0" x2="1"><stop offset="0" stopColor="#fffdf0" stopOpacity="0.9" /><stop offset="0.25" stopColor="#fffdf0" stopOpacity="0.15" /><stop offset="1" stopColor="#fffdf0" stopOpacity="0" /></linearGradient>
        </defs>
        <ellipse cx="52" cy="138" rx="38" ry="6" fill="#6b4f4f" opacity="0.16" />
        {g.handle && <path d={g.handle} fill="none" stroke="#8a6340" strokeWidth="9" strokeLinecap="round" />}
        {g.handle && <path d={g.handle} fill="none" stroke="#f3dcc0" strokeWidth="4.5" strokeLinecap="round" />}
        <path d={g.body} fill={draft.glass === 'mug' ? '#f3dcc0' : '#fff8ec'} fillOpacity={draft.glass === 'mug' ? 1 : 0.5} />
        <g clipPath={`url(#c${id})`}>
          <g className={mix && !reduce ? 'olw-mix' : undefined}>
            {bands.map((b, i) => (
              <rect key={i} x={lx - 2} y={ly + (2 - i) * bh} width={lw + 4} height={bh + 0.6} fill={b.color} fillOpacity={0.94} />
            ))}
            {/* a soft wave on the top of the drink */}
            <path d={`M${lx - 2} ${ly} q ${lw / 4} -4 ${lw / 2} 0 t ${lw / 2 + 4} 0 V${ly + 4} H${lx - 2}Z`} fill="#fffdf0" fillOpacity="0.28" />
          </g>
          <rect x="0" y="0" width="110" height="150" fill={`url(#h${id})`} />
        </g>
        <path d={g.body} fill="none" stroke="#8a6340" strokeWidth="3" strokeLinejoin="round" />
        <path d={`M${lx + 2} ${ly - 4} V${ly + lh - 10}`} stroke="#fffdf0" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        {g.lid && (
          <>
            <path d="M22 30 Q50 2 78 30Z" fill="#fffdf0" fillOpacity="0.55" stroke="#8a6340" strokeWidth="2.5" />
            <rect x={g.strawX} y="2" width="6" height="50" rx="3" fill="#f6c6d3" stroke="#d98ba0" strokeWidth="1" transform="rotate(8 59 27)" />
          </>
        )}
        {draft.glass === 'mug' && (
          <g transform="translate(43 100)" opacity="0.85"><circle cx="-8" cy="0" r="2.2" fill="#6b4f4f" /><circle cx="8" cy="0" r="2.2" fill="#6b4f4f" /><ellipse cx="0" cy="5" rx="3" ry="2" fill="#e8909e" /></g>
        )}
        {sugar && <path d={`M${g.liquid[0] - 4} 27 H${g.liquid[0] + g.liquid[2] + 4}`} stroke="#fffdf0" strokeWidth="5" strokeDasharray="1.5 2.5" strokeLinecap="round" />}
      </svg>
      {rimKey && !sugar && <LabImg k={rimKey} className="pointer-events-none absolute max-w-none" style={{ width: size * 0.34, left: '52%', top: draft.glass === 'togo' ? '-2%' : '10%' }} />}
    </div>
  );
}
