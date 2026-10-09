import { useEffect, useState } from 'react';
import GameContainer from './ui/GameContainer';
import Hud from './ui/Hud';
import PathModal from './ui/PathModal';
import { BUS, gameBus, loadStartingPath, saveStartingPath, type HoverPayload } from './game/events';
import type { StartingPath } from './types';

export default function App() {
  const [path, setPath] = useState<StartingPath | null>(loadStartingPath);
  const [modalOpen, setModalOpen] = useState(() => loadStartingPath() === null);
  const [hover, setHover] = useState<HoverPayload>(null);

  useEffect(() => {
    gameBus.on(BUS.hover, setHover);
    return () => {
      gameBus.off(BUS.hover, setHover);
    };
  }, []);

  const pick = (p: StartingPath) => {
    saveStartingPath(p);
    setPath(p);
    setModalOpen(false);
    gameBus.emit(BUS.startingPath, p);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-sky">
      <GameContainer />
      <Hud
        path={path}
        hover={hover}
        onCenter={() => gameBus.emit(BUS.center)}
        onZoom={(d) => gameBus.emit(BUS.zoom, d)}
        onChangePath={() => setModalOpen(true)}
      />
      {modalOpen && <PathModal current={path} onPick={pick} onClose={path ? () => setModalOpen(false) : undefined} />}
    </div>
  );
}
