import Phaser from 'phaser';
import { cartesianToIso, isoToCartesian, tileCenter } from '../iso';
import { diamond, box, shade } from '../draw';
import { Ambient } from '../ambient';
import { gameBus, BUS } from '../events';
import { getState, onStateChange } from '../../state/store';
import { getTheme, onThemeChange, PALETTES } from '../../state/season';
import {
  HOME_PIN, LOTS, REGIONS, TOWN, growthOf, onGrowthPreviewChange, regionById, regionOf, unlockedRegions,
  type Lot, type RegionId,
} from '../../state/town';
import { SPRITES } from '../spriteList';
import { drawBarn, drawHouse, drawPine, drawTower, drawTree } from '../town/buildings';

const DW = new Map<string, number>(SPRITES.map((s) => [s.key, s.dw]));
const NPCS = ['npc_grandma', 'npc_photographer', 'npc_woman', 'npc_hat'];
const MIN_ZOOM = 0.28;
const MAX_ZOOM = 1.6;
const DRAG_THRESHOLD = 8;

const hash = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

interface Npc {
  c: Phaser.GameObjects.Container;
  tile: { x: number; y: number };
  moving: boolean;
}

/** The zoomed out town. It starts bare and fills with buildings and people as you grow together. */
export class TownScene extends Phaser.Scene {
  private ambient!: Ambient;
  private terrain: Phaser.GameObjects.GameObject[] = [];
  private fog: Phaser.GameObjects.GameObject[] = [];
  private lotObjs = new Map<string, Phaser.GameObjects.GameObject[]>();
  private seenLots = new Set<string>();
  private seenRegions = new Set<RegionId>();
  private npcs: Npc[] = [];
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
    this.ambient = new Ambient(this, { island: false });
    this.ambient.apply(getTheme());
    this.drawWorld();
    this.refresh(false);
    this.centerOn(REGIONS[0].center, 0.5);
    this.ambient.apply(getTheme()); // scatter the seasonal particles over the view we actually landed on

