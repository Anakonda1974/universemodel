import { Capabilities } from "./capabilities.js";
import { createPlayerBT } from "./footBallBTs.js";
import { computeEllipseRadii, getTargetZoneCenter, interpolate } from "./TacticsHelper.js";
import { getDynamicZone } from "./decision-rules.js";
import { FIELD_BOUNDS } from "./ball.js";
import { TraitProfiles, getTraitProfile } from "./traitConfig.js";

function getPositionMultipliers(pos) {
  switch (pos) {
    case "ST":
      return { shootingAccuracy: 1.2, tacklingSkill: 0.8 };
    case "IV":
      return { tacklingSkill: 1.3, topSpeed: 0.9 };
    case "ZM":
      return { passingAccuracy: 1.15, shootingPower: 0.95 };
    // ...
    default:
      return {};
  }
}

export class Player {
  constructor(x, y, color = "#0000ff", options = {}) {
    // --- Spielfeld & Rendering ---
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.color = color;

    // --- Basiswerte (roh, meist 0..1) ---
    this.base = {
      athleticism: options.athleticism ?? Math.random(),
      speed: options.speed ?? Math.random(),
      intelligence: options.intelligence ?? Math.random(),
      technique: options.technique ?? Math.random(),
      mentality: options.mentality ?? Math.random(),
      fitness: options.fitness ?? Math.random(),
      stamina: options.stamina ?? Math.random(),
      reaction: options.reaction ?? Math.random(),
      vision: options.vision ?? Math.random(),
      workrate: options.workrate ?? Math.random(),
      ...options.baseStats,
    };

    // --- Spielerprofil / Trait (Sniper, Wall, Engine, Playmaker...) ---
    this.trait = options.trait || null;
    this.position = options.position || "ST"; // Default Stürmer

    // --- Erfahrungssystem ---
    this.xp = {
      passing: 0,
      shooting: 0,
      tackling: 0,
      vision: 0,
      fitness: 0,
      // ...
    };

    // --- Derived (abgeleitete) Eigenschaften: ---
    this.derived = {};
    this.positionMultipliers = getPositionMultipliers(this.position);
    this.updateDerived();

    // --- State ---
    this.bodyDirection = 0;
    this.headDirection = 0;
    this.fovAngle = 120;
    this.perceptionRange = 380;
    this.targetX = x;
    this.targetY = y;
    this.formationX = x;
    this.formationY = y;
    this.hasBall = false;
    this.stamina = this.base.stamina ?? 1;
    // Taktische Intensität (z.B. Pressing-Level)
    this.pressing = 1;
    this.phase = 'neutral';

    // --- KI / Perception / Memory ---
    this.perceived = {};
    this.memory = { ball: { x: null, y: null, lastSeen: -Infinity, confidence: 0 } };
    this.mailbox = [];
    this.bt = createPlayerBT();
    this.controlledByUser = false;

    // Verletzungen
    this.injured = false;
    this.injuryRecovery = 0; // Sekunden bis zur Genesung

    // Kurzer Highlight-Effekt nach Fouls
    this.highlightTimer = 0;

    // Tackling/Sliding
    this.tackleCooldown = 0;
    this.sliding = false;
    this.slideTimer = 0;
    this.slideDirX = 0;
    this.slideDirY = 0;
    this.slideSpeed = 0;

    this.preferredFoot = options.preferredFoot || (Math.random() < 0.5 ? "left" : "right");
    this.fluidity = options.fluidity ?? Math.random();
    this.dribbleSide = this.preferredFoot;
    this.heatmap = [];
    this.totalDistance = 0;
    this.startStamina = this.stamina ?? 1;
    this.endStamina = null;

    // Bewegungsgeschwindigkeit (für Interpolation)
    this.vx = 0;
    this.vy = 0;

    // --- Decision-Timing (Awareness-Skill steuert Intervall) ---
    this.lastDecision = 0;
    this.reactionInterval = 300 + (1 - this.derived.awareness) * 400; // dynamisch

    // --- Capabilities ---
    this.capabilities = { ...Capabilities }; // oder rollen-/trait-spezifisch
  }

