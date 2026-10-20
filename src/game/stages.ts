import type { Ball, TableBounds } from './physics';

export interface StageDefinition {
  number: number;
  name: string;
  objective: string;
  targetCount: number;
  shotLimit: number;
  layout: 'rack' | 'line' | 'scatter' | 'cross';
}

export const TABLE_BOUNDS: TableBounds = { left: 180, right: 780, top: 120, bottom: 480 };

export const STAGES: StageDefinition[] = [
  { number: 1, name: 'FIRST BREAK', objective: 'Pocket every target ball.', targetCount: 5, shotLimit: 10, layout: 'rack' },
  { number: 2, name: 'THE LONG RAIL', objective: 'Clear the line in limited shots.', targetCount: 6, shotLimit: 10, layout: 'line' },
  { number: 3, name: 'SCATTERSHOT', objective: 'Find angles through a loose spread.', targetCount: 7, shotLimit: 11, layout: 'scatter' },
  { number: 4, name: 'CROSS CURRENT', objective: 'Break the cross and sink every ball.', targetCount: 8, shotLimit: 12, layout: 'cross' },
  { number: 5, name: 'TIGHT POCKETS', objective: 'Precision matters. Clear the table.', targetCount: 9, shotLimit: 12, layout: 'rack' },
  { number: 6, name: 'RAIL RUNNER', objective: 'Use bank shots to finish the spread.', targetCount: 10, shotLimit: 13, layout: 'line' },
  { number: 7, name: 'THE GAUNTLET', objective: 'Clear a dense, scattered table.', targetCount: 11, shotLimit: 14, layout: 'scatter' },
  { number: 8, name: 'ROGUE CHAMPION', objective: 'One last table. Sink them all.', targetCount: 12, shotLimit: 15, layout: 'cross' },
];

const BALL_COLORS = [0xe8c547, 0x3b82c4, 0xc9484a, 0x8c59b9, 0xe78b3c, 0x2a9d78, 0xd86e9b, 0x242a35, 0xe4d6b5, 0x6b8fcb, 0xd67d4b, 0x8aa65b];

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStageBalls(stageNumber: number): Ball[] {
  const stage = STAGES[stageNumber - 1] ?? STAGES[0];
  const random = seededRandom(0x504f434b + stage.number * 7919);
  const balls: Ball[] = [
    { x: 285, y: 300, vx: 0, vy: 0, radius: 12, color: 0xf3f0d8, number: 0, sunk: false },
  ];

  for (let index = 0; index < stage.targetCount; index += 1) {
    let x = 0;
    let y = 0;
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt += 1) {
      if (stage.layout === 'rack') {
        const row = Math.floor(index / 3);
        const column = index % 3;
        x = 540 + row * 31 + (random() - 0.5) * 4;
        y = 240 + (column - 1) * 29 + (row % 2) * 5;
      } else if (stage.layout === 'line') {
        x = 475 + index * 23 + (random() - 0.5) * 5;
        y = 185 + (index % 2) * 190 + (random() - 0.5) * 12;
      } else if (stage.layout === 'cross') {
        const arm = index % 4;
        const step = Math.floor(index / 4) * 31 + 30;
        x = 590 + (arm === 1 ? step : arm === 3 ? -step : (random() - 0.5) * 14);
        y = 300 + (arm === 0 ? -step : arm === 2 ? step : (random() - 0.5) * 14);
      } else {
        x = 455 + random() * 270;
        y = 155 + random() * 290;
      }
      x = Math.max(TABLE_BOUNDS.left + 45, Math.min(TABLE_BOUNDS.right - 45, x));
      y = Math.max(TABLE_BOUNDS.top + 45, Math.min(TABLE_BOUNDS.bottom - 45, y));
      placed = balls.every((ball) => Math.hypot(ball.x - x, ball.y - y) >= 27);
    }
    if (!placed) {
      x = 500 + (index % 4) * 34;
      y = 180 + Math.floor(index / 4) * 34;
    }
    balls.push({
      x, y, vx: 0, vy: 0, radius: 12,
      color: BALL_COLORS[index % BALL_COLORS.length],
      number: index + 1, sunk: false,
    });
  }
  return balls;
}
