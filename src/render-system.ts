import {
  createSystem,
  Group,
  Mesh,
  BoxGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  AdditiveBlending,
} from '@iwsdk/core';
import { state, cubePos, PYRAMID_ROWS, CUBE_SIZE, PILLAR_HEIGHT, COLOR_SCHEMES } from './game-state';

// Render system handles visual effects: cube edge glow, ambient cube pulsing
export class RenderSystem extends createSystem({}) {
  private edgeGroup!: Group;
  private edgeMeshes: Mesh[] = [];
  private glowTime = 0;

  init() {
    this.edgeGroup = new Group();
    this.scene.add(this.edgeGroup);
    this.buildEdges();
  }

  private buildEdges() {
    // Remove old
    for (const m of this.edgeMeshes) this.edgeGroup.remove(m);
    this.edgeMeshes = [];

    const cs = COLOR_SCHEMES[state.colorScheme];
    for (let r = 0; r < PYRAMID_ROWS; r++) {
      for (let c = 0; c <= r; c++) {
        const pos = cubePos(r, c);
        // Wireframe outline using thin boxes for edges (neon glow effect)
        const edgeSize = CUBE_SIZE + 0.02;
        const geo = new BoxGeometry(edgeSize, PILLAR_HEIGHT + 0.02, edgeSize);
        const mat = new MeshBasicMaterial({
          color: new Color(cs.accent),
          transparent: true,
          opacity: 0.3,
          wireframe: true,
        });
        const mesh = new Mesh(geo, mat);
        mesh.position.set(pos.x, pos.y, pos.z);
        this.edgeGroup.add(mesh);
        this.edgeMeshes.push(mesh);
      }
    }
  }

  update(delta: number, time: number) {
    this.glowTime = time;

    // Pulse edge glow
    const pulse = 0.2 + Math.sin(time * 2) * 0.1;
    const cs = COLOR_SCHEMES[state.colorScheme];

    for (let i = 0; i < this.edgeMeshes.length; i++) {
      const mesh = this.edgeMeshes[i];
      const mat = mesh.material as MeshBasicMaterial;
      mat.opacity = pulse;

      // Update edge color to match current scheme
      mat.color.setHex(cs.accent);

      // Position edges to match cubes (in case pyramid was rebuilt)
      if (i < state.cubes.length) {
        const cube = state.cubes[i];
        const pos = cubePos(cube.row, cube.col);
        mesh.position.set(pos.x, pos.y, pos.z);
      }
    }

    // Rebuild edges if count changed
    if (this.edgeMeshes.length !== state.cubes.length) {
      this.buildEdges();
    }
  }
}
