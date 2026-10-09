import { useEffect, useState } from 'react';
import GameContainer from './ui/GameContainer';
import Hud from './ui/Hud';
import PathModal from './ui/PathModal';
import QuestBoard from './ui/QuestBoard';
import PairingModal from './ui/PairingModal';
import { BUS, gameBus, type HoverPayload } from './game/events';
import { setStartingPath, useGameState } from './state/store';
import { startSync } from './lib/sync';
import type { StartingPath } from './types';

export default function App() {
  const state = useGameState();
  const path = state.startingPath;
  const [modalOpen, setModalOpen] = useState(() => path === null);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [usOpen, setUsOpen] = useState(false);
  const [hover, setHover] = useState<HoverPayload>(null);

  useEffect(() => {
    startSync();
    gameBus.on(BUS.hover, setHover);
    return () => {
      gameBus.off(BUS.hover, setHover);
    };
  }, []);

  // Keep the Phaser world in step with state (including changes from the partner).
  useEffect(() => {
    gameBus.emit(BUS.startingPath, path);
  }, [path]);

  const pick = (p: StartingPath) => {
    setStartingPath(p);
    setModalOpen(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-sky">
      <GameContainer />
      <Hud
        hover={hover}
        onCenter={() => gameBus.emit(BUS.center)}
        onZoom={(d) => gameBus.emit(BUS.zoom, d)}
        onChangePath={() => setModalOpen(true)}
        onQuests={() => setQuestsOpen(true)}
        onUs={() => setUsOpen(true)}
      />
      {questsOpen && <QuestBoard onClose={() => setQuestsOpen(false)} />}
      {usOpen && <PairingModal onClose={() => setUsOpen(false)} />}
      {modalOpen && <PathModal current={path} onPick={pick} onClose={path ? () => setModalOpen(false) : undefined} />}
    </div>
  );
}
