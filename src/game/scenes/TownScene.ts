import Phaser from 'phaser';
import { cartesianToIso, isoToCartesian, tileCenter } from '../iso';
import { Ambient } from '../ambient';
import { gameBus, BUS } from '../events';
import { Avatar } from '../Avatar';
import { findPath } from '../iso';
import { getMe, getState, onStateChange, setTownPos } from '../../state/store';
import type { PlayerId } from '../../types';
import { getTheme, onThemeChange } from '../../state/season';
import {
  HOME_PIN, LOTS, REGIONS, TOWN, activityOf, growthOf, onGrowthPreviewChange, regionById, unlockedRegions,
  type Lot, type RegionId,
} from '../../state/town';
import { SPRITES } from '../spriteList';
import { Boats } from '../town/boats';
import { cartesianToIso as iso } from '../iso';
import { Backdrop, REGION_RECTS, drawTerrain, regionAt } from '../town/world';
import { feather } from '../town/nature';
import { QuadrantFx } from '../quadrantFx';
import { focusActive } from '../../state/store';
import { FIGURES } from '../../state/minigames';
import { Companion } from '../Companion';

const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
const HOUSES = ['house_terracotta', 'house_bluedoor', 'house_pink', 'house_balcony', 'house_coastal', 'house_modern'];
const TOWERS = ['tower_coastal', 'tower_pastel', 'tower_garden', 'tower_city'];
const NPCS = ['npc_grandma', 'npc_photographer', 'npc_woman', 'npc_hat'];
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.6;
const DRAG_THRESHOLD = 8;

interface Npc {
  c: Phaser.GameObjects.Container;
  tile: { x: number; y: number };
  moving: boolean;
}

/** The zoomed out town. It starts bare and fills with buildings and people as you grow together. */
export class TownScene extends Phaser.Scene {
  private ambient!: Ambient;
  private backdrop!: Backdrop;
  private terrain: Phaser.GameObjects.GameObject[] = [];
  private scenery: Phaser.GameObjects.GameObject[] = [];
  private waterTick: (t: number) => void = () => {};
  private boats?: Boats;
  private avatars!: Record<PlayerId, Avatar>;
  private following = false;
  private blockedTown = new Set<string>();
  private keys?: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private solid = new Map<string, boolean>();
  private fog: Phaser.GameObjects.GameObject[] = [];
  private lotObjs = new Map<string, Phaser.GameObjects.GameObject[]>();
  private seenRegions = new Set<RegionId>();
  private npcs: Npc[] = [];
  private fx!: QuadrantFx;
  private visitors: Companion[] = [];
  private bunting: Phaser.GameObjects.GameObject[] = [];
  private bannerKey = '';
  private pin?: Phaser.GameObjects.Container;
  private occupied = new Set<string>();
  private dragStart?: { x: number; y: number; camX: number; camY: number };
  private dragging = false;
  private pinchDist = 0;
  private firstRender = true;

  constructor() {
    super('TownScene');
  }

  create(): void {
    this.backdrop = new Backdrop(this);
    this.backdrop.setTheme(getTheme());
    this.ambient = new Ambient(this, { island: false });
    this.ambient.apply(getTheme());
    this.drawWorld();
    this.refresh(false);
    const ta = getState().townAvatars;
    const lk = getState().looks;
    this.avatars = { A: new Avatar(this, 'A', ta.A, 0.7, lk.A), B: new Avatar(this, 'B', ta.B, 0.7, lk.B) };
    this.fx = new QuadrantFx(this, () => this.avatars);
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false, false) as typeof this.keys;
    this.events.on(Phaser.Scenes.Events.UPDATE, this.keyboardWalk, this);
    this.fitAll();
    this.ambient.apply(getTheme()); // scatter the seasonal particles over the view we actually landed on

