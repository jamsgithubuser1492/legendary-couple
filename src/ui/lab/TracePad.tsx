import { useEffect, useRef, useState } from 'react';
import { ingredientOf } from '../../state/lab';
import { LabImg, PAINTED_ART, PATTERN_NAME } from './labArt';

const W = 300, H = 230;
const CX = W / 2, CY = H / 2 + 6;
type Pt = { x: number; y: number };

const ring = (cx: number, cy: number, rx: number, ry: number, step = 4): Pt[] => {
  const n = Math.max(12, Math.round((Math.PI * 2 * Math.max(rx, ry)) / step));
  return Array.from({ length: n }, (_, i) => ({ x: cx + rx * Math.cos((i / n) * Math.PI * 2), y: cy + ry * Math.sin((i / n) * Math.PI * 2) }));
};
const line = (a: Pt, b: Pt, step = 4): Pt[] => {
  const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
  return Array.from({ length: n }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));
};

/** The points a pour should pass through for each of the five painted patterns. All are drawn in code so any size works. */
export function patternPoints(id: string): Pt[] {
  switch (id) {
    case 'star': {
      const v = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 40 : 92, a = -Math.PI / 2 + (i * Math.PI) / 5; return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }; });
      return v.flatMap((p, i) => line(p, v[(i + 1) % v.length]));
    }
    case 'swirl': {
      const out: Pt[] = [];
      for (let t = 0; t < 3 * Math.PI * 2; t += 0.12) { const r = 8 + (t / (3 * Math.PI * 2)) * 84; out.push({ x: CX + r * Math.cos(t), y: CY + r * Math.sin(t) * 0.82 }); }
      return out;
    }
    case 'flower': {
      const out: Pt[] = [];
      for (let t = 0; t < Math.PI * 2; t += 0.03) { const r = 92 * (0.42 + 0.58 * Math.abs(Math.cos(2.5 * t))); out.push({ x: CX + r * Math.cos(t - Math.PI / 2), y: CY + r * Math.sin(t - Math.PI / 2) * 0.9 }); }
      return [...out, ...ring(CX, CY, 14, 12, 3)];
    }
    case 'bear':
      return [...ring(CX, CY + 8, 74, 66), ...ring(CX - 58, CY - 52, 24, 24, 3), ...ring(CX + 58, CY - 52, 24, 24, 3), ...ring(CX, CY + 30, 28, 20, 3)];
    case 'bunny':
      return [...ring(CX, CY + 22, 66, 54), ...ring(CX - 30, CY - 52, 14, 44, 3), ...ring(CX + 30, CY - 52, 14, 44, 3)];
    default:
      return ring(CX, CY, 70, 60);
  }
}

/** Reads the dashes of an existing stencil (cat, frog, heart) as target points, the same way the Latte Art Studio does. */
function useStencilPoints(id: string, enabled: boolean): Pt[] | null {
  const [pts, setPts] = useState<Pt[] | null>(null);
  useEffect(() => {
    setPts(null);
    if (!enabled) return;
    let dead = false;
    const im = new Image();
    im.onload = () => {
      if (dead) return;
      const SW = 190, h = Math.round((im.naturalHeight / im.naturalWidth) * SW);
      const off = document.createElement('canvas');
      off.width = SW; off.height = h;
      const g = off.getContext('2d');
      if (!g) return setPts(ring(CX, CY, 70, 60));
      g.drawImage(im, 0, 0, SW, h);
      const d = g.getImageData(0, 0, SW, h).data;
      const out: Pt[] = [];
      for (let y = 0; y < h; y += 4) for (let x = 0; x < SW; x += 4) if (d[(y * SW + x) * 4 + 3] > 128) out.push({ x: x + (W - SW) / 2, y: y + (H - h) / 2 });
      setPts(out.length ? out : ring(CX, CY, 70, 60));
    };
    im.onerror = () => !dead && setPts(ring(CX, CY, 70, 60));
    im.src = `${import.meta.env.BASE_URL}assets/sprites/cy_stencil_${id}.png`;
    return () => { dead = true; };
  }, [id, enabled]);
  return pts;
}

/** Score 0 to 1: how much of the line was covered, minus how far the pour strayed (the same rule as the Latte Art Studio). */
export function scoreTrace(targets: Pt[], stroke: Pt[]): number {
  if (!targets.length || stroke.length < 8) return 0;
  const near = (a: Pt, list: Pt[], r: number) => list.some((b) => Math.hypot(a.x - b.x, a.y - b.y) <= r);
  const cover = targets.filter((p) => near(p, stroke, 12)).length / targets.length;
  const off = stroke.filter((p) => !near(p, targets, 24)).length / stroke.length;
  return Math.max(0, Math.min(1, cover * (1 - 0.6 * off)));
}

