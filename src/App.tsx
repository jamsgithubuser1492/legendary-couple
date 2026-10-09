import { useEffect, useState } from 'react';
import GameContainer from './ui/GameContainer';
import Hud from './ui/Hud';
import PathModal from './ui/PathModal';
import QuestBoard from './ui/QuestBoard';
import PairingModal from './ui/PairingModal';
import ShopModal from './ui/ShopModal';
import EditBar, { type EditState } from './ui/EditBar';
import Journal, { MemoryViewer } from './ui/Journal';
import WardrobeModal from './ui/WardrobeModal';
import BlindBoxModal, { RevealModal } from './ui/BlindBoxModal';
import CheckinModal from './ui/CheckinModal';
import { DreamMap, TownPanel, TownToast } from './ui/TownUI';
import { growthOf, useGrowthPreview } from './state/town';
import { BUS, gameBus, type HoverPayload } from './game/events';
import { setStartingPath, useGameState } from './state/store';
import { startSync } from './lib/sync';
import type { Quest, StartingPath } from './types';

export default function App() {
  const state = useGameState();
  const path = state.startingPath;
  const [modalOpen, setModalOpen] = useState(() => path === null);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [usOpen, setUsOpen] = useState(false);
  const [journal, setJournal] = useState<{ open: boolean; prefill?: Quest }>({ open: false });
  const [viewing, setViewing] = useState<string | null>(null);
  const [panel, setPanel] = useState<'checkin' | 'boxes' | 'wardrobe' | null>(null);
  const [reveal, setReveal] = useState(false);
  const [view, setView] = useState<'island' | 'town'>('island');
  const [townPanel, setTownPanel] = useState(false);
  const [dream, setDream] = useState(false);
  useGrowthPreview(); // re-render when the growth preview changes
  const [shopOpen, setShopOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState>({ mode: 'place', itemId: null, rotation: 0, presetId: null });
  const [hover, setHover] = useState<HoverPayload>(null);

  useEffect(() => {
    startSync();
    gameBus.on(BUS.hover, setHover);
    gameBus.on(BUS.memoryOpen, setViewing);
    gameBus.on(BUS.viewSync, setView);
    const donePreset = () => setEdit((e) => ({ ...e, presetId: null }));
    gameBus.on(BUS.presetPlaced, donePreset);
    return () => {
      gameBus.off(BUS.hover, setHover);
      gameBus.off(BUS.memoryOpen, setViewing);
      gameBus.off(BUS.viewSync, setView);
      gameBus.off(BUS.presetPlaced, donePreset);
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

  // Show the blind box reveal on both phones, once per reveal.
  const last = state.lastReveal;
  useEffect(() => {
    if (!last) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem('olw:seenReveal');
    } catch {
      /* ignore */
    }
    if (seen !== last.id && Date.now() - last.ts < 10 * 60 * 1000) setReveal(true);
  }, [last]);

  const closeReveal = () => {
    try {
      if (last) localStorage.setItem('olw:seenReveal', last.id);
    } catch {
      /* ignore */
    }
    setReveal(false);
  };

  const changeView = (v: 'island' | 'town') => {
    if (v === view) return;
    setEditing(false);
    setView(v);
    gameBus.emit(BUS.view, v);
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
        onJournal={() => setJournal({ open: true })}
        onCheckin={() => setPanel('checkin')}
        onBoxes={() => setPanel('boxes')}
        onWardrobe={() => setPanel('wardrobe')}
        editing={editing}
        view={view}
        growth={growthOf(state)}
        onView={changeView}
        onTownPanel={() => setTownPanel(true)}
        onDream={() => setDream(true)}
      />
      {editing && <EditBar edit={edit} onChange={setEdit} onShop={() => setShopOpen(true)} onDone={() => setEditing(false)} />}
      {shopOpen && <ShopModal onClose={() => setShopOpen(false)} onPickPreset={(id) => { setEdit((e) => ({ ...e, mode: 'place', presetId: id })); setShopOpen(false); }} />}
      {questsOpen && (
        <QuestBoard
          onClose={() => setQuestsOpen(false)}
          onCaptureMemory={(q) => { setQuestsOpen(false); setJournal({ open: true, prefill: q }); }}
        />
      )}
      {journal.open && <Journal prefill={journal.prefill} onClose={() => setJournal({ open: false })} onView={setViewing} />}
      <TownToast />
      {townPanel && <TownPanel onClose={() => setTownPanel(false)} onDream={() => { setTownPanel(false); setDream(true); }} />}
      {dream && <DreamMap onClose={() => setDream(false)} />}
      {panel === 'checkin' && <CheckinModal onClose={() => setPanel(null)} />}
      {panel === 'boxes' && <BlindBoxModal onClose={() => setPanel(null)} />}
      {panel === 'wardrobe' && <WardrobeModal onClose={() => setPanel(null)} />}
      {reveal && last && <RevealModal reward={last.reward} openedBy={`${state.names.A} and ${state.names.B}`} onClose={closeReveal} />}
      {viewing && <MemoryViewer id={viewing} onClose={() => setViewing(null)} />}
      {usOpen && <PairingModal onClose={() => setUsOpen(false)} onChangePath={() => setModalOpen(true)} />}
      {modalOpen && <PathModal current={path} onPick={pick} onClose={path ? () => setModalOpen(false) : undefined} />}
    </div>
  );
}