    this.input.addPointer(1);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy > 0 ? -0.06 : 0.06));

    const onCenter = () => this.scene.isActive() && this.fitAll();
    const onZoom = (d: number) => this.scene.isActive() && this.zoomBy(d * 0.6);
    const onView = (v: string) => {
      if (v === 'island' && this.scene.isActive()) this.scene.switch('MainScene');
    };
    const offs = [
      onStateChange(() => {
        if (!this.scene.isActive()) return;
        this.refresh(true);
        this.avatars.A.setLook(getState().looks.A);
        this.avatars.B.setLook(getState().looks.B);
        this.syncPartner();
      }),
      onGrowthPreviewChange(() => this.refresh(true)),
      onThemeChange(() => {
        this.backdrop.setTheme(getTheme());
        this.ambient.apply(getTheme());
        this.drawWorld();
        this.refresh(false);
      }),
    ];
    gameBus.on(BUS.center, onCenter);
    gameBus.on(BUS.zoom, onZoom);
    gameBus.on(BUS.view, onView);
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.refresh(true));
    this.time.addEvent({ delay: 1700, loop: true, callback: () => { this.wander(); this.roamVisitors(); } });
    this.time.addEvent({ delay: 20000, loop: true, callback: () => this.refresh(false) });
    this.events.on(Phaser.Scenes.Events.UPDATE, (time: number) => this.waterTick(time));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offs.forEach((o) => o());
      this.events.off(Phaser.Scenes.Events.UPDATE, this.keyboardWalk, this);
      gameBus.off(BUS.center, onCenter);
      gameBus.off(BUS.zoom, onZoom);
      gameBus.off(BUS.view, onView);
    });
  }

  // ---------- terrain ----------

  /** Paints the sea, coast, land, mountains and forests, plus the permanent scenery. */
  private worldKey = '';

  private drawWorld(): void {
    const key = `${getTheme()}|${unlockedRegions(growthOf(getState())).join(',')}`;
    if (key === this.worldKey) return; // only repaint the land when the season or the open regions change
    this.worldKey = key;
    this.terrain.forEach((o) => o.destroy());
    this.scenery.forEach((o) => o.destroy());
    this.scenery = [];
    this.boats?.destroy();
    const t = drawTerrain(this, getTheme());
    this.terrain = t.objects;
    this.waterTick = t.tick;
    const place = (k: string, tx: number, ty: number, depth: number, dy = 0, flip = false) => {
      if (!this.textures.exists(k)) return;
      const p = iso(tx, ty);
      const im = this.add.image(p.x, p.y + dy, k).setOrigin(0.5, 1).setDepth(depth).setFlipX(flip);
      im.setScale((DW.get(k) ?? im.width) / im.width);
      this.scenery.push(im);
    };
    place('lighthouse_n', -3, -3, -2, 18);
    // beach life on the west shore
    place('umbrella_pink', 1.2, 30.2, 31.4);
    place('umbrella_blue', 2.4, 28.9, 31.3);
    place('sandcastle', 0.6, 31.6, 32.3);
    place('rowboat_sand', 0.2, 20.2, 20.4, 8, true);
    place('palm_tall', 2.2, 31.3, 33.6, 4);
    place('pier_end_a', -9.6, 21.6, 12, 14);
    place('pier_end_b', 21.6, 41.2, 63, 14);
    // boats
    this.boats = new Boats(this);
    this.boats.addBoat('sail', [{ x: -13, y: 6 }, { x: -11, y: 15 }, { x: -14, y: 27 }, { x: -12, y: 36 }], 0.55, 0.4);
    this.boats.addBoat('sail', [{ x: 8, y: 44 }, { x: 16, y: 46 }, { x: 31, y: 45 }], 0.5, 2.1);
    this.boats.addBoat('fish', [{ x: 5, y: 40 }, { x: 13, y: 41.5 }, { x: 15, y: 46 }], 0.4, 1.2);
    this.boats.addBoat('fish', [{ x: -9, y: 31 }, { x: -11.5, y: 38 }], 0.35, 3.3);
    this.boats.addMoored('dinghy_a', { x: -8.2, y: 23.4 }, 0.8);
    this.boats.addMoored('dinghy_b', { x: -9.2, y: 20.0 }, 2.4);
  }

  // ---------- buildings, fog, people ----------

  private spawnLot(l: Lot, animate: boolean): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const depth = l.x + l.w - 1 + (l.y + l.d - 1) + 0.4;
    const cx = l.x + l.w / 2, cy = l.y + l.d / 2;
    const theme = getTheme();
    const treeKey = (v: number) => {
      const set = theme === 'autumn' ? ['tree_round', 'tree_maple', 'tree_pine'] : theme === 'spring' ? ['tree_round', 'tree_blossom', 'tree_pine'] : theme === 'winter' || theme === 'holidays' ? ['tree_snowpine', 'tree_pine', 'tree_snowpine'] : ['tree_round', 'tree_pine', 'tree_round'];
      return set[v % set.length];
    };
    let key: string | undefined = l.sprite;
    if (l.kind === 'house') key = HOUSES[l.variant % HOUSES.length];
    else if (l.kind === 'tower') key = TOWERS[l.variant % TOWERS.length];
    else if (l.kind === 'barn') key = 'house_barn';
    else if (l.kind === 'tree') key = treeKey(l.variant);
    else if (l.kind === 'pine') key = theme === 'winter' || theme === 'holidays' ? 'pine_snow' : ['pine_a', 'pine_b', 'pine_c'][l.variant % 3];
    if (l.kind === 'plaza') {
      const g = this.add.graphics().setDepth(l.x + l.y + 0.05);
      const P = (x: number, y: number) => cartesianToIso(x, y);
      const quad = (x0: number, y0: number, x1: number, y1: number, color: number, alpha = 1) => {
        const a = P(x0, y0), b = P(x1, y0), c = P(x1, y1), d = P(x0, y1);
        g.fillStyle(color, alpha);
        g.fillPoints([new Phaser.Math.Vector2(a.x, a.y), new Phaser.Math.Vector2(b.x, b.y), new Phaser.Math.Vector2(c.x, c.y), new Phaser.Math.Vector2(d.x, d.y)], true);
      };
      quad(l.x, l.y, l.x + l.w, l.y + l.d, 0xe9d8c4);
      for (let i = 0; i < l.w; i++) for (let j = 0; j < l.d; j++) if ((i + j) % 2 === 0) quad(l.x + i + 0.04, l.y + j + 0.04, l.x + i + 0.96, l.y + j + 0.96, 0xf6e9d8);
      quad(l.x + 0.1, l.y + 0.1, l.x + l.w - 0.1, l.y + l.d - 0.1, 0xffffff, 0.06);
      out.push(g);
      // the fountain in the middle
      const f = this.add.graphics().setDepth(depth);
      const c0 = iso(cx, cy);
      f.fillStyle(0xcfc3b4, 1);
      f.fillEllipse(c0.x, c0.y, 62, 32);
      f.fillStyle(0x8fd3e8, 1);
      f.fillEllipse(c0.x, c0.y - 2, 52, 26);
      f.fillStyle(0xcfc3b4, 1);
      f.fillRect(c0.x - 4, c0.y - 24, 8, 22);
      f.fillStyle(0xbfe6f2, 0.9);
      f.fillEllipse(c0.x, c0.y - 26, 26, 12);
      f.fillStyle(0xffffff, 0.8);
      f.fillCircle(c0.x - 7, c0.y - 33, 3);
      f.fillCircle(c0.x + 8, c0.y - 30, 3);
      out.push(f);
    }
    if (key && this.textures.exists(key)) {
      const front = cartesianToIso(l.x + l.w, l.y + l.d);
      const small = l.kind === 'tree' || l.kind === 'pine';
      const c = iso(cx, cy);
      const im = this.add.image(small ? c.x : front.x, small ? c.y + 14 : front.y - 6, key).setOrigin(0.5, 1).setDepth(depth);
      im.setScale((DW.get(key) ?? im.width) / im.width);
      out.push(im);
    }
    if (animate) {
      out.forEach((o) => {
        const t = o as Phaser.GameObjects.Image;
        const endY = t.y;
        t.setAlpha(0);
        t.y = endY - 26;
        this.tweens.add({ targets: t, alpha: 1, duration: 600, ease: 'Sine.easeOut' });
        this.tweens.add({ targets: t, y: endY, duration: 650, ease: 'Bounce.easeOut' });
      });
    }
    return out;
  }

  /** Earned buildings are drawn in full colour. Future ones show as pale previews. */
  private styleLot(objs: Phaser.GameObjects.GameObject[], solid: boolean): void {
    for (const o of objs) {
      const t = o as Phaser.GameObjects.Image;
      if (solid) {
        t.setAlpha(1);
        (t as Phaser.GameObjects.Image).clearTint?.();
      } else {
        t.setAlpha(0.3);
        (t as Phaser.GameObjects.Image).setTint?.(0xd6e2f6);
      }
    }
  }

  private refresh(animate: boolean): void {
    const growth = growthOf(getState());
    const open = new Set(unlockedRegions(growth));
    this.drawWorld();

    // every planned building exists; it turns solid once the region is open and the growth is there
    const fresh: Lot[] = [];
    for (const l of LOTS) {
      const solid = open.has(l.region) && growth >= l.at;
      let objs = this.lotObjs.get(l.id);
      if (!objs) {
        objs = this.spawnLot(l, false);
        this.lotObjs.set(l.id, objs);
        this.styleLot(objs, solid);
        this.solid.set(l.id, solid);
        continue;
      }
      const was = this.solid.get(l.id) ?? false;
      if (was !== solid) {
        this.styleLot(objs, solid);
        this.solid.set(l.id, solid);
        if (solid && animate && !this.firstRender) {
          fresh.push(l);
          for (const o of objs) {
            const t = o as Phaser.GameObjects.Image;
            const endY = t.y;
            t.y = endY - 26;
            this.tweens.add({ targets: t, y: endY, duration: 650, ease: 'Bounce.easeOut' });
          }
        }
      }
    }
    this.occupied = new Set();
    for (const l of LOTS) {
      if (!(open.has(l.region) && growth >= l.at)) continue; // only built places block the way
      if (l.kind === 'plaza') {
        this.occupied.add(`${l.x + 1},${l.y + 1}`); // only the fountain blocks, the square itself is for walking
        continue;
      }
      for (let i = 0; i < l.w; i++) for (let j = 0; j < l.d; j++) this.occupied.add(`${l.x + i},${l.y + j}`);
    }
    this.blockedTown = new Set(this.occupied);
    for (let x = 0; x < TOWN; x++) for (let y = 0; y < TOWN; y++) if (!open.has(regionAt(x, y))) this.blockedTown.add(`${x},${y}`);

    // announce what changed
    const newRegions = [...open].filter((r) => !this.seenRegions.has(r));
    if (!this.firstRender) {
      for (const r of newRegions) gameBus.emit(BUS.townToast, { text: `✨ ${regionById(r).icon} ${regionById(r).name} is open!` });
      for (const l of fresh.filter((x) => x.kind === 'sprite' && x.w >= 2).slice(0, 2)) gameBus.emit(BUS.townToast, { text: `🏡 New in town: ${l.name}` });
    }
    newRegions.forEach((r) => this.seenRegions.add(r));

    this.drawFog(open, growth);
    this.drawPin();
    this.syncNpcs(growth, open);
    this.syncBanners(growth);
    this.firstRender = false;
  }

  /** Locked regions stay fully visible under a soft mist, so you can see everything you are growing toward. */
  private drawFog(open: Set<RegionId>, growth: number): void {
    this.fog.forEach((o) => o.destroy());
    this.fog = [];
    const g = this.add.graphics().setDepth(9000);
    this.fog.push(g);
    for (const r of REGIONS) {
      const rect = REGION_RECTS[r.id];
      if (!rect || open.has(r.id)) continue;
      feather(g, rect.x0, rect.y0, rect.x1, rect.y1, 4, 0xeee8f6, 0.24, 2.8); // soft mist that feathers into the open world
    }
    for (const r of REGIONS) {
      if (open.has(r.id)) continue;
      const c = tileCenter(r.center.x, r.center.y);
      // a few soft clouds drifting over the locked region
      for (let i = 0; i < 4; i++) {
        const cl = this.add.image(c.x + (i - 1.5) * 190, c.y + ((i * 53) % 120) - 60, 'cloud').setDepth(9001).setAlpha(0.3).setScale(1.5 + (i % 2) * 0.6);
        this.tweens.add({ targets: cl, x: cl.x + 60, duration: 9000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.fog.push(cl);
      }
      const t = this.add.text(c.x, c.y, `🔒 ${r.name}\nOpens at ${r.unlockAt} growth (you have ${growth})`, {
        fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#6b4f4f', align: 'center',
        backgroundColor: 'rgba(255,248,239,0.9)', padding: { x: 14, y: 8 },
      });
      t.setOrigin(0.5).setDepth(9002);
      this.fog.push(t);
    }
  }

  private drawPin(): void {
    this.pin?.destroy();
    const c = tileCenter(HOME_PIN.x, HOME_PIN.y);
    const g = this.add.graphics();
    g.fillStyle(0xa8765a, 1);
    g.fillRect(-2, -34, 4, 36);
    g.fillStyle(0xfff4ee, 1);
    g.lineStyle(2, 0xff9db6, 1);
    g.fillRoundedRect(-30, -62, 60, 28, 8);
    g.strokeRoundedRect(-30, -62, 60, 28, 8);
    const t = this.add.text(0, -48, '🏝️ Home', { fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#6b4f4f' }).setOrigin(0.5);
    this.pin = this.add.container(c.x, c.y, [g, t]).setDepth(HOME_PIN.x + HOME_PIN.y + 1);
  }

  /** Town Square Hospitality: a celebration banner flies over the square and cute visitors gather. */
  private syncBanners(growth: number): void {
    const plaza = LOTS.find((l) => l.kind === 'plaza');
    const now = Date.now();
    const live = getState().banners.filter((b) => b.until > now);
    const key = `${growth >= (plaza?.at ?? 1e9)}|${live.map((b) => b.id).join(',')}`;
    if (key === this.bannerKey || !plaza) return;
    this.bannerKey = key;
    this.bunting.forEach((o) => o.destroy());
    this.bunting = [];
    this.visitors.forEach((v) => v.destroy());
    this.visitors = [];
    if (growth < plaza.at || !live.length) return;
    // bunting strung between two poles
    const a = cartesianToIso(plaza.x, plaza.y + plaza.d), b = cartesianToIso(plaza.x + plaza.w, plaza.y);
    const g = this.add.graphics().setDepth(plaza.x + plaza.w + plaza.y + plaza.d + 5);
    g.lineStyle(3, 0x8a5a44, 1);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(a.x, a.y - 70);
    g.moveTo(b.x, b.y);
    g.lineTo(b.x, b.y - 70);
    g.strokePath();
    const colors = [0xff9ebb, 0xffd23f, 0x8fd3e8, 0xb9e8a8, 0xc9a7ff];
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y - 70 + (b.y - a.y) * t + Math.sin(t * Math.PI) * 18;
      g.fillStyle(colors[i % colors.length], 1);
      g.fillTriangle(x - 8, y, x + 8, y, x, y + 16);
    }
    const label = this.add.text((a.x + b.x) / 2, (a.y + b.y) / 2 - 104, `🎉 ${live[0].title}`, { fontFamily: '"Baloo 2", system-ui', fontSize: '15px', color: '#6b4f4f', backgroundColor: '#fff3e8', padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(plaza.x + plaza.w + plaza.y + plaza.d + 6);
    this.bunting.push(g, label);
    // visitors: blind box characters come to celebrate
    const sprites = FIGURES.map((f) => f.sprite).filter((k) => this.textures.exists(k));
    const count = Math.min(6, 2 + live.length * 2);
    for (let i = 0; i < count && sprites.length; i++) {
      const spot = { x: plaza.x + (i % plaza.w), y: plaza.y + Math.floor(i / plaza.w) % plaza.d };
      const v = new Companion(this, sprites[(i * 3 + live.length) % sprites.length], spot);
      v.container.setScale(0.7);
      this.visitors.push(v);
    }
  }

  private roamVisitors(): void {
    const plaza = LOTS.find((l) => l.kind === 'plaza');
    if (!plaza) return;
    for (const v of this.visitors) {
      if (v.moving || Math.random() < 0.4) continue;
      const t = { x: plaza.x + Math.floor(Math.random() * plaza.w), y: plaza.y + Math.floor(Math.random() * plaza.d) };
      if (this.blockedTown.has(`${t.x},${t.y}`)) continue;
      const path = findPath(v.tile, t, this.blockedTown, TOWN);
      if (path.length) v.walk(path);
    }
  }

  private walkable(x: number, y: number, open: Set<RegionId>): boolean {
    return x >= 0 && y >= 0 && x < TOWN && y < TOWN && open.has(regionAt(x, y)) && !this.occupied.has(`${x},${y}`);
  }

  private syncNpcs(growth: number, open: Set<RegionId>): void {
    const want = Math.min(8, Math.floor(growth / 14));
    while (this.npcs.length > want) this.npcs.pop()?.c.destroy();
    while (this.npcs.length < want) {
      const i = this.npcs.length;
      const key = NPCS[i % NPCS.length];
      if (!this.textures.exists(key)) break;
      let spot = { x: 8 + (i % 4) * 2, y: 17 };
      for (let tries = 0; tries < 40 && !this.walkable(spot.x, spot.y, open); tries++) spot = { x: 5 + Math.floor(Math.random() * 12), y: 14 + Math.floor(Math.random() * 12) };
      const im = this.add.image(0, 0, key).setOrigin(0.5, 1);
      im.setScale(((DW.get(key) ?? im.width) / im.width) * 0.62); // townsfolk are small next to buildings
      const shadow = this.add.ellipse(0, -1, 14, 6, 0x000000, 0.16);
      const c = this.add.container(0, 0, [shadow, im]);
      const p = tileCenter(spot.x, spot.y);
      c.setPosition(p.x, p.y + 4).setDepth(spot.x + spot.y + 0.2);
      this.npcs.push({ c, tile: spot, moving: false });
    }
    for (const n of this.npcs) if (!this.walkable(n.tile.x, n.tile.y, open) && !n.moving) {
      const p = tileCenter(8, 17);
      n.tile = { x: 8, y: 17 };
      n.c.setPosition(p.x, p.y + 4);
    }
  }

  /** Townsfolk stroll one tile at a time around the open parts of the map. */
  private wander(): void {
    if (!this.scene.isActive()) return;
    const open = new Set(unlockedRegions(growthOf(getState())));
    for (const n of this.npcs) {
      if (n.moving || Math.random() < 0.4) continue;
      const dirs = Phaser.Utils.Array.Shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const d = dirs.find(([dx, dy]) => this.walkable(n.tile.x + dx, n.tile.y + dy, open));
      if (!d) continue;
      const to = { x: n.tile.x + d[0], y: n.tile.y + d[1] };
      const a = tileCenter(n.tile.x, n.tile.y), b = tileCenter(to.x, to.y);
      n.moving = true;
      this.tweens.addCounter({
        from: 0, to: 1, duration: 650,
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 0;
          n.c.setPosition(a.x + (b.x - a.x) * t, a.y + 4 + (b.y - a.y) * t - Math.abs(Math.sin(t * Math.PI)) * 3);
          n.c.setDepth(n.tile.x + (to.x - n.tile.x) * t + n.tile.y + (to.y - n.tile.y) * t + 0.2);
        },
        onComplete: () => {
          n.tile = to;
          n.moving = false;
        },
      });
    }
  }

  // ---------- walking around town ----------

  private follow(): void {
    const cam = this.cameras.main;
    if (this.following) return;
    this.following = true;
    cam.startFollow(this.avatars[getMe()].container, true, 0.1, 0.1);
    this.tweens.add({ targets: cam, zoom: Math.max(cam.zoom, 0.95), duration: 700, ease: 'Sine.easeInOut' });
  }

  private pathBlocked(forPlayer: PlayerId): Set<string> {
    const set = new Set(this.blockedTown);
    const o = this.avatars[forPlayer === 'A' ? 'B' : 'A'].tile;
    set.add(`${o.x},${o.y}`);
    return set;
  }

  private walkTo(t: { x: number; y: number }, then?: () => void): boolean {
    const me = getMe();
    if (focusActive(me)) return false; // the Focus Beacon locks movement
    const av = this.avatars[me];
    const path = findPath(av.tile, t, this.pathBlocked(me), TOWN);
    if (!path.length) return false;
    this.follow();
    av.walk(path, () => {
      setTownPos(me, av.tile.x, av.tile.y);
      then?.();
    });
    return true;
  }

  /** Walks next to a place and opens it. */
  private visit(l: Lot): void {
    const me = getMe();
    const av = this.avatars[me];
    const near = (x: number, y: number) => x >= l.x - 1 && x <= l.x + l.w && y >= l.y - 1 && y <= l.y + l.d;
    if (near(av.tile.x, av.tile.y)) {
      gameBus.emit(BUS.townInteract, l.id);
      return;
    }
    const blocked = this.pathBlocked(me);
    let best: { x: number; y: number }[] | null = null;
    for (let x = l.x - 1; x <= l.x + l.w; x++)
      for (let y = l.y - 1; y <= l.y + l.d; y++) {
        if (x < 0 || y < 0 || x >= TOWN || y >= TOWN || blocked.has(`${x},${y}`)) continue;
        const path = findPath(av.tile, { x, y }, blocked, TOWN);
        if (path.length && (!best || path.length < best.length)) best = path;
      }
    if (!best) {
      gameBus.emit(BUS.townToast, { text: `${l.name} is too far to reach from here.` });
      return;
    }
    this.follow();
    av.walk(best, () => {
      setTownPos(me, av.tile.x, av.tile.y);
      gameBus.emit(BUS.townInteract, l.id);
    });
  }

  /** WASD or arrows, in the same eight directions as on the island. */
  private keyboardWalk(): void {
    const k = this.keys;
    if (!k || !this.scene.isActive()) return;
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const me = getMe();
    if (focusActive(me)) return;
    const av = this.avatars[me];
    if (av.moving) return;
    const up = k.W.isDown || k.UP.isDown, down = k.S.isDown || k.DOWN.isDown;
    const left = k.A.isDown || k.LEFT.isDown, right = k.D.isDown || k.RIGHT.isDown;
    const tx = Math.sign((right ? 1 : 0) - (left ? 1 : 0) - (up ? 1 : 0) + (down ? 1 : 0));
    const ty = Math.sign((left ? 1 : 0) - (right ? 1 : 0) - (up ? 1 : 0) + (down ? 1 : 0));
    if (!tx && !ty) return;
    const blocked = this.pathBlocked(me);
    const free = (x: number, y: number) => x >= 0 && y >= 0 && x < TOWN && y < TOWN && !blocked.has(`${x},${y}`);
    const { x, y } = av.tile;
    const options = [{ x: x + tx, y: y + ty }, { x: x + tx, y }, { x, y: y + ty }];
    const target = options.find((t, i) => (t.x !== x || t.y !== y) && free(t.x, t.y) && (i > 0 || !(tx && ty) || (free(x + tx, y) && free(x, y + ty))));
    if (!target) return;
    this.follow();
    av.walk([target], () => setTownPos(me, av.tile.x, av.tile.y));
  }

  /** Brings the partner's avatar to where they are in the shared town. */
  private syncPartner(): void {
    const me = getMe();
    for (const p of ['A', 'B'] as PlayerId[]) {
      if (p === me) continue;
      const av = this.avatars[p];
      const t = getState().townAvatars[p];
      if (av.moving || (av.tile.x === t.x && av.tile.y === t.y)) continue;
      const path = findPath(av.tile, t, this.pathBlocked(p), TOWN);
      if (path.length && path.length < 12) av.walk(path);
      else av.snap(t.x, t.y);
    }
  }

  // ---------- input and camera ----------

  private tileAt(p: Phaser.Input.Pointer): { x: number; y: number } | null {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const t = isoToCartesian(w.x, w.y);
    const x = Math.floor(t.x), y = Math.floor(t.y);
    return x >= 0 && y >= 0 && x < TOWN && y < TOWN ? { x, y } : null;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const cam = this.cameras.main;
    this.dragStart = { x: p.x, y: p.y, camX: cam.scrollX, camY: cam.scrollY };
    this.dragging = false;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const cam = this.cameras.main;
    const p1 = this.input.pointer1, p2 = this.input.pointer2;
    if (p1.isDown && p2.isDown) {
      const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (this.pinchDist) this.zoomBy((d - this.pinchDist) / 500);
      this.pinchDist = d;
      this.dragging = true;
      return;
    }
    this.pinchDist = 0;
    if (p.isDown && this.dragStart) {
      const dx = p.x - this.dragStart.x, dy = p.y - this.dragStart.y;
      if (this.dragging || Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        this.dragging = true;
        if (this.following) {
          cam.stopFollow();
          this.following = false;
        }
        cam.setScroll(this.dragStart.camX - dx / cam.zoom, this.dragStart.camY - dy / cam.zoom);
      }
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    this.pinchDist = 0;
    const was = this.dragging;
    this.dragging = false;
    this.dragStart = undefined;
    if (was || this.fx.tappedRecently()) return;
    const t = this.tileAt(p);
    if (!t) return;
    const growth = growthOf(getState());
    if (Math.abs(t.x - HOME_PIN.x) <= 1 && Math.abs(t.y - HOME_PIN.y) <= 1) {
      this.scene.switch('MainScene');
      gameBus.emit(BUS.viewSync, 'island');
      return;
    }
    const region = regionById(regionAt(t.x, t.y));
    if (growth < region.unlockAt) {
      gameBus.emit(BUS.townToast, { text: `🔒 ${region.name} opens at ${region.unlockAt} growth. You are at ${growth}. Quests, memories and daily questions grow the town.` });
      return;
    }
    const lot = LOTS.find((l) => growth >= l.at && t.x >= l.x && t.x < l.x + l.w && t.y >= l.y && t.y < l.y + l.d && this.lotObjs.has(l.id));
    if (lot && lot.name !== 'Tree' && lot.name !== 'Pine') {
      if (activityOf(lot.name)) return this.visit(lot);
      gameBus.emit(BUS.townToast, { text: `${lot.name}${lot.blurb ? ` · ${lot.blurb}` : ''}` });
      return;
    }
    this.walkTo(t); // an open tile: walk there
  }

  private zoomBy(d: number): void {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom + d, MIN_ZOOM, MAX_ZOOM));
  }

  /** Shows the whole painted world: sunset sky, sea, coast and every region. */
  private fitAll(): void {
    const cam = this.cameras.main;
    cam.stopFollow();
    this.following = false;
    // the painted world spans about 2300 x 1400 world pixels, from the lighthouse down to the south pier
    const zoom = Phaser.Math.Clamp(Math.min(cam.width / 2300, cam.height / 1400), MIN_ZOOM, 1);
    cam.setZoom(zoom);
    cam.centerOn(0, 470);
  }
}
