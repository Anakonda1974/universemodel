import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';
import { GrassShader } from './grassShader.js';

/**
 * Professional 3D Soccer Pitch Component – Refactored 2025‑07‑09
 * -----------------------------------------------------------------------------
 * ✅  Correct, single‑source dimensions (FIFA‑compliant)
 * ✅  Clear length (X) vs width (Z) naming
 * ✅  Dead‑code removal & API cleanup
 * ✅  Radian rotations, no silent method clashes
 * ✅  Optional performance dials (segment density / batched markings)
 * -----------------------------------------------------------------------------
 */
export class SoccerPitch3D {
  /**
   * @param {THREE.WebGLRenderer|null} renderer – needed for GrassShader
   * @param {object} options
   *   @property {number} [scale=0.5]          – 1 = real size (105×68 m)
   *   @property {number} [segments=256]       – grass geometry subdivisions per side
   *   @property {boolean} [batchedLines=true] – collapse markings into one geometry
   */
  constructor(renderer = null, options = {}) {
    const {
      scale = 0.5,
      segments = 256,
      batchedLines = true
    } = options;

    /**
     * Dimensions use clear names:
     *  length  – goal to goal direction (X‑axis, FIFA 105 m)
     *  width   – sideline to sideline (Z‑axis, FIFA 68 m)
     */
    this.dimensions = {
      length: 105 * scale,
      width: 68 * scale,
      lineWidth: 0.12 * scale,

      // Goal dimensions
      goalWidth: 7.32 * scale,
      goalHeight: 2.44 * scale,
      goalDepth: 2 * scale,
      postRadius: 0.06 * scale,

      // Areas
      penaltyAreaDepth: 16.5 * scale,      // distance into field
      penaltyAreaWidth: 40.3 * scale,      // along goal line (Z)
      goalAreaDepth: 5.5 * scale,
      goalAreaWidth: 18.32 * scale,

      // Circle & spots
      centerCircleRadius: 9.15 * scale,
      cornerArcRadius: 1.0 * scale,
      penaltySpotFromGoal: 11 * scale,
    };

    this.group = new THREE.Group();

    // ───────────────────────────────── Grass & dirt materials
    this.grassShader = new GrassShader(renderer, this.dimensions.length, this.dimensions.width);
    this.materials = this._createMaterials();

    // ───────────────────────────────── Build pitch
    this._buildField(segments);
    this._buildMarkings(batchedLines);
    this._buildGoals();
    this._buildCornerFlags();
    this._buildCornerArcs();

    // debug helpers
    this._buildDebugHelpers();
  }

  /*───────────────────────────── PUBLIC API */
  addTo(scene) { scene.add(this.group); }

  /** Toggle debug helpers. Pass a boolean to force state. Returns new visibility. */
  toggleDebugHelpers(force) {
    if (!this.debugHelpers) return false;
    this.debugHelpers.visible = (typeof force === 'boolean') ? force : !this.debugHelpers.visible;
    return this.debugHelpers.visible;
  }

  /** World‑space bounds, handy for AI & collisions */
  getBounds() {
    const { length, width } = this.dimensions;
    return {
      minX: -length / 2,
      maxX: length / 2,
      minZ: -width / 2,
      maxZ: width / 2
    };
  }

  /** Grass interaction helpers – thin wrappers around GrassShader */
  recordPlayerActivity(x, z, activity = 'walk', intensity = 1) {
    this.grassShader.recordPlayerActivity(x, z, activity, intensity);
  }
  update(delta, windDir = { x: 1, y: 0.5 }, windPow = 0.02) {
    this.grassShader.update(delta, windDir, windPow);
  }
  getWearAt(x, z) { return this.grassShader.getWearAt(x, z); }
  resetWear() { this.grassShader.resetWear(); }

