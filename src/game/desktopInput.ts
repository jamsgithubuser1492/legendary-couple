import Phaser from 'phaser';
import { BUS, gameBus } from './events';
import { DPR } from './render';

/**
 * Mouse and keyboard niceties for the world scenes (island, town, café), on top of what each scene already does for
 * touch: a smooth wheel zoom that follows the cursor, middle or right drag to pan, arrow keys to pan, plus minus and 0
 * to zoom and reset, a grab or pointing hand, a small label over things you can click, and double click to look there.
 * Letters used by the page shortcuts (Q D T C G J ? H) are never touched, and nothing fires while a dialog is open,
 * a text box has focus, or a minigame is running.
 */
export interface DesktopOptions {
  minZoom: number;
  maxZoom: number;
  /** Puts the view back to the whole picture (the Center button does the same). */
  reset: () => void;
  /** What the pointer is over that can be clicked, as a short label, or null. */
  label: (p: Phaser.Input.Pointer) => string | null;
}

const PAN_SPEED = 620; // css pixels a second with an arrow key held
const WHEEL_STEP = 0.0013; // zoom per wheel pixel (as a power of e)
const PINCH_STEP = 0.012; // a trackpad pinch arrives as a wheel with ctrl held

export class DesktopInput {
  private cam: Phaser.Cameras.Scene2D.Camera;
  private target: number;
  private anchor: { x: number; y: number } | null = null;
  private pan: { x: number; y: number; sx: number; sy: number } | null = null;
  private down: { x: number; y: number } | null = null;
  private moved = false;
  private lastUp = { t: 0, x: 0, y: 0 };
  private held = new Set<string>();
  private tip: HTMLDivElement;
  private mg = false;
  private offs: (() => void)[] = [];
  private canvas: HTMLCanvasElement;

  constructor(private scene: Phaser.Scene, private o: DesktopOptions) {
    this.cam = scene.cameras.main;
    this.target = this.cam.zoom;
    this.canvas = scene.game.canvas;
    this.canvas.style.cursor = 'grab';
    scene.input.mouse?.disableContextMenu();

    this.tip = document.createElement('div');
    Object.assign(this.tip.style, {
      position: 'fixed', zIndex: '20', pointerEvents: 'none', display: 'none', padding: '4px 10px', borderRadius: '10px',
      background: '#fff8ee', color: '#6b4f4f', border: '1px solid #e8d6c8', boxShadow: '0 2px 8px rgba(107,79,79,0.18)',
      font: '600 13px "Baloo 2", system-ui, sans-serif', whiteSpace: 'nowrap',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(this.tip);

    const inp = scene.input;
    inp.on('wheel', this.onWheel, this);
    inp.on('pointerdown', this.onDown, this);
    inp.on('pointermove', this.onMove, this);
    inp.on('pointerup', this.onUp, this);
    inp.on('gameout', this.hideTip, this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);

    const key = (e: KeyboardEvent) => this.onKey(e);
    const keyUp = (e: KeyboardEvent) => this.held.delete(e.key);
    const blur = () => this.held.clear();
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    const mgState = (s: { active: boolean }) => (this.mg = !!s?.active);
    gameBus.on(BUS.mgState, mgState);
    this.offs.push(() => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
      gameBus.off(BUS.mgState, mgState);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroy());
    scene.events.on(Phaser.Scenes.Events.SLEEP, this.hideTip, this);
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.hideTip, this);
  }

  destroy() {
    this.offs.forEach((f) => f());
    this.offs = [];
    this.tip.remove();
    this.held.clear();
    const inp = this.scene.input;
    inp?.off('wheel', this.onWheel, this);
    inp?.off('pointerdown', this.onDown, this);
    inp?.off('pointermove', this.onMove, this);
    inp?.off('pointerup', this.onUp, this);
    inp?.off('gameout', this.hideTip, this);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.events.off(Phaser.Scenes.Events.SLEEP, this.hideTip, this);
    this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.hideTip, this);
    if (this.canvas) this.canvas.style.cursor = '';
  }

  /** A middle or right button press is a pan, so the scene's own tap and drag code should ignore it. */
  isPanPointer(p: Phaser.Input.Pointer): boolean {
    return !p.wasTouch && (p.button === 1 || p.button === 2);
  }

  /** Called when the scene sets its own zoom (buttons, fit) so the smooth zoom does not pull it back. */
  sync() {
    this.target = this.cam.zoom;
    this.anchor = null;
  }

  // ---------------------------------------------------------------- guards
  /** True when the keyboard belongs to someone else: a text box, a dialog, another scene or a minigame. */
  private busy(): boolean {
    if (this.mg || !this.scene.scene.isActive()) return true;
    const a = document.activeElement as HTMLElement | null;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return true;
    return !!document.querySelector('[role="dialog"], [aria-modal="true"], [data-modal], .absolute.inset-0.z-30, .absolute.inset-0.z-40, .fixed.inset-0.z-30, .fixed.inset-0.z-40, .fixed.inset-0.z-50');
  }

