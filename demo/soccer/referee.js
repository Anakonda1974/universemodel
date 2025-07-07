import { logComment } from './commentary.js';
import { isOffside, restartTypeForOut, restartTypeForFoul, PENALTY_BOX, inPenaltyBox } from './rules.js';

export class Referee {
  constructor(onCardCallback, onFoulCallback, onOffsideCallback, onGameEventCallback) {
    this.onCard = onCardCallback;
    this.onFoul = onFoulCallback;
    this.onOffside = onOffsideCallback;
    this.onGameEvent = onGameEventCallback;
    this.x = 525;
    this.y = 340;
    this.radius = 10;

    // Enhanced FIFA rule tracking
    this.matchTime = 0;
    this.halfTime = 1; // 1 or 2
    this.addedTime = 0;
    this.matchPaused = false;
    this.lastEventTime = 0;

    // Rule enforcement state
    this.advantageMode = false;
    this.advantageTimer = 0;
    this.lastFoulPosition = null;
    this.substitutionsUsed = { home: 0, away: 0 };
    this.maxSubstitutions = 5;

    // Card tracking
    this.yellowCards = new Map(); // player -> count
    this.redCards = new Set();

    console.log("Enhanced FIFA Referee initialized");
  }

  // Enhanced referee positioning for optimal view of play
  moveTowards(ball, dt) {
    // Calculate strategic position based on ball location and play situation
    const strategicPosition = this.calculateStrategicPosition(ball);

    const dx = strategicPosition.x - this.x;
    const dy = strategicPosition.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) { // Only move if not close enough
      const speed = 0.8; // Faster referee movement
      this.x += dx * speed * dt;
      this.y += dy * speed * dt;
    }
  }

  // Calculate optimal referee position for best view of play
  calculateStrategicPosition(ball) {
    const fieldCenterX = 525;
    const fieldCenterY = 340;

    // Base position: Stay behind play, diagonal to ball
    let targetX, targetY;

    // Determine which half the ball is in
    if (ball.x < fieldCenterX) {
      // Ball in left half - referee positions right and slightly back
      targetX = ball.x + 80;
      targetY = ball.y + (ball.y > fieldCenterY ? -60 : 60); // Diagonal positioning
    } else {
      // Ball in right half - referee positions left and slightly back
      targetX = ball.x - 80;
      targetY = ball.y + (ball.y > fieldCenterY ? -60 : 60); // Diagonal positioning
    }

    // Special positioning for penalty area situations
    if (this.isNearPenaltyArea(ball)) {
      // Get closer for better view of potential fouls
      const distanceToBall = Math.hypot(ball.x - this.x, ball.y - this.y);
      if (distanceToBall > 40) {
        targetX = ball.x + (ball.x < fieldCenterX ? 40 : -40);
        targetY = ball.y;
      }
    }

    // Keep referee on field
    targetX = Math.max(50, Math.min(1000, targetX));
    targetY = Math.max(50, Math.min(630, targetY));

    return { x: targetX, y: targetY };
  }

  // Check if ball is near penalty area
  isNearPenaltyArea(ball) {
    // Left penalty area
    if (ball.x < 200 && ball.y > 180 && ball.y < 500) return true;
    // Right penalty area
    if (ball.x > 850 && ball.y > 180 && ball.y < 500) return true;
    return false;
  }

  update(players, ball, dt = 0, matchTime = 0) {
    this.matchTime = matchTime;
    this.moveTowards(ball, dt);

    // Update advantage timer
    if (this.advantageMode) {
      this.advantageTimer -= dt;
      if (this.advantageTimer <= 0) {
        this.advantageMode = false;
      }
    }

    // Check for various rule violations
    this.checkTacklingFouls(players, ball);
    this.checkDangerousPlay(players);
    this.checkGoalkeeperViolations(players, ball);
    this.checkTimeWasting(players, ball, dt);
    this.checkUnsportingBehavior(players);
  }

  // Enhanced foul detection for tackling
  checkTacklingFouls(players, ball) {
    for (const p of players) {
      if (p.currentAction === "tackle" && (!ball.owner || ball.owner !== p)) {
        for (const opp of players) {
          if (opp === p || opp.color === p.color) continue;

          const dist = Math.hypot(p.x - opp.x, p.y - opp.y);
          if (dist < p.radius + opp.radius + 5) {
            // Determine foul severity
            const foulType = this.assessTackleSeverity(p, opp, ball);
            this.callFoul(p, opp, foulType);
            break;
          }
        }
      }
    }
  }

  // Check for dangerous play (high kicks, etc.)
  checkDangerousPlay(players) {
    // Implementation for dangerous play detection
    // This could include high kicks, dangerous challenges, etc.
  }

  // Check goalkeeper-specific violations
  checkGoalkeeperViolations(players, ball) {
    const goalkeepers = players.filter(p => p.role === 'TW');

    for (const gk of goalkeepers) {
      // Check 6-second rule for goalkeeper holding ball
      if (ball.owner === gk && gk.currentAction === 'hold') {
        if (!gk.ballHoldStartTime) {
          gk.ballHoldStartTime = this.matchTime;
        } else if (this.matchTime - gk.ballHoldStartTime > 6) {
          this.callIndirectFreeKick(gk, "Goalkeeper 6-second violation");
          gk.ballHoldStartTime = null;
        }
      } else {
        gk.ballHoldStartTime = null;
      }

      // Check if goalkeeper is outside penalty area with ball in hands
      if (ball.owner === gk && gk.currentAction === 'hold') {
        const isHomeGK = gk.formationX < 525;
        const inPenaltyArea = inPenaltyBox(gk.x, gk.y, isHomeGK ? 'home' : 'away');

        if (!inPenaltyArea) {
          this.callDirectFreeKick(gk, "Goalkeeper handling outside penalty area");
        }
      }
    }
  }

  // Check for time wasting
  checkTimeWasting(players, ball, dt) {
    // Track if ball is being held too long without action
    if (ball && ball.owner && !ball.isLoose) {
      if (!ball.owner.actionStartTime) {
        ball.owner.actionStartTime = this.matchTime;
      } else if (this.matchTime - ball.owner.actionStartTime > 10) {
        // Player holding ball too long
        this.giveYellowCard(ball.owner, "Time wasting");
        ball.owner.actionStartTime = null;
      }
    } else if (ball && ball.owner) {
      // Clear timer when ball becomes loose
      ball.owner.actionStartTime = null;
    }
  }

  // Check for unsporting behavior
  checkUnsportingBehavior(players) {
    // This could include simulation, dissent, etc.
    // For now, just a placeholder
  }

  handlePass(passer, receiver, players) {
    if (isOffside(passer, receiver, players) && this.onOffside) {
      this.onOffside(receiver);
    }
  }

  checkRestart(ball, lastTouchTeam) {
    return restartTypeForOut(ball, lastTouchTeam);
  }

  // Enhanced foul calling with FIFA rules
  callFoul(player, victim, foulType = 'normal') {
    // Check if advantage should be played
    if (this.shouldPlayAdvantage(victim, foulType)) {
      this.playAdvantage(player, victim, foulType);
      return;
    }

    // Determine card based on foul severity and context
    const cardDecision = this.assessCardDecision(player, victim, foulType);

    if (cardDecision.card) {
      this.giveCard(player, cardDecision.card, cardDecision.reason);
    }

    // Handle injury
    if (foulType === 'serious' || foulType === 'violent') {
      if (Math.random() < 0.4) {
        victim.injured = true;
        victim.injuryRecovery = Math.random() * 60 + 30; // 30-90 seconds
        logComment(`${victim.role} verletzt sich!`);
        this.addedTime += 2; // Add time for injury
      }
    }

    victim.highlightTimer = 1;
    this.lastEventTime = this.matchTime;

    if (this.onFoul) {
      const restart = restartTypeForFoul(victim, player);
      this.onFoul(player, victim, restart);
    }

    logComment(`Foul: ${foulType} tackle by ${player.role} on ${victim.role}`);
  }

  // Assess tackle severity
  assessTackleSeverity(tackler, victim, ball) {
    const ballDistance = Math.hypot(ball.x - victim.x, ball.y - victim.y);
    const tacklerSpeed = Math.hypot(tackler.vx || 0, tackler.vy || 0);

    // Determine if tackle was from behind
    const tackleAngle = Math.atan2(victim.y - tackler.y, victim.x - tackler.x);
    const victimDirection = victim.bodyDirection * Math.PI / 180;
    const angleDiff = Math.abs(tackleAngle - victimDirection);
    const fromBehind = angleDiff < Math.PI / 4;

    if (fromBehind && tacklerSpeed > 100) return 'serious';
    if (ballDistance > 30) return 'reckless'; // Not playing the ball
    if (tacklerSpeed > 150) return 'reckless';

    return 'normal';
  }

  // Determine if advantage should be played
  shouldPlayAdvantage(victim, foulType) {
    if (foulType === 'violent' || foulType === 'serious') return false;

    const victimTeam = victim.color;
    // Check if victim's team maintains possession and attacking momentum
    // This is a simplified check - in reality it's more complex
    return Math.random() < 0.3; // 30% chance to play advantage
  }

  // Play advantage
  playAdvantage(fouler, victim, foulType) {
    this.advantageMode = true;
    this.advantageTimer = 3; // 3 seconds to see if advantage develops
    this.lastFoulPosition = { fouler, victim, foulType, x: victim.x, y: victim.y };
    logComment("Advantage played!");
  }

  // Assess what card (if any) should be given
  assessCardDecision(player, victim, foulType) {
    const playerCards = this.yellowCards.get(player) || 0;

    // Automatic red card offenses
    if (foulType === 'violent') {
      return { card: 'red', reason: 'Violent conduct' };
    }

    if (foulType === 'serious') {
      return { card: 'red', reason: 'Serious foul play' };
    }

    // Check for second yellow
    if (playerCards >= 1 && foulType === 'reckless') {
      return { card: 'red', reason: 'Second yellow card' };
    }

    // Yellow card offenses
    if (foulType === 'reckless') {
      return { card: 'yellow', reason: 'Reckless challenge' };
    }

    // Check for persistent fouling
    if (playerCards >= 3) {
      return { card: 'yellow', reason: 'Persistent fouling' };
    }

    // Random yellow for normal fouls (lower chance)
    if (Math.random() < 0.15) {
      return { card: 'yellow', reason: 'Unsporting behavior' };
    }

    return { card: null };
  }

  // Give a card to a player
  giveCard(player, cardType, reason) {
    if (cardType === 'yellow') {
      this.giveYellowCard(player, reason);
    } else if (cardType === 'red') {
      this.giveRedCard(player, reason);
    }
  }

  // Give yellow card
  giveYellowCard(player, reason) {
    const currentCards = this.yellowCards.get(player) || 0;
    this.yellowCards.set(player, currentCards + 1);

    if (this.onCard) this.onCard(player, 'yellow');
    logComment(`Yellow card: ${player.role} - ${reason}`);

    // Check for second yellow = red
    if (currentCards + 1 >= 2) {
      this.giveRedCard(player, 'Second yellow card');
    }
  }

  // Give red card
  giveRedCard(player, reason) {
    this.redCards.add(player);
    if (this.onCard) this.onCard(player, 'red');
    logComment(`Red card: ${player.role} - ${reason}`);

    // Player should be removed from field
    player.sentOff = true;
    player.x = -100; // Move off field
    player.y = -100;
  }

  // Call indirect free kick
  callIndirectFreeKick(player, reason) {
    logComment(`Indirect free kick: ${reason}`);
    if (this.onGameEvent) {
      this.onGameEvent('indirectFreeKick', { player, reason, x: player.x, y: player.y });
    }
  }

  // Call direct free kick
  callDirectFreeKick(player, reason) {
    logComment(`Direct free kick: ${reason}`);
    if (this.onGameEvent) {
      this.onGameEvent('directFreeKick', { player, reason, x: player.x, y: player.y });
    }
  }
}
