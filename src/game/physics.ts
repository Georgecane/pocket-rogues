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

export const FRICTION = 0.986;
export const RESTITUTION = 0.91;
export const STOP_SPEED = 5;

/** Advances the table-space simulation. Render coordinates are handled elsewhere. */
export function stepPhysics(balls: Ball[], bounds: TableBounds, dtSeconds: number): void {
  const dt = Math.min(dtSeconds, 1 / 30);
  const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const subDt = dt / substeps;

  for (let step = 0; step < substeps; step += 1) {
    for (const ball of balls) {
      if (ball.sunk) continue;
      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;
      const friction = Math.pow(FRICTION, subDt * 60);
      ball.vx *= friction;
      ball.vy *= friction;
      if (Math.hypot(ball.vx, ball.vy) < STOP_SPEED) {
        ball.vx = 0;
        ball.vy = 0;
      }
      if (ball.x - ball.radius < bounds.left) {
        ball.x = bounds.left + ball.radius;
        ball.vx = Math.abs(ball.vx) * RESTITUTION;
      } else if (ball.x + ball.radius > bounds.right) {
        ball.x = bounds.right - ball.radius;
        ball.vx = -Math.abs(ball.vx) * RESTITUTION;
      }
      if (ball.y - ball.radius < bounds.top) {
        ball.y = bounds.top + ball.radius;
        ball.vy = Math.abs(ball.vy) * RESTITUTION;
      } else if (ball.y + ball.radius > bounds.bottom) {
        ball.y = bounds.bottom - ball.radius;
        ball.vy = -Math.abs(ball.vy) * RESTITUTION;
      }
    }
    resolveBallCollisions(balls);
  }
}

function resolveBallCollisions(balls: Ball[]): void {
  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i];
    if (a.sunk) continue;
    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j];
      if (b.sunk) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
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
      const impulse = -(1 + RESTITUTION) * relativeNormalSpeed / 2;
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
