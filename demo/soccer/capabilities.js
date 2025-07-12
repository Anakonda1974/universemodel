// capabilities.js

export const Capabilities = {
  // Calculate power-based speed with player stats and modifiers
  calculateSpeed(player, basePower, actionType, targetDirection, distance) {
    // Clamp power between 0 and 1
    const power = Math.max(0, Math.min(1, basePower));

    // TESTING: Make all players have perfect skills
    const playerPower = 1.0; // Perfect power
    const playerAccuracy = 1.0; // Perfect accuracy

    // TESTING: Simplified orientation factor (less impact)
    const bodyAngle = player.bodyDirection * Math.PI / 180;
    const targetAngle = Math.atan2(targetDirection.dy, targetDirection.dx);
    const angleDiff = Math.abs(((targetAngle - bodyAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
    const orientationFactor = 0.8 + 0.2 * Math.cos(angleDiff); // 0.8 to 1.0 (less penalty)

    // TESTING: Perfect stamina
    const staminaFactor = 1.0;

    // Distance factor for passes (longer passes need more power)
    const distanceFactor = actionType === 'pass' ? Math.min(1.5, 1 + distance / 400) : 1;

    // Base speeds for different actions (boosted for testing)
    const baseSpeed = actionType === 'shoot' ? 600 : 400;

    // Calculate final speed
    const finalSpeed = baseSpeed * power * (0.5 + playerPower * 0.5) * orientationFactor * staminaFactor * distanceFactor;

    return {
      speed: finalSpeed,
      accuracy: playerAccuracy * orientationFactor * staminaFactor,
      spin: (player.base.technique - 0.5) * 0.01 * power  // Reduced spin significantly
    };
  },

  // Offensive actions
  shoot(player, world, goalPos = world.opponentGoal, power = 1) {
    const ball = world.ball;
    if (!ball || ball.owner !== player) return;
    const dx = goalPos.x - player.x;
    const dy = goalPos.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;

    const speedData = this.calculateSpeed(player, power, 'shoot', {dx, dy}, dist);

    const offset = player.radius + ball.radius + 2;
    const startX = player.x + (dx / dist) * offset;
    const startY = player.y + (dy / dist) * offset;

    ball.kick(startX, startY, dx, dy, speedData.speed, speedData.spin, player);
    player.currentAction = 'shoot';

    console.log(`Shot: power=${power.toFixed(2)}, speed=${speedData.speed.toFixed(1)}, accuracy=${speedData.accuracy.toFixed(2)}`);
  },

  pass(player, world, target, power = 1) {
    const ball = world.ball;
    if (!ball || ball.owner !== player || !target) return;
    const tx = target.x ?? target.targetX;
    const ty = target.y ?? target.targetY;
    if (tx === undefined || ty === undefined) return;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.hypot(dx, dy) || 1;

    const speedData = this.calculateSpeed(player, power, 'pass', {dx, dy}, dist);

    const offset = player.radius + ball.radius + 2;
    const startX = player.x + (dx / dist) * offset;
    const startY = player.y + (dy / dist) * offset;

    ball.kick(startX, startY, dx, dy, speedData.speed, speedData.spin, player);
    player.currentAction = 'pass';
    if (world.referee) world.referee.handlePass(player, target, world.players);

    console.log(`Pass: power=${power.toFixed(2)}, speed=${speedData.speed.toFixed(1)}, distance=${dist.toFixed(0)}`);
  },

  lobPass(player, world, target) {
    const ball = world.ball;
    if (!ball || ball.owner !== player || !target) return;
    const tx = target.x ?? target.targetX;
    const ty = target.y ?? target.targetY;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const spin = (player.base.technique - 0.5) * 0.05;
    const offset = player.radius + ball.radius + 2;
    const startX = player.x + (dx / dist) * offset;
    const startY = player.y + (dy / dist) * offset;
    ball.kick(startX, startY, dx, dy, 10, spin, player);
    ball.vy -= 2; // simple lift
    player.currentAction = 'lobPass';
    if (world.referee) world.referee.handlePass(player, target, world.players);
  },

  cross(player, world, targetArea) {
    this.lobPass(player, world, targetArea || world.opponentGoal);
    player.currentAction = 'cross';
    if (world.referee) world.referee.handlePass(player, targetArea, world.players);
  },

 dribble(player, world, direction) {
  let dx = direction?.x;
  let dy = direction?.y;
  if (dx === undefined || dy === undefined) {
    const ang = player.bodyDirection * Math.PI / 180;
    dx = Math.cos(ang);
    dy = Math.sin(ang);
  }
  const mag = Math.hypot(dx, dy) || 1;

  // Seitenwechsel abhängig von Flüssigkeit
  const fluidity = player.fluidity ?? 0.5;
  const prefersLeft = player.preferredFoot === "left";
  const wrongChance = 1 - fluidity;
  const newSide = Math.random() < wrongChance ? (prefersLeft ? "right" : "left") : player.preferredFoot;
  player.dribbleSide = newSide;

  player.targetX = player.x + (dx / mag) * 20;
  player.targetY = player.y + (dy / mag) * 20;
  player.currentAction = 'dribble';
},

  holdBall(player) {
    player.targetX = player.x;
    player.targetY = player.y;
    player.currentAction = 'holdBall';
  },

  fakeShot(player) {
    player.currentAction = 'fakeShot';
  },

  oneTwo(player, world, mate) {
    if (!mate) return;
    this.pass(player, world, mate);
    mate.sendMessage(player, { type: 'oneTwoReturn' });
    if (world.referee) world.referee.handlePass(player, mate, world.players);
  },

  backPass(player, world, target) {
    this.pass(player, world, target);
    player.currentAction = 'backPass';
    if (world.referee) world.referee.handlePass(player, target, world.players);
  },

  // Off-the-ball actions
  prepareShot(player, world) {
    const g = world.opponentGoal;
    player.targetX = (player.x + g.x) / 2;
    player.targetY = (player.y + g.y) / 2;
    player.currentAction = 'prepareShot';
  },

  screenOpponent(player, world, opponent) {
    if (!opponent) return;
    player.targetX = opponent.x;
    player.targetY = opponent.y;
    player.currentAction = 'screen';
  },

  overlap(player, world, mate) {
    if (!mate) return;
    const dir = mate.x > player.x ? 1 : -1;
    player.targetX = mate.x + dir * 20;
    player.targetY = mate.y;
    player.currentAction = 'overlap';
  },

  delayRun(player) {
    player.currentAction = 'delayRun';
  },

  trackBack(player, world) {
    player.targetX = player.formationX;
    player.targetY = player.formationY + 40;
    player.currentAction = 'trackBack';
  },

  // Defensive actions
  tackle(player, world, targetPlayer) {
    const target = targetPlayer || world.ball.owner;
    if (!target) return;
    player.targetX = target.x;
    player.targetY = target.y;
    player.currentAction = 'tackle';
    const dist = Math.hypot(player.x - target.x, player.y - target.y);
    if (dist < 18 && world.ball.owner === target) {
      world.ball.owner = player;
      world.ball.isLoose = false;
    }
  },

  intercept(player, world, passPath) {
    if (!passPath) return;
    player.targetX = passPath.x;
    player.targetY = passPath.y;
    player.currentAction = 'intercept';
  },

  mark(player, world, opponent) {
    if (!opponent) return;
    player.targetX = opponent.x;
    player.targetY = opponent.y;
    player.currentAction = 'mark';
  },

  press(player, world, opponent) {
    opponent = opponent || world.ball.owner;
    if (!opponent) return;
    player.targetX = opponent.x;
    player.targetY = opponent.y;
    player.currentAction = 'press';
  },

  coverZone(player, world, zone) {
    if (!zone) zone = { x: player.formationX, y: player.formationY };
    player.targetX = zone.x;
    player.targetY = zone.y;
    player.currentAction = 'cover';
  },

  blockShot(player) {
    player.currentAction = 'blockShot';
  },

  delayAttack(player) {
    player.currentAction = 'delayAttack';
  },

  clearBall(player, world, targetArea) {
    this.shoot(player, world, targetArea || { x: player.x < 525 ? 50 : 1000, y: 340 });
    player.currentAction = 'clear';
  },

  // Special role actions
  goalKick(player, world, targetArea) {
    this.clearBall(player, world, targetArea);
    player.currentAction = 'goalKick';
  },

  throwIn(player, world, target) {
    this.pass(player, world, target);
    player.currentAction = 'throwIn';
  },

  takeCorner(player, world, targetArea) {
    this.cross(player, world, targetArea);
    player.currentAction = 'corner';
  },

  takeFreeKick(player, world, targetArea) {
    this.pass(player, world, targetArea);
    player.currentAction = 'freeKick';
  },

  commandDefense(player, world, action, teammate) {
    if (teammate) player.sendMessage(teammate, { type: 'defenseCommand', action });
  },

  // Enhanced Communication & Coordination
  requestPass(player, world) {
    const owner = world.ball?.owner;
    if (owner && owner !== player && world.teammates.includes(owner)) {
      // Enhanced pass request with positioning info
      const passQuality = this.evaluatePassRequest(player, owner, world);
      player.sendMessage(owner, {
        type: 'requestPass',
        target: player,
        quality: passQuality,
        urgency: this.calculateRequestUrgency(player, world)
      });
    }
  },

  // Enhanced teammate coordination
  coordinateMovement(player, world) {
    const teammates = world.teammates.filter(p => p !== player);
    const nearbyTeammates = teammates.filter(p =>
      Math.hypot(player.x - p.x, player.y - p.y) < 40
    );

    nearbyTeammates.forEach(teammate => {
      // Coordinate spacing and positioning
      this.negotiatePositioning(player, teammate, world);
    });
  },

  // Create space for teammates
  createSpace(player, world, targetTeammate) {
    if (!targetTeammate) return;

    // Move to create space for the target teammate
    const direction = this.calculateSpaceCreationDirection(player, targetTeammate, world);
    player.targetX = player.x + direction.x * 25;
    player.targetY = player.y + direction.y * 25;
    player.currentAction = 'createSpace';

    // Inform teammate about created space
    player.sendMessage(targetTeammate, {
      type: 'spaceCreated',
      position: { x: player.targetX, y: player.targetY }
    });
  },

  // Support ball carrier
  supportBallCarrier(player, world) {
    const ballCarrier = world.ball?.owner;
    if (!ballCarrier || !world.teammates.includes(ballCarrier)) return;

    const supportPosition = this.calculateSupportPosition(player, ballCarrier, world);
    player.targetX = supportPosition.x;
    player.targetY = supportPosition.y;
    player.currentAction = 'support';

    // Signal availability to ball carrier
    player.sendMessage(ballCarrier, {
      type: 'supportAvailable',
      position: supportPosition,
      player: player
    });
  },

  // Make overlapping run
  makeOverlappingRun(player, world, triggerTeammate) {
    if (!triggerTeammate) return;

    const runDirection = this.calculateOverlapDirection(player, triggerTeammate, world);
    const runDistance = 30 + Math.random() * 20; // 30-50m run

    player.targetX = player.x + runDirection.x * runDistance;
    player.targetY = player.y + runDirection.y * runDistance;
    player.currentAction = 'overlap';

    // Coordinate timing with teammate
    player.sendMessage(triggerTeammate, {
      type: 'overlapStarted',
      runner: player,
      timing: performance.now() + 2000 // Signal when to pass
    });
  },

  // Enhanced communication
  shout(player, world, message, urgency = 1) {
    player.broadcastMessage(world.teammates, {
      type: 'shout',
      message,
      urgency,
      position: { x: player.x, y: player.y },
      timestamp: performance.now()
    });
  },

  callForMarkSwitch(player, world, opp, mate) {
    if (mate) {
      player.sendMessage(mate, {
        type: 'switchMark',
        opponent: opp,
        reason: this.calculateSwitchReason(player, mate, opp),
        urgency: this.calculateSwitchUrgency(player, opp, world)
      });
    }
  },

  signalOffsideTrap(player, world) {
    const defenders = world.teammates.filter(p =>
      ['IV', 'LIV', 'RIV', 'LV', 'RV'].includes(p.role)
    );

    defenders.forEach(defender => {
      player.sendMessage(defender, {
        type: 'offsideTrap',
        coordinator: player,
        timing: performance.now() + 1000
      });
    });
  },

  signalKeeperOut(player, world) {
    const keeper = world.teammates.find(p => p.role === 'TW');
    if (keeper) {
      player.sendMessage(keeper, {
        type: 'keeperOut',
        situation: this.assessKeeperSituation(world),
        urgency: this.calculateKeeperUrgency(world)
      });
    }
  },

  // ===== ENHANCED COORDINATION HELPER METHODS =====

  // Evaluate quality of pass request
  evaluatePassRequest(requester, ballCarrier, world) {
    const distance = Math.hypot(requester.x - ballCarrier.x, requester.y - ballCarrier.y);
    const pressure = this.calculatePlayerPressure(requester, world);
    const advancement = this.calculateGoalAdvancement(ballCarrier, requester, world);

    // Quality score (0-1)
    let quality = 0.5;
    quality += advancement * 0.3; // Goal advancement bonus
    quality -= pressure * 0.2; // Pressure penalty
    quality += (distance > 15 && distance < 50) ? 0.2 : -0.1; // Optimal distance bonus

    return Math.max(0, Math.min(1, quality));
  },

  // Calculate urgency of pass request
  calculateRequestUrgency(player, world) {
    const pressure = this.calculatePlayerPressure(player, world);
    const goalDistance = Math.hypot(player.x - world.opponentGoal.x, player.y - world.opponentGoal.y);

    let urgency = 0.5;
    urgency += pressure * 0.3; // More urgent if under pressure
    urgency += (goalDistance < 100) ? 0.4 : 0; // Very urgent near goal
    urgency += (player.role === 'ST' || player.role.includes('S')) ? 0.2 : 0; // Strikers get priority

    return Math.max(0, Math.min(1, urgency));
  },

  // Negotiate positioning between teammates
  negotiatePositioning(player1, player2, world) {
    const distance = Math.hypot(player1.x - player2.x, player1.y - player2.y);

    if (distance < 20) { // Too close
      const separationVector = this.calculateSeparationVector(player1, player2);

      // Player with lower priority moves
      const priority1 = this.calculatePositionalPriority(player1, world);
      const priority2 = this.calculatePositionalPriority(player2, world);

      if (priority1 < priority2) {
        player1.targetX += separationVector.x * 15;
        player1.targetY += separationVector.y * 15;
      } else {
        player2.targetX -= separationVector.x * 15;
        player2.targetY -= separationVector.y * 15;
      }
    }
  },

  // Calculate direction to create space
  calculateSpaceCreationDirection(player, targetTeammate, world) {
    // Move away from target teammate and toward optimal position
    const awayFromTeammate = {
      x: player.x - targetTeammate.x,
      y: player.y - targetTeammate.y
    };

    const magnitude = Math.hypot(awayFromTeammate.x, awayFromTeammate.y) || 1;
    return {
      x: awayFromTeammate.x / magnitude,
      y: awayFromTeammate.y / magnitude
    };
  },

  // Calculate support position for ball carrier
  calculateSupportPosition(supporter, ballCarrier, world) {
    const goal = world.opponentGoal;
    const ballToGoal = {
      x: goal.x - ballCarrier.x,
      y: goal.y - ballCarrier.y
    };

    // Position at angle to ball carrier, toward goal
    const angle = Math.atan2(ballToGoal.y, ballToGoal.x) + (Math.random() - 0.5) * Math.PI / 3;
    const distance = 25 + Math.random() * 15; // 25-40m support distance

    return {
      x: ballCarrier.x + Math.cos(angle) * distance,
      y: ballCarrier.y + Math.sin(angle) * distance
    };
  },

  // Calculate overlap run direction
  calculateOverlapDirection(runner, trigger, world) {
    const goal = world.opponentGoal;

    // Run toward goal, slightly wide of trigger player
    const toGoal = {
      x: goal.x - trigger.x,
      y: goal.y - trigger.y
    };

    const magnitude = Math.hypot(toGoal.x, toGoal.y) || 1;
    const baseDirection = {
      x: toGoal.x / magnitude,
      y: toGoal.y / magnitude
    };

    // Add lateral component for width
    const lateral = runner.y > trigger.y ? 1 : -1;
    return {
      x: baseDirection.x * 0.8 + lateral * 0.2,
      y: baseDirection.y * 0.8
    };
  },

  // Calculate player pressure from opponents
  calculatePlayerPressure(player, world) {
    if (!world.opponents) return 0;

    let pressure = 0;
    world.opponents.forEach(opponent => {
      const distance = Math.hypot(player.x - opponent.x, player.y - opponent.y);
      if (distance < 20) {
        pressure += (20 - distance) / 20;
      }
    });

    return Math.min(1, pressure);
  },

  // Calculate goal advancement from pass
  calculateGoalAdvancement(passer, receiver, world) {
    const goal = world.opponentGoal;
    const passerDist = Math.hypot(passer.x - goal.x, passer.y - goal.y);
    const receiverDist = Math.hypot(receiver.x - goal.x, receiver.y - goal.y);

    return Math.max(0, (passerDist - receiverDist) / passerDist);
  },

  // Calculate separation vector between players
  calculateSeparationVector(player1, player2) {
    const dx = player1.x - player2.x;
    const dy = player1.y - player2.y;
    const magnitude = Math.hypot(dx, dy) || 1;

    return {
      x: dx / magnitude,
      y: dy / magnitude
    };
  },

  // Calculate positional priority for conflict resolution
  calculatePositionalPriority(player, world) {
    let priority = 0.5;

    // Ball carrier gets highest priority
    if (world.ball?.owner === player) priority += 0.5;

    // Role-based priority
    const rolePriority = {
      'ST': 0.4, 'LS': 0.4, 'RS': 0.4,
      'OM': 0.3, 'LF': 0.3, 'RF': 0.3,
      'ZM': 0.2, 'LM': 0.2, 'RM': 0.2,
      'DM': 0.1, 'IV': 0.1, 'LIV': 0.1, 'RIV': 0.1,
      'LV': 0.0, 'RV': 0.0, 'TW': -0.1
    };
    priority += rolePriority[player.role] || 0;

    // Distance to formation position (closer = higher priority)
    const formationDistance = Math.hypot(
      player.x - player.formationX,
      player.y - player.formationY
    );
    priority += Math.max(0, 0.2 - formationDistance / 100);

    return priority;
  },

  // Calculate reason for mark switching
  calculateSwitchReason(player, teammate, opponent) {
    const playerToOpp = Math.hypot(player.x - opponent.x, player.y - opponent.y);
    const teammateToOpp = Math.hypot(teammate.x - opponent.x, teammate.y - opponent.y);

    if (teammateToOpp < playerToOpp * 0.7) {
      return 'closer';
    } else if (this.isRoleBetterMatch(teammate.role, opponent.role)) {
      return 'roleMatch';
    } else {
      return 'tactical';
    }
  },

  // Calculate urgency of mark switch
  calculateSwitchUrgency(player, opponent, world) {
    const distance = Math.hypot(player.x - opponent.x, player.y - opponent.y);
    const goalThreat = this.assessGoalThreat(opponent, world);

    let urgency = 0.3;
    urgency += (distance < 15) ? 0.4 : 0; // Very urgent if close
    urgency += goalThreat * 0.3; // Urgent if opponent is dangerous

    return Math.min(1, urgency);
  },

  // Check if role is better match for marking
  isRoleBetterMatch(defenderRole, attackerRole) {
    const matchups = {
      'ST': ['IV', 'LIV', 'RIV'],
      'LF': ['RV', 'RIV'], 'RF': ['LV', 'LIV'],
      'OM': ['DM', 'ZM'], 'LM': ['RM', 'RV'], 'RM': ['LM', 'LV']
    };

    return matchups[attackerRole]?.includes(defenderRole) || false;
  },

  // Assess goalkeeper situation
  assessKeeperSituation(world) {
    const ball = world.ball;
    if (!ball) return 'normal';

    const goalDistance = Math.hypot(ball.x - world.opponentGoal.x, ball.y - world.opponentGoal.y);

    if (goalDistance < 30) return 'dangerous';
    if (goalDistance < 50) return 'alert';
    return 'normal';
  },

  // Calculate keeper urgency
  calculateKeeperUrgency(world) {
    const situation = this.assessKeeperSituation(world);
    const urgencyMap = { 'dangerous': 0.9, 'alert': 0.6, 'normal': 0.3 };
    return urgencyMap[situation] || 0.3;
  },

  // Assess goal threat from opponent
  assessGoalThreat(opponent, world) {
    const goalDistance = Math.hypot(opponent.x - world.opponentGoal.x, opponent.y - world.opponentGoal.y);
    const hasSpace = this.calculatePlayerPressure(opponent, world) < 0.3;

    let threat = 0;
    threat += (goalDistance < 50) ? 0.5 : 0;
    threat += (goalDistance < 25) ? 0.3 : 0;
    threat += hasSpace ? 0.2 : 0;

    return Math.min(1, threat);
  },

  // Perception
  turnHeadTo(player, world, angleOrPos) {
    const angle = typeof angleOrPos === 'number'
      ? angleOrPos
      : Math.atan2(angleOrPos.y - player.y, angleOrPos.x - player.x) * 180 / Math.PI;
    player.turnHeadTo(angle);
  },

  scanField(player) {
    player.scanTimer = 0;
    player.scanTargetAngle = undefined;
  },

  memorizeSituation(player, world) {
    player.lastSituation = { ballX: world.ball.x, ballY: world.ball.y, x: player.x, y: player.y };
  },

  focusOnObject(player, world, obj) {
    if (obj) this.turnHeadTo(player, world, obj);
  },

  // Utility
  holdFormation(player) {
    player.targetX = player.formationX;
    player.targetY = player.formationY;
    player.currentAction = 'holdFormation';
  },

  recoverStamina(player) {
    player.pressing = Math.max(0.5, (player.pressing ?? 1) - 0.02);
    player.stamina = Math.min(1, (player.stamina ?? 1) + 0.005);
  },

  rest(player) {
    player.targetX = player.formationX;
    player.targetY = player.formationY;
    player.currentAction = 'rest';
  },

  simulateInjury(player) {
    player.injured = true;
    player.injuryRecovery = 60;
  }
};
