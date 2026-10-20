import Phaser from 'phaser';
import { allBallsStopped, pocketCenters, stepPhysics, type Ball } from './physics';
import { createStageBalls, STAGES, TABLE_BOUNDS } from './stages';
import { chooseUpgradeOffer, upgradeLevel, type UpgradeDefinition, type UpgradeId } from './upgrades';

type Point = { x: number; y: number };
type RunState = 'playing' | 'upgrade' | 'failed' | 'victory';

const W = 960;
const H = 600;
const TABLE = TABLE_BOUNDS;
const ISO_X = 0.78;
const ISO_Y = 0.4;
const CENTER = { x: W / 2, y: H / 2 + 4 };

export class GameScene extends Phaser.Scene {
  private balls: Ball[] = [];
  private staticGraphics!: Phaser.GameObjects.Graphics;
  private dynamicGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private ballLabels: Phaser.GameObjects.Text[] = [];
  private overlayTexts: Phaser.GameObjects.Text[] = [];
  private overlayState: RunState | null = null;
  private hud: Record<string, Phaser.GameObjects.Text> = {};
  private aimPoint: Point = { x: 620, y: 300 };
  private charging = false;
  private charge = 0;
  private shotCount = 0;
  private shotsRemaining = 0;
  private stageNumber = 1;
  private state: RunState = 'playing';
  private upgrades: UpgradeId[] = [];
  private offers: UpgradeDefinition[] = [];
  private message = 'AIM WITH YOUR MOUSE';
  private messageUntil = 0;
  private runChip?: HTMLElement;
  private hasEvaluatedShot = true;

  constructor() { super('GameScene'); }

