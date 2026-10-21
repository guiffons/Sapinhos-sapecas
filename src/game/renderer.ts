/**
 * High-Craft 2.5D Pixel Art Renderer (Enter the Gungeon & Forager Aesthetic)
 */

import {
  CH,
  WP,
  IT,
  TH,
  RAR_INFO,
  BOSS_NAMES,
  LAYOUT_NMS,
  DEFAULT_BINDS,
  PACT_LIST,
  SWAMP_RUNES,
  formatKeyLabel,
} from './constants.ts';
import { getFrogMouthOrigin } from './physics.ts';
import type { GameEngine } from './engine.ts';
import { W, H, M, clamp, sil, glow } from './engine.ts';
import type { DungeonCell } from './dungeon.ts';

export function drawText(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  c = '#e8f5e9',
  a: CanvasTextAlign = 'left',
  sz = 7
) {
  const pxSz = sz <= 5 ? 5 : Math.max(6, Math.round(sz));
  const rx = Math.round(x);
  const ry = Math.round(y);
  g.font = `400 ${pxSz}px "Press Start 2P", "Silkscreen", monospace`;
  g.textAlign = a;

  // Crisp 4-way integer pixel outline + drop shadow (zero blurry strokeText or faux-bold smearing)
  g.fillStyle = '#020603';
  g.fillText(s, rx - 1, ry);
  g.fillText(s, rx + 1, ry);
  g.fillText(s, rx, ry - 1);
  g.fillText(s, rx, ry + 1);
  g.fillText(s, rx + 1, ry + 1);

  g.fillStyle = c;
  g.fillText(s, rx, ry);
}

/**
 * Subtle Swamp Scenery Idle Animation: Ambient Slime Bubbles rising and popping on the swamp floor
 */
export function drawSwampIdleBubbles(eng: GameEngine) {
  if (!eng.swampBubbles || !eng.swampBubbles.length) return;
  const g = eng.ctx;
  g.save();
  for (const b of eng.swampBubbles) {
    if (b.pop > 0) {
      // Gentle pop ripple ring
      const prog = 1 - b.pop / 0.22;
      const rad = b.maxR + prog * 3.5;
      g.globalAlpha = clamp((1 - prog) * 0.42, 0, 0.42);
      g.strokeStyle = b.col;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(b.x, b.y, rad * 1.15, rad * 0.7, 0, 0, 7);
      g.stroke();
    } else if (b.r > 0.4) {
      // Translucent swamp slime bubble with tiny specular dot
      g.globalAlpha = 0.28;
      g.fillStyle = '#071a0e';
      g.beginPath();
      g.ellipse(b.x, b.y, b.r * 1.1, b.r * 0.85, 0, 0, 7);
      g.fill();

      g.globalAlpha = 0.42;
      g.strokeStyle = b.col;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(b.x, b.y, b.r * 1.05, b.r * 0.8, 0, 0, 7);
      g.stroke();

      if (b.r > 1.3) {
        g.globalAlpha = 0.55;
        g.fillStyle = '#e8f5e9';
        g.fillRect(Math.round(b.x - b.r * 0.45), Math.round(b.y - b.r * 0.45), 1.2, 1.2);
      }
    }
  }
  g.restore();
}

/**
 * Acid Rain & Swamp Storm Particle System:
 * - Streaks of toxic acid drizzle drifting with the swamp wind
 * - Atmospheric fog overlay reducing visibility based on weather intensity
 * - Thunderous lightning flashes during swamp storms
 */
export function drawWeather(eng: GameEngine) {
  if (eng.ST === 'camp' || !eng.weather || eng.weather.type === 'none') return;
  const g = eng.ctx;
  const w = eng.weather;

  g.save();

  // 1. Swamp storm & acid drizzle fog overlay (reduces visibility slightly)
  if (w.fogDensity > 0) {
    const stormTint = w.type === 'swamp_storm' ? 'rgba(6, 22, 14, ' : 'rgba(10, 30, 18, ';
    g.fillStyle = `${stormTint}${w.fogDensity})`;
    g.fillRect(0, 0, W, H);
  }

  // 2. Acid rain streaks
  const windSkew = w.windX * 0.045;
  g.lineWidth = 1.1;
  g.lineCap = 'round';
  for (let i = 0; i < w.drops.length; i++) {
    const d = w.drops[i];
    g.globalAlpha = d.alpha * clamp(w.intensity, 0.4, 1.4);
    g.strokeStyle = d.col;
    g.beginPath();
    g.moveTo(Math.round(d.x), Math.round(d.y));
    g.lineTo(Math.round(d.x + windSkew * (d.len / 6)), Math.round(d.y + d.len));
    g.stroke();
  }

  // 3. Lightning flash during storms
  if (w.flashAlpha > 0) {
    g.globalAlpha = w.flashAlpha;
    g.fillStyle = '#e0f7fa';
    g.fillRect(0, 0, W, H);
  }

  g.restore();
}

export function getMutatedFrogSprite(
  eng: GameEngine,
  cIdx: number,
  wf: number,
  puff: number,
  isBlink: boolean,
  itCnt: number,
  synCnt: number
): HTMLCanvasElement {
  const stage = itCnt >= 4 || synCnt > 0 ? 2 : itCnt >= 2 ? 1 : 0;
  if (stage === 2 && eng.S.pIdleMut2) {
    return puff > 0
      ? eng.S.pPuffMut2[cIdx]
      : wf
      ? eng.S.pWalkMut2[cIdx]
      : eng.S.pIdleMut2[cIdx];
  }
  if (stage === 1 && eng.S.pIdleMut1) {
    return puff > 0
      ? eng.S.pPuffMut1[cIdx]
      : wf
      ? eng.S.pWalkMut1[cIdx]
      : eng.S.pIdleMut1[cIdx];
  }
  return puff > 0
    ? eng.S.pPuff[cIdx]
    : wf
    ? eng.S.pWalk[cIdx]
    : isBlink && eng.S.pBlink
    ? eng.S.pBlink[cIdx]
    : eng.S.pIdle[cIdx];
}

/**
 * Organic Mouth Spit & Vocal Sac Attack Animation (Zero Held Guns, Exact Frog Mouth Origin!)
 */
export function drawMouthAttackAnim(
  eng: GameEngine,
  x: number,
  y: number,
  z: number,
  ang: number,
  wIdx: number,
  puff: number
) {
  if (puff <= 0) return;
  const g = eng.ctx;
  const w = WP[wIdx] || WP[0];
  const prog = clamp(1 - puff / 0.24, 0, 1);
  const sinP = Math.sin(prog * Math.PI);

  // Exact mouth origin calculated from the frog sprite geometry
  const mouth = getFrogMouthOrigin(x, y, z, ang, 1, 0, 0);
  const mx = mouth.x;
  const my = mouth.y;

  g.save();
  g.translate(Math.round(mx), Math.round(my));
  g.rotate(ang);

  // 1. Inflated Vocal Throat Sac Pulse
  g.fillStyle = w.col + '55';
  g.beginPath();
  g.arc(-2, 2, 4.2 * sinP, 0, 7);
  g.fill();

  // 2. Short Tongue Flick on Spit (for non-whip frogs; Dart wIdx===3 has an always-out Castlevania whip!)
  if (wIdx !== 3) {
    const tngLen = 7.5 * sinP;
    if (tngLen > 1) {
      g.fillStyle = '#3b0718';
      g.fillRect(-1, -2.2, tngLen + 2, 4.4);
      g.fillStyle = '#ff4081';
      g.fillRect(0, -1.5, tngLen, 3.0);
      g.fillStyle = '#ff80ab';
      g.fillRect(1, -0.7, Math.max(1, tngLen - 1.5), 1.2);
    }
  }

  // 3. Expanding Organic Spit / Vocal Shockwave Ring & Saliva Droplets
  const waveDist = 3 + prog * 11;
  const waveR = 2.8 + sinP * (wIdx === 4 ? 6.5 : 4.5);
  g.strokeStyle = w.col;
  g.lineWidth = 1.5;
  g.globalAlpha = clamp(1 - prog * 0.85, 0.15, 0.95);
  g.beginPath();
  g.ellipse(waveDist, 0, waveR * 0.65, waveR, 0, -1.3, 1.3);
  g.stroke();

  if (puff > 0.11) {
    g.fillStyle = '#ffffff';
    g.fillRect(2, -1.2, 3.5, 2.5);
    g.fillStyle = w.col;
    g.fillRect(5 + prog * 5, -3.5 * sinP, 2.2, 2.2);
    g.fillRect(5 + prog * 5, 3.5 * sinP - 2, 2.2, 2.2);
  }

  g.restore();
}

