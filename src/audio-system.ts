import { createSystem } from '@iwsdk/core';
import { state, onAudioEvent } from './game-state';
import type { AudioEvent } from './game-state';

export class AudioSystem extends createSystem({}) {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicOsc: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
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
    }
  }

  private startMusic() {
    if (this.musicPlaying || !state.musicEnabled) return;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.05;
    this.musicGain.connect(this.masterGain);

    this.musicOsc = ctx.createOscillator();
    this.musicOsc.type = 'sine';
    this.musicOsc.frequency.value = 110;
    this.musicOsc.connect(this.musicGain);
    this.musicOsc.start();
    this.musicPlaying = true;
  }

  private stopMusic() {
    if (!this.musicPlaying) return;
    try {
      this.musicOsc?.stop();
    } catch { /* already stopped */ }
    this.musicOsc = null;
    this.musicGain = null;
    this.musicPlaying = false;
  }

  private updateMusic(time: number) {
    if (!this.musicOsc || !this.musicGain) return;
    // Gentle ambient drone that changes pitch slowly
    const baseFreq = 55 + Math.sin(time * 0.1) * 20;
    this.musicOsc.frequency.value = baseFreq;
    this.musicGain.gain.value = state.musicEnabled ? 0.04 : 0;
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