  // --- Abgeleitete Werte aktualisieren (immer nach XP-Gewinn o. Trait-Wechsel!) ---
  updateDerived() {
    const b = this.base;
    const t = this.getTraitBonus();
    // Beispielhaft einige abgeleitete Werte:
    this.derived.acceleration = b.athleticism * 0.6 + b.fitness * 0.2 + b.speed * 0.2 + (t.acceleration ?? 0);
    this.derived.topSpeed = b.athleticism * 0.4 + b.fitness * 0.3 + b.speed * 0.3 + (t.topSpeed ?? 0);
    this.derived.bodyTurnRate = b.athleticism * 0.3 + b.technique * 0.5 + (t.bodyTurnRate ?? 0);
    this.derived.headTurnRate = b.vision * 0.6 + b.reaction * 0.4 + (t.headTurnRate ?? 0);
    this.derived.shootingPower = b.technique * 0.5 + b.athleticism * 0.4 + (t.shootingPower ?? 0);
    this.derived.shootingAccuracy = b.technique * 0.5 + b.intelligence * 0.3 + (t.shootingAccuracy ?? 0);
    this.derived.passingPower = b.technique * 0.4 + b.intelligence * 0.5 + (t.passingPower ?? 0);
    this.derived.passingAccuracy = b.technique * 0.5 + b.vision * 0.3 + b.intelligence * 0.2 + (t.passingAccuracy ?? 0);
    this.derived.dribblingSkill = b.technique * 0.5 + b.vision * 0.2 + b.fitness * 0.2 + (t.dribblingSkill ?? 0);
    this.derived.tacklingSkill = b.technique * 0.4 + b.mentality * 0.4 + b.athleticism * 0.2 + (t.tacklingSkill ?? 0);
    this.derived.awareness = b.vision * 0.5 + b.intelligence * 0.5 + (t.awareness ?? 0);
    this.derived.balance = b.athleticism * 0.3 + b.mentality * 0.7 + (t.balance ?? 0);

    // --- Positionsbonus anwenden ---
    for (const prop in this.positionMultipliers) {
      if (this.derived[prop]) {
        this.derived[prop] *= this.positionMultipliers[prop];
      }
    }
  }

  static getAllowedZone(player) {
    // These must match decision-rules.js
    let marginX = 20,
      marginY = 15;
    let width = 160,
      height = 180;

    switch (player.role) {
      case "TW":
        width = 80;
        height = 140;
        break;
      case "IV":
      case "LIV":
      case "RIV":
        width = 110;
        height = 190;
        break;
      case "LV":
      case "RV":
        width = 135;
        height = 220;
        break;
      case "DM":
        width = 170;
        height = 210;
        break;
      case "ZM":
      case "OM":
        width = 270;
        height = 220;
        break;
      case "LM":
      case "RM":
        width = 250;
        height = 270;
        break;
      case "LF":
      case "RF":
        width = 320;
        height = 210;
        break;
      case "ST":
        width = 320;
        height = 230;
        break;
      default:
        width = 170;
        height = 200;
        break;
    }
    // Widen each role's zone to ensure the team collectively covers its half
    width += 200;
    height += 80;
    const minX = Math.max(marginX, player.formationX - width / 2);
    const maxX = Math.min(1050 - marginX, player.formationX + width / 2);
    const minY = Math.max(marginY, player.formationY - height / 2);
    const maxY = Math.min(680 - marginY, player.formationY + height / 2);

    return { minX, maxX, minY, maxY };
  }

  static clampToZone(x, y, zone) {
    const cx = Math.max(zone.minX, Math.min(zone.maxX, x));
    const cy = Math.max(zone.minY, Math.min(zone.maxY, y));
    return Player.clampToField(cx, cy);
  }

  static clampToRect(x, y, zone, margin = 0) {
    const rx = Math.max(zone.x - margin, Math.min(zone.x + zone.width + margin, x));
    const ry = Math.max(zone.y - margin, Math.min(zone.y + zone.height + margin, y));
    return Player.clampToField(rx, ry);
  }

