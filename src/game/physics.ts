/**
 * Pure physics and math calculations for Sapinhos Sapecas
 */

export interface JumpState {
  jumpT: number;
  duration: number;
  maxHeight: number;
}

export interface WhipSegment {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Calculates current Z elevation based on remaining jump time and duration using a sine arc.
 */
export function calculateZ(jumpT: number, duration: number = 0.42, maxHeight: number = 24): number {
  if (jumpT <= 0 || duration <= 0) return 0;
  const progress = Math.max(0, Math.min(1, 1 - jumpT / duration));
  return Math.sin(progress * Math.PI) * maxHeight;
}

/**
 * Invulnerability rule: while z > 6px, frog ignores projectiles and ground hazards.
 */
export function isJumpInvulnerable(z: number): boolean {
  return z > 6;
}

/**
 * Exact mouth origin for frog sprites (14x15 pixel matrix at 2x = 28x30px).
 * In dspr(), sprite is centered vertically at (y - z - walkHop), and the mouth line
 * is row 8 of 15 (~1.5px above vertical center), slightly offset toward the facing side.
 */
export function getFrogMouthOrigin(
  x: number,
  y: number,
  z: number,
  ang: number,
  sc: number = 1,
  walkHop: number = 0
): { x: number; y: number } {
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);
  const faceSign = cosA >= 0 ? 1 : -1;
  const mx = x + faceSign * 2.2 * sc + cosA * 3.8 * sc;
  const my = y - z - walkHop - 1.5 * sc + sinA * 2.8 * sc;
  return { x: mx, y: my };
}

/**
 * Initializes a persistent multi-segment Castlevania-style frog tongue whip chain.
 */
export function initCastlevaniaWhipChain(
  mouthX: number,
  mouthY: number,
  aimAng: number,
  reach: number = 42,
  segments: number = 8
): WhipSegment[] {
  const segLen = reach / Math.max(1, segments - 1);
  const cosA = Math.cos(aimAng);
  const sinA = Math.sin(aimAng);
  return Array.from({ length: segments }, (_, i) => ({
    x: mouthX + cosA * segLen * i,
    y: mouthY + sinA * segLen * i,
    vx: 0,
    vy: 0,
  }));
}

/**
 * Updates the persistent Castlevania-style frog tongue whip chain with deliberate,
 * weighty inertia so swinging the cursor moves the tongue like a flail/whip without
 * instant teleportation.
 */
export function updateCastlevaniaWhipChain(
  chain: WhipSegment[],
  mouthX: number,
  mouthY: number,
  aimAng: number,
  reach: number,
  dt: number,
  whipActive: boolean = false
): void {
  if (!chain || chain.length < 2) return;
  const n = chain.length;
  const segLen = reach / (n - 1);
  const cosA = Math.cos(aimAng);
  const sinA = Math.sin(aimAng);

  // Anchor segment 0 directly at the frog's mouth
  chain[0].x = mouthX;
  chain[0].y = mouthY;
  chain[0].vx = 0;
  chain[0].vy = 0;

  // Deliberate whip speed cap (snappy, responsive and weighty Castlevania whip physics)
  const springStiffness = whipActive ? 52 : 30;
  const damping = whipActive ? 8.0 : 9.5;
  const maxStepSpeed = whipActive ? 560 : 340;

  for (let i = 1; i < n; i++) {
    const seg = chain[i];
    const ratio = i / (n - 1);
    const idealX = mouthX + cosA * (reach * ratio);
    const idealY = mouthY + sinA * (reach * ratio);

    // Spring pull toward ideal aim line, stronger near the base and looser near the tip for whip lag
    const pull = springStiffness * (1.2 - ratio * 0.4);
    seg.vx += (idealX - seg.x) * pull * dt;
    seg.vy += (idealY - seg.y) * pull * dt;

    // Apply damping
    const dampFactor = Math.max(0, 1 - damping * dt);
    seg.vx *= dampFactor;
    seg.vy *= dampFactor;

    // Clamp velocity so swinging the mouse fast creates a smooth Castlevania whip arc
    const spd = Math.hypot(seg.vx, seg.vy);
    const limit = maxStepSpeed * (0.6 + ratio * 0.7);
    if (spd > limit) {
      seg.vx = (seg.vx / spd) * limit;
      seg.vy = (seg.vy / spd) * limit;
    }

    seg.x += seg.vx * dt;
    seg.y += seg.vy * dt;
  }

  // Forward & backward distance constraint passes to keep tongue segments connected
  for (let pass = 0; pass < 2; pass++) {
    chain[0].x = mouthX;
    chain[0].y = mouthY;
    for (let i = 1; i < n; i++) {
      const prev = chain[i - 1];
      const cur = chain[i];
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const maxSeg = segLen * 1.12;
      const minSeg = segLen * 0.55;
      if (d > maxSeg) {
        const diff = (d - maxSeg) / d;
        cur.x -= dx * diff * 0.85;
        cur.y -= dy * diff * 0.85;
      } else if (d < minSeg) {
        const diff = (minSeg - d) / d;
        cur.x += dx * diff * 0.5;
        cur.y += dy * diff * 0.5;
      }
    }
  }
}

/**
 * Calculates real rolling DPS from hit timestamp/damage records over a given window in seconds.
 */
export function calculateDPS(hits: Array<{ t: number; d: number }>, nowMs: number, windowSec: number = 3): number {
  const cutoff = nowMs - windowSec * 1000;
  const validHits = hits.filter((h) => h.t >= cutoff);
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

export interface RainDrop {
  x: number;
  y: number;
  len: number;
  spd: number;
  col: string;
  alpha: number;
}

/**
 * Updates acid rain drops with wind drift, recycling them when they pass the bottom
 * and returning splash coordinates for floor sizzle effects.
 */
export function updateAcidRainDrops(
  drops: RainDrop[],
  windX: number,
  dt: number,
  width: number = 480,
  height: number = 320
): Array<{ x: number; y: number; col: string }> {
  const splashes: Array<{ x: number; y: number; col: string }> = [];

  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];
    d.x += windX * dt;
    d.y += d.spd * dt;

    if (d.y >= height - 16 || d.x < -20 || d.x > width + 20) {
      if (d.y >= height - 28 && Math.random() < 0.35) {
        splashes.push({ x: d.x, y: Math.min(height - 18, d.y), col: d.col });
      }
      d.x = Math.random() * (width + 60) - 30;
      d.y = -Math.random() * 40;
      d.len = 6 + Math.random() * 8;
      d.spd = 280 + Math.random() * 120;
      d.alpha = 0.35 + Math.random() * 0.45;
      d.col = Math.random() < 0.65 ? '#69f0ae' : Math.random() < 0.85 ? '#00e5ff' : '#76ff03';
    }
  }

  return splashes;
}

/**
 * Mildly affects projectile trajectories due to swamp storms and acid rain wind.
 */
export function applyWeatherProjectileDrift(
  b: { vx: number; vy: number; tng?: number },
  windX: number,
  windY: number,
  dt: number,
  intensity: number = 1.0
): void {
  // Whip tongues are anchored; other organic projectiles experience subtle crosswind
  if (b.tng) return;
  const driftRate = 22 * intensity;
  b.vx += windX * driftRate * dt;
  b.vy += windY * (driftRate * 0.35) * dt;
}
