/**
 * Complete Game Engine for Sapinhos Sapecas
 * 100% Vanilla JS/Canvas-based Pixel Art Action Roguelike (Enter the Gungeon + Forager style)
 */

import {
  CharacterDef,
  KeyBindings,
  DEFAULT_BINDS,
  CH,
  WP,
  IT,
  TH,
  ACH_LIST,
  SHAMAN_UPG,
  HP_STATS,
  RAD_STATS,
  CL_STATS,
  BOSS_NAMES,
  FROG_IDLE,
  FROG_WALK,
  FROG_PUFF,
  FROG_MUT1_IDLE,
  FROG_MUT1_WALK,
  FROG_MUT1_PUFF,
  FROG_MUT2_IDLE,
  FROG_MUT2_WALK,
  FROG_MUT2_PUFF,
  FROG_BLINK,
  FROG_FACES,
  FROG_HATS,
  CROSS_MAT,
  ARR_L_MAT,
  ARR_R_MAT,
  GEAR_MAT,
  SPK_MAT,
  FS_MAT,
  TRP_MAT,
  RST_MAT,
  PLAY_IC_MAT,
  BOOK_IC_MAT,
  JOY_IC_MAT,
  BOOT_IC_MAT,
  HAND_IC_MAT,
  CAMPFIRE_F1,
  CAMPFIRE_F2,
  SHAMAN_MAT,
  SHAMAN_MAT2,
  LARVA_MAT,
  LARVA_MAT2,
  TOTEM_MAT,
  BARREL_MAT,
  POT_MAT,
  CRATE_MAT,
  CROWN_MAT,
  CROWN_PAL,
  LOG_MAT,
  DUMMY_MAT,
  SIGN_MAT,
  MERCHANT_MAT,
  MERCHANT_MAT2,
  CHEST_CLOSED,
  CHEST_OPEN,
  KEY_MAT,
  FLY_GOLD1,
  FLY_GOLD2,
  HEART_MAT,
  SHIELD_MAT,
  LOCK_MAT,
  SKULL_MAT,
  SPIKE_DOWN,
  SPIKE_UP,
  TORCH_F1,
  TORCH_F2,
  TORCH_PAL,
  ANKH_MAT,
  EN_FLY,
  EN_FLY2,
  EN_GAP,
  EN_GAP2,
  EN_SHO,
  EN_SHO2,
  EN_CHG,
  EN_CHG2,
  EN_SLI,
  EN_SLI2,
  EN_BMB,
  EN_BMB2,
  EN_PLT,
  EN_PLT2,
  EN_SNK,
  EN_SNK2,
  EN_GHO,
  EN_GHO2,
  EN_SPD,
  EN_SPD2,
  BOSS_TOAD_F1,
  BOSS_TOAD_F2,
  OB_MATS,
  OB_PALS,
  ITEM_MATS,
  ITEM_PALS,
  RAR_INFO,
  WEAPON_MATS,
  WEAPON_PALS,
  FLORA_MATS,
  FLORA_PALS,
  CRYSTAL_MAT,
} from './constants.ts';
import { calculateZ, isJumpInvulnerable, calculateDPS, updateBouncingParticle } from './physics.ts';
import { getActiveSynergies } from './synergies.ts';
import { generateDungeonGrid, DungeonCell, createPseudoRandom } from './dungeon.ts';
import {
  drawMenuDiorama,
  renderCampScene,
  renderPlayScene,
  drawText,
} from './renderer.ts';

export const W = 480;
export const H = 320;
export const M = 32;
export const Z = 2;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const rnd = () => (Math.random() * 1e9) | 0;
export const now = () => performance.now();

export function spr(rows: string[], pal: Record<string, string>, s = 2): HTMLCanvasElement {
  const sc = Math.max(1, Math.round(s));
  const c = document.createElement('canvas');
  c.width = rows[0].length * sc;
  c.height = rows.length * sc;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  rows.forEach((r, y) =>
    [...r].forEach((ch, i) => {
      if (pal[ch]) {
        x.fillStyle = pal[ch];
        x.fillRect(i * sc, y * sc, sc, sc);
      }
    })
  );
  return c;
}

