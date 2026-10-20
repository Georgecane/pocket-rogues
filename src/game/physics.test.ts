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

  it('captures a resting ball pushed into a pocket by collision separation within the same step', () => {
    // Bottom side pocket at (480, 462). Capture threshold is POCKET_RADIUS + radius * 0.2
    // (19 + 12 * 0.2 = 21.4), so a ball resting 21.5 away is just outside it.
    const target = ball({ x: 480, y: 440.5, number: 5 });
    const nudger = ball({ x: 480, y: 417.1 }); // 23.4 away -> 0.6 overlap
    const onPocket = vi.fn();
    stepPhysics([target, nudger], bounds, 1 / 120, { onPocket });
    expect(target.sunk).toBe(true);
    expect(target.vx).toBe(0);
    expect(target.vy).toBe(0);
    expect(onPocket).toHaveBeenCalledTimes(1);
    expect(onPocket).toHaveBeenCalledWith(target);
    expect(nudger.sunk).toBe(false);
  });

  it('ignores sunk balls entirely: no callbacks and no collision interference', () => {
    const ghost = ball({ x: 300, y: 300, sunk: true });
    const live = ball({ x: 306, y: 300 }); // overlapping the sunk ball
    const onPocket = vi.fn();
    const onRail = vi.fn();
    const onBallCollision = vi.fn();
    stepPhysics([ghost, live], bounds, 1 / 60, { onPocket, onRail, onBallCollision });
    expect(onPocket).not.toHaveBeenCalled();
    expect(onRail).not.toHaveBeenCalled();
    expect(onBallCollision).not.toHaveBeenCalled();
    expect(ghost.x).toBe(300);
    expect(live.x).toBe(306);
  });

  it('emits the pocket callback exactly once even when stepping continues after the sink', () => {
    const target = ball({ x: 260, y: 150, vx: -300, number: 2 });
    const onPocket = vi.fn();
    for (let i = 0; i < 30; i += 1) {
      stepPhysics([target], bounds, 1 / 60, { onPocket });
    }
    expect(target.sunk).toBe(true);
    expect(onPocket).toHaveBeenCalledTimes(1);
  });

  it('fires the rail callback once for a single rebound', () => {
    const target = ball({ x: 212, y: 360, vx: -200 });
    const onRail = vi.fn();
    stepPhysics([target], bounds, 1 / 30, { onRail });
    expect(onRail).toHaveBeenCalledTimes(1);
    expect(target.x).toBeGreaterThanOrEqual(bounds.left + 18 + target.radius);
    expect(target.x).toBeLessThanOrEqual(bounds.right - 18 - target.radius);
    expect(target.vx).toBeGreaterThan(0);
  });

  it('separates resting overlapping balls without emitting a collision callback', () => {
    const a = ball({ x: 218, y: 360, number: 3 });
    const b = ball({ x: 240, y: 360, number: 4 });
    const onBallCollision = vi.fn();
    stepPhysics([a, b], bounds, 1 / 60, { onBallCollision });
    expect(onBallCollision).not.toHaveBeenCalled();
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(a.radius + b.radius);
    expect(a.vx).toBe(0);
    expect(b.vx).toBe(0);
  });

  it('brings a ball moving just above the stop threshold to a complete stop', () => {
    const slow = ball({ x: 400, y: 360, vx: 5.001 });
    stepPhysics([slow], bounds, 1 / 30);
    expect(slow.vx).toBe(0);
    expect(slow.vy).toBe(0);
    expect(allBallsStopped([slow])).toBe(true);
  });

  it('keeps balls inside the rails when a large dt is clamped', () => {
    const wild = ball({ x: 480, y: 360, vx: 5000, vy: -5000 });
    stepPhysics([wild], bounds, 1);
    const inBounds = wild.x >= bounds.left + 18 + wild.radius
      && wild.x <= bounds.right - 18 - wild.radius
      && wild.y >= bounds.top + 18 + wild.radius
      && wild.y <= bounds.bottom - 18 - wild.radius;
    expect(wild.sunk || inBounds).toBe(true);
  });
});
