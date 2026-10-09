import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGame } from '../game/config';

export default function GameContainer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const game: Phaser.Game = createGame(ref.current);
    return () => game.destroy(true);
  }, []);

  return <div ref={ref} className="absolute inset-0 touch-none" />;
}
