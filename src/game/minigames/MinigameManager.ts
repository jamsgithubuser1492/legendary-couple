import Phaser from 'phaser';
import { BUS, gameBus } from '../events';
import { MinigameNet } from './net';
import { getRoom } from '../../lib/sync';
import { getSupabase } from '../../lib/supabase';
import { applyMinigameReward, getMe, getState, spendToken } from '../../state/store';
import { gameOf, MG_SCENE, type MGResult, type MGType } from '../../state/minigames';
import type { PlayerId } from '../../types';

export interface LaunchRequest {
  type: MGType;
  mode: 'solo' | 'together' | 'join';
  role?: PlayerId; // solo practice only: which partner you play
  sessionId?: string;
  rush?: boolean; // a café rush: Matcha Masters fills your guests' orders
  swap?: boolean; // the partners swap roles this rush
}

const PAUSABLE = ['MainScene', 'TownScene'];
const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Launches minigames as overlay Phaser scenes and keeps both partners in step.
 * The world underneath is paused while a minigame runs, and resumed after.
 */
export class MinigameManager {
  private lobby: MinigameNet | null = null;
  private lobbyRoom = '';
  private active: { key: string; net: MinigameNet | null; under: Phaser.Scene | null; type: MGType; sessionId: string; role: PlayerId; solo: boolean } | null = null;

  constructor(private game: Phaser.Game) {
    gameBus.on(BUS.mgLaunch, this.onLaunch, this);
    gameBus.on(BUS.mgAttach, this.attach, this);
    // a destroyed game (React strict mode in development builds one extra) must stop listening
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      gameBus.off(BUS.mgLaunch, this.onLaunch, this);
      gameBus.off(BUS.mgAttach, this.attach, this);
    });
  }

  get playing() {
    return !!this.active;
  }

  /** Joins the room's lobby channel, where invites travel. */
  async attach() {
    const room = getRoom() ?? (MinigameNet.localOnly() ? 'LOCAL' : null);
    if (!room || room === this.lobbyRoom) return;
    await this.lobby?.leave();
    this.lobbyRoom = room;
    const lobby = new MinigameNet(`mglobby:${room}`, getMe());
    this.lobby = lobby;
    await lobby.join();
    lobby.on((m) => {
      if (m.t === 'invite' && m.from !== getMe() && !this.active) {
        const p = m.p as { type: MGType; sessionId: string; rush?: boolean; swap?: boolean };
        gameBus.emit(BUS.mgInvite, { type: p.type, sessionId: p.sessionId, from: m.from, rush: p.rush, swap: p.swap });
      }
    });
  }

  private onLaunch(req: LaunchRequest) {
    void this.launch(req);
  }

  private launching = false;

  async launch(req: LaunchRequest) {
    if (this.active || this.launching) return; // two invites or taps at once must not start two games
    this.launching = true;
    try {
      await this.start(req);
    } finally {
      this.launching = false;
    }
  }

  private async start(req: LaunchRequest) {
    const info = gameOf(req.type);
    const toast = (text: string) => gameBus.emit(BUS.townToast, { text });
    if (!info.unlocked(getState())) return toast(`🔒 ${info.name}: ${info.lockedText}`);

    const solo = req.mode === 'solo';
    const role: PlayerId = solo ? req.role ?? 'A' : getMe();
    const host = solo || role === 'A';
    if (req.type === 'CRANE_CRAZE' && host && getState().arcadeTokens < 1) return toast('You need an arcade token. Earn one per approved quest, or buy one.');

    let net: MinigameNet | null = null;
    const sessionId = req.sessionId ?? uid();
    if (!solo) {
      const room = getRoom() ?? (MinigameNet.localOnly() ? 'LOCAL' : null);
      if (!room) return toast('💞 Connect a room first (tap your name) so you can play together.');
      net = new MinigameNet(`mg:${room}:${sessionId}`, getMe());
      await net.join();
      if (req.mode === 'together') {
        await this.attach();
        this.lobby?.send('invite', { type: req.type, sessionId, rush: !!req.rush, swap: req.swap ?? getState().cafe.rushes % 2 === 1 });
      }
    }
    const under = this.game.scene.getScenes(true).find((s) => PAUSABLE.includes(s.scene.key)) ?? null;
    const launcher = under ?? this.game.scene.getScenes(true)[0];
    if (!launcher) {
      // the world is still loading (or sleeping in the café): nothing to launch from, and nothing must be left half started
      void net?.leave();
      return toast('Almost ready. Try again in a moment.');
    }
    if (req.type === 'CRANE_CRAZE' && host) spendToken();
    const key = MG_SCENE[req.type];
    const names = getState().names;
    this.active = { key, net, under, type: req.type, sessionId, role, solo };
    gameBus.emit(BUS.mgState, { active: true, type: req.type });
    const data = {
      role, solo, net, names, rush: !!req.rush, swap: req.rush ? req.swap ?? getState().cafe.rushes % 2 === 1 : false,
      onDone: (r: MGResult) => this.done(r),
      onQuit: () => this.close(),
    };
    // the minigame is an overlay scene on top of the town or island, which sleeps underneath
    launcher.scene.launch(key, data);
    if (under) under.scene.pause();
    try {
      this.game.scene.bringToTop(key);
    } catch {
      /* the scene launched last is already on top */
    }
  }

  private done(r: MGResult) {
    const a = this.active;
    if (a && r.award) {
      // the sheet must show what was really paid: the per game and daily coin limits can trim the raw total
      const before = getState().coins, raw = r.coins;
      applyMinigameReward(r);
      const paid = Math.max(0, getState().coins - before);
      if (paid < raw) r = { ...r, coins: paid, notes: [...r.notes, `The game coin limit kept the coins at ${paid}. Everything else still counts.`] };
      void getSupabase()
        ?.from('minigame_sessions')
        .insert({ room_code: getRoom() ?? 'SOLO', game_type: r.type, player_a: getState().names.A, player_b: getState().names.B, current_score: r.score, stars: r.stars, sync_state: r, status: 'COMPLETED' })
        .then(() => undefined, () => undefined);
    }
    this.close();
    gameBus.emit(BUS.mgResult, r);
  }

  private close() {
    const a = this.active;
    if (!a) return;
    this.active = null;
    this.game.scene.stop(a.key);
    a.under?.scene.resume();
    void a.net?.leave();
    gameBus.emit(BUS.mgState, { active: false });
  }
}

let manager: MinigameManager | null = null;
export const getManager = () => manager;
export const createManager = (game: Phaser.Game) => (manager = new MinigameManager(game));
