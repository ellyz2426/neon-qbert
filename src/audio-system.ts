import { createSystem } from '@iwsdk/core';
import { state, onAudioEvent } from './game-state';
import type { AudioEvent } from './game-state';

export class AudioSystem extends createSystem({}) {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicOscs: OscillatorNode[] = [];
  private musicGains: GainNode[] = [];
  private musicPlaying = false;

  init() {
    onAudioEvent((evt: AudioEvent) => this.playSound(evt));
  }

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
    if (!state.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playChord(freqs: number[], duration: number, type: OscillatorType = 'sine') {
    for (const f of freqs) this.playTone(f, duration, type, 0.15);
  }

  private playSound(evt: AudioEvent) {
    switch (evt) {
      case 'hop':
        this.playTone(440, 0.1, 'square', 0.2);
        break;
      case 'color_change':
        this.playTone(660, 0.15, 'sine', 0.25);
        this.playTone(880, 0.15, 'sine', 0.2);
        break;
      case 'death':
        this.playTone(200, 0.3, 'sawtooth', 0.3);
        this.playTone(150, 0.5, 'sawtooth', 0.2);
        break;
      case 'round_complete':
        this.playChord([523, 659, 784], 0.3);
        setTimeout(() => this.playChord([587, 740, 880], 0.4), 200);
        setTimeout(() => this.playChord([659, 784, 1047], 0.5), 400);
        break;
      case 'enemy_spawn':
        this.playTone(300, 0.2, 'triangle', 0.15);
        break;
      case 'enemy_die':
        this.playTone(800, 0.1, 'square', 0.2);
        this.playTone(1200, 0.15, 'square', 0.15);
        break;
      case 'disc_use':
        this.playTone(600, 0.1, 'sine', 0.2);
        this.playTone(900, 0.15, 'sine', 0.2);
        this.playTone(1200, 0.2, 'sine', 0.2);
        break;
      case 'menu_click':
        this.playTone(500, 0.05, 'square', 0.15);
        break;
      case 'powerup_spawn':
        // Shimmering spawn sound
        this.playTone(880, 0.15, 'sine', 0.15);
        setTimeout(() => this.playTone(1100, 0.2, 'sine', 0.12), 80);
        setTimeout(() => this.playTone(1320, 0.15, 'sine', 0.1), 160);
        break;
      case 'powerup_collect':
        // Satisfying collect sound - ascending arpeggio
        this.playTone(523, 0.1, 'sine', 0.25);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.25), 60);
        setTimeout(() => this.playTone(784, 0.1, 'sine', 0.25), 120);
        setTimeout(() => this.playTone(1047, 0.2, 'sine', 0.2), 180);
        break;
      case 'combo':
        // Ascending pitch with combo count
        {
          const baseFreq = 400 + state.combo * 100;
          const clampedFreq = Math.min(baseFreq, 1600);
          this.playTone(clampedFreq, 0.1, 'square', 0.2);
          this.playTone(clampedFreq * 1.5, 0.15, 'sine', 0.15);
        }
        break;
      case 'ugg_move':
        // Low rumble for lateral movement
        this.playTone(180, 0.12, 'triangle', 0.12);
        break;
      case 'bonus_start':
        // Exciting ascending fanfare
        this.playChord([523, 659, 784], 0.2);
        setTimeout(() => this.playChord([587, 740, 880], 0.2), 120);
        setTimeout(() => this.playChord([659, 784, 1047], 0.2), 240);
        setTimeout(() => this.playChord([784, 988, 1175], 0.3), 360);
        break;
      case 'bonus_tick':
        // Countdown tick
        this.playTone(1000, 0.05, 'square', 0.15);
        break;
      case 'wave_pulse':
        // Soft chime for wave cascade
        this.playTone(880 + Math.random() * 200, 0.08, 'sine', 0.06);
        break;
      case 'ach_unlock':
        // Achievement unlock: bright ascending arpeggio with shimmer
        this.playTone(659, 0.12, 'sine', 0.2);
        setTimeout(() => this.playTone(784, 0.12, 'sine', 0.2), 80);
        setTimeout(() => this.playTone(988, 0.12, 'sine', 0.2), 160);
        setTimeout(() => this.playTone(1175, 0.25, 'sine', 0.15), 240);
        setTimeout(() => this.playTone(1319, 0.3, 'triangle', 0.1), 320);
        break;
    }
  }

  private startMusic() {
    if (this.musicPlaying || !state.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    // Multi-oscillator drone with harmonics
    const baseFreqs = [55, 82.5, 110]; // Root, 5th, octave
    const types: OscillatorType[] = ['sine', 'sine', 'triangle'];
    const volumes = [0.06, 0.03, 0.02];

    for (let i = 0; i < baseFreqs.length; i++) {
      const gain = ctx.createGain();
      gain.gain.value = volumes[i];
      gain.connect(this.masterGain);

      const osc = ctx.createOscillator();
      osc.type = types[i];
      osc.frequency.value = baseFreqs[i];
      osc.connect(gain);
      osc.start();

      this.musicOscs.push(osc);
      this.musicGains.push(gain);
    }

    this.musicPlaying = true;
  }

  private stopMusic() {
    if (!this.musicPlaying) return;
    for (const osc of this.musicOscs) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.musicOscs = [];
    this.musicGains = [];
    this.musicPlaying = false;
  }

  private updateMusic(time: number) {
    if (this.musicOscs.length === 0 || this.musicGains.length === 0) return;

    // Base drone with slow modulation
    const roundFactor = Math.min(state.round, 10);

    // Root oscillator - slow frequency modulation
    if (this.musicOscs[0]) {
      const baseFreq = 55 + Math.sin(time * 0.1) * 10;
      this.musicOscs[0].frequency.value = baseFreq;
    }

    // 5th - slight detuning based on round for tension
    if (this.musicOscs[1]) {
      const fifthFreq = 82.5 + Math.sin(time * 0.15) * 5 + roundFactor * 0.5;
      this.musicOscs[1].frequency.value = fifthFreq;
    }

    // Octave harmonic - changes character with round progression
    if (this.musicOscs[2]) {
      const octaveFreq = 110 + Math.sin(time * 0.2) * 8 + roundFactor * 1.0;
      this.musicOscs[2].frequency.value = octaveFreq;
      // Add more presence at higher rounds
      if (this.musicGains[2]) {
        this.musicGains[2].gain.value = 0.02 + roundFactor * 0.003;
      }
    }

    // Master music volume
    const musicVol = state.musicEnabled ? 1 : 0;
    for (const g of this.musicGains) {
      // Don't override individual levels, just mute/unmute through master
    }
  }

  update(_delta: number, time: number) {
    if (state.screen === 'playing') {
      if (!this.musicPlaying && state.musicEnabled) {
        this.startMusic();
      }
      if (this.musicPlaying) {
        this.updateMusic(time);
      }
    } else {
      if (this.musicPlaying) {
        this.stopMusic();
      }
    }

    if (this.masterGain) {
      this.masterGain.gain.value = state.soundEnabled ? 0.3 : 0;
    }
  }
}
