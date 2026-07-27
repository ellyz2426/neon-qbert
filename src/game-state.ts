// Shared game state — imported by every system

export const PYRAMID_ROWS = 7;
export const CUBE_SIZE = 0.6;
export const STRIDE = 0.8;
export const PILLAR_HEIGHT = 0.4;
export const ROW_DROP = 0.5;
export const HOP_DURATION = 0.3;

export type GameMode = 'arcade' | 'speed' | 'zen' | 'challenge';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ColorScheme = 'cyan' | 'green' | 'magenta' | 'gold';
export type Screen = 'menu' | 'playing' | 'paused' | 'results' | 'settings' | 'tutorial' | 'stats' | 'achievements';

export interface CubeData {
  row: number;
  col: number;
  colorState: number;
  targetState: number;
}

export interface EnemyData {
  type: 'coily' | 'slick' | 'sam' | 'ugg' | 'wrongway';
  row: number;
  col: number;
  active: boolean;
  isEgg: boolean;
  moveTimer: number;
}

export interface HighScoreEntry {
  score: number;
  round: number;
  mode: GameMode;
  date: string;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
}

export interface CareerStats {
  gamesPlayed: number;
  roundsCleared: number;
  enemiesDefeated: number;
  cubesHopped: number;
  highScore: number;
}

export interface GameState {
  screen: Screen;
  mode: GameMode;
  difficulty: Difficulty;
  colorScheme: ColorScheme;
  round: number;
  score: number;
  lives: number;
  playerRow: number;
  playerCol: number;
  hopping: boolean;
  hopProgress: number;
  hopFromRow: number;
  hopFromCol: number;
  hopToRow: number;
  hopToCol: number;
  cubes: CubeData[];
  enemies: EnemyData[];
  discLeft: boolean;
  discRight: boolean;
  discUsed: boolean;
  timer: number;
  hopsRemaining: number;
  totalHops: number;
  roundComplete: boolean;
  gameOver: boolean;
  deathAnimating: boolean;
  deathTimer: number;
  enemySpawnTimer: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  stats: CareerStats;
  highScores: HighScoreEntry[];
  achievements: Achievement[];
  achievementPage: number;
  pendingInput: { dr: number; dc: number } | null;
  initialized: boolean;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  powerUps: PowerUp[];
  activePowerUp: ActivePowerUp | null;
  powerUpSpawnTimer: number;
  shieldActive: boolean;
  roundAnnounceTimer: number;
  freezeActive: boolean;
  scoreBoostActive: boolean;
  roundStartTime: number;
  roundElapsed: number;
  powerUpsCollectedTypes: Set<PowerUpType>;
  uggWrongwaysSurvived: number;
  // Camera shake on death
  cameraShakeIntensity: number;
  cameraShakeTimer: number;
  // Cube pulse animations
  cubePulses: { index: number; timer: number; color: number }[];
  // Bonus round
  bonusRound: boolean;
  bonusTimer: number;
  bonusCubesChanged: number;
  // Death fall
  deathFallY: number;
  deathFallSpin: number;
  // Round complete wave
  roundWaveTimer: number;
  roundWaveIndex: number;
  roundWaveActive: boolean;
  // Hop trail
  hopTrailPoints: { x: number; y: number; z: number; life: number }[];
  // Achievement notification
  achNotifyText: string;
  achNotifyTimer: number;
  // Player squash-stretch
  playerSquash: number;
  playerSquashTimer: number;
  // Score popup events
  scorePopups: { x: number; y: number; z: number; text: string; life: number; maxLife: number }[];
  // Streak display
  currentStreak: number;
}