export function drawFrogExtras(
  eng: GameEngine,
  px: number,
  py: number,
  z: number,
  ang: number,
  wIdx: number,
  puff: number,
  fly: number,
  sh: number,
  fam: number,
  clone: number,
  itCnt: number,
  cIdx: number,
  synCnt = 0,
  its: number[] = []
) {
  const g = eng.ctx;
  const ey = py - z;
  const stage = itCnt >= 4 || synCnt > 0 ? 2 : itCnt >= 2 ? 1 : 0;

  // Biological Evolution Aura
  if (stage >= 1) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = (stage === 2 ? 0.36 : 0.2) + Math.sin(eng.TT * 8) * 0.06;
    g.drawImage(
      glow(stage === 2 ? '#ffd54f' : CH[cIdx]?.a || '#00e676'),
      px - 20,
      ey - 20,
      40,
      40
    );
    g.restore();
  }

  // Visible Body Mutations on the Frog Sprite! (Small, cool, readable visual changes per mutation)
  // 1) Poison / Acid Cheek Glands (Mutations 0, 7, 9, 15)
  if (its.includes(0) || its.includes(7) || its.includes(9) || its.includes(15)) {
    const pulse = Math.sin(eng.TT * 10) * 0.8;
    g.fillStyle = '#1b5e20';
    g.fillRect(px - 12, ey - 9, 4, 4);
    g.fillRect(px + 8, ey - 9, 4, 4);
    g.fillStyle = '#76ff03';
    g.fillRect(px - 11, ey - 8 + pulse * 0.3, 2.5, 2.5);
    g.fillRect(px + 8.5, ey - 8 - pulse * 0.3, 2.5, 2.5);
  }

  // 1b) Pressurized Rapid-Saliva / Hyper Gland Dewdrops (Mutations 1, 14)
  if (its.includes(1) || its.includes(14)) {
    g.fillStyle = '#00e5ff';
    g.fillRect(px - 10, ey - 5, 2, 2);
    g.fillRect(px + 8, ey - 5, 2, 2);
  }

  // 1c) Spring Hind-Leg Bands (Mutation 3)
  if (its.includes(3)) {
    g.fillStyle = '#69f0ae';
    g.fillRect(px - 9, ey - 1, 3, 2);
    g.fillRect(px + 6, ey - 1, 3, 2);
  }

  // 1d) Dorsal Vitality Gem / Rear Eyes (Mutations 2, 10, 16)
  if (its.includes(2) || its.includes(10) || its.includes(16)) {
    g.fillStyle = its.includes(16) ? '#ffd54f' : '#ff4081';
    g.fillRect(px - 2, ey - 15, 4, 2);
  }

  // 2) Mutant Dorsal Spikes / Bio-Horns (Stage >= 1 or Mutations 4, 8, 16)
  if (stage >= 1 || its.includes(4) || its.includes(8)) {
    g.fillStyle = stage === 2 ? '#ffd54f' : '#00e5ff';
    g.fillRect(px - 8, ey - 18, 2, 3);
    g.fillRect(px + 6, ey - 18, 2, 3);
  }

  // 3) Vampire Fangs on Mouth (Mutation 12)
  if (its.includes(12)) {
    g.fillStyle = '#ffffff';
    g.fillRect(px - 4, ey - 6, 2, 3);
    g.fillRect(px + 2, ey - 6, 2, 3);
    g.fillStyle = '#ff1744';
    g.fillRect(px - 4, ey - 4, 2, 1);
    g.fillRect(px + 2, ey - 4, 2, 1);
  }

  // 4) Psychic Floating 3rd Eye (Mutation 5)
  if (its.includes(5)) {
    const fy = ey - 20 + Math.sin(eng.TT * 7) * 1.5;
    g.fillStyle = '#311b92';
    g.fillRect(px - 3, fy - 2, 6, 4);
    g.fillStyle = '#e040fb';
    g.fillRect(px - 2, fy - 1, 4, 2);
    g.fillStyle = '#ffffff';
    g.fillRect(px - 1, fy - 1, 2, 1);
  }

  // 5) Bio-Electric Sparks (Mutation 18)
  if (its.includes(18)) {
    const sa = eng.TT * 12;
    g.fillStyle = '#00e5ff';
    g.fillRect(px + Math.cos(sa) * 13 - 1, ey - 8 + Math.sin(sa) * 9 - 1, 2, 2);
    g.fillStyle = '#ffd54f';
    g.fillRect(px - Math.cos(sa) * 13 - 1, ey - 8 - Math.sin(sa) * 9 - 1, 2, 2);
  }

  // 5b) Equipped Swamp Runes Subtle Orbiting Sigils
  if (eng.activeRunes && eng.activeRunes.length > 0) {
    eng.activeRunes.forEach((rId, rIdx) => {
      const rDef = SWAMP_RUNES.find((r) => r.id === rId);
      if (!rDef) return;
      const ra = eng.TT * 2.8 + rIdx * Math.PI;
      const rx = px + Math.cos(ra) * 15;
      const ry = ey - 6 + Math.sin(ra) * 8;
      g.fillStyle = '#050a07';
      g.fillRect(rx - 2, ry - 2, 4, 4);
      g.fillStyle = rDef.col;
      g.fillRect(rx - 1.2, ry - 1.2, 2.4, 2.4);
    });
  }

  // Dragonfly Wings (Mutation 13 or Hypno-Toad)
  if (fly) {
    const wy = ey - 10 + Math.sin(eng.TT * 26) * 2.5;
    g.save();
    g.globalAlpha = 0.88;
    g.drawImage(eng.S.items[13], px - 12, wy - 8, 24, 18);
    g.restore();
  }

  // Organic Mouth Attack Animation (Spit / Tongue Lash / Vocal Wave)
  drawMouthAttackAnim(eng, px, py, z, ang, wIdx, puff);

  // Bubble Shield
  if (sh > 0) {
    g.save();
    g.strokeStyle = '#40c4ff';
    g.lineWidth = 1.6;
    g.globalAlpha = 0.65 + Math.sin(eng.TT * 6) * 0.15;
    g.beginPath();
    g.arc(px, ey - 5, 16, 0, 7);
    g.stroke();
    g.fillStyle = '#80d8ff1a';
    g.fill();
    g.restore();
  }

  // Clone Spirit
  if (clone) {
    const cx = px - Math.cos(ang) * 18;
    const cy = ey - Math.sin(ang) * 18;
    eng.dspr(sil(eng.S.pIdle[cIdx], '#00e5ff'), cx, cy, 0, 0.55, 0, 0.9);
  }

  // Tadpole Guardians
  for (let f = 0; f < (fam || 0); f++) {
    const fa = eng.TT * 3.8 + f * 3.14;
    const fx = px + Math.cos(fa) * 24;
    const fy = ey - 4 + Math.sin(fa) * 16;
    g.drawImage(eng.S.items[11], fx - 8, fy - 8, 16, 16);
  }

  // Mutation 17 Golden Bio-Sparks (No intrusive crown blocking the frog's head/aim!)
  if (its.includes(17)) {
    const ga = eng.TT * 6;
    g.fillStyle = '#1a0f00';
    g.fillRect(Math.round(px + Math.cos(ga) * 14) - 2, Math.round(ey - 10 + Math.sin(ga) * 6) - 2, 4, 4);
    g.fillStyle = '#ffd54f';
    g.fillRect(Math.round(px + Math.cos(ga) * 14) - 1, Math.round(ey - 10 + Math.sin(ga) * 6) - 1, 2, 2);
  }
}

