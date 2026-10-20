/**
 * Pure physics and math calculations for Sapinhos Sapecas
 */

export interface JumpState {
  jumpT: number;
  duration: number;
  maxHeight: number;
}

/**
 * Calculates current Z elevation based on remaining jump time and duration using a sine arc.
 */
export function calculateZ(jumpT: number, duration: number = 0.42, maxHeight: number = 24): number {
  if (jumpT <= 0 || duration <= 0) return 0;
  const progress = Math.max(0, Math.min(1, 1 - (jumpT / duration)));
  return Math.sin(progress * Math.PI) * maxHeight;
}

/**
 * Invulnerability rule: while z > 6px, frog ignores projectiles and ground hazards.
 */
export function isJumpInvulnerable(z: number): boolean {
  return z > 6;
}

/**
 * Calculates real rolling DPS from hit timestamp/damage records over a given window in seconds.
 */
export function calculateDPS(hits: Array<{ t: number; d: number }>, nowMs: number, windowSec: number = 3): number {
  const cutoff = nowMs - windowSec * 1000;
  const validHits = hits.filter(h => h.t >= cutoff);
  const totalDamage = validHits.reduce((acc, h) => acc + h.d, 0);
  return windowSec > 0 ? totalDamage / windowSec : 0;
}

/**
 * Calculates bounce physics with friction and gravity for flying gold flies.
 */
export function updateBouncingParticle(
  p: { x: number; y: number; z: number; vx: number; vy: number; vz: number },
  dt: number,
  gravity: number = 240,
  friction: number = 3.5,
  elasticity: number = 0.45
): void {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx *= Math.max(0, 1 - dt * friction);
  p.vy *= Math.max(0, 1 - dt * friction);

  if (p.z > 0 || p.vz !== 0) {
    p.vz -= gravity * dt;
    p.z += p.vz * dt;
    if (p.z <= 0) {
      p.z = 0;
      p.vz = Math.abs(p.vz) > 25 ? -p.vz * elasticity : 0;
    }
  }
}
