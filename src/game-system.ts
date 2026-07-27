import {
  createSystem,
  Mesh,
  Group,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  Vector3,
  AdditiveBlending,
} from '@iwsdk/core';
import {
  state, initCubes, getCube, allCubesComplete, isValidCube, cubePos,
  PYRAMID_ROWS, CUBE_SIZE, PILLAR_HEIGHT, HOP_DURATION, COLOR_SCHEMES,
  emitAudio, emitEffect, saveStats, saveAchievements, saveHighScore,
} from './game-state';
import type { EnemyData, ColorScheme, PowerUp, PowerUpType } from './game-state';

const COMBO_WINDOW = 2.0; // seconds to chain combos
const POWERUP_DURATION = 8.0; // seconds power-ups last
const POWERUP_SPAWN_BASE = 12.0; // base seconds between power-up spawns
const ROUND_ANNOUNCE_DURATION = 1.5; // seconds for round announcement

function cubeColor(colorState: number, targetState: number, scheme: ColorScheme): number {
  const cs = COLOR_SCHEMES[scheme];
  if (colorState >= targetState) return cs.target;
  if (colorState === 0) return cs.start;
  if (targetState >= 3 && colorState === 1) return cs.mid;
  if (targetState >= 3 && colorState === 2) return cs.mid2;
  return cs.mid;
}

function powerUpColor(type: PowerUpType): number {
  switch (type) {
    case 'shield': return 0x4488ff;
    case 'scoreboost': return 0xffcc00;
    case 'freeze': return 0x88ffff;
  }
}

export class GameSystem extends createSystem({}) {
  private cubeGroup!: Group;
  private cubeMeshes: Mesh[] = [];
  private playerMesh!: Mesh;
  private enemyMeshes: Map<number, Mesh> = new Map();
  private discMeshes: Mesh[] = [];
  private enemyIdCounter = 0;
  private deathsThisRound = 0;
  private roundsWithoutDeath = 0;

  // Power-up visuals
  private powerUpGroup!: Group;
  private powerUpMeshes: Map<string, Mesh> = new Map();

  // Shield visual on player
  private shieldMesh!: Mesh;

  init() {
    this.cubeGroup = new Group();
    this.scene.add(this.cubeGroup);

    this.powerUpGroup = new Group();
    this.scene.add(this.powerUpGroup);

    this.buildPyramid();
    this.createPlayer();
    this.createDiscs();
    this.createShieldMesh();
    state.initialized = true;
  }