export function drawMenuDiorama(eng: GameEngine) {
  const g = eng.ctx;
  const t = eng.TT;
  g.save();
  g.imageSmoothingEnabled = false;

  // 1. Deep 16-bit Pixel Swamp Night Water Tiles & Dithered Depth (Full Widescreen Coverage)
  const startTileX = -Math.ceil((eng.viewOx || 0) / 32) - 1;
  const endTileX = 15 + Math.ceil((eng.viewOx || 0) / 32) + 1;
  const startTileY = -Math.ceil((eng.viewOy || 0) / 32) - 1;
  const endTileY = 10 + Math.ceil((eng.viewOy || 0) / 32) + 1;

  for (let i = startTileX; i < endTileX; i++) {
    for (let j = startTileY; j < endTileY; j++) {
      const tx = i * 32;
      const ty = j * 32;
      const checker = Math.abs(i + j) % 2 === 0;
      g.fillStyle = checker ? '#081810' : '#0b2015';
      g.fillRect(tx, ty, 32, 32);

      // Pixel water shimmer & dithered tile accents
      const waveOff = Math.round(Math.sin(t * 2.2 + i * 0.9 + j * 1.3) * 2) * 2;
      g.fillStyle = checker ? '#0f291b' : '#123020';
      g.fillRect(tx + 4 + waveOff, ty + 8, 10, 2);
      g.fillRect(tx + 16 - waveOff, ty + 22, 8, 2);

      // Animated pixel water ripple rings
      if (Math.abs(i * 7 + j * 13) % 4 === 0) {
        const rx = tx + 16;
        const ry = ty + 16;
        const phase = (t * 0.85 + Math.abs(i) * 0.3 + Math.abs(j) * 0.5) % 1;
        const rw = Math.round((4 + phase * 10) / 2) * 2;
        const rh = Math.round((2 + phase * 5) / 2) * 2;
        g.fillStyle = phase < 0.5 ? '#1e4d32' : '#143823';
        g.fillRect(rx - rw, ry - 1, rw * 2, 2);
        g.fillRect(rx - 1, ry - rh, 2, rh * 2);
      }
    }
  }

  // 2. Top Silhouetted Swamp Canopy & Hanging Pixel Vines across full widescreen top edge
  const minX = -(eng.viewOx || 0);
  const maxX = W + (eng.viewOx || 0);
  const topY = -(eng.viewOy || 0);
  g.fillStyle = '#040c07';
  g.fillRect(minX, topY, maxX - minX, 18);
  for (let x = minX; x < maxX; x += 16) {
    const vh = 10 + (Math.abs(x * 13) % 18) + Math.round(Math.sin(t * 2 + x * 0.05) * 2);
    const sway = Math.round(Math.sin(t * 1.8 + x * 0.1) * 2);
    g.fillStyle = '#07140c';
    g.fillRect(x + sway, topY + 14, 10, 8);
    g.fillStyle = '#143620';
    g.fillRect(x + 4 + sway, topY + 16, 2, vh);
    if (Math.abs(x) % 48 === 0) {
      g.fillStyle = '#00e676';
      g.fillRect(x + 4 + sway, topY + 16 + vh, 2, 2);
    }
  }

  // 3. Central Mossy Campfire Sanctuary Island in Background
  const ix = 240;
  const iy = 172;
  g.fillStyle = '#040b07';
  g.fillRect(ix - 56, iy - 22, 112, 52);
  g.fillStyle = '#16301f';
  g.fillRect(ix - 52, iy - 24, 104, 48);
  g.fillStyle = '#1f422b';
  g.fillRect(ix - 46, iy - 20, 92, 40);
  g.fillStyle = '#2e241a';
  g.fillRect(ix - 28, iy - 12, 56, 26);

  // Corner swamp pillars & glowing crystals
  const obSpr = eng.S.obs?.[0];
  if (obSpr) {
    [[34, 46], [418, 48], [30, 248], [422, 246]].forEach(([px, py], idx) => {
      g.fillStyle = '#030805';
      g.fillRect(px - 2, py + 20, 32, 8);
      g.drawImage(obSpr, px, py, 28, 24);
      if (eng.S.flora?.[idx % 3]) {
        const flSpr = ((t * 2 + idx) | 0) % 2 === 0 ? eng.S.flora[idx % 3] : eng.S.flora2?.[idx % 3] || eng.S.flora[idx % 3];
        g.drawImage(flSpr, px + (idx % 2 === 0 ? 22 : -12), py + 10);
      }
    });
  }

  // Crackling Pixel Campfire & Bubbling Cauldron on Central Island
  if (eng.S.campfire) {
    const cf = eng.S.campfire[((t * 8) | 0) % 2];
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55 + Math.sin(t * 10) * 0.12;
    g.drawImage(glow('#ff9100'), ix - 48, iy - 48, 96, 96);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    eng.dspr(cf, ix - 12, iy, Math.sin(t * 10) * 0.04, 1, 0, 1.1);
  }
  if (eng.S.cauldron) {
    const caul = eng.S.cauldron[((t * 5.5) | 0) % 3];
    eng.dspr(caul, ix + 20, iy + 2, Math.sin(t * 7) * 0.03, 1, 0, 1.0);
  }

  // 4. Dynamic Pixel-Art Lilypads with Hopping Frogs & Live Tongue/Fly Action!
  const flySpr = eng.S.flyGold ? eng.S.flyGold[((t * 12) | 0) % 2] : null;

  for (let i = 0; i < 6; i++) {
    const baseAng = t * 0.32 + (i * Math.PI * 2) / 6;
    const lx = Math.round((240 + Math.cos(baseAng) * 168) / 2) * 2;
    const ly = Math.round((168 + Math.sin(baseAng) * 96) / 2) * 2;

    // Pixel-art stepped lilypad shadow & pad
    g.fillStyle = '#040a06';
    g.fillRect(lx - 18, ly - 6, 36, 20);
    g.fillRect(lx - 14, ly - 10, 28, 26);

    g.fillStyle = '#1b5e20';
    g.fillRect(lx - 18, ly - 8, 36, 18);
    g.fillRect(lx - 14, ly - 12, 28, 24);

    g.fillStyle = '#2e7d32';
    g.fillRect(lx - 16, ly - 6, 32, 14);
    g.fillRect(lx - 12, ly - 10, 24, 20);

    // Highlight rim & lilypad notch
    g.fillStyle = '#66bb6a';
    g.fillRect(lx - 12, ly - 10, 20, 2);
    g.fillRect(lx - 16, ly - 6, 4, 6);
    g.fillStyle = '#081810';
    g.fillRect(lx + 10, ly - 2, 8, 4);

    // Occasional lotus flower on alternating pads
    if (i % 2 === 0 && eng.S.flora?.[2]) {
      g.drawImage(eng.S.flora[2], lx - 20, ly - 8, 12, 10);
    }

    // Frog hopping on pad with cute blink, croak puff & occasional tongue snap at a fly!
    const idx = i % CH.length;
    const snapCycle = (t * 1.4 + i * 1.7) % 4.5;
    const isSnapping = snapCycle > 3.85 && snapCycle < 4.35;
    const isPuff = isSnapping || Math.sin(t * 5 + i * 2) > 0.84;
    const isBlink = !isPuff && ((t * 1.4 + i * 0.8) % 3.2) > 2.85;
    const fSpr = isPuff
      ? eng.S.pPuff[idx]
      : isBlink && eng.S.pBlink
      ? eng.S.pBlink[idx]
      : eng.S.pIdle[idx];
    const hopPhase = (t * 3.6 + i * 1.1) % (Math.PI * 2);
    const hopZ = Math.max(0, Math.sin(hopPhase)) * 8;
    const squash = Math.cos(hopPhase) * 0.1;
    const flipX = Math.sin(baseAng) > 0 ? -1 : 1;
    eng.dspr(fSpr, lx, ly - 2, squash, 0.96, 0, 1.0, hopZ, '', flipX);

    // Buzzing Golden Fly near this frog
    const flyX = Math.round(lx + flipX * (26 + Math.cos(t * 4 + i) * 8));
    const flyY = Math.round(ly - 14 - hopZ + Math.sin(t * 6 + i) * 6);
    if (flySpr) {
      g.drawImage(flySpr, flyX - 6, flyY - 5, 12, 10);
    }

    // Crisp Pixel-Art Tongue Whip Snap toward the fly!
    if (isSnapping) {
      const snapProg = Math.sin(((snapCycle - 3.85) / 0.5) * Math.PI);
      const startX = lx + flipX * 4;
      const startY = Math.round(ly - hopZ);
      const endX = startX + (flyX - startX) * snapProg;
      const endY = startY + (flyY - startY) * snapProg;
      const steps = 6;
      for (let s = 0; s <= steps; s++) {
        const px = Math.round((startX + ((endX - startX) * s) / steps) / 2) * 2;
        const py = Math.round((startY + ((endY - startY) * s) / steps) / 2) * 2;
        g.fillStyle = '#240612';
        g.fillRect(px - 1, py - 1, 4, 4);
        g.fillStyle = '#ff4081';
        g.fillRect(px, py, 2, 2);
      }
      const tx = Math.round(endX / 2) * 2;
      const ty = Math.round(endY / 2) * 2;
      g.fillStyle = '#ffcdd2';
      g.fillRect(tx, ty, 2, 2);
    }
  }

  // 5. Glowing Bioluminescent Pixel Fireflies & Swamp Spores
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const fx = Math.round(((i * 83 + Math.sin(t * 0.9 + i) * 55 + W) % W) / 2) * 2;
    const fy = Math.round(((i * 59 + Math.cos(t * 1.1 + i * 2) * 45 + H) % H) / 2) * 2;
    const col = i % 3 === 0 ? '#00e5ff' : i % 2 ? '#76ff03' : '#ffd54f';
    g.globalAlpha = 0.38 + Math.sin(t * 4.5 + i) * 0.28;
    g.drawImage(glow(col), fx - 14, fy - 14, 28, 28);
    g.fillStyle = '#ffffff';
    g.fillRect(fx - 1, fy - 1, 2, 2);
  }
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.drawImage(eng.VIG, 0, 0);
  g.restore();
}

export function buildCampBgCanvas(eng: GameEngine): HTMLCanvasElement {
  if (eng.CAMP_BG) return eng.CAMP_BG;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;

  // Base dark swamp grass tiles (Forager style rich checkerboard)
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 10; j++) {
      const tx = i * 32;
      const ty = j * 32;
      x.fillStyle = (i + j) % 2 ? '#152b1b' : '#183220';
      x.fillRect(tx, ty, 32, 32);
      // Subtle pixel grass blades & pebbles
      const h = (i * 23 + j * 41) % 7;
      if (h < 3) {
        x.fillStyle = '#204229';
        x.fillRect(tx + 6 + h * 6, ty + 8 + h * 5, 2, 4);
        x.fillRect(tx + 9 + h * 6, ty + 6 + h * 5, 2, 5);
      } else if (h === 4) {
        x.fillStyle = '#0e1f13';
        x.fillRect(tx + 18, ty + 20, 4, 3);
      }
    }
  }

  // 2.5D Outer Stone Sanctuary Border Wall
  x.fillStyle = '#0d1a11';
  x.fillRect(0, 0, W, 24);
  x.fillRect(0, H - 14, W, 14);
  x.fillRect(0, 0, 16, H);
  x.fillRect(W - 16, 0, 16, H);
  for (let i = 16; i < W - 16; i += 16) {
    x.fillStyle = (i / 16) % 2 ? '#1c3323' : '#15261a';
    x.fillRect(i + 1, 2, 14, 10);
    x.fillStyle = '#0f1d14';
    x.fillRect(i + 1, 13, 14, 9);
  }

  // Central Cobblestone & Dirt Campfire Clearing
  x.fillStyle = '#241d15';
  x.beginPath();
  x.ellipse(240, 176, 112, 68, 0, 0, 7);
  x.fill();
  x.fillStyle = '#30271c';
  x.beginPath();
  x.ellipse(240, 176, 92, 54, 0, 0, 7);
  x.fill();
  // Stone ring bricks around clearing
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2;
    const sx = 240 + Math.cos(ang) * 108;
    const sy = 176 + Math.sin(ang) * 65;
    x.fillStyle = a % 2 ? '#37474f' : '#263238';
    x.fillRect(sx - 4, sy - 3, 8, 6);
  }

  // Path leading North to the Dungeon Portal
  for (let py = 56; py < 118; py += 14) {
    x.fillStyle = '#2d3b32';
    x.fillRect(222, py, 36, 10);
    x.fillStyle = '#455a64';
    x.fillRect(224, py + 1, 32, 7);
  }

  // Shaman's Bioluminescent Pool (Bottom Left)
  x.fillStyle = '#07171c';
  x.beginPath();
  x.ellipse(92, 238, 46, 28, 0, 0, 7);
  x.fill();
  x.fillStyle = '#0d2b36';
  x.beginPath();
  x.ellipse(92, 238, 40, 23, 0, 0, 7);
  x.fill();
  x.strokeStyle = '#00e5ff';
  x.lineWidth = 1.5;
  x.beginPath();
  x.ellipse(92, 238, 36, 19, 0, 0, 7);
  x.stroke();

  // Wooden Training Arena Pad (Top Left for Dummy)
  x.fillStyle = '#2b1d12';
  x.fillRect(52, 126, 72, 46);
  x.strokeStyle = '#5d4037';
  x.lineWidth = 2;
  x.strokeRect(52, 126, 72, 46);

  return (eng.CAMP_BG = c);
}

