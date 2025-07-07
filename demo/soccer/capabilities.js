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

  // Communication & meta
  requestPass(player, world) {
    const owner = world.ball?.owner;
    if (owner && owner !== player && world.teammates.includes(owner)) {
      player.sendMessage(owner, { type: 'requestPass', target: player });
    }
  },

  shout(player, world, message, urgency = 1) {
    player.broadcastMessage(world.teammates, { type: 'shout', message, urgency });
  },

  callForMarkSwitch(player, world, opp, mate) {
    if (mate) player.sendMessage(mate, { type: 'switchMark', opponent: opp });
  },

  signalOffsideTrap(player, world) {
    player.broadcastMessage(world.teammates, { type: 'offsideTrap' });
  },

  signalKeeperOut(player, world) {
    const keeper = world.teammates.find(p => p.role === 'TW');
    if (keeper) player.sendMessage(keeper, { type: 'keeperOut' });
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