    this.input.addPointer(1);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy > 0 ? -0.06 : 0.06));

    const onCenter = () => this.scene.isActive() && this.centerOn(REGIONS[0].center, 0.5);
    const onZoom = (d: number) => this.scene.isActive() && this.zoomBy(d * 0.6);
    const onView = (v: string) => {
      if (v === 'island' && this.scene.isActive()) this.scene.switch('MainScene');
    };
    const offs = [
      onStateChange(() => this.scene.isActive() && this.refresh(true)),
      onGrowthPreviewChange(() => this.refresh(true)),
      onThemeChange(() => {
        this.ambient.apply(getTheme());
        this.drawWorld();
        this.refresh(false);
      }),
    ];
    gameBus.on(BUS.center, onCenter);
    gameBus.on(BUS.zoom, onZoom);
    gameBus.on(BUS.view, onView);
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.refresh(true));
    this.time.addEvent({ delay: 1700, loop: true, callback: () => this.wander() });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offs.forEach((o) => o());
      gameBus.off(BUS.center, onCenter);
      gameBus.off(BUS.zoom, onZoom);
      gameBus.off(BUS.view, onView);
    });
  }

  // ---------- terrain ----------

  private drawWorld(): void {
    this.terrain.forEach((o) => o.destroy());
    this.terrain = [];
    const pal = PALETTES[getTheme()];
    const water = this.add.graphics().setDepth(-100);
    const c = tileCenter(TOWN / 2 - 0.5, TOWN / 2 - 0.5);
    for (let i = 3; i >= 0; i--) {
      water.fillStyle(pal.waterRing, 0.22 + i * 0.1);
      const r = (TOWN / 2 + 3 + i * 3) * 32 * 1.45;
      water.fillEllipse(c.x, c.y + 40, r * 2, r);
    }
    // sand rim, then the land itself
    const rim = this.add.graphics().setDepth(-60);
    rim.fillStyle(pal.sandEdge, 1);
    for (let x = 0; x < TOWN; x++)
      for (let y = 0; y < TOWN; y++) {
        if (x < TOWN - 1 && y < TOWN - 1) continue; // only the two front edges show a rim
        const p = cartesianToIso(x, y);
        rim.fillRect(p.x - 32, p.y + 16, 64, 12);
      }
    this.terrain.push(water, rim);
    const land = this.add.graphics().setDepth(-50);
    this.terrain.push(land);
    for (let s = 0; s < TOWN * 2; s++) {
      for (let x = 0; x < TOWN; x++) {
        const y = s - x;
        if (y < 0 || y >= TOWN) continue;
        land.fillStyle(this.tileColor(x, y, pal), 1);
        diamond(land, x, y);
        land.fillPath();
        land.lineStyle(1, 0xffffff, 0.22);
        diamond(land, x, y);
        land.strokePath();
      }
    }
    // little raised rock blocks on the mountain
    const rocks = this.add.graphics().setDepth(-45);
    this.terrain.push(rocks);
    const unlocked = unlockedRegions(growthOf(getState()));
    if (unlocked.includes('mountain')) {
      for (let s = 0; s < TOWN * 2; s++)
        for (let x = 0; x < TOWN; x++) {
          const y = s - x;
          if (y < 0 || y >= TOWN || regionOf(x, y) !== 'mountain') continue;
          const edge = Math.max(0, 1 - Math.hypot(x - 29, y - 0) / 13);
          const h = Math.round(edge * 26 * (0.6 + hash(x, y) * 0.8));
          if (h > 4) box(rocks, x + 0.5, y + 0.5, 1, 1, h, 0, shade(0x9a8f88, 0.9 + hash(y, x) * 0.25));
        }
    }
  }

  private tileColor(x: number, y: number, pal: (typeof PALETTES)[keyof typeof PALETTES]): number {
    const region = regionOf(x, y);
    const unlocked = unlockedRegions(growthOf(getState())).includes(region);
    const checker = (x + y) % 2 === 0;
    if (!unlocked) return checker ? 0xe4eaee : 0xdbe3e9; // misty and bare until it opens
    switch (region) {
      case 'coast':
        if (y >= 27 || x <= 2) return checker ? pal.sand : shade(pal.sand, 0.96);
        if (x % 6 === 0 || y % 6 === 0) return checker ? 0xd8d0c8 : 0xcfc7bf;
        return checker ? pal.grassA : pal.grassB;
      case 'country': {
        const band = (((x >> 1) + (y >> 1)) % 3 + 3) % 3;
        const base = [0xb8d880, 0xe8d27a, 0xc89a68][band];
        return checker ? base : shade(base, 0.94);
      }
      case 'mountain':
        return checker ? 0xb4aca4 : 0xa89f98;
      case 'downtown':
        if ((x - 18) % 3 === 2 || (y - 22) % 3 === 2) return 0x9a9aa4;
        return checker ? 0xd2d0cc : 0xc8c6c2;
      default:
        return checker ? 0xcfe8b8 : 0xc4e0ac;
    }
  }

  // ---------- buildings, fog, people ----------

  private spawnLot(l: Lot, animate: boolean): Phaser.GameObjects.GameObject[] {
    const out: Phaser.GameObjects.GameObject[] = [];
    const depth = l.x + l.w - 1 + (l.y + l.d - 1) + 0.4;
    const cx = l.x + l.w / 2, cy = l.y + l.d / 2;
    if (l.kind === 'sprite' && l.sprite && this.textures.exists(l.sprite)) {
      const front = cartesianToIso(l.x + l.w, l.y + l.d);
      const im = this.add.image(front.x, front.y - 6, l.sprite).setOrigin(0.5, 1).setDepth(depth);
      im.setScale((DW.get(l.sprite) ?? im.width) / im.width);
      out.push(im);
    } else {
      const g = this.add.graphics().setDepth(depth);
      if (l.kind === 'house') drawHouse(g, cx, cy, l.variant);
      else if (l.kind === 'tower') drawTower(g, cx, cy, l.variant);
      else if (l.kind === 'barn') drawBarn(g, cx, cy, l.variant);
      else if (l.kind === 'tree') drawTree(g, cx, cy, l.variant);
      else if (l.kind === 'pine') drawPine(g, cx, cy);
      out.push(g);
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

  private refresh(animate: boolean): void {
    const growth = growthOf(getState());
    const open = new Set(unlockedRegions(growth));
    // terrain colours depend on which regions are open
    this.drawWorld();

    // buildings
    const visible = LOTS.filter((l) => open.has(l.region) && growth >= l.at);
    const visibleIds = new Set(visible.map((l) => l.id));
    for (const [id, objs] of this.lotObjs) {
      if (!visibleIds.has(id)) {
        objs.forEach((o) => o.destroy());
        this.lotObjs.delete(id);
      }
    }
    const fresh: Lot[] = [];
    for (const l of visible) {
      if (this.lotObjs.has(l.id)) continue;
      const isNew = !this.seenLots.has(l.id);
      this.lotObjs.set(l.id, this.spawnLot(l, animate && !this.firstRender && isNew));
      if (isNew && animate && !this.firstRender) fresh.push(l);
      this.seenLots.add(l.id);
    }
    this.occupied = new Set();
    for (const l of visible) for (let i = 0; i < l.w; i++) for (let j = 0; j < l.d; j++) this.occupied.add(`${l.x + i},${l.y + j}`);

    // announce what changed
    const newRegions = [...open].filter((r) => !this.seenRegions.has(r));
    if (!this.firstRender) {
      for (const r of newRegions) gameBus.emit(BUS.townToast, { text: `✨ ${regionById(r).icon} ${regionById(r).name} is open!` });
      const notable = fresh.filter((l) => l.kind === 'sprite' && l.w >= 2).slice(0, 2);
      for (const l of notable) gameBus.emit(BUS.townToast, { text: `🏡 New in town: ${l.name}` });
    }
    newRegions.forEach((r) => this.seenRegions.add(r));

    this.drawFog(open, growth);
    this.drawPin();
    this.syncNpcs(growth, open);
    this.firstRender = false;
  }

  private drawFog(open: Set<RegionId>, growth: number): void {
    this.fog.forEach((o) => o.destroy());
    this.fog = [];
    const g = this.add.graphics().setDepth(9000);
    this.fog.push(g);
    for (let s = 0; s < TOWN * 2; s++)
      for (let x = 0; x < TOWN; x++) {
        const y = s - x;
        if (y < 0 || y >= TOWN || open.has(regionOf(x, y))) continue;
        g.fillStyle(0xffffff, 0.55 + hash(x, y) * 0.15);
        diamond(g, x - 0.1, y - 0.1, 1.2, 1.2);
        g.fillPath();
      }
    for (const r of REGIONS) {
      if (open.has(r.id)) continue;
      const c = tileCenter(r.center.x, r.center.y);
      const t = this.add.text(c.x, c.y, `🔒 ${r.name}\nOpens at ${r.unlockAt} growth\n(you have ${growth})`, {
        fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#6b4f4f', align: 'center',
        backgroundColor: 'rgba(255,248,239,0.85)', padding: { x: 14, y: 8 },
      });
      t.setOrigin(0.5).setDepth(9001);
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

  private walkable(x: number, y: number, open: Set<RegionId>): boolean {
    return x >= 0 && y >= 0 && x < TOWN && y < TOWN && open.has(regionOf(x, y)) && !this.occupied.has(`${x},${y}`);
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
      im.setScale((DW.get(key) ?? im.width) / im.width * 1.0);
      const shadow = this.add.ellipse(0, -1, 20, 8, 0x000000, 0.16);
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
        cam.setScroll(this.dragStart.camX - dx / cam.zoom, this.dragStart.camY - dy / cam.zoom);
      }
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    this.pinchDist = 0;
    const was = this.dragging;
    this.dragging = false;
    this.dragStart = undefined;
    if (was) return;
    const t = this.tileAt(p);
    if (!t) return;
    const growth = growthOf(getState());
    if (Math.abs(t.x - HOME_PIN.x) <= 1 && Math.abs(t.y - HOME_PIN.y) <= 1) {
      this.scene.switch('MainScene');
      gameBus.emit(BUS.viewSync, 'island');
      return;
    }
    const region = regionById(regionOf(t.x, t.y));
    if (growth < region.unlockAt) {
      gameBus.emit(BUS.townToast, { text: `🔒 ${region.name} opens at ${region.unlockAt} growth. You are at ${growth}. Quests, memories and daily questions grow the town.` });
      return;
    }
    const lot = LOTS.find((l) => growth >= l.at && t.x >= l.x && t.x < l.x + l.w && t.y >= l.y && t.y < l.y + l.d && this.lotObjs.has(l.id));
    if (lot && lot.name !== 'Tree' && lot.name !== 'Pine') {
      gameBus.emit(BUS.townToast, { text: `${lot.name}${lot.blurb ? ` · ${lot.blurb}` : ''}` });
    }
  }

  private zoomBy(d: number): void {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom + d, MIN_ZOOM, MAX_ZOOM));
  }

  private centerOn(t: { x: number; y: number }, zoom: number): void {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(zoom, MIN_ZOOM, MAX_ZOOM));
    const c = tileCenter(t.x, t.y);
    cam.centerOn(c.x, c.y);
  }
}