export function buildRoomBgCanvas(
  eng: GameEngine,
  bIdx: number,
  cell: DungeonCell,
  key: string
): HTMLCanvasElement {
  if (eng.BG_CACHE[key]) return eng.BG_CACHE[key];
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  const t = TH[bIdx] || TH[0];

  // 1. Outer Chiseled Stone Wall (Enter the Gungeon style 2.5D border)
  x.fillStyle = '#060c08';
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < W; i += 16) {
    for (let j = 0; j < H; j += 8) {
      if (i < M || i >= W - M || j < M || j >= H - M) {
        const isLight = (i / 16 + j / 8) % 2 === 0;
        x.fillStyle = isLight ? t.wl : t.w;
        x.fillRect(i + 1, j + 1, 14, 6);
        if (isLight) {
          x.fillStyle = '#ffffff0d';
          x.fillRect(i + 1, j + 1, 14, 2);
        }
      }
    }
  }

  // 2. 2.5D North Wall Front Cliff Face (14px relief above floor)
  x.fillStyle = '#070f0a';
  x.fillRect(M, M - 14, W - M * 2, 14);
  for (let i = M; i < W - M; i += 16) {
    x.fillStyle = t.wl;
    x.fillRect(i + 1, M - 13, 14, 6);
    x.fillStyle = t.w;
    x.fillRect(i + 1, M - 6, 14, 5);
    // Hanging moss / vines
    if ((i * 7 + bIdx) % 3 === 0) {
      x.fillStyle = t.a + '66';
      x.fillRect(i + 5, M - 12, 3, 9);
      x.fillRect(i + 8, M - 10, 2, 6);
    }
  }

  // 3. Checkered 32x32 Dungeon Stone Floor with Cracks, Moss & Pebbles
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 8; j++) {
      const tx = M + i * 32;
      const ty = M + j * 32;
      x.fillStyle = (i + j) % 2 ? t.f1 : t.f2;
      x.fillRect(tx, ty, 32, 32);

      // Beveled tile edge
      x.fillStyle = '#ffffff08';
      x.fillRect(tx, ty, 31, 1);
      x.fillRect(tx, ty, 1, 31);
      x.fillStyle = '#00000028';
      x.fillRect(tx + 31, ty, 1, 32);
      x.fillRect(tx, ty + 31, 32, 1);

      const h = (i * 19 + j * 37 + bIdx * 11) % 15;
      if (h < 3) {
        // Stone crack
        x.fillStyle = '#00000044';
        x.fillRect(tx + 7 + h * 4, ty + 9 + h * 3, 5, 2);
        x.fillRect(tx + 10 + h * 4, ty + 11 + h * 3, 2, 4);
      } else if (h === 4 || h === 9) {
        // Moss / bioluminescent floor speck
        x.fillStyle = t.a + '33';
        x.fillRect(tx + 12, ty + 14, 4, 3);
        x.fillRect(tx + 15, ty + 12, 3, 4);
      }
    }
  }

  // 4. Recessed 2.5D Water / Slime Pools
  const hz = eng.hazards();
  for (const w of hz.water) {
    x.fillStyle = '#050c09';
    x.beginPath();
    x.ellipse(w.x, w.y, w.rx + 4, w.ry + 4, 0, 0, 7);
    x.fill();
    x.fillStyle = t.hz;
    x.beginPath();
    x.ellipse(w.x, w.y, w.rx, w.ry, 0, 0, 7);
    x.fill();
    x.strokeStyle = t.a;
    x.globalAlpha = 0.4;
    x.lineWidth = 1.5;
    x.beginPath();
    x.ellipse(w.x, w.y, w.rx - 3, w.ry - 3, 0, 0, 7);
    x.stroke();
    x.globalAlpha = 1;
  }

  // 5. Ambient Occlusion Wall Shadows
  const sgN = x.createLinearGradient(0, M, 0, M + 20);
  sgN.addColorStop(0, '#000000aa');
  sgN.addColorStop(1, '#00000000');
  x.fillStyle = sgN;
  x.fillRect(M, M, W - M * 2, 20);

  // 6. Crisp Inner Arena Frame
  x.strokeStyle = '#050a07';
  x.lineWidth = 4;
  x.strokeRect(M - 2, M - 2, W - M * 2 + 4, H - M * 2 + 4);
  x.strokeStyle = t.a;
  x.lineWidth = 1.2;
  x.strokeRect(M - 1, M - 1, W - M * 2 + 2, H - M * 2 + 2);

  return (eng.BG_CACHE[key] = c);
}

export function drawDoor4(
  eng: GameEngine,
  dir: 'N' | 'S' | 'W' | 'E',
  cell: DungeonCell
) {
  if (!cell || !cell.doors[dir]) return;
  const g = eng.ctx;
  const o = eng.wd.clear;
  let nx = cell.gx;
  let ny = cell.gy;
  if (dir === 'N') ny--;
  else if (dir === 'S') ny++;
  else if (dir === 'W') nx--;
  else if (dir === 'E') nx++;

  const nb = eng.wd.grid?.[ny]?.[nx];
  const isBoss = nb?.type === 'boss';
  const isLocked = nb?.locked;
  const isShop = nb?.type === 'shop';
  const col = isBoss
    ? '#ff1744'
    : isLocked
    ? '#ffd54f'
    : isShop
    ? '#00e5ff'
    : o
    ? '#69f0ae'
    : '#ff5252';

  if (dir === 'N' || dir === 'S') {
    const dy = dir === 'N' ? 0 : H - M;
    // Stone doorframe pillars
    g.fillStyle = '#263238';
    g.fillRect(214, dy, 52, M);
    g.fillStyle = o ? '#040806' : '#241612';
    g.fillRect(220, dy, 40, M);
    // Glowing threshold bar
    g.fillStyle = col;
    g.fillRect(220, dir === 'N' ? M - 3 : H - M, 40, 3);
    if (!o) {
      // Iron portcullis bars when locked in combat
      g.fillStyle = '#546e7a';
      for (let i = 0; i < 4; i++) g.fillRect(226 + i * 8, dy + 2, 3, M - 4);
    }
    if (isBoss) g.drawImage(eng.S.skull, 240 - eng.S.skull.width / 2, dy + 8);
    else if (isLocked) g.drawImage(eng.S.lock, 240 - eng.S.lock.width / 2, dy + 8);
  } else {
    const dx = dir === 'W' ? 0 : W - M;
    g.fillStyle = '#263238';
    g.fillRect(dx, 134, M, 52);
    g.fillStyle = o ? '#040806' : '#241612';
    g.fillRect(dx, 140, M, 40);
    g.fillStyle = col;
    g.fillRect(dir === 'W' ? M - 3 : W - M, 140, 3, 40);
    if (!o) {
      g.fillStyle = '#546e7a';
      for (let i = 0; i < 4; i++) g.fillRect(dx + 2, 146 + i * 8, M - 4, 3);
    }
    if (isBoss) g.drawImage(eng.S.skull, dx + 8, 160 - eng.S.skull.height / 2);
    else if (isLocked) g.drawImage(eng.S.lock, dx + 8, 160 - eng.S.lock.height / 2);
  }
}

