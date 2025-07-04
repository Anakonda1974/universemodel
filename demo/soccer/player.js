import { Capabilities } from './capabilities.js';
import { createPlayerBT } from "./footBallBTs.js";


const TradeProfiles = {
  sniper:      { shootingAccuracy: +0.15, tacklingSkill: -0.1 },
  playmaker:   { passingAccuracy: +0.15, topSpeed: -0.05 },
  wall:        { tacklingSkill: +0.2, acceleration: -0.08 },
  engine:      { fitness: +0.2, shootingPower: -0.1 }
  // usw.
};

function getPositionMultipliers(pos) {
  switch(pos) {
    case "ST": return { shootingAccuracy: 1.2, tacklingSkill: 0.8 };
    case "IV": return { tacklingSkill: 1.3, topSpeed: 0.9 };
    case "ZM": return { passingAccuracy: 1.15, shootingPower: 0.95 };
    // ...
    default: return {};
  }
}

export class Player {
  constructor(x, y, color = "blue", options = {}) {
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
      ...options.baseStats
    };

    // --- Spielerprofil / Trade (Sniper, Wall, Engine, Playmaker...) ---
    this.trade = options.trade || null;
    this.position = options.position || "ST"; // Default Stürmer

    // --- Erfahrungssystem ---
    this.xp = {
      passing: 0, shooting: 0, tackling: 0, vision: 0, fitness: 0
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

    // --- KI / Perception / Memory ---
    this.perceived = {};
    this.memory = { ball: { x: null, y: null, lastSeen: -Infinity, confidence: 0 } };
    this.mailbox = [];
    this.bt = createPlayerBT();
    this.controlledByUser = false;


    // --- Decision-Timing (Awareness-Skill steuert Intervall) ---
    this.lastDecision = 0;
    this.reactionInterval = 300 + (1 - this.derived.awareness) * 400; // dynamisch

    // --- Capabilities ---
    this.capabilities = { ...Capabilities }; // oder rollen-/trade-spezifisch
  }

  // --- Abgeleitete Werte aktualisieren (immer nach XP-Gewinn o. Trade-Wechsel!) ---
  updateDerived() {
    const b = this.base;
    const t = this.getTradeBonus();
    // Beispielhaft einige abgeleitete Werte:
    this.derived.acceleration     = b.athleticism * 0.6 + b.fitness * 0.2 + b.speed * 0.2 + (t.acceleration ?? 0);
    this.derived.topSpeed         = b.athleticism * 0.4 + b.fitness * 0.3 + b.speed * 0.3 + (t.topSpeed ?? 0);
    this.derived.bodyTurnRate     = b.athleticism * 0.3 + b.technique * 0.5 + (t.bodyTurnRate   ?? 0);
    this.derived.headTurnRate     = b.vision * 0.6 + b.reaction * 0.4 + (t.headTurnRate         ?? 0);
    this.derived.shootingPower    = b.technique * 0.5 + b.athleticism * 0.4 + (t.shootingPower  ?? 0);
    this.derived.shootingAccuracy = b.technique * 0.5 + b.intelligence * 0.3 + (t.shootingAccuracy ?? 0);
    this.derived.passingPower     = b.technique * 0.4 + b.intelligence * 0.5 + (t.passingPower     ?? 0);
    this.derived.passingAccuracy  = b.technique * 0.5 + b.vision * 0.3 + b.intelligence * 0.2 + (t.passingAccuracy ?? 0);
    this.derived.dribblingSkill   = b.technique * 0.5 + b.vision * 0.2 + b.fitness * 0.2 + (t.dribblingSkill ?? 0);
    this.derived.tacklingSkill    = b.technique * 0.4 + b.mentality * 0.4 + b.athleticism * 0.2 + (t.tacklingSkill ?? 0);
    this.derived.awareness        = b.vision * 0.5 + b.intelligence * 0.5 + (t.awareness ?? 0);
    this.derived.balance          = b.athleticism * 0.3 + b.mentality * 0.7 + (t.balance ?? 0);

    // --- Positionsbonus anwenden ---
    for (const prop in this.positionMultipliers) {
      if (this.derived[prop]) {
        this.derived[prop] *= this.positionMultipliers[prop];
      }
    }
  }

