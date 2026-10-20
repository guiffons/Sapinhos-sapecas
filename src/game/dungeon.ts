/**
 * Procedural 5x5 Dungeon Graph Generation with Winding Path to Boss, Multi-Wave Rooms, Shrines, Shop, Treasure & Totems
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

export interface ShrineProp {
  x: number;
  y: number;
  kind: 'blood' | 'fortune' | 'spring';
  used: boolean;
}

export interface DungeonCell {
  gx: number;
  gy: number;
  active: boolean;
  type: RoomType;
  vis: boolean;
  clear: boolean;
  lay: number;
  dist: number;
  wavesTotal: number;
  waveCur: number;
  doors: CellDoors;
  locked: boolean;
  chest: ChestProp | null;
  shop: ShopPedestal[] | null;
  coopChest: ChestProp | null;
  totem: TotemProp | null;
  shrine: ShrineProp | null;
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
  if (roll > 0.94) targetR = 3;
  else if (roll > 0.78) targetR = 2;
  else if (roll > 0.48) targetR = 1;
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
      dist: 0,
      wavesTotal: 1,
      waveCur: 1,
      doors: { N: false, S: false, W: false, E: false },
      locked: false,
      chest: null,
      shop: null,
      coopChest: null,
      totem: null,
      shrine: null,
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

  const linkDoors = (
    c1: DungeonCell,
    c2: DungeonCell,
    d1: keyof CellDoors,
    d2: keyof CellDoors
  ) => {
    c1.doors[d1] = true;
    c2.doors[d2] = true;
  };

  const startCell = addCell(2, 2, 'start');
  startCell.vis = true;
  startCell.clear = true;
  startCell.dist = 0;

  const dirs: Array<[number, number, keyof CellDoors, keyof CellDoors]> = [
    [0, -1, 'N', 'S'],
    [0, 1, 'S', 'N'],
    [-1, 0, 'W', 'E'],
    [1, 0, 'E', 'W'],
  ];

  // Phase 1: Carve a long winding primary spine (5 to 7 rooms deep) so the Boss is never right next to Start
  let cx = 2;
  let cy = 2;
  const spineTarget = 6 + Math.min(2, bIdx);
  for (let step = 0; step < spineTarget * 4 && cells.length < spineTarget; step++) {
    // Prefer unvisited neighbors to create a true winding corridor
    const valid: Array<[number, number, keyof CellDoors, keyof CellDoors]> = [];
    for (const d of dirs) {
      const nx = cx + d[0];
      const ny = cy + d[1];
      if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && !grid[ny][nx].active) {
        valid.push(d);
      }
    }
    if (valid.length > 0) {
      const d = valid[Math.floor(r() * valid.length)];
      const prev = grid[cy][cx];
      const next = addCell(cx + d[0], cy + d[1], 'combat');
      linkDoors(prev, next, d[2], d[3]);
      cx = next.gx;
      cy = next.gy;
    } else {
      break;
    }
  }

  // Phase 2: Expand side branches to reach 12–15 rooms total per floor
  const targetCount = Math.min(16, 12 + Math.floor(r() * 3) + Math.min(2, bIdx));
  let tries = 0;
  while (cells.length < targetCount && tries++ < 300) {
    const pick = cells[Math.floor(r() * cells.length)];
    const d = dirs[Math.floor(r() * 4)];
    const nx = pick.gx + d[0];
    const ny = pick.gy + d[1];
    if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5) {
      const wasActive = grid[ny][nx].active;
      const next = addCell(nx, ny, 'combat');
      // Only link tree edges or occasional loop (15% chance) so dungeon corridors stay long
      if (!wasActive || r() < 0.15) {
        linkDoors(pick, next, d[2], d[3]);
      }
    }
  }

  // Compute exact BFS shortest-path distance through connected doors from Start (2,2)
  for (const c of cells) c.dist = 99;
  startCell.dist = 0;
  const queue: DungeonCell[] = [startCell];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy, d1] of dirs) {
      if (!cur.doors[d1]) continue;
      const nx = cur.gx + dx;
      const ny = cur.gy + dy;
      if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5) {
        const nb = grid[ny][nx];
        if (nb.active && nb.dist > cur.dist + 1) {
          nb.dist = cur.dist + 1;
          queue.push(nb);
        }
      }
    }
  }

  // Ensure any isolated active cell (if any) is linked
  for (const c of cells) {
    if (c.dist === 99) {
      for (const [dx, dy, d1, d2] of dirs) {
        const nx = c.gx + dx;
        const ny = c.gy + dy;
        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && grid[ny][nx].active && grid[ny][nx].dist < 99) {
          linkDoors(c, grid[ny][nx], d1, d2);
          c.dist = grid[ny][nx].dist + 1;
          break;
        }
      }
    }
  }

  // Assign special rooms based on true BFS path distance from start (2,2)
  const candidates = cells.filter((c) => !(c.gx === 2 && c.gy === 2));
  candidates.sort((a, b) => b.dist - a.dist);

  if (candidates.length > 0) {
    const bossCell = candidates[0];
    bossCell.type = 'boss';
    bossCell.lay = 0;
    bossCell.wavesTotal = 1;
  }

  if (candidates.length > 1) {
    // Place shop at mid-distance so players earn flies before visiting the merchant
    const midIdx = Math.min(candidates.length - 1, Math.max(1, Math.floor(candidates.length * 0.55)));
    const shopCell = candidates[midIdx];
    shopCell.type = 'shop';
    shopCell.clear = true;
    shopCell.lay = 0;
    const kShop1 = rollItemByRarity(r, 0, 1, frogIdx, luckBonus);
    let kShop2 = rollItemByRarity(r, 1, 3, frogIdx, luckBonus);
    if (kShop2 === kShop1) kShop2 = (kShop2 + 1) % IT.length;
    shopCell.shop = [
      { x: 144, y: 168, t: 'hp', nm: 'CORAÇÃO FRESCO', ds: 'Restaura +1 Vida', cost: 20, sold: false },
      { x: 208, y: 168, t: 'key', nm: 'CHAVE DE OSSO', ds: 'Abre Sala de Mutação', cost: 22, sold: false },
      { x: 272, y: 168, t: 'ankh_or_it', k: kShop1, cost: RAR_INFO[IT[kShop1][2]].cost, sold: false },
      { x: 336, y: 168, t: 'it', k: kShop2, cost: RAR_INFO[IT[kShop2][2]].cost, sold: false },
    ];
  }

  if (candidates.length > 2) {
    const treasCell =
      candidates.find((c, i) => i >= 1 && c.type !== 'boss' && c.type !== 'shop') || candidates[1];
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

  // Assign multi-wave combat rooms and Swamp Shrines along the dungeon path
  const shrineKinds: Array<'blood' | 'fortune' | 'spring'> = ['blood', 'fortune', 'spring'];
  let shrinesPlaced = 0;

  for (const c of cells) {
    if (c.type === 'combat') {
      // Rooms with BFS distance >= 2 have 2 combat waves so the journey to the boss is longer & deeper
      c.wavesTotal = c.dist >= 2 ? 2 : 1;
      c.waveCur = 1;
      c.coopChest = {
        x: 240,
        y: 162,
        spawned: false,
        open: false,
        k: rollItemByRarity(r, 1, 3, frogIdx, luckBonus),
      };
      c.totem = { x: 240, y: 76, state: 0 };

      if (shrinesPlaced < 2 && c.dist >= 2 && r() < 0.35) {
        c.shrine = {
          x: 116,
          y: 84,
          kind: shrineKinds[(shrinesPlaced + bIdx) % shrineKinds.length],
          used: false,
        };
        shrinesPlaced++;
      }
    }
  }

  return grid;
}