export function renderCampScene(eng: GameEngine) {
  const g = eng.ctx;
  g.drawImage(buildCampBgCanvas(eng), 0, 0);

  // Subtle Swamp Scenery Idle Animation: Slime Bubbles rising & popping on the floor
  drawSwampIdleBubbles(eng);

  // 1. Runic Dungeon Portal at Top (240, 48)
  const px = eng.camp.portal.x;
  const py = eng.camp.portal.y;
  g.fillStyle = '#1c262b';
  g.beginPath();
  g.ellipse(px, py, 38, 22, 0, 0, 7);
  g.fill();
  g.strokeStyle = '#69f0ae';
  g.lineWidth = 2.5;
  g.beginPath();
  g.ellipse(
    px,
    py,
    30 + Math.sin(eng.TT * 6) * 2.5,
    15 + Math.cos(eng.TT * 6) * 1.5,
    0,
    0,
    7
  );
  g.stroke();

  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.7 + Math.sin(eng.TT * 5) * 0.15;
  g.drawImage(glow('#00e676'), px - 42, py - 42, 84, 84);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;

  const intK = formatKeyLabel(eng.CFG?.binds?.interact || DEFAULT_BINDS.interact);
  if (Math.hypot(eng.me.x - px, eng.me.y - py) < 54) {
    drawText(g, 'PORTAL DA MASMORRA', px, py - 24, '#69f0ae', 'center', 6);
  }

  // 2. Biome Selector Sign (382, 118)
  const sx = eng.camp.sign.x;
  const sy = eng.camp.sign.y;
  eng.dspr(eng.S.sign, sx, sy, 0, 1, 0, 1.1);
  if (Math.hypot(eng.me.x - sx, eng.me.y - sy) < 36) {
    drawText(
      g,
      `[${intK}] BIOMA: ${TH[eng.camp.sign.bIdx].nm.toUpperCase()}`,
      sx,
      sy - 20,
      '#ffd54f',
      'center',
      6
    );
  }

  // 2b. Swamp Runes Pedestal (Pedra das Runas do Pântano at 396, 224)
  const rx = eng.camp.pactAltar.x;
  const ry = eng.camp.pactAltar.y;
  const eqCount = eng.activeRunes?.length || 0;
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.45 + Math.sin(eng.TT * 5) * 0.15;
  g.drawImage(glow(eqCount > 0 ? '#ffd54f' : '#e040fb'), rx - 26, ry - 26, 52, 52);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  eng.dspr(eng.S.shrine, rx, ry, Math.sin(eng.TT * 4) * 0.04, 1, 0, 1.2);
  if (Math.hypot(eng.me.x - rx, eng.me.y - ry) < 36) {
    drawText(g, `[${intK}] RUNAS (${eqCount}/2)`, rx, ry - 22, '#ffd54f', 'center', 6);
  }

  // 3. Training Dummy & Real-Time DPS Meter (88, 152)
  const dm = eng.camp.dummy;
  eng.dspr(
    eng.S.dummy,
    dm.x,
    dm.y,
    dm.j + Math.sin(eng.TT * 4) * 0.03,
    1,
    dm.fl > 0 ? 1 : 0,
    1.2
  );

  // 4. Old Grandpa Shaman Frog with Wooden Staff & Bubbling Magic Cauldron (92, 236)
  const shx = eng.camp.shaman.x;
  const shy = eng.camp.shaman.y;
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.68 + Math.sin(eng.TT * 6) * 0.16;
  g.drawImage(glow('#00e5ff'), shx - 36, shy - 36, 72, 72);
  g.globalAlpha = 0.55 + Math.sin(eng.TT * 8) * 0.2;
  g.drawImage(glow('#84ffff'), shx - 34, shy - 46, 32, 32);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;

  const shFrame = ((eng.TT * 3.2) | 0) % 2 === 1 && eng.S.shaman2 ? eng.S.shaman2 : eng.S.shaman;
  const shThroatPuff = Math.sin(eng.TT * 4.2) * 0.08;
  eng.dspr(shFrame, shx - 8, shy, shThroatPuff, 1, 0, 1.25);

  // Animated 3-Frame Bubbling Magic Cauldron with glowing embers, boiling potion & rising steam
  const cx = shx + 22;
  const cy = shy + 1;
  const cFrame = eng.S.cauldron ? eng.S.cauldron[((eng.TT * 5.5) | 0) % 3] : null;

  // Cauldron magic glow & hot coal lighting
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 0.45 + Math.sin(eng.TT * 7) * 0.15;
  g.drawImage(glow('#00e5ff'), cx - 22, cy - 24, 44, 44);
  g.globalAlpha = 0.35 + Math.sin(eng.TT * 9) * 0.12;
  g.drawImage(glow('#76ff03'), cx - 18, cy - 18, 36, 36);
  g.globalAlpha = 0.5 + Math.cos(eng.TT * 11) * 0.15;
  g.drawImage(glow('#ff6d00'), cx - 14, cy - 8, 28, 28);
  g.restore();

  if (cFrame) {
    const cauldronSquash = Math.sin(eng.TT * 8) * 0.03;
    eng.dspr(cFrame, cx, cy, cauldronSquash, 1, 0, 1.15);
  }

  // Occasional mystic steam wisps / bubbling embers rising from the cauldron
  if (Math.random() < 0.22) {
    eng.P.push({
      x: cx + (Math.random() - 0.5) * 12,
      y: cy - 12,
      vx: (Math.random() - 0.5) * 14,
      vy: -20 - Math.random() * 24,
      l: 0.65,
      m: 0.65,
      c: Math.random() < 0.55 ? '#00e5ff' : '#69f0ae',
      s: 1.6 + Math.random() * 1.4,
      g: -8,
      shape: 'droplet',
      glow: 0.4,
    });
  }

  // 5. Forager-Style Interactive Camp Crystal & Flora Nodes
  for (const cn of eng.campNodes) {
    if (cn.hp > 0) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.45 + Math.sin(eng.TT * 5 + cn.x) * 0.15;
      g.drawImage(glow(cn.col), cn.x - 18, cn.y - 18, 36, 36);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      eng.dspr(
        eng.S.crystal,
        cn.x,
        cn.y,
        cn.j + Math.sin(eng.TT * 4 + cn.x) * 0.04,
        1,
        cn.fl > 0 ? 1 : 0,
        1.15
      );
    }
  }

  // 6. Y-Sorted Camp Entities (Blinking Swamp Flora, Logs + Resting Frogs, Campfire, Real Online Players, Player)
  const L: Array<[number, () => void]> = [];

  for (const fl of eng.FLORA) {
    L.push([
      fl.y,
      () => {
        const dist = Math.hypot(eng.me.x - fl.x, eng.me.y - fl.y);
        const phase = fl.phase || fl.x * 0.1;
        const bend = dist < 22 ? ((fl.x - eng.me.x) / 22) * 0.35 : Math.sin(eng.TT * 2.6 + phase) * 0.07;
        const isPlantBlink = ((eng.TT * 1.3 + phase) % 3.4) > 2.85;
        const fSpr = isPlantBlink && eng.S.flora2 ? eng.S.flora2[fl.t] : eng.S.flora?.[fl.t];
        if (fSpr) {
          g.save();
          g.translate(fl.x, fl.y);
          g.rotate(bend);
          g.drawImage(fSpr, -fSpr.width / 2, -fSpr.height);
          g.restore();
        }
      },
    ]);
  }

  for (const lg of eng.camp.logs) {
    L.push([
      lg.y,
      () => {
        g.drawImage(eng.S.log, lg.x - eng.S.log.width / 2, lg.y - eng.S.log.height / 2 + 6);
        if (eng.me.ch !== lg.c) {
          const un = eng.isCharUnlocked(lg.c);
          const isCroaking = Math.sin(eng.TT * 3.5 + lg.c * 2.1) > 0.9;
          const isBlinking = !isCroaking && ((eng.TT * 1.4 + lg.c * 0.9) % 3.2) > 2.82;
          const fSpr = isCroaking
            ? eng.S.pPuff[lg.c]
            : isBlinking && eng.S.pBlink
            ? eng.S.pBlink[lg.c]
            : eng.S.pIdle[lg.c];
          const breathe = Math.sin(eng.TT * 5.8 + lg.c) * 0.085;
          const hop = Math.max(0, Math.sin(eng.TT * 2.6 + lg.c * 1.7) - 0.68) * 14;
          const flipX = lg.x > 240 ? -1 : 1;
          eng.dspr(fSpr, lg.x, lg.y - 4, breathe, un ? 1 : 0.78, 0, 1, hop, '', flipX);
          if (!un) g.drawImage(eng.S.lock, lg.x + 8, lg.y - 6, 10, 10);
          if (Math.hypot(eng.me.x - lg.x, eng.me.y - lg.y) < 28) {
            drawText(
              g,
              un ? `[${intK}] ${CH[lg.c].n.toUpperCase()} (${WP[CH[lg.c].wp].nm})` : `BLOQUEADO: ${CH[lg.c].reqTxt}`,
              lg.x,
              lg.y - 26,
              '#ffd54f',
              'center',
              5.5
            );
          }
        }
      },
    ]);
  }

  // Central Crackling Campfire (240, 168)
  L.push([
    168,
    () => {
      const cf = eng.S.campfire[((eng.TT * 8) | 0) % 2];
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.78 + Math.sin(eng.TT * 11) * 0.14;
      g.drawImage(glow('#ff9100'), 240 - 64, 168 - 64, 128, 128);
      g.globalAlpha = 0.45 + Math.cos(eng.TT * 8) * 0.1;
      g.drawImage(glow('#ffd54f'), 240 - 36, 168 - 36, 72, 72);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      eng.dspr(cf, 240, 168, Math.sin(eng.TT * 12) * 0.04, 1, 0, 1.2);
    },
  ]);

  // Real Online Co-op Players in Camp
  for (const rp of Object.values(eng.netPlayers)) {
    if (rp.ST !== 'camp') continue;
    L.push([
      rp.y,
      () => {
        const rSpr = rp.puff > 0 ? eng.S.pPuff[rp.ch] : rp.wf ? eng.S.pWalk[rp.ch] : eng.S.pIdle[rp.ch];
        const flipX = Math.cos(rp.ang) < 0 ? -1 : 1;
        eng.dspr(rSpr, rp.x, rp.y, 0, 1, 0, 1, rp.z, '#00e5ff', flipX);
        drawMouthAttackAnim(eng, rp.x, rp.y, rp.z, rp.ang, rp.w, rp.puff);
        drawText(g, `${rp.name.toUpperCase()}`, rp.x, rp.y - 26 - rp.z, '#00e5ff', 'center', 5.5);
      },
    ]);
  }

  // Player in Camp
  L.push([
    eng.me.y,
    () => {
      for (const gh of eng.GHOSTS) {
        eng.dspr(
          sil(eng.S.pWalk[eng.me.ch], CH[eng.me.ch].a),
          gh.x,
          gh.y,
          0,
          gh.l * 2.2,
          0,
          1,
          gh.z
        );
      }
      const isBlink = !eng.me.wf && eng.me.puff <= 0 && ((eng.TT * 1.5) % 3.4) > 3.05;
      const mySpr = getMutatedFrogSprite(
        eng,
        eng.me.ch,
        eng.me.wf,
        eng.me.puff,
        isBlink,
        eng.me.its.length,
        Object.keys(eng.me.syn).length
      );
      const breathe = eng.me.wf ? Math.sin(eng.TT * 16) * 0.08 : Math.sin(eng.TT * 5.2) * 0.09;
      const walkHop = eng.me.wf && eng.me.z <= 0 ? Math.abs(Math.sin(eng.TT * 14)) * 3.8 : 0;
      const jumpStretch = eng.me.z > 2 ? 0.12 : 0;
      const flipX = Math.cos(eng.me.ang) < 0 ? -1 : 1;
      eng.dspr(
        mySpr,
        eng.me.x,
        eng.me.y,
        eng.me.j + breathe - jumpStretch,
        1,
        0,
        1 + jumpStretch,
        eng.me.z + walkHop,
        '',
        flipX
      );
      drawFrogExtras(
        eng,
        eng.me.x,
        eng.me.y,
        eng.me.z + walkHop,
        eng.me.ang,
        eng.me.w,
        eng.me.puff,
        eng.me.fly,
        eng.me.sh,
        eng.me.fam,
        eng.me.clone,
        eng.me.its.length,
        eng.me.ch,
        Object.keys(eng.me.syn).length,
        eng.me.its
      );
    },
  ]);

  L.sort((a, b) => a[0] - b[0]);
  for (const item of L) item[1]();

  // Always-out Castlevania Whip Tongue, Casings, Beams, Bullets, Particles
  eng.drawAlwaysOutTongueWhip();
  drawCasingsAndBeams(eng);
  for (const b of eng.myB.concat(eng.rB)) eng.drawBullet(b);
  eng.drawParticles();
  g.drawImage(eng.VIG, 0, 0);

  // Top-left Crisp Economy HUD Box in Camp anchored to true fullscreen top-left corner
  const hudX = -eng.viewOx + 8;
  const ecoY = -eng.viewOy + 8;
  g.fillStyle = '#050c08e8';
  g.fillRect(hudX - 2, ecoY - 3, 122, 17);
  g.strokeStyle = '#2e573c';
  g.lineWidth = 1;
  g.strokeRect(hudX - 1.5, ecoY - 2.5, 121, 16);

  g.drawImage(eng.S.flyGold[0], hudX + 2, ecoY, 12, 10);
  drawText(g, `${eng.me.gold}`, hudX + 17, ecoY + 8.5, '#ffd54f', 'left', 7);

  g.drawImage(eng.S.key, hudX + 44, ecoY - 0.5, 11, 11);
  drawText(g, `${eng.me.keys}`, hudX + 58, ecoY + 8.5, '#fff59d', 'left', 7);

  g.drawImage(eng.S.larva, hudX + 80, ecoY, 12, 10);
  drawText(g, `${eng.achStats.larvae}`, hudX + 95, ecoY + 8.5, '#00e5ff', 'left', 7);

  // Contextual-only Camp Labels (Zero permanent screen clutter!)
  if (dm.dps > 0) {
    drawText(
      g,
      `DPS: ${dm.dps.toFixed(1)}`,
      dm.x,
      dm.y - 20,
      '#ff5252',
      'center',
      7
    );
  }
  if (Math.hypot(eng.me.x - shx, eng.me.y - shy) < 38) {
    drawText(g, `[${intK}] CALDEIRÃO DO XAMÃ`, shx + 6, shy - 28, '#00e5ff', 'center', 6);
  }

  eng.drawCrosshair();
}

