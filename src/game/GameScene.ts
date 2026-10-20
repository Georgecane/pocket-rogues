import Phaser from 'phaser';
import { allBallsStopped, stepPhysics, type Ball } from './physics';

type Point = { x: number; y: number };

const W = 960;
const H = 600;
const TABLE = { left: 180, right: 780, top: 120, bottom: 480 };
const ISO_X = 0.78;
const ISO_Y = 0.40;
const CENTER = { x: W / 2, y: H / 2 + 4 };

export class GameScene extends Phaser.Scene {
  private balls: Ball[] = [];
  private graphics!: Phaser.GameObjects.Graphics;
  private aimPoint: Point = { x: 600, y: 300 };
  private charging = false;
  private charge = 0;
  private lastShotPower = 0;
  private shotCount = 0;
  private message = 'AIM WITH YOUR MOUSE';
  private messageUntil = 0;

  constructor() { super('GameScene'); }

  create(): void {
    this.graphics = this.add.graphics();
    this.createRack();
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const p = this.screenToTable(pointer.x, pointer.y);
      this.aimPoint = p;
    });
    this.input.on('pointerdown', () => {
      if (!allBallsStopped(this.balls)) return;
      this.charging = true;
      this.charge = 0;
    });
    this.input.on('pointerup', () => {
      if (!this.charging) return;
      this.charging = false;
      this.shoot();
    });
    this.input.keyboard?.on('keydown-R', () => this.resetTable());
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (allBallsStopped(this.balls)) this.shoot();
    });
    this.paintStaticScene();
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    if (this.charging) this.charge = Math.min(1, this.charge + dt * 0.65);
    stepPhysics(this.balls, TABLE, dt);
    this.drawDynamicScene();
  }

  private createRack(): void {
    this.balls = [{ x: 330, y: 300, vx: 0, vy: 0, radius: 12, color: 0xf3f0d8, number: 0, sunk: false }];
    const colors = [0xe8c547, 0x3b82c4, 0xc9484a, 0x8c59b9, 0xe78b3c, 0x2a9d78, 0xd86e9b, 0x242a35];
    let number = 1;
    const startX = 570;
    const startY = 300;
    const spacing = 25;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col <= row; col += 1) {
        const y = startY + (col - row / 2) * spacing;
        this.balls.push({ x: startX + row * spacing * 0.88, y, vx: 0, vy: 0, radius: 12, color: colors[(number - 1) % colors.length], number, sunk: false });
        number += 1;
      }
    }
  }

  private resetTable(): void {
    this.createRack();
    this.shotCount = 0;
    this.lastShotPower = 0;
    this.charge = 0;
    this.message = 'TABLE RESET';
    this.messageUntil = this.time.now + 1200;
  }

  private shoot(): void {
    const cue = this.balls[0];
    if (!cue || !allBallsStopped(this.balls)) return;
    let dx = this.aimPoint.x - cue.x;
    let dy = this.aimPoint.y - cue.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;
    dx /= length;
    dy /= length;
    const power = 180 + this.charge * 470;
    cue.vx = dx * power;
    cue.vy = dy * power;
    this.lastShotPower = this.charge;
    this.charge = 0;
    this.shotCount += 1;
    this.message = `SHOT ${String(this.shotCount).padStart(2, '0')}`;
    this.messageUntil = this.time.now + 1100;
  }

  private project(x: number, y: number): Point {
    const dx = x - (TABLE.left + TABLE.right) / 2;
    const dy = y - (TABLE.top + TABLE.bottom) / 2;
    return { x: CENTER.x + (dx - dy) * ISO_X, y: CENTER.y + (dx + dy) * ISO_Y };
  }

  private screenToTable(sx: number, sy: number): Point {
    const u = (sx - CENTER.x) / ISO_X;
    const v = (sy - CENTER.y) / ISO_Y;
    const dx = (u + v) / 2;
    const dy = (v - u) / 2;
    return {
      x: Phaser.Math.Clamp((TABLE.left + TABLE.right) / 2 + dx, TABLE.left, TABLE.right),
      y: Phaser.Math.Clamp((TABLE.top + TABLE.bottom) / 2 + dy, TABLE.top, TABLE.bottom),
    };
  }

  private paintStaticScene(): void {
    const g = this.graphics;
    g.clear();
    g.lineStyle(1, 0x1a2830, 0.42);
    for (let x = 0; x < W; x += 24) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 24) g.lineBetween(0, y, W, y);
    const corners = [this.project(TABLE.left, TABLE.top), this.project(TABLE.right, TABLE.top), this.project(TABLE.right, TABLE.bottom), this.project(TABLE.left, TABLE.bottom)];
    const shadow = corners.map((p) => ({ x: p.x + 9, y: p.y + 22 }));
    g.fillStyle(0x05090c, 0.6); g.fillPoints(shadow, true);
    g.fillStyle(0x4a2b22, 1); g.fillPoints(corners, true);
    g.lineStyle(8, 0x98613c, 1); g.strokePoints(corners, true);
    const inset = [this.project(TABLE.left + 18, TABLE.top + 18), this.project(TABLE.right - 18, TABLE.top + 18), this.project(TABLE.right - 18, TABLE.bottom - 18), this.project(TABLE.left + 18, TABLE.bottom - 18)];
    g.fillStyle(0x176b58, 1); g.fillPoints(inset, true);
    g.lineStyle(3, 0x2f9a78, 1); g.strokePoints(inset, true);
    for (const [x, y] of [[TABLE.left + 18, TABLE.top + 18], [TABLE.right - 18, TABLE.top + 18], [TABLE.left + 18, TABLE.bottom - 18], [TABLE.right - 18, TABLE.bottom - 18]] as const) {
      const p = this.project(x, y); g.fillStyle(0x10151b, 1); g.fillCircle(p.x, p.y, 10);
    }
    for (const [x, y] of [[(TABLE.left + TABLE.right) / 2, TABLE.top + 18], [(TABLE.left + TABLE.right) / 2, TABLE.bottom - 18]] as const) {
      const p = this.project(x, y); g.fillStyle(0x10151b, 1); g.fillCircle(p.x, p.y, 9);
    }
    this.add.text(28, 28, 'POCKET ROGUES', { fontFamily: 'monospace', fontSize: '14px', color: '#9de5c6', letterSpacing: 2 }).setDepth(100);
    this.add.text(28, 49, 'ISOMETRIC BILLIARDS / PROTOTYPE', { fontFamily: 'monospace', fontSize: '9px', color: '#6b8790', letterSpacing: 1 }).setDepth(100);
  }

  private drawDynamicScene(): void {
    this.graphics.clear();
    const g = this.graphics;
    g.lineStyle(1, 0x1a2830, 0.42);
    for (let x = 0; x < W; x += 24) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 24) g.lineBetween(0, y, W, y);
    const corners = [this.project(TABLE.left, TABLE.top), this.project(TABLE.right, TABLE.top), this.project(TABLE.right, TABLE.bottom), this.project(TABLE.left, TABLE.bottom)];
    const shadow = corners.map((p) => ({ x: p.x + 9, y: p.y + 22 }));
    g.fillStyle(0x05090c, 0.6); g.fillPoints(shadow, true);
    g.fillStyle(0x4a2b22, 1); g.fillPoints(corners, true); g.lineStyle(8, 0x98613c, 1); g.strokePoints(corners, true);
    const inset = [this.project(TABLE.left + 18, TABLE.top + 18), this.project(TABLE.right - 18, TABLE.top + 18), this.project(TABLE.right - 18, TABLE.bottom - 18), this.project(TABLE.left + 18, TABLE.bottom - 18)];
    g.fillStyle(0x176b58, 1); g.fillPoints(inset, true); g.lineStyle(3, 0x2f9a78, 1); g.strokePoints(inset, true);
    for (const [x, y] of [[TABLE.left + 18, TABLE.top + 18], [TABLE.right - 18, TABLE.top + 18], [TABLE.left + 18, TABLE.bottom - 18], [TABLE.right - 18, TABLE.bottom - 18], [(TABLE.left + TABLE.right) / 2, TABLE.top + 18], [(TABLE.left + TABLE.right) / 2, TABLE.bottom - 18]] as const) {
      const p = this.project(x, y); g.fillStyle(0x10151b, 1); g.fillCircle(p.x, p.y, 9);
    }
    const cue = this.balls[0];
    const moving = !allBallsStopped(this.balls);
    if (cue && !cue.sunk && !moving) {
      const target = this.project(this.aimPoint.x, this.aimPoint.y);
      const origin = this.project(cue.x, cue.y);
      g.lineStyle(1, 0xe7f4d6, 0.7);
      g.lineBetween(origin.x, origin.y, target.x, target.y);
      g.fillStyle(0xe7f4d6, 0.75); g.fillCircle(target.x, target.y, 3);
    }
    const ordered = [...this.balls].filter((b) => !b.sunk).sort((a, b) => a.y - b.y);
    for (const ball of ordered) {
      const p = this.project(ball.x, ball.y);
      const r = Math.max(5, ball.radius * 0.82);
      g.fillStyle(0x06100e, 0.42); g.fillEllipse(p.x + 3, p.y + 5, r * 2, r * 1.25);
      g.fillStyle(ball.color, 1); g.fillCircle(p.x, p.y, r);
      g.fillStyle(0xffffff, 0.8); g.fillRect(p.x - r * 0.4, p.y - r * 0.45, Math.max(2, r * 0.35), Math.max(2, r * 0.22));
      if (ball.number > 0) {
        g.fillStyle(0xf7f1df, 1); g.fillCircle(p.x, p.y, r * 0.42);
        this.add.text(p.x, p.y, String(ball.number), { fontFamily: 'monospace', fontSize: '8px', color: '#172026' }).setOrigin(0.5).setDepth(20).setData('temporaryBallLabel', true);
      }
    }
    this.children.list.filter((child) => child.getData('temporaryBallLabel')).forEach((child) => child.destroy());
    const canShoot = allBallsStopped(this.balls);
    const status = this.time.now < this.messageUntil ? this.message : canShoot ? 'READY TO SHOOT' : 'BALLS IN MOTION';
    this.add.text(28, 82, status, { fontFamily: 'monospace', fontSize: '10px', color: canShoot ? '#9de5c6' : '#e6c77a', letterSpacing: 1 }).setDepth(100).setData('temporaryHud', true);
    this.add.text(28, 100, `SHOTS ${String(this.shotCount).padStart(2, '0')}`, { fontFamily: 'monospace', fontSize: '10px', color: '#a9b7b9' }).setDepth(100).setData('temporaryHud', true);
    this.add.text(28, 568, 'POWER', { fontFamily: 'monospace', fontSize: '9px', color: '#91aaa8' }).setDepth(100).setData('temporaryHud', true);
    g.fillStyle(0x293a3c, 1); g.fillRect(82, 570, 130, 8);
    g.fillStyle(0x9de5c6, 1); g.fillRect(82, 570, 130 * (this.charging ? this.charge : this.lastShotPower), 8);
    this.children.list.filter((child) => child.getData('temporaryHud')).forEach((child) => child.destroy());
  }
}
