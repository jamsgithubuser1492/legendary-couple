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
import ExpandModal from './ui/ExpandModal';
import CheatsModal from './ui/CheatsModal';
import { BottleReader, FocusOverlay, RitualsModal, SynergyBanner, TeaPrompt } from './ui/QuadrantUI';
import SeeOnIsland from './ui/SeeOnIsland';
import { ArcadeModal, MinigameOverlays, useMinigameActive } from './ui/ArcadeUI';
import TogetherModal, { BidBanner, type TogetherTab } from './ui/TogetherModal';
import { DreamMap, TownInteract, TownPanel, TownToast } from './ui/TownUI';
import type { ShopCategory } from './state/catalog';
import { growthOf, useGrowthPreview } from './state/town';
import { BUS, gameBus, type HoverPayload, type View } from './game/events';
import { setStartingPath, useGameState } from './state/store';
import WeeklyModal, { type Tab as WeekTab } from './ui/WeeklyModal';
import PocketPhone, { type PhoneAction } from './ui/PocketPhone';
import SurpriseModal from './ui/SurpriseModal';
import MomentOverlay from './ui/MomentOverlay';
import CafePanel from './ui/CafePanel';
import { EventsModal, GachaModal, LatteModal, OrdersModal } from './ui/CafeGames';
import { startSync } from './lib/sync';
import DesktopDock, { DOCK_ICON_W, DOCK_WIDE_W, ShortcutsCard } from './ui/DesktopDock';
import TodayPanel, { TodayContent, type TodayAct } from './ui/TodayPanel';
import { startBrowserIntegration, useDesktop, useWide, useXWide } from './lib/browser';
import { useShortcuts, type ShortcutId } from './lib/shortcuts';
import type { Quest, StartingPath } from './types';

const TODAY_KEY = 'olw:today';

/** The cozy loading card, shown until the world has finished loading so nothing flashes. It matches the splash in index.html. */
function BootSplash() {
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const started = Date.now();
    // the island scene attaches its listeners when it is ready to play
    const id = setInterval(() => {
      if (gameBus.listenerCount(BUS.center) > 0 || Date.now() - started > 25000) {
        clearInterval(id);
        setFading(true);
        setTimeout(() => setGone(true), 450);
      }
    }, 120);
    return () => clearInterval(id);
  }, []);
  if (gone) return null;
  return (
    <div className={`olw-splash absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 text-center transition-opacity duration-500 ${fading ? 'pointer-events-none opacity-0' : ''}`}>
      <div className="text-6xl">🏝️</div>
      <div className="font-display text-xl font-bold text-cocoa">Waking up your little world</div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-blush"><div className="olw-splash-bar h-full w-1/3 rounded-full bg-pink-400" /></div>
    </div>
  );
}