export const COLOR_SCHEMES: Record<ColorScheme, { start: number; target: number; mid: number; mid2: number; accent: number; bg: number }> = {
  cyan:    { start: 0x1a1a3a, target: 0x00ffff, mid: 0x005577, mid2: 0x00aacc, accent: 0x00cccc, bg: 0x000a14 },
  green:   { start: 0x1a3a1a, target: 0x00ff88, mid: 0x005533, mid2: 0x00aa66, accent: 0x00cc66, bg: 0x000a08 },
  magenta: { start: 0x3a1a3a, target: 0xff00ff, mid: 0x550055, mid2: 0xaa00aa, accent: 0xcc00cc, bg: 0x140014 },
  gold:    { start: 0x3a3a1a, target: 0xffcc00, mid: 0x554400, mid2: 0xaa8800, accent: 0xccaa00, bg: 0x141000 },
};

export function defaultAchievements(): Achievement[] {
  return [
    { id: 'first_hop', name: 'First Hop', desc: 'Complete your first hop', unlocked: false },
    { id: 'painter_10', name: 'Cube Painter', desc: 'Change 10 cubes', unlocked: false },
    { id: 'round_1', name: 'Round One', desc: 'Complete Round 1', unlocked: false },
    { id: 'round_5', name: 'Five Alive', desc: 'Complete 5 rounds', unlocked: false },
    { id: 'round_10', name: 'Ten Pin', desc: 'Complete 10 rounds', unlocked: false },
    { id: 'round_20', name: 'Pyramid Master', desc: 'Complete 20 rounds', unlocked: false },
    { id: 'defeat_coily', name: 'Snake Charmer', desc: 'Defeat Coily once', unlocked: false },
    { id: 'defeat_10', name: 'Pest Control', desc: 'Defeat 10 enemies', unlocked: false },
    { id: 'defeat_50', name: 'Exterminator', desc: 'Defeat 50 enemies', unlocked: false },
    { id: 'score_10k', name: 'High Roller', desc: 'Score 10,000 points', unlocked: false },
    { id: 'score_50k', name: 'Score King', desc: 'Score 50,000 points', unlocked: false },
    { id: 'score_100k', name: 'Legend', desc: 'Score 100,000 points', unlocked: false },
    { id: 'speed_clear', name: 'Speed Demon', desc: 'Complete a Speed round', unlocked: false },
    { id: 'zen_5', name: 'Zen Master', desc: 'Clear 5 Zen rounds', unlocked: false },
    { id: 'challenge_clear', name: 'Challenge Accepted', desc: 'Clear a Challenge round', unlocked: false },
    { id: 'perfect', name: 'Perfect Round', desc: 'Clear a round without dying', unlocked: false },
    { id: 'play_10', name: 'Marathon Runner', desc: 'Play 10 games', unlocked: false },
    { id: 'play_50', name: 'Veteran', desc: 'Play 50 games', unlocked: false },
    { id: 'disc_use', name: 'Disc Jockey', desc: 'Use a flying disc', unlocked: false },
    { id: 'cubes_100', name: 'Color Wizard', desc: 'Change 100 cubes total', unlocked: false },
    { id: 'combo_5', name: 'Combo Master', desc: 'Reach a 5x combo', unlocked: false },
    { id: 'combo_10', name: 'Combo Legend', desc: 'Reach a 10x combo', unlocked: false },
    { id: 'all_powerups', name: 'Powered Up', desc: 'Collect all 3 power-up types', unlocked: false },
    { id: 'survive_ugg', name: 'Side Stepper', desc: 'Survive 3 Ugg/Wrongway enemies', unlocked: false },
    { id: 'round_15', name: 'Halfway Hero', desc: 'Complete 15 rounds', unlocked: false },
    { id: 'no_disc', name: 'Grounded', desc: 'Clear round 5 without using discs', unlocked: false },
    { id: 'speedrun', name: 'Speedrunner', desc: 'Clear a round in under 15 seconds', unlocked: false },
    { id: 'score_250k', name: 'Quarter Million', desc: 'Score 250,000 points', unlocked: false },
    { id: 'multihop', name: 'Double Dip', desc: 'Change a 2-step cube to target', unlocked: false },
    { id: 'freeze_coily', name: 'Cold Snap', desc: 'Freeze Coily with a freeze power-up', unlocked: false },
    { id: 'bonus_clear', name: 'Bonus Star', desc: 'Complete a bonus round', unlocked: false },
    { id: 'bonus_perfect', name: 'Bonus Perfection', desc: 'Complete a bonus round with all cubes', unlocked: false },
    { id: 'streak_3', name: 'On A Roll', desc: 'Complete 3 rounds without dying', unlocked: false },
    { id: 'score_500k', name: 'Half Million', desc: 'Score 500,000 points', unlocked: false },
    { id: 'all_modes', name: 'Well Rounded', desc: 'Play all 4 game modes', unlocked: false },
  ];
}

