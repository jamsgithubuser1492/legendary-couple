import Phaser from 'phaser';
import { TILE_W_HALF, TILE_H, cartesianToIso, findPath, inBounds, isoToCartesian, tileCenter } from '../iso';
import { BUS, gameBus, type EditPayload } from '../events';
import { collectTips, getMe, getState, onStateChange, placeObject, removeObject, setCafePos, stockPantry, sitTogether } from '../../state/store';
import { dateKey } from '../../state/questions';
import { cafeBlocked, cafeView, DOOR_X, ENTRY, eventToday, freePatch, shellPieces, SIGNS, STAFF, styleOf, themeOf } from '../../state/cafe';
import { canPlace, tilesOf } from '../../state/placement';
import { itemOf } from '../../state/catalog';
import { diamond as isoDiamond } from '../draw';
import { Avatar } from '../Avatar';
import { artImage, spawnPlaced } from '../placedRender';
import type { PlacedObject, PlayerId } from '../../types';

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const DRAG_THRESHOLD = 8;
const PATRONS = ['student', 'creative', 'enthusiast', 'regular', 'gardener', 'scholar', 'nomad', 'artist', 'girl', 'boy', 'oldman', 'jogger', 'dogwalker', 'musician', 'painter', 'postal', 'surfer', 'tourist'];

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
  private staffObjs = new Map<string, Patron>();
  private staffKey = '';
  private fx!: Phaser.GameObjects.Graphics;
  private gifts: Phaser.GameObjects.Image[] = [];
  private giftKey = '';

  private size = () => getState().cafe.size;

  create() {
    this.highlight = this.add.graphics().setDepth(1000);
    this.fx = this.add.graphics().setDepth(3000);
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
    const stocked = stockPantry();
    if (stocked) gameBus.emit(BUS.townToast, { text: `🍵 Your café stocked the pantry with ${stocked} ingredient${stocked > 1 ? 's' : ''}.` });
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
    this.cameras.main.setBackgroundColor(c.theme === 'cloud' ? 0xeceaf4 : c.theme === 'bistro' ? 0xf4e1d4 : 0xf6ebdd);
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
  private tick(t: number, delta: number) {
    if (!this.scene.isActive()) return;
    this.drawFx(t);
    this.syncStaff();
    this.syncGifts();
    if (this.edit.active) return;
    this.nextPatron -= delta / 1000;
    const st = styleOf(getState());
    const open = st.seats > 0 && st.tables > 0;
    const max = open ? 1 + st.stars : 0;
    if (this.nextPatron <= 0 && this.patrons.length < max) {
      this.nextPatron = 5 + Math.random() * 6;
      this.addPatron();
    }
  }

  // ---------------------------------------------------------------- staff and event effects
  private syncStaff() {
    const hired = getState().cafe.staff;
    const key = hired.join(',');
    if (key === this.staffKey) return;
    this.staffKey = key;
    for (const [id, p] of this.staffObjs) if (!hired.includes(id)) { this.dropPatron(p); this.staffObjs.delete(id); }
    for (const id of hired) {
      if (this.staffObjs.has(id)) continue;
      const def = STAFF.find((x) => x.id === id);
      if (!def || !this.textures.exists(`${def.sprite}_fl`)) continue;
      const spot = this.patronSpots()[0] ?? { x: 2, y: 2 };
      const c = tileCenter(spot.x, spot.y);
      const img = artImage(this, `${def.sprite}_fl`, c.x, c.y + 6, 0.5, 1).setDepth(spot.x + spot.y + 0.25);
      const p: Patron = { img, tile: spot, busy: false };
      this.staffObjs.set(id, p);
      this.time.addEvent({ delay: 4500 + Math.random() * 3500, loop: true, callback: () => this.wanderStaff(def.sprite, p) });
    }
  }

  /** Surprise props appear on a table: a gift box for the one it is meant for, a vase with a note for the one who sent it. */
  private syncGifts() {
    const st = getState();
    const me = getMe();
    const pend = st.surprises.filter((x) => !x.doneAt);
    const table = st.cafe.placed.find((o) => itemOf(o.itemId)?.role === 'table');
    const key = `${table?.id ?? ''}|${pend.map((x) => x.id + (x.to === me)).join(',')}|${this.sig}`;
    if (key === this.giftKey) return;
    this.giftKey = key;
    this.gifts.forEach((g) => g.destroy());
    this.gifts = [];
    if (!table || !pend.length) return;
    const c = tileCenter(table.tileX, table.tileY);
    const mine = pend.some((x) => x.to === me);
    const sent = pend.some((x) => x.from === me);
    const depth = table.tileX + table.tileY + 1.2;
    if (mine) this.gifts.push(artImage(this, 'cz_gift', c.x, c.y - 4, 0.5, 1).setDepth(depth));
    if (sent) this.gifts.push(artImage(this, 'cz_vase', c.x + (mine ? 18 : 0), c.y - 4, 0.5, 1).setDepth(depth + 0.1));
    for (const g of this.gifts) this.tweens.add({ targets: g, y: g.y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private wanderStaff(base: string, p: Patron) {
    if (!p.img.scene || p.busy) return;
    const spots = this.patronSpots();
    if (!spots.length) return;
    const to = spots[Math.floor(Math.random() * spots.length)];
    const path = findPath(p.tile, to, this.pathBlocked(), this.size());
    if (!path.length) return;
    p.busy = true;
    let i = 0;
    const step = () => {
      if (!p.img.scene) return;
      if (i >= path.length) { p.busy = false; return; }
      const t = path[i++];
      const dx = t.x - p.tile.x, dy = t.y - p.tile.y;
      const dir = dx > 0 ? 'fr' : dy > 0 ? 'fl' : dx < 0 ? 'bl' : 'br';
      if (this.textures.exists(`${base}_${dir}`)) p.img.setTexture(`${base}_${dir}`);
      const b = tileCenter(t.x, t.y);
      p.img.setDepth(t.x + t.y + 0.25);
      this.tweens.add({ targets: p.img, x: b.x, y: b.y + 6, duration: 420, onComplete: () => { p.tile = t; step(); } });
    };
    step();
  }

  /** Rain for Jazz Night, the playpen for Adopt-a-Pet and a soft glow around each Wi-Fi router. */
  private drawFx(t: number) {
    const g = this.fx;
    g.clear();
    const s = getState();
    const live = s.cafe.event && s.cafe.event.day === dateKey() ? s.cafe.event.id : eventToday() && s.cafe.event?.day === dateKey() ? eventToday()!.id : null;
    for (const o of s.cafe.placed) {
      if (itemOf(o.itemId)?.effect !== 'wifi') continue;
      const c = tileCenter(o.tileX, o.tileY);
      for (let i = 0; i < 3; i++) {
        const k = ((t / 1400 + i / 3) % 1);
        g.lineStyle(2, 0x7fe0c0, 0.55 * (1 - k));
        g.strokeEllipse(c.x, c.y - 4, 30 + k * 90, 15 + k * 45);
      }
    }
    if (live === 'adopt') {
      const p = freePatch(s);
      if (p) {
        g.lineStyle(3, 0xff9db6, 0.9);
        g.fillStyle(0xffd6e0, 0.25);
        const a = cartesianToIso(p.x, p.y), b = cartesianToIso(p.x + 4, p.y), c = cartesianToIso(p.x + 4, p.y + 4), d = cartesianToIso(p.x, p.y + 4);
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fillPath(); g.strokePath();
      }
    }
    if (live === 'jazz') {
      const cam = this.cameras.main.worldView;
      g.fillStyle(0x2a2f5a, 0.28);
      g.fillRect(cam.x - 50, cam.y - 50, cam.width + 100, cam.height + 100);
      g.lineStyle(2, 0xcfe4ff, 0.7);
      for (let i = 0; i < 46; i++) {
        const x = cam.x + ((i * 97 + t * 0.06) % cam.width);
        const y = cam.y + ((i * 53 + t * 0.5) % cam.height);
        g.lineBetween(x, y, x - 3, y + 12);
      }
    }
  }

  private dropPatron(p: Patron) {
    this.tweens.killTweensOf(p.img);
    p.bubble?.destroy();
    p.img.destroy();
  }

  private addPatron() {
    const s0 = getState();
    const sign = SIGNS.find((g) => g.id === s0.cafe.sign);
    const study = s0.cafe.event?.day === dateKey() && s0.cafe.event.id === 'study';
    const pool = study ? ['student', 'student', 'nomad', 'scholar'] : sign && styleOf(s0).sign && Math.random() < 0.7 ? sign.draws : PATRONS;
    const kind = pool[Math.floor(Math.random() * pool.length)];
    const key = this.textures.exists(`cx_p_${kind}`) ? `cx_p_${kind}` : `cz_t_${kind}`;
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
    if (it?.effect === 'espresso') return gameBus.emit(BUS.openFocus, 'latte');
    if (it?.effect === 'luckycat') return gameBus.emit(BUS.openFocus, 'gacha');
    if (it?.effect === 'sign') return gameBus.emit(BUS.openFocus, 'chalk');
    if (it?.effect === 'board') return gameBus.emit(BUS.openFocus, 'events');
    if (it?.effect === 'register') { const n = collectTips(); return this.say(n ? `🧾 You collected ${n} coins in tips.` : '🧾 No tips to collect yet. The café earns them while it is open.'); }
    if (it?.effect === 'wifi') return this.say('📶 Wi-Fi router: students love it. It powers Study Slam.');
    if (it?.effect === 'pet') return this.say('🐾 A cozy pet corner makes guests happy and adds to your tips.');
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