  create(): void {
    this.staticGraphics = this.add.graphics();
    this.dynamicGraphics = this.add.graphics();
    this.overlayGraphics = this.add.graphics().setDepth(80);
    this.createHud();
    this.paintStaticScene();
    this.runChip = document.querySelector<HTMLElement>('.run-chip b') ?? undefined;
    this.loadStage(1);

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.aimPoint = this.screenToTable(pointer.x, pointer.y);
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.state === 'upgrade') {
        this.pickUpgradeAt(pointer.x, pointer.y);
        return;
      }
      if (this.state === 'failed' || this.state === 'victory') {
        this.restartRun();
        return;
      }
      if (this.state !== 'playing' || !allBallsStopped(this.balls)) return;
      this.charging = true;
      this.charge = 0;
    });
    this.input.on('pointerup', () => {
      if (this.state !== 'playing' || !this.charging) return;
      this.charging = false;
      this.shoot();
    });
    this.input.keyboard?.on('keydown-R', () => this.restartStage());
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.state === 'playing' && allBallsStopped(this.balls)) this.shoot();
    });
    this.input.keyboard?.on('keydown-ONE', () => this.chooseUpgrade(0));
    this.input.keyboard?.on('keydown-TWO', () => this.chooseUpgrade(1));
    this.input.keyboard?.on('keydown-THREE', () => this.chooseUpgrade(2));
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.state === 'failed' || this.state === 'victory') this.restartRun();
    });
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    if (this.state === 'playing') {
      if (this.charging) this.charge = Math.min(1, this.charge + dt * 0.65);
      stepPhysics(this.balls, TABLE, dt, {
        friction: upgradeLevel(this.upgrades, 'silk') > 0
          ? Math.min(0.998, 0.986 + upgradeLevel(this.upgrades, 'silk') * 0.003)
          : undefined,
        restitution: Math.min(0.99, 0.91 + upgradeLevel(this.upgrades, 'rails') * 0.025),
        pocketRadius: 19 + upgradeLevel(this.upgrades, 'pockets') * 3,
      });
      if (!allBallsStopped(this.balls)) this.hasEvaluatedShot = false;
      if (allBallsStopped(this.balls) && !this.hasEvaluatedShot) this.resolveShot();
    }
    this.drawDynamicScene();
  }

  private createHud(): void {
    const style = { fontFamily: 'monospace', fontSize: '10px', color: '#9de5c6', letterSpacing: 1 };
    this.hud.status = this.add.text(28, 82, '', style).setDepth(100);
    this.hud.stage = this.add.text(28, 100, '', { ...style, color: '#a9b7b9' }).setDepth(100);
    this.hud.shots = this.add.text(28, 118, '', { ...style, color: '#a9b7b9' }).setDepth(100);
    this.hud.objective = this.add.text(28, 136, '', { ...style, fontSize: '9px', color: '#e6c77a' }).setDepth(100);
    this.hud.upgrades = this.add.text(932, 28, '', { ...style, fontSize: '9px', color: '#a9b7b9', align: 'right' }).setOrigin(1, 0).setDepth(100);
  }

  private loadStage(number: number): void {
    this.stageNumber = number;
    const stage = STAGES[number - 1];
    this.balls = createStageBalls(number);
    this.shotCount = 0;
    this.shotsRemaining = stage.shotLimit + upgradeLevel(this.upgrades, 'reserve') * 2;
    this.charge = 0;
    this.charging = false;
    this.state = 'playing';
    this.hasEvaluatedShot = true;
    this.message = stage.name;
    this.messageUntil = this.time.now + 1500;
    this.rebuildBallLabels();
    if (this.runChip) this.runChip.textContent = String(number).padStart(2, '0');
    this.updateHud();
  }

  private rebuildBallLabels(): void {
    this.ballLabels.forEach((label) => label.destroy());
    this.ballLabels = this.balls.map((ball) =>
      this.add.text(0, 0, String(ball.number), {
        fontFamily: 'monospace', fontSize: '8px', color: '#172026', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(25).setVisible(false),
    );
  }

  private restartRun(): void {
    this.upgrades = [];
    this.loadStage(1);
    this.message = 'NEW RUN STARTED';
    this.messageUntil = this.time.now + 1400;
  }

  private restartStage(): void {
    if (this.state === 'upgrade') return;
    this.loadStage(this.stageNumber);
    this.message = 'TABLE RESET';
    this.messageUntil = this.time.now + 1200;
  }

  private shoot(): void {
    const cue = this.balls.find((ball) => ball.number === 0);
    if (!cue || cue.sunk || this.state !== 'playing' || !allBallsStopped(this.balls) || this.shotsRemaining <= 0) return;
    let dx = this.aimPoint.x - cue.x;
    let dy = this.aimPoint.y - cue.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;
    dx /= length;
    dy /= length;
    const power = 180 + this.charge * 470;
    const multiplier = 1 + upgradeLevel(this.upgrades, 'power') * 0.22;
    cue.vx = dx * power * multiplier;
    cue.vy = dy * power * multiplier;
    this.charge = 0;
    this.shotCount += 1;
    this.shotsRemaining -= 1;
    this.hasEvaluatedShot = false;
    this.message = 'SHOT ' + String(this.shotCount).padStart(2, '0');
    this.messageUntil = this.time.now + 900;
    this.updateHud();
  }

  private resolveShot(): void {
    this.hasEvaluatedShot = true;
    const cue = this.balls.find((ball) => ball.number === 0);
    if (cue?.sunk) {
      cue.sunk = false;
      cue.x = TABLE.left + 105;
      cue.y = (TABLE.top + TABLE.bottom) / 2;
      cue.vx = 0;
      cue.vy = 0;
      this.message = 'SCRATCH! CUE BALL RESET';
      this.messageUntil = this.time.now + 1400;
    }
    const remaining = this.balls.filter((ball) => ball.number > 0 && !ball.sunk).length;
    if (remaining === 0) {
      if (this.stageNumber >= STAGES.length) {
        this.state = 'victory';
        this.message = 'RUN COMPLETE';
      } else {
        this.state = 'upgrade';
        this.offers = chooseUpgradeOffer(this.stageNumber, this.upgrades);
        this.message = 'TABLE CLEARED';
      }
      this.messageUntil = this.time.now + 2400;
    } else if (this.shotsRemaining <= 0) {
      this.state = 'failed';
      this.message = 'OUT OF SHOTS';
      this.messageUntil = this.time.now + 2000;
    } else if (!this.message.startsWith('SCRATCH')) {
      this.message = 'AIM FOR A POCKET';
      this.messageUntil = this.time.now + 1000;
    }
    this.updateHud();
  }

  private chooseUpgrade(index: number): void {
    if (this.state !== 'upgrade' || !this.offers[index]) return;
    this.upgrades.push(this.offers[index].id);
    this.loadStage(this.stageNumber + 1);
    this.message = 'UPGRADE: ' + this.offers[index].name;
    this.messageUntil = this.time.now + 1800;
  }

  private pickUpgradeAt(x: number, y: number): void {
    if (y < 190 || y > 445) return;
    const startX = 178;
    const index = Math.floor((x - startX) / 204);
    if (index >= 0 && index < 3 && x <= startX + 3 * 190 + 2 * 14) this.chooseUpgrade(index);
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
      x: Phaser.Math.Clamp((TABLE.left + TABLE.right) / 2 + dx, TABLE.left + 24, TABLE.right - 24),
      y: Phaser.Math.Clamp((TABLE.top + TABLE.bottom) / 2 + dy, TABLE.top + 24, TABLE.bottom - 24),
    };
  }

  private paintStaticScene(): void {
    const g = this.staticGraphics;
    g.clear();
    g.lineStyle(1, 0x1a2830, 0.42);
    for (let x = 0; x < W; x += 24) g.lineBetween(x, 0, x, H);
    for (let y = 0; y < H; y += 24) g.lineBetween(0, y, W, y);
    const corners = [this.project(TABLE.left, TABLE.top), this.project(TABLE.right, TABLE.top), this.project(TABLE.right, TABLE.bottom), this.project(TABLE.left, TABLE.bottom)];
    g.fillStyle(0x05090c, 0.6);
    g.fillPoints(corners.map((p) => ({ x: p.x + 9, y: p.y + 22 })), true);
    g.fillStyle(0x4a2b22, 1);
    g.fillPoints(corners, true);
    g.lineStyle(8, 0x98613c, 1);
    g.strokePoints(corners, true);
    const inset = [this.project(TABLE.left + 18, TABLE.top + 18), this.project(TABLE.right - 18, TABLE.top + 18), this.project(TABLE.right - 18, TABLE.bottom - 18), this.project(TABLE.left + 18, TABLE.bottom - 18)];
    g.fillStyle(0x176b58, 1);
    g.fillPoints(inset, true);
    g.lineStyle(3, 0x2f9a78, 1);
    g.strokePoints(inset, true);
    for (const pocket of pocketCenters(TABLE)) {
      const p = this.project(pocket.x, pocket.y);
      g.fillStyle(0x10151b, 1);
      g.fillCircle(p.x, p.y, pocket.x === (TABLE.left + TABLE.right) / 2 ? 8 : 10);
      g.lineStyle(2, 0x0a1715, 1);
      g.strokeCircle(p.x, p.y, pocket.x === (TABLE.left + TABLE.right) / 2 ? 8 : 10);
    }
    this.add.text(28, 28, 'POCKET ROGUES', { fontFamily: 'monospace', fontSize: '14px', color: '#9de5c6', letterSpacing: 2 }).setDepth(100);
    this.add.text(28, 49, 'ROGUELIKE BILLIARDS / RUN MODE', { fontFamily: 'monospace', fontSize: '9px', color: '#6b8790', letterSpacing: 1 }).setDepth(100);
  }

  private drawDynamicScene(): void {
    const g = this.dynamicGraphics;
    g.clear();
    const cue = this.balls.find((ball) => ball.number === 0);
    const moving = !allBallsStopped(this.balls);
    if (cue && !cue.sunk && !moving && this.state === 'playing') {
      const origin = this.project(cue.x, cue.y);
      const target = this.project(this.aimPoint.x, this.aimPoint.y);
      const guide = upgradeLevel(this.upgrades, 'sight') > 0 ? 1.8 : 1;
      const end = { x: origin.x + (target.x - origin.x) * guide, y: origin.y + (target.y - origin.y) * guide };
      g.lineStyle(1, 0xe7f4d6, 0.68);
      g.lineBetween(origin.x, origin.y, end.x, end.y);
      g.fillStyle(0xe7f4d6, 0.8);
      g.fillCircle(target.x, target.y, 3);
    }

    const ordered = this.balls.map((ball, index) => ({ ball, label: this.ballLabels[index] })).filter(({ ball }) => !ball.sunk).sort((a, b) => a.ball.y - b.ball.y);
    for (const { ball, label } of ordered) {
      const p = this.project(ball.x, ball.y);
      const r = Math.max(5, ball.radius * 0.82);
      g.fillStyle(0x06100e, 0.42);
      g.fillEllipse(p.x + 3, p.y + 5, r * 2, r * 1.25);
      g.fillStyle(ball.color, 1);
      g.fillCircle(p.x, p.y, r);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(p.x - r * 0.4, p.y - r * 0.45, Math.max(2, r * 0.35), Math.max(2, r * 0.22));
      if (ball.number > 0) {
        g.fillStyle(0xf7f1df, 1);
        g.fillCircle(p.x, p.y, r * 0.42);
        label.setPosition(p.x, p.y).setVisible(true);
      } else {
        label.setVisible(false);
      }
    }
    this.ballLabels.forEach((label, index) => {
      if (this.balls[index].sunk) label.setVisible(false);
    });

    const stage = STAGES[this.stageNumber - 1];
    const remaining = this.balls.filter((ball) => ball.number > 0 && !ball.sunk).length;
    const status = this.time.now < this.messageUntil ? this.message
      : this.state === 'playing' ? (moving ? 'BALLS IN MOTION' : 'READY TO SHOOT')
      : this.state === 'upgrade' ? 'CHOOSE AN UPGRADE'
      : this.state === 'failed' ? 'RUN ENDED' : 'CHAMPION';
    this.hud.status.setText(status);
    this.hud.stage.setText('STAGE ' + String(this.stageNumber).padStart(2, '0') + ' / ' + STAGES.length + '  ' + stage.name);
    this.hud.shots.setText('SHOTS ' + this.shotCount + '   LEFT ' + this.shotsRemaining + '   TARGETS ' + remaining);
    this.hud.objective.setText(stage.objective);
    this.hud.upgrades.setText(this.upgrades.length ? 'RELICS: ' + this.upgrades.map((id) => id.toUpperCase()).join(' / ') : 'RELICS: NONE');
    this.drawPowerBar();
    this.drawOverlay();
  }

  private drawPowerBar(): void {
    const g = this.dynamicGraphics;
    g.fillStyle(0x293a3c, 1);
    g.fillRect(82, 570, 130, 8);
    g.fillStyle(0x9de5c6, 1);
    g.fillRect(82, 570, 130 * this.charge, 8);
  }

  private drawOverlay(): void {
    if (this.overlayState === this.state) return;
    this.overlayState = this.state;
    this.overlayTexts.forEach((text) => text.destroy());
    this.overlayTexts = [];
    const g = this.overlayGraphics;
    g.clear();
    if (this.state === 'playing') return;

    g.fillStyle(0x071014, 0.82);
    g.fillRect(0, 0, W, H);
    if (this.state === 'upgrade') {
      this.addOverlayTitle('TABLE CLEARED', 'CHOOSE ONE RELIC TO CARRY INTO THE NEXT STAGE');
      this.offers.forEach((offer, index) => {
        const x = 178 + index * 204;
        g.fillStyle(0x15242a, 1);
        g.fillRoundedRect(x, 222, 190, 180, 8);
        g.lineStyle(2, offer.color, 1);
        g.strokeRoundedRect(x, 222, 190, 180, 8);
        g.fillStyle(offer.color, 1);
        g.fillRect(x + 14, 242, 30, 4);
        this.addOverlayText(x + 14, 263, String(index + 1) + ' / ' + offer.name, '#e9f1e7', '11px');
        this.addOverlayText(x + 14, 302, offer.description, '#9de5c6', '10px');
        this.addOverlayText(x + 14, 338, offer.detail, '#8da2a2', '9px');
        this.addOverlayText(x + 14, 374, 'CLICK OR PRESS ' + (index + 1), '#e6c77a', '8px');
      });
    } else if (this.state === 'failed') {
      this.addOverlayTitle('RUN OVER', 'YOU RAN OUT OF SHOTS. TRY THE TABLE AGAIN.');
      this.addOverlayText(340, 340, 'CLICK ANYWHERE OR PRESS ENTER TO RESTART', '#9de5c6', '11px');
      this.addOverlayText(420, 380, 'PRESS R TO RETRY THIS STAGE', '#8da2a2', '9px');
    } else {
      this.addOverlayTitle('ROGUE CHAMPION', 'ALL EIGHT STAGES CLEARED. THE TABLES ARE YOURS.');
      this.addOverlayText(350, 350, 'CLICK ANYWHERE OR PRESS ENTER FOR A NEW RUN', '#9de5c6', '10px');
    }
  }

  private addOverlayTitle(title: string, subtitle: string): void {
    this.addOverlayText(0, 145, title, '#9de5c6', '22px').setOrigin(0.5, 0.5).setX(W / 2);
    this.addOverlayText(0, 183, subtitle, '#a9b7b9', '9px').setOrigin(0.5, 0.5).setX(W / 2);
  }

  private addOverlayText(x: number, y: number, value: string, color: string, fontSize: string): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, value, {
      fontFamily: 'monospace', fontSize, color,
      wordWrap: { width: x === 0 ? 760 : 160 },
    }).setDepth(90);
    this.overlayTexts.push(text);
    return text;
  }

  private updateHud(): void {
    if (this.hud.shots) this.hud.shots.setText('SHOTS ' + this.shotCount + '   LEFT ' + this.shotsRemaining);
  }
}
