import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateZ, isJumpInvulnerable, calculateDPS, updateBouncingParticle } from './physics.ts';
import { getActiveSynergies, SYNERGIES } from './synergies.ts';
import { generateDungeonGrid } from './dungeon.ts';

test('calculateZ produces parabolic arc and 0 at ground', () => {
  assert.equal(calculateZ(0, 0.42, 24), 0);
  assert.equal(calculateZ(-0.1, 0.42, 24), 0);

  // Peak of jump at halfway point (jumpT = 0.21 of 0.42)
  const peakZ = calculateZ(0.21, 0.42, 24);
  assert.ok(Math.abs(peakZ - 24) < 0.01, `Expected peak ~24, got ${peakZ}`);

  // Quarter way
  const qZ = calculateZ(0.315, 0.42, 24);
  assert.ok(qZ > 10 && qZ < 20, `Expected quarter elevation around 16.97, got ${qZ}`);
});

test('isJumpInvulnerable applies when z > 6px', () => {
  assert.equal(isJumpInvulnerable(0), false);
  assert.equal(isJumpInvulnerable(5.9), false);
  assert.equal(isJumpInvulnerable(6.1), true);
  assert.equal(isJumpInvulnerable(24), true);
});

test('calculateDPS computes rolling 3s DPS correctly', () => {
  const nowMs = 10000;
  const hits = [
    { t: 9500, d: 2.5 },
    { t: 8500, d: 3.5 },
    { t: 6000, d: 10.0 }, // older than 3s (10000 - 3000 = 7000) -> ignored
  ];
  const dps = calculateDPS(hits, nowMs, 3);
  // (2.5 + 3.5) / 3 = 2.0
  assert.equal(dps, 2.0);
});

test('updateBouncingParticle bounces and dissipates energy', () => {
  const particle = { x: 100, y: 100, z: 10, vx: 50, vy: 50, vz: 0 };
  updateBouncingParticle(particle, 0.1);
  assert.ok(particle.z < 10, 'Particle z should decrease under gravity');
  assert.ok(particle.vx < 50, 'Velocity vx should decrease under friction');
});

test('synergy detection works correctly for weapons and mutations', () => {
  // Metralha de Bolha (weapon 2) + Glândula Ácida (item 9)
  const syns1 = getActiveSynergies(2, [9]);
  assert.equal(syns1.length, 1);
  assert.equal(syns1[0].id, 'foam');

  // Cuspe Ácido (weapon 0) + Dano Ácido (0) + Perfurante (4)
  const syns2 = getActiveSynergies(0, [0, 4]);
  assert.equal(syns2.some(s => s.id === 'royal'), true);

  // Escopeta Girino (1) + Olho Hipnótico (5)
  const syns3 = getActiveSynergies(1, [5]);
  assert.equal(syns3[0].id, 'shoal');
});

test('generateDungeonGrid generates connected 5x5 layout with start, boss, shop and treasure', () => {
  const grid = generateDungeonGrid(0, 42);
  assert.equal(grid.length, 5);
  assert.equal(grid[0].length, 5);

  const start = grid[2][2];
  assert.equal(start.active, true);
  assert.equal(start.type, 'start');
  assert.equal(start.clear, true);

  let activeCount = 0;
  let hasBoss = false;
  let hasShop = false;
  let hasTreasure = false;

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const c = grid[y][x];
      if (c.active) {
        activeCount++;
        if (c.type === 'boss') hasBoss = true;
        if (c.type === 'shop') hasShop = true;
        if (c.type === 'treasure') hasTreasure = true;

        // Doors must be reciprocal
        if (c.doors.N) assert.equal(grid[y - 1][x].doors.S, true);
        if (c.doors.S) assert.equal(grid[y + 1][x].doors.N, true);
        if (c.doors.W) assert.equal(grid[y][x - 1].doors.E, true);
        if (c.doors.E) assert.equal(grid[y][x + 1].doors.W, true);
      }
    }
  }

  assert.ok(activeCount >= 8, `Expected at least 8 rooms, got ${activeCount}`);
  assert.equal(hasBoss, true, 'Dungeon must have a boss room');
  assert.equal(hasShop, true, 'Dungeon must have a shop room');
  assert.equal(hasTreasure, true, 'Dungeon must have a treasure room');
});

import {
  EN_FLY,
  EN_GAP,
  EN_SHO,
  EN_CHG,
  EN_SLI,
  EN_BMB,
  EN_PLT,
  EN_SNK,
  EN_GHO,
  EN_SPD,
  BOSS_TOAD_F1,
  BOSS_TOAD_F2,
  ENEMY_INFO,
} from './constants.ts';

test('enemy and boss pixel matrices have zero outer black borders and complete bestiary info', () => {
  const matrices = [
    EN_FLY,
    EN_GAP,
    EN_SHO,
    EN_CHG,
    EN_SLI,
    EN_BMB,
    EN_PLT,
    EN_SNK,
    EN_GHO,
    EN_SPD,
    BOSS_TOAD_F1,
    BOSS_TOAD_F2,
  ];

  for (const mat of matrices) {
    assert.ok(mat.length >= 6, 'Matrix should have at least 6 rows');
    // Top row and bottom row should never have '0' (outer black border)
    assert.equal(mat[0].includes('0'), false, `Top row has outer border '0': ${mat[0]}`);
    assert.equal(
      mat[mat.length - 1].includes('0'),
      false,
      `Bottom row has outer border '0': ${mat[mat.length - 1]}`
    );
  }

  assert.equal(ENEMY_INFO.length, 15, 'Bestiary should document all 10 enemies and 5 bosses');
});

