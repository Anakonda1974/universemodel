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
    // Use a gentler friction so passes keep momentum longer
    this.friction = 0.998;
    this.spinFriction = 0.985;
    this.restitution = 0.7;
    this.owner = null;
    this.isLoose = true;
    this.lastTouch = null;
    this.outOfBounds = null;
  }

  kick(startX, startY, dirX, dirY, speed, spin = 0, kicker = null) {
    const dist = Math.hypot(dirX, dirY) || 1;
    this.owner = null;
    this.isLoose = true;
    this.lastTouch = kicker;
    this.vx = (dirX / dist) * speed;
    this.vy = (dirY / dist) * speed;
    this.angularVelocity = spin;
    this.x = startX;
    this.y = startY;
  }

  kickVelocity(startX, startY, vx, vy, kicker = null) {
  this.owner = null;
  this.isLoose = true;
  this.lastTouch = kicker;
  this.vx = vx;
  this.vy = vy;
  this.angularVelocity = 0;
  this.x = startX;
  this.y = startY;
}

  clampToField(bounds = FIELD_BOUNDS) {
    this.outOfBounds = null;
    if (this.x < bounds.minX) { this.x = bounds.minX; this.outOfBounds = 'left'; }
    if (this.x > bounds.maxX) { this.x = bounds.maxX; this.outOfBounds = 'right'; }
    if (this.y < bounds.minY) { this.y = bounds.minY; this.outOfBounds = 'top'; }
    if (this.y > bounds.maxY) { this.y = bounds.maxY; this.outOfBounds = 'bottom'; }
    if (this.outOfBounds) {
      this.vx = 0;
      this.vy = 0;
      this.angularVelocity = 0;
    }
  }

  update(delta, players = [], bounds = FIELD_BOUNDS, weather = {windX:0, windY:0, friction:this.friction}) {
    this.outOfBounds = null;
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

    const fric = weather.friction ?? this.friction;
    const decay = Math.pow(fric, delta * 60);
    this.vx *= decay;
    this.vy *= decay;
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
          this.lastTouch = p;
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
