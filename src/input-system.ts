import { createSystem, InputComponent } from '@iwsdk/core';
import { state } from './game-state';
import { GameSystem } from './game-system';

export class InputSystem extends createSystem({}) {
  private gameSystem!: GameSystem;
  private inputCooldown = 0;

  init() {
    const gs = this.world.getSystem(GameSystem);
    if (gs) this.gameSystem = gs;
  }

  update(delta: number, _time: number) {
    if (this.inputCooldown > 0) {
      this.inputCooldown -= delta;
      return;
    }

    if (state.screen === 'playing' && !state.hopping && !state.deathAnimating && !state.roundComplete) {
      this.handlePlayInput();
    }

    if (state.screen === 'playing') {
      this.handlePauseInput();
    }
  }

  private handlePlayInput() {
    const kb = this.input.keyboard;

    // Keyboard: Q/ArrowUp+ArrowLeft = up-left, E/ArrowUp+ArrowRight = up-right
    // A/ArrowDown+ArrowLeft = down-left, D/ArrowDown+ArrowRight = down-right
    let dr = 0;
    let dc = 0;

    if (kb.getKeyDown('KeyQ') || kb.getKeyDown('Numpad7')) {
      dr = -1; dc = -1;
    } else if (kb.getKeyDown('KeyE') || kb.getKeyDown('Numpad9')) {
      dr = -1; dc = 0;
    } else if (kb.getKeyDown('KeyA') || kb.getKeyDown('Numpad1')) {
      dr = 1; dc = 0;
    } else if (kb.getKeyDown('KeyD') || kb.getKeyDown('Numpad3')) {
      dr = 1; dc = 1;
    } else if (kb.getKeyDown('ArrowUp') && kb.getKeyPressed('ArrowLeft')) {
      dr = -1; dc = -1;
    } else if (kb.getKeyDown('ArrowUp') && kb.getKeyPressed('ArrowRight')) {
      dr = -1; dc = 0;
    } else if (kb.getKeyDown('ArrowDown') && kb.getKeyPressed('ArrowLeft')) {
      dr = 1; dc = 0;
    } else if (kb.getKeyDown('ArrowDown') && kb.getKeyPressed('ArrowRight')) {
      dr = 1; dc = 1;
    } else if (kb.getKeyDown('ArrowUp')) {
      dr = -1; dc = 0; // Default up = up-right
    } else if (kb.getKeyDown('ArrowDown')) {
      dr = 1; dc = 0; // Default down = down-left
    } else if (kb.getKeyDown('ArrowLeft')) {
      dr = -1; dc = -1; // left = up-left
    } else if (kb.getKeyDown('ArrowRight')) {
      dr = 1; dc = 1; // right = down-right
    }

    // VR Controller input
    const right = this.input.xr.gamepads.right;
    if (right) {
      const stick = right.getAxesValues(InputComponent.Thumbstick);
      if (stick && (Math.abs(stick.x) > 0.5 || Math.abs(stick.y) > 0.5)) {
        // Map thumbstick to isometric directions
        if (stick.y < -0.5 && stick.x < -0.3) {
          dr = -1; dc = -1; // up-left
        } else if (stick.y < -0.5 && stick.x > 0.3) {
          dr = -1; dc = 0; // up-right
        } else if (stick.y > 0.5 && stick.x < -0.3) {
          dr = 1; dc = 0; // down-left
        } else if (stick.y > 0.5 && stick.x > 0.3) {
          dr = 1; dc = 1; // down-right
        } else if (stick.y < -0.5) {
          dr = -1; dc = 0;
        } else if (stick.y > 0.5) {
          dr = 1; dc = 1;
        } else if (stick.x < -0.5) {
          dr = -1; dc = -1;
        } else if (stick.x > 0.5) {
          dr = 1; dc = 1;
        }
        this.inputCooldown = 0.3;
      }
    }

    if (dr !== 0 || dc !== 0) {
      state.pendingInput = { dr, dc };
      this.inputCooldown = 0.15;
    }
  }

  private handlePauseInput() {
    const kb = this.input.keyboard;
    if (kb.getKeyDown('Escape') || kb.getKeyDown('KeyP')) {
      if (state.screen === 'playing') {
        state.screen = 'paused';
      }
    }

    // VR B button for pause
    const right = this.input.xr.gamepads.right;
    if (right && right.getButtonDown(InputComponent.B_Button)) {
      if (state.screen === 'playing') {
        state.screen = 'paused';
      }
    }
  }
}
