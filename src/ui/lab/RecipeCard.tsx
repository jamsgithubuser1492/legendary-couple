import type { LabRecipe } from '../../types';
import { ingredientOf, TIER_NAMES } from '../../state/lab';
import { Vessel } from './Vessel';
import { cardInk, cardKeyFor, chipKeyFor, LabImg, PAINTED_ART, stars } from './labArt';

/** A recipe as a card: the template for its tier and season, the drink in the window, the name in the open box. */
export default function RecipeCard({ r, width = 150, onClick, selected, celebrate }: { r: LabRecipe; width?: number; onClick?: () => void; selected?: boolean; celebrate?: boolean }) {
  const key = cardKeyFor(r);
  const ink = cardInk(key);
  const h = width * 1.42;
  const painted = r.art && PAINTED_ART.includes(r.art);
  const drink = { base: r.base, flavor: r.flavor, topping: r.topping, glass: r.glass, rim: r.rim, art: r.art, artScore: 1, temp: 0.5, sweet: 0.5 };
  const body = (
    <div className="relative overflow-hidden rounded-xl" style={{ width, height: h, color: ink }}>
      <LabImg k={key} className="absolute inset-0 h-full w-full object-fill" fallback={<div className="absolute inset-0 rounded-xl bg-[#f6e8d0] ring-2 ring-[#c98b5a]" />} />
      <div className="absolute flex items-center justify-center" style={{ left: '14%', right: '14%', top: '14%', height: '42%' }}>
        {painted ? <LabImg k={`labx_art_latte_${r.art}`} className="max-h-full max-w-full object-contain" /> : <Vessel draft={drink} size={h * 0.36} />}
      </div>
      <div className="absolute text-center font-display font-bold leading-none" style={{ left: '14%', right: '14%', top: '57%', fontSize: width * 0.085, letterSpacing: 1 }} aria-label={`${r.quality} of 3 stars`}>{stars(r.quality)}</div>
      <div className="absolute flex items-center justify-center rounded-md px-1 text-center font-display font-bold leading-tight" style={{ left: '13%', right: '13%', top: '66%', height: '21%', fontSize: Math.max(10, width * 0.075), background: key.endsWith('vip') ? 'rgba(34,29,26,0.96)' : key.endsWith('autumn') ? 'rgba(140,76,40,0.5)' : 'transparent' }}>
        <span className="line-clamp-3">{r.name}</span>
      </div>
      <LabImg k={chipKeyFor(r.tier)} className="absolute" style={{ right: '9%', top: '5%', width: width * 0.19 }} title={TIER_NAMES[r.tier]} />
      {r.tier !== 'classic' && <LabImg k={r.tier === 'signature' ? 'labx_seal_wax_teal' : 'labx_seal_wax_red'} className="absolute" style={{ left: '4%', bottom: '3%', width: width * 0.22, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }} />}
      {celebrate && <LabImg k="labx_card_overlay_celebrate" className="pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] object-contain" style={{ mixBlendMode: 'screen', animation: 'olw-chime 1.6s ease-out both' }} />}
      {r.tier === 'signature' && <LabImg k="labx_card_overlay_shimmer" className="olw-shimmer pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ mixBlendMode: 'screen' }} />}
    </div>
  );
  const label = `${r.name}, ${TIER_NAMES[r.tier]}, ${r.quality} of 3 stars. ${ingredientOf(r.base)?.name}, ${ingredientOf(r.flavor)?.name}, ${ingredientOf(r.topping)?.name}.`;
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={selected} className={`rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${selected ? 'ring-4 ring-pink-300' : ''}`}>{body}</button>
  ) : (
    <div role="img" aria-label={label}>{body}</div>
  );
}
