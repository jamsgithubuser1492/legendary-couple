import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGame } from '../game/config';
import { DPR } from '../game/render';

/**
 * Hosts the Phaser canvas. The stage measures DPR times the free area and is drawn at 1 over DPR, so the canvas has one
 * pixel per device pixel (sharp on retina). A ResizeObserver follows the container, so a side dock or panel can take
 * space and the game always fills what is left.
 */
export default function GameContainer() {
  const outer = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o = outer.current, s = stage.current;
    if (!o || !s) return;
    const size = () => {
      const w = Math.max(1, Math.round(o.clientWidth * DPR)), h = Math.max(1, Math.round(o.clientHeight * DPR));
      s.style.width = `${w}px`;
      s.style.height = `${h}px`;
    };
    size();
    const game: Phaser.Game = createGame(s);
    const ro = new ResizeObserver(() => {
      size();
      game.scale.refresh();
    });
    ro.observe(o);
    return () => {
      ro.disconnect();
      game.destroy(true);
    };
  }, []);

  return (
    <div ref={outer} className="absolute inset-0 touch-none overflow-hidden">
      <div ref={stage} style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${1 / DPR})`, transformOrigin: '0 0' }} />
    </div>
  );
}
