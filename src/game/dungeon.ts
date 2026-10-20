/**
 * Procedural 5x5 Dungeon Graph Generation with Shop, Treasure, Totems & Co-op Chests
 */

import { CH, IT, RAR_INFO } from './constants.ts';

export interface CellDoors {
  N: boolean;
  S: boolean;
  W: boolean;
  E: boolean;
}

export type RoomType = 'none' | 'start' | 'combat' | 'shop' | 'treasure' | 'boss';

export interface ShopPedestal {
  x: number;
  y: number;
  t: 'hp' | 'key' | 'ankh_or_it' | 'it';
  nm?: string;
  ds?: string;
  k?: number;
  cost: number;
  sold: boolean;
}

export interface ChestProp {
  x: number;
  y: number;
  spawned?: boolean;
  open: boolean;
  k: number;
}

export interface TotemProp {
  x: number;
  y: number;
  state: number; // 0 = ready, 1 = active elite wave, 2 = cleared
}

export interface DungeonCell {
  gx: number;
  gy: number;
  active: boolean;
  type: RoomType;
  vis: boolean;
  clear: boolean;
  lay: number;
  doors: CellDoors;
  locked: boolean;
  chest: ChestProp | null;
  shop: ShopPedestal[] | null;
  coopChest: ChestProp | null;
  totem: TotemProp | null;
}

export function createPseudoRandom(seed: number) {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function rollItemByRarity(
  r: () => number,
  minR = 0,
  maxR = 3,
  frogIdx = 0,
  luckBonus = 0
): number {
  const roll = r() + luckBonus;
  let targetR = minR;
  if (roll > 0.92) targetR = 3;
  else if (roll > 0.74) targetR = 2;
  else if (roll > 0.44) targetR = 1;
  targetR = Math.max(minR, Math.min(maxR, targetR));

  const affList = CH[frogIdx]?.aff || [];
  const affPool: number[] = [];
  const genPool: number[] = [];

  IT.forEach((it, idx) => {
    if (it[2] === targetR) {
      genPool.push(idx);
      if (affList.includes(idx)) affPool.push(idx);
    }
  });

  if (affPool.length && r() < 0.65) {
    return affPool[Math.floor(r() * affPool.length)];
  }
  return genPool.length ? genPool[Math.floor(r() * genPool.length)] : 0;
}

export function generateDungeonGrid(
  bIdx: number,
  seed: number,
  frogIdx = 0,
  luckBonus = 0
): DungeonCell[][] {
  const r = createPseudoRandom(seed + bIdx * 7919);
  const grid: DungeonCell[][] = Array.from({ length: 5 }, (_, gy) =>
    Array.from({ length: 5 }, (_, gx) => ({
      gx,
      gy,
      active: false,
      type: 'none',
      vis: false,
      clear: false,
      lay: 0,
      doors: { N: false, S: false, W: false, E: false },
      locked: false,
      chest: null,
      shop: null,
      coopChest: null,
      totem: null,
    }))
  );

  const cells: DungeonCell[] = [];
  const addCell = (gx: number, gy: number, type: RoomType = 'combat'): DungeonCell => {
    const c = grid[gy][gx];
    if (!c.active) {
      c.active = true;
      c.type = type;
      c.lay = (gx * 7 + gy * 13 + bIdx * 5) % 4;
      cells.push(c);
    }
    return c;
  };

  const startCell = addCell(2, 2, 'start');
  startCell.vis = true;
  startCell.clear = true;

  const dirs: Array<[number, number, keyof CellDoors, keyof CellDoors]> = [
    [0, -1, 'N', 'S'],
    [0, 1, 'S', 'N'],
    [-1, 0, 'W', 'E'],
    [1, 0, 'E', 'W'],
  ];

  let cx = 2;
  let cy = 2;
  const targetCount = 8 + Math.floor(r() * 3);
  let tries = 0;

  while (cells.length < targetCount && tries++ < 250) {
    const d = dirs[Math.floor(r() * 4)];
    const nx = cx + d[0];
    const ny = cy + d[1];
    if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5) {
      addCell(nx, ny, 'combat');
      cx = nx;
      cy = ny;
    } else {
      const pick = cells[Math.floor(r() * cells.length)];
      cx = pick.gx;
      cy = pick.gy;
    }
  }

  // Connect doors
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const c = grid[y][x];
      if (!c.active) continue;
      for (const [dx, dy, d1, d2] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && grid[ny][nx].active) {
          c.doors[d1] = true;
          grid[ny][nx].doors[d2] = true;
        }
      }
    }
  }

  // Assign special rooms based on distance from start (2,2)
  const candidates = cells.filter((c) => !(c.gx === 2 && c.gy === 2));
  candidates.sort((a, b) => {
    const da = Math.abs(a.gx - 2) + Math.abs(a.gy - 2);
    const db = Math.abs(b.gx - 2) + Math.abs(b.gy - 2);
    return db - da;
  });

  if (candidates.length > 0) {
    const bossCell = candidates[0];
    bossCell.type = 'boss';
    bossCell.lay = 0;
  }

  if (candidates.length > 1) {
    const shopCell = candidates[candidates.length > 2 ? candidates.length - 1 : 1];
    shopCell.type = 'shop';
    shopCell.clear = true;
    shopCell.lay = 0;
    const kShop1 = rollItemByRarity(r, 0, 1, frogIdx, luckBonus);
    let kShop2 = rollItemByRarity(r, 1, 3, frogIdx, luckBonus);
    if (kShop2 === kShop1) kShop2 = (kShop2 + 1) % IT.length;
    shopCell.shop = [
      { x: 144, y: 168, t: 'hp', nm: 'CORAÇÃO FRESCO', ds: 'Restaura +1 Vida', cost: 16, sold: false },
      { x: 208, y: 168, t: 'key', nm: 'CHAVE DE OSSO', ds: 'Abre Sala de Mutação', cost: 18, sold: false },
      { x: 272, y: 168, t: 'ankh_or_it', k: kShop1, cost: RAR_INFO[IT[kShop1][2]].cost, sold: false },
      { x: 336, y: 168, t: 'it', k: kShop2, cost: RAR_INFO[IT[kShop2][2]].cost, sold: false },
    ];
  }

  if (candidates.length > 2) {
    const treasCell = candidates.find((c) => c.type !== 'boss' && c.type !== 'shop') || candidates[1];
    treasCell.type = 'treasure';
    treasCell.clear = true;
    treasCell.locked = true;
    treasCell.lay = 0;
    treasCell.chest = {
      x: 240,
      y: 162,
      open: false,
      k: rollItemByRarity(r, 1, 3, frogIdx, luckBonus),
    };
  }

  for (const c of cells) {
    if (c.type === 'combat') {
      c.coopChest = {
        x: 240,
        y: 162,
        spawned: false,
        open: false,
        k: rollItemByRarity(r, 1, 3, frogIdx, luckBonus),
      };
      c.totem = { x: 240, y: 76, state: 0 };
    }
  }

  return grid;
}
