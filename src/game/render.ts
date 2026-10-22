/**
 * How sharp the canvas is. The game draws in device pixels (a retina screen gets twice as many), and scenes multiply
 * their zoom limits by DPR so a world looks the same size as before, only crisper. Capped at 2 (1.5 on low end
 * machines) and lowered further when the window is so big that the canvas would pass about 15 million pixels.
 */
const nav = navigator as Navigator & { deviceMemory?: number };
const LOW_POWER = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 2;
const MAX_PIXELS = 15e6;

function pick(): number {
  const raw = window.devicePixelRatio || 1;
  let d = Math.min(raw, LOW_POWER ? 1.5 : 2);
  const area = Math.max(1, window.innerWidth * window.innerHeight);
  if (area * d * d > MAX_PIXELS) d = Math.max(1, Math.sqrt(MAX_PIXELS / area));
  return Math.max(1, Math.round(d * 4) / 4);
}

export const DPR = pick();
/** Text is drawn to a bitmap first, so give it enough detail for a zoomed or retina canvas. */
export const TEXT_RES = Math.min(3, DPR * 1.5);
