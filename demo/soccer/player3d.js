import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';

export class Player3D {
  constructor(color=0x0000ff, x=0, y=0) {
    this.position = new THREE.Vector3(x, y, 0);
    this.velocity = new THREE.Vector3();
    this.speed = 5;
    this.radius = 0.3;

    const bodyGeo = new THREE.CapsuleGeometry(this.radius, 1.2, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color });
    this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  addTo(scene) {
    scene.add(this.mesh);
  }

  update(dt) {
    this.position.addScaledVector(this.velocity, dt);
    // simple friction
    this.velocity.multiplyScalar(0.9);
    this.mesh.position.copy(this.position);
  }
}
