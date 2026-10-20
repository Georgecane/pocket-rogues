export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: number;
  number: number;
  sunk: boolean;
}

export interface TableBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PhysicsOptions {
  friction?: number;
  restitution?: number;
  pocketRadius?: number;
}

export const FRICTION = 0.986;
export const RESTITUTION = 0.91;
export const STOP_SPEED = 5;
export const POCKET_RADIUS = 19;

export function pocketCenters(bounds: TableBounds): Array<{ x: number; y: number }> {
  const midX = (bounds.left + bounds.right) / 2;
  return [
    { x: bounds.left + 18, y: bounds.top + 18 },
    { x: midX, y: bounds.top + 18 },
    { x: bounds.right - 18, y: bounds.top + 18 },
    { x: bounds.left + 18, y: bounds.bottom - 18 },
    { x: midX, y: bounds.bottom - 18 },
    { x: bounds.right - 18, y: bounds.bottom - 18 },
  ];
}

/** Deterministic table-space simulation. Rendering and isometric projection live in GameScene. */
export function stepPhysics(
  balls: Ball[],
  bounds: TableBounds,
  dtSeconds: number,
  options: PhysicsOptions = {},
): void {
  const dt = Math.min(Math.max(dtSeconds, 0), 1 / 30);
  const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const subDt = dt / substeps;
  const friction = options.friction ?? FRICTION;
  const restitution = options.restitution ?? RESTITUTION;
  const pockets = pocketCenters(bounds);
  const pocketRadius = options.pocketRadius ?? POCKET_RADIUS;

  for (let step = 0; step < substeps; step += 1) {
    for (const ball of balls) {
      if (ball.sunk) continue;
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;

      const pocket = pockets.find((p) => Math.hypot(ball.x - p.x, ball.y - p.y) < pocketRadius + ball.radius * 0.2);
      if (pocket) {
        ball.sunk = true;
        ball.vx = 0;
        ball.vy = 0;
        continue;
      }

      const drag = Math.pow(friction, subDt * 60);
      ball.vx *= drag;
      ball.vy *= drag;
      if (Math.hypot(ball.vx, ball.vy) < STOP_SPEED) {
        ball.vx = 0;
        ball.vy = 0;
      }

      const leftRail = bounds.left + 18;
      const rightRail = bounds.right - 18;
      const topRail = bounds.top + 18;
      const bottomRail = bounds.bottom - 18;

      if (ball.x - ball.radius < leftRail) {
        ball.x = leftRail + ball.radius;
        ball.vx = Math.abs(ball.vx) * restitution;
      } else if (ball.x + ball.radius > rightRail) {
        ball.x = rightRail - ball.radius;
        ball.vx = -Math.abs(ball.vx) * restitution;
      }
      if (ball.y - ball.radius < topRail) {
        ball.y = topRail + ball.radius;
        ball.vy = Math.abs(ball.vy) * restitution;
      } else if (ball.y + ball.radius > bottomRail) {
        ball.y = bottomRail - ball.radius;
        ball.vy = -Math.abs(ball.vy) * restitution;
      }
    }
    resolveBallCollisions(balls, restitution);
  }
}

function resolveBallCollisions(balls: Ball[], restitution: number): void {
  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i];
    if (a.sunk) continue;
    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j];
      if (b.sunk) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const minDistance = a.radius + b.radius;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq >= minDistance * minDistance) continue;

      const distance = Math.max(Math.sqrt(distanceSq), 0.001);
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const relativeNormalSpeed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (relativeNormalSpeed >= 0) continue;
      const impulse = -(1 + restitution) * relativeNormalSpeed / 2;
      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;
    }
  }
}

export function allBallsStopped(balls: Ball[]): boolean {
  return balls.every((ball) => ball.sunk || (ball.vx === 0 && ball.vy === 0));
}
