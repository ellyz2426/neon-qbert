import {
  createSystem,
  Mesh,
  Group,
  BoxGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  Color,
  Vector3,
} from '@iwsdk/core';
import {
  state, initCubes, getCube, allCubesComplete, isValidCube, cubePos,
  PYRAMID_ROWS, CUBE_SIZE, PILLAR_HEIGHT, HOP_DURATION, COLOR_SCHEMES,
  emitAudio, emitEffect, saveStats, saveAchievements,
} from './game-state';
import type { EnemyData, ColorScheme } from './game-state';

function cubeColor(colorState: number, targetState: number, scheme: ColorScheme): number {
  const cs = COLOR_SCHEMES[scheme];
  if (colorState >= targetState) return cs.target;
  if (colorState === 0) return cs.start;
  return cs.mid;
}

export class GameSystem extends createSystem({}) {
  private cubeGroup!: Group;
  private cubeMeshes: Mesh[] = [];
  private playerMesh!: Mesh;
  private enemyMeshes: Map<number, Mesh> = new Map();
  private discMeshes: Mesh[] = [];
  private enemyIdCounter = 0;
  private deathsThisRound = 0;

  init() {
    this.cubeGroup = new Group();
    this.scene.add(this.cubeGroup);
    this.buildPyramid();
    this.createPlayer();
    this.createDiscs();
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
    // Left disc at row 3, col -1 position (off pyramid)
    const leftPos = cubePos(3, -1);
    this.discMeshes[0].position.set(leftPos.x - 0.5, leftPos.y, leftPos.z);
    this.discMeshes[0].visible = state.discLeft && state.screen === 'playing';
    // Right disc at row 3, col 4 position
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

  private spawnEnemy() {
    const types: EnemyData['type'][] = state.mode === 'zen' ? [] :
      state.difficulty === 'easy' ? ['coily'] :
      state.difficulty === 'hard' ? ['coily', 'slick', 'sam', 'coily'] :
      ['coily', 'slick', 'sam'];
    if (types.length === 0) return;
    if (state.enemies.length >= (state.difficulty === 'hard' ? 4 : 2)) return;
    const type = types[Math.floor(Math.random() * types.length)];
    const startCol = Math.floor(Math.random() * 2);
    const enemy: EnemyData = {
      type,
      row: 0,
      col: startCol,
      active: true,
      isEgg: type === 'coily',
      moveTimer: 0,
    };
    const id = this.enemyIdCounter++;
    state.enemies.push(enemy);
    // Create mesh
    const geo = new SphereGeometry(CUBE_SIZE * 0.3, 8, 8);
    const color = type === 'coily' ? 0xaa00ff : type === 'slick' ? 0x00ff44 : 0x4488ff;
    const mat = new MeshStandardMaterial({
      color: new Color(color),
      emissive: new Color(color),
      emissiveIntensity: 0.5,
    });
    const mesh = new Mesh(geo, mat);
    const pos = cubePos(0, startCol);
    mesh.position.set(pos.x, pos.y + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.3, pos.z);
    this.scene.add(mesh);
    this.enemyMeshes.set(id, mesh);
    emitAudio('enemy_spawn');
  }

  private moveEnemies(delta: number) {
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
          // Egg falls down pyramid
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
          // Chase player
          const dr = state.playerRow > enemy.row ? 1 : state.playerRow < enemy.row ? -1 : 0;
          const dc = state.playerCol > enemy.col ? 1 : state.playerCol < enemy.col ? -1 : 0;
          const newRow = enemy.row + dr;
          const newCol = enemy.col + dc;
          if (isValidCube(newRow, newCol)) {
            enemy.row = newRow;
            enemy.col = newCol;
          } else {
            // Try just moving row
            if (dr !== 0 && isValidCube(enemy.row + dr, enemy.col)) {
              enemy.row += dr;
            }
          }
        }
      } else {
        // Slick/Sam: descend, revert cubes
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

      // Update mesh position
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
        this.playerDeath();
        return;
      }
    }
    // Check if player fell off
    if (!isValidCube(state.playerRow, state.playerCol)) {
      this.playerDeath();
    }
  }

  private playerDeath() {
    if (state.deathAnimating || state.gameOver) return;
    state.lives--;
    state.deathAnimating = true;
    state.deathTimer = 1.0;
    this.deathsThisRound++;
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
      // Update high score
      if (state.score > state.stats.highScore) {
        state.stats.highScore = state.score;
        saveStats(state.stats);
      }
      state.screen = 'results';
      return;
    }
    state.playerRow = 0;
    state.playerCol = 0;
    state.hopping = false;
    // Remove enemies on respawn
    state.enemies = [];
    this.clearEnemyMeshes();
    state.enemySpawnTimer = 0;
  }

  tryHop(dr: number, dc: number) {
    if (state.hopping || state.deathAnimating || state.roundComplete || state.screen !== 'playing') return;
    const newRow = state.playerRow + dr;
    const newCol = state.playerCol + dc;

    // Check for disc usage
    if (!isValidCube(newRow, newCol)) {
      // Check left disc
      if (state.discLeft && newCol < 0 && newRow >= 2 && newRow <= 4) {
        state.discLeft = false;
        state.discUsed = true;
        this.useDisc();
        return;
      }
      // Check right disc
      if (state.discRight && newCol > newRow && newRow >= 2 && newRow <= 4) {
        state.discRight = false;
        state.discUsed = true;
        this.useDisc();
        return;
      }
      // Fall off
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
    // Transport back to top
    state.playerRow = 0;
    state.playerCol = 0;
    state.hopping = false;
    // Coily falls off
    for (const enemy of state.enemies) {
      if (enemy.type === 'coily' && enemy.active) {
        enemy.active = false;
        state.score += 500;
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

    const cube = getCube(state.playerRow, state.playerCol);
    if (cube && cube.colorState < cube.targetState) {
      cube.colorState++;
      state.score += 25;
      emitAudio('color_change');
      this.updateCubeColors();
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
    state.score += 1000;
    state.round++;
    state.stats.roundsCleared++;
    saveStats(state.stats);
    emitAudio('round_complete');
    emitEffect({ type: 'round_complete' });

    if (this.deathsThisRound === 0) this.checkAchievement('perfect');
    this.checkAchievement('round_1');
    if (state.stats.roundsCleared >= 5) this.checkAchievement('round_5');
    if (state.stats.roundsCleared >= 10) this.checkAchievement('round_10');
    if (state.stats.roundsCleared >= 20) this.checkAchievement('round_20');
    if (state.mode === 'speed') this.checkAchievement('speed_clear');
    if (state.mode === 'challenge') this.checkAchievement('challenge_clear');

    // Brief pause then next round
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
      // Player falls/fades
      this.playerMesh.position.y -= 0.05;
      (this.playerMesh.material as MeshStandardMaterial).opacity =
        Math.max(0, state.deathTimer);
      return;
    }

    if (state.hopping) {
      const t = state.hopProgress;
      const fromPos = cubePos(state.hopFromRow, state.hopFromCol);
      const toPos = cubePos(state.hopToRow, state.hopToCol);
      const x = fromPos.x + (toPos.x - fromPos.x) * t;
      const z = fromPos.z + (toPos.z - fromPos.z) * t;
      const baseY = fromPos.y + (toPos.y - fromPos.y) * t;
      const arc = Math.sin(t * Math.PI) * 0.8;
      this.playerMesh.position.set(x, baseY + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.35 + arc, z);
    } else {
      const pos = cubePos(state.playerRow, state.playerCol);
      this.playerMesh.position.set(pos.x, pos.y + PILLAR_HEIGHT * 0.5 + CUBE_SIZE * 0.35, pos.z);
    }
  }

  update(delta: number, _time: number) {
    if (state.screen !== 'playing') {
      this.playerMesh.visible = false;
      for (const [, m] of this.enemyMeshes) m.visible = false;
      for (const d of this.discMeshes) d.visible = false;
      return;
    }

    this.playerMesh.visible = true;
    for (const [, m] of this.enemyMeshes) m.visible = true;

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

    // Enemy spawning
    if (!state.deathAnimating && !state.roundComplete && state.mode !== 'zen') {
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
    if (state.stats.enemiesDefeated >= 10) this.checkAchievement('defeat_10');
    if (state.stats.enemiesDefeated >= 50) this.checkAchievement('defeat_50');
    if (state.stats.gamesPlayed >= 10) this.checkAchievement('play_10');
    if (state.stats.gamesPlayed >= 50) this.checkAchievement('play_50');

    // Zen mode achievement
    if (state.mode === 'zen' && state.stats.roundsCleared >= 5) {
      this.checkAchievement('zen_5');
    }

    // Check collisions
    if (!state.hopping && !state.deathAnimating) {
      this.checkCollisions();
    }

    this.updatePlayerMesh();
    this.positionDiscs();

    // Rotate discs
    for (const d of this.discMeshes) {
      if (d.visible) d.rotation.y += delta * 3;
    }
  }
}
