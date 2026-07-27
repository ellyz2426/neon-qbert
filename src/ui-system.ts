import {
  createSystem,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  eq,
} from '@iwsdk/core';
import { state, emitAudio, saveStats } from './game-state';
import type { Screen } from './game-state';
import { GameSystem } from './game-system';

// Helper to safely set text on a panel element
function setText(doc: UIKitDocument | undefined, id: string, text: string): void {
  if (!doc) return;
  const el = doc.getElementById(id) as UIKit.Text | undefined;
  el?.setProperties({ text });
}

export class UISystem extends createSystem({
  menuPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/menu.json')] },
  hudPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
  pausePanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
  resultsPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/results.json')] },
  settingsPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
  tutorialPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/tutorial.json')] },
  statsPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
  achievementsPanel: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achievements.json')] },
}) {
  private panelDocs: Partial<Record<string, UIKitDocument>> = {};
  private panelEntities: Map<string, { visible: boolean }> = new Map();
  private gameSystem!: GameSystem;

  init() {
    const gs = this.world.getSystem(GameSystem);
    if (gs) this.gameSystem = gs;

    // Create panel entities positioned in front of camera
    const panelConfigs = [
      { name: 'menu', config: './ui/menu.json', x: 0, y: 3.5, z: -2 },
      { name: 'hud', config: './ui/hud.json', x: 0, y: 5.5, z: -1 },
      { name: 'pause', config: './ui/pause.json', x: 0, y: 3.5, z: -2 },
      { name: 'results', config: './ui/results.json', x: 0, y: 3.5, z: -2 },
      { name: 'settings', config: './ui/settings.json', x: 0, y: 3.5, z: -2 },
      { name: 'tutorial', config: './ui/tutorial.json', x: 0, y: 3.5, z: -2 },
      { name: 'stats', config: './ui/stats.json', x: 0, y: 3.5, z: -2 },
      { name: 'achievements', config: './ui/achievements.json', x: 0, y: 3.5, z: -2 },
    ];

    for (const pc of panelConfigs) {
      const entity = this.world.createTransformEntity();
      entity.object3D!.position.set(pc.x, pc.y, pc.z);
      entity.object3D!.scale.set(0.7, 0.7, 0.7);
      entity.addComponent(PanelUI, { config: pc.config });
      this.panelEntities.set(pc.name, { visible: false });
    }

    // Subscribe to qualify events for each panel
    this.queries.menuPanel.subscribe('qualify', (entity) => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.panelDocs['menu'] = doc;
      this.wireMenuPanel(doc);
    });

    this.queries.hudPanel.subscribe('qualify', (entity) => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.panelDocs['hud'] = doc;
    });

    this.queries.pausePanel.subscribe('qualify', (entity) => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.panelDocs['pause'] = doc;
      this.wirePausePanel(doc);
    });

    this.queries.resultsPanel.subscribe('qualify', (entity) => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.panelDocs['results'] = doc;
      this.wireResultsPanel(doc);
    });

    this.queries.settingsPanel.subscribe('qualify', (entity) => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.panelDocs['settings'] = doc;
      this.wireSettingsPanel(doc);
    });

    this.queries.tutorialPanel.subscribe('qualify', (entity) => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.panelDocs['tutorial'] = doc;
      this.wireTutorialPanel(doc);
    });

    this.queries.statsPanel.subscribe('qualify', (entity) => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.panelDocs['stats'] = doc;
      this.wireStatsPanel(doc);
    });

    this.queries.achievementsPanel.subscribe('qualify', (entity) => {
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.panelDocs['achievements'] = doc;
      this.wireAchievementsPanel(doc);
    });
  }

  private wireMenuPanel(doc: UIKitDocument) {
    const btnPlay = doc.getElementById('btn-play') as UIKit.Text | undefined;
    btnPlay?.addEventListener('click', () => {
      emitAudio('menu_click');
      this.gameSystem.startGame();
    });

    const btnArcade = doc.getElementById('btn-arcade') as UIKit.Text | undefined;
    btnArcade?.addEventListener('click', () => { state.mode = 'arcade'; emitAudio('menu_click'); });

    const btnSpeed = doc.getElementById('btn-speed') as UIKit.Text | undefined;
    btnSpeed?.addEventListener('click', () => { state.mode = 'speed'; emitAudio('menu_click'); });

    const btnZen = doc.getElementById('btn-zen') as UIKit.Text | undefined;
    btnZen?.addEventListener('click', () => { state.mode = 'zen'; emitAudio('menu_click'); });

    const btnChallenge = doc.getElementById('btn-challenge') as UIKit.Text | undefined;
    btnChallenge?.addEventListener('click', () => { state.mode = 'challenge'; emitAudio('menu_click'); });

    const btnSettings = doc.getElementById('btn-settings') as UIKit.Text | undefined;
    btnSettings?.addEventListener('click', () => { state.screen = 'settings'; emitAudio('menu_click'); });

    const btnTutorial = doc.getElementById('btn-tutorial') as UIKit.Text | undefined;
    btnTutorial?.addEventListener('click', () => { state.screen = 'tutorial'; emitAudio('menu_click'); });

    const btnStats = doc.getElementById('btn-stats') as UIKit.Text | undefined;
    btnStats?.addEventListener('click', () => { state.screen = 'stats'; emitAudio('menu_click'); });

    const btnAchievements = doc.getElementById('btn-achievements') as UIKit.Text | undefined;
    btnAchievements?.addEventListener('click', () => { state.screen = 'achievements'; emitAudio('menu_click'); });
  }

  private wirePausePanel(doc: UIKitDocument) {
    const btnResume = doc.getElementById('btn-resume') as UIKit.Text | undefined;
    btnResume?.addEventListener('click', () => { state.screen = 'playing'; emitAudio('menu_click'); });

    const btnRestart = doc.getElementById('btn-restart') as UIKit.Text | undefined;
    btnRestart?.addEventListener('click', () => {
      emitAudio('menu_click');
      this.gameSystem.startGame();
    });

    const btnQuit = doc.getElementById('btn-quit') as UIKit.Text | undefined;
    btnQuit?.addEventListener('click', () => { state.screen = 'menu'; emitAudio('menu_click'); });
  }

  private wireResultsPanel(doc: UIKitDocument) {
    const btnAgain = doc.getElementById('btn-again') as UIKit.Text | undefined;
    btnAgain?.addEventListener('click', () => {
      emitAudio('menu_click');
      this.gameSystem.startGame();
    });

    const btnMenu = doc.getElementById('btn-menu') as UIKit.Text | undefined;
    btnMenu?.addEventListener('click', () => { state.screen = 'menu'; emitAudio('menu_click'); });
  }

  private wireSettingsPanel(doc: UIKitDocument) {
    const btnSound = doc.getElementById('btn-sound') as UIKit.Text | undefined;
    btnSound?.addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      emitAudio('menu_click');
    });

    const btnMusic = doc.getElementById('btn-music') as UIKit.Text | undefined;
    btnMusic?.addEventListener('click', () => {
      state.musicEnabled = !state.musicEnabled;
      emitAudio('menu_click');
    });

    const btnCyan = doc.getElementById('btn-cyan') as UIKit.Text | undefined;
    btnCyan?.addEventListener('click', () => { state.colorScheme = 'cyan'; emitAudio('menu_click'); });

    const btnGreen = doc.getElementById('btn-green') as UIKit.Text | undefined;
    btnGreen?.addEventListener('click', () => { state.colorScheme = 'green'; emitAudio('menu_click'); });

    const btnMagenta = doc.getElementById('btn-magenta') as UIKit.Text | undefined;
    btnMagenta?.addEventListener('click', () => { state.colorScheme = 'magenta'; emitAudio('menu_click'); });

    const btnGold = doc.getElementById('btn-gold') as UIKit.Text | undefined;
    btnGold?.addEventListener('click', () => { state.colorScheme = 'gold'; emitAudio('menu_click'); });

    const btnEasy = doc.getElementById('btn-easy') as UIKit.Text | undefined;
    btnEasy?.addEventListener('click', () => { state.difficulty = 'easy'; emitAudio('menu_click'); });

    const btnMedium = doc.getElementById('btn-medium') as UIKit.Text | undefined;
    btnMedium?.addEventListener('click', () => { state.difficulty = 'medium'; emitAudio('menu_click'); });

    const btnHard = doc.getElementById('btn-hard') as UIKit.Text | undefined;
    btnHard?.addEventListener('click', () => { state.difficulty = 'hard'; emitAudio('menu_click'); });

    const btnBack = doc.getElementById('btn-back') as UIKit.Text | undefined;
    btnBack?.addEventListener('click', () => { state.screen = 'menu'; emitAudio('menu_click'); });
  }

  private wireTutorialPanel(doc: UIKitDocument) {
    const btnBack = doc.getElementById('btn-back') as UIKit.Text | undefined;
    btnBack?.addEventListener('click', () => { state.screen = 'menu'; emitAudio('menu_click'); });
  }

  private wireStatsPanel(doc: UIKitDocument) {
    const btnBack = doc.getElementById('btn-back') as UIKit.Text | undefined;
    btnBack?.addEventListener('click', () => { state.screen = 'menu'; emitAudio('menu_click'); });
  }

  private wireAchievementsPanel(doc: UIKitDocument) {
    const btnBack = doc.getElementById('btn-back') as UIKit.Text | undefined;
    btnBack?.addEventListener('click', () => { state.screen = 'menu'; emitAudio('menu_click'); });

    const btnPrev = doc.getElementById('btn-prev') as UIKit.Text | undefined;
    btnPrev?.addEventListener('click', () => {
      if (state.achievementPage > 0) state.achievementPage--;
      emitAudio('menu_click');
    });

    const btnNext = doc.getElementById('btn-next') as UIKit.Text | undefined;
    btnNext?.addEventListener('click', () => {
      if (state.achievementPage < 2) state.achievementPage++;
      emitAudio('menu_click');
    });
  }

  private showPanel(name: string): boolean {
    const screenMap: Record<Screen, string> = {
      menu: 'menu',
      playing: 'hud',
      paused: 'pause',
      results: 'results',
      settings: 'settings',
      tutorial: 'tutorial',
      stats: 'stats',
      achievements: 'achievements',
    };
    return screenMap[state.screen] === name;
  }

  private updateHUD() {
    const doc = this.panelDocs['hud'];
    if (!doc) return;
    setText(doc, 'score-val', String(state.score));
    setText(doc, 'lives-val', String(state.lives));
    setText(doc, 'round-val', String(state.round));
    if (state.mode === 'speed') {
      setText(doc, 'timer-val', String(Math.ceil(state.timer)));
    } else if (state.mode === 'challenge') {
      setText(doc, 'timer-val', 'Hops: ' + state.hopsRemaining);
    } else {
      setText(doc, 'timer-val', '');
    }

    // Combo display
    if (state.combo >= 2) {
      setText(doc, 'combo-val', 'COMBO x' + state.combo);
    } else {
      setText(doc, 'combo-val', '');
    }

    // Score multiplier display
    const mult = this.getDisplayMultiplier();
    if (mult > 1) {
      setText(doc, 'mult-val', mult.toFixed(1) + 'x MULT');
    } else {
      setText(doc, 'mult-val', '');
    }

    // Active power-up display
    if (state.activePowerUp) {
      const name = state.activePowerUp.type.toUpperCase();
      const secs = Math.ceil(state.activePowerUp.timeLeft);
      setText(doc, 'powerup-val', name + ' ' + secs + 's');
    } else {
      setText(doc, 'powerup-val', '');
    }

    // Streak display
    if (state.currentStreak >= 2) {
      setText(doc, 'streak-val', state.currentStreak + ' STREAK');
    } else {
      setText(doc, 'streak-val', '');
    }

    // Round announcement
    if (state.roundAnnounceTimer > 0) {
      setText(doc, 'announce-val', state.bonusRound ? '★ BONUS ROUND ★' : 'ROUND ' + state.round);
    } else if (state.bonusRound && state.bonusTimer > 0) {
      setText(doc, 'announce-val', 'BONUS: ' + Math.ceil(state.bonusTimer) + 's');
    } else {
      setText(doc, 'announce-val', '');
    }

    // Achievement notification
    if (state.achNotifyTimer > 0) {
      setText(doc, 'ach-notify', state.achNotifyText);
    } else {
      setText(doc, 'ach-notify', '');
    }
  }

  private getDisplayMultiplier(): number {
    let mult = 1;
    if (state.combo >= 2) mult += (state.combo - 1) * 0.25;
    if (state.scoreBoostActive) mult *= 2;
    return mult;
  }

  private updateResults() {
    const doc = this.panelDocs['results'];
    if (!doc) return;
    setText(doc, 'result-title', state.gameOver ? 'GAME OVER' : 'ROUND COMPLETE');
    setText(doc, 'result-score', 'Score: ' + state.score);
    setText(doc, 'result-round', 'Round: ' + (state.round - 1));
    setText(doc, 'result-hops', 'Total Hops: ' + state.totalHops);
    setText(doc, 'result-high', 'High Score: ' + state.stats.highScore);
    // Show leaderboard rank
    const rank = state.highScores.findIndex(hs => hs.score <= state.score);
    if (state.gameOver && state.highScores.length > 0) {
      const pos = rank >= 0 ? rank + 1 : state.highScores.length + 1;
      if (pos <= 5) {
        setText(doc, 'result-rank', '#' + pos + ' on Leaderboard!');
      } else {
        setText(doc, 'result-rank', '');
      }
    } else {
      setText(doc, 'result-rank', '');
    }
  }

  private updateSettings() {
    const doc = this.panelDocs['settings'];
    if (!doc) return;
    setText(doc, 'btn-sound', 'Sound: ' + (state.soundEnabled ? 'ON' : 'OFF'));
    setText(doc, 'btn-music', 'Music: ' + (state.musicEnabled ? 'ON' : 'OFF'));
    setText(doc, 'difficulty-val', 'Difficulty: ' + state.difficulty.toUpperCase());
    setText(doc, 'scheme-val', 'Theme: ' + state.colorScheme.toUpperCase());
  }

  private updateStats() {
    const doc = this.panelDocs['stats'];
    if (!doc) return;
    setText(doc, 'stat-games', 'Games Played: ' + state.stats.gamesPlayed);
    setText(doc, 'stat-rounds', 'Rounds Cleared: ' + state.stats.roundsCleared);
    setText(doc, 'stat-enemies', 'Enemies Defeated: ' + state.stats.enemiesDefeated);
    setText(doc, 'stat-cubes', 'Cubes Hopped: ' + state.stats.cubesHopped);
    setText(doc, 'stat-high', 'High Score: ' + state.stats.highScore);
    // Top 5 leaderboard
    for (let i = 0; i < 5; i++) {
      const hs = state.highScores[i];
      if (hs) {
        setText(doc, 'lb-' + i, '#' + (i + 1) + ': ' + hs.score + ' (R' + hs.round + ' ' + hs.mode + ')');
      } else {
        setText(doc, 'lb-' + i, '#' + (i + 1) + ': ---');
      }
    }
  }

  private updateAchievements() {
    const doc = this.panelDocs['achievements'];
    if (!doc) return;
    const page = state.achievementPage;
    const totalPages = Math.ceil(state.achievements.length / 10);
    const start = page * 10;
    for (let i = 0; i < 10; i++) {
      const idx = start + i;
      const ach = state.achievements[idx];
      if (ach) {
        setText(doc, 'ach-' + i, (ach.unlocked ? '[x] ' : '[ ] ') + ach.name + ' - ' + ach.desc);
      } else {
        setText(doc, 'ach-' + i, '');
      }
    }
    setText(doc, 'page-num', 'Page ' + (page + 1) + ' / ' + totalPages);
  }

  private updateMenu() {
    const doc = this.panelDocs['menu'];
    if (!doc) return;
    setText(doc, 'mode-val', 'Mode: ' + state.mode.toUpperCase());
  }

  update(_delta: number, _time: number) {
    // Toggle panel visibility
    const panelNames = ['menu', 'hud', 'pause', 'results', 'settings', 'tutorial', 'stats', 'achievements'];
    for (const query of [
      this.queries.menuPanel,
      this.queries.hudPanel,
      this.queries.pausePanel,
      this.queries.resultsPanel,
      this.queries.settingsPanel,
      this.queries.tutorialPanel,
      this.queries.statsPanel,
      this.queries.achievementsPanel,
    ]) {
      const idx = [
        this.queries.menuPanel,
        this.queries.hudPanel,
        this.queries.pausePanel,
        this.queries.resultsPanel,
        this.queries.settingsPanel,
        this.queries.tutorialPanel,
        this.queries.statsPanel,
        this.queries.achievementsPanel,
      ].indexOf(query);
      const name = panelNames[idx];
      const shouldShow = this.showPanel(name);
      query.entities.forEach(e => {
        if (e.object3D) e.object3D.visible = shouldShow;
      });
    }

    // Update active panel content
    switch (state.screen) {
      case 'playing': this.updateHUD(); break;
      case 'results': this.updateResults(); break;
      case 'settings': this.updateSettings(); break;
      case 'stats': this.updateStats(); break;
      case 'achievements': this.updateAchievements(); break;
      case 'menu': this.updateMenu(); break;
    }
  }
}