import {
  FROG_MUT1_IDLE,
  FROG_MUT1_PUFF,
  FROG_MUT2_IDLE,
  FROG_MUT2_PUFF,
  LARVA_MAT,
  LARVA_MAT2,
  WP,
  RAR_INFO,
} from './constants.ts';

test('mutated frog sprite matrices, segmented larva sprites, organic mouth abilities, and harder economy', () => {
  assert.equal(FROG_MUT1_IDLE.length, 12, 'Stage 1 mutated frog should have 12 rows');
  assert.equal(FROG_MUT1_PUFF.length, 12, 'Stage 1 mutated puff frog should have 12 rows');
  assert.equal(FROG_MUT2_IDLE.length, 12, 'Stage 2 apex mutated frog should have 12 rows');
  assert.equal(FROG_MUT2_PUFF.length, 12, 'Stage 2 apex mutated puff frog should have 12 rows');

  // Larva should be a 12-wide by 10-tall segmented grub with 2 wriggling frames
  assert.equal(LARVA_MAT.length, 10);
  assert.equal(LARVA_MAT[0].length, 12);
  assert.equal(LARVA_MAT2.length, 10);
  assert.equal(LARVA_MAT2[0].length, 12);
  assert.notDeepEqual(LARVA_MAT, LARVA_MAT2, 'Larva frames should animate wriggling');

  // Weapons replaced with organic mouth abilities
  assert.equal(WP.length, 6);
  for (const w of WP) {
    assert.equal(
      w.nm.includes('Escopeta') || w.nm.includes('Bacamarte') || w.nm.includes('Canhão'),
      false,
      `Ability ${w.nm} should be an organic mouth/tongue ability, not a firearm`
    );
  }

  // Harder economy shop prices
  assert.ok(RAR_INFO[0].cost >= 20, 'Common mutation cost should be challenging (>=20)');
  assert.ok(RAR_INFO[3].cost >= 55, 'Legendary mutation cost should be challenging (>=55)');
});

import {
  DEFAULT_BINDS,
  formatKeyLabel,
  SHAMAN_MAT,
  SHAMAN_MAT2,
} from './constants.ts';

test('custom keybindings and formatKeyLabel support player control customization', () => {
  // Check required key actions
  assert.ok(DEFAULT_BINDS.shoot, 'Shoot keybind must exist');
  assert.ok(DEFAULT_BINDS.jump, 'Jump keybind must exist');
  assert.ok(DEFAULT_BINDS.interact, 'Interact keybind must exist');
  assert.ok(DEFAULT_BINDS.up, 'Up keybind must exist');
  assert.ok(DEFAULT_BINDS.down, 'Down keybind must exist');
  assert.ok(DEFAULT_BINDS.left, 'Left keybind must exist');
  assert.ok(DEFAULT_BINDS.right, 'Right keybind must exist');

  // Test formatKeyLabel translations
  assert.equal(formatKeyLabel('KeyW'), 'W');
  assert.equal(formatKeyLabel('KeyE'), 'E');
  assert.equal(formatKeyLabel('Space'), 'ESPAÇO');
  assert.equal(formatKeyLabel('ArrowUp'), 'SETA CIMA');
  assert.equal(formatKeyLabel('ArrowDown'), 'SETA BAIXO');
  assert.equal(formatKeyLabel('ArrowLeft'), 'SETA ESQ');
  assert.equal(formatKeyLabel('ArrowRight'), 'SETA DIR');
  assert.equal(formatKeyLabel('Tab'), 'TAB');
  assert.equal(formatKeyLabel('Digit1'), '1');
});

test('wise grandpa frog shaman with staff and eyeless crystallized larva maggot matrices', () => {
  // Shaman sprite dimensions (20 wide x 16 tall)
  assert.equal(SHAMAN_MAT.length, 16);
  assert.equal(SHAMAN_MAT[0].length, 20);
  assert.equal(SHAMAN_MAT2.length, 16);
  assert.equal(SHAMAN_MAT2[0].length, 20);

  // Shaman matrix includes staff and crystal orb ('7'=cyan orb, '8'=wooden staff, '1'=white beard/eyebrows)
  const shamanJoined = SHAMAN_MAT.join('');
  assert.ok(shamanJoined.includes('7'), 'Shaman must have cyan crystal orb on staff');
  assert.ok(shamanJoined.includes('8'), 'Shaman must have wooden staff');
  assert.ok(shamanJoined.includes('1'), 'Shaman must have wise grandpa white beard');

  // Eyeless fly maggot larva (segmented crystal body '2', ridges '3', grooves '1', highlights '4', no pupil '0' or tongue)
  assert.equal(LARVA_MAT.length, 10);
  assert.equal(LARVA_MAT[0].length, 12);
  const larvaJoined = LARVA_MAT.join('');
  assert.ok(larvaJoined.includes('1'), 'Larva has segment boundary grooves');
  assert.ok(larvaJoined.includes('2'), 'Larva has crystal body');
  assert.ok(larvaJoined.includes('3'), 'Larva has icy facet ridges');
  assert.ok(larvaJoined.includes('4'), 'Larva has crystal glint highlights');
});



