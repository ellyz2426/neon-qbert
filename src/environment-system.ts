import {
  createSystem,
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  AmbientLight,
  PointLight,
  DirectionalLight,
  AdditiveBlending,
  FogExp2,
} from '@iwsdk/core';
import { COLOR_SCHEMES, state } from './game-state';

export class EnvironmentSystem extends createSystem({}) {
  private envGroup!: Group;
  private floorMesh!: Mesh;
  private pillars: Mesh[] = [];
  private ceilingLights: PointLight[] = [];
  private glowPool!: Mesh;
  private pillarCaps: Mesh[] = [];

  init() {
    this.envGroup = new Group();
    this.scene.add(this.envGroup);

    // Fog for depth
    this.scene.fog = new FogExp2(0x000811, 0.04);

    // Ambient light
    const ambient = new AmbientLight(0x112244, 0.5);
    this.scene.add(ambient);

    // Main directional light
    const dirLight = new DirectionalLight(0x4488cc, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    this.createFloor();
    this.createPillars();
    this.createCeilingLights();
    this.createGlowPool();
  }

  private createFloor() {
    // Grid floor using wireframe box
    const floorGeo = new BoxGeometry(30, 0.01, 30);
    const floorMat = new MeshBasicMaterial({
      color: new Color(0x112233),
      transparent: true,
      opacity: 0.6,
      wireframe: true,
    });
    this.floorMesh = new Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, -0.5, 0);
    this.envGroup.add(this.floorMesh);

    // Solid dark floor underneath
    const solidGeo = new BoxGeometry(30, 0.005, 30);
    const solidMat = new MeshStandardMaterial({
      color: new Color(0x050510),
      transparent: true,
      opacity: 0.9,
    });
    const solidFloor = new Mesh(solidGeo, solidMat);
    solidFloor.position.set(0, -0.52, 0);
    this.envGroup.add(solidFloor);
  }

  private createPillars() {
    const cs = COLOR_SCHEMES[state.colorScheme];
    const positions = [
      [-6, 0, -6], [6, 0, -6], [-6, 0, 6], [6, 0, 6],
      [-3, 0, -8], [3, 0, -8], [-8, 0, 0], [8, 0, 0],
    ];

    for (const pos of positions) {
      // Pillar body - wireframe cylinder
      const geo = new CylinderGeometry(0.15, 0.15, 10, 6);
      const mat = new MeshBasicMaterial({
        color: new Color(cs.accent),
        transparent: true,
        opacity: 0.15,
        wireframe: true,
      });
      const pillar = new Mesh(geo, mat);
      pillar.position.set(pos[0], 4.5, pos[2]);
      this.envGroup.add(pillar);
      this.pillars.push(pillar);

      // Pillar cap - small glowing sphere
      const capGeo = new SphereGeometry(0.2, 8, 8);
      const capMat = new MeshBasicMaterial({
        color: new Color(cs.accent),
        transparent: true,
        opacity: 0.5,
        blending: AdditiveBlending,
      });
      const cap = new Mesh(capGeo, capMat);
      cap.position.set(pos[0], 9.5, pos[2]);
      this.envGroup.add(cap);
      this.pillarCaps.push(cap);
    }
  }

  private createCeilingLights() {
    const cs = COLOR_SCHEMES[state.colorScheme];
    const positions = [
      [0, 9, 0], [-4, 9, -4], [4, 9, -4], [-4, 9, 4], [4, 9, 4],
    ];

    for (const pos of positions) {
      const light = new PointLight(cs.accent, 0.5, 15);
      light.position.set(pos[0], pos[1], pos[2]);
      this.scene.add(light);
      this.ceilingLights.push(light);
    }
  }

  private createGlowPool() {
    // Floor glow pool under the pyramid
    const geo = new BoxGeometry(5, 0.005, 5);
    const mat = new MeshBasicMaterial({
      color: new Color(COLOR_SCHEMES[state.colorScheme].accent),
      transparent: true,
      opacity: 0.15,
      blending: AdditiveBlending,
    });
    this.glowPool = new Mesh(geo, mat);
    this.glowPool.position.set(0, -0.45, 1.5);
    this.envGroup.add(this.glowPool);
  }

  update(_delta: number, time: number) {
    const cs = COLOR_SCHEMES[state.colorScheme];

    // Pulse ceiling lights
    for (let i = 0; i < this.ceilingLights.length; i++) {
      const light = this.ceilingLights[i];
      light.intensity = 0.3 + Math.sin(time * 0.5 + i * 1.2) * 0.15;
      light.color.setHex(cs.accent);
    }

    // Pulse glow pool
    const poolMat = this.glowPool.material as MeshBasicMaterial;
    poolMat.opacity = 0.1 + Math.sin(time * 0.8) * 0.05;
    poolMat.color.setHex(cs.accent);

    // Update pillar colors
    for (const pillar of this.pillars) {
      (pillar.material as MeshBasicMaterial).color.setHex(cs.accent);
    }
    for (const cap of this.pillarCaps) {
      const capMat = cap.material as MeshBasicMaterial;
      capMat.color.setHex(cs.accent);
      capMat.opacity = 0.3 + Math.sin(time * 1.5) * 0.2;
    }

    // Subtle floor grid color update
    (this.floorMesh.material as MeshBasicMaterial).color.setHex(
      (cs.accent & 0xfefefe) >> 2
    );
  }
}