function SynergyBannerWrap() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex flex-col">
      <SynergyBanner />
      <TeaPrompt />
    </div>
  );
}

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
  const [expandOpen, setExpandOpen] = useState(false);
  const [cheats, setCheats] = useState(false);
  const [together, setTogether] = useState<TogetherTab | null>(null);
  const [interact, setInteract] = useState<string | null>(null);
  const [shopCat, setShopCat] = useState<ShopCategory | undefined>();
  const [view, setView] = useState<View>('island');
  const [townPanel, setTownPanel] = useState(false);
  const [dream, setDream] = useState(false);
  const [arcade, setArcade] = useState(false);
  const [seeIsland, setSeeIsland] = useState(false);
  const [rituals, setRituals] = useState(false);
  const [week, setWeek] = useState(false);
  const [weekTab, setWeekTab] = useState<WeekTab>('goal');
  const [phone, setPhone] = useState(false);
  const [surprise, setSurprise] = useState(false);
  const [cafePanel, setCafePanel] = useState(false);
  const [cafeGame, setCafeGame] = useState<'latte' | 'gacha' | 'events' | 'orders' | null>(null);
  const mgActive = useMinigameActive();
  const desktop = useDesktop();
  const wide = useWide();
  const xwide = useXWide();
  const [todayOpen, setTodayOpen] = useState(() => {
    try {
      return localStorage.getItem(TODAY_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [todayPop, setTodayPop] = useState(false);
  const [help, setHelp] = useState(false);
  useGrowthPreview(); // re-render when the growth preview changes
  const [shopOpen, setShopOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState>({ mode: 'place', itemId: null, rotation: 0, presetId: null });
  const [hover, setHover] = useState<HoverPayload>(null);

  useEffect(() => {
    startSync();
    const stopBrowser = startBrowserIntegration();
    const attachTimer = setInterval(() => gameBus.emit(BUS.mgAttach), 4000);
    gameBus.emit(BUS.mgAttach);
    gameBus.on(BUS.hover, setHover);
    gameBus.on(BUS.memoryOpen, setViewing);
    gameBus.on(BUS.viewSync, setView);
    gameBus.on(BUS.townInteract, setInteract);
    const openTogether = (t: string) => setTogether(t as TogetherTab);
    gameBus.on(BUS.together, openTogether);
    const openFocus = (w: string) => {
      if (w === 'streak') { setWeekTab('streak'); setWeek(true); }
      else if (w === 'covenant') { setWeekTab('goal'); setWeek(true); }
      else if (w === 'surprise') setSurprise(true);
      else if (w === 'latte' || w === 'gacha' || w === 'events' || w === 'orders') setCafeGame(w);
      else if (w === 'chalk') setCafePanel(true);
    };
    gameBus.on(BUS.openFocus, openFocus);
    const donePreset = () => setEdit((e) => ({ ...e, presetId: null }));
    gameBus.on(BUS.presetPlaced, donePreset);
    return () => {
      stopBrowser();
      clearInterval(attachTimer);
      gameBus.off(BUS.hover, setHover);
      gameBus.off(BUS.memoryOpen, setViewing);
      gameBus.off(BUS.viewSync, setView);
      gameBus.off(BUS.townInteract, setInteract);
      gameBus.off(BUS.together, openTogether);
      gameBus.off(BUS.openFocus, openFocus);
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

  const phoneAct = (a: PhoneAction) => {
    if (a === 'cafe') changeView('cafe');
    else if (a === 'cafePanel') setCafePanel(true);
    else if (a === 'checkin') setPanel('checkin');
    else if (a === 'week') { setWeekTab('goal'); setWeek(true); }
    else if (a === 'streak') { setWeekTab('streak'); setWeek(true); }
    else if (a === 'surprise') setSurprise(true);
    else if (a === 'together') setTogether('whisper');
    else if (a === 'vault') setTogether('log');
    else if (a === 'arcade') setArcade(true);
    else if (a === 'boxes') setPanel('boxes');
    else if (a === 'wardrobe') setPanel('wardrobe');
    else if (a === 'journal') setJournal({ open: true });
    else if (a === 'decorate') startDecorating();
    else if (a === 'rituals') setRituals(true);
    else if (a === 'townPanel') setTownPanel(true);
    else if (a === 'dream') setDream(true);
  };

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

  const changeView = (v: View) => {
    if (v === view) return;
    setEditing(false);
    setView(v);
    gameBus.emit(BUS.view, v);
  };

  // ---- desktop shell: dock, Today, shortcuts ----
  const dockOn = desktop && !mgActive && !editing;
  const leftPad = dockOn ? (wide ? DOCK_WIDE_W : DOCK_ICON_W) : 0;
  const todayDocked = dockOn && xwide;
  const setToday = (v: boolean) => {
    setTodayOpen(v);
    try {
      localStorage.setItem(TODAY_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  };
  const onToday = () => (xwide ? setToday(!todayOpen) : setTodayPop((v) => !v));
  const todayAct = (a: TodayAct) => {
    setTodayPop(false);
    if (a === 'quests') setQuestsOpen(true);
    else phoneAct(a);
  };

  const dialogOpen = () =>
    modalOpen || reveal || phone || !!interact || !!document.querySelector('[role="dialog"][aria-modal="true"]');
  useShortcuts((id: ShortcutId, e: KeyboardEvent) => {
    if (id === 'escape') {
      // our own popovers first; a dialog takes Escape itself; otherwise step back out of editing or the café
      if (help || todayPop) {
        e.preventDefault();
        setHelp(false);
        setTodayPop(false);
        return;
      }
      if (mgActive || dialogOpen()) return;
      if (editing) setEditing(false);
      else if (view === 'cafe') changeView('island');
      return;
    }
    if (mgActive || modalOpen) return;
    if (id === 'help') {
      if (help) setHelp(false);
      else if (!dialogOpen()) setHelp(true);
      return;
    }
    if (dialogOpen() || help) return;
    e.preventDefault();
    if (id === 'quests') setQuestsOpen(true);
    else if (id === 'arcade') setArcade(true);
    else if (id === 'journal') setJournal({ open: true });
    else if (id === 'decorate') {
      if (editing) setEditing(false);
      else if (view !== 'town') startDecorating();
    } else if (id === 'town') changeView(view === 'island' ? 'town' : 'island');
    else if (id === 'cafe') changeView(view === 'cafe' ? 'island' : 'cafe');
  }, true);

  // When a partner's saved game arrives with a starting path already chosen, do not ask again.
  useEffect(() => {
    if (path) setModalOpen(false);
  }, [path]);

  const pick = (p: StartingPath) => {
    setStartingPath(p);
    setModalOpen(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-sky">
      <GameContainer />
      <BootSplash />
      {!mgActive && <Hud
        hover={hover}
        onCenter={() => gameBus.emit(BUS.center)}
        onZoom={(d) => gameBus.emit(BUS.zoom, d)}
        onChangePath={() => setModalOpen(true)}
        onQuests={() => setQuestsOpen(true)}
        onUs={() => setUsOpen(true)}
        onPhone={() => setPhone(true)}
        editing={editing}
        view={view}
        growth={growthOf(state)}
        onView={changeView}
        onTownPanel={() => setTownPanel(true)}
        onSeeIsland={() => setSeeIsland(true)}
        desktop={desktop}
        dockOffset={leftPad}
      />}
      {dockOn && <DesktopDock view={view} wide={wide} todayOpen={xwide ? todayOpen : todayPop} onToday={onToday} onAct={phoneAct} onQuests={() => setQuestsOpen(true)} onView={changeView} onUs={() => setUsOpen(true)} onHelp={() => setHelp(true)} />}
      {todayDocked && <TodayPanel open={todayOpen} onToggle={() => setToday(!todayOpen)} onAct={todayAct} />}
      {dockOn && !xwide && todayPop && (
        <>
          <div className="absolute inset-0 z-10" onClick={() => setTodayPop(false)} />
          <div role="dialog" aria-label="Today" className="olw-body animate-drawer absolute top-[68px] z-20 max-h-[calc(100%-84px)] w-72 overflow-y-auto rounded-3xl bg-cream p-3 shadow-2xl" style={{ left: leftPad + 4 }}>
            <h2 className="mb-2 font-display text-lg font-bold text-cocoa">☀️ Today</h2>
            <TodayContent onAct={todayAct} />
          </div>
        </>
      )}
      {help && <ShortcutsCard onClose={() => setHelp(false)} />}
      {editing && <EditBar edit={edit} onChange={setEdit} onShop={() => setShopOpen(true)} onExpand={() => setExpandOpen(true)} onDone={() => setEditing(false)} />}
      {expandOpen && <ExpandModal space={view === 'cafe' ? 'cafe' : 'island'} onClose={() => setExpandOpen(false)} />}
      {cafeGame === 'latte' && <LatteModal onClose={() => setCafeGame(null)} />}
      {cafeGame === 'gacha' && <GachaModal onClose={() => setCafeGame(null)} />}
      {cafeGame === 'orders' && <OrdersModal onClose={() => setCafeGame(null)} />}
      {view === 'cafe' && !mgActive && !editing && (
        <button className="absolute bottom-20 z-10 -translate-x-1/2 cursor-pointer rounded-full bg-cream/95 px-4 py-2 font-display text-sm font-bold text-cocoa shadow transition hover:bg-cream active:scale-95" style={{ left: '50%' }} onClick={() => setCafeGame('orders')}>
          🧾 Orders ({state.cafe.orders.length}){state.cafe.orders.some((o) => !o.by) && <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />}
        </button>
      )}
      {cafeGame === 'events' && <EventsModal onClose={() => setCafeGame(null)} />}
      {cafePanel && <CafePanel onClose={() => setCafePanel(false)} onDecorate={startDecorating} />}
      {interact && <TownInteract lotId={interact} onTogether={(t) => setTogether(t as TogetherTab)} onClose={() => setInteract(null)} onShop={(c) => { setShopCat(c as ShopCategory); setShopOpen(true); }} onOpen={(w) => { if (w === 'quests') setQuestsOpen(true); else if (w === 'arcade') setArcade(true); else if (w === 'log') setTogether('log'); else if (w === 'week') { setWeekTab('goal'); setWeek(true); } else setRituals(true); }} />}
      {shopOpen && <ShopModal initialCat={view === 'town' ? shopCat : undefined} onClose={() => { setShopOpen(false); setShopCat(undefined); }} onPickPreset={(id) => { setEdit((e) => ({ ...e, mode: 'place', presetId: id })); setShopOpen(false); }} />}
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
      {usOpen && <PairingModal onClose={() => setUsOpen(false)} onChangePath={() => setModalOpen(true)} onCheats={() => setCheats(true)} />}
      <BidBanner />
      <MinigameOverlays />
      {!mgActive && <SynergyBannerWrap />}
      {rituals && <RitualsModal onClose={() => setRituals(false)} />}
      {week && <WeeklyModal tab={weekTab} onClose={() => setWeek(false)} />}
      {phone && !dockOn && <PocketPhone view={view} onClose={() => setPhone(false)} onAct={phoneAct} />}
      {surprise && <SurpriseModal onClose={() => setSurprise(false)} />}
      <MomentOverlay />
      <BottleReader />
      <FocusOverlay />
      {seeIsland && <SeeOnIsland onClose={() => setSeeIsland(false)} onShowIsland={() => { if (view !== 'island') changeView('island'); gameBus.emit(BUS.focus, { x: 4, y: 4 }); gameBus.emit(BUS.zoom, 0.5); }} />}
      {arcade && <ArcadeModal onClose={() => setArcade(false)} />}
      {together && <TogetherModal tab={together} onTab={setTogether} onClose={() => setTogether(null)} />}
      {cheats && <CheatsModal onClose={() => setCheats(false)} />}
      {modalOpen && <PathModal current={path} onPick={pick} onClose={path ? () => setModalOpen(false) : undefined} />}
    </div>
  );
}