  /** Manual cleanup */
  dispose() {
    this.grassShader.dispose();
    this.group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material])
          .forEach(mat => mat.dispose?.());
      }
    });
  }

  /*───────────────────────────── INTERNAL BUILDERS */
  _createMaterials() {
    return {
      grass: this.grassShader.createGrassMaterial(),
      dirt: new THREE.MeshLambertMaterial({ color: 0x8b4513, roughness: 0.9 }),
      marking: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      goalPost: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 }),
      goalNet: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
      flagPole: new THREE.MeshStandardMaterial({ color: 0xffffff }),
      flag: new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
    };
  }

  /** Ground layers */
  _buildField(segments) {
    const { length, width } = this.dimensions;

    // Dirt base
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(length, width),
      this.materials.dirt
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.group.add(ground);

    // Grass overlay
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(length, width, segments, segments),
      this.materials.grass
    );
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.group.add(grass);
  }

  /** Lines & areas */
  _buildMarkings(batched) {
    const g = new THREE.BufferGeometry();
    const verts = [];
    const idx = [];
    const pushQuad = (x, z, w, h) => {
      const y = 0.02; // hover slightly
      const i = verts.length / 3;
      verts.push(
        x - w / 2, y, z - h / 2, // 0
        x + w / 2, y, z - h / 2, // 1
        x + w / 2, y, z + h / 2, // 2
        x - w / 2, y, z + h / 2  // 3
      );
      idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    };

    const addLine = (x, z, w, h) => batched ? pushQuad(x, z, w, h) : this.group.add(this._makeQuadMesh(x, z, w, h));

    const d = this.dimensions;
    // Outer lines
    addLine(0,  d.width / 2,  d.length, d.lineWidth); // top touch
    addLine(0, -d.width / 2,  d.length, d.lineWidth); // bottom touch
    addLine(-d.length / 2, 0, d.lineWidth, d.width); // left goal line
    addLine( d.length / 2, 0, d.lineWidth, d.width); // right goal line

    // Centre line & circle
    addLine(0, 0, d.lineWidth, d.width);
    this.group.add(this._ring(d.centerCircleRadius));
    this.group.add(this._spot(0, 0));

    // Penalty & goal areas (left & right)
    ['left', 'right'].forEach(side => {
      const sgn = side === 'left' ? -1 : 1;
      const xFront = sgn * (d.length / 2 - d.penaltyAreaDepth);
      const xFrontG = sgn * (d.length / 2 - d.goalAreaDepth);

      // Penalty rectangle
      addLine(xFront, 0, d.lineWidth, d.penaltyAreaWidth);
      addLine(xFront + sgn * d.penaltyAreaDepth / 2,  d.penaltyAreaWidth / 2, d.penaltyAreaDepth, d.lineWidth);
      addLine(xFront + sgn * d.penaltyAreaDepth / 2, -d.penaltyAreaWidth / 2, d.penaltyAreaDepth, d.lineWidth);

      // Goal rectangle
      addLine(xFrontG, 0, d.lineWidth, d.goalAreaWidth);
      addLine(xFrontG + sgn * d.goalAreaDepth / 2,  d.goalAreaWidth / 2, d.goalAreaDepth, d.lineWidth);
      addLine(xFrontG + sgn * d.goalAreaDepth / 2, -d.goalAreaWidth / 2, d.goalAreaDepth, d.lineWidth);

      // Spots
      const spotX = sgn * (d.length / 2 - d.penaltySpotFromGoal);
      this.group.add(this._spot(spotX, 0));
    });

    if (batched) {
      g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, this.materials.marking);
      mesh.rotation.x = -Math.PI / 2;
      this.group.add(mesh);
    }
  }

  _makeQuadMesh(x, z, w, h) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      this.materials.marking
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.02, z);
    return m;
  }

  _ring(radius) {
    const geo = new THREE.RingGeometry(radius - 0.05, radius, 64);
    const mesh = new THREE.Mesh(geo, this.materials.marking);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    return mesh;
  }

  _spot(x, z) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), this.materials.marking);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    return mesh;
  }

  /*───────────────────────────── Goals */
  _buildGoals() {
    const { length } = this.dimensions;
    const left = this._makeGoal();
    left.position.x = -length / 2;
    this.group.add(left);

    const right = this._makeGoal();
    right.position.x =  length / 2;
    right.rotation.y =  Math.PI; // face inward
    this.group.add(right);
  }

  _makeGoal() {
    const d = this.dimensions;
    const g = new THREE.Group();

    // Posts & crossbar
    const postGeo = new THREE.CylinderGeometry(d.postRadius, d.postRadius, d.goalHeight, 8);
    const crossGeo = new THREE.CylinderGeometry(d.postRadius, d.postRadius, d.goalWidth, 8);

    const lp = new THREE.Mesh(postGeo, this.materials.goalPost);
    const rp = lp.clone();
    const cb = new THREE.Mesh(crossGeo, this.materials.goalPost);

    lp.position.set(0, d.goalHeight / 2, -d.goalWidth / 2);
    rp.position.set(0, d.goalHeight / 2,  d.goalWidth / 2);
    cb.rotation.z = Math.PI / 2;
    cb.position.set(0, d.goalHeight, 0);

    g.add(lp, rp, cb);

    // Side & back frame
    const sideGeo = new THREE.CylinderGeometry(d.postRadius, d.postRadius, d.goalDepth, 8);
    const backGeo = new THREE.CylinderGeometry(d.postRadius, d.postRadius, d.goalWidth, 8);

    const tl = new THREE.Mesh(sideGeo, this.materials.goalPost);
    const tr = tl.clone();
    const bc = new THREE.Mesh(backGeo, this.materials.goalPost);

    tl.rotation.z = Math.PI / 2;
    tr.rotation.z = Math.PI / 2;
    tl.position.set(-d.goalDepth / 2, d.goalHeight, -d.goalWidth / 2);
    tr.position.set(-d.goalDepth / 2, d.goalHeight,  d.goalWidth / 2);
    bc.rotation.z = Math.PI / 2;
    bc.position.set(-d.goalDepth, d.goalHeight, 0);

    g.add(tl, tr, bc);

    // Net planes
    const netBack = this._makeNet(d.goalWidth, d.goalHeight);
    netBack.position.set(-d.goalDepth, d.goalHeight / 2, 0);
    netBack.rotation.y = Math.PI / 2;

    const netLeft = this._makeNet(d.goalDepth, d.goalHeight);
    netLeft.position.set(-d.goalDepth / 2, d.goalHeight / 2, -d.goalWidth / 2);
    netLeft.rotation.y = 0;

    const netRight = netLeft.clone();
    netRight.position.z = d.goalWidth / 2;
    netRight.rotation.y = Math.PI;

    g.add(netBack, netLeft, netRight);

    return g;
  }

  _makeNet(w, h) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.materials.goalNet);
    m.receiveShadow = false;
    return m;
  }

  /*───────────────────────────── Flags & Arcs */
  _buildCornerFlags() {
    const { length, width } = this.dimensions;
    const positions = [
      [-length / 2, -width / 2],
      [-length / 2,  width / 2],
      [ length / 2, -width / 2],
      [ length / 2,  width / 2]
    ];
    positions.forEach(([x, z]) => this.group.add(this._makeFlag(x, z)));
  }

  _makeFlag(x, z) {
    const flag = new THREE.Group();

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), this.materials.flagPole);
    pole.position.y = 0.75;

    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), this.materials.flag);
    cloth.position.set(0.15, 1.3, 0);

    flag.add(pole, cloth);
    flag.position.set(x, 0, z);
    return flag;
  }

  _buildCornerArcs() {
    const { length, width, cornerArcRadius } = this.dimensions;
    const arcs = [
      [-length / 2, -width / 2, -Math.PI / 2],
      [-length / 2,  width / 2, 0],
      [ length / 2, -width / 2, Math.PI],
      [ length / 2,  width / 2,  Math.PI / 2]
    ];
    arcs.forEach(([x, z, rot]) => {
      const arc = new THREE.Mesh(
        new THREE.RingGeometry(cornerArcRadius - 0.05, cornerArcRadius, 16, 1, 0, Math.PI / 2),
        this.materials.marking
      );
      arc.rotation.set(-Math.PI / 2, 0, rot);
      arc.position.set(x, 0.02, z);
      this.group.add(arc);
    });
  }

  /*───────────────────────────── Debug helpers (optional) */
  _buildDebugHelpers() {
    this.debugHelpers = new THREE.Group();
    this.debugHelpers.visible = false;

    // Axes lines
    const axisMat = new THREE.LineBasicMaterial({ linewidth: 3 });
    const makeAxis = (from, to, col) => {
      const g = new THREE.BufferGeometry().setFromPoints([from, to]);
      const m = axisMat.clone();
      m.color = new THREE.Color(col);
      const l = new THREE.Line(g, m);
      this.debugHelpers.add(l);
    };
    makeAxis(new THREE.Vector3(-this.dimensions.length / 2, 0.5, 0), new THREE.Vector3(this.dimensions.length / 2, 0.5, 0), 0xff0000); // X
    makeAxis(new THREE.Vector3(0, 0.5, -this.dimensions.width / 2), new THREE.Vector3(0, 0.5, this.dimensions.width / 2), 0x0000ff);  // Z
    makeAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5, 0), 0x00ff00);                                                    // Y

    this.group.add(this.debugHelpers);
  }
}
