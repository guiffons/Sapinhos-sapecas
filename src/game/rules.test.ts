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

import {
  getFrogMouthOrigin,
  initCastlevaniaWhipChain,
  updateCastlevaniaWhipChain,
} from './physics.ts';
import {
  CH,
  PACT_LIST,
  SHAMAN_UPG,
  FLORA_MATS,
  FLORA_MATS2,
} from './constants.ts';

test('getFrogMouthOrigin aligns projectile spawn with the frog mouth and stays below eyes when aiming up', () => {
  const originRight = getFrogMouthOrigin(240, 160, 0, 0, 1, 0);
  const originLeft = getFrogMouthOrigin(240, 160, 0, Math.PI, 1, 0);
  const originUp = getFrogMouthOrigin(240, 160, 0, -Math.PI / 2, 1, 0);
  assert.ok(originRight.x > 240, 'Facing right shifts mouth origin to the right of center');
  assert.ok(originLeft.x < 240, 'Facing left shifts mouth origin to the left of center');
  assert.ok(
    originUp.y > 161.5,
    `Aiming straight up must keep tongue origin at the mouth line (>161.5), not up in the eyes; got ${originUp.y}`
  );

  const originAir = getFrogMouthOrigin(240, 160, 15, 0, 1, 0);
  assert.ok(
    Math.abs(originRight.y - originAir.y - 15) < 0.01,
    'Jumping in Z shifts mouth origin upward by exact Z elevation'
  );
});

test('Castlevania-style always-out tongue whip chain moves with deliberate inertia and stays anchored to mouth', () => {
  const chain = initCastlevaniaWhipChain(200, 150, 0, 42, 8);
  assert.equal(chain.length, 8);
  assert.equal(chain[0].x, 200);
  assert.equal(Math.round(chain[7].x), 242);

  // Swing aim 90 degrees downward; tip should lag smoothly behind rather than teleporting
  updateCastlevaniaWhipChain(chain, 205, 152, Math.PI / 2, 42, 0.016, true);
  assert.equal(chain[0].x, 205, 'Base segment stays anchored to frog mouth X');
  assert.equal(chain[0].y, 152, 'Base segment stays anchored to frog mouth Y');
  assert.ok(chain[7].y > 150 && chain[7].y < 192, 'Whip tip swings with deliberate inertia');

  // Verify Dart (character 3) has slower balanced whip rate
  assert.ok(CH[3].rt >= 0.4, `Expected Dart rate >= 0.40s for slower whip balance, got ${CH[3].rt}`);
  assert.ok(WP[3].rt >= 0.4, `Expected Lingua-Chicote rate >= 0.40s, got ${WP[3].rt}`);
});

test('longer dungeon path to boss, multi-wave rooms, swamp idle flora frames, and slower progression economy', () => {
  const grid = generateDungeonGrid(0, 12345);
  let activeRooms = 0;
  let bossDist = 0;
  let multiWaveCount = 0;

  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const c = grid[y][x];
      if (c.active) {
        activeRooms++;
        if (c.type === 'boss') bossDist = c.dist;
        if (c.wavesTotal >= 2) multiWaveCount++;
      }
    }
  }

  assert.ok(activeRooms >= 11, `Expected at least 11 rooms per floor, got ${activeRooms}`);
  assert.ok(bossDist >= 3, `Expected Boss BFS distance >= 3 from Start, got ${bossDist}`);
  assert.ok(multiWaveCount >= 1, 'Expected multi-wave combat rooms on the path to Boss');

  // Swamp idle flora has 2 animation frames for blinking/glowing
  assert.equal(FLORA_MATS.length, FLORA_MATS2.length);
  assert.notDeepEqual(FLORA_MATS[0], FLORA_MATS2[0]);

  // Slower permanent larva progression costs and Swamp Pacts
  assert.ok(SHAMAN_UPG[0].costs[0] >= 5, 'First Shaman upgrade should cost at least 5 larvae');
  assert.equal(PACT_LIST.length, 4, 'Swamp Shrines should offer 4 pacts');
});

import {
  updateAcidRainDrops,
  applyWeatherProjectileDrift,
} from './physics.ts';
import type { RainDrop } from './physics.ts';