  static clampToField(x, y, bounds = FIELD_BOUNDS) {
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, y)),
    };
  }

  static getDynamicTargetZone(player, ball, coach) {
    const pressing = coach ? coach.pressing : 1;
    const zoneParams = coach ? coach.getZoneParameters(player.role) : null;
    const awareness = player.derived?.awareness ?? 0.5;
    const base = { x: player.formationX, y: player.formationY };
    const center = ball
      ? interpolate(base, { x: ball.x, y: ball.y }, 0.1 + 0.1 * awareness)
      : base;
    const radii = computeEllipseRadii(player.role, pressing, zoneParams);
    if ((player.derived?.dribblingSkill ?? 0) > 0.7) radii.rx *= 1.2;
    return { x: center.x, y: center.y, rx: radii.rx, ry: radii.ry };
  }

  // --- Boni/Mali aus Trait-System holen ---
  getTraitBonus() {
    const traitProfile = TraitProfiles[this.trait];
    if (!traitProfile) return {};

    // Combine bonuses and penalties into a single object
    const combined = {};

    // Add bonuses
    if (traitProfile.bonuses) {
      Object.assign(combined, traitProfile.bonuses);
    }

    // Add penalties (they're already negative values)
    if (traitProfile.penalties) {
      for (const [stat, penalty] of Object.entries(traitProfile.penalties)) {
        combined[stat] = (combined[stat] || 0) + penalty;
      }
    }

    return combined;
  }

  // --- Erfahrung steigern ---
  gainXP(skill, amount) {
    if (!this.xp[skill]) this.xp[skill] = 0;
    this.xp[skill] += amount;
    // Optional: Level-Up (z. B. alle 100 XP steigt entsprechender Basiswert leicht)
    // z. B.:
    if (this.xp[skill] % 100 === 0) {
      this.base[skill] = Math.min(1, this.base[skill] + 0.01);
      this.updateDerived();
    }
  }

  // --- Capabilities verwenden (BT-Aufruf!) ---
  do(action, ...args) {
    if (this.capabilities[action]) {
      this.capabilities[action](this, ...args);
    }
  }

  maybeDecide(now, world, gameState) {
    this.processMessages();

    // Store world data for continuous positioning
    this.lastWorld = world;
    this.lastUpdateTime = now;

    if (this.controlledByUser) return;

    // Continuous positioning updates (faster than decision making)
    this.updateContinuousPositioning(world);

    if (now - this.lastDecision > this.reactionInterval) {
      this.lastDecision = now;
      this.bt.tick(this, world); // Behavior Tree entscheidet Ziel/Aktion
      const angle = (Math.atan2(world.ball.y - this.y, world.ball.x - this.x) * 180) / Math.PI;
      this.smoothTurnHeadTo(angle, this.derived.headTurnRate ?? 12);
    }
  }

  // Continuous positioning updates for ball-focused gameplay
  updateContinuousPositioning(world) {
    if (!world || !world.ball) return;

    // Update spatial awareness every frame
    this.updateSpatialAwareness(world);

    // Adjust positioning based on ball movement
    this.adjustToBallMovement(world);

    // Maintain optimal distances from teammates and opponents
    this.maintainOptimalSpacing(world);

    // Update body orientation toward ball
    this.adjustBodyOrientationToBall(world.ball);
  }

  // Update awareness of nearby players and ball
  updateSpatialAwareness(world) {
    // Track nearby teammates
    this.nearbyTeammates = world.teammates.filter(t =>
      t !== this && Math.hypot(this.x - t.x, this.y - t.y) < 50
    );

    // Track nearby opponents
    this.nearbyOpponents = (world.opponents || []).filter(o =>
      Math.hypot(this.x - o.x, this.y - o.y) < 50
    );

    // Update ball awareness
    const ballDistance = Math.hypot(this.x - world.ball.x, this.y - world.ball.y);
    this.ballAwareness = {
      distance: ballDistance,
      canReach: ballDistance < 15,
      inRange: ballDistance < 30,
      direction: Math.atan2(world.ball.y - this.y, world.ball.x - this.x)
    };

    // Track ball movement
    if (this.lastBallPosition) {
      this.ballMovement = {
        x: world.ball.x - this.lastBallPosition.x,
        y: world.ball.y - this.lastBallPosition.y
      };
    }
    this.lastBallPosition = { x: world.ball.x, y: world.ball.y };
  }

  // Adjust positioning based on ball movement
  adjustToBallMovement(world) {
    if (!this.ballMovement) return;

    const ballSpeed = Math.hypot(this.ballMovement.x, this.ballMovement.y);

    if (ballSpeed > 2) { // Ball is moving significantly
      // Predict ball future position
      const predictionTime = 1.0; // 1 second ahead
      const predictedBall = {
        x: world.ball.x + this.ballMovement.x * predictionTime,
        y: world.ball.y + this.ballMovement.y * predictionTime
      };

      // Adjust position to intercept or support based on role
      const roleResponse = this.calculateRoleResponseToBallMovement(predictedBall, world);

      // Apply small adjustment toward predicted position
      const adjustmentStrength = 0.1;
      this.targetX += roleResponse.x * adjustmentStrength;
      this.targetY += roleResponse.y * adjustmentStrength;
    }
  }

  // Calculate role-specific response to ball movement
  calculateRoleResponseToBallMovement(predictedBall, world) {
    const toPredicted = {
      x: predictedBall.x - this.x,
      y: predictedBall.y - this.y
    };

    // Role-based response intensity
    const responseIntensity = {
      'ST': 0.8, 'LS': 0.7, 'RS': 0.7,
      'OM': 0.6, 'LF': 0.6, 'RF': 0.6,
      'ZM': 0.4, 'LM': 0.5, 'RM': 0.5,
      'DM': 0.3, 'IV': 0.2, 'LIV': 0.2, 'RIV': 0.2,
      'LV': 0.3, 'RV': 0.3, 'TW': 0.1
    };

    const intensity = responseIntensity[this.role] || 0.4;

    return {
      x: toPredicted.x * intensity,
      y: toPredicted.y * intensity
    };
  }

  // Maintain optimal spacing from other players
  maintainOptimalSpacing(world) {
    let spacingAdjustment = { x: 0, y: 0 };

    // Avoid clustering with teammates
    this.nearbyTeammates.forEach(teammate => {
      const distance = Math.hypot(this.x - teammate.x, this.y - teammate.y);
      const minDistance = 18;

      if (distance < minDistance && distance > 0) {
        const separation = {
          x: this.x - teammate.x,
          y: this.y - teammate.y
        };
        const magnitude = Math.hypot(separation.x, separation.y);
        const strength = (minDistance - distance) / minDistance * 2;

        spacingAdjustment.x += (separation.x / magnitude) * strength;
        spacingAdjustment.y += (separation.y / magnitude) * strength;
      }
    });

    // Maintain pressure on nearby opponents
    this.nearbyOpponents.forEach(opponent => {
      const distance = Math.hypot(this.x - opponent.x, this.y - opponent.y);
      const optimalDistance = 12; // Close enough to pressure, far enough to react

      if (distance > 0) {
        const toOpponent = {
          x: opponent.x - this.x,
          y: opponent.y - this.y
        };
        const magnitude = Math.hypot(toOpponent.x, toOpponent.y);

        if (distance > optimalDistance + 5) {
          // Move closer to apply pressure
          const strength = 0.5;
          spacingAdjustment.x += (toOpponent.x / magnitude) * strength;
          spacingAdjustment.y += (toOpponent.y / magnitude) * strength;
        } else if (distance < optimalDistance - 3) {
          // Back off slightly to maintain reaction distance
          const strength = 0.3;
          spacingAdjustment.x -= (toOpponent.x / magnitude) * strength;
          spacingAdjustment.y -= (toOpponent.y / magnitude) * strength;
        }
      }
    });

    // Apply spacing adjustments
    this.targetX += spacingAdjustment.x;
    this.targetY += spacingAdjustment.y;
  }

  // Adjust body orientation toward ball
  adjustBodyOrientationToBall(ball) {
    const ballAngle = Math.atan2(ball.y - this.y, ball.x - this.x) * 180 / Math.PI;

    // Smooth turn toward ball
    let angleDiff = ((ballAngle - this.bodyDirection + 540) % 360) - 180;
    const maxTurn = 8; // degrees per update (smooth turning)

    if (Math.abs(angleDiff) > maxTurn) {
      this.bodyDirection += Math.sign(angleDiff) * maxTurn;
    } else {
      this.bodyDirection = ballAngle;
    }

    // Normalize angle
    if (this.bodyDirection > 180) this.bodyDirection -= 360;
    if (this.bodyDirection < -180) this.bodyDirection += 360;
  }

  // --- Movement & Perception ---
  updateDirectionTowardsTarget() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      const desired = (Math.atan2(dy, dx) * 180) / Math.PI;
      const maxTurn = (this.derived.bodyTurnRate ?? 12) * 0.8;
      let delta = ((desired - this.bodyDirection + 540) % 360) - 180;
      if (Math.abs(delta) > maxTurn) {
        this.bodyDirection += Math.sign(delta) * maxTurn;
      } else {
        this.bodyDirection = desired;
      }
      if (this.bodyDirection > 180) this.bodyDirection -= 360;
      if (this.bodyDirection < -180) this.bodyDirection += 360;
      // anticipate by turning the head slightly ahead of the body
      this.smoothTurnHeadTo(desired, (this.derived.headTurnRate ?? 12) * 1.2);
    }
  }

  moveToTarget(world = null) {
    if (this.sliding) {
      this.x += this.slideDirX * this.slideSpeed;
      this.y += this.slideDirY * this.slideSpeed;

      const zone = world ? getDynamicZone(this, world) : Player.getAllowedZone(this);

      const pos = world ? Player.clampToRect(this.x, this.y, zone, 20) : Player.clampToZone(this.x, this.y, zone);
      this.x = pos.x;
      this.y = pos.y;
      this.slideTimer--;
      if (this.slideTimer <= 0) {
        this.sliding = false;
        this.slideDirX = 0;
        this.slideDirY = 0;
      }
      if (this.tackleCooldown > 0) this.tackleCooldown--;
      return false;
    }

    this.updateDirectionTowardsTarget();

    const zoneMove = world ? getDynamicZone(this, world) : Player.getAllowedZone(this);

    this.targetX = world ? Math.max(zoneMove.x, Math.min(zoneMove.x + zoneMove.width, this.targetX)) : this.targetX;
    this.targetY = world ? Math.max(zoneMove.y, Math.min(zoneMove.y + zoneMove.height, this.targetY)) : this.targetY;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      const injuryMod = this.injured ? 0.4 : 1;
      const speed = (this.derived.topSpeed ?? 2) * (this.stamina ?? 1) * (this.pressing ?? 1) * injuryMod;
      const desiredVx = (dx / dist) * speed;
      const desiredVy = (dy / dist) * speed;
      const smooth = 0.2;
      this.vx = this.vx + (desiredVx - this.vx) * smooth;
      this.vy = this.vy + (desiredVy - this.vy) * smooth;
      this.x += this.vx;
      this.y += this.vy;

      const zone = world ? getDynamicZone(this, world) : Player.getAllowedZone(this);

      const pos = world ? Player.clampToRect(this.x, this.y, zone, 20) : Player.clampToZone(this.x, this.y, zone);
      this.x = pos.x;
      this.y = pos.y;
      const movement = Math.hypot(this.vx, this.vy);
      const drain = movement * 0.001 * (1.2 - (this.base.stamina ?? 1));
      this.stamina = Math.max(0, (this.stamina ?? 1) - drain);
      this.heatmap.push({ x: this.x, y: this.y });
      this.totalDistance += dist;
      return false;
    }
    const recovery = 0.0005 * (0.5 + (this.base.stamina ?? 1));
    this.stamina = Math.min(1, (this.stamina ?? 1) + recovery);
    if (this.tackleCooldown > 0) this.tackleCooldown--;
    return true;
  }

  arrivedAtTarget() {
    return Math.abs(this.x - this.targetX) < 1 && Math.abs(this.y - this.targetY) < 1;
  }

  perceive(objects) {
    this.perceived = {};
    for (const obj of objects) {
      if (obj === this) continue;
      const dx = obj.x - this.x;
      const dy = obj.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.perceptionRange) continue;
      const angleToObj = (Math.atan2(dy, dx) * 180) / Math.PI;
      let delta = angleToObj - this.bodyDirection;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      if (Math.abs(delta) <= this.fovAngle / 2) {
        const label = obj.role || obj.constructor.name.toLowerCase();
        this.perceived[label] = { x: obj.x, y: obj.y, dist, angle: delta };
        if (label === "ball") {
          if (!this.memory.ball) {
            this.memory.ball = { x: null, y: null, lastSeen: -Infinity, confidence: 0, vx: 0, vy: 0 };
          }
          this.memory.ball.x = obj.x;
          this.memory.ball.y = obj.y;
          this.memory.ball.vx = obj.vx ?? 0;
          this.memory.ball.vy = obj.vy ?? 0;
          this.memory.ball.lastSeen = performance.now();
          this.memory.ball.confidence = 1.0 * (this.derived.vision ?? 1) + 0.5 * (this.derived.awareness ?? 1);
        }
      }
    }
  }

  updateMemory(label, obj) {
    this.memory[label] = { x: obj.x, y: obj.y, lastSeen: performance.now() };
  }

  predictObjectPosition(label, dt = 0.5) {
    const m = this.memory[label];
    if (!m) return null;
    const vx = m.vx ?? 0;
    const vy = m.vy ?? 0;
    return { x: m.x + vx * dt, y: m.y + vy * dt };
  }

  // --- Messaging, Head/Körper-Drehung etc. siehe vorherige Posts! ---
  turnHeadTo(angle) {
    this.headDirection = angle;
  }

  smoothTurnHeadTo(targetAngle, maxTurnPerTick = 12) {
    let delta = ((targetAngle - this.headDirection + 540) % 360) - 180;
    if (Math.abs(delta) > maxTurnPerTick) {
      this.headDirection += Math.sign(delta) * maxTurnPerTick;
    } else {
      this.headDirection = targetAngle;
    }
    if (this.headDirection > 180) this.headDirection -= 360;
    if (this.headDirection < -180) this.headDirection += 360;
  }
  sendMessage(targetPlayer, message) {
    targetPlayer.mailbox.push({ from: this, ...message });
  }
  broadcastMessage(team, message) {
    for (const mate of team) if (mate !== this) this.sendMessage(mate, message);
  }

  processMessages() {
    this.mailbox = this.mailbox.filter((msg) => {
      if (msg.type === "pressing") {
        this.pressing = msg.level;
        return false;
      }
      if (msg.type === "phase") {
        this.phase = msg.phase;
        return false;
      }

      // Enhanced coordination message processing
      if (msg.type === "requestPass") {
        this.handlePassRequest(msg);
        return false;
      }
      if (msg.type === "supportAvailable") {
        this.handleSupportAvailable(msg);
        return false;
      }
      if (msg.type === "spaceCreated") {
        this.handleSpaceCreated(msg);
        return false;
      }
      if (msg.type === "overlapStarted") {
        this.handleOverlapStarted(msg);
        return false;
      }
      if (msg.type === "switchMark") {
        this.handleMarkSwitch(msg);
        return false;
      }
      if (msg.type === "offsideTrap") {
        this.handleOffsideTrap(msg);
        return false;
      }
      if (msg.type === "keeperOut") {
        this.handleKeeperOut(msg);
        return false;
      }
      if (msg.type === "shout") {
        this.handleShout(msg);
        return false;
      }

      return true;
    });
  }

  // Enhanced message handlers for coordination
  handlePassRequest(msg) {
    if (!this.hasBall) return;

    // Evaluate pass request and potentially execute
    const passQuality = msg.quality || 0.5;
    const urgency = msg.urgency || 0.5;

    // Higher chance to pass if high quality/urgency and player is under pressure
    const myPressure = this.calculateMyPressure();
    const passChance = (passQuality * 0.4 + urgency * 0.3 + myPressure * 0.3);

    if (Math.random() < passChance) {
      this.pendingPassTarget = msg.target;
      this.pendingPassUrgency = urgency;
    }

    console.log(`📞 PASS REQUEST: ${msg.target.role} requests pass (quality: ${(passQuality*100).toFixed(0)}%, urgency: ${(urgency*100).toFixed(0)}%)`);
  }

  handleSupportAvailable(msg) {
    // Note available support option
    this.availableSupport = {
      player: msg.player,
      position: msg.position,
      timestamp: performance.now()
    };

    console.log(`🤝 SUPPORT: ${msg.player.role} available for support`);
  }

  handleSpaceCreated(msg) {
    // Move into created space if beneficial
    const spaceDistance = Math.hypot(this.x - msg.position.x, this.y - msg.position.y);

    if (spaceDistance < 30 && this.currentAction === 'hold') {
      this.targetX = msg.position.x;
      this.targetY = msg.position.y;
      this.currentAction = 'moveToSpace';
    }

    console.log(`🏃 SPACE: Moving to created space`);
  }

  handleOverlapStarted(msg) {
    // Prepare for overlap pass
    this.overlapTiming = msg.timing;
    this.overlapRunner = msg.runner;

    console.log(`🏃‍♂️ OVERLAP: ${msg.runner.role} starting overlap run`);
  }

  handleMarkSwitch(msg) {
    // Switch marking assignment
    this.markingTarget = msg.opponent;
    this.markingReason = msg.reason;
    this.currentAction = 'mark';

    console.log(`🔄 MARK SWITCH: Now marking ${msg.opponent.role} (${msg.reason})`);
  }

  handleOffsideTrap(msg) {
    // Coordinate offside trap
    this.offsideTrapTiming = msg.timing;
    this.offsideTrapCoordinator = msg.coordinator;

    console.log(`🪤 OFFSIDE TRAP: Coordinated by ${msg.coordinator.role}`);
  }

  handleKeeperOut(msg) {
    if (this.role !== 'TW') return;

    // Goalkeeper decision to come out
    if (msg.urgency > 0.7) {
      this.currentAction = 'keeperOut';
      this.targetX = this.x + (msg.situation === 'dangerous' ? 20 : 10);
    }

    console.log(`🥅 KEEPER: Coming out (${msg.situation})`);
  }

  handleShout(msg) {
    // React to teammate shouts
    this.lastShout = {
      message: msg.message,
      urgency: msg.urgency,
      from: msg.from,
      timestamp: msg.timestamp
    };

    // Adjust behavior based on shout urgency
    if (msg.urgency > 0.8) {
      this.reactionInterval = Math.max(100, this.reactionInterval * 0.7); // React faster
    }

    console.log(`📢 SHOUT: ${msg.message} (urgency: ${(msg.urgency*100).toFixed(0)}%)`);
  }

  // Calculate pressure on this player
  calculateMyPressure() {
    // This would be implemented based on nearby opponents
    // For now, return a simple calculation
    return Math.random() * 0.5; // Placeholder
  }

  updateHead(ball, dt = 0.016, world = null) {
    const now = performance.now ? performance.now() : Date.now();
    const memory = this.memory.ball;
    const timeSinceSeen = memory ? now - memory.lastSeen : Infinity;
    const predicted = memory ? this.predictObjectPosition("ball", 0.3) : null;
    const ballDist = predicted ? Math.hypot(predicted.x - this.x, predicted.y - this.y) : Infinity;
    if (predicted && timeSinceSeen < 1000) {
      const angle = (Math.atan2(predicted.y - this.y, predicted.x - this.x) * 180) / Math.PI;
      this.smoothTurnHeadTo(angle, this.derived.headTurnRate ?? 12);
      this.scanTimer = 0;
      return;
    }
    this.scanTimer = (this.scanTimer ?? 0) - dt * 1000;
    if (ballDist > 200 && this.scanTimer <= 0) {
      const candidates = world ? [...world.teammates, ...world.opponents] : [];
      const nearby = candidates.filter((o) => Math.hypot(o.x - this.x, o.y - this.y) < 220);
      const target = nearby.length ? nearby[Math.floor(Math.random() * nearby.length)] : null;
      const angle = target ? Math.atan2(target.y - this.y, target.x - this.x) : Math.random() * 360;
      this.scanTargetAngle = angle;
      this.scanTimer = 800 + Math.random() * 600;
    }
    if (this.scanTargetAngle !== undefined) {
      this.smoothTurnHeadTo(this.scanTargetAngle, this.derived.headTurnRate ?? 12);
      return;
    }
    // idle movement
    const moving = Math.hypot(this.vx, this.vy) > 0.1;
    this.idleTimer = (this.idleTimer ?? 0) - dt * 1000;
    if (!moving && this.idleTimer <= 0) {
      this.idleTargetAngle = this.bodyDirection + (Math.random() - 0.5) * 20;
      this.idleTimer = 1200 + Math.random() * 800;
    }
    if (this.idleTargetAngle !== undefined) {
      this.smoothTurnHeadTo(this.idleTargetAngle, this.derived.headTurnRate ?? 12);
    }
  }

  updateInjury(delta) {
    if (this.injured) {
      this.injuryRecovery -= delta;
      if (this.injuryRecovery <= 0) {
        this.injured = false;
      }
    }
    if (this.highlightTimer > 0) {
      this.highlightTimer -= delta;
      if (this.highlightTimer < 0) this.highlightTimer = 0;
    }
  }

  toString() {
    return `Player(${this.role}, ${this.x.toFixed(1)}, ${this.y.toFixed(1)})`;
  }
}