export function drawCasingsAndBeams(eng: GameEngine) {
  const g = eng.ctx;
  for (const c of eng.CASINGS) {
    g.save();
    g.globalAlpha = clamp(c.l, 0, 0.85);
    g.fillStyle = c.col;
    g.fillRect(c.x - 1.5, c.y - c.z - 1, 3, 2);
    g.restore();
  }
  for (const arc of eng.ARCS) {
    g.strokeStyle = '#00e5ff';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(arc.x1, arc.y1);
    g.lineTo(
      (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 14,
      (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 14
    );
    g.lineTo(arc.x2, arc.y2);
    g.stroke();
  }
  for (const bm of eng.BEAMS) {
    const ex = bm.x + Math.cos(bm.a) * 480;
    const ey = bm.y + Math.sin(bm.a) * 480;
    const al = bm.l / bm.m;
    g.save();
    g.globalAlpha = al;
    g.lineCap = 'round';
    g.strokeStyle = bm.col;
    g.lineWidth = bm.w * 1.8;
    g.beginPath();
    g.moveTo(bm.x, bm.y);
    g.lineTo(ex, ey);
    g.stroke();
    g.strokeStyle = '#fff';
    g.lineWidth = bm.w * 0.65;
    g.beginPath();
    g.moveTo(bm.x, bm.y);
    g.lineTo(ex, ey);
    g.stroke();
    g.restore();
  }
}

export function renderPlayScene(eng: GameEngine) {
  const g = eng.ctx;
  const cell = eng.curCell();
  if (!cell) return;
  const th = TH[eng.wd.bIdx] || TH[0];

  // 1. Cached 2.5D Room Architecture
  g.drawImage(buildRoomBgCanvas(eng, eng.wd.bIdx, cell, eng.rmKey()), 0, 0);

  // Subtle Swamp Scenery Idle Animation: Slime Bubbles rising & popping on the swamp floor
  drawSwampIdleBubbles(eng);

  // 2. Animated Water Ripples & Spikes
  const hz = eng.hazards();
  for (const w of hz.water) {
    g.strokeStyle = th.a;
    g.globalAlpha = 0.25 + Math.sin(eng.TT * 4) * 0.08;
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(
      w.x,
      w.y,
      w.rx * (0.7 + Math.sin(eng.TT * 2) * 0.1),
      w.ry * (0.7 + Math.cos(eng.TT * 2) * 0.1),
      0,
      0,
      7
    );
    g.stroke();
  }
  g.globalAlpha = 1;

  const isUp = eng.spikesUp();
  const isWrn = eng.spikesWarn();
  for (const spk of hz.spikes) {
    if (isWrn) {
      g.fillStyle = '#ff174455';
      g.fillRect(spk.x - 12, spk.y - 12, 24, 24);
    }
    const spSpr = eng.S.spike[isUp ? 1 : 0];
    g.drawImage(spSpr, spk.x - spSpr.width / 2, spk.y - spSpr.height / 2);
  }

  // 3. Floor Decals (Blood / Slime Splatters) & Acid Pools
  for (const d of eng.DC) {
    g.globalAlpha = 0.45;
    g.fillStyle = d.c;
    g.beginPath();
    g.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, 7);
    g.fill();
  }
  for (const pl of eng.POOLS) {
    g.globalAlpha = clamp(pl.l, 0.22, 0.68);
    g.fillStyle = pl.c;
    g.beginPath();
    g.ellipse(
      pl.x,
      pl.y,
      pl.r + Math.sin(eng.TT * 10) * 2,
      (pl.r + Math.cos(eng.TT * 10) * 2) * 0.6,
      0,
      0,
      7
    );
    g.fill();
  }
  g.globalAlpha = 1;

  // 4. Ornate 2.5D Doors
  drawDoor4(eng, 'N', cell);
  drawDoor4(eng, 'S', cell);
  drawDoor4(eng, 'W', cell);
  drawDoor4(eng, 'E', cell);

  // 5. Trapdoor to Next Biome
  if (eng.wd.trapdoor) {
    g.fillStyle = '#050a07';
    g.beginPath();
    g.arc(240, 135, 19, 0, 7);
    g.fill();
    g.strokeStyle = '#ffd54f';
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(240, 135, 19 + Math.sin(eng.TT * 6) * 1.5, 0, 7);
    g.stroke();
    drawText(g, 'ALÇAPÃO ABERTO · PISE PARA AVANÇAR!', 240, 108, '#69f0ae', 'center', 6);
  }

  const intKey = formatKeyLabel(eng.CFG?.binds?.interact || DEFAULT_BINDS.interact);

  // 6. Swamp Shrine (Altar de Pacto do Pântano)
  if (cell.shrine) {
    const sh = cell.shrine;
    const pact = PACT_LIST.find((p) => p.id === sh.pactId) || PACT_LIST[0];
    if (!sh.used) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.45 + Math.sin(eng.TT * 5) * 0.15;
      g.drawImage(glow(pact.col), sh.x - 28, sh.y - 28, 56, 56);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }
    eng.dspr(
      eng.S.shrine,
      sh.x,
      sh.y,
      Math.sin(eng.TT * 4) * (sh.used ? 0 : 0.05),
      sh.used ? 0.55 : 1,
      0,
      1.25
    );
    if (!sh.used && eng.wd.clear && Math.hypot(eng.me.x - sh.x, eng.me.y - sh.y) < 34) {
      drawText(g, `[${intKey}] PACTO: ${pact.nm.toUpperCase()}`, sh.x, sh.y - 24, pact.col, 'center', 6);
      drawText(g, pact.ds.toUpperCase(), sh.x, sh.y + 22, '#ffd54f', 'center', 6);
    }
  }

  // 6b. Challenge Totem (Risk / Reward Elite Wave)
  if (cell.type === 'combat' && cell.totem) {
    const tm = cell.totem;
    eng.dspr(
      eng.S.totem,
      tm.x,
      tm.y,
      Math.sin(eng.TT * 5) * (tm.state === 1 ? 0.08 : 0),
      1,
      tm.state === 1 ? 1 : 0,
      1.25
    );
    if (tm.state === 0 && eng.wd.clear && Math.hypot(eng.me.x - tm.x, eng.me.y - tm.y) < 32) {
      drawText(
        g,
        `[${intKey}] DESAFIO DO TOTEM`,
        tm.x,
        tm.y - 24,
        '#ff5252',
        'center',
        6
      );
    }
  }

  // 7. Corner Torches with Flickering Dynamic Glow
  const tFrame = eng.S.torch[((eng.TT * 8) | 0) % 2];
  const corners = [
    [M + 8, M + 8],
    [W - M - 8, M + 8],
    [M + 8, H - M - 10],
    [W - M - 8, H - M - 10],
  ];
  g.globalCompositeOperation = 'lighter';
  for (const [tx, ty] of corners) {
    g.globalAlpha = 0.28 + Math.sin(eng.TT * 9 + tx) * 0.08;
    g.drawImage(glow('#ff9100'), tx - 30, ty - 30, 60, 60);
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  for (const [tx, ty] of corners) {
    g.drawImage(tFrame, tx - tFrame.width / 2, ty - tFrame.height / 2);
  }

  // 8. Shop Merchant & Stone Pedestals
  if (cell.type === 'shop' && cell.shop) {
    const mSpr = ((eng.TT * 3.6) | 0) % 2 === 1 && eng.S.merchant2 ? eng.S.merchant2 : eng.S.merchant;
    eng.dspr(mSpr, 240, 102, Math.sin(eng.TT * 5.5) * 0.08, 1, 0, 1.25);

    cell.shop.forEach((s, idx) => {
      g.fillStyle = '#37474f';
      g.fillRect(s.x - 13, s.y + 5, 26, 8);
      g.fillStyle = '#78909c';
      g.fillRect(s.x - 15, s.y + 2, 30, 4);

      if (s.sold) {
        return;
      }

      const isSoloAnkh = idx === 2 && eng.me.ankh === 0;
      const price = Math.max(1, Math.round(isSoloAnkh ? 38 : s.cost));
      const by = Math.sin(eng.TT * 4 + s.x) * 2.5;
      let ic = eng.S.h;
      let col = '#ffd54f';
      let nm = s.nm || 'ITEM';
      let ds = s.ds || '';
      let affTag = '';

      if (s.t === 'key') ic = eng.S.key;
      else if (isSoloAnkh) {
        ic = eng.S.ankh;
        col = '#00e676';
        nm = 'OVA DE RENASCIMENTO';
        ds = 'Revive 1x com 3 corações';
      } else if (s.k != null) {
        ic = eng.S.items[s.k];
        const rar = RAR_INFO[IT[s.k][2]];
        col = rar.col;
        nm = IT[s.k][0];
        ds = IT[s.k][1];
        if (CH[eng.me.ch]?.aff?.includes(s.k)) affTag = ' [AFINIDADE]';
      }

      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.35;
      g.drawImage(glow(col), s.x - 18, s.y - 20 + by, 36, 36);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.drawImage(ic, s.x - ic.width / 2, s.y - 18 + by);
      drawText(g, `${price}$`, s.x, s.y + 23, '#ffd54f', 'center', 6);

      if (Math.hypot(eng.me.x - s.x, eng.me.y - s.y) < 26) {
        drawText(g, `[${intKey}] ${nm}${affTag}`, s.x, s.y - 29, affTag ? '#00e5ff' : col, 'center', 6);
        drawText(g, ds, s.x, s.y - 19, '#e8f5e9', 'center', 6);
      }
    });
  }

  // 9. Treasure & Co-op Chests
  for (const chObj of [cell.chest, cell.coopChest]) {
    if (chObj && (chObj === cell.chest || chObj.spawned)) {
      const rar = RAR_INFO[IT[chObj.k][2]];
      const isAff = CH[eng.me.ch]?.aff?.includes(chObj.k);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.42;
      g.drawImage(glow(rar.col), chObj.x - 22, chObj.y - 22, 44, 44);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      const cSpr = eng.S.chest[chObj.open ? 1 : 0];
      eng.dspr(cSpr, chObj.x, chObj.y, Math.sin(eng.TT * 5) * (chObj.open ? 0 : 0.04), 1, 0, 1.25);
      if (!chObj.open && Math.hypot(eng.me.x - chObj.x, eng.me.y - chObj.y) < 34) {
        drawText(
          g,
          `[${intKey}] ABRIR BAÚ (${rar.nm}${isAff ? ' [AFINIDADE]' : ''})`,
          chObj.x,
          chObj.y + 24,
          isAff ? '#00e5ff' : rar.col,
          'center',
          6
        );
      }
    }
  }

  // 10. Gold Flies, Larvae (Animated ONLY on the floor!) & Pickups
  const flySpr = eng.S.flyGold[((eng.TT * 14) | 0) % 2];
  for (const f of eng.FLIES) {
    eng.dspr(flySpr, f.x, f.y, 0, 1, 0, 0.95, f.z);
  }
  const larvaFloorSpr = ((eng.TT * 6) | 0) % 2 === 1 && eng.S.larva2 ? eng.S.larva2 : eng.S.larva;
  for (const lv of eng.LARVAE) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.45;
    g.drawImage(glow('#00e5ff'), lv.x - 16, lv.y - 16 - lv.z, 32, 32);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    eng.dspr(larvaFloorSpr, lv.x, lv.y, Math.sin(eng.TT * 10 + lv.id) * 0.08, 1, 0, 1.05, lv.z);
  }
  for (const dr of eng.DROPS) {
    const by = Math.sin(eng.TT * 6 + dr.id) * 2.5;
    eng.dspr(dr.t === 'key' ? eng.S.key : eng.S.h, dr.x, dr.y + by, dr.j, 1, 0);
  }

  // 11. Y-Sorted 2.5D Arena Entities (Pillars, Blinking Flora, Props, Enemies, Real Online Players, Player)
  const L: Array<[number, () => void]> = [];
  const obSpr = eng.S.obs[th.ob];

  for (const fl of eng.FLORA) {
    L.push([
      fl.y,
      () => {
        const dist = Math.hypot(eng.me.x - fl.x, eng.me.y - fl.y);
        const phase = fl.phase || fl.x * 0.1;
        const bend = dist < 22 ? ((fl.x - eng.me.x) / 22) * 0.35 : Math.sin(eng.TT * 2.6 + phase) * 0.07;
        const isPlantBlink = ((eng.TT * 1.3 + phase) % 3.4) > 2.85;
        const fSpr = isPlantBlink && eng.S.flora2 ? eng.S.flora2[fl.t] : eng.S.flora?.[fl.t];
        if (fSpr) {
          g.save();
          g.translate(fl.x, fl.y);
          g.rotate(bend);
          g.drawImage(fSpr, -fSpr.width / 2, -fSpr.height);
          g.restore();
        }
      },
    ]);
  }

  for (const k of eng.rocks()) {
    L.push([
      k.y + 28,
      () => {
        g.fillStyle = '#0008';
        g.fillRect(k.x + 2, k.y + 24, 28, 8);
        g.fillStyle = '#08100b';
        g.fillRect(k.x + 2, k.y + 18, 28, 9);
        g.drawImage(obSpr, k.x + 2, k.y + 2, 28, 24);
      },
    ]);
  }

  for (const pr of eng.PROPS) {
    if (!pr.dead) {
      L.push([
        pr.y + 6,
        () => {
          eng.dspr(
            eng.S[pr.t] || eng.S.barrel,
            pr.x,
            pr.y,
            Math.sin(eng.TT * 3 + pr.id) * 0.02,
            1,
            0,
            1.0
          );
        },
      ]);
    }
  }

  for (const e of eng.wd.en) {
    L.push([
      e.y,
      () => {
        const bo = e.t.startsWith('B');
        const p2 = bo && e.hp < e.mh * 0.5;
        const animF = Math.floor(eng.TT * 8 + e.id) % 2 === 1;
        const s = bo
          ? p2 && eng.S[e.t + '_2']
            ? eng.S[e.t + '_2']
            : animF && eng.S[e.t + '_f2']
            ? eng.S[e.t + '_f2']
            : eng.S[e.t]
          : animF && eng.S[e.t + '_f2']
          ? eng.S[e.t + '_f2']
          : eng.S[e.t] || eng.S.g;

        const hop =
          e.t === 'm' || e.t === 'n' || e.t === 'g' || e.t === 's' || e.t === 'bmb' || e.t === 'B0'
            ? Math.abs(Math.sin(eng.TT * 6 + e.id)) * 0.14 - 0.04
            : 0;
        const idBreathe = Math.sin(eng.TT * 7.5 + e.id) * 0.06;
        const tel = (e.tel || 0) > 0 && Math.floor(eng.TT * 20) % 2 === 0;
        const al = e.t === 'gho' ? 0.65 + Math.sin(eng.TT * 5 + e.id) * 0.2 : 1;
        const sc = e.chmp ? 1.2 : 1.0;
        const flipX = eng.me.x < e.x ? -1 : 1;

        if (e.chmp || e.chemT > 0) {
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = 0.28 + Math.sin(eng.TT * 8) * 0.08;
          g.drawImage(glow(e.chemT > 0 ? '#00e5ff' : '#ffd54f'), e.x - 18, e.y - 18, 36, 36);
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = 1;
        }

        if (e.seg) {
          for (let i = e.seg.length - 1; i >= 0; i--) {
            const sg = e.seg[i];
            eng.dspr(animF ? eng.S.m_f2 : eng.S.m, sg.x, sg.y, 0, 0.9, e.fl > 0 ? 1 : 0);
          }
        }

        const fyOff =
          e.t === 'f' || e.t === 'B1'
            ? Math.sin(eng.TT * 12 + e.id) * 4 + 6
            : e.t !== 'plt'
            ? Math.abs(Math.sin(eng.TT * 7 + e.id)) * 2.5
            : 0;
        eng.dspr(
          s,
          e.x,
          e.y,
          e.j + idBreathe - hop,
          al,
          e.fl > 0 || tel ? 1 : 0,
          sc,
          fyOff,
          '',
          flipX
        );

        if ((e.tel || 0) > 0) {
          drawText(g, '!', e.x, e.y - s.height * sc - 6, '#ff1744', 'center', 8);
        }

        if (!bo && e.hp < e.mh) {
          g.fillStyle = '#000c';
          g.fillRect(e.x - 10, e.y - s.height * sc - 5, 20, 3);
          g.fillStyle = e.chmp ? '#ffd54f' : '#ff5252';
          g.fillRect(e.x - 9, e.y - s.height * sc - 4, 18 * clamp(e.hp / e.mh, 0, 1), 1.5);
        }

        if (bo) {
          const cy = e.y - s.height - 12 + Math.sin(eng.TT * 6) * 2;
          g.drawImage(eng.S.crown, e.x - eng.S.crown.width / 2, cy);
        }
      },
    ]);
  }

  // Real Online Co-op Players & Holographic Rescue System
  for (const rp of Object.values(eng.netPlayers)) {
    if (rp.ST !== 'play' || rp.gx !== eng.wd.gx || rp.gy !== eng.wd.gy) continue;
    L.push([
      rp.y,
      () => {
        const rSpr = rp.puff > 0 ? eng.S.pPuff[rp.ch] : rp.wf ? eng.S.pWalk[rp.ch] : eng.S.pIdle[rp.ch];
        const flipX = Math.cos(rp.ang) < 0 ? -1 : 1;
        if (rp.dead) {
          g.save();
          g.strokeStyle = '#00e5ff88';
          g.lineWidth = 2;
          g.setLineDash([4, 3]);
          g.beginPath();
          g.arc(rp.x, rp.y, 34, 0, 7);
          g.stroke();
          g.setLineDash([]);
          if (rp.revP > 0) {
            g.strokeStyle = '#00e676';
            g.lineWidth = 3.5;
            g.beginPath();
            g.arc(rp.x, rp.y, 34, -1.57, -1.57 + rp.revP * 6.283);
            g.stroke();
          }
          g.restore();
          drawText(g, `FIQUE NO ANEL P/ REANIMAR ${rp.name.toUpperCase()}`, rp.x, rp.y + 24, '#00e676', 'center', 5.2);
          g.drawImage(eng.S.skull, rp.x - eng.S.skull.width / 2, rp.y - 24);
        }
        eng.dspr(rSpr, rp.x, rp.y, 0, rp.dead ? 0.42 : 1, 0, 1, rp.z, '#00e5ff', flipX);
        if (!rp.dead) {
          drawMouthAttackAnim(eng, rp.x, rp.y, rp.z, rp.ang, rp.w, rp.puff);
          drawText(g, rp.name.toUpperCase(), rp.x, rp.y - 26 - rp.z, '#00e5ff', 'center', 5.2);
        }
      },
    ]);
  }

  // Player Frog
  L.push([
    eng.me.y,
    () => {
      for (const gh of eng.GHOSTS) {
        eng.dspr(
          sil(eng.S.pWalk[eng.me.ch], CH[eng.me.ch].a),
          gh.x,
          gh.y,
          0,
          gh.l * 2.2,
          0,
          1,
          gh.z
        );
      }

      if (eng.me.dead && Object.values(eng.netPlayers).some((rp) => !rp.dead)) {
        g.save();
        g.strokeStyle = '#00e5ff99';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(eng.me.x, eng.me.y, 34, 0, 7);
        g.stroke();
        g.restore();
        drawText(g, 'AGUARDANDO ALIADO ONLINE REANIMAR...', eng.me.x, eng.me.y + 24, '#00e5ff', 'center', 5.5);
      }

      const isBlink = !eng.me.wf && eng.me.puff <= 0 && ((eng.TT * 1.5) % 3.4) > 3.05;
      const mySpr = getMutatedFrogSprite(
        eng,
        eng.me.ch,
        eng.me.wf,
        eng.me.puff,
        isBlink,
        eng.me.its.length,
        Object.keys(eng.me.syn).length
      );
      const flyZ = eng.me.z + (eng.me.fly ? Math.sin(eng.TT * 7) * 3.5 + 4 : 0);
      const walkHop = eng.me.wf && eng.me.z <= 0 ? Math.abs(Math.sin(eng.TT * 14)) * 3.8 : 0;
      const breathe = eng.me.wf ? Math.sin(eng.TT * 16) * 0.08 : Math.sin(eng.TT * 5.2) * 0.09;
      const jumpStretch = eng.me.z > 2 ? 0.12 : 0;
      const mySc = (eng.me.its.length >= 4 || Object.keys(eng.me.syn).length > 0 ? 1.12 : eng.me.its.length >= 2 ? 1.06 : 1) * (1 + jumpStretch);
      const flipX = Math.cos(eng.me.ang) < 0 ? -1 : 1;

      eng.dspr(
        mySpr,
        eng.me.x,
        eng.me.y,
        eng.me.j + breathe - jumpStretch,
        eng.me.dead
          ? 0.42
          : (eng.me.inv > 0 || eng.me.z > 6) && Math.floor(eng.TT * 18) % 2
          ? 0.55
          : 1,
        eng.fl > 0.6 ? 1 : 0,
        mySc,
        flyZ + walkHop,
        '',
        flipX
      );
      if (!eng.me.dead) {
        drawFrogExtras(
          eng,
          eng.me.x,
          eng.me.y,
          flyZ + walkHop,
          eng.me.ang,
          eng.me.w,
          eng.me.puff,
          eng.me.fly,
          eng.me.sh,
          eng.me.fam,
          eng.me.clone,
          eng.me.its.length,
          eng.me.ch,
          Object.keys(eng.me.syn).length,
          eng.me.its
        );
      } else {
        g.drawImage(eng.S.skull, eng.me.x - eng.S.skull.width / 2, eng.me.y - 24);
      }
    },
  ]);

  L.sort((a, b) => a[0] - b[0]);
  for (const item of L) item[1]();

  // 12. Always-Out Castlevania Whip Tongue, Casings, Beams, Projectiles & Particles
  eng.drawAlwaysOutTongueWhip();
  drawCasingsAndBeams(eng);
  for (const b of eng.wd.eb) eng.drawBullet(b, true);
  for (const b of eng.myB.concat(eng.rB)) eng.drawBullet(b, false);
  eng.drawParticles();
  drawWeather(eng);
  g.drawImage(eng.VIG, 0, 0);

  if (eng.fl > 0) {
    g.fillStyle = `rgba(255, 20, 40, ${eng.fl * 0.26})`;
    g.fillRect(0, 0, W, H);
  }

  // 13. Crisp Pixel-Art HUD Overlay
  renderPlayHUD(eng, cell, th);
  eng.drawCrosshair();

  if (eng.tr > 0) {
    g.fillStyle = `rgba(0, 0, 0, ${eng.tr})`;
    g.fillRect(0, 0, W, H);
  }
}

