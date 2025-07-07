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
    // Use proper friction for realistic ball physics
    this.friction = 0.985;
    this.spinFriction = 0.985;
    this.restitution = 0.7;
    this.owner = null;
    this.isLoose = true;
    this.lastTouch = null;
    this.outOfBounds = null;
  }

  kick(startX, startY, dirX, dirY, speed, spin = 0, kicker = null) {
    const dist = Math.hypot(dirX, dirY) || 1;

    // Set cooldown to prevent immediate re-possession by the same player
    if (this.owner) {
      this.owner.ballCooldown = 1.0; // 1 second cooldown
      this.lastKicker = this.owner;
      console.log(`${this.owner.role} cooldown set: 1.0s`);
    }

    this.owner = null;
    this.isLoose = true;
    this.lastTouch = kicker;
    this.vx = (dirX / dist) * speed;
    this.vy = (dirY / dist) * speed;
    this.angularVelocity = spin;
    this.x = startX;
    this.y = startY;

    // Debug: Log initial velocity
    const initialSpeed = Math.hypot(this.vx, this.vy);
    console.log(`Ball kicked: speed=${speed}, vx=${this.vx.toFixed(1)}, vy=${this.vy.toFixed(1)}, initialSpeed=${initialSpeed.toFixed(1)}`);
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

    // Debug: Log friction effect occasionally
    const speedBefore = Math.hypot(this.vx, this.vy);
    if (speedBefore > 1 && Math.random() < 0.01) {
      console.log(`Ball friction: speedBefore=${speedBefore.toFixed(1)}, friction=${fric}, decay=${decay.toFixed(4)}, delta=${delta.toFixed(3)}`);
    }

    this.vx *= decay;
    this.vy *= decay;
    this.angularVelocity *= this.spinFriction;

    // Debug: Log speed after friction
    const speedAfter = Math.hypot(this.vx, this.vy);
    if (speedBefore > 1 && Math.random() < 0.01) {
      console.log(`Ball after friction: speedAfter=${speedAfter.toFixed(1)}, speedLoss=${((speedBefore - speedAfter) / speedBefore * 100).toFixed(1)}%`);
    }

    // Enhanced ball possession logic
    for (const p of players) {
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const dist = Math.hypot(dx, dy);
      const possessionRadius = p.radius + this.radius + 3; // Slightly larger radius for easier possession

      if (dist < possessionRadius) {
        const ballSpeed = Math.hypot(this.vx, this.vy);

        // Enhanced possession logic
        if (this.shouldTakePossession(p, ballSpeed, dist)) {
          // Player takes possession
          this.owner = p;
          this.isLoose = false;
          this.lastTouch = p;
          this.vx = 0;
          this.vy = 0;
          this.angularVelocity = 0;
          this.lastKicker = null; // Clear last kicker when someone else takes possession

          // Position ball slightly in front of player
          const playerAngle = (p.bodyDirection || 0) * Math.PI / 180;
          this.x = p.x + Math.cos(playerAngle) * (p.radius + this.radius + 1);
          this.y = p.y + Math.sin(playerAngle) * (p.radius + this.radius + 1);

          console.log(`${p.role} takes possession (speed=${ballSpeed.toFixed(1)}, dist=${dist.toFixed(1)})`);
          return;
        } else if (ballSpeed > 2.0) {
          // Ball bounces off player if moving fast and not controlled
          const nx = dx / dist;
          const ny = dy / dist;
          const relVel = this.vx * nx + this.vy * ny;

          if (relVel < 0) {
            // Calculate bounce with more energy loss
            this.vx -= 1.2 * relVel * nx;
            this.vy -= 1.2 * relVel * ny;
            this.vx *= this.restitution * 0.6; // Much more energy loss on bounce
            this.vy *= this.restitution * 0.6;

            // Reposition ball outside player
            this.x = p.x + nx * possessionRadius;
            this.y = p.y + ny * possessionRadius;

            console.log(`Ball bounced off ${p.role} (speed=${ballSpeed.toFixed(1)})`);
          }
        }
      }
    }

    this.clampToField(bounds);
  }

  // Enhanced possession decision logic
  shouldTakePossession(player, ballSpeed, distance) {
    // Check cooldown - player who just kicked can't immediately retake possession
    if (player.ballCooldown > 0) {
      if (Math.random() < 0.01) { // Debug occasionally
        console.log(`${player.role} blocked by cooldown: ${player.ballCooldown.toFixed(2)}s remaining`);
      }
      return false;
    }

    if (this.lastKicker === player) {
      if (Math.random() < 0.01) { // Debug occasionally
        console.log(`${player.role} blocked: was last kicker`);
      }
      return false;
    }

    // TESTING: Make possession easier for testing but more realistic
    const technique = 1.0; // Perfect technique for testing
    const awareness = 1.0; // Perfect awareness for testing

    // Base possession ability
    const baseSkill = (technique * 0.6 + awareness * 0.4);

    // Distance factor - closer = easier
    const distanceFactor = Math.max(0.2, 1 - (distance - player.radius - this.radius) / 15);

    // Speed factor - slower balls easier to control (more restrictive)
    const speedFactor = ballSpeed < 1.5 ? 1.0 : Math.max(0.2, 1 - (ballSpeed - 1.5) / 50);

    // Stamina factor
    const staminaFactor = 1.0; // Perfect stamina for testing

    // Player action factor - tackling players more likely to win ball
    const actionFactor = player.currentAction === 'tackle' ? 1.5 : 1.0;

    // Final possession probability
    const possessionChance = baseSkill * distanceFactor * speedFactor * staminaFactor * actionFactor;

    // More restrictive possession thresholds
    if (ballSpeed < 0.8) return possessionChance > 0.4; // Easy for very slow balls
    if (ballSpeed < 3.0) return possessionChance > 0.7; // Moderate for medium speed
    return possessionChance > 0.9; // Very hard for fast balls
  }

  // Calculate a player's ability to cleanly receive the ball
  calculateReceivingAbility(player, ballSpeed) {
    // Base receiving ability from player stats
    const technique = player.derived?.passingAccuracy || player.base?.technique || 0.5;
    const reaction = player.base?.reaction || 0.5;
    const vision = player.base?.vision || 0.5;

    // Combine stats for overall receiving skill
    const baseSkill = (technique * 0.5 + reaction * 0.3 + vision * 0.2);

    // Stamina factor - tired players make more mistakes
    const staminaFactor = Math.max(0.3, player.stamina || 1);

    // Speed factor - harder to receive fast balls cleanly
    const speedFactor = Math.max(0.1, 1 - (ballSpeed / 400)); // Harder as speed approaches 400

    // Body orientation factor - easier to receive when facing the ball
    const ballAngle = Math.atan2(this.y - player.y, this.x - player.x);
    const playerAngle = (player.bodyDirection || 0) * Math.PI / 180;
    const angleDiff = Math.abs(((ballAngle - playerAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
    const orientationFactor = 0.5 + 0.5 * Math.cos(angleDiff); // 0.5 to 1.0

    // Final reception probability
    const receptionSkill = baseSkill * staminaFactor * speedFactor * orientationFactor;

    return Math.max(0.05, Math.min(0.95, receptionSkill)); // Clamp between 5% and 95%
  }
}
