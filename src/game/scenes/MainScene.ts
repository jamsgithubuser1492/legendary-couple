import Phaser from 'phaser';
import {
  GRID_SIZE, TILE_H, TILE_W_HALF,
  cartesianToIso, isoToCartesian, tileCenter, inBounds, findPath,
} from '../iso';
import { gameBus, BUS, loadStartingPath, type PathPayload, type EditPayload } from '../events';
import { buyPreset, getMe, getState, onStateChange, placeObject, removeObject, removeStarter, setAvatarPos } from '../../state/store';
import { blockedTiles, canPlace, canPlacePreset, decorFace, presetOrder, tilesOf, PLOT } from '../../state/placement';
import { presetOf } from '../../state/presets';
import { footprint, itemOf, type CatalogItem } from '../../state/catalog';
import { drawPlaced, box, diamond as isoDiamond } from '../draw';
import { SPRITES } from '../spriteList';
import { Avatar, createWalkAnims, preloadWalkStrips } from '../Avatar';
import { drawWall } from '../walls';
import { ensureFloorTextures, floorKey, FLOOR_STYLES, FLOOR_VARIANTS } from '../floors';
import { Companion } from '../Companion';
import { focusActive } from '../../state/store';
import { figureOf } from '../../state/minigames';
import { QuadrantFx } from '../quadrantFx';
import { preloadNpcStrips } from '../town/npcs';
import { outfitOf } from '../../state/wardrobe';
import { Ambient } from '../ambient';
import { starterStage } from '../../state/town';
import { FLOOR_FY } from '../floorOrigins';
import { IslandEffects } from '../effects';
import { TREE } from '../../state/placement';
import { getTheme, onThemeChange } from '../../state/season';
import type { CompanionId, GameState, PlacedObject, PlayerId } from '../../types';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const DRAG_THRESHOLD = 8;
const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
/** Which way each art wall piece runs as drawn: 'y' rises to the right, 'x' falls to the right. */
const WALL_NATIVE: Record<string, 'x' | 'y'> = { wall_single: 'y', wall_window: 'x', wall_door: 'x' };

export class MainScene extends Phaser.Scene {
  private highlight!: Phaser.GameObjects.Graphics;
  private ghostObjs: Phaser.GameObjects.GameObject[] = [];
  private ambient!: Ambient;
  private avatars!: Record<PlayerId, Avatar>;
  private structure: Phaser.GameObjects.GameObject[] = [];
  private placedObjs: Phaser.GameObjects.GameObject[] = [];
  private blocked = new Set<string>();
  private hasStarter = false;
  private drawnSize = 0;
  private starterKey = '';
  private dragStart?: { x: number; y: number; camX: number; camY: number };
  private dragging = false;
  private pinchDist = 0;
  private edit: EditPayload = { active: false, mode: 'place', itemId: null, rotation: 0 };
  private lastHover: { x: number; y: number } | null = null;
  private companions = new Map<CompanionId, Companion>();
  private roamers = new Map<string, Companion>();
  private fx!: QuadrantFx;
  private bottleObjs = new Map<string, Phaser.GameObjects.Container>();
  private roamTimer?: Phaser.Time.TimerEvent;
  private keys?: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private stateOverride?: GameState; // lets a ghost preview see its own walls

  constructor() {
    super('MainScene');
  }

  preload(): void {
    this.load.setPath(`${import.meta.env.BASE_URL}assets/sprites/`);
    for (const s of SPRITES) this.load.image(s.key, s.file);
    this.load.image('road_cobble', 'road_cobble.png');
    preloadWalkStrips(this);
    preloadNpcStrips(this);
    // water effect sprites (cut by tools/slice_water.py)
    for (const k of ['wave_s0', 'wave_s1', 'wave_s2', 'wave_s3', 'wave_m0', 'wave_m1', 'wave_m2', 'wave_l0', 'wave_l3', 'ripple_ring', 'ripple_cross', 'wake_prop', 'wake_dinghy']) this.load.image(k, `${k}.png`);
  }

