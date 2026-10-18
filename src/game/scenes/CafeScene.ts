import Phaser from 'phaser';
import { TILE_W_HALF, TILE_H, cartesianToIso, findPath, inBounds, isoToCartesian, tileCenter } from '../iso';
import { BUS, gameBus, type EditPayload } from '../events';
import { getMe, getState, onStateChange, placeObject, removeObject, setCafePos, stockPantry, sitTogether } from '../../state/store';
import { cafeBlocked, cafeView, DOOR_X, ENTRY, shellPieces, styleOf, themeOf } from '../../state/cafe';
import { canPlace, tilesOf } from '../../state/placement';
import { itemOf } from '../../state/catalog';
import { diamond as isoDiamond } from '../draw';
import { Avatar } from '../Avatar';
import { artImage, spawnPlaced } from '../placedRender';
import type { PlacedObject, PlayerId } from '../../types';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const DRAG_THRESHOLD = 8;
const PATRONS = ['student', 'creative', 'enthusiast', 'regular', 'gardener', 'scholar', 'nomad', 'artist'];

interface Patron {
  img: Phaser.GameObjects.Image;
  bubble?: Phaser.GameObjects.Image;
  tile: { x: number; y: number };
  busy: boolean;
}

/**
 * The café interior: a walled room of its own, apart from the island outside. You decorate it, walk around it, and
 * little customers drop in, so a prettier room feels alive. Its rules (style, rating, bonuses) live in state/cafe.ts.
 */
export class CafeScene extends Phaser.Scene {
  constructor() {
    super('CafeScene');
  }

  private avatars!: Record<PlayerId, Avatar>;
  private floorObjs: Phaser.GameObjects.GameObject[] = [];
  private itemObjs: Phaser.GameObjects.GameObject[] = [];
  private ghostObjs: Phaser.GameObjects.GameObject[] = [];
  private highlight!: Phaser.GameObjects.Graphics;
  private backdrop!: Phaser.GameObjects.Rectangle;
  private edit: EditPayload = { active: false, mode: 'place', itemId: null, rotation: 0 };
  private lastHover: { x: number; y: number } | null = null;
  private blocked = new Set<string>();
  private sig = '';
  private lastSize = 0;
  private dragStart?: { x: number; y: number; camX: number; camY: number };
  private dragging = false;
  private pinchDist = 0;
  private patrons: Patron[] = [];
  private nextPatron = 0;

  private size = () => getState().cafe.size;

