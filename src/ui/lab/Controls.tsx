import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { LabImg, useReducedMotion } from './labArt';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** The glass thermometer: drag the brass knob up for warmer, down for cooler. Arrow keys nudge it. */
export function Thermometer({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const set = (e: PointerEvent) => {
    const r = track.current?.getBoundingClientRect();
    if (!r) return;
    onChange(clamp01(1 - (e.clientY - r.top) / r.height));
  };
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.03;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp01(value + step)); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(clamp01(value - step)); }
  };
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col items-center gap-1" title="Temperature: drag the knob, or use the arrow keys">
      <div className="text-lg" aria-hidden>☀️</div>
      <div
        ref={track}
        role="slider" aria-label="Temperature" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={pct > 66 ? 'warm' : pct < 34 ? 'cool' : 'mild'} aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={`relative h-28 w-8 touch-none select-none rounded-full ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
        style={{ background: 'linear-gradient(#fff3d8, #f3e2c4)', border: '3px solid #8a6340', boxShadow: 'inset 3px 0 0 rgba(255,253,240,0.8), inset -3px 0 4px rgba(107,79,79,0.18)' }}
        onPointerDown={(e) => { if (disabled) return; drag.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(e); }}
        onPointerMove={(e) => drag.current && set(e)}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
        onKeyDown={disabled ? undefined : key}
      >
        <div className="absolute bottom-0 left-0 right-0 rounded-full" style={{ height: `${value * 100}%`, background: 'linear-gradient(to top, #a9d6e4, #f3e5ab 55%, #f2a65a)', opacity: 0.9 }} />
        {[0.25, 0.5, 0.75].map((t) => <div key={t} className="absolute right-1 h-px w-2 bg-[#8a6340]/60" style={{ bottom: `${t * 100}%` }} />)}
        <LabImg k="labx_thermo_knob_n" className="pointer-events-none absolute left-1/2 max-w-none" style={{ width: 34, bottom: `calc(${value * 100}% - 17px)`, transform: 'translateX(-50%)', filter: 'drop-shadow(0 2px 2px rgba(107,79,79,0.4))' }} fallback={<div className="absolute left-1/2 h-7 w-7 -translate-x-1/2 rounded-full bg-amber-400" style={{ bottom: `calc(${value * 100}% - 14px)` }} />} />
      </div>
      <div className="text-lg" aria-hidden>❄️</div>
    </div>
  );
}

const NEEDLES = [0, 40, 100, 150, 180, 210, 240, 270];
/** The sweetness dial: drag around it, 0 degrees is unsweetened and 270 is the sweetest. */
export function SweetDial({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const angle = value * 270;
  const frame = NEEDLES.reduce((a, b) => (Math.abs(b - angle) < Math.abs(a - angle) ? b : a), 0);
  const set = (e: { clientX: number; clientY: number }) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    // 0 at the lower left (7 o'clock), sweeping clockwise to 270 at the lower right (5 o'clock)
    let a = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 at 12 o'clock, clockwise
    a = (a + 360 + 135) % 360; // rotate so 7 o'clock is 0
    if (a > 270) a = a < 315 ? 270 : 0;
    onChange(clamp01(a / 270));
  };
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.03;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp01(value + step)); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(clamp01(value - step)); }
  };
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col items-center gap-1" title="Sweetness: drag around the dial, or use the arrow keys">
      <div
        ref={box}
        role="slider" aria-label="Sweetness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={pct > 66 ? 'sweet' : pct < 34 ? 'light' : 'medium'} aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={`relative touch-none select-none ${disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ width: 112, height: 88 }}
        onPointerDown={(e) => { if (disabled) return; drag.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(e); }}
        onPointerMove={(e) => drag.current && set(e)}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
        onKeyDown={disabled ? undefined : key}
      >
        <LabImg k={`labx_dial_needle_${frame}`} className="absolute inset-0 h-full w-full object-contain" fallback={<div className="absolute inset-3 rounded-full border-4 border-[#8a6340] bg-[#f3e2c4]" />} />
      </div>
      <div className="flex w-full justify-between px-2 text-[11px] font-bold text-cocoa/70"><span>🍃 light</span><span>sweet 💗</span></div>
    </div>
  );
}

/** The sweet spot meter: the arc glows as the balance gets close, and a little chime plays when you land on it. */
export function SpotMeter({ close, chimeKey }: { close: number; chimeKey: string }) {
  const reduce = useReducedMotion();
  const glow = clamp01((close - 0.55) / 0.35); // starts to glow at 55 percent, full at 90
  const [chime, setChime] = useState(0);
  const was = useRef(false);
  const seen = useRef('');
  useEffect(() => { // a fresh combination starts quiet again
    if (seen.current !== chimeKey) { seen.current = chimeKey; was.current = false; }
  }, [chimeKey]);
  useEffect(() => {
    const on = close >= 0.9;
    if (on && !was.current) {
      was.current = true;
      if (!reduce) { setChime(1); let n = 1; const t = setInterval(() => { n++; if (n > 4) { clearInterval(t); setChime(0); } else setChime(n); }, 110); return () => clearInterval(t); }
    }
    if (!on && close < 0.8) was.current = false;
  }, [close, reduce]);
  return (
    <div className="relative mx-auto w-32" role="img" aria-label={`Sweet spot: ${Math.round(close * 100)} percent close`} title="The arc glows as the balance gets close to the sweet spot">
      <LabImg k="labx_spot_off" className="w-full" />
      <LabImg k="labx_spot_on" className="pointer-events-none absolute inset-0 w-full" style={{ opacity: glow, mixBlendMode: 'screen', transition: 'opacity 0.25s' }} />
      {chime > 0 && <LabImg k={`labx_chime_${chime}`} className="pointer-events-none absolute left-1/2 top-0 w-14 -translate-x-1/2" style={{ mixBlendMode: 'screen' }} />}
    </div>
  );
}