function loadStats(): CareerStats {
  try {
    const raw = localStorage.getItem('qbert_stats');
    if (raw) return JSON.parse(raw) as CareerStats;
  } catch { /* ignore */ }
  return { gamesPlayed: 0, roundsCleared: 0, enemiesDefeated: 0, cubesHopped: 0, highScore: 0 };
}

function loadAchievements(): Achievement[] {
  const achs = defaultAchievements();
  try {
    const raw = localStorage.getItem('qbert_achievements');
    if (raw) {
      const saved = JSON.parse(raw) as string[];
      for (const a of achs) {
        if (saved.includes(a.id)) a.unlocked = true;
      }
    }
  } catch { /* ignore */ }
  return achs;
}

export function saveStats(s: CareerStats): void {
  try { localStorage.setItem('qbert_stats', JSON.stringify(s)); } catch { /* ignore */ }
}

export function saveAchievements(achs: Achievement[]): void {
  try {
    const ids = achs.filter(a => a.unlocked).map(a => a.id);
    localStorage.setItem('qbert_achievements', JSON.stringify(ids));
  } catch { /* ignore */ }
}

function loadHighScores(): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem('qbert_highscores');
    if (raw) return JSON.parse(raw) as HighScoreEntry[];
  } catch { /* ignore */ }
  return [];
}

export function saveHighScore(entry: HighScoreEntry): void {
  const scores = loadHighScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top5 = scores.slice(0, 5);
  try { localStorage.setItem('qbert_highscores', JSON.stringify(top5)); } catch { /* ignore */ }
  state.highScores = top5;
}

export function cubePos(row: number, col: number): { x: number; y: number; z: number } {
  const x = (col - row * 0.5) * STRIDE;
  const y = (PYRAMID_ROWS - 1 - row) * ROW_DROP;
  const z = row * STRIDE * 0.6;
  return { x, y, z };
}

export function isValidCube(row: number, col: number): boolean {
  return row >= 0 && row < PYRAMID_ROWS && col >= 0 && col <= row;
}

export const state: GameState = {
  screen: 'menu',
  mode: 'arcade',
  difficulty: 'medium',
  colorScheme: 'cyan',
  round: 1,
  score: 0,
  lives: 3,
  playerRow: 0,
  playerCol: 0,
  hopping: false,
  hopProgress: 0,
  hopFromRow: 0,
  hopFromCol: 0,
  hopToRow: 0,
  hopToCol: 0,
  cubes: [],
  enemies: [],
  discLeft: false,
  discRight: false,
  discUsed: false,
  timer: 120,
  hopsRemaining: 50,
  totalHops: 0,
  roundComplete: false,
  gameOver: false,
  deathAnimating: false,
  deathTimer: 0,
  enemySpawnTimer: 0,
  soundEnabled: true,
  musicEnabled: true,
  stats: loadStats(),
  highScores: loadHighScores(),
  achievements: loadAchievements(),
  achievementPage: 0,
  pendingInput: null,
  initialized: false,
  combo: 0,
  maxCombo: 0,
  comboTimer: 0,
  powerUps: [],
  activePowerUp: null,
  powerUpSpawnTimer: 0,
  shieldActive: false,
  roundAnnounceTimer: 0,
  freezeActive: false,
  scoreBoostActive: false,
  roundStartTime: 0,
  roundElapsed: 0,
  powerUpsCollectedTypes: new Set<PowerUpType>(),
  uggWrongwaysSurvived: 0,
  cameraShakeIntensity: 0,
  cameraShakeTimer: 0,
  cubePulses: [],
  bonusRound: false,
  bonusTimer: 0,
  bonusCubesChanged: 0,
  deathFallY: 0,
  deathFallSpin: 0,
  roundWaveTimer: 0,
  roundWaveIndex: 0,
  roundWaveActive: false,
  hopTrailPoints: [],
  achNotifyText: '',
  achNotifyTimer: 0,
  playerSquash: 1,
  playerSquashTimer: 0,
  scorePopups: [],
  currentStreak: 0,
};

