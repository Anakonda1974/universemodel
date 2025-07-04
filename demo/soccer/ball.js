export const FIELD_BOUNDS = { minX: 15, maxX: 1035, minY: 15, maxY: 665 };

export class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0;
    this.radius = 6;
    this.mass = 0.43; // kg
    // Slightly lower friction so passes travel further
    this.friction = 0.98;
    this.spinFriction = 0.985;
    this.restitution = 0.7;
    this.owner = null;
    this.isLoose = true;
  }

  kick(startX, startY, dirX, dirY, speed, spin = 0) {
    const dist = Math.hypot(dirX, dirY) || 1;
    this.owner = null;
    this.isLoose = true;
    this.vx = (dirX / dist) * speed;
    this.vy = (dirY / dist) * speed;
    this.angularVelocity = spin;
    this.x = startX;
    this.y = startY;
  }

  clampToField(bounds = FIELD_BOUNDS) {
    if (this.x < bounds.minX) { this.x = bounds.minX; this.vx *= -this.restitution; }
    if (this.x > bounds.maxX) { this.x = bounds.maxX; this.vx *= -this.restitution; }
    if (this.y < bounds.minY) { this.y = bounds.minY; this.vy *= -this.restitution; }
    if (this.y > bounds.maxY) { this.y = bounds.maxY; this.vy *= -this.restitution; }
  }

  update(delta, players = [], bounds = FIELD_BOUNDS, weather = {windX:0, windY:0, friction:this.friction}) {
    if (this.owner) {
      // Ball follows owner (dribbling)
      const ang = this.owner.bodyDirection * Math.PI / 180;
      const offset = this.owner.currentAction === 'dribble' ? this.owner.radius + this.radius : 0;
      this.x = this.owner.x + Math.cos(ang) * offset;
      this.y = this.owner.y + Math.sin(ang) * offset;
      return;
    }

    // integrate motion
    this.x += this.vx * delta;
    this.y += this.vy * delta;

    // external forces
    if (weather.windX || weather.windY) {
      this.vx += weather.windX;
      this.vy += weather.windY;
    }

    // simple Magnus effect
    if (Math.abs(this.angularVelocity) > 0.0001) {
      const curve = this.angularVelocity;
      const ax = -this.vy * curve;
      const ay = this.vx * curve;
      this.vx += ax;
      this.vy += ay;
    }

    this.vx *= weather.friction ?? this.friction;
    this.vy *= weather.friction ?? this.friction;
    this.angularVelocity *= this.spinFriction;

    // check collision with players
    for (const p of players) {
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const dist = Math.hypot(dx, dy);
      const minDist = p.radius + this.radius;
      if (dist < minDist) {
        const nx = dx / dist;
        const ny = dy / dist;
        const relVel = this.vx * nx + this.vy * ny;

        // reflect velocity if the ball is moving towards the player
        if (relVel < 0) {
          this.vx -= 2 * relVel * nx;
          this.vy -= 2 * relVel * ny;
          this.vx *= this.restitution;
          this.vy *= this.restitution;
        }

        // reposition outside the player
        this.x = p.x + nx * minDist;
        this.y = p.y + ny * minDist;

        // if the ball slowed down enough, assume possession
        if (Math.hypot(this.vx, this.vy) < 0.6) {
          this.owner = p;
          this.isLoose = false;
          this.vx = 0;
          this.vy = 0;
          this.angularVelocity = 0;
          this.x = p.x;
          this.y = p.y;
        }
        return;
      }
    }

    this.clampToField(bounds);
  }
}