  create(): void {
    ensureFloorTextures(this);
    this.ambient = new Ambient(this);
    this.ambient.apply(getTheme());
    this.drawnSize = GRID_SIZE;
    this.highlight = this.add.graphics().setDepth(1000);

    createWalkAnims(this);
    const st = getState();
    this.avatars = { A: new Avatar(this, 'A', st.avatars.A, 1, st.looks.A), B: new Avatar(this, 'B', st.avatars.B, 1, st.looks.B) };
    this.setStartingPath(loadStartingPath());
    new IslandEffects(this, () => this.avatars);
    this.renderPlaced();
    this.syncCompanions();
    this.syncRoamers();
    this.fx = new QuadrantFx(this, () => this.avatars);
    this.syncBottles();
    this.time.addEvent({ delay: 300, loop: true, callback: () => this.checkBottles() });

    this.centerCamera();
    // WASD and the arrow keys. Capture is off so typing in text boxes still works.
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false, false) as typeof this.keys;
    this.events.on(Phaser.Scenes.Events.UPDATE, this.keyboardWalk, this);
    this.input.addPointer(1); // second pointer for pinch zoom
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.zoomBy(dy > 0 ? -0.1 : 0.1);
    });

    const onPath = (p: PathPayload) => this.setStartingPath(p);
    const onCenter = () => this.scene.isActive() && this.centerCamera();
    const onZoom = (d: number) => this.scene.isActive() && this.zoomBy(d);
    const onView = (v: string) => {
      if (v === 'town' && this.scene.isActive()) this.scene.switch('TownScene');
    };
    const onEdit = (e: EditPayload) => {
      this.edit = e;
      this.ambient.setGrid(e.active);
      this.refreshHover();
    };
    const onFocus = (t: { x: number; y: number }) => {
      if (!this.scene.isActive()) return;
      const c = tileCenter(t.x, t.y);
      this.cameras.main.pan(c.x, c.y, 600, 'Sine.easeInOut');
    };
    const offState = onStateChange(() => {
      const st = getState();
      this.avatars.A.setLook(st.looks.A);
      this.avatars.B.setLook(st.looks.B);
      if (st.islandSize !== this.drawnSize) this.resizeIsland();
      const key = `${st.startingPath}:${st.starterRemoved}:${starterStage(st)}`;
      if (key !== this.starterKey) this.setStartingPath(st.startingPath);
      this.renderPlaced();
      this.syncPartner();
      this.syncCompanions();
      this.syncRoamers();
      this.syncBottles();
    });
    const offTheme = onThemeChange(() => {
      this.ambient.apply(getTheme());
      this.renderPlaced(); // seasonal walls follow the season
    });
    gameBus.on(BUS.edit, onEdit);
    gameBus.on(BUS.startingPath, onPath);
    gameBus.on(BUS.center, onCenter);
    gameBus.on(BUS.zoom, onZoom);
    gameBus.on(BUS.focus, onFocus);
    gameBus.on(BUS.view, onView);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offState();
      offTheme();
      this.events.off(Phaser.Scenes.Events.UPDATE, this.keyboardWalk, this);
      gameBus.off(BUS.edit, onEdit);
      gameBus.off(BUS.startingPath, onPath);
      gameBus.off(BUS.center, onCenter);
      gameBus.off(BUS.zoom, onZoom);
      gameBus.off(BUS.focus, onFocus);
      gameBus.off(BUS.view, onView);
    });
  }

  /** Redraws the island after you expand the build area. */
  private resizeIsland(): void {
    this.drawnSize = GRID_SIZE;
    this.ambient.apply(getTheme());
    this.ambient.setGrid(this.edit.active);
    this.centerCamera();
  }

  // ---------- WASD walking ----------

  /**
   * W, A, S, D (or the arrows) walk in the four screen directions, and two keys together walk diagonally,
   * which gives all eight directions. On this isometric grid, up on screen is one tile in x and y together.
   */
  private keyboardWalk(): void {
    const k = this.keys;
    if (!k || !this.scene.isActive() || this.edit.active) return;
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const me = getMe();
    const av = this.avatars[me];
    if (av.moving || focusActive(me)) return;
    const up = k.W.isDown || k.UP.isDown, down = k.S.isDown || k.DOWN.isDown;
    const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
    const tx = Math.sign((right ? 1 : 0) - (left ? 1 : 0) - (up ? 1 : 0) + (down ? 1 : 0));
    const ty = Math.sign((left ? 1 : 0) - (right ? 1 : 0) - (up ? 1 : 0) + (down ? 1 : 0));
    if (!tx && !ty) return;
    const blocked = this.pathingBlocked(me);
    const free = (x: number, y: number) => inBounds(x, y) && !blocked.has(`${x},${y}`);
    const { x, y } = av.tile;
    const options = [{ x: x + tx, y: y + ty }, { x: x + tx, y }, { x, y: y + ty }]; // then slide along a wall
    const target = options.find((t, i) => (t.x !== x || t.y !== y) && free(t.x, t.y) && (i > 0 || !(tx && ty) || (free(x + tx, y) && free(x, y + ty))));
    if (!target) return;
    av.walk([target], () => {
      setAvatarPos(me, av.tile.x, av.tile.y);
      this.followLocal();
    });
  }

  // ---------- avatars ----------

  private otherPlayer(p: PlayerId): PlayerId {
    return p === 'A' ? 'B' : 'A';
  }

  private pathingBlocked(forPlayer: PlayerId): Set<string> {
    const set = new Set(this.blocked);
    const o = this.avatars[this.otherPlayer(forPlayer)].tile;
    set.add(`${o.x},${o.y}`);
    return set;
  }

  private moveAvatarTo(tx: number, ty: number): void {
    const me = getMe();
    if (focusActive(me)) return; // the Focus Beacon locks movement
    const av = this.avatars[me];
    const path = findPath(av.tile, { x: tx, y: ty }, this.pathingBlocked(me));
    if (!path.length) return;
    av.walk(path, () => {
      setAvatarPos(me, av.tile.x, av.tile.y);
      this.followLocal();
    });
  }

  /** Walks the other partner's avatar to where the shared state says they are. */
  private syncPartner(): void {
    const me = getMe();
    for (const p of ['A', 'B'] as PlayerId[]) {
      if (p === me) continue;
      const av = this.avatars[p];
      const t = getState().avatars[p];
      if (av.moving || (av.tile.x === t.x && av.tile.y === t.y)) continue;
      const path = findPath(av.tile, t, this.pathingBlocked(p));
      if (path.length) av.walk(path);
      else av.snap(t.x, t.y);
    }
  }

  // ---------- companions ----------

  /** Free tiles around the local avatar, nearest first, for companions to stand on. */
  private nearbyFreeTiles(): { x: number; y: number }[] {
    const o = this.avatars[getMe()].tile;
    const taken = new Set<string>([...this.blocked, `${this.avatars.A.tile.x},${this.avatars.A.tile.y}`, `${this.avatars.B.tile.x},${this.avatars.B.tile.y}`]);
    const out: { x: number; y: number }[] = [];
    for (let r = 1; r <= 3; r++)
      for (let dx = -r; dx <= r; dx++)
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const t = { x: o.x + dx, y: o.y + dy };
          if (inBounds(t.x, t.y) && !taken.has(`${t.x},${t.y}`)) out.push(t);
        }
    // side by side first, diagonals last, so friends do not stack on top of you
    return out.sort((a, b) => Math.abs(a.x - o.x) + Math.abs(a.y - o.y) - (Math.abs(b.x - o.x) + Math.abs(b.y - o.y)));
  }

  private followLocal(): void {
    const claimed = new Set<string>();
    const free = this.nearbyFreeTiles();
    for (const comp of this.companions.values()) {
      const spot = free.find((t) => !claimed.has(`${t.x},${t.y}`));
      if (!spot) continue;
      claimed.add(`${spot.x},${spot.y}`);
      if (comp.tile.x === spot.x && comp.tile.y === spot.y) continue;
      const path = findPath(comp.tile, spot, this.blocked);
      if (path.length) comp.walk(path);
      else comp.snap(spot.x, spot.y);
    }
  }

  /** Sealed love letters washed up on the shore. */
  private syncBottles(): void {
    const live = new Map(getState().bottles.filter((b) => !b.opened).map((b) => [b.id, b]));
    for (const [id, c] of this.bottleObjs) {
      if (!live.has(id)) {
        c.destroy();
        this.bottleObjs.delete(id);
      }
    }
    for (const [id, b] of live) {
      if (this.bottleObjs.has(id)) continue;
      const parts: Phaser.GameObjects.GameObject[] = [];
      if (this.textures.exists('prop_bottle_shore')) {
        parts.push(this.add.image(0, 0, 'prop_bottle_shore').setOrigin(0.5, 0.85).setScale(0.55));
      } else {
        const g = this.add.graphics();
        g.fillStyle(0x7ac49a, 1);
        g.fillRoundedRect(-6, -26, 12, 24, 5);
        g.fillStyle(0xc99a62, 1);
        g.fillRect(-3, -31, 6, 6);
        parts.push(g);
      }
      parts.push(this.add.text(0, -44, '💌', { fontSize: '16px' }).setOrigin(0.5));
      const p = tileCenter(b.tileX, b.tileY);
      const c = this.add.container(p.x, p.y + 6, parts).setDepth(b.tileX + b.tileY + 0.3);
      this.tweens.add({ targets: c, y: c.y - 5, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.bottleObjs.set(id, c);
    }
  }

  /** Walking up to a bottle your partner sealed opens it. */
  private checkBottles(): void {
    if (!this.scene.isActive()) return;
    const me = getMe();
    const av = this.avatars[me];
    if (av.moving) return;
    const b = getState().bottles.find((x) => !x.opened && x.from !== me && Math.max(Math.abs(x.tileX - av.tile.x), Math.abs(x.tileY - av.tile.y)) <= 1);
    if (b) gameBus.emit(BUS.bottleOpen, b.id);
  }

  /** Collectible figures that were set free wander the island on their own. */
  private syncRoamers(): void {
    const free = getState().freeFigures;
    for (const [id, c] of this.roamers) {
      if (!free.includes(id)) {
        c.destroy();
        this.roamers.delete(id);
      }
    }
    for (const id of free) {
      const sprite = figureOf(id)?.sprite;
      if (this.roamers.has(id) || !sprite || !this.textures.exists(sprite)) continue;
      const spot = this.nearbyFreeTiles()[this.roamers.size] ?? this.avatars[getMe()].tile;
      this.roamers.set(id, new Companion(this, sprite, spot));
    }
    if (!this.roamTimer && this.roamers.size)
      this.roamTimer = this.time.addEvent({
        delay: 2500,
        loop: true,
        callback: () => {
          const spots = this.nearbyFreeTiles();
          for (const c of this.roamers.values()) {
            if (c.moving || !spots.length || Math.random() < 0.4) continue;
            const t = spots[Math.floor(Math.random() * spots.length)];
            const path = findPath(c.tile, t, this.blocked);
            if (path.length) c.walk(path);
          }
        },
      });
  }

  /** Brings invited companions onto the island, sends the rest home, and keeps outfits up to date. */
  private syncCompanions(): void {
    const w = getState().wardrobe;
    for (const [id, comp] of this.companions) {
      if (!w.invited.includes(id)) {
        comp.destroy();
        this.companions.delete(id);
      }
    }
    let added = false;
    for (const id of w.invited) {
      const outfit = outfitOf(w.equipped[id]);
      const sprite = outfit?.sprite;
      if (!sprite || !this.textures.exists(sprite)) continue;
      const existing = this.companions.get(id);
      if (existing) {
        existing.setOutfit(sprite);
        continue;
      }
      const spot = this.nearbyFreeTiles()[this.companions.size] ?? this.avatars[getMe()].tile;
      this.companions.set(id, new Companion(this, sprite, spot, outfit?.walkSheet));
      added = true;
    }
    if (added) this.followLocal();
  }

  // ---------- starting structure ----------

  private img(key: string, x: number, y: number, ox: number, oy: number, flip = false, alpha = 1): Phaser.GameObjects.Image {
    const im = this.add.image(x, y, key).setOrigin(ox, oy);
    im.setScale((DW.get(key) ?? im.width) / im.width);
    im.setFlipX(flip);
    im.setAlpha(alpha);
    return im;
  }

  private setStartingPath(p: PathPayload): void {
    this.structure.forEach((o) => o.destroy());
    this.structure = [];
    this.starterKey = `${p}:${getState().starterRemoved}:${starterStage(getState())}`;
    this.hasStarter = !!p && !getState().starterRemoved;
    this.blocked = blockedTiles(getState(), this.hasStarter);
    if (!p || getState().starterRemoved) return;
    for (const pl of ['A', 'B'] as PlayerId[]) {
      const av = this.avatars[pl];
      if (av.tile.x === PLOT.x && av.tile.y === PLOT.y) {
        av.snap(PLOT.x - 1, PLOT.y);
        setAvatarPos(pl, PLOT.x - 1, PLOT.y);
      }
    }
    const depth = PLOT.x + PLOT.y + 0.5;
    const front = cartesianToIso(PLOT.x + 1, PLOT.y + 1);
    const stage = starterStage(getState());
    // bare dirt under the starter, so the building sits on a worked patch of ground
    const dirt = this.add.graphics().setDepth(-48);
    const quad = [cartesianToIso(PLOT.x - 0.6, PLOT.y - 0.6), cartesianToIso(PLOT.x + 1.6, PLOT.y - 0.6), cartesianToIso(PLOT.x + 1.6, PLOT.y + 1.6), cartesianToIso(PLOT.x - 0.6, PLOT.y + 1.6)];
    for (const [shrink, alpha] of [[0, 0.35], [0.25, 0.45], [0.5, 0.55]] as const) {
      dirt.fillStyle(0xb98f62, alpha);
      dirt.beginPath();
      const c = cartesianToIso(PLOT.x + 0.5, PLOT.y + 0.5);
      quad.forEach((q, i) => {
        const x = c.x + (q.x - c.x) * (1 - shrink), y = c.y + (q.y - c.y) * (1 - shrink);
        if (i) dirt.lineTo(x, y);
        else dirt.moveTo(x, y);
      });
      dirt.closePath();
      dirt.fillPath();
    }
    this.structure.push(dirt);
    const stageKey = stage === 1 ? `starter_day1_${p}` : `starter_${p}_${stage}`; // day one is cut from your original path card
    if (this.textures.exists(stageKey)) {
      this.structure.push(this.img(stageKey, front.x, front.y - 4, 0.5, 1).setDepth(depth));
    } else if (p === 'shop' && this.textures.exists('cafe_exterior')) {
      // day one is your original starter art, then it grows into the later stages
      this.structure.push(this.img('cafe_exterior', front.x, front.y - 6, 0.5, 1).setDepth(depth));
    } else if (p === 'rv' && this.textures.exists('rv_b')) {
      this.structure.push(this.img('rv_b', front.x, front.y - 4, 0.5, 1).setDepth(depth));
    } else if (p === 'home') {
      const c = tileCenter(PLOT.x, PLOT.y);
      this.structure.push(this.add.image(c.x, c.y, floorKey('floor_wood', 1)).setScale(0.5).setDepth(-29));
      const wg = this.add.graphics().setDepth(depth);
      drawWall(wg, PLOT.x, PLOT.y, 'wall', 0, { W: false, E: true, N: false, S: true });
      this.structure.push(wg);
    } else {
      const g = this.add.graphics().setDepth(depth);
      const cx = PLOT.x + 0.5, cy = PLOT.y + 0.5;
      box(g, cx, cy, 0.9, 0.9, 30, 0, 0xffd3de); // fallback if the RV art is missing
      box(g, cx, cy, 0.92, 0.92, 5, 14, 0xbfe6f2);
      this.structure.push(g);
    }
  }

  // ---------- placed objects ----------

  private wallAtFn() {
    const s = getState();
    return (x: number, y: number) =>
      s.placed.some((o) => o.tileX === x && o.tileY === y && itemOf(o.itemId)?.layer === 'wall');
  }

  private renderPlaced(): void {
    const s = getState();
    this.placedObjs.forEach((o) => o.destroy());
    this.placedObjs = [];
    const wallAt = this.wallAtFn();
    for (const o of s.placed) this.placedObjs.push(...this.spawn(o, wallAt));
    this.placedObjs.push(this.floorEdges());
    for (const m of s.memories) this.placedObjs.push(this.plaque(m.tileX, m.tileY));
    this.blocked = blockedTiles(s, this.hasStarter);
    this.refreshHover();
  }

  /** A thin slab along the outside edge of a floor, so floors have weight but joins stay seamless. */
  private floorEdges(): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().setDepth(-31);
    const floors = new Map<string, string>();
    for (const o of getState().placed) {
      const it = itemOf(o.itemId);
      if (it?.layer === 'floor') floors.set(`${o.tileX},${o.tileY}`, o.itemId);
    }
    const poly = (a: { x: number; y: number }, b: { x: number; y: number }, color: number) => {
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.lineTo(b.x, b.y + 5);
      g.lineTo(a.x, a.y + 5);
      g.closePath();
      g.fillPath();
    };
    for (const [key, id] of floors) {
      const [x, y] = key.split(',').map(Number);
      const base = FLOOR_STYLES[id]?.grout ?? 0xc29a68;
      if (!floors.has(`${x},${y + 1}`)) poly(cartesianToIso(x, y + 1), cartesianToIso(x + 1, y + 1), base);
      if (!floors.has(`${x + 1},${y}`)) poly(cartesianToIso(x + 1, y + 1), cartesianToIso(x + 1, y), (base >> 1) & 0x7f7f7f);
    }
    return g;
  }

  private plaque(x: number, y: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    const c = tileCenter(x, y);
    g.setDepth(x + y + 0.4);
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(c.x, c.y + 4, 22, 8);
    g.fillStyle(0xa8765a, 1);
    g.fillRect(c.x - 2, c.y - 14, 4, 18); // post
    g.fillStyle(0xfff4ee, 1);
    g.lineStyle(2, 0xff9db6, 1);
    g.fillRoundedRect(c.x - 13, c.y - 32, 26, 20, 5);
    g.strokeRoundedRect(c.x - 13, c.y - 32, 26, 20, 5);
    g.fillStyle(0xff7fa1, 1); // little heart
    g.fillCircle(c.x - 3, c.y - 23, 3.2);
    g.fillCircle(c.x + 3, c.y - 23, 3.2);
    g.fillTriangle(c.x - 6.2, c.y - 21.6, c.x + 6.2, c.y - 21.6, c.x, c.y - 14.5);
    return g;
  }

  /** Builds the visuals for one placed object: art sprites when available, procedural shapes otherwise. */
  private spawn(o: PlacedObject, wallAt: (x: number, y: number) => boolean, alpha = 1, tint?: number): Phaser.GameObjects.GameObject[] {
    const item = itemOf(o.itemId);
    if (!item) return [];
    if (item.layer === 'floor' && FLOOR_STYLES[item.id]) {
      const c = tileCenter(o.tileX, o.tileY);
      const v = Math.floor((Math.sin(o.tileX * 12.9898 + o.tileY * 78.233) * 43758.5453 % 1 + 1) * 1000) % FLOOR_VARIANTS;
      const im = this.add.image(c.x, c.y, floorKey(item.id, v)).setScale(0.5).setAlpha(alpha).setDepth(-30);
      if (tint !== undefined) im.setTint(tint);
      return [im];
    }
    if (item.layer === 'wall') {
      const g = this.add.graphics().setDepth(o.tileX + o.tileY + 0.1);
      drawWall(g, o.tileX, o.tileY, item.variant ?? 'wall', o.rotation, {
        W: wallAt(o.tileX - 1, o.tileY), E: wallAt(o.tileX + 1, o.tileY), N: wallAt(o.tileX, o.tileY - 1), S: wallAt(o.tileX, o.tileY + 1),
      }, alpha, tint, item.material);
      return [g];
    }
    if (item.sprite && this.textures.exists(item.sprite)) return this.spawnSprite(item, o, wallAt, alpha, tint);
    if (item.layer === 'walldecor') return [];
    const g = this.add.graphics();
    g.setDepth(drawPlaced(g, o, { wallAt, alpha }));
    return [g];
  }

  private spawnSprite(item: CatalogItem, o: PlacedObject, wallAt: (x: number, y: number) => boolean, alpha: number, tint?: number) {
    const key = item.sprite!;
    const mk = (k: string, x: number, y: number, ox: number, oy: number, flip = false) => {
      const im = this.img(k, x, y, ox, oy, flip, alpha);
      if (tint !== undefined) im.setTint(tint);
      return im;
    };
    if (item.layer === 'floor') {
      const c = tileCenter(o.tileX, o.tileY);
      return [mk(key, c.x, c.y, 0.5, FLOOR_FY[key] ?? 0.39).setDepth(-30 + (o.tileX + o.tileY) * 0.0005)]; // tiles in front cover the edge of the ones behind
    }
    if (item.layer === 'wall') {
      const { tileX: x, tileY: y } = o;
      const hasX = wallAt(x - 1, y) || wallAt(x + 1, y);
      const hasY = wallAt(x, y - 1) || wallAt(x, y + 1);
      const depth = x + y + 0.1;
      if (hasX && hasY && this.textures.exists('wall_corner')) {
        const back = cartesianToIso(x, y), left = cartesianToIso(x, y + 1);
        return [mk('wall_corner', back.x, left.y + 2, 0.5, 1).setDepth(depth)];
      }
      const run: 'x' | 'y' = hasX ? 'x' : hasY ? 'y' : o.rotation % 180 === 0 ? 'x' : 'y';
      const flip = WALL_NATIVE[key] !== run;
      if (run === 'y') {
        const left = cartesianToIso(x, y + 1); // west edge, left vertex
        return [mk(key, left.x, left.y + 2, 0, 1, flip).setDepth(depth)];
      }
      const right = cartesianToIso(x + 1, y); // north edge, right vertex
      return [mk(key, right.x, right.y + 2, 1, 1, flip).setDepth(depth)];
    }
    if (item.layer === 'walldecor') {
      const face = decorFace(this.stateOverride ?? getState(), o.tileX, o.tileY, o.rotation);
      if (!face) return [];
      const { tileX: x, tileY: y } = o;
      // sit on the middle of the wall's visible face, a little in front of it
      const mid = face === 'y' ? cartesianToIso(x, y + 0.5) : cartesianToIso(x + 0.5, y);
      const nx = face === 'y' ? 2.6 : -2.6;
      const im = mk(key, mid.x + nx, mid.y + 1.3 - (item.lift ?? 34), 0.5, 0.5, face === 'x');
      return [im.setDepth(x + y + 0.3)]; // always just above its wall (wall depth is x + y + 0.1)
    }
    const fp = footprint(item, o.rotation);
    const front = cartesianToIso(o.tileX + fp.w, o.tileY + fp.d);
    const depth = o.tileX + fp.w - 1 + (o.tileY + fp.d - 1) + 0.4;
    return [mk(key, front.x, front.y - 8 + (item.oy ?? 0), 0.5, 1, o.rotation % 180 === 90).setDepth(depth)];
  }

  // ---------- input & camera ----------

  private pointerTile(p: Phaser.Input.Pointer): { x: number; y: number } | null {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const t = isoToCartesian(w.x, w.y);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);
    return inBounds(tx, ty) ? { x: tx, y: ty } : null;
  }

  private refreshHover(): void {
    this.setHover(this.lastHover);
  }

  /** Topmost placed object covering a tile (objects and walls win over floors). */
  private objectAt(x: number, y: number) {
    const hits = getState().placed.filter((o) => tilesOf(o.itemId, o.tileX, o.tileY, o.rotation).some((t) => t.x === x && t.y === y));
    return hits.find((o) => itemOf(o.itemId)?.layer === 'walldecor') ?? hits.find((o) => itemOf(o.itemId)?.layer !== 'floor') ?? hits[0];
  }

  private setHover(t: { x: number; y: number } | null): void {
    this.lastHover = t;
    this.highlight.clear();
    this.ghostObjs.forEach((g) => g.destroy());
    this.ghostObjs = [];
    const tint = (color: number, alpha: number, x: number, y: number) => {
      this.highlight.fillStyle(color, alpha);
      isoDiamond(this.highlight, x, y);
      this.highlight.fillPath();
    };
    if (t && this.edit.active && this.edit.mode === 'place' && this.edit.presetId && presetOf(this.edit.presetId)) {
      const preset = presetOf(this.edit.presetId)!;
      const s = getState();
      const avatarTiles = [this.avatars.A.tile, this.avatars.B.tile];
      const check = canPlacePreset(s, preset, t.x, t.y, avatarTiles);
      const items = presetOrder(preset).map((pi, i) => ({ id: `ghost${i}`, itemId: pi.itemId, tileX: t.x + pi.dx, tileY: t.y + pi.dy, rotation: pi.rotation ?? 0 })) as PlacedObject[];
      for (let dx = 0; dx < preset.w; dx++) for (let dy = 0; dy < preset.d; dy++) tint(check.ok ? 0x6fd48b : 0xff6b6b, 0.22, t.x + dx, t.y + dy);
      this.stateOverride = { ...s, placed: [...s.placed, ...items] };
      const wallAt = (x: number, y: number) => this.stateOverride!.placed.some((o) => o.tileX === x && o.tileY === y && itemOf(o.itemId)?.layer === 'wall');
      for (const o of items) this.ghostObjs.push(...this.spawn(o, wallAt, check.ok ? 0.72 : 0.4, check.ok ? undefined : 0xff9a9a));
      this.stateOverride = undefined;
      this.ghostObjs.forEach((g) => (g as Phaser.GameObjects.Image).setDepth?.(1001));
    } else if (t && this.edit.active && this.edit.mode === 'place' && this.edit.itemId) {
      const s = getState();
      const avatarTiles = [this.avatars.A.tile, this.avatars.B.tile];
      const check = canPlace(s, this.edit.itemId, t.x, t.y, this.edit.rotation, avatarTiles);
      for (const c of tilesOf(this.edit.itemId, t.x, t.y, this.edit.rotation)) tint(check.ok ? 0x6fd48b : 0xff6b6b, 0.35, c.x, c.y);
      const isWall = itemOf(this.edit.itemId)?.layer === 'wall';
      const baseWall = this.wallAtFn();
      const wallAt = (x: number, y: number) => baseWall(x, y) || (isWall && x === t.x && y === t.y);
      const ghost = { id: 'ghost', itemId: this.edit.itemId, tileX: t.x, tileY: t.y, rotation: this.edit.rotation } as PlacedObject;
      this.ghostObjs = this.spawn(ghost, wallAt, check.ok ? 0.7 : 0.4, check.ok ? undefined : 0xff9a9a);
      this.ghostObjs.forEach((g) => (g as Phaser.GameObjects.Image).setDepth?.(1001));
    } else if (t && this.edit.active && this.edit.mode === 'remove') {
      const hit = this.objectAt(t.x, t.y);
      if (hit) for (const c of tilesOf(hit.itemId, hit.tileX, hit.tileY, hit.rotation)) tint(0xff6b6b, 0.4, c.x, c.y);
      else if (this.hasStarter && t.x === PLOT.x && t.y === PLOT.y) tint(0xff6b6b, 0.4, t.x, t.y); // the starter structure
    } else if (t) {
      this.highlight.lineStyle(3, 0xff7fa1, 1);
      tint(0xff7fa1, 0.22, t.x, t.y);
      isoDiamond(this.highlight, t.x, t.y);
      this.highlight.strokePath();
    }
    gameBus.emit(BUS.hover, t);
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    const cam = this.cameras.main;
    this.dragStart = { x: p.x, y: p.y, camX: cam.scrollX, camY: cam.scrollY };
    this.dragging = false;
    this.setHover(this.pointerTile(p)); // touch has no hover, so show on press
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    const cam = this.cameras.main;
    const p1 = this.input.pointer1, p2 = this.input.pointer2;
    if (p1.isDown && p2.isDown) {
      const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (this.pinchDist) this.zoomBy((d - this.pinchDist) / 400);
      this.pinchDist = d;
      this.dragging = true;
      return;
    }
    this.pinchDist = 0;
    if (p.isDown && this.dragStart) {
      const dx = p.x - this.dragStart.x, dy = p.y - this.dragStart.y;
      if (this.dragging || Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        this.dragging = true;
        cam.setScroll(this.dragStart.camX - dx / cam.zoom, this.dragStart.camY - dy / cam.zoom);
      }
    } else {
      this.setHover(this.pointerTile(p));
    }
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    this.pinchDist = 0;
    const wasDrag = this.dragging;
    this.dragging = false;
    if (this.fx.tappedRecently()) return; // that tap was on a lantern
    this.dragStart = undefined;
    if (wasDrag) return;
    const t = this.pointerTile(p);
    if (t && this.edit.active) {
      if (this.edit.mode === 'place' && this.edit.presetId) {
        const preset = presetOf(this.edit.presetId);
        if (preset && buyPreset(preset.id, t.x, t.y, [this.avatars.A.tile, this.avatars.B.tile])) {
          gameBus.emit(BUS.townToast, { text: `✨ ${preset.name} is ready. Enjoy your new room!` });
          gameBus.emit(BUS.presetPlaced);
        } else {
          const why = preset ? canPlacePreset(getState(), preset, t.x, t.y) : null;
          gameBus.emit(BUS.townToast, { text: why && !why.ok ? `It does not fit there: ${why.reason}` : 'You cannot afford that design yet.' });
        }
      } else if (this.edit.mode === 'place' && this.edit.itemId) {
        placeObject(this.edit.itemId, t.x, t.y, this.edit.rotation, [this.avatars.A.tile, this.avatars.B.tile]);
      } else if (this.edit.mode === 'remove') {
        const hit = this.objectAt(t.x, t.y);
        if (hit) removeObject(hit.id);
        else if (this.hasStarter && t.x === PLOT.x && t.y === PLOT.y) {
          removeStarter();
          gameBus.emit(BUS.townToast, { text: 'Starter picked up and added to your bag. Your build area is blank!' });
        }
      }
      return;
    }
    if (t && t.x === TREE.x && t.y === TREE.y) {
      gameBus.emit(BUS.together, 'gratitude');
      return;
    }
    if (t) {
      const memory = getState().memories.find((m) => m.tileX === t.x && m.tileY === t.y);
      if (memory) gameBus.emit(BUS.memoryOpen, memory.id);
      else this.moveAvatarTo(t.x, t.y);
    }
    if (p.wasTouch) this.setHover(null);
  }

  private zoomBy(delta: number): void {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom + delta, MIN_ZOOM, MAX_ZOOM));
  }

  private centerCamera(): void {
    const cam = this.cameras.main;
    const c = tileCenter(GRID_SIZE / 2 - 0.5, GRID_SIZE / 2 - 0.5);
    const fit = Math.min(cam.width / (GRID_SIZE * TILE_W_HALF * 2.6), cam.height / (GRID_SIZE * TILE_H * 1.9));
    cam.setZoom(Phaser.Math.Clamp(fit, MIN_ZOOM, 1.4));
    cam.centerOn(c.x, c.y);
  }
}