export function initCubes(): void {
  state.cubes = [];
  // Multi-step cubes: round 3+ on hard = 2-step, round 7+ on hard = 3-step
  // Medium: round 5+ = 2-step, round 10+ = 3-step
  // Easy: round 8+ = 2-step
  let tgt = 1;
  if (state.difficulty === 'hard') {
    if (state.round > 6) tgt = 3;
    else if (state.round > 2) tgt = 2;
  } else if (state.difficulty === 'medium') {
    if (state.round > 9) tgt = 3;
    else if (state.round > 4) tgt = 2;
  } else {
    if (state.round > 7) tgt = 2;
  }
  for (let r = 0; r < PYRAMID_ROWS; r++) {
    for (let c = 0; c <= r; c++) {
      state.cubes.push({ row: r, col: c, colorState: 0, targetState: tgt });
    }
  }
}

export function getCube(row: number, col: number): CubeData | undefined {
  return state.cubes.find(c => c.row === row && c.col === col);
}

export function allCubesComplete(): boolean {
  return state.cubes.every(c => c.colorState >= c.targetState);
}

// Audio event bus
export type PowerUpType = 'shield' | 'scoreboost' | 'freeze';

export interface PowerUp {
  type: PowerUpType;
  row: number;
  col: number;
  active: boolean;
  pulsePhase: number;
}

export interface ActivePowerUp {
  type: PowerUpType;
  timeLeft: number;
}

export type AudioEvent = 'hop' | 'color_change' | 'death' | 'round_complete' | 'enemy_spawn' | 'enemy_die' | 'disc_use' | 'menu_click' | 'combo' | 'powerup_collect' | 'powerup_spawn' | 'ugg_move' | 'bonus_start' | 'bonus_tick' | 'wave_pulse' | 'ach_unlock';
const audioListeners: ((evt: AudioEvent) => void)[] = [];
export function onAudioEvent(fn: (evt: AudioEvent) => void): void { audioListeners.push(fn); }
export function emitAudio(evt: AudioEvent): void { for (const fn of audioListeners) fn(evt); }

// Effects event bus
export type EffectEvent = { type: 'hop_land'; x: number; y: number; z: number }
  | { type: 'death'; x: number; y: number; z: number }
  | { type: 'round_complete' }
  | { type: 'enemy_die'; x: number; y: number; z: number }
  | { type: 'powerup_collect'; x: number; y: number; z: number; powerUpType: PowerUpType }
  | { type: 'combo'; x: number; y: number; z: number; combo: number }
  | { type: 'hop_trail'; x: number; y: number; z: number }
  | { type: 'round_wave'; x: number; y: number; z: number; index: number }
  | { type: 'score_popup'; x: number; y: number; z: number; text: string };
const effectListeners: ((evt: EffectEvent) => void)[] = [];
export function onEffectEvent(fn: (evt: EffectEvent) => void): void { effectListeners.push(fn); }
export function emitEffect(evt: EffectEvent): void { for (const fn of effectListeners) fn(evt); }
