import { useEffect, useState } from 'react';
import GameContainer from './ui/GameContainer';
import Hud from './ui/Hud';
import PathModal from './ui/PathModal';
import QuestBoard from './ui/QuestBoard';
import PairingModal from './ui/PairingModal';
import ShopModal from './ui/ShopModal';
import EditBar, { type EditState } from './ui/EditBar';
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
  const [shopOpen, setShopOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState>({ mode: 'place', itemId: null, rotation: 0 });
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

  useEffect(() => {
    gameBus.emit(BUS.edit, { active: editing, ...edit });
  }, [editing, edit]);

  const startDecorating = () => {
    const first = state.inventory.find((i) => i.count > 0);
    setEdit((e) => ({ ...e, mode: 'place', itemId: e.itemId && state.inventory.some((i) => i.id === e.itemId && i.count > 0) ? e.itemId : first?.id ?? null }));
    setEditing(true);
  };

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
        onDecorate={startDecorating}
        editing={editing}
      />
      {editing && <EditBar edit={edit} onChange={setEdit} onShop={() => setShopOpen(true)} onDone={() => setEditing(false)} />}
      {shopOpen && <ShopModal onClose={() => setShopOpen(false)} />}
      {questsOpen && <QuestBoard onClose={() => setQuestsOpen(false)} />}
      {usOpen && <PairingModal onClose={() => setUsOpen(false)} />}
      {modalOpen && <PathModal current={path} onPick={pick} onClose={path ? () => setModalOpen(false) : undefined} />}
    </div>
  );
}
