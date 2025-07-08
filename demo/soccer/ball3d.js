import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';

export const GROUND_FRICTION = 0.998;
export const FIELD_BOUNDS = {
  minX: -10,
  maxX: 10,
  minY: -6.5,
  maxY: 6.5,
};

export class Ball3D {
  constructor(x = 0, y = 0, z = 0) {
    this.position = new THREE.Vector3(x, y, z);
    this.velocity = new THREE.Vector3();
    this.spin = 0;
    this.radius = 0.11; // meters
    this.restitution = 0.6;
    this.owner = null;
    this.lastTouch = null;
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

  clampToField(bounds = FIELD_BOUNDS) {
    if (this.position.x < bounds.minX) {
      this.position.x = bounds.minX;
      this.velocity.x = -this.velocity.x * this.restitution;
    }
    if (this.position.x > bounds.maxX) {
      this.position.x = bounds.maxX;
      this.velocity.x = -this.velocity.x * this.restitution;
    }
    if (this.position.y < bounds.minY) {
      this.position.y = bounds.minY;
      this.velocity.y = -this.velocity.y * this.restitution;
    }
    if (this.position.y > bounds.maxY) {
      this.position.y = bounds.maxY;
      this.velocity.y = -this.velocity.y * this.restitution;
    }
  }

  update(dt, players = []) {
    if (this.owner) {
      this.position.copy(this.owner.position);
      this.position.z = this.radius;
      this.mesh.position.copy(this.position);
      return;
    }

    // gravity on z axis
    this.velocity.z -= 9.81 * dt;

    // Magnus effect for simple spin curve
    if (Math.abs(this.spin) > 0.0001) {
      const curve = this.spin;
      const ax = -this.velocity.y * curve;
      const ay = this.velocity.x * curve;
      this.velocity.x += ax;
      this.velocity.y += ay;
    }

    this.position.addScaledVector(this.velocity, dt);

    // bounce on ground
    if (this.position.z < this.radius) {
      this.position.z = this.radius;
      if (this.velocity.z < 0) this.velocity.z = -this.velocity.z * this.restitution;
      const fric = Math.pow(GROUND_FRICTION, dt * 60);
      this.velocity.x *= fric;
      this.velocity.y *= fric;
      this.spin *= 0.985;
    }

    for (const p of players) {
      // Handle both Player3D objects (with mesh.position) and 2D players (with x, y)
      let playerPos;
      let playerRadius = 0.5; // Default radius
      let playerVelocity = new THREE.Vector3(0, 0, 0); // Default velocity

      if (p && p.mesh && p.mesh.position) {
        // Player3D object
        playerPos = p.mesh.position;
        playerRadius = p.radius || 0.5;
        playerVelocity = p.velocity || new THREE.Vector3(0, 0, 0);
      } else if (p && typeof p.x === 'number' && typeof p.y === 'number') {
        // 2D player object - convert to 3D coordinates
        const x3d = (p.x - 525) / 20; // Center and scale
        const z3d = -(p.y - 340) / 20; // Center, scale, and flip Z
        playerPos = new THREE.Vector3(x3d, 0, z3d);
        playerRadius = p.radius || 0.5;
        playerVelocity = new THREE.Vector3(0, 0, 0);
      } else {
        // Skip invalid player objects
        continue;
      }

      const dx = this.position.x - playerPos.x;
      const dz = this.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      const minDist = playerRadius + this.radius;

      if (dist < minDist && this.position.y < playerRadius * 2) {
        const normal = new THREE.Vector3(dx, 0, dz).normalize();
        this.position.x = playerPos.x + normal.x * minDist;
        this.position.z = playerPos.z + normal.z * minDist;

        const rel = this.velocity.clone().sub(playerVelocity);
        const impact = rel.dot(normal);
        if (impact < 0) {
          this.velocity.addScaledVector(normal, -impact * (1 + this.restitution));
        }
        if (this.velocity.length() < 0.5) {
          this.owner = p;
          this.lastTouch = p;
          this.velocity.set(0, 0, 0);
          this.spin = 0;
        }
      }
    }

    this.clampToField();

    this.mesh.position.copy(this.position);
  }

  kick(dir, power = 12, spin = 0, kicker = null) {
    const impulse = dir.clone().normalize().multiplyScalar(power);
    this.velocity.copy(impulse);
    if (this.velocity.z === 0) this.velocity.z = 0.2 * power;
    this.spin = spin;
    this.owner = null;
    this.lastTouch = kicker;
  }
}