  static getAllowedZone(player) {
    // These must match decision-rules.js
    let marginX = 35, marginY = 25;
    let width = 160, height = 180;

    switch (player.role) {
      case "TW": width = 80; height = 140; break;
      case "IV": case "LIV": case "RIV": width = 110; height = 190; break;
      case "LV": case "RV": width = 135; height = 220; break;
      case "DM": width = 170; height = 210; break;
      case "ZM": case "OM": width = 270; height = 220; break;
      case "LM": case "RM": width = 250; height = 270; break;
      case "LF": case "RF": width = 320; height = 210; break;
      case "ST": width = 320; height = 230; break;
      default: width = 170; height = 200; break;
    }
    const minX = Math.max(marginX, player.formationX - width / 2);
    const maxX = Math.min(1050 - marginX, player.formationX + width / 2);
    const minY = Math.max(marginY, player.formationY - height / 2);
    const maxY = Math.min(680 - marginY, player.formationY + height / 2);

    return { minX, maxX, minY, maxY };
  }

  static clampToZone(x, y, zone) {
    return {
      x: Math.max(zone.minX, Math.min(zone.maxX, x)),
      y: Math.max(zone.minY, Math.min(zone.maxY, y)),
    };
  }

  // --- Boni/Mali aus Trade-System holen ---
  getTradeBonus() {
    return TradeProfiles[this.trade] || {};
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
    if (this.controlledByUser) return;
    if ((now - this.lastDecision) > this.reactionInterval) {
      this.lastDecision = now;
      this.bt.tick(this, world);  // Behavior Tree entscheidet Ziel/Aktion
      const angle = Math.atan2(world.ball.y - this.y, world.ball.x - this.x) * 180 / Math.PI;
      this.smoothTurnHeadTo(angle, this.derived.headTurnRate ?? 12);
    }
  }

  // --- Movement & Perception ---
  updateDirectionTowardsTarget() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      const desired = (Math.atan2(dy, dx) * 180) / Math.PI;
      const maxTurn = this.derived.bodyTurnRate ?? 12;
      let delta = ((desired - this.bodyDirection + 540) % 360) - 180;
      if (Math.abs(delta) > maxTurn) {
        this.bodyDirection += Math.sign(delta) * maxTurn;
      } else {
        this.bodyDirection = desired;
      }
      if (this.bodyDirection > 180) this.bodyDirection -= 360;
      if (this.bodyDirection < -180) this.bodyDirection += 360;
    }
  }

  moveToTarget() {
    this.updateDirectionTowardsTarget();
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      const speed = (this.derived.topSpeed ?? 2) * (this.stamina ?? 1) * (this.pressing ?? 1);
      const step = Math.min(speed, dist);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      const zone = Player.getAllowedZone(this);
      const pos = Player.clampToZone(this.x, this.y, zone);
      this.x = pos.x;
      this.y = pos.y;
      const drain = step * 0.001 * (1.2 - (this.base.stamina ?? 1));
      this.stamina = Math.max(0, (this.stamina ?? 1) - drain);
      return false;
    }
    const recovery = 0.0005 * (0.5 + (this.base.stamina ?? 1));
    this.stamina = Math.min(1, (this.stamina ?? 1) + recovery);
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
            this.memory.ball = { x: null, y: null, lastSeen: -Infinity, confidence: 0 };
          }
          this.memory.ball.x = obj.x;
          this.memory.ball.y = obj.y;
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
    return { x: m.x, y: m.y };
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
  sendMessage(targetPlayer, message) { targetPlayer.mailbox.push({ from: this, ...message }); }
  broadcastMessage(team, message) { for (const mate of team) if (mate !== this) this.sendMessage(mate, message); }

  processMessages() {
    this.mailbox = this.mailbox.filter(msg => {
      if (msg.type === 'pressing') {
        this.pressing = msg.level;
        return false;
      }
      return true;
    });
  }

  toString() {
    return `Player(${this.role}, ${this.x.toFixed(1)}, ${this.y.toFixed(1)})`;
  }
}

