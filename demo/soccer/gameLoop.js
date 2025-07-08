/**
 * Modular Game Loop System
 * Breaks down the massive game loop into focused, manageable functions
 */

export class GameLoop {
  constructor(gameState, inputManager, renderer) {
    this.gameState = gameState;
    this.inputManager = inputManager;
    this.renderer = renderer;
    this.lastFrameTime = null;
  }

  start() {
    this.lastFrameTime = null;
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  loop(timestamp) {
    if (this.lastFrameTime === null) this.lastFrameTime = timestamp;
    const delta = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;

    // Handle special game states first
    if (this.handleSpecialStates(delta)) {
      requestAnimationFrame((timestamp) => this.loop(timestamp));
      return;
    }

    // Main game update sequence
    this.updateInput(delta);
    this.updateGameLogic(delta);
    this.updatePhysics(delta);
    this.updateAI(delta);
    this.updateGameState(delta);
    this.render();
    this.updateUI();

    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  handleSpecialStates(delta) {
    // Handle restart timers
    if (this.gameState.restarts.restart.timer > 0) {
      this.handleRestartState(delta);
      return true;
    }

    // Handle free kick timers
    if (this.gameState.restarts.freeKick.timer > 0) {
      this.handleFreeKickState(delta);
      return true;
    }

    return false;
  }

  handleRestartState(delta) {
    const restart = this.gameState.restarts.restart;
    restart.timer -= delta;
    
    // Keep ball with restart taker
    const ball = this.gameState.ball;
    ball.x = restart.taker.x;
    ball.y = restart.taker.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.owner = restart.taker;

    // Render restart state
    this.renderer.renderRestartState(restart);
  }

  handleFreeKickState(delta) {
    const freeKick = this.gameState.restarts.freeKick;
    freeKick.timer -= delta;
    
    // Keep ball with free kick taker
    const ball = this.gameState.ball;
    ball.x = freeKick.taker.x;
    ball.y = freeKick.taker.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.owner = freeKick.taker;

    // Render free kick state
    this.renderer.renderFreeKickState(freeKick);
  }

  updateInput(delta) {
    this.inputManager.updateInput(delta, this.gameState);
    
    // Handle reset input
    if (this.inputManager.isResetPressed()) {
      this.gameState.resetMatch();
    }
  }

  updateGameLogic(delta) {
    // Update match time
    this.gameState.updateMatchTime(delta);
    
    // Check for halftime/fulltime
    this.checkMatchProgression();
    
    // Update formation offsets
    this.updateFormationOffsets();
    
    // Handle substitutions
    this.checkSubstitutions();
  }

  updatePhysics(delta) {
    const allPlayers = this.gameState.getAllPlayers();
    
    // Update ball physics
    this.gameState.ball.update(delta, allPlayers, this.gameState.fieldBounds, this.gameState.settings.weather);
    
    // Handle ball possession changes
    this.handleBallPossession();
    
    // Resolve player collisions
    this.resolvePlayerCollisions(allPlayers);
    
    // Update visual effects
    this.updateVisualEffects(delta);
  }

  updateAI(delta) {
    const allPlayers = this.gameState.getAllPlayers();
    
    // 1. Perception phase
    this.updatePlayerPerception(allPlayers);
    
    // 2. Decision phase
    this.updatePlayerDecisions(allPlayers);
    
    // 3. Movement phase
    this.updatePlayerMovement(allPlayers);
    
    // 4. Action execution phase
    this.executePlayerActions(allPlayers);
  }

  updatePlayerPerception(allPlayers) {
    const ball = this.gameState.ball;
    const POIS = [{ x: 60, y: 340, role: "farLeft" }]; // Move to config
    
    allPlayers.forEach((player) => {
      const poiGoal = this.gameState.teamHome.includes(player) 
        ? { x: 1040, y: 340, role: "opponentGoal" } 
        : { x: 10, y: 340, role: "opponentGoal" };
      
      player.perceive([...allPlayers, ball, poiGoal, ...POIS]);
    });
  }

  updatePlayerDecisions(allPlayers) {
    const coach = this.gameState.coach;
    const referee = this.gameState.referee;
    const ball = this.gameState.ball;
    
    allPlayers.forEach((player) => {
      player.hasBall = ball.owner === player;
      
      const myTeam = this.gameState.teamHome.includes(player) ? this.gameState.teamHome : this.gameState.teamAway;
      const otherTeam = this.gameState.teamHome.includes(player) ? this.gameState.teamAway : this.gameState.teamHome;
      
      const world = {
        players: allPlayers,
        teammates: myTeam,
        opponents: otherTeam,
        ball,
        referee,
        coach,
        phase: coach?.phase,
        opponentGoal: this.gameState.teamHome.includes(player) ? { x: 1040, y: 340 } : { x: 10, y: 340 },
        farLeft: { x: 60, y: 340 },
      };
      
      player.maybeDecide(performance.now(), world, this.gameState.gameState.current);
      
      // Update formation positioning for non-controlled players
      this.updateFormationPositioning(player, myTeam);
    });
  }

  updatePlayerMovement(allPlayers) {
    const ball = this.gameState.ball;
    const coach = this.gameState.coach;
    const referee = this.gameState.referee;
    
    allPlayers.forEach((player) => {
      const myTeam = this.gameState.teamHome.includes(player) ? this.gameState.teamHome : this.gameState.teamAway;
      const otherTeam = this.gameState.teamHome.includes(player) ? this.gameState.teamAway : this.gameState.teamHome;
      
      const world = { 
        ball, 
        teammates: myTeam, 
        opponents: otherTeam, 
        referee, 
        coach, 
        phase: coach?.phase 
      };
      
      player.moveToTarget(world);
      
      // Update head direction
      player.updateHead(ball, delta, {
        teammates: myTeam,
        opponents: otherTeam,
      });
    });
  }

  executePlayerActions(allPlayers) {
    // Handle pass execution
    this.handlePassExecution();
    
    // Handle tackle attempts
    this.handleTackleAttempts(allPlayers);
    
    // Update player cooldowns
    this.updatePlayerCooldowns(allPlayers, delta);
  }

  updateGameState(delta) {
    // Update referee
    this.gameState.referee.update(
      this.gameState.getAllPlayers(), 
      this.gameState.ball, 
      delta, 
      this.gameState.match.time
    );
    
    // Handle ball out of bounds
    this.handleBallOutOfBounds();
    
    // Handle automatic player switching
    this.handleAutomaticPlayerSwitching();
    
    // Check for goals
    this.checkGoals();
  }

  render() {
    this.renderer.render(this.gameState);
  }

  updateUI() {
    this.updateScoreboard();
    this.updatePowerBar();
    this.updateEffectTimers(delta);
  }

  // Helper methods
  checkMatchProgression() {
    const match = this.gameState.match;
    const halfSeconds = match.halfLengthMinutes * 60;
    
    if (match.halftime === 1 && match.time >= halfSeconds) {
      match.halftime = 2;
    }
    
    if (match.halftime === 2 && match.time >= halfSeconds * 2) {
      this.gameState.pauseMatch();
    }
  }

  updateFormationOffsets() {
    const ball = this.gameState.ball;
    const coach = this.gameState.coach;
    const formation = this.gameState.formation;
    
    const sideShift = ((ball.x - 525) / 525) * 30;
    formation.offsetHome.x = sideShift;
    formation.offsetAway.x = sideShift;
    
    const ownerTeam = this.getTeamId(ball.owner);
    if (ownerTeam !== null) {
      if (ownerTeam === 0) {
        formation.offsetHome.x += 20;
        formation.offsetAway.x -= 20;
      } else {
        formation.offsetHome.x -= 20;
        formation.offsetAway.x += 20;
      }
    }
    
    if (coach.attackSide === "left") {
      formation.offsetHome.x -= 15;
      formation.offsetAway.x += 15;
    } else if (coach.attackSide === "right") {
      formation.offsetHome.x += 15;
      formation.offsetAway.x -= 15;
    }
    
    formation.offsetHome.y = 0;
    formation.offsetAway.y = 0;
  }

  updateFormationPositioning(player, team) {
    if (player.controlledByUser || (player.currentAction !== "hold" && player.currentAction !== "rest")) {
      return;
    }
    
    const teamIdx = this.gameState.teamHome.includes(player) ? 0 : 1;
    const offset = teamIdx === 0 ? this.gameState.formation.offsetHome : this.gameState.formation.offsetAway;
    
    let tx = player.formationX + offset.x;
    let ty = player.formationY + offset.y;
    
    // Ball influence on formation
    const ball = this.gameState.ball;
    const dxBall = ball.x - player.formationX;
    const dyBall = ball.y - player.formationY;
    
    if (Math.hypot(dxBall, dyBall) < 200) {
      tx += dxBall * 0.2;
      ty += dyBall * 0.2;
    }
    
    player.targetX = tx;
    player.targetY = ty;
  }

  getTeamId(player) {
    if (!player) return null;
    if (this.gameState.teamHome.includes(player)) return 0;
    if (this.gameState.teamAway.includes(player)) return 1;
    return null;
  }

  // Additional helper methods implementation
  resolvePlayerCollisions(players) {
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i];
        const b = players[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }
    }
  }

