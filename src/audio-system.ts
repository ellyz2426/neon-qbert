import { createSystem } from '@iwsdk/core';
import { state, onAudioEvent } from './game-state';
import type { AudioEvent } from './game-state';

export class AudioSystem extends createSystem({}) {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicOscs: OscillatorNode[] = [];
  private musicGains: GainNode[] = [];
  private musicPlaying = false;
  // Rhythm system
  private lastBeatTime = 0;
  private beatIndex = 0;
  private lastHiHatTime = 0;

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

  private playNoise(duration: number, volume: number) {
    if (!state.soundEnabled) return;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    // Create noise via oscillator modulation for hi-hat-like sounds
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 6000 + Math.random() * 4000;
    osc2.type = 'square';
    osc2.frequency.value = 8000 + Math.random() * 3000;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + duration);
  }

  private playKick() {
    if (!state.soundEnabled || !state.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  private playHiHat() {
    if (!state.soundEnabled || !state.musicEnabled) return;
    this.playNoise(0.04, 0.04);
  }

  private playArpNote(noteIndex: number) {
    if (!state.soundEnabled || !state.musicEnabled) return;
    // Arpeggio notes that change with round progression
    const scale = [
      [220, 277, 330, 440],  // A minor
      [247, 311, 370, 494],  // B minor
      [262, 330, 392, 523],  // C major
      [294, 370, 440, 587],  // D minor
    ];
    const scaleIdx = Math.min(Math.floor(state.round / 3), scale.length - 1);
    const notes = scale[scaleIdx];
    const freq = notes[noteIndex % notes.length];
    this.playTone(freq, 0.15, 'triangle', 0.04);
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
        this.playTone(880, 0.15, 'sine', 0.15);
        setTimeout(() => this.playTone(1100, 0.2, 'sine', 0.12), 80);
        setTimeout(() => this.playTone(1320, 0.15, 'sine', 0.1), 160);
        break;
      case 'powerup_collect':
        this.playTone(523, 0.1, 'sine', 0.25);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.25), 60);
        setTimeout(() => this.playTone(784, 0.1, 'sine', 0.25), 120);
        setTimeout(() => this.playTone(1047, 0.2, 'sine', 0.2), 180);
        break;
      case 'combo':
        {
          const baseFreq = 400 + state.combo * 100;
          const clampedFreq = Math.min(baseFreq, 1600);
          this.playTone(clampedFreq, 0.1, 'square', 0.2);
          this.playTone(clampedFreq * 1.5, 0.15, 'sine', 0.15);
        }
        break;
      case 'ugg_move':
        this.playTone(180, 0.12, 'triangle', 0.12);
        break;
      case 'bonus_start':
        this.playChord([523, 659, 784], 0.2);
        setTimeout(() => this.playChord([587, 740, 880], 0.2), 120);
        setTimeout(() => this.playChord([659, 784, 1047], 0.2), 240);
        setTimeout(() => this.playChord([784, 988, 1175], 0.3), 360);
        break;
      case 'bonus_tick':
        this.playTone(1000, 0.05, 'square', 0.15);
        break;
      case 'wave_pulse':
        this.playTone(880 + Math.random() * 200, 0.08, 'sine', 0.06);
        break;
      case 'ach_unlock':
        this.playTone(659, 0.12, 'sine', 0.2);
        setTimeout(() => this.playTone(784, 0.12, 'sine', 0.2), 80);
        setTimeout(() => this.playTone(988, 0.12, 'sine', 0.2), 160);
        setTimeout(() => this.playTone(1175, 0.25, 'sine', 0.15), 240);
        setTimeout(() => this.playTone(1319, 0.3, 'triangle', 0.1), 320);
        break;
      case 'green_ball_spawn':
        // Deep thud for green ball
        this.playTone(120, 0.15, 'sine', 0.15);
        this.playTone(90, 0.2, 'sine', 0.1);
        break;
      case 'green_ball_bounce':
        // Bounce sound
        this.playTone(250 + Math.random() * 100, 0.08, 'triangle', 0.08);
        break;
      case 'milestone':
        // Score milestone fanfare — triumphant
        this.playChord([523, 659, 784, 1047], 0.3);
        setTimeout(() => this.playChord([587, 740, 880, 1175], 0.3), 150);
        setTimeout(() => this.playChord([659, 784, 988, 1319], 0.4), 300);
        setTimeout(() => this.playChord([784, 988, 1175, 1568], 0.5), 450);
        break;
      case 'warp':
        // Warp/transition swoosh
        {
          const ctx = this.ensureContext();
          if (this.masterGain) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
          }
        }
        break;
    }
  }

  private startMusic() {
    if (this.musicPlaying || !state.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    // Multi-oscillator drone with harmonics
    const baseFreqs = [55, 82.5, 110];
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
    this.lastBeatTime = 0;
    this.beatIndex = 0;
    this.lastHiHatTime = 0;
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

    // Octave harmonic
    if (this.musicOscs[2]) {
      const octaveFreq = 110 + Math.sin(time * 0.2) * 8 + roundFactor * 1.0;
      this.musicOscs[2].frequency.value = octaveFreq;
      if (this.musicGains[2]) {
        this.musicGains[2].gain.value = 0.02 + roundFactor * 0.003;
      }
    }

    // Rhythm system — kicks on beat, hi-hats on off-beat, arpeggios evolving
    // BPM increases subtly with round
    const bpm = 90 + Math.min(roundFactor * 5, 40); // 90-130 BPM
    const beatInterval = 60 / bpm;
    const hiHatInterval = beatInterval / 2;

    // Kick drum on beat (starts from round 2)
    if (state.round >= 2 && time - this.lastBeatTime >= beatInterval) {
      this.lastBeatTime = time;
      this.beatIndex++;

      // Kick pattern: beat 1 and 3 of each 4-beat bar
      const barBeat = this.beatIndex % 4;
      if (barBeat === 0 || barBeat === 2) {
        this.playKick();
      }

      // Arpeggio on every beat (starts round 4)
      if (state.round >= 4) {
        this.playArpNote(this.beatIndex % 4);
      }
    }

    // Hi-hat on off-beats (starts from round 3)
    if (state.round >= 3 && time - this.lastHiHatTime >= hiHatInterval) {
      this.lastHiHatTime = time;
      // Only on off-beats (even indices = on-beat, odd = off-beat)
      this.playHiHat();
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