test('acid rain and swamp storm particles with wind drift and projectile physics alteration', () => {
  const drops: RainDrop[] = [
    { x: 100, y: 50, len: 10, spd: 300, col: '#69f0ae', alpha: 0.5 },
    { x: 200, y: 310, len: 12, spd: 320, col: '#76ff03', alpha: 0.6 },
  ];

  // Update drops with +20 windX over dt=0.1s
  const splashes = updateAcidRainDrops(drops, 20, 0.1, 480, 320);
  assert.ok(drops[0].x > 100, 'Raindrop drifted horizontally with swamp wind');
  assert.ok(drops[0].y > 50, 'Raindrop moved downward with speed');

  // Second drop was near floor (310 + 32 = 342 >= 320 - 16), should have generated a splash or recycled to top
  assert.ok(drops[1].y < 50, 'Drop that reached swamp ground recycled to the top');

  // Test projectile drift in swamp storm wind
  const bullet = { vx: 200, vy: 0, tng: 0 };
  applyWeatherProjectileDrift(bullet, 25, 5, 0.1, 1.0);
  assert.ok(bullet.vx > 200, 'Bullet velocity shifted horizontally by swamp storm wind');
  assert.ok(bullet.vy > 0, 'Bullet velocity shifted slightly vertically by wind drift');

  // Whip tongue should not be blown away by wind drift
  const tongueBullet = { vx: 180, vy: 0, tng: 1 };
  applyWeatherProjectileDrift(tongueBullet, 25, 5, 0.1, 1.0);
  assert.equal(tongueBullet.vx, 180, 'Tongue whip remains anchored and immune to wind drift');
});

import { CAULDRON_F1, CAULDRON_F2, CAULDRON_F3, MUTATION_DETAILS, SWAMP_RUNES, IT } from './constants.ts';
import { computeTargetTongueReach } from './physics.ts';

test('Dart whip tongue stays small when idle (4.5px) and extends to a compact whip (~38px) when attacking', () => {
  const idleTarget = computeTargetTongueReach(4.5, false, 1.0, 1.0, 1.0);
  const activeTarget = computeTargetTongueReach(4.5, true, 1.0, 1.0, 1.0);

  assert.equal(idleTarget, 4.5, 'Tongue should stay tiny (4.5px) when not clicking');
  assert.ok(
    activeTarget >= 34 && activeTarget <= 46,
    `Tongue should extend proportionally (~38px) when attacking, got ${activeTarget}`
  );

  const mouthX = 100;
  const mouthY = 100;
  const chain = initCastlevaniaWhipChain(mouthX, mouthY, 0, idleTarget, 9);
  assert.equal(chain.length, 9, 'Whip should have 9 segments');
  assert.equal(chain[0].x, mouthX);
  assert.equal(Math.round(chain[8].x), Math.round(mouthX + idleTarget));

  // When whipped actively forward along ang = 0, update over frames
  for (let frame = 0; frame < 15; frame++) {
    updateCastlevaniaWhipChain(chain, mouthX, mouthY, 0, activeTarget, 0.016, true);
  }
  const tip = chain[chain.length - 1];
  assert.ok(
    tip.x > mouthX + 30 && tip.x <= mouthX + 48,
    `Whip tip extended proportionally (~38px) from mouth: ${tip.x}`
  );
  assert.ok(Math.abs(tip.y - mouthY) < 10, 'Whip aimed forward along aim line');

  // When released, retracts back smoothly toward small idle length
  for (let frame = 0; frame < 35; frame++) {
    updateCastlevaniaWhipChain(chain, mouthX, mouthY, 0, idleTarget, 0.016, false);
  }
  assert.ok(chain[chain.length - 1].x < mouthX + 12, `Whip retracted back near mouth: ${chain[chain.length - 1].x}`);

  // Verify Cauldron animation frames exist and have 16 lines
  assert.equal(CAULDRON_F1.length, 16);
  assert.equal(CAULDRON_F2.length, 16);
  assert.equal(CAULDRON_F3.length, 16);
});

test('MUTATION_DETAILS and SWAMP_RUNES provide complete bonus and penalty stats for UI tooltips', () => {
  assert.equal(Object.keys(MUTATION_DETAILS).length, IT.length, 'Every mutation in IT must have a corresponding MUTATION_DETAILS entry');
  for (let i = 0; i < IT.length; i++) {
    assert.ok(MUTATION_DETAILS[i].bonuses.length >= 1, `Mutation ${i} must have detailed bonuses`);
    assert.ok(MUTATION_DETAILS[i].penalties.length >= 1, `Mutation ${i} must have detailed penalties`);
  }

  assert.equal(SWAMP_RUNES.length, 6, 'There should be 6 Swamp Runes');
  for (const rune of SWAMP_RUNES) {
    assert.ok(rune.id && rune.nm && rune.boon && rune.penalty, `Rune ${rune.id} must have complete metadata`);
  }
});





