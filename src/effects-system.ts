import {
  createSystem,
  Group,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Color,
  AdditiveBlending,
  Vector3,
} from '@iwsdk/core';
import { state, onEffectEvent, COLOR_SCHEMES, cubePos, PYRAMID_ROWS } from './game-state';
import type { EffectEvent } from './game-state';

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
}

export class EffectsSystem extends createSystem({}) {
  private particleGroup!: Group;
  private particles: Particle[] = [];
  private ambientOrbs: Mesh[] = [];

  init() {
    this.particleGroup = new Group();
    this.scene.add(this.particleGroup);
    onEffectEvent((evt: EffectEvent) => this.handleEffect(evt));
    this.createAmbientOrbs();
  }

  private createAmbientOrbs() {
    const cs = COLOR_SCHEMES[state.colorScheme];
    for (let i = 0; i < 15; i++) {
      const geo = new SphereGeometry(0.05 + Math.random() * 0.05, 6, 6);
      const mat = new MeshBasicMaterial({
        color: new Color(cs.accent),
        transparent: true,
        opacity: 0.4,
        blending: AdditiveBlending,
      });
      const orb = new Mesh(geo, mat);
      orb.position.set(
        (Math.random() - 0.5) * 8,
        Math.random() * 6,
        (Math.random() - 0.5) * 8
      );
      this.scene.add(orb);
      this.ambientOrbs.push(orb);
    }
  }

  private spawnParticles(x: number, y: number, z: number, count: number, color: number, speed: number) {
    const cs = COLOR_SCHEMES[state.colorScheme];
    for (let i = 0; i < count; i++) {
      const geo = new SphereGeometry(0.03, 4, 4);
      const mat = new MeshBasicMaterial({
        color: new Color(color || cs.target),
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.particleGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const upAngle = Math.random() * Math.PI * 0.5;
      const vel = new Vector3(
        Math.cos(angle) * Math.cos(upAngle) * speed,
        Math.sin(upAngle) * speed + Math.random() * speed * 0.5,
        Math.sin(angle) * Math.cos(upAngle) * speed
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
      });
    }
  }

  private handleEffect(evt: EffectEvent) {
    const cs = COLOR_SCHEMES[state.colorScheme];
    switch (evt.type) {
      case 'hop_land':
        this.spawnParticles(evt.x, evt.y, evt.z, 8, cs.target, 1);
        break;
      case 'death':
        this.spawnParticles(evt.x, evt.y, evt.z, 20, 0xff0000, 2);
        break;
      case 'round_complete':
        // Spawn particles at each cube
        for (let r = 0; r < PYRAMID_ROWS; r++) {
          for (let c = 0; c <= r; c++) {
            const pos = cubePos(r, c);
            this.spawnParticles(pos.x, pos.y + 0.3, pos.z, 3, cs.target, 1.5);
          }
        }
        break;
      case 'enemy_die':
        this.spawnParticles(evt.x, evt.y, evt.z, 12, 0xaa00ff, 1.5);
        break;
    }
  }

  update(delta: number, time: number) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particleGroup.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= delta * 2; // gravity
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      const mat = p.mesh.material as MeshBasicMaterial;
      mat.opacity = p.life / p.maxLife;
    }

    // Animate ambient orbs
    const cs = COLOR_SCHEMES[state.colorScheme];
    for (let i = 0; i < this.ambientOrbs.length; i++) {
      const orb = this.ambientOrbs[i];
      const offset = i * 0.7;
      orb.position.y += Math.sin(time * 0.5 + offset) * delta * 0.3;
      orb.position.x += Math.cos(time * 0.3 + offset) * delta * 0.1;
      // Wrap around
      if (orb.position.y > 7) orb.position.y = -1;
      if (orb.position.y < -1) orb.position.y = 7;
      const mat = orb.material as MeshBasicMaterial;
      mat.color.setHex(cs.accent);
      mat.opacity = 0.2 + Math.sin(time + offset) * 0.15;
    }
  }
}