const FL = new WeakMap<HTMLCanvasElement, Record<string, HTMLCanvasElement>>();
export function sil(s: HTMLCanvasElement, col = '#fff'): HTMLCanvasElement {
  let m = FL.get(s);
  if (!m) {
    m = {};
    FL.set(s, m);
  }
  if (!m[col]) {
    const c = document.createElement('canvas');
    c.width = s.width;
    c.height = s.height;
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    x.drawImage(s, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = col;
    x.fillRect(0, 0, c.width, c.height);
    m[col] = c;
  }
  return m[col];
}

const GL: Record<string, HTMLCanvasElement> = {};
export function glow(c: string): HTMLCanvasElement {
  if (GL[c]) return GL[c];
  const k = document.createElement('canvas');
  k.width = k.height = 48;
  const x = k.getContext('2d')!;
  const r = x.createRadialGradient(24, 24, 0, 24, 24, 24);
  r.addColorStop(0, c);
  r.addColorStop(1, '#0000');
  x.fillStyle = r;
  x.fillRect(0, 0, 48, 48);
  return (GL[c] = k);
}

export function spring(o: { j: number; v: number }, dt: number) {
  o.v += (-o.j * 260 - o.v * 9) * dt;
  o.j += o.v * dt;
}

export interface Particle {
  x: number;
  y: number;
  ox?: number;
  oy?: number;
  vx: number;
  vy: number;
  l: number;
  m: number;
  c: string;
  c2?: string;
  s: number;
  g: number;
  bf?: number;
  bnc?: number;
  drag?: number;
  shape?: 'pixel' | 'spark' | 'ring' | 'droplet' | 'star';
  glow?: number;
  rot?: number;
  vrot?: number;
}

export interface FloatingText {
  x: number;
  y: number;
  s: string;
  c: string;
  l: number;
  b?: number;
}

export interface ToastItem {
  lbl: string;
  nm: string;
  ds: string;
  ic: number;
}

export interface Player {
  id: string;
  x: number;
  y: number;
  z: number;
  jumpT: number;
  jumpCd: number;
  jvx: number;
  jvy: number;
  ang: number;
  hp: number;
  mh: number;
  sp: number;
  dm: number;
  rt: number;
  cd: number;
  dead: boolean;
  inv: number;
  ax: number;
  ay: number;
  w: number;
  pr: number;
  hm: number;
  big: number;
  sh: number;
  shi: number;
  fly: number;
  tri: number;
  tox: number;
  bnc: number;
  fam: number;
  vmp: number;
  exp: number;
  rear: number;
  hyper: number;
  elec: number;
  clone: number;
  ankh: number;
  kills: number;
  gold: number;
  keys: number;
  revP: number;
  its: number[];
  syn: Record<string, number>;
  j: number;
  v: number;
  mvx: number;
  mvy: number;
  puff: number;
  wf: number;
  ch: number;
}

export interface Bullet {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  l: number;
  r: number;
  d: number;
  p: number | boolean;
  bnc: number;
  aoe: number;
  pool: number | boolean;
  tng?: number;
  oid?: string;
  w: number;
  col: string;
  shoal?: number;
  foam?: number;
  royal?: number;
  chem?: number;
  trailT?: number;
  hit: number[];
  ka: number;
}

export interface Enemy {
  id: number;
  t: string;
  x: number;
  y: number;
  rx: number;
  hp: number;
  mh: number;
  c: number;
  j: number;
  v: number;
  fl: number;
  chmp: number;
  chemT: number;
  chemBy: string;
  tel?: number;
  dash?: number;
  dx?: number;
  dy?: number;
  st?: number;
  ang?: number;
  seg?: Array<{ x: number; y: number }> | null;
}

export interface EnemyBullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface TableProp {
  id: number;
  x: number;
  y: number;
  flip: boolean;
  hp: number;
  mh: number;
  j: number;
  v: number;
  fl: number;
}

export interface DestructibleProp {
  id: number;
  x: number;
  y: number;
  t: 'barrel' | 'pot' | 'crate';
  dead: boolean;
  j: number;
  v: number;
}

export interface FlyGold {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface LarvaDrop {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface FloorWorld {
  bIdx: number;
  fSeed: number;
  gx: number;
  gy: number;
  grid: DungeonCell[][] | null;
  en: Enemy[];
  eb: EnemyBullet[];
  clear: boolean;
  over: string;
  trapdoor: boolean;
}

export interface BotPartner {
  active: boolean;
  ch: number;
  w: number;
  x: number;
  y: number;
  z: number;
  ang: number;
  hp: number;
  mh: number;
  dead: boolean;
  revP: number;
  cd: number;
  puff: number;
  wf: number;
  j: number;
  v: number;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  ST: 'menu' | 'camp' | 'play' = 'menu';
  paused = false;
  ch = 0;
  me!: Player;
  others: Record<string, any> = {};
  wd!: FloorWorld;

  myB: Bullet[] = [];
  rB: Bullet[] = [];
  BEAMS: Array<{ x: number; y: number; a: number; col: string; l: number; m: number; w: number }> = [];
  POOLS: Array<{ x: number; y: number; r: number; l: number; tk: number; c: string; slow?: boolean }> = [];
  DROPS: Array<{ id: number; x: number; y: number; t: string; j: number; v: number }> = [];
  FLIES: FlyGold[] = [];
  LARVAE: LarvaDrop[] = [];
  ARCS: Array<{ x1: number; y1: number; x2: number; y2: number; l: number }> = [];
  TABLES: TableProp[] = [];
  PROPS: DestructibleProp[] = [];
  FLORA: Array<{ x: number; y: number; t: number }> = [];
  CASINGS: Array<{ x: number; y: number; z: number; vx: number; vy: number; vz: number; l: number; col: string }> = [];
  GHOSTS: Array<{ x: number; y: number; z: number; l: number }> = [];
  P: Particle[] = [];
  FT: FloatingText[] = [];
  DC: Array<{ x: number; y: number; c: string; r: number }> = [];

  campNodes: Array<{
    x: number;
    y: number;
    hp: number;
    mh: number;
    respawnT: number;
    j: number;
    v: number;
    fl: number;
    col: string;
  }> = [];

  botPartner: BotPartner = {
    active: false,
    ch: 1,
    w: 2,
    x: 268,
    y: 235,
    z: 0,
    ang: 0,
    hp: 6,
    mh: 6,
    dead: false,
    revP: 0,
    cd: 0,
    puff: 0,
    wf: 0,
    j: 0,
    v: 0,
  };

  comboCount = 0;
  comboTimer = 0;
  ghostTimer = 0;

  keys: Record<string, boolean> = {};
  mouse = { x: 240, y: 160, down: false, rdown: false, active: true };
  touchState = { lx: 0, ly: 0, rx: 0, ry: 0, lActive: false, rActive: false };

  shake = 0;
  hs = 0;
  tr = 0;
  fl = 0;
  hint = 8;
  TT = 0;
  roomDamaged = false;
  nextT = 0;
  lastKey = '';
  prevOver = '';

  camp = {
    dummy: { x: 88, y: 152, j: 0, v: 0, fl: 0, hits: [] as Array<{ t: number; d: number }>, dps: 0 },
    shaman: { x: 92, y: 236 },
    sign: { x: 382, y: 118, bIdx: 0 },
    portal: { x: 240, y: 48, t: 0 },
    logs: [
      { x: 184, y: 146, c: 0 },
      { x: 296, y: 146, c: 1 },
      { x: 168, y: 184, c: 2 },
      { x: 312, y: 184, c: 3 },
      { x: 202, y: 212, c: 4 },
      { x: 278, y: 212, c: 5 },
    ],
  };

  CFG: {
    sfx: number;
    muted: boolean;
    shake: number;
    hitstop: boolean;
    touch: string;
    aspect: string;
    binds: KeyBindings;
  } = {
    sfx: 0.8,
    muted: false,
    shake: 1,
    hitstop: true,
    touch: 'auto',
    aspect: 'fill',
    binds: { ...DEFAULT_BINDS },
  };
  isFullscreen = false;
  achData: Record<string, number> = {};
  achStats = { kills: 0, maxItems: 0, maxDmg: 2.0, larvae: 0, upg: { hp: 0, dm: 0, sp: 0, gold: 0, luck: 0 } };

  toastQueue: ToastItem[] = [];
  toastBusy = false;
  onToast?: (item: ToastItem) => void;
  onStateChange?: (state: string) => void;
  onOpenShaman?: () => void;
  onOpenAchievements?: () => void;
  onOpenOptions?: () => void;

  S: Record<string, any> = {};
  CAMP_BG: HTMLCanvasElement | null = null;
  BG_CACHE: Record<string, HTMLCanvasElement> = {};
  RK_CACHE: Record<string, Array<{ cx: number; cy: number; x: number; y: number }>> = {};
  HZ_CACHE: Record<string, any> = {};
  VIG!: HTMLCanvasElement;

  audioCtx: AudioContext | null = null;
  running = false;
  lastTime = now();
  boundLoop: () => void;
  bc: BroadcastChannel | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.loadProgress();
    this.buildSprites();
    this.initVignette();
    this.initPlayer(0);
    this.reset(true);

    this.boundLoop = this.loop.bind(this);
    this.initEvents();
    this.initNetChannel();
    if (typeof window !== 'undefined') {
      (window as any).__GAME_ENGINE__ = this;
    }
  }

  loadProgress() {
    try {
      const saved = JSON.parse(
        localStorage.getItem('sapinhos_sapecas_v3') || localStorage.getItem('sapinhos_sapecas_v2') || '{}'
      );
      this.achData = saved.ach || {};
      this.achStats.kills = saved.kills || 0;
      this.achStats.maxItems = saved.maxItems || 0;
      this.achStats.maxDmg = saved.maxDmg || 2.0;
      this.achStats.larvae = saved.larvae || 0;
      if (saved.upg) this.achStats.upg = { ...this.achStats.upg, ...saved.upg };
      if (saved.cfg) {
        this.CFG = {
          ...this.CFG,
          ...saved.cfg,
          binds: { ...DEFAULT_BINDS, ...(saved.cfg.binds || {}) },
        };
      }
    } catch (e) {}
  }

  toggleFullscreen() {
    const doc: any = document;
    const el: any = document.documentElement;
    const nativeFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    const nextState = !this.isFullscreen && !nativeFs;

    this.isFullscreen = nextState;
    document.body.classList.toggle('sapo-fullscreen', nextState);

    try {
      if (nextState) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) {
          Promise.resolve(req.call(el)).catch(() => {
            // Keep pseudo-fullscreen active even if iframe/mobile blocks native Fullscreen API
          });
        }
        (screen.orientation as any)?.lock?.('landscape')?.catch?.(() => {});
      } else if (nativeFs) {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exit) {
          Promise.resolve(exit.call(doc)).catch(() => {});
        }
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('sapo-fullscreen', { detail: this.isFullscreen }));
    this.snd(nextState ? 520 : 380, 0.09, 'triangle', 0.06, 160);
    return this.isFullscreen;
  }

  saveProgress() {
    try {
      localStorage.setItem(
        'sapinhos_sapecas_v3',
        JSON.stringify({
          ach: this.achData,
          kills: this.achStats.kills,
          maxItems: this.achStats.maxItems,
          maxDmg: this.achStats.maxDmg,
          larvae: this.achStats.larvae,
          upg: this.achStats.upg,
          cfg: this.CFG,
        })
      );
    } catch (e) {}
  }

  buildSprites() {
    const makeFrogPal = (c: CharacterDef) => ({
      '0': '#101c12',
      '1': '#ffffff',
      '2': c.c,
      '3': '#111111',
      '4': c.sac,
      '5': '#ffffff',
      '6': '#ff6b9d',
      '7': '#ffd54f',
      a: c.a,
      b: c.a,
      c: c.sac,
      l: '#ffffff',
    });

    this.S = {
      pIdle: CH.map((c, i) =>
        spr(
          [...FROG_HATS[i], ...(FROG_FACES[i] || FROG_IDLE.slice(0, 6)), ...FROG_IDLE.slice(6)],
          makeFrogPal(c),
          2
        )
      ),
      pWalk: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_WALK], makeFrogPal(c), 2)
      ),
      pPuff: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_PUFF], makeFrogPal(c), 2)
      ),
      pBlink: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_BLINK], makeFrogPal(c), 2)
      ),
      // Mutated Frog Evolution Stage 1 Sprites (2-3 Mutations)
      pIdleMut1: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_MUT1_IDLE], makeFrogPal(c), 2)
      ),
      pWalkMut1: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_MUT1_WALK], makeFrogPal(c), 2)
      ),
      pPuffMut1: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_MUT1_PUFF], makeFrogPal(c), 2)
      ),
      // Mutated Frog Evolution Stage 2 Sprites (4+ Mutations / Apex)
      pIdleMut2: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_MUT2_IDLE], makeFrogPal(c), 2)
      ),
      pWalkMut2: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_MUT2_WALK], makeFrogPal(c), 2)
      ),
      pPuffMut2: CH.map((c, i) =>
        spr([...FROG_HATS[i], ...FROG_MUT2_PUFF], makeFrogPal(c), 2)
      ),
      weapons: WEAPON_MATS.map((m, i) => spr(m, WEAPON_PALS[i], 2)),
      flora: FLORA_MATS.map((m, i) => spr(m, FLORA_PALS[i], 2)),
      crystal: spr(CRYSTAL_MAT, { '0': '#002f36', '1': '#00acc1', '2': '#00e5ff', '3': '#84ffff', '4': '#ffffff' }, 2),
      cross: spr(CROSS_MAT, { '0': '#111', '1': '#ffd54f', '2': '#00e676', '3': '#fff' }, 2),
      arrL: spr(ARR_L_MAT, { '0': '#0c1a10', '1': '#a5d6a7', '2': '#ffffff' }, 2),
      arrR: spr(ARR_R_MAT, { '0': '#0c1a10', '1': '#a5d6a7', '2': '#ffffff' }, 2),
      gear: spr(GEAR_MAT, { '0': '#0d1f18', '1': '#80cbc4', '2': '#e0f2f1' }, 2),
      spk: spr(SPK_MAT, { '0': '#111111', '1': '#ffd54f', '2': '#fff9c4', '3': '#69f0ae' }, 2),
      fs: spr(FS_MAT, { '0': '#0d1f18', '1': '#ffd54f' }, 2),
      trp: spr(TRP_MAT, { '0': '#261600', '1': '#ffb300', '2': '#fff59d', '3': '#ffd54f', '4': '#ffffff' }, 2),
      rst: spr(RST_MAT, { '0': '#111111', '1': '#81c784', '2': '#e8f5e9' }, 2),
      playIc: spr(PLAY_IC_MAT, { '0': '#041007', '1': '#2e7d32', '2': '#ffffff' }, 2),
      bookIc: spr(BOOK_IC_MAT, { '0': '#1a0f05', '1': '#6d4c41', '2': '#ab47bc', '3': '#ffd54f' }, 2),
      joyIc: spr(JOY_IC_MAT, { '0': '#0b140d', '1': '#455a64', '2': '#00e5ff' }, 2),
      bootIc: spr(BOOT_IC_MAT, { '0': '#01243a', '1': '#29b6f6', '2': '#e1f5fe', '3': '#ffd54f' }, 2),
      handIc: spr(HAND_IC_MAT, { '0': '#261000', '1': '#ffb300', '2': '#fff59d', '3': '#ff6d00' }, 2),
      campfire: [
        spr(CAMPFIRE_F1, { '0': '#1a0f08', '1': '#d84315', '2': '#ff8f00', '3': '#ffd54f', '4': '#fff', '5': '#5d4037', '6': '#8d6e63' }, 2),
        spr(CAMPFIRE_F2, { '0': '#1a0f08', '1': '#d84315', '2': '#ff8f00', '3': '#ffd54f', '4': '#fff', '5': '#5d4037', '6': '#8d6e63' }, 2),
      ],
      shaman: spr(
        SHAMAN_MAT,
        {
          '0': '#101c12',
          '1': '#ffffff',
          '2': '#558b2f',
          '3': '#111111',
          '4': '#cfd8dc',
          '5': '#006064',
          '6': '#ffd54f',
          '7': '#00e5ff',
          '8': '#5d4037',
          '9': '#a1887f',
          c: '#e0f7fa',
        },
        2
      ),
      shaman2: spr(
        SHAMAN_MAT2,
        {
          '0': '#101c12',
          '1': '#ffffff',
          '2': '#558b2f',
          '3': '#111111',
          '4': '#cfd8dc',
          '5': '#00838f',
          '6': '#ffd54f',
          '7': '#84ffff',
          '8': '#5d4037',
          '9': '#a1887f',
          c: '#ffffff',
        },
        2
      ),
      larva: spr(LARVA_MAT, { '0': '#00262e', '1': '#00838f', '2': '#00e5ff', '3': '#84ffff', '4': '#ffffff' }, 2),
      larva2: spr(LARVA_MAT2, { '0': '#00262e', '1': '#00838f', '2': '#00e5ff', '3': '#84ffff', '4': '#ffffff' }, 2),
      totem: spr(TOTEM_MAT, { '0': '#1a1a1a', '1': '#37474f', '2': '#ff1744' }, 2),
      log: spr(LOG_MAT, { '0': '#1f1209', '1': '#4e342e', '2': '#6d4c41', '3': '#a1887f' }, 2),
      dummy: spr(DUMMY_MAT, { '0': '#1f1209', '1': '#d7ccc8', '2': '#ffe082', '3': '#8d6e63', '4': '#ff5252', '5': '#5d4037' }, 2),
      sign: spr(SIGN_MAT, { '0': '#1f1209', '1': '#5d4037', '2': '#8d6e63', '3': '#ffd54f' }, 2),
      merchant: spr(
        MERCHANT_MAT,
        { '0': '#101c12', '1': '#ffffff', '2': '#66bb6a', '3': '#111111', '4': '#fff59d', '5': '#6a1b9a', '6': '#ffd54f', '7': '#ff4081' },
        2
      ),
      merchant2: spr(
        MERCHANT_MAT2,
        { '0': '#101c12', '1': '#ffffff', '2': '#66bb6a', '3': '#111111', '4': '#fff59d', '5': '#7b1fa2', '6': '#ffd54f', '7': '#ff4081' },
        2
      ),
      chest: [
        spr(CHEST_CLOSED, { '0': '#1a0f05', '1': '#5d4037', '2': '#8d6e63', '3': '#ffb300', '4': '#fff59d' }, 2),
        spr(CHEST_OPEN, { '0': '#1a0f05', '1': '#5d4037', '2': '#8d6e63', '3': '#ffb300', '4': '#fff59d', '5': '#00e676' }, 2),
      ],
      key: spr(KEY_MAT, { '0': '#1a1200', '1': '#ffb300', '2': '#fff59d' }, 2),
      flyGold: [
        spr(FLY_GOLD1, { '0': '#1a1200', '1': '#ffd54f', '2': '#b3e5fc', '3': '#fff' }, 2),
        spr(FLY_GOLD2, { '0': '#1a1200', '1': '#ffd54f', '2': '#e1f5fe', '3': '#fff' }, 2),
      ],
      barrel: spr(BARREL_MAT, { '0': '#1f1209', '1': '#4e342e', '2': '#6d4c41' }, 2),
      pot: spr(POT_MAT, { '0': '#1f1209', '1': '#8d6e63', '2': '#d84315', '3': '#ffab91' }, 2),
      crate: spr(CRATE_MAT, { '0': '#1f1209', '1': '#5d4037', '2': '#8d6e63' }, 2),
      crown: spr(CROWN_MAT, CROWN_PAL, 2),
      crownSm: spr(CROWN_MAT, CROWN_PAL, 1),
      spike: [
        spr(SPIKE_DOWN, { '0': '#1a241e', '1': '#455a64' }, 2),
        spr(SPIKE_UP, { '0': '#263238', '1': '#90a4ae', '2': '#ff1744', '3': '#cfd8dc' }, 2),
      ],
      h: spr(HEART_MAT, { '0': '#2a0808', '1': '#e53935', '2': '#ffcdd2' }, 2),
      h0: spr(HEART_MAT, { '0': '#1a1012', '1': '#37474f', '2': '#546e7a' }, 2),
      sh: spr(SHIELD_MAT, { '0': '#051b2c', '1': '#039be5', '2': '#81d4fa', '3': '#fff' }, 2),
      lock: spr(LOCK_MAT, { '0': '#111', '1': '#ffd54f' }, 2),
      skull: spr(SKULL_MAT, { '0': '#111', '1': '#eceff1' }, 2),
      torch: [spr(TORCH_F1, TORCH_PAL, 2), spr(TORCH_F2, TORCH_PAL, 2)],
      obs: OB_MATS.map((m, i) => spr(m, OB_PALS[i], 2)),
      items: ITEM_MATS.map((m, i) => spr(m, ITEM_PALS[i], 2)),
      ankh: spr(ANKH_MAT, { '0': '#1a1000', '1': '#ffb300', '2': '#ffd54f', '3': '#00e676', '4': '#fff' }, 2),

      // Clean Borderless 2-Frame Enemies (Pure integer pixel scale — zero grid seams!)
      f: spr(EN_FLY, { '0': '#111111', '1': '#ab47bc', '2': '#ffffff', '3': '#80deea', '4': '#ff4081' }, 2),
      f_f2: spr(EN_FLY2, { '0': '#111111', '1': '#ba68c8', '2': '#ffffff', '3': '#e0f7fa', '4': '#ff80ab' }, 2),
      g: spr(EN_GAP, { '0': '#101c12', '1': '#7cb342', '2': '#ffffff', '3': '#00e5ff' }, 2),
      g_f2: spr(EN_GAP2, { '0': '#101c12', '1': '#8bc34a', '2': '#ffffff', '3': '#84ffff' }, 2),
      s: spr(EN_SHO, { '0': '#1a0826', '1': '#ffffff', '2': '#ab47bc', '3': '#f48fb1', '4': '#ffd54f' }, 2),
      s_f2: spr(EN_SHO2, { '0': '#1a0826', '1': '#ffffff', '2': '#ba68c8', '3': '#ff80ab', '4': '#fff59d' }, 2),
      c: spr(EN_CHG, { '0': '#210c04', '1': '#ff7043', '2': '#ffffff', '3': '#ffd54f', '4': '#ff1744' }, 2),
      c_f2: spr(EN_CHG2, { '0': '#210c04', '1': '#ff8a65', '2': '#ffffff', '3': '#ffe082', '4': '#ff5252' }, 2),
      m: spr(EN_SLI, { '0': '#072112', '1': '#00e676', '2': '#ffffff', '3': '#ff80ab' }, 3),
      m_f2: spr(EN_SLI2, { '0': '#072112', '1': '#00e676', '2': '#ffffff', '3': '#ff80ab' }, 3),
      n: spr(EN_SLI, { '0': '#072112', '1': '#69f0ae', '2': '#ffffff', '3': '#ff80ab' }, 2),
      n_f2: spr(EN_SLI2, { '0': '#072112', '1': '#69f0ae', '2': '#ffffff', '3': '#ff80ab' }, 2),
      bmb: spr(EN_BMB, { '0': '#1a0808', '1': '#ff1744', '2': '#ff9100', '3': '#ffffff' }, 2),
      bmb_f2: spr(EN_BMB2, { '0': '#1a0808', '1': '#ff5252', '2': '#ffd54f', '3': '#ffffff' }, 2),
      plt: spr(EN_PLT, { '0': '#1b5e20', '1': '#ff4081', '2': '#76ff03', '3': '#ffffff', '4': '#43a047' }, 2),
      plt_f2: spr(EN_PLT2, { '0': '#1b5e20', '1': '#ff1744', '2': '#76ff03', '3': '#ffffff', '4': '#43a047' }, 2),
      snk: spr(EN_SNK, { '0': '#00251a', '1': '#1de9b6', '2': '#ffd54f', '3': '#ffffff', '4': '#ff4081' }, 2),
      snk_f2: spr(EN_SNK2, { '0': '#00251a', '1': '#64ffda', '2': '#ffd54f', '3': '#ffffff', '4': '#ff80ab' }, 2),
      gho: spr(EN_GHO, { '0': '#1a237e', '1': '#e8eaf6', '2': '#00e5ff', '3': '#ff80ab' }, 2),
      gho_f2: spr(EN_GHO2, { '0': '#1a237e', '1': '#ffffff', '2': '#84ffff', '3': '#ff4081' }, 2),
      spd: spr(EN_SPD, { '0': '#120024', '1': '#7c4dff', '2': '#ff1744', '3': '#ffffff' }, 2),
      spd_f2: spr(EN_SPD2, { '0': '#120024', '1': '#9575cd', '2': '#ff5252', '3': '#ffffff' }, 2),

      // Clean Borderless Expressive Bosses (Pure integer scale s=4 — zero pixel grid lines!)
      B0: spr(BOSS_TOAD_F1, { '0': '#1b0508', '1': '#ffffff', '2': '#689f38', '3': '#d50000', '4': '#ffd54f', '5': '#ffff8d', '6': '#ff4081' }, 4),
      B0_f2: spr(BOSS_TOAD_F2, { '0': '#1b0508', '1': '#ffffff', '2': '#689f38', '3': '#d50000', '4': '#ffd54f', '5': '#ffff8d', '6': '#ff4081' }, 4),
      B0_2: spr(BOSS_TOAD_F1, { '0': '#1b0508', '1': '#ffffff', '2': '#d50000', '3': '#ffd54f', '4': '#ff9100', '5': '#ffffff', '6': '#ffeb3b' }, 4),
      B1: spr(EN_FLY, { '0': '#211000', '1': '#ffb300', '2': '#ffffff', '3': '#80deea', '4': '#ff1744' }, 4),
      B1_f2: spr(EN_FLY2, { '0': '#211000', '1': '#ffd54f', '2': '#ffffff', '3': '#e0f7fa', '4': '#ff4081' }, 4),
      B1_2: spr(EN_FLY2, { '0': '#2a0008', '1': '#ff1744', '2': '#ffd54f', '3': '#ffffff', '4': '#00e5ff' }, 4),
      B2: spr(EN_SNK, { '0': '#001f13', '1': '#00e676', '2': '#ffd54f', '3': '#ffffff', '4': '#ff4081' }, 4),
      B2_f2: spr(EN_SNK2, { '0': '#001f13', '1': '#69f0ae', '2': '#ffd54f', '3': '#ffffff', '4': '#ff80ab' }, 4),
      B2_2: spr(EN_SNK2, { '0': '#260516', '1': '#d500f9', '2': '#ffd54f', '3': '#ffffff', '4': '#00e5ff' }, 4),
      B3: spr(EN_CHG, { '0': '#002116', '1': '#00bfa5', '2': '#ffffff', '3': '#ffd54f', '4': '#00e5ff' }, 4),
      B3_f2: spr(EN_CHG2, { '0': '#002116', '1': '#1de9b6', '2': '#ffffff', '3': '#ffd54f', '4': '#84ffff' }, 4),
      B3_2: spr(EN_CHG2, { '0': '#260e00', '1': '#ff6d00', '2': '#ffffff', '3': '#ffd54f', '4': '#ff1744' }, 4),
      B4: spr(BOSS_TOAD_F1, { '0': '#120024', '1': '#ffffff', '2': '#7c4dff', '3': '#00e676', '4': '#00e5ff', '5': '#84ffff', '6': '#ff4081' }, 4),
      B4_f2: spr(BOSS_TOAD_F2, { '0': '#120024', '1': '#ffffff', '2': '#9575cd', '3': '#00e676', '4': '#00e5ff', '5': '#84ffff', '6': '#ff4081' }, 4),
      B4_2: spr(BOSS_TOAD_F1, { '0': '#2a0008', '1': '#ffffff', '2': '#ff1744', '3': '#ffd54f', '4': '#76ff03', '5': '#ffffff', '6': '#00e5ff' }, 4),
    };
  }

  initVignette() {
    const k = document.createElement('canvas');
    k.width = W;
    k.height = H;
    const x = k.getContext('2d')!;
    const r = x.createRadialGradient(240, 160, 100, 240, 160, 285);
    r.addColorStop(0, '#0000');
    r.addColorStop(1, '#000a');
    x.fillStyle = r;
    x.fillRect(0, 0, W, H);
    this.VIG = k;
  }

  initNetChannel() {
    try {
      this.bc = new BroadcastChannel('sapinhos_coop_broadcast');
      this.bc.onmessage = (ev) => {
        const m = ev.data;
        if (!m || !m.t) return;
        this.handleNetMsg(m.t, m.d);
      };
    } catch (e) {}
  }

  emitNet(t: string, d: any) {
    if (this.bc) {
      try {
        this.bc.postMessage({ t, d });
      } catch (e) {}
    }
  }

  toggleBotPartner() {
    this.botPartner.active = !this.botPartner.active;
    if (this.botPartner.active) {
      this.botPartner.ch = (this.me.ch + 1) % CH.length;
      this.botPartner.w = CH[this.botPartner.ch].wp;
      this.botPartner.x = this.me.x + 24;
      this.botPartner.y = this.me.y;
      this.botPartner.hp = 6;
      this.botPartner.mh = 6;
      this.botPartner.dead = false;
      this.botPartner.revP = 0;
      this.pt(this.botPartner.x, this.botPartner.y, '#00e5ff', 24, 110, 0.5, 3);
      this.FT.push({
        x: this.botPartner.x,
        y: this.botPartner.y - 24,
        s: `PARCEIRO CO-OP: ${CH[this.botPartner.ch].n.toUpperCase()} ENTROU!`,
        c: '#00e5ff',
        l: 1.5,
        b: 1,
      });
      this.unlockAch('coop');
      this.snd(480, 0.25, 'triangle', 0.08, 320);
    } else {
      this.FT.push({
        x: this.me.x,
        y: this.me.y - 24,
        s: 'PARCEIRO CO-OP DESATIVADO',
        c: '#ffe082',
        l: 1.2,
      });
    }
  }

  snd(f: number, d: number, ty: OscillatorType = 'square', v = 0.05, sl = 0) {
    if (this.CFG.muted || this.CFG.sfx <= 0) return;
    try {
      this.audioCtx = this.audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const o = this.audioCtx.createOscillator();
      const gn = this.audioCtx.createGain();
      const t = this.audioCtx.currentTime;
      const vol = v * this.CFG.sfx;
      o.type = ty;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(28, f + sl), t + d);
      gn.gain.setValueAtTime(vol, t);
      gn.gain.exponentialRampToValueAtTime(0.0008, t + d);
      o.connect(gn);
      gn.connect(this.audioCtx.destination);
      o.start();
      o.stop(t + d);
    } catch (e) {}
  }

  addShake(v: number) {
    this.shake = Math.max(this.shake, v * this.CFG.shake);
  }

  addHitStop(v: number) {
    if (this.CFG.hitstop) this.hs = Math.max(this.hs, v);
  }

  pt(
    x: number,
    y: number,
    c: string,
    n: number,
    sp = 60,
    l = 0.5,
    sz = 3,
    gr = 0,
    bncFloor = 0,
    shape: Particle['shape'] = 'pixel',
    glowAmt = 0.45
  ) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const v = sp * (0.3 + Math.random());
      this.P.push({
        x,
        y,
        ox: x,
        oy: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        l: l * (0.6 + Math.random() * 0.6),
        m: l,
        c,
        s: sz * (0.6 + Math.random() * 0.8),
        g: gr,
        bf: bncFloor ? y + 8 + Math.random() * 12 : 0,
        bnc: 0.62 + Math.random() * 0.16,
        drag: 1.8,
        shape,
        glow: glowAmt,
      });
    }
    if (this.P.length > 1100) this.P.splice(0, this.P.length - 1100);
  }

  /**
   * Clean & Crisp Neon Projectile Trail Emitter with Gravity Physics & Floor Bounces
   */
  emitProjectileTrail(b: { x: number; y: number; vx: number; vy: number; r?: number; w?: number; col?: string }, isEnemy = false) {
    const baseCol = isEnemy ? '#ff1744' : b.col || WP[b.w || 0]?.col || '#76ff03';
    const neonAccents = isEnemy
      ? ['#ff1744', '#ff9100']
      : [baseCol, '#00e5ff', '#76ff03', '#ffd54f'];
    const c = Math.random() < 0.8 ? baseCol : neonAccents[(Math.random() * neonAccents.length) | 0];
    const ang = Math.atan2(b.vy, b.vx) + Math.PI + (Math.random() - 0.5) * 0.5;
    const spd = 12 + Math.random() * 24;

    this.P.push({
      x: b.x + (Math.random() - 0.5) * 2,
      y: b.y + (Math.random() - 0.5) * 2,
      ox: b.x,
      oy: b.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 8,
      l: 0.16 + Math.random() * 0.12,
      m: 0.24,
      c,
      c2: '#ffffff',
      s: Math.min(2.6, (b.r || 3.5) * 0.52),
      g: 210,
      bf: b.y + 6 + Math.random() * 7,
      bnc: 0.62,
      drag: 1.8,
      shape: Math.random() < 0.4 ? 'spark' : 'droplet',
      glow: 0.35,
    });
    if (this.P.length > 650) this.P.shift();
  }

  /**
   * Clean Neon Wall & Obstacle Impact Emitter with Gravity Shrapnel & Shockwave Ring
   */
  emitWallImpact(x: number, y: number, vx: number, vy: number, col: string, isBounce = false) {
    const neonPal = [col, '#00e5ff', '#76ff03', '#ffd54f', '#ffffff'];
    const baseAng = Math.atan2(-vy, -vx);
    const count = isBounce ? 5 : 8;

    this.P.push({
      x,
      y,
      vx: 0,
      vy: 0,
      l: 0.18,
      m: 0.18,
      c: col,
      c2: '#ffffff',
      s: isBounce ? 10 : 14,
      g: 0,
      shape: 'ring',
      glow: 0.55,
    });

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 2.1;
      const a = baseAng + spread;
      const sp = (38 + Math.random() * 85) * (isBounce ? 0.8 : 1.0);
      const pCol = i < 3 ? col : neonPal[(Math.random() * neonPal.length) | 0];
      const isSpark = i % 2 === 0;
      this.P.push({
        x,
        y,
        ox: x,
        oy: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (16 + Math.random() * 32),
        l: 0.26 + Math.random() * 0.24,
        m: 0.42,
        c: pCol,
        c2: '#ffffff',
        s: isSpark ? 2.0 + Math.random() * 1.2 : 2.2 + Math.random() * 1.4,
        g: 270,
        bf: y + 6 + Math.random() * 14,
        bnc: 0.65 + Math.random() * 0.14,
        drag: 1.6,
        shape: isSpark ? 'spark' : 'droplet',
        glow: 0.45,
      });
    }
    if (this.P.length > 650) this.P.splice(0, this.P.length - 650);
  }

  /**
   * Clean Neon Enemy Destruction Emitter with Multi-Bounce Gravity Physics & Shockwaves
   */
  emitEnemyDestruction(e: Enemy) {
    const bo = e.t.startsWith('B');
    const baseCol = CL_STATS[e.t] || '#00e676';
    const neonBurstPal = [baseCol, '#76ff03', '#00e5ff', '#ff4081', '#ffd54f', '#ffffff'];
    const totalDrops = bo ? 36 : e.chmp ? 20 : 12;
    const totalSparks = bo ? 14 : e.chmp ? 8 : 6;

    const ringCnt = bo ? 2 : 1;
    for (let r = 0; r < ringCnt; r++) {
      this.P.push({
        x: e.x,
        y: e.y,
        vx: 0,
        vy: 0,
        l: 0.26 + r * 0.08,
        m: 0.26 + r * 0.08,
        c: r === 0 ? baseCol : neonBurstPal[(r * 2) % neonBurstPal.length],
        c2: '#ffffff',
        s: (bo ? 34 : e.chmp ? 22 : 16) + r * 10,
        g: 0,
        shape: 'ring',
        glow: 0.65,
      });
    }

    for (let i = 0; i < totalDrops; i++) {
      const a = Math.random() * 6.283;
      const horizSp = (bo ? 125 : 80) * (0.25 + Math.random() * 0.8);
      const upBoost = -35 - Math.random() * (bo ? 110 : 75);
      const col = i % 2 === 0 ? baseCol : neonBurstPal[(Math.random() * neonBurstPal.length) | 0];
      this.P.push({
        x: e.x + (Math.random() - 0.5) * 6,
        y: e.y + (Math.random() - 0.5) * 4,
        ox: e.x,
        oy: e.y,
        vx: Math.cos(a) * horizSp,
        vy: Math.sin(a) * horizSp * 0.6 + upBoost,
        l: (bo ? 0.78 : 0.52) * (0.65 + Math.random() * 0.5),
        m: bo ? 0.78 : 0.52,
        c: col,
        c2: '#ffffff',
        s: (bo ? 3.4 : 2.6) * (0.65 + Math.random() * 0.55),
        g: 300,
        bf: e.y + 6 + Math.random() * 18,
        bnc: 0.64 + Math.random() * 0.16,
        drag: 1.5,
        shape: i % 4 === 0 ? 'star' : 'droplet',
        glow: 0.5,
      });
    }

    for (let i = 0; i < totalSparks; i++) {
      const a = (i / totalSparks) * 6.283 + (Math.random() - 0.5) * 0.35;
      const sp = (bo ? 175 : 120) * (0.5 + Math.random() * 0.65);
      const col = neonBurstPal[i % neonBurstPal.length];
      this.P.push({
        x: e.x,
        y: e.y,
        ox: e.x,
        oy: e.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 20,
        l: 0.3 + Math.random() * 0.2,
        m: 0.42,
        c: col,
        c2: '#ffffff',
        s: 2.2 + Math.random() * 1.2,
        g: 210,
        bf: e.y + 8 + Math.random() * 14,
        bnc: 0.68,
        drag: 1.8,
        shape: 'spark',
        glow: 0.55,
      });
    }
    if (this.P.length > 650) this.P.splice(0, this.P.length - 650);
  }

  dust(x: number, y: number, c: string, n: number) {
    this.pt(x, y, c, n, 55, 0.35, 2.4, 210, 1, 'droplet', 0.3);
  }

  spawnCasing(x: number, y: number, ang: number, col: string) {
    const sideA = ang + (Math.random() < 0.5 ? 1.57 : -1.57) + (Math.random() - 0.5) * 0.5;
    const sp = 28 + Math.random() * 35;
    this.CASINGS.push({
      x,
      y,
      z: 6,
      vx: Math.cos(sideA) * sp,
      vy: Math.sin(sideA) * sp,
      vz: 55 + Math.random() * 35,
      l: 4.5,
      col,
    });
    if (this.CASINGS.length > 60) this.CASINGS.shift();
  }

  initPlayer(cIdx: number) {
    this.ch = cIdx;
    const c = CH[this.ch];
    const u = this.achStats.upg || { hp: 0, dm: 0, sp: 0, gold: 0, luck: 0 };
    const achHp = this.achData.all_chars ? 1 : 0;
    const achDm = (this.achData.first_blood ? 0.05 : 0) + (this.achData.big_dmg ? 0.2 : 0);
    const achSp = (this.achData.b3 ? 4 : 0) + (this.achData.untouch ? 3 : 0);
    const achRt = this.achData.b4 ? 0.95 : 1.0;

    const totalHp = c.hp + u.hp + achHp;
    const totalDm = +(c.dm * (1 + u.dm * 0.12) + achDm).toFixed(2);
    const totalSp = Math.round((c.sp + 14) * (1 + u.sp * 0.06) + achSp);

    this.me = {
      id: this.me ? this.me.id : Math.random().toString(36).slice(2, 8),
      x: this.me ? this.me.x : 240,
      y: this.me ? this.me.y : 225,
      z: 0,
      jumpT: 0,
      jumpCd: 0,
      jvx: 0,
      jvy: 0,
      ang: 1.57,
      hp: totalHp,
      mh: totalHp,
      sp: totalSp,
      dm: totalDm,
      rt: +(c.rt * achRt).toFixed(3),
      cd: 0,
      dead: false,
      inv: 0,
      ax: 0,
      ay: 1,
      w: c.wp,
      pr: 0,
      hm: c.hm,
      big: 1,
      sh: c.sh,
      shi: c.sh,
      fly: c.fly,
      tri: 0,
      tox: 0,
      bnc: 0,
      fam: 0,
      vmp: 0,
      exp: 0,
      rear: 0,
      hyper: 0,
      elec: 0,
      clone: 0,
      ankh: 0,
      kills: 0,
      gold: this.me ? this.me.gold : u.gold * 4,
      keys: this.me ? this.me.keys : 1 + (this.achData.synergy ? 1 : 0),
      revP: 0,
      its: [],
      syn: {},
      j: 0,
      v: 0,
      mvx: 0,
      mvy: 0,
      puff: 0,
      wf: 0,
      ch: this.ch,
    };
  }

  initCampFloraAndNodes() {
    this.FLORA = [
      { x: 48, y: 78, t: 0 },
      { x: 138, y: 82, t: 1 },
      { x: 342, y: 78, t: 2 },
      { x: 428, y: 88, t: 0 },
      { x: 54, y: 202, t: 2 },
      { x: 146, y: 266, t: 1 },
      { x: 336, y: 258, t: 0 },
      { x: 422, y: 234, t: 1 },
      { x: 372, y: 178, t: 2 },
    ];
    this.campNodes = [
      { x: 392, y: 68, hp: 10, mh: 10, respawnT: 0, j: 0, v: 0, fl: 0, col: '#00e5ff' },
      { x: 418, y: 184, hp: 10, mh: 10, respawnT: 0, j: 0, v: 0, fl: 0, col: '#76ff03' },
      { x: 378, y: 266, hp: 10, mh: 10, respawnT: 0, j: 0, v: 0, fl: 0, col: '#ffd54f' },
      { x: 76, y: 72, hp: 10, mh: 10, respawnT: 0, j: 0, v: 0, fl: 0, col: '#e040fb' },
    ];
  }

  reset(toCamp = true) {
    const oldId = this.me ? this.me.id : null;
    this.initPlayer(this.ch);
    if (oldId) this.me.id = oldId;

    this.wd = {
      bIdx: this.camp.sign.bIdx || 0,
      fSeed: ((Math.random() * 99999) | 0) + 1,
      gx: 2,
      gy: 2,
      grid: null,
      en: [],
      eb: [],
      clear: true,
      over: '',
      trapdoor: false,
    };
    this.initFloor(this.wd.bIdx, this.wd.fSeed);

    this.myB = [];
    this.rB = [];
    this.BEAMS = [];
    this.POOLS = [];
    this.DROPS = [];
    this.FLIES = [];
    this.LARVAE = [];
    this.ARCS = [];
    this.TABLES = [];
    this.PROPS = [];
    this.CASINGS = [];
    this.GHOSTS = [];
    this.DC = [];
    this.comboCount = 0;
    this.comboTimer = 0;
    this.lastKey = '';
    this.prevOver = '';
    this.hint = 8;
    this.roomDamaged = false;

    if (toCamp) {
      this.ST = 'camp';
      this.me.x = 240;
      this.me.y = 235;
      this.initCampFloraAndNodes();
      document.body.dataset.state = 'camp';
    } else {
      this.ST = 'play';
      this.enterCell(2, 2, '');
      this.lastKey = this.rmKey();
      document.body.dataset.state = 'playing';
    }
    if (this.botPartner.active) {
      this.botPartner.x = this.me.x + 24;
      this.botPartner.y = this.me.y;
      this.botPartner.dead = false;
      this.botPartner.hp = this.botPartner.mh;
    }
    if (this.onStateChange) this.onStateChange(this.ST);
  }

  initFloor(bIdx: number, seed: number) {
    this.wd.bIdx = bIdx;
    this.wd.fSeed = seed || ((Math.random() * 99999) | 0) + 1;
    this.wd.gx = 2;
    this.wd.gy = 2;
    const luckLvl = this.achStats.upg?.luck || 0;
    const luckBonus = luckLvl * 0.08 + (this.achData.synergy ? 0.05 : 0);
    this.wd.grid = generateDungeonGrid(this.wd.bIdx, this.wd.fSeed, this.ch, luckBonus);
    this.wd.en = [];
    this.wd.eb = [];
    this.wd.clear = true;
    this.wd.over = '';
    this.wd.trapdoor = false;
    this.lastKey = '';
  }

  isCharUnlocked(i: number): boolean {
    const req = CH[i].req;
    return !req || !!this.achData[req];
  }

  unlockAch(id: string) {
    if (this.achData[id]) return;
    const a = ACH_LIST.find((x) => x.id === id);
    if (!a) return;
    this.achData[id] = Date.now();
    const reward = id === 'win' || id === 'all_chars' ? 2 : 1;
    this.achStats.larvae += reward;
    const toastItem = { lbl: `CONQUISTA (+${reward} LARVA${reward > 1 ? 'S' : ''})!`, nm: a.nm, ds: a.ds, ic: a.ic };
    this.toastQueue.push(toastItem);
    this.processToast();

    if (id !== 'all_chars' && CH.every((_, i) => this.isCharUnlocked(i))) {
      const allA = ACH_LIST.find((x) => x.id === 'all_chars');
      if (allA && !this.achData['all_chars']) {
        this.achData['all_chars'] = Date.now();
        this.achStats.larvae += 2;
        this.toastQueue.push({ lbl: 'CONQUISTA (+2 LARVAS)!', nm: allA.nm, ds: allA.ds, ic: allA.ic });
        this.processToast();
      }
    }
    this.saveProgress();
  }

  processToast() {
    if (this.toastBusy || !this.toastQueue.length) return;
    this.toastBusy = true;
    const a = this.toastQueue.shift()!;
    if (this.onToast) this.onToast(a);
    this.snd(523, 0.12, 'triangle', 0.08, 120);
    setTimeout(() => this.snd(659, 0.12, 'triangle', 0.08, 140), 90);
    setTimeout(() => this.snd(784, 0.25, 'triangle', 0.09, 220), 180);
    setTimeout(() => {
      this.toastBusy = false;
      this.processToast();
    }, 3200);
  }

  checkSynergies() {
    const active = getActiveSynergies(this.me.w, this.me.its);
    for (const syn of active) {
      if (!this.me.syn[syn.id]) {
        this.me.syn[syn.id] = 1;
        this.toastQueue.push({ lbl: 'SINERGIA DESCOBERTA!', nm: syn.name, ds: syn.desc, ic: syn.icon });
        this.processToast();
        this.FT.push({
          x: this.me.x,
          y: this.me.y - 36,
          s: `SINERGIA DESCOBERTA: ${syn.name}!`,
          c: '#ffd54f',
          l: 2.2,
          b: 1,
        });
        this.snd(580, 0.35, 'triangle', 0.09, 620);
      }
    }
  }

  triggerJump() {
    if (!this.me || this.me.dead || this.me.jumpT > 0 || this.me.jumpCd > 0 || this.paused) return;
    const spLvl = this.achStats.upg?.sp || 0;
    this.me.jumpT = 0.42;
    this.me.jumpCd = Math.max(0.38, 0.58 - spLvl * 0.035);
    this.me.j = -0.45;

    const b = this.CFG.binds || DEFAULT_BINDS;
    let dx = (this.keys[b.right] ? 1 : 0) - (this.keys[b.left] ? 1 : 0) + this.touchState.lx;
    let dy = (this.keys[b.down] ? 1 : 0) - (this.keys[b.up] ? 1 : 0) + this.touchState.ly;
    const dl = Math.hypot(dx, dy);
    if (dl > 0.1) {
      dx /= dl;
      dy /= dl;
    } else {
      dx = this.me.ax || 0;
      dy = this.me.ay || 1;
    }
    this.me.jvx = dx * this.me.sp * 1.72;
    this.me.jvy = dy * this.me.sp * 1.72;
    this.dust(this.me.x, this.me.y + 8, '#b9f6ca', 10);
    this.snd(310, 0.14, 'sine', 0.06, 280);
  }

  updatePlayerZAndMove(dt: number) {
    if (this.me.jumpCd > 0) this.me.jumpCd = Math.max(0, this.me.jumpCd - dt);

    const b = this.CFG.binds || DEFAULT_BINDS;
    let mx = (this.keys[b.right] ? 1 : 0) - (this.keys[b.left] ? 1 : 0) + this.touchState.lx;
    let my = (this.keys[b.down] ? 1 : 0) - (this.keys[b.up] ? 1 : 0) + this.touchState.ly;
    const l = Math.hypot(mx, my);
    if (l > 1) {
      mx /= l;
      my /= l;
    }

    if (this.me.jumpT > 0) {
      this.me.jumpT -= dt;
      this.me.z = calculateZ(this.me.jumpT, 0.42, 24);
      this.me.mvx = this.me.jvx * 0.85 + mx * this.me.sp * 0.35;
      this.me.mvy = this.me.jvy * 0.85 + my * this.me.sp * 0.35;

      // Spawn afterimage ghost trail while in mid-air
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0 && this.me.z > 6) {
        this.ghostTimer = 0.045;
        this.GHOSTS.push({ x: this.me.x, y: this.me.y, z: this.me.z, l: 0.22 });
      }

      if (this.me.jumpT <= 0) {
        this.me.jumpT = 0;
        this.me.z = 0;
        this.me.j = 0.38;
        this.dust(this.me.x, this.me.y + 10, '#a5d6a7', 11);
        this.snd(190, 0.08, 'triangle', 0.05, -70);
        if (this.ST === 'play') this.breakNearbyProps(this.me.x, this.me.y, 24);
      }
    } else {
      this.me.z = 0;
      const inW = this.ST === 'play' && !this.me.fly && this.inWater(this.me.x, this.me.y);
      const inSlowWeb =
        this.ST === 'play' &&
        !this.me.fly &&
        this.POOLS.some((pl) => pl.slow && Math.hypot(pl.x - this.me.x, pl.y - this.me.y) < pl.r);
      const slowMult = inSlowWeb ? 0.55 : inW ? 0.68 : 1.0;
      this.me.mvx = mx * this.me.sp * slowMult;
      this.me.mvy = my * this.me.sp * slowMult;
      if (l > 0.1) {
        this.me.wf = ((this.TT * 12) | 0) % 2;
        this.me.v += Math.sin(this.TT * 24) * 1.1;
        if (Math.random() < dt * 15) {
          const isApex = this.me.its.length >= 5 || Object.keys(this.me.syn).length > 0;
          this.dust(
            this.me.x,
            this.me.y + 11,
            isApex ? CH[this.me.ch].a : slowMult < 1 ? '#26c6da' : '#66bb6a',
            1
          );
        }
      } else {
        this.me.wf = 0;
      }
    }

    this.me.x += this.me.mvx * dt;
    this.me.y += this.me.mvy * dt;

    // 360° Analog & Mobile Reticle Aiming (Crosshair follows mobile aim!)
    let sx = (this.keys.ArrowRight ? 1 : 0) - (this.keys.ArrowLeft ? 1 : 0) + this.touchState.rx;
    let sy = (this.keys.ArrowDown ? 1 : 0) - (this.keys.ArrowUp ? 1 : 0) + this.touchState.ry;
    const sl = Math.hypot(sx, sy);
    if (sl > 0.08) {
      this.me.ax = sx / sl;
      this.me.ay = sy / sl;
      this.me.ang = Math.atan2(this.me.ay, this.me.ax);
      const aimDist = 36 + Math.min(1, sl) * 68;
      this.mouse.x = clamp(this.me.x + this.me.ax * aimDist, 14, W - 14);
      this.mouse.y = clamp(this.me.y - 6 - this.me.z + this.me.ay * aimDist, 14, H - 14);
    } else if (!this.mouse.active) {
      if (this.touchState.lActive && l > 0.15) {
        this.me.ax = mx / l;
        this.me.ay = my / l;
        this.me.ang = Math.atan2(this.me.ay, this.me.ax);
      }
      this.mouse.x = clamp(this.me.x + this.me.ax * 58, 14, W - 14);
      this.mouse.y = clamp(this.me.y - 6 - this.me.z + this.me.ay * 58, 14, H - 14);
    } else if (this.mouse.active) {
      const dy = this.mouse.y - (this.me.y - 6 - this.me.z);
      const dx = this.mouse.x - this.me.x;
      this.me.ang = Math.atan2(dy, dx);
      this.me.ax = Math.cos(this.me.ang);
      this.me.ay = Math.sin(this.me.ang);
    }

    const wantFire = this.mouse.down || sl > 0.15 || !!(b.shoot && this.keys[b.shoot]);
    this.me.cd -= dt;
    if (wantFire && this.me.cd <= 0 && this.me.z <= 8) {
      this.fire();
    }
  }

  fire() {
    const w = WP[this.me.w];
    const q = Math.hypot(this.me.ax, this.me.ay) || 1;
    const dx = this.me.ax / q;
    const dy = this.me.ay / q;
    const baseA = Math.atan2(dy, dx);
    let n = (w.n || 1) + (this.me.tri ? 2 : 0);
    if (this.me.syn['shoal'] && this.me.w === 1) n += 2;
    if (this.me.syn['hydra'] && this.me.w === 3) n = Math.max(n, 3);
    this.me.puff = 0.24;

    const dirs = [baseA];
    if (this.me.rear) dirs.push(baseA + Math.PI);

    // Spawn organic abilities directly from the frog's open mouth!
    const mouthX = this.me.x + dx * 6;
    const mouthY = this.me.y - 7 - this.me.z + dy * 4;

    const shootFrom = (ox: number, oy: number, mult: number) => {
      for (const dA of dirs) {
        for (let i = 0; i < n; i++) {
          const a = dA + (n > 1 ? (i - (n - 1) / 2) * 0.22 : 0) + (w.jit ? (Math.random() - 0.5) * w.jit : 0);
          if (w.beam) this.fireBeam(ox + Math.cos(a) * 6, oy + Math.sin(a) * 6, a, w);
          else this.spawnBullet(ox + Math.cos(a) * 5, oy + Math.sin(a) * 5, a, w, mult);
        }
      }
    };

    shootFrom(mouthX, mouthY, 1.0);
    if (this.me.clone) {
      const cx = this.me.x - dx * 20 + dy * 14;
      const cy = this.me.y - 6 - dy * 20 - dx * 14;
      shootFrom(cx, cy, 0.55);
    }
    if (this.me.fam) {
      for (let f = 0; f < this.me.fam; f++) {
        const fa = this.TT * 3.5 + f * 3.14;
        const fx = this.me.x + Math.cos(fa) * 24;
        const fy = this.me.y + Math.sin(fa) * 18;
        this.spawnBullet(fx, fy, baseA, WP[0], 0.55);
      }
    }

    this.me.cd = this.me.rt * w.rt;
    this.me.v += this.me.w >= 4 ? -9.5 : -5.5;
    this.snd(
      this.me.w === 5 ? 140 : this.me.w === 4 ? 115 : this.me.w === 3 ? 620 : 390,
      0.09,
      this.me.w >= 4 ? 'sawtooth' : 'square',
      0.04,
      -130
    );
    // Organic saliva / slime spray droplets from the frog's mouth on spit
    this.pt(mouthX + dx * 4, mouthY + dy * 4, w.col, 4, 58, 0.2, 2.2, 180, 1, 'droplet', 0.4);
    if (this.me.w >= 4 && this.me.z <= 2) {
      this.me.x -= dx * 2.8;
      this.me.y -= dy * 2.8;
      this.addShake(3.0);
    } else {
      this.addShake(1.0);
    }
  }

  spawnBullet(x: number, y: number, a: number, w: any, dmgMult = 1, extra: any = {}) {
    const spMult = this.me.hyper ? 1.32 : 1.0;
    const vx = Math.cos(a) * w.sp * spMult + (this.me.mvx || 0) * 0.2;
    const vy = Math.sin(a) * w.sp * spMult + (this.me.mvy || 0) * 0.2;
    const r = (extra.r || w.r) * this.me.big * (this.me.hyper ? 1.2 : 1);
    const isShoal = !!this.me.syn['shoal'] && this.me.w === 1;
    const isMortar = !!this.me.syn['mortar'] && this.me.w === 4;
    const isFoam = !!this.me.syn['foam'] && this.me.w === 2;
    const isRoyal = !!this.me.syn['royal'] && this.me.w === 0;

    const bObj: Bullet = {
      x,
      y,
      ox: x,
      oy: y,
      vx,
      vy,
      l: extra.l || w.l || 1.15,
      r,
      d: w.dm * this.me.dm * (this.me.big > 1 ? 1.25 : 1) * (this.me.elec ? 1.4 : 1) * dmgMult,
      p: w.pi || this.me.pr || w.tng || isRoyal,
      bnc: extra.bnc !== undefined ? extra.bnc : (w.bnc || 0) + this.me.bnc + (isMortar ? 2 : 0),
      aoe: (w.aoe || 0) + (this.me.exp ? 24 : 0),
      pool: w.pool || this.me.tox || isMortar,
      tng: w.tng,
      oid: extra.oid || this.me.id,
      w: this.me.w,
      col: isRoyal ? '#00ffaa' : extra.col || w.col,
      shoal: isShoal ? 1 : 0,
      foam: isFoam && !extra.noSplit ? 1 : 0,
      royal: isRoyal ? 1 : 0,
      chem: 0,
      trailT: 0,
      hit: [],
      ka: a,
    };
    this.myB.push(bObj);
  }

  triggerAoE(b: Bullet) {
    if (b.foam) {
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * 6.283;
        this.spawnBullet(b.x, b.y, a, WP[2], 0.45, { r: 2.5, l: 0.35, bnc: 1, noSplit: 1 });
      }
    }
    if (b.pool) {
      this.POOLS.push({
        x: b.x,
        y: b.y,
        r: b.aoe ? Math.max(18, b.aoe * 0.7) : 18,
        l: 3.2,
        tk: 0,
        c: b.col === '#00ffaa' ? '#00ffaa' : '#76ff03',
      });
      if (this.POOLS.length > 22) this.POOLS.shift();
    }
    if (b.aoe > 0) {
      this.pt(b.x, b.y, b.col || '#b2ff59', 14, 95, 0.4, 2.8);
      for (const e of this.wd.en) {
        if (Math.hypot(e.x - b.x, e.y - b.y) < b.aoe + (RAD_STATS[e.t] || 12)) {
          this.hitEnemy(e, b.d * 0.55, 0, 0, b.oid);
        }
      }
    }
  }

  fireBeam(x: number, y: number, a: number, w: any, isBounce = false) {
    const bw = 6 * this.me.big;
    this.BEAMS.push({ x, y, a, col: w.col, l: 0.22, m: 0.22, w: bw });
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const dmg = w.dm * this.me.dm * (this.me.big > 1 ? 1.25 : 1) * (this.me.elec ? 1.4 : 1) * (isBounce ? 0.65 : 1);

    if (this.ST === 'camp') {
      const dm = this.camp.dummy;
      const vx = dm.x - x;
      const vy = dm.y - y;
      const proj = vx * dx + vy * dy;
      if (proj > 0 && proj < 420 && Math.abs(vx * dy - vy * dx) < 18) this.hitDummy(dmg);
    } else {
      for (const pr of this.PROPS) {
        if (!pr.dead) {
          const vx = pr.x - x;
          const vy = pr.y - y;
          const proj = vx * dx + vy * dy;
          if (proj > 0 && proj < 460 && Math.abs(vx * dy - vy * dx) < 14) this.breakProp(pr);
        }
      }
      for (const e of this.wd.en) {
        const vx = e.x - x;
        const vy = e.y - y;
        const proj = vx * dx + vy * dy;
        if (proj > 0 && proj < 460 && Math.abs(vx * dy - vy * dx) < (RAD_STATS[e.t] || 12) + 8 * this.me.big) {
          this.hitEnemy(e, dmg, dx * 9, dy * 9, this.me.id);
        }
      }
    }
    if (!isBounce && this.me.syn['prism']) {
      const hitX = clamp(x + dx * 240, M + 8, W - M - 8);
      const hitY = clamp(y + dy * 240, M + 8, H - M - 8);
      const refA = Math.atan2(-dy, dx) + 0.35;
      this.fireBeam(hitX, hitY, refA, w, true);
    }
  }

  curCell(): DungeonCell | null {
    if (!this.wd || !this.wd.grid) return null;
    return this.wd.grid[this.wd.gy]?.[this.wd.gx] || null;
  }

  rmKey(bIdx = this.wd.bIdx, gx = this.wd.gx, gy = this.wd.gy): string {
    return `${bIdx}_${gx}_${gy}_${this.wd.fSeed}`;
  }

  buildRoomLayout(key: string, cell: DungeonCell, bIdx: number) {
    if (this.RK_CACHE[key]) return;
    const r = createPseudoRandom((cell.gx * 31 + cell.gy * 97 + bIdx * 313 + this.wd.fSeed) | 0);
    const a: Array<{ cx: number; cy: number; x: number; y: number }> = [];
    const hz = { water: [] as any[], spikes: [] as any[], tables: [] as any[], props: [] as any[] };

    const addBlk = (cx: number, cy: number) => {
      if (cx >= 5 && cx <= 7 && (cy <= 1 || cy >= 6)) return;
      if (cy >= 3 && cy <= 4 && (cx <= 1 || cx >= 11)) return;
      if (cx === 6 && cy === 4) return;
      if (!a.some((q) => q.cx === cx && q.cy === cy)) a.push({ cx, cy, x: M + cx * 32, y: M + cy * 32 });
    };

    if (cell.type === 'combat') {
      const lay = cell.lay;
      if (lay === 0) {
        [[2, 1], [10, 1], [2, 6], [10, 6], [3, 2], [9, 2], [3, 5], [9, 5]].forEach(([x, y]) => addBlk(x, y));
      } else if (lay === 1) {
        [[5, 3], [7, 3], [3, 1], [9, 1], [3, 6], [9, 6], [2, 4], [10, 4]].forEach(([x, y]) => addBlk(x, y));
      } else if (lay === 2) {
        hz.water.push(
          { x: M + 64, y: M + 54, rx: 50, ry: 32 },
          { x: W - M - 64, y: M + 54, rx: 50, ry: 32 },
          { x: 240, y: 168, rx: 60, ry: 30 }
        );
        [[3, 2], [9, 2], [4, 5], [8, 5]].forEach(([x, y]) => addBlk(x, y));
      } else if (lay === 3) {
        [[4, 2], [8, 2], [4, 5], [8, 5], [6, 2], [6, 5], [3, 4], [9, 4]].forEach(([cx, cy]) => {
          hz.spikes.push({ cx, cy, x: M + cx * 32 + 16, y: M + cy * 32 + 16 });
        });
        [[2, 1], [10, 1], [2, 6], [10, 6]].forEach(([x, y]) => addBlk(x, y));
      }

      const pSpots = [
        [M + 22, M + 24], [W - M - 22, M + 24], [M + 22, H - M - 24], [W - M - 22, H - M - 24],
        [M + 54, M + 20], [W - M - 54, M + 20], [M + 54, H - M - 20], [W - M - 54, H - M - 20],
      ];
      pSpots.forEach(([px, py], idx) => {
        if (r() < 0.72) {
          const ptys: Array<'barrel' | 'pot' | 'crate'> = ['barrel', 'pot', 'crate'];
          hz.props.push({ id: idx, x: px, y: py, t: ptys[(idx + (bIdx | 0)) % 3], dead: false, j: 0, v: 0 });
        }
      });
    } else if (cell.type === 'boss') {
      hz.water.push({ x: M + 48, y: M + 48, rx: 34, ry: 22 }, { x: W - M - 48, y: M + 48, rx: 34, ry: 22 });
      [[M + 24, M + 24], [W - M - 24, M + 24], [M + 24, H - M - 24], [W - M - 24, H - M - 24]].forEach(([px, py], idx) => {
        hz.props.push({ id: idx, x: px, y: py, t: 'pot', dead: false, j: 0, v: 0 });
      });
    }

    this.RK_CACHE[key] = a;
    this.HZ_CACHE[key] = hz;
  }

  rocks() {
    if (this.ST !== 'play') return [];
    const c = this.curCell();
    if (!c) return [];
    const k = this.rmKey();
    this.buildRoomLayout(k, c, this.wd.bIdx);
    return this.RK_CACHE[k] || [];
  }

  hazards() {
    if (this.ST !== 'play') return { water: [], spikes: [], tables: [], props: [] };
    const c = this.curCell();
    if (!c) return { water: [], spikes: [], tables: [], props: [] };
    const k = this.rmKey();
    this.buildRoomLayout(k, c, this.wd.bIdx);
    return this.HZ_CACHE[k] || { water: [], spikes: [], tables: [], props: [] };
  }

  spikesUp(): boolean {
    return (this.TT % 2.5) > 1.45;
  }

  spikesWarn(): boolean {
    return (this.TT % 2.5) > 1.1 && !this.spikesUp();
  }

  inRock(x: number, y: number): boolean {
    return this.rocks().some((k) => x > k.x + 2 && x < k.x + 30 && y > k.y + 2 && y < k.y + 30);
  }

  inWater(x: number, y: number): boolean {
    if (this.ST !== 'play') return false;
    for (const w of this.hazards().water) {
      if (((x - w.x) / w.rx) ** 2 + ((y - w.y) / w.ry) ** 2 <= 1) return true;
    }
    return false;
  }

  pushOut(o: { x: number; y: number; fly?: number; z?: number }, r: number) {
    if (o.fly || (o.z && o.z > 8)) return;
    for (const k of this.rocks()) {
      const cx = clamp(o.x, k.x + 2, k.x + 30);
      const cy = clamp(o.y, k.y + 2, k.y + 30);
      const dx = o.x - cx;
      const dy = o.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < r) {
        if (d > 0.01) {
          o.x += (dx / d) * (r - d);
          o.y += (dy / d) * (r - d);
        } else {
          o.y -= r;
        }
      }
    }
  }

  breakProp(pr: DestructibleProp) {
    if (!pr || pr.dead) return;
    pr.dead = true;
    const col = pr.t === 'pot' ? '#ffab91' : '#8d6e63';
    this.pt(pr.x, pr.y, col, 16, 95, 0.45, 2.8, 180);
    this.snd(180 + Math.random() * 70, 0.08, 'square', 0.04, -60);
    if (Math.random() < 0.10) this.spawnGoldFlies(pr.x, pr.y, 1);
    else if (Math.random() < 0.02) this.DROPS.push({ id: rnd(), x: pr.x, y: pr.y, t: 'hp', j: 0, v: 8 });
  }

  breakNearbyProps(x: number, y: number, rad: number) {
    for (const pr of this.PROPS) {
      if (!pr.dead && Math.hypot(pr.x - x, pr.y - y) < rad) this.breakProp(pr);
    }
  }

  spawnGoldFlies(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const sp = 35 + Math.random() * 65;
      this.FLIES.push({
        id: rnd(),
        x,
        y,
        z: 4 + Math.random() * 8,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 75 + Math.random() * 55,
      });
    }
  }

  spawnLarvaDrop(x: number, y: number, n = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const sp = 28 + Math.random() * 45;
      this.LARVAE.push({
        id: rnd(),
        x,
        y,
        z: 6 + Math.random() * 8,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        vz: 85 + Math.random() * 45,
      });
    }
  }

  enterCell(gx: number, gy: number, fromDir: string) {
    this.wd.gx = gx;
    this.wd.gy = gy;
    const cell = this.curCell();
    if (!cell) return;
    cell.vis = true;

    this.myB = [];
    this.rB = [];
    this.BEAMS = [];
    this.POOLS = [];
    this.DROPS = [];
    this.FLIES = [];
    this.LARVAE = [];
    this.ARCS = [];
    this.CASINGS = [];
    this.GHOSTS = [];
    this.DC = [];
    this.tr = 0.7;
    this.me.j = -0.35;
    this.me.z = 0;
    this.me.jumpT = 0;
    this.roomDamaged = false;

    if (fromDir === 'N') {
      this.me.x = 240;
      this.me.y = H - M - 20;
    } else if (fromDir === 'S') {
      this.me.x = 240;
      this.me.y = M + 20;
    } else if (fromDir === 'W') {
      this.me.x = W - M - 20;
      this.me.y = 160;
    } else if (fromDir === 'E') {
      this.me.x = M + 20;
      this.me.y = 160;
    } else {
      this.me.x = 240;
      this.me.y = 220;
    }

    if (this.botPartner.active && !this.botPartner.dead) {
      this.botPartner.x = clamp(this.me.x + 20, M + 18, W - M - 18);
      this.botPartner.y = clamp(this.me.y, M + 18, H - M - 18);
    }

    const hz = this.hazards();
    this.TABLES = hz.tables.map((t: any) => ({ ...t }));
    this.PROPS = hz.props.map((p: any) => ({ ...p }));

    // Generate room flora tufts
    this.FLORA = [];
    const r = createPseudoRandom((gx * 53 + gy * 113 + this.wd.fSeed) | 0);
    for (let i = 0; i < 8; i++) {
      const fx = M + 24 + r() * (W - M * 2 - 48);
      const fy = M + 24 + r() * (H - M * 2 - 48);
      if (!this.inRock(fx, fy)) {
        this.FLORA.push({ x: fx, y: fy, t: Math.floor(r() * 3) });
      }
    }

    if (this.me.shi) this.me.sh = 1;
    this.me.inv = 1.1;
    this.nextT = now() + 600;
    this.dust(this.me.x, this.me.y + 10, '#81c784', 8);

    this.wd.eb = [];
    this.wd.en = [];
    this.wd.trapdoor = false;

    if (!cell.clear) {
      if (cell.type === 'boss') {
        this.wd.clear = false;
        this.wd.en.push(this.createEnemy('B' + this.wd.bIdx, 240, 104, 0));
      } else if (cell.type === 'combat') {
        this.wd.clear = false;
        const n = 3 + this.wd.bIdx;
        const pl = [
          ['f', 'g', 's', 'spd'],
          ['g', 's', 'c', 'm', 'bmb'],
          ['s', 'c', 'm', 'plt', 'snk'],
          ['c', 'm', 'bmb', 'plt', 'gho', 'snk'],
          ['bmb', 'plt', 'snk', 'gho', 'spd', 'c'],
        ][this.wd.bIdx] || ['f', 'g'];

        const chmpChance = Math.min(0.42, 0.12 + this.wd.bIdx * 0.07);
        for (let i = 0; i < n; i++) {
          let x, y, k = 0;
          do {
            x = 64 + Math.random() * 352;
            y = 54 + Math.random() * 124;
          } while (this.inRock(x, y) && k++ < 15);
          const isChmp = Math.random() < chmpChance ? 1 : 0;
          this.wd.en.push(this.createEnemy(pl[(Math.random() * pl.length) | 0], x, y, isChmp));
        }
      }
    } else {
      this.wd.clear = true;
      if (cell.type === 'boss') this.wd.trapdoor = true;
    }
  }

  createEnemy(t: string, x: number, y: number, chmp = 0): Enemy {
    const bo = t.startsWith('B');
    const scaleHp = 1 + this.wd.bIdx * 0.22;
    const baseHp = Math.round((HP_STATS[t] || 12) * (bo ? 1 : scaleHp) * (chmp ? 1.5 : 1));
    this.pt(x, y, CL_STATS[t] || '#69f0ae', 12, 70, 0.35, 2.5);
    return {
      id: rnd(),
      t,
      x,
      y,
      rx: x,
      hp: baseHp,
      mh: baseHp,
      c: 0.65 + Math.random() * 0.9,
      j: -0.35,
      v: 0,
      fl: 0,
      chmp: chmp ? 1 : 0,
      chemT: 0,
      chemBy: '',
      tel: 0,
      dash: 0,
      dx: 0,
      dy: 0,
      st: 0,
      ang: 0,
      seg: t === 'B2' ? Array.from({ length: 6 }, () => ({ x, y })) : null,
    };
  }

  hitEnemy(e: Enemy, dmg: number, kx = 0, ky = 0, byId = '') {
    // Co-op Chemical Combo Check (when 2 different frogs hit the same target)
    if (byId && e.chemT > 0 && e.chemBy && e.chemBy !== byId) {
      e.chemT = 0;
      e.chemBy = '';
      dmg *= 1.75;
      this.pt(e.x, e.y, '#00e5ff', 24, 130, 0.6, 3);
      this.FT.push({ x: e.x, y: e.y - 24, s: 'COMBO QUÍMICO CO-OP!', c: '#00e5ff', l: 1.3, b: 1 });
      this.snd(620, 0.22, 'triangle', 0.08, 360);
      this.addShake(5);
    } else if (byId) {
      e.chemT = 1.4;
      e.chemBy = byId;
    }

    e.fl = 0.12;
    e.v += 8;
    e.hp -= dmg;
    e.x = clamp(e.x + kx, M + 14, W - M - 14);
    e.y = clamp(e.y + ky, M + 14, H - M - 14);

    // Bio-Electric Arcs (Item 18 / Storm Synergy)
    if (this.me.elec) {
      const hasStorm = !!this.me.syn['storm'];
      let arcsLeft = hasStorm ? 4 : 2;
      for (const o of this.wd.en) {
        if (o !== e && arcsLeft > 0 && Math.hypot(o.x - e.x, o.y - e.y) < 88) {
          arcsLeft--;
          o.hp -= dmg * 0.45;
          o.fl = 0.1;
          this.ARCS.push({ x1: e.x, y1: e.y, x2: o.x, y2: o.y, l: 0.16 });
        }
      }
    }

    this.pt(e.x, e.y, CL_STATS[e.t] || '#66bb6a', 9, 95, 0.42, 2.8, 250, 1, 'droplet', 0.9);
    const isCrit = dmg >= 3.5;
    this.FT.push({
      x: e.x + (Math.random() - 0.5) * 10,
      y: e.y - 14,
      s: `-${dmg.toFixed(1)}${isCrit ? '!' : ''}`,
      c: isCrit ? '#ffd54f' : '#fff',
      l: 0.65,
      b: isCrit ? 1 : 0,
    });
    this.snd(190 + Math.random() * 60, 0.07, 'square', 0.04, -80);
    this.addShake(this.me.w >= 4 ? 6.5 : 1.8);
    if (this.me.w >= 4 || isCrit) this.addHitStop(0.035);

    this.checkEnemyDeaths();
  }

  checkEnemyDeaths() {
    for (let i = this.wd.en.length - 1; i >= 0; i--) {
      const e = this.wd.en[i];
      if (e.hp <= 0) {
        this.wd.en.splice(i, 1);
        this.deathFx(e);
        if (e.t === 'm') {
          this.wd.en.push(this.createEnemy('n', e.x - 10, e.y), this.createEnemy('n', e.x + 10, e.y));
        }
        if (e.t === 'bmb' || e.chmp) {
          const cnt = e.t === 'bmb' ? 8 : 6;
          for (let k = 0; k < cnt; k++) {
            const a = (k * 6.283) / cnt;
            this.shootEnemyBullet(e, Math.cos(a), Math.sin(a), 105);
          }
        }
      }
    }
  }

  shootEnemyBullet(e: Enemy, dx: number, dy: number, v: number) {
    const spd = v * 1.15;
    this.wd.eb.push({ id: rnd(), x: e.x, y: e.y, vx: dx * spd, vy: dy * spd });
  }

  deathFx(e: Enemy) {
    const bo = e.t.startsWith('B');
    this.emitEnemyDestruction(e);
    this.addShake(bo ? 16 : e.chmp ? 7.5 : 4.5);
    this.addHitStop(bo ? 0.2 : e.chmp ? 0.07 : 0.04);
    this.snd(bo ? 85 : 210, bo ? 0.6 : 0.2, 'sawtooth', 0.07, -60);

    // Update Kill Combo Streak
    this.comboCount++;
    this.comboTimer = 3.5;
    if (this.comboCount >= 3) {
      this.FT.push({
        x: e.x,
        y: e.y - 26,
        s: `${this.comboCount}x COMBO!`,
        c: '#76ff03',
        l: 0.9,
        b: 1,
      });
    }

    this.DC.push({
      x: e.x,
      y: e.y + 8,
      c: CL_STATS[e.t] || '#4caf50',
      r: bo ? 18 : e.chmp ? 11 : 6 + Math.random() * 7,
    });
    if (this.DC.length > 45) this.DC.shift();

    const flyCnt = bo
      ? 5 + ((Math.random() * 4) | 0)
      : e.chmp
      ? 1 + ((Math.random() * 2) | 0)
      : Math.random() < 0.42
      ? 1
      : 0;
    if (flyCnt > 0) this.spawnGoldFlies(e.x, e.y, flyCnt);

    // Crystallized Larvae are rare & precious!
    if (e.chmp && Math.random() < 0.07) this.spawnLarvaDrop(e.x, e.y, 1);

    if (e.chmp || bo) {
      if (Math.random() < (bo ? 0.5 : 0.08)) this.DROPS.push({ id: rnd(), x: e.x - 8, y: e.y, t: 'hp', j: 0, v: 8 });
      if (Math.random() < (bo ? 0.85 : 0.16)) this.DROPS.push({ id: rnd(), x: e.x + 8, y: e.y, t: 'key', j: 0, v: 8 });
    }

    this.achStats.kills++;
    this.unlockAch('first_blood');
    if (this.achStats.kills >= 20) this.unlockAch('k20');
    else this.saveProgress();

    if (e.t === 'B0') this.unlockAch('b1');
    if (e.t === 'B1') this.unlockAch('b2');
    if (e.t === 'B2') this.unlockAch('b3');
    if (e.t === 'B3') this.unlockAch('b4');

    if (this.me.vmp) {
      this.me.kills++;
      if (this.me.kills % 14 === 0 && this.me.hp < this.me.mh) {
        this.me.hp++;
        this.FT.push({ x: this.me.x, y: this.me.y - 24, s: '+1 VIDA (VAMPIRO)!', c: '#ff5252', l: 0.9 });
      }
    }
  }

  gotMutation(k: number) {
    this.me.its.push(k);
    const rar = RAR_INFO[IT[k][2]];
    const isAff = CH[this.me.ch]?.aff?.includes(k);
    const affMult = isAff ? 1.2 : 1.0;
    const s = `${IT[k][0]}${isAff ? ' [AFINIDADE!]' : ' (' + rar.nm + ')'}`;

    if (k === 0) this.me.dm += +(0.9 * affMult).toFixed(2);
    else if (k === 1) this.me.rt = Math.max(0.09, this.me.rt * (isAff ? 0.76 : 0.8));
    else if (k === 2) {
      const add = isAff ? 3 : 2;
      this.me.mh += add;
      this.me.hp = Math.min(this.me.mh, this.me.hp + add);
    } else if (k === 3) this.me.sp += Math.round(15 * affMult);
    else if (k === 4) {
      this.me.pr = 1;
      if (isAff) this.me.dm += 0.3;
    } else if (k === 5) {
      this.me.hm = 1;
      if (isAff) this.me.dm += 0.35;
    } else if (k === 6) {
      this.me.shi = 1;
      this.me.sh = 1;
    } else if (k === 7) this.me.big = isAff ? 1.8 : 1.65;
    else if (k === 8) this.me.tri = 1;
    else if (k === 9) this.me.tox = 1;
    else if (k === 10) this.me.bnc += isAff ? 3 : 2;
    else if (k === 11) {
      this.me.fam++;
      this.unlockAch('fam');
    } else if (k === 12) this.me.vmp = 1;
    else if (k === 13) {
      this.me.fly = 1;
      this.unlockAch('fly_high');
    } else if (k === 14) {
      this.me.hyper = 1;
      this.me.dm += 0.45;
    } else if (k === 15) this.me.exp = 1;
    else if (k === 16) this.me.rear = 1;
    else if (k === 17) {
      this.me.dm += 0.65;
      this.me.rt = Math.max(0.1, this.me.rt * 0.88);
      this.me.mh += 2;
      this.me.hp = Math.min(this.me.mh, this.me.hp + 2);
      this.me.sp += 10;
    } else if (k === 18) {
      this.me.elec = 1;
      this.me.dm += 0.5;
    } else if (k === 19) {
      this.me.clone = 1;
    }

    this.checkSynergies();
    this.achStats.maxItems = Math.max(this.achStats.maxItems, this.me.its.length);
    this.achStats.maxDmg = Math.max(this.achStats.maxDmg, this.me.dm);
    this.saveProgress();

    if (this.me.its.length === 2) {
      this.FT.push({
        x: this.me.x,
        y: this.me.y - 42,
        s: 'EVOLUÇÃO GENÉTICA: FORMA MUTANTE!',
        c: '#76ff03',
        l: 2.1,
        b: 1,
      });
      this.pt(this.me.x, this.me.y, '#76ff03', 32, 135, 0.7, 3.2);
    } else if (this.me.its.length === 4) {
      this.FT.push({
        x: this.me.x,
        y: this.me.y - 42,
        s: 'METAMORFOSE SUPREMA: SAPO APEX!',
        c: '#ffd54f',
        l: 2.3,
        b: 1,
      });
      this.pt(this.me.x, this.me.y, '#ffd54f', 40, 150, 0.85, 3.5);
    }

    if (this.me.its.length >= 3) this.unlockAch('it3');
    if (this.me.its.length >= 5) this.unlockAch('synergy');
    if (this.me.dm >= 4.5) this.unlockAch('big_dmg');

    this.FT.push({ x: this.me.x, y: this.me.y - 30, s, c: isAff ? '#00e5ff' : rar.col, l: 1.7, b: 1 });
    this.snd(520, 0.35, 'triangle', 0.08, 700);
    this.pt(this.me.x, this.me.y, rar.col, 26, 120, 0.6, 3);
    this.me.v += 9;
    this.addShake(3);
  }

  hitDummy(dmg: number) {
    const dm = this.camp.dummy;
    dm.fl = 0.12;
    dm.v += 9;
    dm.j = -0.28;
    dm.hits.push({ t: now(), d: dmg });
    this.pt(dm.x, dm.y, '#ffe082', 7, 80, 0.35, 2.2, 140);
    this.FT.push({
      x: dm.x + (Math.random() - 0.5) * 18,
      y: dm.y - 18,
      s: dmg.toFixed(1),
      c: '#ffd54f',
      l: 0.65,
    });
    this.snd(240, 0.06, 'square', 0.04, -60);
  }

  getNearbyInteractable(): string | null {
    if (!this.me || this.me.dead || this.paused) return null;
    if (this.ST === 'camp') {
      if (Math.hypot(this.me.x - this.camp.shaman.x, this.me.y - this.camp.shaman.y) < 36) return 'XAMÃ';
      for (const lg of this.camp.logs) {
        if (this.me.ch !== lg.c && Math.hypot(this.me.x - lg.x, this.me.y - lg.y) < 28) {
          return CH[lg.c].n.toUpperCase();
        }
      }
      if (Math.hypot(this.me.x - this.camp.sign.x, this.me.y - this.camp.sign.y) < 32) return 'BIOMA';
      return null;
    }
    if (this.ST === 'play') {
      const cell = this.curCell();
      if (!cell) return null;
      if (cell.type === 'combat' && cell.totem && cell.totem.state === 0 && this.wd.clear) {
        if (Math.hypot(this.me.x - cell.totem.x, this.me.y - cell.totem.y) < 32) return 'TOTEM';
      }
      for (const chObj of [cell.chest, cell.coopChest]) {
        if (chObj && !chObj.open && (chObj === cell.chest || chObj.spawned)) {
          if (Math.hypot(this.me.x - chObj.x, this.me.y - chObj.y) < 28) return 'BAÚ';
        }
      }
      if (cell.type === 'shop' && cell.shop) {
        for (const ped of cell.shop) {
          if (!ped.sold && Math.hypot(this.me.x - ped.x, this.me.y - ped.y) < 25) return 'COMPRAR';
        }
      }
    }
    return null;
  }

  interactE() {
    if (this.paused || this.me.dead) return;

    if (this.ST === 'camp') {
      // 1. Shaman Cauldron
      if (Math.hypot(this.me.x - this.camp.shaman.x, this.me.y - this.camp.shaman.y) < 36) {
        if (this.onOpenShaman) this.onOpenShaman();
        return;
      }
      // 2. Switch Character on Logs
      for (const lg of this.camp.logs) {
        if (this.me.ch !== lg.c && Math.hypot(this.me.x - lg.x, this.me.y - lg.y) < 28) {
          if (!this.isCharUnlocked(lg.c)) {
            this.FT.push({
              x: lg.x,
              y: lg.y - 24,
              s: 'BLOQUEADO: ' + CH[lg.c].reqTxt,
              c: '#ff5252',
              l: 1.1,
              b: 1,
            });
            this.snd(140, 0.15, 'sawtooth', 0.06, -40);
            return;
          }
          const ox = this.me.x;
          const oy = this.me.y;
          this.initPlayer(lg.c);
          this.me.x = ox;
          this.me.y = oy;
          this.pt(this.me.x, this.me.y, CH[this.me.ch].c, 22, 110, 0.55, 2.8);
          this.FT.push({
            x: this.me.x,
            y: this.me.y - 28,
            s: 'TROCOU PARA ' + CH[this.me.ch].n.toUpperCase() + '!',
            c: '#ffd54f',
            l: 1.4,
            b: 1,
          });
          this.snd(480, 0.22, 'triangle', 0.08, 320);
          return;
        }
      }
      // 3. Biome Sign Selector
      if (Math.hypot(this.me.x - this.camp.sign.x, this.me.y - this.camp.sign.y) < 32) {
        const nextB = (this.camp.sign.bIdx + 1) % TH.length;
        this.camp.sign.bIdx = nextB;
        this.wd.bIdx = nextB;
        this.pt(this.camp.sign.x, this.camp.sign.y, '#ffd54f', 14, 80, 0.4, 2.4);
        this.FT.push({
          x: this.camp.sign.x,
          y: this.camp.sign.y - 24,
          s: 'DESTINO: ' + TH[nextB].nm.toUpperCase(),
          c: '#69f0ae',
          l: 1.4,
          b: 1,
        });
        this.snd(420, 0.15, 'triangle', 0.07, 180);
        return;
      }
      return;
    }

    if (this.ST !== 'play') return;
    const cell = this.curCell();
    if (!cell) return;

    // 5. Challenge Totem Activation (Risk / Reward Elite Wave)
    if (cell.type === 'combat' && cell.totem && cell.totem.state === 0 && this.wd.clear) {
      if (Math.hypot(this.me.x - cell.totem.x, this.me.y - cell.totem.y) < 32) {
        cell.totem.state = 1;
        this.wd.clear = false;
        cell.clear = false;
        this.pt(cell.totem.x, cell.totem.y, '#ff1744', 32, 130, 0.7, 3.2);
        this.FT.push({
          x: 240,
          y: 92,
          s: 'CONTRATO DO TOTEM: ONDA DE ELITE!',
          c: '#ff1744',
          l: 2.0,
          b: 1,
        });
        this.snd(160, 0.4, 'sawtooth', 0.09, -60);
        this.addShake(8);
        const pl = [
          ['f', 'g', 's', 'spd'],
          ['g', 's', 'c', 'm', 'bmb'],
          ['s', 'c', 'm', 'plt', 'snk'],
          ['c', 'm', 'bmb', 'plt', 'gho', 'snk'],
          ['bmb', 'plt', 'snk', 'gho', 'spd', 'c'],
        ][this.wd.bIdx] || ['f', 'g'];
        for (let i = 0; i < 3; i++) {
          const ang = (i / 3) * 6.283;
          const ex = clamp(240 + Math.cos(ang) * 110, M + 28, W - M - 28);
          const ey = clamp(160 + Math.sin(ang) * 70, M + 28, H - M - 28);
          this.wd.en.push(this.createEnemy(pl[(i + this.wd.bIdx) % pl.length], ex, ey, 1));
        }
        return;
      }
    }

    // 6. Open Treasure / Co-op Chests
    for (const chObj of [cell.chest, cell.coopChest]) {
      if (chObj && !chObj.open && (chObj === cell.chest || chObj.spawned)) {
        if (Math.hypot(this.me.x - chObj.x, this.me.y - chObj.y) < 28) {
          chObj.open = true;
          this.gotMutation(chObj.k);
          return;
        }
      }
    }

    // 7. Buy from Shop Pedestals
    if (cell.type === 'shop' && cell.shop) {
      cell.shop.forEach((ped, idx) => {
        if (!ped.sold && Math.hypot(this.me.x - ped.x, this.me.y - ped.y) < 25) {
          const isSoloAnkh = idx === 2 && this.me.ankh === 0;
          const price = Math.max(1, Math.round(isSoloAnkh ? 30 : ped.cost));
          if (this.me.gold < price) {
            this.FT.push({
              x: ped.x,
              y: ped.y - 22,
              s: `PRECISA DE ${price} MOSCAS!`,
              c: '#ff5252',
              l: 1.1,
              b: 1,
            });
            this.snd(140, 0.14, 'sawtooth', 0.06, -50);
            return;
          }
          this.me.gold -= price;
          ped.sold = true;
          if (ped.t === 'hp') {
            this.me.hp = Math.min(this.me.mh, this.me.hp + 1);
            this.FT.push({ x: this.me.x, y: this.me.y - 26, s: '+1 CORAÇÃO COMPRADO!', c: '#ff5252', l: 1.2, b: 1 });
            this.snd(580, 0.2, 'triangle', 0.07, 260);
          } else if (ped.t === 'key') {
            this.me.keys++;
            this.FT.push({ x: this.me.x, y: this.me.y - 26, s: '+1 CHAVE COMPRADA!', c: '#ffd54f', l: 1.2, b: 1 });
            this.snd(620, 0.2, 'triangle', 0.07, 300);
          } else if (isSoloAnkh) {
            this.me.ankh = 1;
            this.FT.push({
              x: this.me.x,
              y: this.me.y - 26,
              s: 'OVA DE RENASCIMENTO ADQUIRIDA!',
              c: '#00e676',
              l: 1.5,
              b: 1,
            });
            this.snd(540, 0.3, 'triangle', 0.08, 420);
          } else if (ped.k !== undefined) {
            this.gotMutation(ped.k);
          }
        }
      });
    }
  }

  handleNetMsg(t: string, d: any) {
    if (t === 'sh' && d && d.oid !== this.me.id) {
      this.rB.push({
        x: d.x,
        y: d.y,
        ox: d.x,
        oy: d.y,
        vx: d.vx,
        vy: d.vy,
        r: d.r || 4,
        w: d.w || 0,
        l: d.l || 0.95,
        tng: d.tng || 0,
        oid: d.oid,
        aoe: d.aoe || 0,
        pool: d.pool || 0,
        bnc: d.bnc || 0,
        col: d.col,
        d: 1.0,
        p: 0,
        hit: [],
        ka: 0,
      });
    }
  }

  update(dt: number) {
    if (this.paused) return;

    this.TT += dt;
    this.springAll(dt);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    if (this.ST === 'camp') {
      this.updateCamp(dt);
    } else if (this.ST === 'play') {
      this.updatePlay(dt);
    }

    this.updateBotPartner(dt);
    this.updateParticles(dt);
  }

  springAll(dt: number) {
    spring(this.me, dt);
    spring(this.camp.dummy, dt);
    this.camp.dummy.fl = Math.max(0, this.camp.dummy.fl - dt);
    this.me.puff = Math.max(0, this.me.puff - dt);
    this.fl = Math.max(0, this.fl - dt * 2.2);
    for (const tb of this.TABLES) {
      tb.fl = Math.max(0, tb.fl - dt);
      spring(tb, dt);
    }
    for (const dr of this.DROPS) spring(dr, dt);
    for (const cn of this.campNodes) {
      cn.fl = Math.max(0, cn.fl - dt);
      spring(cn, dt);
      if (cn.hp <= 0) {
        cn.respawnT -= dt;
        if (cn.respawnT <= 0) {
          cn.hp = cn.mh;
          cn.j = -0.35;
          this.pt(cn.x, cn.y, cn.col, 14, 80, 0.4, 2.5);
        }
      }
    }
  }

  updateBotPartner(dt: number) {
    const bp = this.botPartner;
    if (!bp.active) return;
    spring(bp, dt);
    bp.puff = Math.max(0, bp.puff - dt);

    // Co-op Rescue Ring Logic (3.0s survival inside ring)
    if (bp.dead && !this.me.dead) {
      if (Math.hypot(this.me.x - bp.x, this.me.y - bp.y) < 34) {
        bp.revP = clamp(bp.revP + dt / 3.0, 0, 1);
        if (bp.revP >= 1) {
          bp.dead = false;
          bp.hp = 2;
          bp.revP = 0;
          this.pt(bp.x, bp.y, '#00e676', 32, 130, 0.7, 3);
          this.FT.push({ x: bp.x, y: bp.y - 26, s: 'PARCEIRO REANIMADO!', c: '#00e676', l: 1.5, b: 1 });
          this.snd(520, 0.35, 'triangle', 0.09, 450);
        }
      } else {
        bp.revP = Math.max(0, bp.revP - dt * 0.5);
      }
      return;
    }

    if (this.me.dead && !bp.dead) {
      // Partner runs to player's Holographic Ring and revives player over 3s!
      const dx = this.me.x - bp.x;
      const dy = this.me.y - bp.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 14) {
        bp.x += (dx / d) * 95 * dt;
        bp.y += (dy / d) * 95 * dt;
        bp.wf = ((this.TT * 12) | 0) % 2;
      } else {
        bp.wf = 0;
      }
      if (d < 34) {
        this.me.revP = clamp(this.me.revP + dt / 3.0, 0, 1);
        if (this.me.revP >= 1) {
          this.me.dead = false;
          this.me.hp = 2;
          this.me.inv = 2.0;
          this.me.revP = 0;
          document.body.dataset.state = 'playing';
          this.pt(this.me.x, this.me.y, '#00e676', 36, 140, 0.8, 3.2);
          this.FT.push({
            x: this.me.x,
            y: this.me.y - 28,
            s: 'REANIMADO PELO PARCEIRO!',
            c: '#00e676',
            l: 1.8,
            b: 1,
          });
          this.snd(520, 0.35, 'triangle', 0.09, 480);
        }
      }
      return;
    }

    // Follow player smoothly & shoot enemies
    const targetX = this.me.x + Math.cos(this.TT * 1.4) * 32;
    const targetY = this.me.y + Math.sin(this.TT * 1.4) * 26;
    const dx = targetX - bp.x;
    const dy = targetY - bp.y;
    const d = Math.hypot(dx, dy);
    if (d > 8) {
      bp.x += (dx / d) * Math.min(92, d * 3) * dt;
      bp.y += (dy / d) * Math.min(92, d * 3) * dt;
      bp.wf = ((this.TT * 12) | 0) % 2;
    } else {
      bp.wf = 0;
    }

    if (this.ST === 'play' && this.wd.en.length > 0) {
      const en = this.wd.en[0];
      bp.ang = Math.atan2(en.y - bp.y, en.x - bp.x);
      bp.cd -= dt;
      if (bp.cd <= 0) {
        bp.cd = 0.52;
        bp.puff = 0.14;
        this.spawnBullet(bp.x, bp.y - 5, bp.ang, WP[bp.w], 0.55, { oid: 'bot_partner', col: '#00e5ff' });
      }
    } else {
      bp.ang = this.me.ang;
    }
  }

  updateCamp(dt: number) {
    this.camp.dummy.dps = calculateDPS(this.camp.dummy.hits, now(), 3);

    // Rising campfire embers
    if (Math.random() < dt * 16) {
      this.P.push({
        x: 240 + (Math.random() - 0.5) * 16,
        y: 166,
        vx: (Math.random() - 0.5) * 24,
        vy: -35 - Math.random() * 42,
        l: 0.85,
        m: 0.85,
        c: Math.random() < 0.5 ? '#ffd54f' : '#ff6d00',
        s: 2.4,
        g: -12,
      });
    }

    this.updatePlayerZAndMove(dt);
    this.me.x = clamp(this.me.x, 22, W - 22);
    this.me.y = clamp(this.me.y, 28, H - 18);

    // Bullets vs Training Dummy, Camp Nodes & Camp Boundaries
    for (const b of this.myB) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.l -= dt;
      if (Math.random() < 0.75) this.emitProjectileTrail(b, false);
      if (Math.hypot(b.x - this.camp.dummy.x, b.y - this.camp.dummy.y) < 16) {
        this.hitDummy(b.d);
        this.emitWallImpact(b.x, b.y, b.vx, b.vy, b.col || '#ffd54f', false);
        if (!b.p) b.l = 0;
      }
      for (const cn of this.campNodes) {
        if (cn.hp > 0 && Math.hypot(b.x - cn.x, b.y - cn.y) < 14) {
          cn.hp -= b.d;
          cn.fl = 0.12;
          cn.j = -0.3;
          cn.v += 8;
          this.emitWallImpact(b.x, b.y, b.vx, b.vy, cn.col, true);
          if (cn.hp <= 0) {
            cn.respawnT = 4.5;
            this.pt(cn.x, cn.y, cn.col, 20, 110, 0.55, 3.0, 260, 1, 'star', 0.8);
            this.snd(520, 0.15, 'triangle', 0.06, 220);
          }
          if (!b.p) b.l = 0;
        }
      }
      if (b.x <= 8 || b.x >= W - 8 || b.y <= 8 || b.y >= H - 8) {
        this.emitWallImpact(b.x, b.y, b.vx, b.vy, b.col || WP[b.w]?.col || '#76ff03', false);
        b.l = 0;
      }
    }
    this.myB = this.myB.filter((b) => b.l > 0);

    // Collect gold flies in camp
    for (let i = this.FLIES.length - 1; i >= 0; i--) {
      const f = this.FLIES[i];
      updateBouncingParticle(f, dt);
      const d = Math.hypot(this.me.x - f.x, this.me.y - f.y);
      if (d < 44) {
        f.x += (this.me.x - f.x) * dt * 8;
        f.y += (this.me.y - f.y) * dt * 8;
      }
      if (d < 15) {
        this.me.gold++;
        this.FT.push({ x: f.x, y: f.y - 10, s: '+1 MOSCA', c: '#ffd54f', l: 0.65 });
        this.snd(680, 0.05, 'triangle', 0.04, 120);
        this.FLIES.splice(i, 1);
      }
    }

    // Runic Portal Check
    const inPortal = Math.hypot(this.me.x - this.camp.portal.x, this.me.y - this.camp.portal.y) < 32;
    if (inPortal) {
      this.camp.portal.t += dt;
      if (this.camp.portal.t >= 0.65) {
        this.camp.portal.t = 0;
        this.ST = 'play';
        document.body.dataset.state = 'playing';
        if (this.onStateChange) this.onStateChange('play');
        this.enterCell(2, 2, '');
        this.lastKey = this.rmKey();
        this.snd(360, 0.35, 'triangle', 0.08, 420);
      }
    } else {
      this.camp.portal.t = Math.max(0, this.camp.portal.t - dt * 2);
    }
  }

  updatePlay(dt: number) {
    const key = this.rmKey();
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.enterCell(this.wd.gx, this.wd.gy, '');
    }

    if (this.wd.over && !this.prevOver) {
      for (let i = 0; i < 6; i++) {
        setTimeout(
          () =>
            this.pt(
              60 + Math.random() * 360,
              60 + Math.random() * 110,
              ['#76ff03', '#ffd54f', '#00e5ff', '#ff4081'][i % 4],
              32,
              165,
              1.2,
              3,
              160
            ),
          i * 170
        );
      }
      this.snd(520, 0.5, 'triangle', 0.1, 600);
      document.body.dataset.state = 'gameover';
    }
    this.prevOver = this.wd.over;

    // Update Acid Pools & Bio-Electric Arcs
    for (let i = this.POOLS.length - 1; i >= 0; i--) {
      const pl = this.POOLS[i];
      pl.l -= dt;
      pl.tk -= dt;
      if (pl.tk <= 0 && !pl.slow) {
        pl.tk = 0.35;
        for (const e of this.wd.en) {
          if (Math.hypot(e.x - pl.x, e.y - pl.y) < pl.r + 10) {
            e.hp -= 0.7;
            e.fl = 0.06;
          }
        }
        this.checkEnemyDeaths();
      }
      if (pl.l <= 0) this.POOLS.splice(i, 1);
    }
    for (let i = this.ARCS.length - 1; i >= 0; i--) {
      this.ARCS[i].l -= dt;
      if (this.ARCS[i].l <= 0) this.ARCS.splice(i, 1);
    }

    // Full Dynamic Enemy AI & Boss Patterns
    const cell = this.curCell();
    const aggr = 1 + this.wd.bIdx * 0.08;

    for (const e of this.wd.en) {
      spring(e, dt);
      e.fl = Math.max(0, e.fl - dt);
      e.chemT = Math.max(0, (e.chemT || 0) - dt);
      e.c = (e.c ?? 1) - dt * aggr;

      const dx = this.me.x - e.x;
      const dy = this.me.y - e.y;
      const l = Math.hypot(dx, dy) || 1;
      let ux = dx / l;
      let uy = dy / l;

      let sp =
        ({
          f: 62,
          g: 42,
          s: 22,
          c: 32,
          m: 30,
          n: 52,
          bmb: 50,
          plt: 0,
          snk: 74,
          gho: 36,
          spd: 28,
          B0: 32,
          B1: 46,
          B2: 84,
          B3: 26,
          B4: 40,
        } as any)[e.t] || 28;
      sp *= aggr * (e.chmp ? 1.15 : 1);

      if (e.t === 'snk') {
        const perp = Math.cos(this.TT * 10 + e.id) * 0.85;
        const nx = ux - uy * perp;
        const ny = uy + ux * perp;
        const nl = Math.hypot(nx, ny) || 1;
        ux = nx / nl;
        uy = ny / nl;
      } else if (e.t === 's') {
        if (e.c < 0.35 && e.c > 0) e.tel = 0.1;
        if (e.c <= 0) {
          e.c = 1.45;
          e.j = -0.35;
          if (e.chmp) {
            for (let k = -1; k <= 1; k++) {
              const a = Math.atan2(uy, ux) + k * 0.25;
              this.shootEnemyBullet(e, Math.cos(a), Math.sin(a), 115);
            }
          } else {
            this.shootEnemyBullet(e, ux, uy, 115);
          }
        }
      } else if (e.t === 'plt') {
        if (e.c < 0.35 && e.c > 0) e.tel = 0.1;
        if (e.c <= 0) {
          e.c = 1.55;
          e.j = -0.35;
          e.st = (e.st || 0) + 1;
          const base = (e.st % 2) * 0.785;
          for (let k = 0; k < 4; k++) {
            const a = base + k * 1.57;
            this.shootEnemyBullet(e, Math.cos(a), Math.sin(a), 98);
          }
        }
      } else if (e.t === 'gho') {
        if (e.c <= 0) {
          e.c = 2.0;
          this.shootEnemyBullet(e, ux, uy, 95);
        }
      } else if (e.t === 'spd') {
        if (e.c <= 0) {
          e.c = 1.85;
          e.j = -0.3;
          const baseA = Math.atan2(uy, ux);
          for (let k = -1; k <= 1; k++) {
            this.shootEnemyBullet(e, Math.cos(baseA + k * 0.28), Math.sin(baseA + k * 0.28), 92);
          }
          this.POOLS.push({ x: e.x, y: e.y, r: 16, l: 4.0, tk: 0, c: '#ffffff44', slow: true });
        }
      } else if (e.t === 'c') {
        if ((e.tel || 0) > 0) {
          e.tel! -= dt;
          sp = 0;
          if (e.tel! <= 0) {
            e.dash = 0.42;
            e.dx = ux;
            e.dy = uy;
            e.j = -0.4;
          }
        } else if ((e.dash || 0) > 0) {
          e.dash! -= dt;
          ux = e.dx || ux;
          uy = e.dy || uy;
          sp = 215 * aggr;
          if (Math.random() < dt * 20) this.dust(e.x, e.y + 8, '#ffb74d', 1);
        } else if (e.c <= 0) {
          e.tel = 0.38;
          e.c = 2.1;
        }
      } else if (e.t.startsWith('B')) {
        const p2 = e.hp < e.mh * 0.5;
        if (p2) sp *= 1.3;
        if (e.c < 0.35 && e.c > 0) e.tel = 0.1;
        if (e.t === 'B1') {
          ux = Math.cos(this.TT * 2.2);
          uy = Math.sin(this.TT * 3.4);
        }
        if (e.t === 'B2' && e.seg) {
          let px = e.x;
          let py = e.y;
          for (const sg of e.seg) {
            const sdx = sg.x - px;
            const sdy = sg.y - py;
            const d = Math.hypot(sdx, sdy) || 1;
            if (d > 14) {
              sg.x = px + (sdx / d) * 14;
              sg.y = py + (sdy / d) * 14;
            }
            px = sg.x;
            py = sg.y;
          }
        }
        if (e.c <= 0) {
          e.st = ((e.st || 0) + 1) % 3;
          e.j = -0.38;
          e.c = p2 ? 1.15 : 1.55;
          if (e.st === 0) {
            const cnt = p2 ? 14 : 10;
            for (let i = 0; i < cnt; i++) {
              const a = (i * 6.283) / cnt + this.TT;
              this.shootEnemyBullet(e, Math.cos(a), Math.sin(a), 98);
            }
          } else if (e.st === 1) {
            const base = Math.atan2(uy, ux);
            for (let i = -2; i <= 2; i++) {
              this.shootEnemyBullet(e, Math.cos(base + i * 0.2), Math.sin(base + i * 0.2), 125);
            }
          } else {
            if (this.wd.en.length < 6) {
              this.wd.en.push(this.createEnemy('f', e.x + (Math.random() - 0.5) * 30, e.y + 15));
            }
          }
        }
      }

      e.x += ux * sp * dt;
      e.y += uy * sp * dt;
      e.x = clamp(e.x, M + 14, W - M - 14);
      e.y = clamp(e.y, M + 14, H - M - 14);
      if (e.t !== 'f' && e.t !== 'gho' && !e.t.startsWith('B')) {
        this.pushOut(e, RAD_STATS[e.t] || 12);
      }
      e.rx = e.x;
    }

    // Enemy Bullets vs Walls & Obstacles
    for (let i = this.wd.eb.length - 1; i >= 0; i--) {
      const b = this.wd.eb[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (Math.random() < 0.28) this.emitProjectileTrail(b, true);

      if (
        b.x <= M - 4 ||
        b.x >= W - M + 4 ||
        b.y <= M - 4 ||
        b.y >= H - M + 4 ||
        this.inRock(b.x, b.y)
      ) {
        this.emitWallImpact(b.x, b.y, b.vx, b.vy, '#ff1744', false);
        this.wd.eb.splice(i, 1);
      }
    }

    // Gold Flies Physics & Individual Collection
    for (let i = this.FLIES.length - 1; i >= 0; i--) {
      const f = this.FLIES[i];
      updateBouncingParticle(f, dt);
      f.x = clamp(f.x, M + 10, W - M - 10);
      f.y = clamp(f.y, M + 10, H - M - 10);

      const d = this.me.dead ? 1e9 : Math.hypot(this.me.x - f.x, this.me.y - f.y);
      if (d < 46) {
        f.x += (this.me.x - f.x) * dt * 8;
        f.y += (this.me.y - f.y) * dt * 8;
      }
      if (d < 15) {
        this.me.gold++;
        this.FT.push({ x: f.x, y: f.y - 10, s: '+1 MOSCA', c: '#ffd54f', l: 0.65 });
        this.snd(680 + Math.random() * 120, 0.05, 'triangle', 0.04, 120);
        this.FLIES.splice(i, 1);
      }
    }

    // Crystallized Larvae Collection
    for (let i = this.LARVAE.length - 1; i >= 0; i--) {
      const lv = this.LARVAE[i];
      updateBouncingParticle(lv, dt);
      lv.x = clamp(lv.x, M + 12, W - M - 12);
      lv.y = clamp(lv.y, M + 12, H - M - 12);
      const d = this.me.dead ? 1e9 : Math.hypot(this.me.x - lv.x, this.me.y - lv.y);
      if (d < 48) {
        lv.x += (this.me.x - lv.x) * dt * 8;
        lv.y += (this.me.y - lv.y) * dt * 8;
      }
      if (d < 16) {
        this.achStats.larvae++;
        this.saveProgress();
        this.pt(lv.x, lv.y, '#00e5ff', 22, 110, 0.55, 3);
        this.FT.push({ x: lv.x, y: lv.y - 18, s: '+1 LARVA CRISTALIZADA!', c: '#00e5ff', l: 1.5, b: 1 });
        this.snd(740, 0.22, 'triangle', 0.08, 320);
        this.LARVAE.splice(i, 1);
      }
    }

    // Player Movement, Z-Jump & Door Transitions
    if (!this.me.dead) {
      this.updatePlayerZAndMove(dt);

      const dN = this.wd.clear && cell?.doors.N && Math.abs(this.me.x - 240) < 20;
      const dS = this.wd.clear && cell?.doors.S && Math.abs(this.me.x - 240) < 20;
      const dW = this.wd.clear && cell?.doors.W && Math.abs(this.me.y - 160) < 20;
      const dE = this.wd.clear && cell?.doors.E && Math.abs(this.me.y - 160) < 20;

      this.me.x = clamp(this.me.x, dW ? 2 : M + 9, dE ? W - 2 : W - M - 9);
      this.me.y = clamp(this.me.y, dN ? 2 : M + 9, dS ? H - 2 : H - M - 9);
      this.pushOut(this.me, 9);

      if (now() > this.nextT && this.wd.clear) {
        let tgx = this.wd.gx;
        let tgy = this.wd.gy;
        let dir = '';
        if (dN && this.me.y < M) {
          tgy--;
          dir = 'N';
        } else if (dS && this.me.y > H - M) {
          tgy++;
          dir = 'S';
        } else if (dW && this.me.x < M) {
          tgx--;
          dir = 'W';
        } else if (dE && this.me.x > W - M) {
          tgx++;
          dir = 'E';
        }
        if (dir) {
          const dest = this.wd.grid?.[tgy]?.[tgx];
          if (dest) {
            if (dest.locked && this.me.keys <= 0) {
              this.FT.push({
                x: this.me.x,
                y: this.me.y - 20,
                s: 'PORTA TRANCADA (PRECISA DE 1 CHAVE)!',
                c: '#ff5252',
                l: 1.0,
                b: 1,
              });
              this.snd(140, 0.14, 'sawtooth', 0.06, -40);
              this.me.x = clamp(this.me.x, M + 12, W - M - 12);
              this.me.y = clamp(this.me.y, M + 12, H - M - 12);
            } else {
              if (dest.locked) {
                this.me.keys--;
                dest.locked = false;
                this.FT.push({ x: this.me.x, y: this.me.y - 24, s: 'USOU 1 CHAVE!', c: '#ffd54f', l: 1.2, b: 1 });
              }
              this.nextT = now() + 750;
              this.lastKey = `${this.wd.bIdx}_${tgx}_${tgy}_${this.wd.fSeed}`;
              this.enterCell(tgx, tgy, dir);
              this.snd(260, 0.3, 'sine', 0.08, 380);
            }
          }
        }
      }

      // Trapdoor to Next Biome
      if (this.wd.trapdoor && Math.hypot(this.me.x - 240, this.me.y - 135) < 20 && now() > this.nextT) {
        this.nextT = now() + 1200;
        this.initFloor(this.wd.bIdx + 1, ((Math.random() * 99999) | 0) + 1);
        this.enterCell(2, 2, '');
        this.lastKey = this.rmKey();
        this.snd(300, 0.45, 'triangle', 0.09, 520);
      }

      // Pickups (Heart / Key)
      for (let i = this.DROPS.length - 1; i >= 0; i--) {
        const dr = this.DROPS[i];
        if (Math.hypot(dr.x - this.me.x, dr.y - this.me.y) < 18) {
          if (dr.t === 'key') {
            this.me.keys++;
            this.FT.push({ x: this.me.x, y: this.me.y - 22, s: '+1 CHAVE!', c: '#ffd54f', l: 1.0, b: 1 });
            this.pt(dr.x, dr.y, '#ffd54f', 16, 90, 0.45, 2.5);
            this.snd(620, 0.2, 'triangle', 0.07, 300);
            this.DROPS.splice(i, 1);
          } else if (this.me.hp < this.me.mh) {
            this.me.hp = Math.min(this.me.mh, this.me.hp + 1);
            this.FT.push({ x: this.me.x, y: this.me.y - 22, s: '+1 CORAÇÃO!', c: '#ff5252', l: 1.0, b: 1 });
            this.pt(dr.x, dr.y, '#ff5252', 16, 90, 0.45, 2.5);
            this.snd(580, 0.2, 'triangle', 0.07, 260);
            this.DROPS.splice(i, 1);
          }
        }
      }

      // Invulnerability (Z > 6px ignores projectiles & floor hazards!)
      this.me.inv -= dt;
      if (this.me.inv <= 0) {
        let hit = false;
        const inAir = isJumpInvulnerable(this.me.z);

        if (!inAir) {
          for (const e of this.wd.en) {
            if (Math.hypot(e.x - this.me.x, e.y - this.me.y) < (RAD_STATS[e.t] || 12) + 7) {
              hit = true;
              break;
            }
            if (e.seg) {
              for (const sg of e.seg) {
                if (Math.hypot(sg.x - this.me.x, sg.y - this.me.y) < 16) {
                  hit = true;
                  break;
                }
              }
            }
          }
          if (!hit) {
            for (const b of this.wd.eb) {
              if (Math.hypot(b.x - this.me.x, b.y - this.me.y) < 8) {
                hit = true;
                this.wd.eb = this.wd.eb.filter((x) => x !== b);
                break;
              }
            }
          }
          if (!hit && !this.me.fly && this.spikesUp()) {
            for (const spk of this.hazards().spikes) {
              if (Math.hypot(spk.x - this.me.x, spk.y - this.me.y) < 13) {
                hit = true;
                break;
              }
            }
          }
        }

        if (hit) {
          this.me.inv = 1.25;
          if (this.me.sh > 0) {
            this.me.sh--;
            this.pt(this.me.x, this.me.y, '#40c4ff', 22, 120, 0.5, 3);
            this.snd(700, 0.2, 'triangle', 0.08, -400);
            this.FT.push({ x: this.me.x, y: this.me.y - 24, s: 'BOLHA BLOQUEOU!', c: '#40c4ff', l: 0.9 });
          } else {
            this.roomDamaged = true;
            this.me.hp--;
            this.me.j = 0.55;
            this.fl = 1;
            this.addShake(9);
            this.addHitStop(0.08);
            this.pt(this.me.x, this.me.y, '#ff1744', 18, 120, 0.5, 3, 200);
            this.snd(150, 0.3, 'sawtooth', 0.08, -100);

            if (this.me.hp <= 0) {
              if (this.me.ankh > 0) {
                this.me.ankh = 0;
                this.me.hp = Math.min(this.me.mh, 3);
                this.me.inv = 2.0;
                this.wd.eb = [];
                this.pt(this.me.x, this.me.y, '#00e676', 45, 160, 0.9, 3.5);
                this.FT.push({
                  x: this.me.x,
                  y: this.me.y - 30,
                  s: 'OVA DE RENASCIMENTO ATIVADA!',
                  c: '#00e676',
                  l: 2.0,
                  b: 1,
                });
                this.snd(440, 0.45, 'triangle', 0.1, 520);
              } else {
                this.me.hp = 0;
                this.me.dead = true;
                this.me.revP = 0;
                this.pt(this.me.x, this.me.y, '#fff', 32, 140, 0.8, 3);
                this.snd(100, 0.7, 'sawtooth', 0.09, -60);
                if (!this.botPartner.active || this.botPartner.dead) {
                  document.body.dataset.state = 'gameover';
                }
              }
            }
          }
        }
      }
    }

    // Player Bullets vs Props, Walls & Enemies
    for (const b of this.myB) {
      if (b.foam) b.r = Math.min(11, b.r + dt * 4.5);
      if (b.royal) {
        b.trailT = (b.trailT || 0) - dt;
        if (b.trailT <= 0) {
          b.trailT = 0.12;
          this.POOLS.push({ x: b.x, y: b.y, r: 14, l: 1.4, tk: 0, c: '#00ffaa' });
        }
      }
      if (!b.chem && this.POOLS.some((pl) => !pl.slow && Math.hypot(pl.x - b.x, pl.y - b.y) < pl.r)) {
        b.chem = 1;
        b.d *= 1.25;
        b.col = '#00e5ff';
      }
      if (b.tng && this.me.syn['hydra']) {
        for (const f of this.FLIES) {
          if (Math.hypot(f.x - b.x, f.y - b.y) < 38) {
            f.x = this.me.x;
            f.y = this.me.y;
          }
        }
      }
      if ((this.me.hm || b.shoal) && !b.tng) {
        let nearE: Enemy | null = null;
        let bestD = b.shoal ? 42000 : 26000;
        for (const e of this.wd.en) {
          const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
          if (d < bestD) {
            bestD = d;
            nearE = e;
          }
        }
        if (nearE) {
          const s = Math.hypot(b.vx, b.vy);
          const dx = nearE.x - b.x;
          const dy = nearE.y - b.y;
          const dl = Math.hypot(dx, dy) || 1;
          const turn = Math.min(1, dt * (b.shoal ? 11 : 6.5));
          b.vx += ((dx / dl) * s - b.vx) * turn;
          b.vy += ((dy / dl) * s - b.vy) * turn;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.l -= dt;
      if (Math.random() < 0.38) {
        this.emitProjectileTrail(b, false);
      }

      for (const pr of this.PROPS) {
        if (!pr.dead && Math.hypot(pr.x - b.x, pr.y - b.y) < 12 + b.r) {
          this.breakProp(pr);
          if (!b.p) {
            b.l = 0;
            break;
          }
        }
      }

      const hitX = b.x < M || b.x > W - M;
      const hitY = b.y < M || b.y > H - M;
      const hitRk = !this.me.fly && this.inRock(b.x, b.y);

      if (hitX || hitY || hitRk) {
        const bCol = b.col || WP[b.w]?.col || '#76ff03';
        if (b.bnc > 0 && !b.tng) {
          b.bnc--;
          if (hitX) b.vx *= -1;
          if (hitY || hitRk) b.vy *= -1;
          b.x = clamp(b.x, M + 2, W - M - 2);
          b.y = clamp(b.y, M + 2, H - M - 2);
          this.emitWallImpact(b.x, b.y, b.vx, b.vy, bCol, true);
          this.triggerAoE(b);
          this.snd(340, 0.04, 'triangle', 0.03, 80);
        } else {
          b.l = 0;
          this.triggerAoE(b);
          this.emitWallImpact(b.x, b.y, b.vx, b.vy, bCol, false);
          this.snd(260, 0.05, 'square', 0.02);
        }
      }

      for (const e of this.wd.en) {
        if (
          b.l > 0 &&
          !b.hit.includes(e.id) &&
          Math.hypot(e.x - b.x, e.y - b.y) < (RAD_STATS[e.t] || 12) * (e.chmp ? 1.2 : 1) + b.r
        ) {
          const kb = (b.tng ? 18 : b.w === 4 ? 14 : 4.5) * (this.me.hyper ? 1.4 : 1);
          this.hitEnemy(e, b.d, Math.cos(b.ka) * kb, Math.sin(b.ka) * kb, b.oid || this.me.id);
          b.hit.push(e.id);
          if (!b.p) {
            b.l = 0;
            this.triggerAoE(b);
          }
        }
      }
    }
    this.myB = this.myB.filter((b) => b.l > 0);

    // Check Room Clear
    if (!this.wd.clear && !this.wd.en.length) {
      this.wd.clear = true;
      if (cell) {
        cell.clear = true;
        if (cell.totem && cell.totem.state === 1) {
          cell.totem.state = 2;
          if (cell.coopChest) cell.coopChest.spawned = true;
          this.spawnLarvaDrop(240, 130, 1);
          this.FT.push({
            x: 240,
            y: 112,
            s: 'DESAFIO DO TOTEM VENCIDO! BAÚ + LARVA!',
            c: '#ffd54f',
            l: 2.0,
            b: 1,
          });
        }
      }
      if (!this.roomDamaged) {
        this.unlockAch('untouch');
        if (Math.random() < 0.04) this.spawnLarvaDrop(240, 160, 1);
      }
      this.snd(440, 0.25, 'triangle', 0.07, 220);

      if (cell?.type === 'boss') {
        this.spawnLarvaDrop(240, 150, 1 + (Math.random() < 0.25 ? 1 : 0));
        if (this.wd.bIdx >= 4) {
          this.wd.over = 'win';
          this.unlockAch('win');
        } else {
          this.wd.trapdoor = true;
        }
      }
    }
  }

  updateParticles(dt: number) {
    for (const p of this.P) {
      p.ox = p.x;
      p.oy = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      const drag = p.drag ?? 1.8;
      p.vx *= Math.max(0, 1 - dt * drag);
      if (p.rot !== undefined && p.vrot) p.rot += p.vrot * dt;
      p.l -= dt;
      if (p.bf && p.y > p.bf && p.vy > 0) {
        p.y = p.bf;
        p.vy *= -(p.bnc ?? 0.62);
        p.vx *= 0.76;
      }
    }
    for (let i = this.P.length - 1; i >= 0; i--) {
      if (this.P[i].l <= 0) this.P.splice(i, 1);
    }

    for (let i = this.CASINGS.length - 1; i >= 0; i--) {
      const c = this.CASINGS[i];
      updateBouncingParticle(c, dt);
      c.l -= dt;
      if (c.l <= 0) this.CASINGS.splice(i, 1);
    }

    for (let i = this.GHOSTS.length - 1; i >= 0; i--) {
      this.GHOSTS[i].l -= dt;
      if (this.GHOSTS[i].l <= 0) this.GHOSTS.splice(i, 1);
    }

    for (let i = this.BEAMS.length - 1; i >= 0; i--) {
      this.BEAMS[i].l -= dt;
      if (this.BEAMS[i].l <= 0) this.BEAMS.splice(i, 1);
    }

    for (const f of this.FT) {
      f.y -= 28 * dt;
      f.l -= dt;
    }
    for (let i = this.FT.length - 1; i >= 0; i--) {
      if (this.FT[i].l <= 0) this.FT.splice(i, 1);
    }

    this.shake = Math.max(0, this.shake - dt * 30);
    this.tr = Math.max(0, this.tr - dt * 1.8);
  }

  render() {
    const g = this.ctx;
    g.setTransform(Z, 0, 0, Z, 0, 0);

    if (this.ST === 'menu') {
      drawMenuDiorama(this);
      return;
    }

    g.fillStyle = '#040806';
    g.fillRect(0, 0, W, H);
    g.setTransform(
      Z,
      0,
      0,
      Z,
      (Math.random() - 0.5) * this.shake * Z,
      (Math.random() - 0.5) * this.shake * Z
    );

    if (this.ST === 'camp') {
      renderCampScene(this);
    } else {
      renderPlayScene(this);
    }
  }

  drawBullet(b: any, isEnemy = false) {
    const g = this.ctx;
    const c = isEnemy ? '#ff5252' : b.col || WP[b.w]?.col || '#76ff03';
    const r = b.r || 4;
    const ang = Math.atan2(b.vy, b.vx);

    if (b.tng) {
      // Articulated Elastic Pink Frog Tongue Lash coming directly from the frog's mouth!
      const ox = this.me.x + Math.cos(this.me.ang) * 5;
      const oy = this.me.y - 7 - this.me.z + Math.sin(this.me.ang) * 4;
      const mx = (ox + b.x) * 0.5 + Math.sin(this.TT * 35) * 4 * -Math.sin(ang);
      const my = (oy + b.y) * 0.5 + Math.sin(this.TT * 35) * 4 * Math.cos(ang);

      g.save();
      g.lineCap = 'round';
      // Outer dark organic outline
      g.strokeStyle = '#3b0718';
      g.lineWidth = 6.5;
      g.beginPath();
      g.moveTo(ox, oy);
      g.quadraticCurveTo(mx, my, b.x, b.y);
      g.stroke();

      // Main fleshy tongue body
      g.strokeStyle = '#ff4081';
      g.lineWidth = 4.2;
      g.beginPath();
      g.moveTo(ox, oy);
      g.quadraticCurveTo(mx, my, b.x, b.y);
      g.stroke();

      // Wet specular center stripe
      g.strokeStyle = '#ff80ab';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(ox, oy);
      g.quadraticCurveTo(mx, my, b.x, b.y);
      g.stroke();

      // Curled sticky tongue tip pad at (b.x, b.y)
      g.fillStyle = '#3b0718';
      g.beginPath();
      g.arc(b.x, b.y, r * 1.15 + 1, 0, 7);
      g.fill();
      g.fillStyle = '#ff4081';
      g.beginPath();
      g.arc(b.x, b.y, r * 1.05, 0, 7);
      g.fill();
      g.fillStyle = '#ffcdd2';
      g.beginPath();
      g.arc(b.x - 1, b.y - 1, r * 0.45, 0, 7);
      g.fill();
      g.restore();
      return;
    }

    // Wriggling Tadpole Tail for Enxame Girino (b.w === 1 or b.shoal)
    if (!isEnemy && (b.w === 1 || b.shoal)) {
      const tailA = ang + Math.PI;
      const w1 = Math.sin(this.TT * 32 + b.x * 0.2) * 0.45;
      const tx1 = b.x + Math.cos(tailA + w1) * (r * 1.8);
      const ty1 = b.y + Math.sin(tailA + w1) * (r * 1.8);
      const tx2 = tx1 + Math.cos(tailA - w1) * (r * 1.5);
      const ty2 = ty1 + Math.sin(tailA - w1) * (r * 1.5);
      g.strokeStyle = c;
      g.lineWidth = Math.max(1.5, r * 0.55);
      g.beginPath();
      g.moveTo(b.x, b.y);
      g.lineTo(tx1, ty1);
      g.lineTo(tx2, ty2);
      g.stroke();
    }

    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.28;
    g.drawImage(glow(c), b.x - r * 2.2, b.y - r * 2.2, r * 4.4, r * 4.4);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;

    if (!isEnemy && b.w === 2) {
      // Shimmering Hollow Foam Bubble for Sopro de Bolhas
      g.fillStyle = '#0288d155';
      g.beginPath();
      g.arc(b.x, b.y, r * 1.15, 0, 7);
      g.fill();
      g.strokeStyle = c;
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(b.x, b.y, r * 1.15, 0, 7);
      g.stroke();
      g.fillStyle = '#ffffff';
      g.fillRect(b.x - r * 0.55, b.y - r * 0.55, Math.max(1.5, r * 0.45), Math.max(1.5, r * 0.45));
      return;
    }

    // Organic Spit Glob / Sludge Bomb
    g.fillStyle = '#09140c';
    g.beginPath();
    g.ellipse(b.x, b.y, r * 1.4 + 0.8, r * 0.95 + 0.8, ang, 0, 7);
    g.fill();

    g.fillStyle = c;
    g.beginPath();
    g.ellipse(b.x, b.y, r * 1.35, r * 0.9, ang, 0, 7);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(b.x - 1, b.y - 1, r * 0.38, 0, 7);
    g.fill();
  }

  drawMinimap() {
    if (!this.wd || !this.wd.grid) return;
    const g = this.ctx;
    const mx = W - 62;
    const my = 26;
    const sz = 9;
    const gap = 2;

    g.fillStyle = '#050c08dd';
    g.fillRect(mx - 4, my - 4, 5 * (sz + gap) + 6, 5 * (sz + gap) + 6);
    g.strokeStyle = '#66bb6a';
    g.lineWidth = 1.2;
    g.strokeRect(mx - 4, my - 4, 5 * (sz + gap) + 6, 5 * (sz + gap) + 6);

    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const c = this.wd.grid[y][x];
        if (!c.active) continue;
        const adjVis = [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ].some(([dx, dy]) => this.wd.grid?.[y + dy]?.[x + dx]?.vis);
        if (!c.vis && !adjVis) continue;

        const rx = mx + x * (sz + gap);
        const ry = my + y * (sz + gap);
        const isCur = x === this.wd.gx && y === this.wd.gy;
        g.fillStyle = isCur ? '#ffd54f' : c.vis ? (c.clear ? '#43a047' : '#ef5350') : '#263238';
        g.fillRect(rx, ry, sz, sz);
        if (c.type === 'boss') drawText(g, 'B', rx + 4.5, ry + 7.5, '#ff1744', 'center', 5);
        else if (c.type === 'shop') drawText(g, '$', rx + 4.5, ry + 7.5, '#ffd54f', 'center', 5);
        else if (c.type === 'treasure') drawText(g, 'M', rx + 4.5, ry + 7.5, '#29b6f6', 'center', 5);
      }
    }
  }

  drawCrosshair() {
    if (this.paused) return;
    const g = this.ctx;
    g.save();

    // Subtle organic aim guide dots from frog's mouth to the crosshair reticle
    if (this.me && !this.me.dead) {
      const ox = this.me.x + Math.cos(this.me.ang) * 8;
      const oy = this.me.y - 7 - this.me.z + Math.sin(this.me.ang) * 6;
      const dist = Math.hypot(this.mouse.x - ox, this.mouse.y - oy);
      const steps = Math.min(5, Math.floor(dist / 18));
      const wCol = WP[this.me.w]?.col || '#69f0ae';
      for (let i = 1; i <= steps; i++) {
        const t = i / (steps + 1);
        const gx = ox + (this.mouse.x - ox) * t;
        const gy = oy + (this.mouse.y - oy) * t;
        g.globalAlpha = 0.25 + t * 0.25;
        g.fillStyle = wCol;
        g.fillRect(Math.round(gx) - 1, Math.round(gy) - 1, 2, 2);
      }
    }

    const sc = 1 + (this.me.puff > 0 ? 0.28 : 0) + Math.sin(this.TT * 8) * 0.05;
    g.translate(Math.round(this.mouse.x), Math.round(this.mouse.y));
    g.rotate(this.TT * 2.2);
    g.scale(sc, sc);
    g.globalAlpha = 0.94;
    g.drawImage(this.S.cross, -this.S.cross.width / 2, -this.S.cross.height / 2);
    g.restore();
  }

  drawParticles() {
    const g = this.ctx;

    // Pass 1: Ground Shadows for Gravity-Bouncing Particles (bf)
    g.fillStyle = '#000000';
    for (const p of this.P) {
      if (p.bf && p.shape !== 'ring') {
        const a = clamp((p.l / p.m) * 1.4, 0, 1);
        const hDist = Math.max(0, p.bf - p.y);
        const shAlpha = a * clamp(0.28 - hDist * 0.006, 0.05, 0.28);
        const shW = Math.max(1.5, p.s * clamp(1 - hDist * 0.015, 0.4, 1));
        g.globalAlpha = shAlpha;
        g.fillRect(p.x - shW / 2, p.bf - 1, shW, 1.6);
      }
    }

    // Pass 2: Subtle Additive Neon Glows & Shockwave Rings ('lighter')
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const p of this.P) {
      const ratio = clamp(p.l / p.m, 0, 1);
      const a = clamp(ratio * 1.4, 0, 1);
      if (p.shape === 'ring') {
        const prog = 1 - ratio;
        const rad = 3 + prog * p.s;
        g.globalAlpha = a * 0.65;
        g.strokeStyle = p.c;
        g.lineWidth = Math.max(1, 2.2 * ratio);
        g.beginPath();
        g.arc(p.x, p.y, rad, 0, 7);
        g.stroke();
        continue;
      }
      if ((p.glow ?? 0.35) > 0.2) {
        const glR = p.s * 2.1;
        g.globalAlpha = a * (p.glow ?? 0.35) * 0.38;
        g.drawImage(glow(p.c), p.x - glR, p.y - glR, glR * 2, glR * 2);
      }
    }
    g.restore();

    // Pass 3: Crisp Neon Particle Bodies (Sparks, Stars, Droplets, Pixels)
    for (const p of this.P) {
      if (p.shape === 'ring') continue;
      const a = clamp((p.l / p.m) * 1.5, 0, 1);
      const s = p.s * (0.45 + 0.55 * a);
      g.globalAlpha = a;

      if (p.shape === 'spark') {
        const tx = p.x - p.vx * 0.028;
        const ty = p.y - p.vy * 0.028;
        g.strokeStyle = p.c;
        g.lineWidth = Math.max(1.2, s * 0.75);
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(p.x, p.y);
        g.stroke();
        g.fillStyle = p.c2 || '#ffffff';
        g.fillRect(p.x - s * 0.35, p.y - s * 0.35, s * 0.7, s * 0.7);
      } else if (p.shape === 'star') {
        g.fillStyle = p.c;
        g.fillRect(p.x - s * 0.85, p.y - s * 0.28, s * 1.7, s * 0.56);
        g.fillRect(p.x - s * 0.28, p.y - s * 0.85, s * 0.56, s * 1.7);
        g.fillStyle = p.c2 || '#ffffff';
        g.fillRect(p.x - s * 0.28, p.y - s * 0.28, s * 0.56, s * 0.56);
      } else if (p.shape === 'droplet') {
        g.fillStyle = p.c;
        g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        if (s > 1.8) {
          g.fillStyle = p.c2 || '#ffffff';
          g.fillRect(p.x - s / 2 + 0.4, p.y - s / 2 + 0.4, Math.max(1, s * 0.38), Math.max(1, s * 0.38));
        }
      } else {
        g.fillStyle = p.c;
        g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    g.globalAlpha = 1;

    for (let i = 0; i < this.FT.length; i++) {
      const f = this.FT[i];
      for (let j = 0; j < i; j++) {
        const prev = this.FT[j];
        if (Math.abs(f.x - prev.x) < 110 && Math.abs(f.y - prev.y) < 11) {
          f.y = prev.y - 12;
        }
      }
      g.globalAlpha = clamp(f.l * 2, 0, 1);
      drawText(g, f.s, f.x, f.y, f.c, 'center', f.b ? 7 : 5.8);
    }
    g.globalAlpha = 1;
  }

  dspr(
    s: HTMLCanvasElement,
    x: number,
    y: number,
    j = 0,
    al = 1,
    f = 0,
    sc = 1,
    z = 0,
    outlineCol = '',
    flipX = 1
  ) {
    if (!s) return;
    const g = this.ctx;
    const h = s.height * sc;
    const w = s.width * sc;
    g.save();

    // Projected ground shadow (shrinks as Z increases)
    const shSc = clamp(1 - z / 55, 0.4, 1);
    g.globalAlpha = 0.36 * shSc;
    g.fillStyle = '#000';
    g.beginPath();
    g.ellipse(x, y + h / 2, w * 0.42 * shSc, 3.5 * sc * shSc, 0, 0, 7);
    g.fill();

    // Sprite rendered at y - z
    g.globalAlpha = al;
    g.translate(Math.round(x), Math.round(y + h / 2 - z));
    if (z > 2) g.rotate(Math.sin((z / 24) * Math.PI) * 0.22 * (this.me.ax >= 0 ? 1 : -1));
    g.scale((1 + j) * sc * flipX, (1 - j) * sc);

    if (outlineCol) {
      const oSil = sil(s, outlineCol);
      g.drawImage(oSil, -s.width / 2 - 1, -s.height);
      g.drawImage(oSil, -s.width / 2 + 1, -s.height);
      g.drawImage(oSil, -s.width / 2, -s.height - 1);
      g.drawImage(oSil, -s.width / 2, -s.height + 1);
    }
    g.drawImage(s, -s.width / 2, -s.height);
    if (f > 0) {
      g.globalAlpha = 0.92;
      g.drawImage(sil(s, '#fff'), -s.width / 2, -s.height);
    }
    g.restore();
  }

  loop() {
    if (!this.running) return;
    const n = now();
    let dt = Math.min(0.05, (n - this.lastTime) / 1000);
    this.lastTime = n;

    if (this.hs > 0) {
      this.hs -= dt;
      dt *= 0.18;
    }

    this.update(dt);
    this.render();
    requestAnimationFrame(this.boundLoop);
  }

  start() {
    this.running = true;
    this.lastTime = now();
    requestAnimationFrame(this.boundLoop);
  }

  stop() {
    this.running = false;
  }

  initEvents() {
    window.addEventListener('keydown', (e) => {
      if ((window as any).__SAPO_REBINDING__) return;
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      this.keys[e.code] = true;

      const b = this.CFG.binds || DEFAULT_BINDS;
      if (
        e.code.startsWith('Arrow') ||
        e.code === 'Space' ||
        e.code === 'Tab' ||
        e.code === b.jump ||
        e.code === b.partner
      ) {
        e.preventDefault();
      }

      if (e.code === 'KeyM') {
        this.CFG.muted = !this.CFG.muted;
        this.saveProgress();
      }
      if (e.code === b.partner) {
        if ((this.ST === 'play' || this.ST === 'camp') && !this.paused) this.toggleBotPartner();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.ST === 'play' || this.ST === 'camp') {
          this.paused = !this.paused;
          if (this.onOpenOptions && this.paused) this.onOpenOptions();
        }
      }
      if ((this.ST === 'play' || this.ST === 'camp') && !this.paused) {
        if (e.code === b.jump) this.triggerJump();
        if (e.code === b.interact) this.interactE();
        if (e.code === b.restart) this.reset(false);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouse.down = false;
      this.mouse.rdown = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.touchState.lActive || this.touchState.rActive) return;
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      this.mouse.x = clamp((e.clientX - rect.left) * (W / rect.width), 0, W);
      this.mouse.y = clamp((e.clientY - rect.top) * (H / rect.height), 0, H);
      this.mouse.active = true;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.touchState.lActive || this.touchState.rActive) return;
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) {
        this.mouse.rdown = true;
        this.triggerJump();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rdown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
