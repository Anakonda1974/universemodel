/**
 * Centralized Event Management System
 * Handles all game events, FIFA rules, and event coordination
 */

export class EventManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.eventHandlers = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // FIFA rule events
    this.eventHandlers.set('goal', this.handleGoalEvent.bind(this));
    this.eventHandlers.set('halftime', this.handleHalftimeEvent.bind(this));
    this.eventHandlers.set('fulltime', this.handleFulltimeEvent.bind(this));
    this.eventHandlers.set('throwIn', this.handleThrowInEvent.bind(this));
    this.eventHandlers.set('corner', this.handleCornerEvent.bind(this));
    this.eventHandlers.set('freeKick', this.handleFreeKickEvent.bind(this));
    this.eventHandlers.set('penalty', this.handlePenaltyEvent.bind(this));
    this.eventHandlers.set('foul', this.handleFoulEvent.bind(this));
    this.eventHandlers.set('card', this.handleCardEvent.bind(this));
    this.eventHandlers.set('offside', this.handleOffsideEvent.bind(this));
    
    // Game state events
    this.eventHandlers.set('substitution', this.handleSubstitutionEvent.bind(this));
    this.eventHandlers.set('formation', this.handleFormationEvent.bind(this));
    this.eventHandlers.set('playerSwitch', this.handlePlayerSwitchEvent.bind(this));
  }

  handleEvent(eventType, data) {
    console.log(`Event: ${eventType}`, data);
    
    const handler = this.eventHandlers.get(eventType);
    if (handler) {
      handler(data);
    } else {
      console.warn(`Unhandled event: ${eventType}`);
    }
  }

  // FIFA Rule Events
  handleGoalEvent(data) {
    const { scorer, assistedBy, minute } = data;
    
    // Update score
    if (this.gameState.teamHome.includes(scorer)) {
      this.gameState.addGoal('home');
    } else {
      this.gameState.addGoal('away');
    }

    // Visual effects
    this.gameState.effects.goalFlash.timer = 2;
    this.gameState.effects.goalFlash.side = this.gameState.teamHome.includes(scorer) ? "home" : "away";
    this.gameState.effects.goalOverlay.timer = 3;
    this.gameState.effects.goalOverlay.text = `Goal by ${scorer.role}!`;

    // Spawn confetti
    this.spawnConfetti(this.gameState.teamHome.includes(scorer) ? "right" : "left");

    // Audio
    this.playGoalSound();

    // Commentary
    this.logComment(`Goal! ${scorer.role} scores!`);

    // Schedule kickoff reset
    setTimeout(() => {
      this.resetKickoff();
    }, 3000);
  }

  handleHalftimeEvent() {
    this.logComment("Halftime");
    this.gameState.match.halftime = 2;
    // Additional halftime logic
  }

  handleFulltimeEvent() {
    const score = `${this.gameState.scoreHome}:${this.gameState.scoreAway}`;
    this.logComment(`Full time! Final score: ${score}`);
    this.gameState.pauseMatch();
  }

  handleThrowInEvent(data) {
    const { side, position } = data;
    this.startThrowIn(side, position);
  }

  handleCornerEvent(data) {
    const { side, position } = data;
    this.startCorner(side, position);
  }

  handleFreeKickEvent(data) {
    const { team, position, reason } = data;
    this.startFreeKick(team, position, reason);
  }

  handlePenaltyEvent(data) {
    const { team, reason } = data;
    this.startPenalty(team, reason);
  }

  handleFoulEvent(data) {
    const { fouler, victim, severity, restart } = data;
    
    if (restart && restart.type === "penalty") {
      this.startPenalty(victim.team, "foul in penalty area");
    } else {
      this.startFreeKick(victim.team, { x: victim.x, y: victim.y }, "foul");
    }

    this.logComment(`Foul by ${fouler.role} on ${victim.role}`);
    this.playWhistleSound();
  }

  handleCardEvent(data) {
    const { player, cardType, reason } = data;
    
    if (cardType === "yellow") {
      this.gameState.discipline.yellowCards.push(player);
      this.logComment(`Yellow card for ${player.role} - ${reason}`);
    } else if (cardType === "red") {
      this.gameState.discipline.redCards.push(player);
      this.logComment(`Red card for ${player.role} - ${reason}!`);
      
      // Remove player from field
      if (this.gameState.ball.owner === player) {
        this.gameState.ball.owner = null;
        this.gameState.ball.isLoose = true;
      }
      player.x = -30;
      player.y = -30;
    }
    
    this.playWhistleSound();
  }

  handleOffsideEvent(data) {
    const { player } = data;
    
    this.playWhistleSound();
    this.logComment("Offside!");
    
    const oppTeam = this.gameState.teamHome.includes(player) ? this.gameState.teamAway : this.gameState.teamHome;
    const kicker = this.findNearestPlayer(oppTeam, player);
    
    // Position ball and kicker
    this.gameState.ball.x = player.x;
    this.gameState.ball.y = player.y;
    this.gameState.ball.vx = 0;
    this.gameState.ball.vy = 0;
    this.gameState.ball.owner = kicker;
    this.gameState.ball.isLoose = false;
    
    kicker.x = player.x;
    kicker.y = player.y;
    kicker.currentAction = "freekick";
  }

  // Game State Events
  handleSubstitutionEvent(data) {
    const { team, playerOut, playerIn } = data;
    this.executeSubstitution(team, playerOut, playerIn);
  }

  handleFormationEvent(data) {
    const { formationIndex } = data;
    this.setFormation(formationIndex);
  }

  handlePlayerSwitchEvent(data) {
    const { team, newPlayer } = data;
    this.switchPlayer(team, newPlayer);
  }

  // Restart Methods
  startThrowIn(side, position) {
    const restarts = this.gameState.restarts;
    restarts.restart.timer = 2;
    restarts.restart.type = "Throw-in";
    
    const team = restarts.lastTouchTeam === 0 ? this.gameState.teamAway : this.gameState.teamHome;
    const taker = this.findNearestPlayer(team, this.gameState.ball);
    
    restarts.restart.taker = taker;
    this.gameState.ball.owner = taker;
    this.gameState.ball.isLoose = false;
    
    // Position ball at sideline
    this.gameState.ball.x = Math.min(1040, Math.max(10, this.gameState.ball.x));
    this.gameState.ball.y = side === "top" ? 10 : 670;
    
    taker.x = this.gameState.ball.x;
    taker.y = side === "top" ? this.gameState.ball.y + 5 : this.gameState.ball.y - 5;
    
    this.playWhistleSound();
    this.logComment("Throw-in");
  }

  startCorner(side, position) {
    const restarts = this.gameState.restarts;
    restarts.restart.timer = 2;
    restarts.restart.type = "Corner";
    
    const attacking = side === "left" ? this.gameState.teamAway : this.gameState.teamHome;
    const cornerX = side === "left" ? 10 : 1040;
    const cornerY = this.gameState.ball.y < 340 ? 10 : 670;
    
    const taker = this.findNearestPlayer(attacking, { x: cornerX, y: cornerY });
    
    restarts.restart.taker = taker;
    this.gameState.ball.owner = taker;
    this.gameState.ball.isLoose = false;
    this.gameState.ball.x = cornerX;
    this.gameState.ball.y = cornerY;
    
    taker.x = cornerX;
    taker.y = cornerY;
    
    this.playWhistleSound();
    this.logComment("Corner kick");
  }

  startFreeKick(team, position, reason) {
    const restarts = this.gameState.restarts;
    restarts.freeKick.timer = 2;
    restarts.freeKick.taker = team[0]; // Should be more intelligent
    
    this.gameState.ball.x = position.x;
    this.gameState.ball.y = position.y;
    this.gameState.ball.owner = restarts.freeKick.taker;
    this.gameState.ball.isLoose = false;
    
    this.playWhistleSound();
    this.logComment(`Free kick - ${reason}`);
  }

  startPenalty(team, reason) {
    const restarts = this.gameState.restarts;
    restarts.restart.timer = 3;
    restarts.restart.type = "Penalty";
    
    const penaltyTaker = team.find(p => p.role === 'ST') || team[0];
    
    this.gameState.ball.owner = penaltyTaker;
    this.gameState.ball.isLoose = false;
    this.gameState.ball.x = team === this.gameState.teamHome ? 885 : 165;
    this.gameState.ball.y = 340;
    
    restarts.restart.taker = penaltyTaker;
    
    this.playWhistleSound();
    this.logComment(`Penalty - ${reason}!`);
  }

  resetKickoff() {
    this.gameState.ball.x = 525;
    this.gameState.ball.y = 340;
    this.gameState.ball.vx = 0;
    this.gameState.ball.vy = 0;
    this.gameState.ball.isLoose = true;
    this.gameState.ball.outOfBounds = null;
    
    // Reset formation
    this.setFormation(this.gameState.formation.selectedIndex);
    
    // Assign ball to home team center
    this.gameState.ball.owner = this.gameState.teamHome[4];
    this.gameState.ball.isLoose = false;
    
    // Clear restart timers
    this.gameState.restarts.restart.timer = 0;
    this.gameState.restarts.freeKick.timer = 0;
    this.gameState.restarts.restart.taker = null;
    this.gameState.restarts.freeKick.taker = null;
    
    this.playWhistleSound();
    this.logComment("Kickoff");
  }

  // Utility Methods
  findNearestPlayer(team, target) {
    return team.reduce((best, player) => {
      const distance = Math.hypot(player.x - target.x, player.y - target.y);
      return distance < best.distance ? { player, distance } : best;
    }, { player: team[0], distance: Infinity }).player;
  }

  spawnConfetti(side) {
    const baseX = side === "left" ? 60 : 990;
    const particles = this.gameState.effects.confettiParticles;
    
    for (let i = 0; i < 25; i++) {
      particles.push({
        x: baseX + (Math.random() - 0.5) * 40,
        y: 320 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3 - 2,
        color: `hsl(${Math.random() * 360},80%,60%)`,
        life: 1.5,
      });
    }
  }

  // Audio Methods
  playWhistleSound() {
    // Implement whistle sound
    console.log("🎵 Whistle sound");
  }

  playGoalSound() {
    // Implement goal sound
    console.log("🎵 Goal sound");
  }

  // Commentary
  logComment(message) {
    console.log(`📢 ${message}`);
    // Integrate with existing commentary system
  }

  resetKickoff() {
    this.gameState.ball.x = 525;
    this.gameState.ball.y = 340;
    this.gameState.ball.vx = 0;
    this.gameState.ball.vy = 0;
    this.gameState.ball.isLoose = true;
    this.gameState.ball.outOfBounds = null;

    // Reset formation
    this.setFormation(this.gameState.formation.selectedIndex);

    // Assign ball to home team center
    this.gameState.ball.owner = this.gameState.teams.home[4];
    this.gameState.ball.isLoose = false;

    // Clear restart timers
    this.gameState.restarts.restart.timer = 0;
    this.gameState.restarts.freeKick.timer = 0;
    this.gameState.restarts.restart.taker = null;
    this.gameState.restarts.freeKick.taker = null;

    this.playWhistleSound();
    this.logComment("Kickoff");
  }

  // Formation and substitution methods would be implemented here
  setFormation(index) {
    // Implementation would go here - for now, just log
    console.log(`Setting formation ${index}`);
  }
  executeSubstitution(team, playerOut, playerIn) { /* Implementation */ }
  switchPlayer(team, newPlayer) { /* Implementation */ }
}