function renderPlayHUD(eng: GameEngine, cell: DungeonCell, _th: any) {
  const g = eng.ctx;
  const hudX = -eng.viewOx + 8;
  const hudY = -eng.viewOy + 6;

  // Top-left Hearts & Shields anchored to true fullscreen top-left corner
  for (let i = 0; i < eng.me.mh; i++) {
    g.drawImage(
      i < eng.me.hp ? eng.S.h : eng.S.h0,
      hudX + (i % 8) * 14,
      hudY + Math.floor(i / 8) * 13,
      13,
      11
    );
  }
  let icX = hudX;
  const rowY = hudY + (eng.me.mh > 8 ? 27 : 14);
  if (eng.me.sh > 0) {
    g.drawImage(eng.S.sh, icX, rowY, 12, 12);
    icX += 15;
  }
  if (eng.me.ankh > 0) {
    g.drawImage(eng.S.ankh, icX, rowY, 12, 12);
    icX += 15;
  }

  // Economy Bar (Gold Flies, Keys, STATIC Larva Icon inside a clean padded HUD box)
  const ecoY = rowY + (eng.me.sh > 0 || eng.me.ankh > 0 ? 15 : 4);
  g.fillStyle = '#050c08e8';
  g.fillRect(hudX - 2, ecoY - 3, 122, 17);
  g.strokeStyle = '#2e573c';
  g.lineWidth = 1;
  g.strokeRect(hudX - 1.5, ecoY - 2.5, 121, 16);

  g.drawImage(eng.S.flyGold[0], hudX + 2, ecoY, 12, 10);
  drawText(g, `${eng.me.gold}`, hudX + 17, ecoY + 8.5, '#ffd54f', 'left', 7);

  g.drawImage(eng.S.key, hudX + 44, ecoY - 0.5, 11, 11);
  drawText(g, `${eng.me.keys}`, hudX + 58, ecoY + 8.5, '#fff59d', 'left', 7);

  g.drawImage(eng.S.larva, hudX + 80, ecoY, 12, 10);
  drawText(g, `${eng.achStats.larvae}`, hudX + 95, ecoY + 8.5, '#00e5ff', 'left', 7);

  // Kill Combo Streak Badge
  if (eng.comboCount >= 2 && eng.comboTimer > 0) {
    drawText(
      g,
      `COMBO ${eng.comboCount}x!`,
      hudX,
      ecoY + 23,
      eng.comboCount >= 5 ? '#ff4081' : '#76ff03',
      'left',
      7
    );
  }

  // Active Multi-Wave Combat Indicator (only when fighting multi-wave room)
  const wMax = cell.wavesTotal || (cell as any).maxWaves || 1;
  const wCur = cell.waveCur || (cell as any).wave || 1;
  if (cell.type === 'combat' && !eng.wd.clear && wMax > 1) {
    drawText(g, `ONDA ${wCur}/${wMax}`, 240, 14, '#ffd54f', 'center', 7);
  }

  // Boss Health Bar
  const boss = eng.wd.en.find((e) => e.t.startsWith('B'));
  if (boss) {
    g.fillStyle = '#050a07ee';
    g.fillRect(128, 16, 224, 10);
    g.strokeStyle = '#ffd54f';
    g.lineWidth = 1;
    g.strokeRect(128, 16, 224, 10);
    g.fillStyle = '#ff1744';
    g.fillRect(130, 18, 220 * clamp(boss.hp / boss.mh, 0, 1), 6);
    g.drawImage(eng.S.crownSm, 112, 14);
    drawText(g, BOSS_NAMES[boss.t] || 'CHEFE', 240, 35, '#ffd54f', 'center', 6);
  }

  // 5x5 Minimap (Top Right below buttons)
  eng.drawMinimap();

  // Victory / Game Over Banner
  const anyAliveAlly = Object.values(eng.netPlayers).some((rp) => !rp.dead);
  if (eng.wd.over || (eng.me.dead && !anyAliveAlly)) {
    g.fillStyle = '#040906ee';
    g.fillRect(0, 96, W, 114);
    g.strokeStyle = eng.wd.over ? '#69f0ae' : '#ff5252';
    g.lineWidth = 2;
    g.strokeRect(0, 96, W, 114);
    drawText(
      g,
      eng.wd.over ? 'PÂNTANO CONQUISTADO!' : 'FIM DA LINHA, SAPINHO!',
      240,
      138,
      eng.wd.over ? '#69f0ae' : '#ff5252',
      'center',
      12
    );
    drawText(
      g,
      'PRESSIONE [R] PARA REINICIAR',
      240,
      168,
      '#ffd54f',
      'center',
      7
    );
  }
}