/** Pour latte art along a dotted guide. Reports a 0 to 1 score when you press Done. */
export default function TracePad({ pattern, base, disabled, onScore, score }: { pattern: string; base: string; disabled?: boolean; onScore: (v: number) => void; score: number | null }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<Pt[]>([]);
  const down = useRef(false);
  const [done, setDone] = useState<number | null>(null);
  const painted = PAINTED_ART.includes(pattern);
  const stencil = useStencilPoints(pattern, !painted);
  const targets = painted ? patternPoints(pattern) : stencil ?? [];
  const tref = useRef<Pt[]>([]);
  tref.current = targets;
  const foam = ingredientOf(base)?.swatch ?? '#7a5238';

  const paint = () => {
    const c = cv.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    g.clearRect(0, 0, W, H);
    // the cup, seen from above: a soft ring and a darker drink tinted by the base
    const grad = g.createRadialGradient(CX, CY, 20, CX, CY, 130);
    grad.addColorStop(0, '#8a6445');
    grad.addColorStop(1, '#6b4a34');
    g.fillStyle = '#c98b5a';
    g.beginPath(); g.ellipse(CX, CY, 128, 106, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = grad;
    g.beginPath(); g.ellipse(CX, CY, 118, 97, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = foam; g.globalAlpha = 0.28;
    g.beginPath(); g.ellipse(CX, CY, 118, 97, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    // the dotted guide
    g.fillStyle = 'rgba(255,253,240,0.6)';
    tref.current.forEach((p, i) => { if (i % 3 === 0) { g.beginPath(); g.arc(p.x, p.y, 1.8, 0, Math.PI * 2); g.fill(); } });
    // the foam poured so far
    g.fillStyle = 'rgba(255,252,240,0.96)';
    for (const p of stroke.current) { g.beginPath(); g.arc(p.x, p.y, 5.5, 0, Math.PI * 2); g.fill(); }
  };
  useEffect(paint, [pattern, targets.length, done, foam]);
  useEffect(() => { stroke.current = []; setDone(null); }, [pattern]);

  const at = (e: React.PointerEvent): Pt => {
    const r = cv.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const add = (e: React.PointerEvent) => {
    if (!down.current || done !== null || disabled) return;
    const p = at(e);
    const last = stroke.current[stroke.current.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 3) { stroke.current.push(p); paint(); }
  };
  const finish = () => {
    const v = scoreTrace(tref.current, stroke.current);
    setDone(v);
    onScore(v);
  };
  const shown = done ?? score;
  const good = (shown ?? 0) >= 0.7;
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative">
        <canvas
          ref={cv} width={W} height={H} aria-label={`Latte art pad: trace the ${PATTERN_NAME[pattern]}`}
          className={`block w-full touch-none rounded-2xl bg-[#5a3d2b] shadow ${disabled ? 'opacity-60' : 'cursor-crosshair'}`}
          onPointerDown={(e) => { if (disabled) return; down.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); add(e); }}
          onPointerMove={add}
          onPointerUp={() => (down.current = false)}
          onPointerCancel={() => (down.current = false)}
        />
        {good && painted && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <LabImg k={`labx_art_latte_${pattern}`} className="w-[62%] opacity-90" style={{ animation: 'olw-reveal 0.9s ease-out both' }} />
          </div>
        )}
        {painted && <LabImg k={`labx_guide_latte_${pattern}`} className="pointer-events-none absolute bottom-1 right-1 w-14 rounded-md bg-cream/80 p-0.5" title="The numbered guide" />}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <button className="flex-1 rounded-full bg-blush px-3 py-1 text-sm font-bold text-cocoa transition hover:brightness-95 active:scale-95 disabled:opacity-40" disabled={disabled} onClick={() => { stroke.current = []; setDone(null); paint(); }}>Clear</button>
        <button className="flex-1 rounded-full bg-pink-400 px-3 py-1 text-sm font-bold text-white transition hover:bg-pink-500 active:scale-95 disabled:opacity-40" disabled={disabled || done !== null} onClick={finish} title="Finish the pour and see how it looks">Done</button>
      </div>
      <p className="mt-1 text-center text-[11px] text-cocoa/70">
        {shown === null ? 'Drag along the dots to pour. Stay close to the line.' : `${Math.round(shown * 100)}% · ${shown >= 0.9 ? 'Perfect pour!' : shown >= 0.7 ? 'Lovely' : shown >= 0.4 ? 'Nice try' : 'Keep practicing'}`}
      </p>
    </div>
  );
}
