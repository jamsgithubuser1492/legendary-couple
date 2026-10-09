import Phaser from 'phaser';
import {
  GRID_SIZE, TILE_W, TILE_W_HALF, TILE_H_HALF, TILE_H,
  cartesianToIso, isoToCartesian, tileCenter, inBounds, findPath,
} from '../iso';
import { gameBus, BUS, loadStartingPath, type PathPayload, type EditPayload } from '../events';
import { getState, onStateChange, placeObject, removeObject } from '../../state/store';
import { blockedTiles, canPlace, tilesOf } from '../../state/placement';
import { itemOf } from '../../state/catalog';
import { PLOT } from '../../state/placement';
import { drawPlaced, box, diamond as isoDiamond } from '../draw';


const CENTER_TILE = { x: GRID_SIZE / 2, y: GRID_SIZE / 2 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const DRAG_THRESHOLD = 8;

export class MainScene extends Phaser.Scene {
  private highlight!: Phaser.GameObjects.Graphics;
  private avatar!: Phaser.GameObjects.Container;
  private avatarTile = { x: 1, y: 1 };
  private structure?: Phaser.GameObjects.Graphics;
  private blocked = new Set<string>();
  private moveToken = 0;
  private dragStart?: { x: number; y: number; camX: number; camY: number };
  private dragging = false;
  private pinchDist = 0;
  private placedGfx: Phaser.GameObjects.Graphics[] = [];
  private ghost!: Phaser.GameObjects.Graphics;
  private edit: EditPayload = { active: false, mode: 'place', itemId: null, rotation: 0 };
  private lastHover: { x: number; y: number } | null = null;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#bfe6f2');
    this.drawWater();
    this.drawIsland();

    this.highlight = this.add.graphics().setDepth(1000);
    this.ghost = this.add.graphics().setDepth(1001);
    this.createAvatar();
    this.setStartingPath(loadStartingPath());

    this.centerCamera();
    this.input.addPointer(1); // second pointer for pinch zoom
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.zoomBy(dy > 0 ? -0.1 : 0.1);
    });

    const onPath = (p: PathPayload) => this.setStartingPath(p);
    const onCenter = () => this.centerCamera();
    const onZoom = (d: number) => this.zoomBy(d);
    const onEdit = (e: EditPayload) => {
      this.edit = e;
      this.refreshHover();
    };
    const offState = onStateChange(() => this.renderPlaced());
    this.renderPlaced();
    gameBus.on(BUS.edit, onEdit);
    gameBus.on(BUS.startingPath, onPath);
    gameBus.on(BUS.center, onCenter);
    gameBus.on(BUS.zoom, onZoom);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offState();
      gameBus.off(BUS.edit, onEdit);
      gameBus.off(BUS.startingPath, onPath);
      gameBus.off(BUS.center, onCenter);
      gameBus.off(BUS.zoom, onZoom);
    });
  }

  // ---------- world drawing ----------

  private diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1): void {
    const p = cartesianToIso(x, y);
    const w = TILE_W_HALF * scale;
    const h = TILE_H_HALF * scale;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x + w, p.y + h);
    g.lineTo(p.x, p.y + 2 * h);
    g.lineTo(p.x - w, p.y + h);
    g.closePath();
  }

  private drawWater(): void {
    const g = this.add.graphics().setDepth(-100);
    const c = tileCenter(CENTER_TILE.x - 0.5, CENTER_TILE.y - 0.5);
    for (let i = 3; i >= 0; i--) {
      g.fillStyle(0xaedcec, 0.25 + i * 0.1);
      const r = (GRID_SIZE / 2 + 1.5 + i * 1.2) * TILE_W_HALF * 1.45;
      g.fillEllipse(c.x, c.y, r * 2, r);
    }
  }

  private drawIsland(): void {
    const sand = this.add.graphics().setDepth(-50);
    sand.fillStyle(0xf6e3b8, 1);
    // sand rim: draw each tile slightly enlarged, then thicker underlay for depth
    sand.fillStyle(0xe7cf9c, 1);
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const p = cartesianToIso(x, y);
        sand.fillRect(p.x - TILE_W_HALF, p.y + TILE_H_HALF, TILE_W, 10);
      }
    }
    sand.fillStyle(0xf6e3b8, 1);
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        this.diamond(sand, x, y, 1.12);
        sand.fillPath();
      }
    }

    const g = this.add.graphics().setDepth(-40);
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const shade = (x + y) % 2 === 0 ? 0xbfe8b0 : 0xb4e0a4;
        g.fillStyle(shade, 1);
        this.diamond(g, x, y);
        g.fillPath();
        g.lineStyle(1.5, 0xffffff, 0.55);
        this.diamond(g, x, y);
        g.strokePath();
      }
    }
  }

  // ---------- avatar ----------

  private createAvatar(): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(0, 0, 26, 12); // shadow
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-9, -36, 18, 34, 9); // capsule body
    g.fillStyle(0xf4a6b8, 1);
    g.fillRoundedRect(-9, -36, 18, 34, 9);
    g.fillStyle(0xfff0e0, 1);
    g.fillCircle(0, -34, 9); // head
    g.fillStyle(0x3b2a2a, 1);
    g.fillCircle(-3, -34, 1.4);
    g.fillCircle(3, -34, 1.4);
    this.avatar = this.add.container(0, 0, [g]);
    this.placeAvatar(this.avatarTile.x, this.avatarTile.y);
  }

  private placeAvatar(x: number, y: number): void {
    const c = tileCenter(x, y);
    this.avatar.setPosition(c.x, c.y);
    this.avatar.setDepth(x + y);
  }

  private moveAvatarTo(tx: number, ty: number): void {
    const path = findPath(this.avatarTile, { x: tx, y: ty }, this.blocked);
    if (!path.length) return;
    const token = ++this.moveToken;
    let i = 0;
    const step = () => {
      if (token !== this.moveToken || i >= path.length) return;
      const next = path[i++];
      const from = { x: this.avatarTile.x, y: this.avatarTile.y };
      const start = tileCenter(from.x, from.y);
      const dest = tileCenter(next.x, next.y);
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 220,
        onUpdate: (tw) => {
          if (token !== this.moveToken) return;
          const t = tw.getValue() ?? 0;
          this.avatar.setPosition(
            start.x + (dest.x - start.x) * t,
            start.y + (dest.y - start.y) * t - Math.sin(t * Math.PI) * 4, // little hop
          );
          // continuous depth sort while walking
          this.avatar.setDepth(from.x + (next.x - from.x) * t + from.y + (next.y - from.y) * t);
        },
        onComplete: () => {
          this.avatarTile = next;
          this.placeAvatar(next.x, next.y);
          step();
        },
      });
    };
    step();
  }

  // ---------- starting structure ----------

  private hasStarter = false;

  private setStartingPath(p: PathPayload): void {
    this.structure?.destroy();
    this.structure = undefined;
    this.hasStarter = !!p;
    this.blocked = blockedTiles(getState(), this.hasStarter);
    if (!p) return;
    // if the avatar happens to be standing on the plot, nudge it off
    if (this.avatarTile.x === PLOT.x && this.avatarTile.y === PLOT.y) {
      this.avatarTile = { x: PLOT.x - 1, y: PLOT.y };
      this.placeAvatar(this.avatarTile.x, this.avatarTile.y);
    }
    const g = this.add.graphics();
    g.setDepth(PLOT.x + PLOT.y + 0.5);
    if (p === 'rv') this.drawRV(g);
    if (p === 'shop') this.drawShop(g);
    if (p === 'home') this.drawFoundation(g);
    this.structure = g;
  }

  private drawRV(g: Phaser.GameObjects.Graphics): void {
    const cx = PLOT.x + 0.5, cy = PLOT.y + 0.5;
    box(g, cx, cy, 0.9, 0.9, 30, 0, 0xffd3de);
    box(g, cx, cy, 0.92, 0.92, 5, 14, 0xbfe6f2);
  }

  private drawShop(g: Phaser.GameObjects.Graphics): void {
    const cx = PLOT.x + 0.5, cy = PLOT.y + 0.5;
    box(g, cx, cy, 0.95, 0.95, 44, 0, 0xffe8cf);
    box(g, cx, cy, 1, 1, 7, 28, 0xffb3c6);
  }

  private drawFoundation(g: Phaser.GameObjects.Graphics): void {
    const cx = PLOT.x + 0.5, cy = PLOT.y + 0.5;
    box(g, cx, cy, 1, 1, 6, 0, 0xe6c79c);
    box(g, cx - 0.44, cy, 0.12, 1, 22, 6, 0xf4e6d0);
    box(g, cx, cy - 0.44, 1, 0.12, 22, 6, 0xf4e6d0);
  }

  // ---------- placed objects ----------

  private renderPlaced(): void {
    const s = getState();
    this.placedGfx.forEach((g) => g.destroy());
    this.placedGfx = [];
    const wallAt = (x: number, y: number) =>
      s.placed.some((o) => o.tileX === x && o.tileY === y && itemOf(o.itemId)?.layer === 'wall');
    for (const o of s.placed) {
      const g = this.add.graphics();
      g.setDepth(drawPlaced(g, o, { wallAt }));
      this.placedGfx.push(g);
    }
    this.blocked = blockedTiles(s, this.hasStarter);
    this.refreshHover();
  }

  private ghostObj(t: { x: number; y: number }) {
    return { id: 'ghost', itemId: this.edit.itemId!, tileX: t.x, tileY: t.y, rotation: this.edit.rotation };
  }

  private refreshHover(): void {
    this.setHover(this.lastHover);
  }

  // ---------- input & camera ----------

  private pointerTile(p: Phaser.Input.Pointer): { x: number; y: number } | null {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    const t = isoToCartesian(w.x, w.y);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);
    return inBounds(tx, ty) ? { x: tx, y: ty } : null;
  }

  private setHover(t: { x: number; y: number } | null): void {
    this.lastHover = t;
    this.highlight.clear();
    this.ghost.clear();
    if (t && this.edit.active && this.edit.mode === 'place' && this.edit.itemId) {
      const check = canPlace(getState(), this.edit.itemId, t.x, t.y, this.edit.rotation, [this.avatarTile]);
      const tint = check.ok ? 0x6fd48b : 0xff6b6b;
      for (const c of tilesOf(this.edit.itemId, t.x, t.y, this.edit.rotation)) {
        this.ghost.fillStyle(tint, 0.35);
        isoDiamond(this.ghost, c.x, c.y);
        this.ghost.fillPath();
      }
      const s = getState();
      const wallAt = (x: number, y: number) =>
        itemOf(this.edit.itemId!)?.layer === 'wall' && (s.placed.some((o) => o.tileX === x && o.tileY === y && itemOf(o.itemId)?.layer === 'wall') || (x === t.x && y === t.y));
      drawPlaced(this.ghost, this.ghostObj(t) as never, { wallAt, alpha: check.ok ? 0.65 : 0.35 });
    } else if (t && this.edit.active && this.edit.mode === 'remove') {
      const hit = this.objectAt(t.x, t.y);
      if (hit) {
        for (const c of tilesOf(hit.itemId, hit.tileX, hit.tileY, hit.rotation)) {
          this.ghost.fillStyle(0xff6b6b, 0.4);
          isoDiamond(this.ghost, c.x, c.y);
          this.ghost.fillPath();
        }
      }
    } else if (t) {
      this.highlight.lineStyle(3, 0xff7fa1, 1);
      this.highlight.fillStyle(0xff7fa1, 0.22);
      this.diamond(this.highlight, t.x, t.y);
      this.highlight.fillPath();
      this.diamond(this.highlight, t.x, t.y);
      this.highlight.strokePath();
    }
    gameBus.emit(BUS.hover, t);
  }

  /** Topmost placed object covering a tile (objects and walls win over floors). */
  private objectAt(x: number, y: number) {
    const hits = getState().placed.filter((o) => tilesOf(o.itemId, o.tileX, o.tileY, o.rotation).some((t) => t.x === x && t.y === y));
    return hits.find((o) => itemOf(o.itemId)?.layer !== 'floor') ?? hits[0];
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
    this.dragStart = undefined;
    if (wasDrag) return;
    const t = this.pointerTile(p);
    if (t && this.edit.active) {
      if (this.edit.mode === 'place' && this.edit.itemId) {
        placeObject(this.edit.itemId, t.x, t.y, this.edit.rotation, [this.avatarTile]);
      } else if (this.edit.mode === 'remove') {
        const hit = this.objectAt(t.x, t.y);
        if (hit) removeObject(hit.id);
      }
      return;
    }
    if (t) this.moveAvatarTo(t.x, t.y);
    if (p.wasTouch) this.setHover(null);
  }

  private zoomBy(delta: number): void {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom + delta, MIN_ZOOM, MAX_ZOOM));
  }

  private centerCamera(): void {
    const cam = this.cameras.main;
    const c = tileCenter(CENTER_TILE.x - 0.5, CENTER_TILE.y - 0.5);
    const fit = Math.min(cam.width / (GRID_SIZE * TILE_W_HALF * 2.6), cam.height / (GRID_SIZE * TILE_H * 1.9));
    cam.setZoom(Phaser.Math.Clamp(fit, MIN_ZOOM, 1.4));
    cam.centerOn(c.x, c.y);
  }
}