  private buildPyramid() {
    for (const m of this.cubeMeshes) this.cubeGroup.remove(m);
    this.cubeMeshes = [];
    initCubes();
    const cs = COLOR_SCHEMES[state.colorScheme];
    for (const cube of state.cubes) {
      const pos = cubePos(cube.row, cube.col);
      const geo = new BoxGeometry(CUBE_SIZE, PILLAR_HEIGHT, CUBE_SIZE);
      const mat = new MeshStandardMaterial({
        color: new Color(cs.start),
        emissive: new Color(cs.start),
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y, pos.z);
      this.cubeGroup.add(mesh);
      this.cubeMeshes.push(mesh);
    }
  }

  private createPlayer() {
    const geo = new SphereGeometry(CUBE_SIZE * 0.35, 16, 16);
    const mat = new MeshStandardMaterial({
      color: new Color(0xffffff),
      emissive: new Color(0xffffff),
      emissiveIntensity: 0.6,
    });
    this.playerMesh = new Mesh(geo, mat);
    const pos = cubePos(0, 0);
    this.playerMesh.position.set(pos.x, pos.y + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.35, pos.z);
    this.playerMesh.visible = false;
    this.scene.add(this.playerMesh);
  }

  private createShieldMesh() {
    const geo = new SphereGeometry(CUBE_SIZE * 0.5, 16, 16);
    const mat = new MeshBasicMaterial({
      color: new Color(0x4488ff),
      transparent: true,
      opacity: 0.25,
      blending: AdditiveBlending,
    });
    this.shieldMesh = new Mesh(geo, mat);
    this.shieldMesh.visible = false;
    this.scene.add(this.shieldMesh);
  }

  private createDiscs() {
    for (let i = 0; i < 2; i++) {
      const geo = new BoxGeometry(0.4, 0.05, 0.4);
      const mat = new MeshStandardMaterial({
        color: new Color(0xff8800),
        emissive: new Color(0xff8800),
        emissiveIntensity: 0.8,
      });
      const mesh = new Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.discMeshes.push(mesh);
    }
  }

  private positionDiscs() {
    const leftPos = cubePos(3, -1);
    this.discMeshes[0].position.set(leftPos.x - 0.5, leftPos.y, leftPos.z);
    this.discMeshes[0].visible = state.discLeft && state.screen === 'playing';
    const rightPos = cubePos(3, 4);
    this.discMeshes[1].position.set(rightPos.x + 0.5, rightPos.y, rightPos.z);
    this.discMeshes[1].visible = state.discRight && state.screen === 'playing';
  }

  startGame() {
    state.round = 1;
    state.score = 0;
    state.lives = state.difficulty === 'easy' ? 5 : 3;
    state.playerRow = 0;
    state.playerCol = 0;
    state.hopping = false;
    state.roundComplete = false;
    state.gameOver = false;
    state.deathAnimating = false;
    state.enemies = [];
    state.enemySpawnTimer = 0;
    state.timer = 120;
    state.hopsRemaining = state.mode === 'challenge' ? 50 : 999;
    state.totalHops = 0;
    this.deathsThisRound = 0;
    state.discLeft = true;
    state.discRight = true;
    state.discUsed = false;
    state.stats.gamesPlayed++;
    saveStats(state.stats);
    // Reset power-up and combo state
    state.combo = 0;
    state.maxCombo = 0;
    state.comboTimer = 0;
    state.powerUps = [];
    state.activePowerUp = null;
    state.powerUpSpawnTimer = POWERUP_SPAWN_BASE * 0.5; // first spawn sooner
    state.shieldActive = false;
    state.freezeActive = false;
    state.scoreBoostActive = false;
    state.roundAnnounceTimer = ROUND_ANNOUNCE_DURATION;
    state.roundStartTime = performance.now() / 1000;
    state.roundElapsed = 0;
    state.powerUpsCollectedTypes = new Set();
    state.uggWrongwaysSurvived = 0;
    state.cameraShakeIntensity = 0;
    state.cameraShakeTimer = 0;
    state.cubePulses = [];
    state.bonusRound = false;
    state.bonusTimer = 0;
    state.bonusCubesChanged = 0;
    state.deathFallY = 0;
    state.deathFallSpin = 0;
    state.roundWaveTimer = 0;
    state.roundWaveIndex = 0;
    state.roundWaveActive = false;
    state.hopTrailPoints = [];
    this.clearPowerUpMeshes();
    this.buildPyramid();
    this.updateCubeColors();
    this.clearEnemyMeshes();
    state.screen = 'playing';
  }

  private startRound() {
    state.playerRow = 0;
    state.playerCol = 0;
    state.hopping = false;
    state.roundComplete = false;
    state.enemies = [];
    state.enemySpawnTimer = 0;
    state.discLeft = true;
    state.discRight = true;
    this.deathsThisRound = 0;
    // Reset power-ups for new round but keep active power-up running
    state.powerUps = [];
    state.powerUpSpawnTimer = POWERUP_SPAWN_BASE * 0.5;
    state.roundAnnounceTimer = ROUND_ANNOUNCE_DURATION;
    state.roundStartTime = performance.now() / 1000;
    state.roundElapsed = 0;
    state.cubePulses = [];
    // Bonus round every 5th round
    state.bonusRound = (state.round % 5 === 0);
    state.bonusTimer = state.bonusRound ? 20 : 0; // 20 second bonus round
    state.bonusCubesChanged = 0;
    state.deathFallY = 0;
    state.deathFallSpin = 0;
    state.roundWaveActive = false;
    state.hopTrailPoints = [];
    if (state.bonusRound) {
      emitAudio('bonus_start');
    }
    this.clearPowerUpMeshes();
    this.buildPyramid();
    this.updateCubeColors();
    this.clearEnemyMeshes();
  }

  private clearEnemyMeshes() {
    for (const [, mesh] of this.enemyMeshes) {
      this.scene.remove(mesh);
    }
    this.enemyMeshes.clear();
  }

  private clearPowerUpMeshes() {
    for (const [, mesh] of this.powerUpMeshes) {
      this.powerUpGroup.remove(mesh);
    }
    this.powerUpMeshes.clear();
  }

  updateCubeColors() {
    for (let i = 0; i < state.cubes.length; i++) {
      const cube = state.cubes[i];
      const mesh = this.cubeMeshes[i];
      if (!mesh) continue;
      const col = cubeColor(cube.colorState, cube.targetState, state.colorScheme);
      const mat = mesh.material as MeshStandardMaterial;
      mat.color.setHex(col);
      mat.emissive.setHex(col);
    }
  }

  // === Power-Up System ===

  private spawnPowerUp() {
    if (state.powerUps.length >= 2) return; // Max 2 power-ups on field
    // Pick a random unoccupied cube that isn't the player's cube
    const candidates = state.cubes.filter(c =>
      !(c.row === state.playerRow && c.col === state.playerCol) &&
      !state.powerUps.some(p => p.row === c.row && p.col === c.col)
    );
    if (candidates.length === 0) return;

    const cube = candidates[Math.floor(Math.random() * candidates.length)];
    const types: PowerUpType[] = ['shield', 'scoreboost', 'freeze'];
    const type = types[Math.floor(Math.random() * types.length)];

    const powerUp: PowerUp = {
      type,
      row: cube.row,
      col: cube.col,
      active: true,
      pulsePhase: 0,
    };
    state.powerUps.push(powerUp);

    // Create visual mesh
    const key = `${cube.row}-${cube.col}`;
    const color = powerUpColor(type);
    const pos = cubePos(cube.row, cube.col);

    let geo;
    if (type === 'shield') {
      geo = new SphereGeometry(0.12, 8, 8);
    } else if (type === 'scoreboost') {
      // Diamond shape using cylinder with 4 segments
      geo = new CylinderGeometry(0, 0.12, 0.2, 4);
    } else {
      // Freeze: small cube
      geo = new BoxGeometry(0.15, 0.15, 0.15);
    }

    const mat = new MeshBasicMaterial({
      color: new Color(color),
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y + PILLAR_HEIGHT * 0.5 + 0.3, pos.z);
    this.powerUpGroup.add(mesh);
    this.powerUpMeshes.set(key, mesh);

    emitAudio('powerup_spawn');
  }

  private collectPowerUp(row: number, col: number) {
    const puIdx = state.powerUps.findIndex(p => p.row === row && p.col === col && p.active);
    if (puIdx === -1) return;

    const pu = state.powerUps[puIdx];
    pu.active = false;

    // Remove visual
    const key = `${row}-${col}`;
    const mesh = this.powerUpMeshes.get(key);
    if (mesh) {
      this.powerUpGroup.remove(mesh);
      this.powerUpMeshes.delete(key);
    }

    // Activate effect
    state.activePowerUp = { type: pu.type, timeLeft: POWERUP_DURATION };
    state.powerUpsCollectedTypes.add(pu.type);
    if (state.powerUpsCollectedTypes.size >= 3) {
      this.checkAchievement('all_powerups');
    }
    switch (pu.type) {
      case 'shield':
        state.shieldActive = true;
        break;
      case 'scoreboost':
        state.scoreBoostActive = true;
        break;
      case 'freeze':
        state.freezeActive = true;
        // Check if any Coily is on field
        if (state.enemies.some(e => e.type === 'coily' && e.active)) {
          this.checkAchievement('freeze_coily');
        }
        break;
    }

    // Remove from array
    state.powerUps.splice(puIdx, 1);

    const pos = cubePos(row, col);
    emitAudio('powerup_collect');
    emitEffect({ type: 'powerup_collect', x: pos.x, y: pos.y + 0.5, z: pos.z, powerUpType: pu.type });
  }

  private updatePowerUps(delta: number, time: number) {
    // Spawn timer
    state.powerUpSpawnTimer -= delta;
    if (state.powerUpSpawnTimer <= 0) {
      state.powerUpSpawnTimer = POWERUP_SPAWN_BASE - Math.min(state.round * 0.5, 5);
      this.spawnPowerUp();
    }

    // Animate power-up meshes (pulsing glow + bobbing)
    for (const pu of state.powerUps) {
      if (!pu.active) continue;
      pu.pulsePhase += delta * 3;
      const key = `${pu.row}-${pu.col}`;
      const mesh = this.powerUpMeshes.get(key);
      if (mesh) {
        const pos = cubePos(pu.row, pu.col);
        const bob = Math.sin(pu.pulsePhase) * 0.08;
        mesh.position.set(pos.x, pos.y + PILLAR_HEIGHT * 0.5 + 0.3 + bob, pos.z);
        mesh.rotation.y = time * 2;
        const mat = mesh.material as MeshBasicMaterial;
        mat.opacity = 0.6 + Math.sin(pu.pulsePhase * 1.5) * 0.3;
      }
    }

    // Active power-up duration
    if (state.activePowerUp) {
      state.activePowerUp.timeLeft -= delta;
      if (state.activePowerUp.timeLeft <= 0) {
        // Deactivate
        switch (state.activePowerUp.type) {
          case 'shield':
            state.shieldActive = false;
            break;
          case 'scoreboost':
            state.scoreBoostActive = false;
            break;
          case 'freeze':
            state.freezeActive = false;
            break;
        }
        state.activePowerUp = null;
      }
    }

    // Update shield visual
    this.shieldMesh.visible = state.shieldActive && state.screen === 'playing' && !state.deathAnimating;
    if (this.shieldMesh.visible) {
      this.shieldMesh.position.copy(this.playerMesh.position);
      const mat = this.shieldMesh.material as MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(time * 4) * 0.1;
    }
  }

  // === Combo System ===

  private incrementCombo() {
    state.combo++;
    if (state.combo > state.maxCombo) {
      state.maxCombo = state.combo;
    }
    state.comboTimer = COMBO_WINDOW;
    if (state.combo >= 2) {
      emitAudio('combo');
      const pos = cubePos(state.playerRow, state.playerCol);
      emitEffect({ type: 'combo', x: pos.x, y: pos.y + 1, z: pos.z, combo: state.combo });
    }
    if (state.combo >= 5) this.checkAchievement('combo_5');
    if (state.combo >= 10) this.checkAchievement('combo_10');
  }

  private resetCombo() {
    state.combo = 0;
    state.comboTimer = 0;
  }

  private updateCombo(delta: number) {
    if (state.comboTimer > 0) {
      state.comboTimer -= delta;
      if (state.comboTimer <= 0) {
        this.resetCombo();
      }
    }
  }

  private getScoreMultiplier(): number {
    let mult = 1;
    if (state.combo >= 2) mult += (state.combo - 1) * 0.25; // +0.25 per combo level
    if (state.scoreBoostActive) mult *= 2;
    return mult;
  }

  // === Round Announcement ===

  private updateRoundAnnouncement(delta: number) {
    if (state.roundAnnounceTimer > 0) {
      state.roundAnnounceTimer -= delta;
      // During announcement, don't spawn enemies
    }
  }

  // === Enemies ===

  private spawnEnemy() {
    const types: EnemyData['type'][] = state.mode === 'zen' ? [] :
      state.difficulty === 'easy' ? ['coily'] :
      state.difficulty === 'hard' ?
        (state.round >= 4 ? ['coily', 'slick', 'sam', 'coily', 'ugg', 'wrongway'] :
         ['coily', 'slick', 'sam', 'coily']) :
      (state.round >= 5 ? ['coily', 'slick', 'sam', 'ugg', 'wrongway'] :
       ['coily', 'slick', 'sam']);
    if (types.length === 0) return;
    if (state.enemies.length >= (state.difficulty === 'hard' ? 4 : 3)) return;
    const type = types[Math.floor(Math.random() * types.length)];

    let startRow: number;
    let startCol: number;

    if (type === 'ugg') {
      // Ugg enters from the left side of the pyramid
      startRow = 2 + Math.floor(Math.random() * (PYRAMID_ROWS - 2));
      startCol = 0;
    } else if (type === 'wrongway') {
      // Wrongway enters from the right side
      startRow = 2 + Math.floor(Math.random() * (PYRAMID_ROWS - 2));
      startCol = startRow;
    } else {
      startRow = 0;
      startCol = Math.floor(Math.random() * 2);
    }

    const enemy: EnemyData = {
      type,
      row: startRow,
      col: startCol,
      active: true,
      isEgg: type === 'coily',
      moveTimer: 0,
    };
    const id = this.enemyIdCounter++;
    state.enemies.push(enemy);
    const geo = new SphereGeometry(CUBE_SIZE * 0.3, 8, 8);
    const color = type === 'coily' ? 0xaa00ff :
                  type === 'slick' ? 0x00ff44 :
                  type === 'sam' ? 0x4488ff :
                  type === 'ugg' ? 0xff6600 : 0xff0066; // ugg=orange, wrongway=pink
    const mat = new MeshStandardMaterial({
      color: new Color(color),
      emissive: new Color(color),
      emissiveIntensity: 0.5,
    });
    const mesh = new Mesh(geo, mat);
    const pos = cubePos(startRow, startCol);
    mesh.position.set(pos.x, pos.y + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.3, pos.z);
    this.scene.add(mesh);
    this.enemyMeshes.set(id, mesh);
    emitAudio('enemy_spawn');
  }

  private moveEnemies(delta: number) {
    // If freeze is active, don't move enemies
    if (state.freezeActive) return;

    const speed = state.difficulty === 'easy' ? 2.5 : state.difficulty === 'hard' ? 1.2 : 1.8;
    const keysToRemove: number[] = [];
    let enemyIdx = 0;
    const meshKeys = Array.from(this.enemyMeshes.keys());

    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      if (!enemy.active) continue;
      enemy.moveTimer += delta;
      if (enemy.moveTimer < speed) { enemyIdx++; continue; }
      enemy.moveTimer = 0;

      if (enemy.type === 'coily') {
        if (enemy.isEgg) {
          const dc = Math.random() > 0.5 ? 1 : 0;
          enemy.row++;
          enemy.col += dc;
          if (enemy.row >= PYRAMID_ROWS) {
            enemy.active = false;
            const meshKey = meshKeys[enemyIdx];
            if (meshKey !== undefined) keysToRemove.push(meshKey);
          } else if (enemy.row >= 2) {
            enemy.isEgg = false;
          }
        } else {
          const dr = state.playerRow > enemy.row ? 1 : state.playerRow < enemy.row ? -1 : 0;
          const dc = state.playerCol > enemy.col ? 1 : state.playerCol < enemy.col ? -1 : 0;
          const newRow = enemy.row + dr;
          const newCol = enemy.col + dc;
          if (isValidCube(newRow, newCol)) {
            enemy.row = newRow;
            enemy.col = newCol;
          } else {
            if (dr !== 0 && isValidCube(enemy.row + dr, enemy.col)) {
              enemy.row += dr;
            }
          }
        }
      } else if (enemy.type === 'ugg') {
        // Ugg moves rightward along the same row, then up
        if (enemy.col < enemy.row) {
          enemy.col++;
          emitAudio('ugg_move');
        } else {
          // Move up one row
          enemy.row--;
          if (enemy.row < 0 || !isValidCube(enemy.row, Math.min(enemy.col, enemy.row))) {
            enemy.active = false;
            state.uggWrongwaysSurvived++;
            const meshKey = meshKeys[enemyIdx];
            if (meshKey !== undefined) keysToRemove.push(meshKey);
          } else {
            enemy.col = Math.min(enemy.col, enemy.row);
          }
        }
      } else if (enemy.type === 'wrongway') {
        // Wrongway moves leftward along the same row, then up
        if (enemy.col > 0) {
          enemy.col--;
          emitAudio('ugg_move');
        } else {
          // Move up one row
          enemy.row--;
          if (enemy.row < 0 || !isValidCube(enemy.row, 0)) {
            enemy.active = false;
            state.uggWrongwaysSurvived++;
            const meshKey = meshKeys[enemyIdx];
            if (meshKey !== undefined) keysToRemove.push(meshKey);
          }
        }
      } else {
        const dc = Math.random() > 0.5 ? 1 : 0;
        enemy.row++;
        enemy.col += dc;
        if (!isValidCube(enemy.row, enemy.col)) {
          enemy.active = false;
          const meshKey = meshKeys[enemyIdx];
          if (meshKey !== undefined) keysToRemove.push(meshKey);
        } else {
          const cube = getCube(enemy.row, enemy.col);
          if (cube && cube.colorState > 0) {
            cube.colorState = 0;
          }
        }
      }

      if (enemy.active) {
        const meshKey = meshKeys[enemyIdx];
        const mesh = meshKey !== undefined ? this.enemyMeshes.get(meshKey) : undefined;
        if (mesh) {
          const pos = cubePos(enemy.row, enemy.col);
          mesh.position.set(pos.x, pos.y + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.3, pos.z);
        }
      }
      enemyIdx++;
    }

    for (const key of keysToRemove) {
      const mesh = this.enemyMeshes.get(key);
      if (mesh) this.scene.remove(mesh);
      this.enemyMeshes.delete(key);
    }
    state.enemies = state.enemies.filter(e => e.active);
  }

  private checkCollisions() {
    for (const enemy of state.enemies) {
      if (!enemy.active) continue;
      if (enemy.row === state.playerRow && enemy.col === state.playerCol) {
        if (state.shieldActive) {
          // Shield absorbs the hit
          state.shieldActive = false;
          state.activePowerUp = null;
          // Destroy the enemy
          enemy.active = false;
          state.stats.enemiesDefeated++;
          const pos = cubePos(enemy.row, enemy.col);
          emitAudio('enemy_die');
          emitEffect({ type: 'enemy_die', x: pos.x, y: pos.y + 0.5, z: pos.z });
          return;
        }
        this.playerDeath();
        return;
      }
    }
    if (!isValidCube(state.playerRow, state.playerCol)) {
      this.playerDeath();
    }
  }

  private playerDeath() {
    if (state.deathAnimating || state.gameOver) return;
    state.lives--;
    state.deathAnimating = true;
    state.deathTimer = 1.2; // slightly longer for fall animation
    this.deathsThisRound++;
    this.resetCombo();
    // Camera shake
    state.cameraShakeIntensity = 0.15;
    state.cameraShakeTimer = 0.4;
    // Death fall animation state
    state.deathFallY = 0;
    state.deathFallSpin = 0;
    const pos = cubePos(state.playerRow, state.playerCol);
    emitAudio('death');
    emitEffect({ type: 'death', x: pos.x, y: pos.y + 0.5, z: pos.z });
    if (state.lives <= 0) {
      state.gameOver = true;
    }
  }

  private respawnPlayer() {
    state.deathAnimating = false;
    if (state.gameOver) {
      if (state.score > state.stats.highScore) {
        state.stats.highScore = state.score;
        saveStats(state.stats);
      }
      // Save to top-5 leaderboard
      saveHighScore({
        score: state.score,
        round: state.round - 1,
        mode: state.mode,
        date: new Date().toISOString().slice(0, 10),
      });
      state.screen = 'results';
      return;
    }
    state.playerRow = 0;
    state.playerCol = 0;
    state.hopping = false;
    state.enemies = [];
    this.clearEnemyMeshes();
    state.enemySpawnTimer = 0;
    // Reset player opacity
    (this.playerMesh.material as MeshStandardMaterial).opacity = 1;
  }

  tryHop(dr: number, dc: number) {
    if (state.hopping || state.deathAnimating || state.roundComplete || state.screen !== 'playing') return;
    // Block input during round announcement
    if (state.roundAnnounceTimer > 0) return;

    const newRow = state.playerRow + dr;
    const newCol = state.playerCol + dc;

    if (!isValidCube(newRow, newCol)) {
      if (state.discLeft && newCol < 0 && newRow >= 2 && newRow <= 4) {
        state.discLeft = false;
        state.discUsed = true;
        this.useDisc();
        return;
      }
      if (state.discRight && newCol > newRow && newRow >= 2 && newRow <= 4) {
        state.discRight = false;
        state.discUsed = true;
        this.useDisc();
        return;
      }
      state.hopFromRow = state.playerRow;
      state.hopFromCol = state.playerCol;
      state.hopToRow = newRow;
      state.hopToCol = newCol;
      state.hopping = true;
      state.hopProgress = 0;
      return;
    }

    state.hopFromRow = state.playerRow;
    state.hopFromCol = state.playerCol;
    state.hopToRow = newRow;
    state.hopToCol = newCol;
    state.hopping = true;
    state.hopProgress = 0;
    if (state.mode === 'challenge') state.hopsRemaining--;
    state.totalHops++;
    state.stats.cubesHopped++;
    emitAudio('hop');
    this.checkAchievement('first_hop');
    if (state.stats.cubesHopped >= 100) this.checkAchievement('cubes_100');
  }

  private useDisc() {
    state.playerRow = 0;
    state.playerCol = 0;
    state.hopping = false;
    for (const enemy of state.enemies) {
      if (enemy.type === 'coily' && enemy.active) {
        enemy.active = false;
        const points = Math.round(500 * this.getScoreMultiplier());
        state.score += points;
        state.stats.enemiesDefeated++;
        emitAudio('enemy_die');
        this.checkAchievement('defeat_coily');
      }
    }
    this.checkAchievement('disc_use');
    emitAudio('disc_use');
  }

  private completeHop() {
    state.playerRow = state.hopToRow;
    state.playerCol = state.hopToCol;
    state.hopping = false;

    if (!isValidCube(state.playerRow, state.playerCol)) {
      this.playerDeath();
      return;
    }

    // Check for power-up collection
    this.collectPowerUp(state.playerRow, state.playerCol);

    const cube = getCube(state.playerRow, state.playerCol);
    if (cube && cube.colorState < cube.targetState) {
      cube.colorState++;
      const basePoints = state.bonusRound ? 50 : 25; // double points in bonus rounds
      const mult = this.getScoreMultiplier();
      state.score += Math.round(basePoints * mult);
      if (state.bonusRound) state.bonusCubesChanged++;
      emitAudio('color_change');
      this.updateCubeColors();
      // Increment combo on cube color change
      this.incrementCombo();
      // Trigger cube pulse animation
      const cubeIdx = state.cubes.indexOf(cube);
      if (cubeIdx >= 0) {
        state.cubePulses.push({
          index: cubeIdx,
          timer: 0.3,
          color: COLOR_SCHEMES[state.colorScheme].target,
        });
      }
      // Multi-step achievement
      if (cube.targetState >= 2 && cube.colorState >= cube.targetState) {
        this.checkAchievement('multihop');
      }
    }

    const pos = cubePos(state.playerRow, state.playerCol);
    emitEffect({ type: 'hop_land', x: pos.x, y: pos.y + PILLAR_HEIGHT * 0.5, z: pos.z });

    this.checkCollisions();

    if (allCubesComplete()) {
      this.completeRound();
    }
  }

  private completeRound() {
    state.roundComplete = true;
    const roundBonus = Math.round(1000 * this.getScoreMultiplier());
    state.score += roundBonus;

    // Bonus round completion bonus
    if (state.bonusRound) {
      const bonusPoints = state.bonusCubesChanged * 100;
      state.score += bonusPoints;
      this.checkAchievement('bonus_clear');
      if (state.bonusCubesChanged >= state.cubes.length) {
        this.checkAchievement('bonus_perfect');
      }
    }

    // Trigger round complete wave animation
    state.roundWaveActive = true;
    state.roundWaveTimer = 0;
    state.roundWaveIndex = 0;

    state.round++;
    state.stats.roundsCleared++;
    saveStats(state.stats);
    emitAudio('round_complete');
    emitEffect({ type: 'round_complete' });

    if (this.deathsThisRound === 0) this.checkAchievement('perfect');
    this.checkAchievement('round_1');
    if (state.stats.roundsCleared >= 5) this.checkAchievement('round_5');
    if (state.stats.roundsCleared >= 10) this.checkAchievement('round_10');
    if (state.stats.roundsCleared >= 15) this.checkAchievement('round_15');
    if (state.stats.roundsCleared >= 20) this.checkAchievement('round_20');
    if (state.mode === 'speed') this.checkAchievement('speed_clear');
    if (state.mode === 'challenge') this.checkAchievement('challenge_clear');

    // Speedrun: clear a round in under 15 seconds
    if (state.roundElapsed < 15) this.checkAchievement('speedrun');

    // No-disc: clear round 5+ without using discs
    if (state.round - 1 >= 5 && !state.discUsed && state.discLeft && state.discRight) {
      this.checkAchievement('no_disc');
    }

    // Count survived Ugg/Wrongway enemies
    if (state.uggWrongwaysSurvived >= 3) {
      this.checkAchievement('survive_ugg');
    }

    // Streak achievement: 3 rounds without dying
    if (this.deathsThisRound === 0) {
      this.roundsWithoutDeath = (this.roundsWithoutDeath || 0) + 1;
      if (this.roundsWithoutDeath >= 3) this.checkAchievement('streak_3');
    } else {
      this.roundsWithoutDeath = 0;
    }

    // Score achievements
    if (state.score >= 500000) this.checkAchievement('score_500k');

    setTimeout(() => {
      if (state.screen === 'playing') {
        this.startRound();
      }
    }, 2000);
  }

  private checkAchievement(id: string) {
    const ach = state.achievements.find(a => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      saveAchievements(state.achievements);
    }
  }

  private updatePlayerMesh() {
    this.playerMesh.visible = state.screen === 'playing';
    if (state.screen !== 'playing') return;

    if (state.deathAnimating) {
      // Enhanced death fall: spin and drop
      state.deathFallY += 0.12; // accelerating fall
      state.deathFallSpin += 8;
      const pos = cubePos(state.playerRow, state.playerCol);
      this.playerMesh.position.set(
        pos.x + Math.sin(state.deathFallSpin * 0.1) * 0.3,
        pos.y + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.35 - state.deathFallY * state.deathFallY * 0.5,
        pos.z
      );
      this.playerMesh.rotation.x += 0.15;
      this.playerMesh.rotation.z += 0.1;
      const mat = this.playerMesh.material as MeshStandardMaterial;
      mat.opacity = Math.max(0, state.deathTimer / 1.2);
      return;
    }

    // Reset rotation after death
    this.playerMesh.rotation.x = 0;
    this.playerMesh.rotation.z = 0;

    if (state.hopping) {
      const t = state.hopProgress;
      const fromPos = cubePos(state.hopFromRow, state.hopFromCol);
      const toPos = cubePos(state.hopToRow, state.hopToCol);
      const x = fromPos.x + (toPos.x - fromPos.x) * t;
      const z = fromPos.z + (toPos.z - fromPos.z) * t;
      const baseY = fromPos.y + (toPos.y - fromPos.y) * t;
      const arc = Math.sin(t * Math.PI) * 0.8;
      const py = baseY + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.35 + arc;
      this.playerMesh.position.set(x, py, z);

      // Emit hop trail points
      if (t > 0.1 && t < 0.9) {
        emitEffect({ type: 'hop_trail', x, y: py - 0.1, z });
      }
    } else {
      const pos = cubePos(state.playerRow, state.playerCol);
      this.playerMesh.position.set(pos.x, pos.y + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.35, pos.z);
    }

    // Pulse player color based on active power-up
    if (state.activePowerUp) {
      const color = powerUpColor(state.activePowerUp.type);
      const mat = this.playerMesh.material as MeshStandardMaterial;
      mat.emissive.setHex(color);
      mat.emissiveIntensity = 0.8;
    } else {
      const mat = this.playerMesh.material as MeshStandardMaterial;
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 0.6;
    }
  }

  // === Frozen enemy visual ===
  private updateFrozenEnemies(time: number) {
    if (state.freezeActive) {
      for (const [, mesh] of this.enemyMeshes) {
        const mat = mesh.material as MeshStandardMaterial;
        // Tint enemies blue-ish when frozen
        mat.emissive.setHex(0x88ffff);
        mat.emissiveIntensity = 0.3 + Math.sin(time * 6) * 0.15;
      }
    } else {
      // Reset enemy colors when not frozen
      let idx = 0;
      for (const enemy of state.enemies) {
        const meshKeys = Array.from(this.enemyMeshes.keys());
        const key = meshKeys[idx];
        if (key !== undefined) {
          const mesh = this.enemyMeshes.get(key);
          if (mesh) {
            const color = enemy.type === 'coily' ? 0xaa00ff :
                          enemy.type === 'slick' ? 0x00ff44 :
                          enemy.type === 'sam' ? 0x4488ff :
                          enemy.type === 'ugg' ? 0xff6600 : 0xff0066;
            const mat = mesh.material as MeshStandardMaterial;
            mat.emissive.setHex(color);
            mat.emissiveIntensity = 0.5;
          }
        }
        idx++;
      }
    }
  }

  update(delta: number, time: number) {
    if (state.screen !== 'playing') {
      this.playerMesh.visible = false;
      this.shieldMesh.visible = false;
      for (const [, m] of this.enemyMeshes) m.visible = false;
      for (const d of this.discMeshes) d.visible = false;
      for (const [, m] of this.powerUpMeshes) m.visible = false;
      return;
    }

    this.playerMesh.visible = true;
    for (const [, m] of this.enemyMeshes) m.visible = true;
    for (const [, m] of this.powerUpMeshes) m.visible = true;

    // Round announcement pause
    this.updateRoundAnnouncement(delta);

    // Track round elapsed time
    if (!state.roundComplete && !state.deathAnimating && state.roundAnnounceTimer <= 0) {
      state.roundElapsed += delta;
    }

    // Bonus round timer countdown
    if (state.bonusRound && !state.roundComplete && !state.deathAnimating && state.roundAnnounceTimer <= 0) {
      state.bonusTimer -= delta;
      // Tick sound in last 5 seconds
      if (state.bonusTimer <= 5 && state.bonusTimer > 0 && Math.floor(state.bonusTimer + delta) !== Math.floor(state.bonusTimer)) {
        emitAudio('bonus_tick');
      }
      if (state.bonusTimer <= 0) {
        // Bonus round time up — auto-complete
        state.bonusTimer = 0;
        this.completeRound();
      }
    }

    // Round complete wave animation
    if (state.roundWaveActive) {
      state.roundWaveTimer += delta;
      const waveInterval = 0.06; // cascade speed
      const nextIdx = Math.floor(state.roundWaveTimer / waveInterval);
      while (state.roundWaveIndex < nextIdx && state.roundWaveIndex < state.cubes.length) {
        const cube = state.cubes[state.roundWaveIndex];
        const pos = cubePos(cube.row, cube.col);
        emitEffect({ type: 'round_wave', x: pos.x, y: pos.y + PILLAR_HEIGHT * 0.5, z: pos.z, index: state.roundWaveIndex });
        emitAudio('wave_pulse');
        // Trigger cube pulse
        state.cubePulses.push({
          index: state.roundWaveIndex,
          timer: 0.5,
          color: 0xffcc00,
        });
        state.roundWaveIndex++;
      }
      if (state.roundWaveIndex >= state.cubes.length) {
        state.roundWaveActive = false;
      }
    }

    // Camera shake
    if (state.cameraShakeTimer > 0) {
      state.cameraShakeTimer -= delta;
      const intensity = state.cameraShakeIntensity * (state.cameraShakeTimer / 0.4);
      const shakeX = (Math.random() - 0.5) * intensity;
      const shakeY = (Math.random() - 0.5) * intensity;
      this.world.camera.position.x += shakeX;
      this.world.camera.position.y += shakeY;
      if (state.cameraShakeTimer <= 0) {
        state.cameraShakeIntensity = 0;
      }
    }

    // Cube pulse animations
    for (let i = state.cubePulses.length - 1; i >= 0; i--) {
      const pulse = state.cubePulses[i];
      pulse.timer -= delta;
      const mesh = this.cubeMeshes[pulse.index];
      if (mesh) {
        const t = pulse.timer / 0.3;
        const scale = 1 + Math.sin((1 - t) * Math.PI) * 0.2;
        mesh.scale.set(scale, scale, scale);
        if (pulse.timer <= 0) {
          mesh.scale.set(1, 1, 1);
        }
      }
      if (pulse.timer <= 0) {
        state.cubePulses.splice(i, 1);
      }
    }

    // Handle pending input
    if (state.pendingInput && !state.hopping && !state.deathAnimating && !state.roundComplete) {
      this.tryHop(state.pendingInput.dr, state.pendingInput.dc);
      state.pendingInput = null;
    }

    // Hop animation
    if (state.hopping) {
      state.hopProgress += delta / HOP_DURATION;
      if (state.hopProgress >= 1) {
        state.hopProgress = 1;
        this.completeHop();
      }
    }

    // Death animation
    if (state.deathAnimating) {
      state.deathTimer -= delta;
      if (state.deathTimer <= 0) {
        this.respawnPlayer();
      }
    }

    // Combo timer
    this.updateCombo(delta);

    // Power-up system
    this.updatePowerUps(delta, time);

    // Enemy spawning (delayed during round announcement, skip in bonus rounds)
    if (!state.deathAnimating && !state.roundComplete && state.mode !== 'zen' && state.roundAnnounceTimer <= 0 && !state.bonusRound) {
      state.enemySpawnTimer += delta;
      const spawnInterval = state.difficulty === 'easy' ? 8 : state.difficulty === 'hard' ? 4 : 6;
      if (state.enemySpawnTimer >= spawnInterval) {
        state.enemySpawnTimer = 0;
        this.spawnEnemy();
      }
    }

    // Move enemies
    this.moveEnemies(delta);
    this.updateCubeColors();
    this.updateFrozenEnemies(time);

    // Speed mode timer
    if (state.mode === 'speed' && !state.deathAnimating && !state.roundComplete) {
      state.timer -= delta;
      if (state.timer <= 0) {
        state.timer = 0;
        state.gameOver = true;
        state.deathAnimating = true;
        state.deathTimer = 1.0;
      }
    }

    // Challenge mode hops
    if (state.mode === 'challenge' && state.hopsRemaining <= 0 && !state.roundComplete) {
      state.gameOver = true;
      state.deathAnimating = true;
      state.deathTimer = 1.0;
    }

    // Score achievements
    if (state.score >= 10000) this.checkAchievement('score_10k');
    if (state.score >= 50000) this.checkAchievement('score_50k');
    if (state.score >= 100000) this.checkAchievement('score_100k');
    if (state.score >= 250000) this.checkAchievement('score_250k');
    if (state.score >= 500000) this.checkAchievement('score_500k');
    if (state.stats.enemiesDefeated >= 10) this.checkAchievement('defeat_10');
    if (state.stats.enemiesDefeated >= 50) this.checkAchievement('defeat_50');
    if (state.stats.gamesPlayed >= 10) this.checkAchievement('play_10');
    if (state.stats.gamesPlayed >= 50) this.checkAchievement('play_50');

    if (state.mode === 'zen' && state.stats.roundsCleared >= 5) {
      this.checkAchievement('zen_5');
    }

    // Check collisions
    if (!state.hopping && !state.deathAnimating) {
      this.checkCollisions();
    }

    this.updatePlayerMesh();
    this.positionDiscs();

    for (const d of this.discMeshes) {
      if (d.visible) d.rotation.y += delta * 3;
    }
  }
}
