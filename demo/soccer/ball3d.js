import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';

export const GROUND_FRICTION = 0.998;

export class Ball3D {
  constructor(x=0, y=0, z=0) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3();
    this.radius = 0.11; // meters
    this.restitution = 0.6;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  addTo(scene) {
    scene.add(this.mesh);
  }

  update(dt) {
    // gravity on z axis
    this.velocity.z -= 9.81 * dt;

    this.position.addScaledVector(this.velocity, dt);

    // bounce on ground
    if (this.position.z < this.radius) {
      this.position.z = this.radius;
      if (this.velocity.z < 0) this.velocity.z = -this.velocity.z * this.restitution;
      // friction on ground (scale with dt for consistent slowdown)
      const fric = Math.pow(GROUND_FRICTION, dt * 60);
      this.velocity.x *= fric;
      this.velocity.y *= fric;
    }

    this.mesh.position.copy(this.position);
  }

  kick(dir, power=12) {
    const impulse = dir.clone().normalize().multiplyScalar(power);
    this.velocity.add(impulse);
  }
}
