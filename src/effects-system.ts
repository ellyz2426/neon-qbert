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
import type { EffectEvent, PowerUpType } from './game-state';

interface Particle {
  mesh: Mesh;
  velocity: Vector3;
  life: number;
  maxLife: number;
}

function powerUpEffectColor(type: PowerUpType): number {
  switch (type) {
    case 'shield': return 0x4488ff;
    case 'scoreboost': return 0xffcc00;
    case 'freeze': return 0x88ffff;
  }
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
    // More orbs at higher rounds
    const orbCount = 15 + Math.min(state.round, 10) * 2;
    // Clean up old orbs
    for (const orb of this.ambientOrbs) {
      this.scene.remove(orb);
    }
    this.ambientOrbs = [];

    for (let i = 0; i < orbCount; i++) {
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
    for (let i = 0; i < count; i++) {
      const geo = new SphereGeometry(0.03, 4, 4);
      const mat = new MeshBasicMaterial({
        color: new Color(color),
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

  private spawnTrailParticle(x: number, y: number, z: number) {
    const cs = COLOR_SCHEMES[state.colorScheme];
    const geo = new SphereGeometry(0.025, 4, 4);
    const mat = new MeshBasicMaterial({
      color: new Color(cs.target),
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.particleGroup.add(mesh);

    // Trail particles drift slowly downward and fade
    const vel = new Vector3(
      (Math.random() - 0.5) * 0.2,
      -0.3 - Math.random() * 0.2,
      (Math.random() - 0.5) * 0.2
    );

    this.particles.push({
      mesh,
      velocity: vel,
      life: 0.4,
      maxLife: 0.4,
    });
  }

  private spawnRingBurst(x: number, y: number, z: number, count: number, color: number, radius: number) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const geo = new SphereGeometry(0.04, 4, 4);
      const mat = new MeshBasicMaterial({
        color: new Color(color),
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.particleGroup.add(mesh);

      const vel = new Vector3(
        Math.cos(angle) * radius * 3,
        0.5 + Math.random() * 0.5,
        Math.sin(angle) * radius * 3
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 0.8,
        maxLife: 0.8,
      });
    }
  }

  private spawnScorePopup(x: number, y: number, z: number) {
    // Cluster of golden particles that float upward to represent score gain
    for (let i = 0; i < 5; i++) {
      const geo = new SphereGeometry(0.04 + i * 0.008, 6, 6);
      const mat = new MeshBasicMaterial({
        color: new Color(0xffdd44),
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(geo, mat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.15, y + i * 0.06, z);
      this.particleGroup.add(mesh);

      const vel = new Vector3(
        (Math.random() - 0.5) * 0.3,
        1.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.2
      );

      this.particles.push({
        mesh,
        velocity: vel,
        life: 1.0,
        maxLife: 1.0,
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
        this.spawnParticles(evt.x, evt.y, evt.z, 25, 0xff0000, 2.5);
        // Additional red ring burst on death
        this.spawnRingBurst(evt.x, evt.y, evt.z, 12, 0xff4400, 0.5);
        break;
      case 'round_complete':
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
      case 'powerup_collect':
        {
          const color = powerUpEffectColor(evt.powerUpType);
          // Big burst + ring
          this.spawnParticles(evt.x, evt.y, evt.z, 20, color, 2);
          this.spawnRingBurst(evt.x, evt.y, evt.z, 16, color, 0.6);
        }
        break;
      case 'combo':
        {
          // Golden upward burst, bigger with higher combos
          const count = Math.min(evt.combo * 4, 24);
          this.spawnParticles(evt.x, evt.y, evt.z, count, 0xffcc00, 1 + evt.combo * 0.3);
        }
        break;
      case 'hop_trail':
        // Small glowing trail particle
        this.spawnTrailParticle(evt.x, evt.y, evt.z);
        break;
      case 'round_wave':
        // Golden upward fountain per cube
        this.spawnParticles(evt.x, evt.y, evt.z, 6, 0xffcc00, 1.2);
        break;
      case 'score_popup':
        // Score popup: rising golden glow particles in a cluster to indicate points gained
        this.spawnScorePopup(evt.x, evt.y, evt.z);
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
      // Faster movement at higher rounds
      const speedMult = 1 + Math.min(state.round, 10) * 0.1;
      orb.position.y += Math.sin(time * 0.5 * speedMult + offset) * delta * 0.3;
      orb.position.x += Math.cos(time * 0.3 * speedMult + offset) * delta * 0.1;
      // Wrap around
      if (orb.position.y > 7) orb.position.y = -1;
      if (orb.position.y < -1) orb.position.y = 7;
      const mat = orb.material as MeshBasicMaterial;
      mat.color.setHex(cs.accent);
      mat.opacity = 0.2 + Math.sin(time + offset) * 0.15;
    }

    // Limit total particles to avoid performance issues
    if (this.particles.length > 200) {
      const excess = this.particles.length - 200;
      for (let i = 0; i < excess; i++) {
        const p = this.particles[0];
        this.particleGroup.remove(p.mesh);
        this.particles.shift();
      }
    }
  }
}