  create() {
    this.backdrop = this.add.rectangle(0, 0, 9000, 9000, 0xf6ebdd).setDepth(-100).setScrollFactor(0).setOrigin(0, 0);
    this.highlight = this.add.graphics().setDepth(1000);
    const st = getState();
    this.avatars = {
      A: new Avatar(this, 'A', st.cafe.avatars.A, 1, st.looks.A),
      B: new Avatar(this, 'B', st.cafe.avatars.B, 1, st.looks.B),
    };
    this.render(true);
    this.fitCamera();

    this.input.addPointer(1);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy > 0 ? -0.1 : 0.1));

    const onEdit = (e: EditPayload) => {
      this.edit = e;
      this.refreshHover();
    };
    const onCenter = () => this.scene.isActive() && this.fitCamera();
    const onZoom = (d: number) => this.scene.isActive() && this.zoomBy(d);
    const onView = (v: string) => {
      if (!this.scene.isActive()) return;
      if (v === 'island') this.leave('MainScene', 'island');
      else if (v === 'town') this.leave('TownScene', 'town');
    };
    const off = onStateChange(() => {
      if (!this.scene.isActive()) return;
      this.render(false);
      this.syncPartner();
    });
    gameBus.on(BUS.edit, onEdit);
    gameBus.on(BUS.center, onCenter);
    gameBus.on(BUS.zoom, onZoom);
    gameBus.on(BUS.view, onView);
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.enter());
    this.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      off();
      gameBus.off(BUS.edit, onEdit);
      gameBus.off(BUS.center, onCenter);
      gameBus.off(BUS.zoom, onZoom);
      gameBus.off(BUS.view, onView);
      this.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this);
    });
    this.enter();
  }

  /** Walking in through the door. */
  private enter() {
    this.render(true);
    this.fitCamera();
    for (const p of this.patrons) this.dropPatron(p);
    this.patrons = [];
    this.nextPatron = 0;
    if (stockPantry()) gameBus.emit(BUS.townToast, { text: '🍵 The matcha whisk station stocked your pantry with 1 ingredient.' });
    const me = getMe();
    const door = getState().cafe.avatars[me];
    if (door.y < 1 || door.x < 1) this.avatars[me].snap(ENTRY.x, ENTRY.y + 1);
  }

  private leave(scene: string, view: string) {
    this.setHover(null);
    this.scene.switch(scene);
    gameBus.emit(BUS.viewSync, view);
  }

  // ---------------------------------------------------------------- drawing
  /** Draws the floor, the walls and everything inside. Does nothing when nothing changed. */
  private render(force: boolean) {
    const s = getState();
    const c = s.cafe;
    const sig = `${c.theme}|${c.size}|${s.cafe.sitDay}|${c.placed.map((o) => `${o.id}${o.tileX},${o.tileY},${o.rotation}`).join(';')}`;
    if (!force && sig === this.sig) return;
    this.sig = sig;
    if (c.size !== this.lastSize) {
      if (this.lastSize) this.time.delayedCall(0, () => this.fitCamera()); // a bigger room: show all of it
      this.lastSize = c.size;
    }
    const view = cafeView(s);
    this.floorObjs.forEach((o) => o.destroy());
    this.itemObjs.forEach((o) => o.destroy());
    this.floorObjs = [];
    this.itemObjs = [];
    const th = themeOf(c.theme);
    // the room's own floor, one diamond per tile inside the walls
    const key = this.textures.exists(th.floor) ? th.floor : '';
    for (let x = 1; x < c.size; x++) {
      for (let y = 1; y < c.size; y++) {
        const p = tileCenter(x, y);
        if (key) this.floorObjs.push(artImage(this, key, p.x, p.y, 0.5, 0.5).setDepth(-40));
        else this.floorObjs.push(this.add.graphics().setDepth(-40));
      }
    }
    this.floorObjs.push(this.floorSlab(c.size));
    const wallAt = (x: number, y: number) => view.placed.some((o) => o.tileX === x && o.tileY === y && itemOf(o.itemId)?.layer === 'wall');
    const skin = (o: PlacedObject) => (itemOf(o.itemId)?.effect === 'bench' && s.cafe.sitDay === this.today() ? 'cx_bench_couple' : undefined);
    for (const o of shellPieces(c.theme, c.size)) this.itemObjs.push(...spawnPlaced(this, o, wallAt, { decor: view }));
    for (const o of c.placed) this.itemObjs.push(...spawnPlaced(this, o, wallAt, { decor: view, skin }));
    this.blocked = cafeBlocked(s);
    this.backdrop.setFillStyle(c.theme === 'cloud' ? 0xeceaf4 : c.theme === 'bistro' ? 0xf4e1d4 : 0xf6ebdd);
    this.refreshHover();
  }

  private today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** A thin slab along the front edges of the floor so the room has weight. */
  private floorSlab(size: number) {
    const g = this.add.graphics().setDepth(-41);
    const poly = (a: { x: number; y: number }, b: { x: number; y: number }, color: number) => {
      g.fillStyle(color, 1);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.lineTo(b.x, b.y + 8);
      g.lineTo(a.x, a.y + 8);
      g.closePath();
      g.fillPath();
    };
    poly(cartesianToIso(1, size), cartesianToIso(size, size), 0xb98a5a);
    poly(cartesianToIso(size, size), cartesianToIso(size, 1), 0x9c7248);
    return g;
  }

  private syncPartner() {
    const me = getMe();
    const p = this.other(me);
    const av = this.avatars[p];
    const t = getState().cafe.avatars[p];
    if (av.moving || (av.tile.x === t.x && av.tile.y === t.y)) return;
    const path = findPath(av.tile, t, this.pathBlocked(), this.size());
    if (path.length) av.walk(path);
    else av.snap(t.x, t.y);
  }
  private other = (p: PlayerId): PlayerId => (p === 'A' ? 'B' : 'A');

  private pathBlocked() {
    const set = new Set(this.blocked);
    for (let x = 0; x < this.size(); x++) { set.add(`${x},0`); }
    for (let y = 0; y < this.size(); y++) { set.add(`0,${y}`); }
    return set;
  }

  // ---------------------------------------------------------------- the little customers
  private tick(_t: number, delta: number) {
    if (!this.scene.isActive() || this.edit.active) return;
    this.nextPatron -= delta / 1000;
    const st = styleOf(getState());
    const open = st.seats > 0 && st.tables > 0;
    const max = open ? 1 + st.stars : 0;
    if (this.nextPatron <= 0 && this.patrons.length < max) {
      this.nextPatron = 5 + Math.random() * 6;
      this.addPatron();
    }
  }

  private dropPatron(p: Patron) {
    this.tweens.killTweensOf(p.img);
    p.bubble?.destroy();
    p.img.destroy();
  }

  private addPatron() {
    const kind = PATRONS[Math.floor(Math.random() * PATRONS.length)];
    const key = `cx_p_${kind}`;
    if (!this.textures.exists(key)) return;
    const home = tileCenter(DOOR_X, 1);
    const img = artImage(this, key, home.x, home.y + 6, 0.5, 1).setDepth(DOOR_X + 1 + 0.2).setAlpha(0);
    const p: Patron = { img, tile: { x: DOOR_X, y: 1 }, busy: true };
    this.patrons.push(p);
    this.tweens.add({ targets: img, alpha: 1, duration: 300 });
    // choose somewhere to stand: beside a table, a counter or a pastry case
    const spots = this.patronSpots();
    if (!spots.length) {
      this.bubble(p, 'cx_f_sad');
      this.time.delayedCall(1500, () => this.leaveDoor(p));
      return;
    }
    const spot = spots[Math.floor(Math.random() * spots.length)];
    const path = findPath(p.tile, spot, this.pathBlocked(), this.size());
    if (!path.length) {
      this.bubble(p, 'cx_f_confused');
      this.time.delayedCall(1500, () => this.leaveDoor(p));
      return;
    }
    this.walkPatron(p, path, () => {
      this.bubble(p, 'cx_b_menu');
      this.time.delayedCall(2600, () => {
        this.bubble(p, Math.random() < 0.7 ? 'cx_b_heart' : 'cx_b_coin');
        this.time.delayedCall(2200, () => this.leaveDoor(p));
      });
    });
  }

  /** Free floor tiles next to a table, a pastry case or a station. */
  private patronSpots(): { x: number; y: number }[] {
    const s = getState();
    const taken = new Set<string>([...this.blocked, `${this.avatars.A.tile.x},${this.avatars.A.tile.y}`, `${this.avatars.B.tile.x},${this.avatars.B.tile.y}`]);
    for (const p of this.patrons) taken.add(`${p.tile.x},${p.tile.y}`);
    const out: { x: number; y: number }[] = [];
    for (const o of s.cafe.placed) {
      const it = itemOf(o.itemId);
      if (!it || !(it.role === 'table' || it.effect === 'pastry' || it.effect === 'espresso' || it.effect === 'whisk' || it.effect === 'bench')) continue;
      for (const t of tilesOf(o.itemId, o.tileX, o.tileY, o.rotation)) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = { x: t.x + dx, y: t.y + dy };
          if (n.x >= 1 && n.y >= 1 && n.x < this.size() && n.y < this.size() && !taken.has(`${n.x},${n.y}`) && !out.some((q) => q.x === n.x && q.y === n.y)) out.push(n);
        }
      }
    }
    return out;
  }

  private walkPatron(p: Patron, path: { x: number; y: number }[], done: () => void) {
    let i = 0;
    const step = () => {
      if (!p.img.scene) return;
      if (i >= path.length) return done();
      const t = path[i++];
      const a = tileCenter(p.tile.x, p.tile.y), b = tileCenter(t.x, t.y);
      p.img.setFlipX(b.x < a.x || (b.x === a.x && b.y > a.y));
      p.img.setDepth(t.x + t.y + 0.2);
      this.tweens.add({ targets: p.img, x: b.x, y: b.y + 6, duration: 380, ease: 'Linear', onComplete: () => { p.tile = t; step(); } });
      this.tweens.add({ targets: p.img, scaleY: p.img.scaleY * 0.96, duration: 95, yoyo: true, repeat: 1 });
    };
    step();
  }

  private bubble(p: Patron, key: string) {
    p.bubble?.destroy();
    if (!this.textures.exists(key)) return;
    p.bubble = artImage(this, key, p.img.x, p.img.y - p.img.displayHeight - 4, 0.5, 1).setDepth(900);
  }

  private leaveDoor(p: Patron) {
    if (!p.img.scene) return;
    p.bubble?.destroy();
    p.bubble = undefined;
    const path = findPath(p.tile, ENTRY, this.pathBlocked(), this.size());
    const go = (rest: { x: number; y: number }[]) =>
      this.walkPatron(p, rest, () => {
        this.tweens.add({ targets: p.img, alpha: 0, duration: 300, onComplete: () => { this.patrons = this.patrons.filter((q) => q !== p); this.dropPatron(p); } });
      });
    go(path.length || (p.tile.x === ENTRY.x && p.tile.y === ENTRY.y) ? path : []);
  }

  // ---------------------------------------------------------------- input
  private pointerTile(p: Phaser.Input.Pointer): { x: number; y: number } | null {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const t = isoToCartesian(w.x, w.y);
    const x = Math.floor(t.x), y = Math.floor(t.y);
    return inBounds(x, y, this.size()) ? { x, y } : null;
  }

  private onDown(p: Phaser.Input.Pointer) {
    const cam = this.cameras.main;
    this.dragStart = { x: p.x, y: p.y, camX: cam.scrollX, camY: cam.scrollY };
    this.dragging = false;
    this.setHover(this.pointerTile(p));
  }

  private onMove(p: Phaser.Input.Pointer) {
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
    } else this.setHover(this.pointerTile(p));
  }

  private onUp(p: Phaser.Input.Pointer) {
    this.pinchDist = 0;
    const wasDrag = this.dragging;
    this.dragging = false;
    this.dragStart = undefined;
    if (wasDrag) return;
    const t = this.pointerTile(p) ?? this.doorTap(p);
    if (!t) return;
    if (this.edit.active) return this.editAt(t);
    if (t.y === 0 && t.x === DOOR_X) return this.leave('MainScene', 'island'); // out the front door
    const hit = getState().cafe.placed.find((o) => tilesOf(o.itemId, o.tileX, o.tileY, o.rotation).some((q) => q.x === t.x && q.y === t.y));
    const it = hit && itemOf(hit.itemId);
    if (it?.effect === 'bench') {
      this.say(sitTogether() ? '💞 You sit together. +15 coins, +1 shell' : 'You already sat here today. Come back tomorrow.');
      return;
    }
    if (it?.effect === 'pastry') return this.say('🍰 Pastry case: +10% coins in Matcha Masters (two count).');
    if (it?.effect === 'espresso') return this.say('☕ Espresso station: taught the café a new recipe.');
    if (it?.effect === 'whisk') return this.say('🍵 Whisk station: stocks the pantry once a day.');
    this.walkTo(t);
  }

  /** The door sits in the wall row, so a tap on it is not on a floor tile. */
  private doorTap(p: Phaser.Input.Pointer): { x: number; y: number } | null {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const t = isoToCartesian(w.x, w.y);
    const x = Math.floor(t.x), y = Math.floor(t.y);
    return y === 0 && x === DOOR_X ? { x, y } : null;
  }

  private say(text: string) {
    gameBus.emit(BUS.townToast, { text });
  }

  private walkTo(t: { x: number; y: number }) {
    if (t.x < 1 || t.y < 1) return;
    const me = getMe();
    const av = this.avatars[me];
    const path = findPath(av.tile, t, this.pathBlocked(), this.size());
    if (!path.length) return;
    av.walk(path, () => setCafePos(me, av.tile.x, av.tile.y));
  }

  private objectAt(x: number, y: number) {
    const hits = getState().cafe.placed.filter((o) => tilesOf(o.itemId, o.tileX, o.tileY, o.rotation).some((t) => t.x === x && t.y === y));
    return hits.find((o) => itemOf(o.itemId)?.layer === 'walldecor') ?? hits.find((o) => itemOf(o.itemId)?.layer !== 'floor') ?? hits[0];
  }

  private editAt(t: { x: number; y: number }) {
    if (this.edit.mode === 'place' && this.edit.itemId) {
      placeObject(this.edit.itemId, t.x, t.y, this.edit.rotation, [this.avatars.A.tile, this.avatars.B.tile, ...this.patrons.map((p) => p.tile)], 'cafe');
    } else if (this.edit.mode === 'remove') {
      const hit = this.objectAt(t.x, t.y);
      if (hit) removeObject(hit.id, 'cafe');
    }
  }

  private setHover(t: { x: number; y: number } | null) {
    this.lastHover = t;
    this.highlight.clear();
    this.ghostObjs.forEach((g) => g.destroy());
    this.ghostObjs = [];
    if (!t || !this.edit.active || this.edit.mode !== 'place' || !this.edit.itemId) return;
    const s = getState();
    const view = cafeView(s);
    const avatarTiles = [this.avatars.A.tile, this.avatars.B.tile];
    const check = canPlace(view, this.edit.itemId, t.x, t.y, this.edit.rotation, avatarTiles, false, true);
    for (const c of tilesOf(this.edit.itemId, t.x, t.y, this.edit.rotation)) {
      this.highlight.fillStyle(check.ok ? 0x6fd48b : 0xff6b6b, 0.35);
      isoDiamond(this.highlight, c.x, c.y);
      this.highlight.fillPath();
    }
    const ghost: PlacedObject = { id: 'ghost', itemId: this.edit.itemId, tileX: t.x, tileY: t.y, rotation: this.edit.rotation };
    const wallAt = (x: number, y: number) => view.placed.some((o) => o.tileX === x && o.tileY === y && itemOf(o.itemId)?.layer === 'wall');
    this.ghostObjs = spawnPlaced(this, ghost, wallAt, { decor: { ...view, placed: [...view.placed, ghost] }, alpha: check.ok ? 0.7 : 0.4, tint: check.ok ? undefined : 0xff9a9a });
    this.ghostObjs.forEach((g) => (g as Phaser.GameObjects.Image).setDepth?.(1001));
  }

  private refreshHover() {
    this.setHover(this.lastHover);
  }

  // ---------------------------------------------------------------- camera
  private zoomBy(d: number) {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom + d, MIN_ZOOM, MAX_ZOOM));
  }

  private fitCamera() {
    const cam = this.cameras.main;
    const n = this.size();
    const c = tileCenter(n / 2, n / 2);
    const fit = Math.min(cam.width / (n * TILE_W_HALF * 2.4), cam.height / (n * TILE_H * 1.7 + 120));
    cam.setZoom(Phaser.Math.Clamp(fit, MIN_ZOOM, 1.5));
    cam.centerOn(c.x, c.y - 20);
  }
}
