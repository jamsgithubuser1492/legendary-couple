import Phaser from 'phaser';
import { GRID_SIZE, TILE_H_HALF, TILE_W_HALF, cartesianToIso, tileCenter } from './iso';
import { diamond } from './draw';
import { PALETTES, type Theme } from '../state/season';

type Kind = 'petal' | 'leaf' | 'snow' | 'spark';
const KIND: Record<Theme, Kind> = { spring: 'petal', summer: 'spark', autumn: 'leaf', winter: 'snow', holidays: 'snow' };
const COUNT = 46;

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  phase: number;
  size: number;
}

function makeTextures(scene: Phaser.Scene) {
  const make = (key: string, size: number, draw: (c: CanvasRenderingContext2D, s: number) => void) => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, size, size);
    if (!tex) return;
    draw(tex.getContext(), size);
    tex.refresh();
  };
  make('amb_petal', 16, (c, s) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(s / 2, s / 2, 6, 3.4, 0.6, 0, Math.PI * 2);
    c.fill();
  });
  make('amb_leaf', 20, (c, s) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(s / 2, 2);
    c.quadraticCurveTo(s - 2, s / 2, s / 2, s - 2);
    c.quadraticCurveTo(2, s / 2, s / 2, 2);
    c.fill();
  });
  make('amb_snow', 12, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });
  make('amb_spark', 20, (c, s) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 2 : 9;
      const a = (Math.PI / 4) * i;
      c.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  });
}

/** Seasonal look: island palette, water, and drifting particles. */
export class Ambient {
  private scene: Phaser.Scene;
  private world: Phaser.GameObjects.Graphics[] = [];
  private particles: Particle[] = [];
  private theme: Theme = 'spring';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    makeTextures(scene);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  apply(theme: Theme) {
    this.theme = theme;
    const pal = PALETTES[theme];
    this.scene.cameras.main.setBackgroundColor(pal.skyCss);
    this.world.forEach((g) => g.destroy());
    this.world = [];
    this.drawWater(pal.waterRing);
    this.drawIsland(pal);
    this.spawn(KIND[theme]);
  }

  private drawWater(color: number) {
    const g = this.scene.add.graphics().setDepth(-100);
    const c = tileCenter(GRID_SIZE / 2 - 0.5, GRID_SIZE / 2 - 0.5);
    for (let i = 3; i >= 0; i--) {
      g.fillStyle(color, 0.25 + i * 0.1);
      const r = (GRID_SIZE / 2 + 1.5 + i * 1.2) * TILE_W_HALF * 1.45;
      g.fillEllipse(c.x, c.y, r * 2, r);
    }
    this.world.push(g);
  }

  private drawIsland(pal: (typeof PALETTES)[Theme]) {
    const sand = this.scene.add.graphics().setDepth(-50);
    sand.fillStyle(pal.sandEdge, 1);
    for (let x = 0; x < GRID_SIZE; x++)
      for (let y = 0; y < GRID_SIZE; y++) {
        const p = cartesianToIso(x, y);
        sand.fillRect(p.x - TILE_W_HALF, p.y + TILE_H_HALF, TILE_W_HALF * 2, 10);
      }
    sand.fillStyle(pal.sand, 1);
    for (let x = 0; x < GRID_SIZE; x++)
      for (let y = 0; y < GRID_SIZE; y++) {
        diamond(sand, x - 0.06, y - 0.06, 1.12, 1.12);
        sand.fillPath();
      }
    const g = this.scene.add.graphics().setDepth(-40);
    for (let x = 0; x < GRID_SIZE; x++)
      for (let y = 0; y < GRID_SIZE; y++) {
        g.fillStyle((x + y) % 2 === 0 ? pal.grassA : pal.grassB, 1);
        diamond(g, x, y);
        g.fillPath();
        g.lineStyle(1.5, 0xffffff, 0.55);
        diamond(g, x, y);
        g.strokePath();
      }
    this.world.push(sand, g);
  }

  private spawn(kind: Kind) {
    this.particles.forEach((p) => p.img.destroy());
    this.particles = [];
    const tints: Record<Kind, number[]> = {
      petal: [0xffc4d6, 0xffd9e4, 0xff9fbd],
      leaf: [0xf08a3c, 0xd9602c, 0xf2b84a, 0xc8472f],
      snow: [0xffffff],
      spark: [0xfff2a8, 0xffffff, 0xffe27a],
    };
    for (let i = 0; i < COUNT; i++) {
      const img = this.scene.add.image(0, 0, `amb_${kind}`).setDepth(5000);
      img.setTint(Phaser.Utils.Array.GetRandom(tints[kind]));
      const size = Phaser.Math.FloatBetween(0.6, 1.1);
      const fall = kind === 'spark' ? 0 : kind === 'snow' ? Phaser.Math.Between(18, 38) : Phaser.Math.Between(22, 46);
      this.particles.push({
        img,
        vx: kind === 'spark' ? 0 : Phaser.Math.Between(-12, 14),
        vy: fall,
        phase: Math.random() * Math.PI * 2,
        size,
      });
      this.place(this.particles[i], true);
    }
  }

  /** Puts a particle somewhere inside the camera's current view, in world coordinates. */
  private place(p: Particle, anywhere: boolean) {
    const v = this.scene.cameras.main.worldView;
    p.img.x = v.x + Math.random() * v.width;
    p.img.y = anywhere ? v.y + Math.random() * v.height : v.y - 12 / this.scene.cameras.main.zoom;
    p.phase = Math.random() * Math.PI * 2;
  }

  private update(time: number, delta: number) {
    const cam = this.scene.cameras.main;
    const v = cam.worldView;
    const dt = delta / 1000;
    const kind = KIND[this.theme];
    for (const p of this.particles) {
      p.img.setScale((p.size * 0.9) / cam.zoom);
      if (kind === 'spark') {
        p.img.setAlpha(0.35 + 0.65 * Math.abs(Math.sin(time / 700 + p.phase)));
        p.img.rotation += dt * 0.6;
        continue;
      }
      p.img.x += (p.vx + Math.sin(time / 900 + p.phase) * 14) * dt / cam.zoom;
      p.img.y += p.vy * dt / cam.zoom;
      if (kind !== 'snow') p.img.rotation += dt * (1 + p.size);
      if (p.img.y > v.bottom + 10 || p.img.x < v.x - 40 || p.img.x > v.right + 40) this.place(p, false);
    }
  }
}