  updateVisualEffects(delta) {
    // Update confetti
    this.gameState.effects.confettiParticles = this.gameState.effects.confettiParticles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 6 * delta;
      p.life -= delta;
      return p.life > 0;
    });

    // Update goal flash
    if (this.gameState.effects.goalFlash.timer > 0) {
      this.gameState.effects.goalFlash.timer -= delta;
    }

    // Update goal overlay
    if (this.gameState.effects.goalOverlay.timer > 0) {
      this.gameState.effects.goalOverlay.timer -= delta;
    }

    // Update pass indicator
    if (this.gameState.effects.passIndicator && this.gameState.effects.passIndicator.time > 0) {
      this.gameState.effects.passIndicator.time -= delta;
      if (this.gameState.effects.passIndicator.time <= 0) {
        this.gameState.effects.passIndicator = null;
      }
    }
  }

  handleBallPossession() {
    // This would handle ball possession changes
    // For now, just a placeholder
  }

  handlePassExecution() {
    // Handle pass execution logic
    const ball = this.gameState.ball;
    if (ball.owner && ball.owner.currentAction === "pass") {
      const owner = ball.owner;
      console.log(`${owner.role} executes pass`);
      // Pass execution logic would go here
    }
  }

  handleTackleAttempts(allPlayers) {
    const ball = this.gameState.ball;
    for (const p of allPlayers) {
      if (p.currentAction === "tackle" && ball.owner !== p) {
        const d = Math.hypot(p.x - ball.x, p.y - ball.y);
        if (d < p.radius + ball.radius + 2) {
          ball.owner = p;
          ball.isLoose = false;
          ball.x = p.x;
          ball.y = p.y;
          for (const other of allPlayers) other.hasBall = false;
          p.hasBall = true;
        }
      }
    }
  }

  updatePlayerCooldowns(allPlayers, delta) {
    allPlayers.forEach((p) => {
      p.updateInjury(delta);
      if (p.ballCooldown > 0) {
        p.ballCooldown -= delta;
        if (p.ballCooldown <= 0) {
          p.ballCooldown = 0;
        }
      }
    });
  }

  handleBallOutOfBounds() {
    // Handle ball out of bounds logic
    // This would be implemented based on existing logic
  }

  handleAutomaticPlayerSwitching() {
    // Handle automatic player switching
    // This would be implemented based on existing logic
  }

  checkGoals() {
    const ball = this.gameState.ball;
    // Check for goals
    if (ball.x < 15 && ball.y > 290 && ball.y < 390) {
      this.gameState.addGoal('away');
      console.log("Goal for away team!");
      // Trigger goal event
    }
    if (ball.x > 1035 && ball.y > 290 && ball.y < 390) {
      this.gameState.addGoal('home');
      console.log("Goal for home team!");
      // Trigger goal event
    }
  }

  checkSubstitutions() {
    // Check for substitutions based on player stamina/injury
    // This would be implemented based on existing logic
  }

  updateScoreboard() {
    // Update scoreboard display
    // This would be implemented based on existing UI logic
  }

  updatePowerBar() {
    // Update power bar display
    // This would be implemented based on existing UI logic
  }

  updateEffectTimers(delta) {
    // Update various effect timers
    this.updateVisualEffects(delta);
  }
}
