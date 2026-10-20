import { describe, expect, it, vi } from 'vitest';
import { allBallsStopped, pocketCenters, stepPhysics, type Ball, type TableBounds } from './physics';

const bounds: TableBounds = { left: 180, right: 780, top: 120, bottom: 480 };

function ball(overrides: Partial<Ball> = {}): Ball {
  return {
    x: 400, y: 300, vx: 0, vy: 0, radius: 12,
    color: 0xffffff, number: 1, sunk: false, ...overrides,
  };
}

describe('billiards physics', () => {
  it('defines six pockets at the table corners and side centers', () => {
    const pockets = pocketCenters(bounds);
    expect(pockets).toHaveLength(6);
    expect(pockets).toContainEqual({ x: 480, y: 138 });
    expect(pockets).toContainEqual({ x: 480, y: 462 });
  });

  it('recognizes a fully stopped table and ignores sunk balls', () => {
    expect(allBallsStopped([ball(), ball({ sunk: true, vx: 80 })])).toBe(true);
    expect(allBallsStopped([ball({ vx: 0.1 })])).toBe(false);
  });

  it('sinks a ball that reaches a pocket and emits one pocket callback', () => {
    const target = ball({ x: 198, y: 138, vx: 0, vy: 0 });
    const onPocket = vi.fn();
    stepPhysics([target], bounds, 1 / 60, { onPocket });
    expect(target.sunk).toBe(true);
    expect(target.vx).toBe(0);
    expect(target.vy).toBe(0);
    expect(onPocket).toHaveBeenCalledTimes(1);
  });

  it('rebounds a ball from a rail and emits a rail callback', () => {
    const target = ball({ x: 205, y: 300, vx: -200, vy: 0 });
    const onRail = vi.fn();
    stepPhysics([target], bounds, 1 / 30, { onRail });
    expect(target.vx).toBeGreaterThan(0);
    expect(target.x).toBeGreaterThanOrEqual(bounds.left + 18 + target.radius);
    expect(onRail).toHaveBeenCalled();
  });

  it('reports an approaching ball collision', () => {
    const cue = ball({ x: 300, y: 300, vx: 100, number: 0 });
    const target = ball({ x: 320, y: 300, vx: 0, number: 1 });
    const onBallCollision = vi.fn();
    stepPhysics([cue, target], bounds, 1 / 120, { onBallCollision });
    expect(onBallCollision).toHaveBeenCalled();
    expect(cue.vx).toBeLessThan(100);
    expect(target.vx).toBeGreaterThan(0);
  });
});
