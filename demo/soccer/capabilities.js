// capabilities.js

export const Capabilities = {
  // Offensive actions
  shoot(player, world, goalPos = world.opponentGoal) {
    const ball = world.ball;
    if (!ball || ball.owner !== player) return;
    const dx = goalPos.x - player.x;
    const dy = goalPos.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    ball.owner = null;
    ball.isLoose = true;
    ball.vx = (dx / dist) * 20;
    ball.vy = (dy / dist) * 20;
    ball.x = player.x;
    ball.y = player.y;
    player.currentAction = 'shoot';
  },

  pass(player, world, target) {
    const ball = world.ball;
    if (!ball || ball.owner !== player || !target) return;
    const tx = target.x ?? target.targetX;
    const ty = target.y ?? target.targetY;
    if (tx === undefined || ty === undefined) return;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    ball.owner = null;
    ball.isLoose = true;
    ball.vx = (dx / dist) * 12;
    ball.vy = (dy / dist) * 12;
    ball.x = player.x;
    ball.y = player.y;
    player.currentAction = 'pass';
  },

  lobPass(player, world, target) {
    const ball = world.ball;
    if (!ball || ball.owner !== player || !target) return;
    const tx = target.x ?? target.targetX;
    const ty = target.y ?? target.targetY;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    ball.owner = null;
    ball.isLoose = true;
    ball.vx = (dx / dist) * 10;
    ball.vy = (dy / dist) * 10 - 2; // slight lift
    ball.x = player.x;
    ball.y = player.y;
    player.currentAction = 'lobPass';
  },

  cross(player, world, targetArea) {
    this.lobPass(player, world, targetArea || world.opponentGoal);
    player.currentAction = 'cross';
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
  },

  backPass(player, world, target) {
    this.pass(player, world, target);
    player.currentAction = 'backPass';
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

  simulateInjury(player) {
    player.injured = true;
    player.injuryRecovery = 60;
  }
};