  // ---------------------------------------------------------------- zoom
  private onWheel(p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number, _dz: number, ev?: WheelEvent) {
    const e = ev ?? (p.event as WheelEvent | undefined);
    if (this.mg) return;
    const step = e?.ctrlKey ? PINCH_STEP : WHEEL_STEP;
    const lines = e?.deltaMode === 1 ? 16 : 1; // a mouse that reports lines instead of pixels
    this.target = Phaser.Math.Clamp(this.target * Math.exp(-dy * lines * step), this.o.minZoom, this.o.maxZoom);
    this.anchor = { x: p.x, y: p.y };
  }

  private zoomStep(f: number) {
    this.target = Phaser.Math.Clamp(this.cam.zoom * f, this.o.minZoom, this.o.maxZoom);
    this.anchor = { x: this.cam.width / 2, y: this.cam.height / 2 };
  }

  // ---------------------------------------------------------------- pointer
  private onDown(p: Phaser.Input.Pointer) {
    if (this.isPanPointer(p)) {
      this.pan = { x: p.x, y: p.y, sx: this.cam.scrollX, sy: this.cam.scrollY };
      this.cam.stopFollow();
      this.canvas.style.cursor = 'grabbing';
      this.hideTip();
      return;
    }
    this.down = { x: p.x, y: p.y };
    this.moved = false;
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (this.pan) {
      this.cam.setScroll(this.pan.sx - (p.x - this.pan.x) / this.cam.zoom, this.pan.sy - (p.y - this.pan.y) / this.cam.zoom);
      return;
    }
    if (p.wasTouch) return;
    if (this.down && p.isDown) {
      if (!this.moved && Math.hypot(p.x - this.down.x, p.y - this.down.y) > 8 * DPR) {
        this.moved = true;
        this.canvas.style.cursor = 'grabbing';
        this.hideTip();
      }
      return;
    }
    const text = this.mg || this.busy() ? null : this.o.label(p);
    this.canvas.style.cursor = text ? 'pointer' : 'grab';
    if (!text) return this.hideTip();
    const ev = p.event as MouseEvent | undefined;
    if (!ev) return;
    this.tip.textContent = text;
    this.tip.style.display = 'block';
    const w = this.tip.offsetWidth;
    this.tip.style.left = `${Math.min(window.innerWidth - w - 8, ev.clientX + 14)}px`;
    this.tip.style.top = `${ev.clientY + 18}px`;
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (this.pan && this.isPanPointer(p)) {
      this.pan = null;
      this.canvas.style.cursor = 'grab';
      return;
    }
    this.down = null;
    this.canvas.style.cursor = 'grab';
    if (p.wasTouch || this.moved) return;
    // a double click looks at that spot, smoothly
    const now = performance.now();
    if (now - this.lastUp.t < 320 && Math.hypot(p.x - this.lastUp.x, p.y - this.lastUp.y) < 12 * DPR) {
      const half = { x: this.cam.width / 2, y: this.cam.height / 2 };
      const wx = this.cam.scrollX + half.x + (p.x - half.x) / this.cam.zoom;
      const wy = this.cam.scrollY + half.y + (p.y - half.y) / this.cam.zoom;
      this.cam.pan(wx, wy, 380, 'Sine.easeInOut');
      this.lastUp.t = 0;
      return;
    }
    this.lastUp = { t: now, x: p.x, y: p.y };
  }

  private hideTip() {
    this.tip.style.display = 'none';
  }

  // ---------------------------------------------------------------- keys
  private onKey(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey || this.busy()) return;
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
      this.held.add(k);
      this.cam.stopFollow();
      e.preventDefault();
    } else if (k === '+' || k === '=') this.zoomStep(1.25);
    else if (k === '-' || k === '_') this.zoomStep(0.8);
    else if (k === '0') this.o.reset();
  }

  // ---------------------------------------------------------------- per frame
  private update(_t: number, delta: number) {
    const dt = Math.min(0.05, delta / 1000);
    const cam = this.cam;
    if (this.held.size) {
      const v = (PAN_SPEED * DPR * dt) / cam.zoom;
      const dx = (this.held.has('ArrowRight') ? 1 : 0) - (this.held.has('ArrowLeft') ? 1 : 0);
      const dy = (this.held.has('ArrowDown') ? 1 : 0) - (this.held.has('ArrowUp') ? 1 : 0);
      cam.setScroll(cam.scrollX + dx * v, cam.scrollY + dy * v);
    }
    const z = cam.zoom;
    if (Math.abs(this.target - z) > z * 0.002) {
      const z1 = z + (this.target - z) * Math.min(1, dt * 14);
      const a = this.anchor ?? { x: cam.width / 2, y: cam.height / 2 };
      const half = { x: cam.width / 2, y: cam.height / 2 };
      // keep the world point under the cursor where it is while the zoom changes
      const wx = cam.scrollX + half.x + (a.x - half.x) / z;
      const wy = cam.scrollY + half.y + (a.y - half.y) / z;
      cam.setZoom(z1);
      cam.setScroll(wx - half.x - (a.x - half.x) / z1, wy - half.y - (a.y - half.y) / z1);
    } else if (this.anchor && !this.held.size) {
      this.anchor = null;
    }
    if (Math.abs(this.target - z) <= z * 0.002 && !this.anchor) this.target = cam.zoom; // other code changed the zoom
  }
}
