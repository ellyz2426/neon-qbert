import { World } from '@iwsdk/core';
import { GameSystem } from './game-system';
import { RenderSystem } from './render-system';
import { InputSystem } from './input-system';
import { UISystem } from './ui-system';
import { AudioSystem } from './audio-system';
import { EffectsSystem } from './effects-system';
import { EnvironmentSystem } from './environment-system';

async function main() {
  const container = document.getElementById('scene-container') as HTMLDivElement;
  const world = await World.create(container, {
    xr: { offer: 'once' },
    render: {
      near: 0.1,
      far: 200,
      camera: { position: [2, 5.5, 5], lookAt: [0, 1.2, 1.2] },
    },
    input: { canvasPointerEvents: true },
    features: {
      locomotion: false,
    },
  });

  world.registerSystem(EnvironmentSystem);
  world.registerSystem(GameSystem);
  world.registerSystem(RenderSystem);
  world.registerSystem(InputSystem);
  world.registerSystem(AudioSystem);
  world.registerSystem(EffectsSystem);
  world.registerSystem(UISystem);
}

main().catch(console.error);
