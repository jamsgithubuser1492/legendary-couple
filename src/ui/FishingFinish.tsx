import { useEffect, useState } from 'react';

const BASE = `${import.meta.env.BASE_URL}assets/sprites/`;
// the two of them sit on the dock and cast again and again: a calm loop, one frame at a time
const SEQ = [0, 0, 0, 1, 1, 0, 0];

/** The finish scene for Stellar Fishing: the night pier, with both of you sitting on the dock casting. */
export default function FishingFinish() {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setT((v) => v + 1), 650);
    return () => clearInterval(id);
  }, []);
  const james = SEQ[t % SEQ.length] ? 'james_rel_2' : 'james_init_3';
  const rachel = SEQ[(t + 3) % SEQ.length] ? 'rachel_rel_2' : 'rachel_init_2';
  const who = (src: string, left: string, flick: boolean) => (
    <div className="absolute flex flex-col items-center" style={{ left, bottom: '47%', transform: 'translateX(-50%)' }}>
      <img src={`${BASE}sf_fin_${src}.png`} alt="" draggable={false} className={`h-[64px] w-auto max-w-none ${flick ? '' : 'animate-bob'}`} />
    </div>
  );
  return (
    <div className="relative mx-auto aspect-[1085/425] w-full overflow-hidden rounded-2xl shadow" style={{ backgroundImage: `url(${BASE}sf_fin_bg.jpg)`, backgroundSize: 'cover' }}>
      {who(james, '30%', SEQ[t % SEQ.length] === 1)}
      {who(rachel, '64%', SEQ[(t + 3) % SEQ.length] === 1)}
      {SEQ[t % SEQ.length] === 1 && <span className="animate-twinkle absolute text-sm" style={{ left: '46%', top: '30%' }}>✨</span>}
      {SEQ[(t + 3) % SEQ.length] === 1 && <span className="animate-twinkle absolute text-sm" style={{ left: '80%', top: '30%' }}>✨</span>}
    </div>
  );
}
