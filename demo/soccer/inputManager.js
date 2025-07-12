/**
 * Unified Input Management System
 * Handles all player input, charging states, and input validation
 */

export class InputManager {
  constructor(inputHandler) {
    this.inputHandler = inputHandler;
    this.players = {
      player1: { selected: null, team: null },
      player2: { selected: null, team: null }
    };
    
    this.charging = {
      pass1: { active: false, charge: 0, target: null },
      pass2: { active: false, charge: 0, target: null },
      shot1: { active: false, charge: 0 },
      shot2: { active: false, charge: 0 }
    };

    this.previousStates = {
      tackle1: false,
      tackle2: false,
      pass2: false
    };
  }

  setPlayers(player1, team1, player2, team2) {
    this.players.player1.selected = player1;
    this.players.player1.team = team1;
    this.players.player2.selected = player2;
    this.players.player2.team = team2;
  }

  updateInput(delta, gameState) {
    const input1 = this.inputHandler.sample(delta);
    const input2 = this.getPlayer2Input(); // Implement based on your player 2 input system

    this.handlePlayer1Input(input1, delta, gameState);
    this.handlePlayer2Input(input2, delta, gameState);
    
    this.updatePreviousStates(input1, input2);
  }

  handlePlayer1Input(input, delta, gameState) {
    const player = this.players.player1.selected;
    if (!player) return;

    // Movement
    this.handleMovement(player, input.direction.x, input.direction.y);

    // Ball actions (only if player has ball)
    if (gameState.ball.owner === player) {
      this.handleShooting(player, input, delta, 1);
      this.handlePassing(player, input, delta, 1);
      this.handleTackling(player, input, 1);
    } else {
      this.resetCharging(1);
    }

    // Player switching
    if (input.switch) {
      this.switchToNearestPlayer(this.players.player1.team, gameState.ball);
      this.inputHandler.triggerCooldown("pass");
    }

    // Cancel actions
    if (input.cancel) {
      this.cancelCharging(1);
    }

    // Reset game
    if (input.resetDown) {
      gameState.resetMatch();
    }
  }

  handlePlayer2Input(input, delta, gameState) {
    const player = this.players.player2.selected;
    if (!player) return;

    // Movement
    this.handleMovement(player, input.dx, input.dy);

    // Ball actions (only if player has ball)
    if (gameState.ball.owner === player) {
      this.handleShooting(player, input, delta, 2);
      this.handlePassing(player, input, delta, 2);
      this.handleTackling(player, input, 2);
    } else {
      this.resetCharging(2);
    }
  }

  handleMovement(player, dx, dy) {
    const active = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;
    player.controlledByUser = active;
    
    if (active) {
      const mag = Math.hypot(dx, dy);
      if (mag > 0) {
        const step = (player.derived.topSpeed ?? 2) * 4;
        const normalizedDx = (dx / mag) * step;
        const normalizedDy = (dy / mag) * step;
        player.targetX = player.x + normalizedDx;
        player.targetY = player.y + normalizedDy;
      }
    }
  }

  handleShooting(player, input, delta, playerNum) {
    const chargingKey = `shot${playerNum}`;
    const charging = this.charging[chargingKey];

    if (input.shootPressed || input.shootDown) {
      charging.active = true;
      charging.charge = Math.min(1, charging.charge + delta);
    } else if (charging.active && (input.shootUp || this.inputHandler.can("shoot"))) {
      this.executeShoot(player, input.dx || input.direction?.x, input.dy || input.direction?.y, charging.charge);
      this.resetCharging(playerNum, 'shot');
      if (playerNum === 1) this.inputHandler.triggerCooldown("shoot");
    }
  }

  handlePassing(player, input, delta, playerNum) {
    const chargingKey = `pass${playerNum}`;
    const charging = this.charging[chargingKey];

    if (input.passDown || (playerNum === 2 && input.passPressed && !this.previousStates.pass2)) {
      charging.active = true;
      charging.charge = 0;
      charging.startTime = performance.now();
    }

    if (charging.active) {
      // Enhanced charging with variable speed based on player stats
      const passingSkill = player.derived?.passingPower || player.base?.technique || 0.5;
      const chargeRate = 0.8 + (passingSkill * 0.4); // Skilled players charge faster

      charging.charge = Math.min(1, charging.charge + (delta * chargeRate));

      // Enhanced target finding with multiple options
      charging.target = this.findEnhancedPassTarget(player, input.dx || input.direction?.x, input.dy || input.direction?.y);

      // Provide visual feedback for pass power
      this.updatePassPowerIndicator(charging.charge, charging.target);
    }

    if (input.passUp || (playerNum === 2 && !input.passPressed && charging.active)) {
      if (charging.target && (playerNum === 1 ? this.inputHandler.can("pass") : true)) {
        this.executePass(player, charging.target, charging.charge);
        if (playerNum === 1) this.inputHandler.triggerCooldown("pass");
      }
      this.resetCharging(playerNum, 'pass');
    }
  }

  handleTackling(player, input, playerNum) {
    const prevKey = `tackle${playerNum}`;
    const canTackle = playerNum === 1 ? this.inputHandler.can("slide") : true;
    
    if (input.tacklePressed && !this.previousStates[prevKey] && canTackle) {
      this.executeTackle(player);
      if (playerNum === 1) this.inputHandler.triggerCooldown("slide");
    }
  }

  findPassTarget(player, dx, dy) {
    let target = this.findTeammateInDirection(player, dx, dy);
    if (!target) target = this.findNearestTeammate(player);
    return target;
  }

  findTeammateInDirection(player, dx, dy, maxAngle = 90) {
    const team = this.players.player1.team.includes(player) ?
                 this.players.player1.team : this.players.player2.team;

    const mag = Math.hypot(dx || 0, dy || 0);
    if (mag < 0.01) return null;

    let best = null;
    let bestScore = -1;

    for (const mate of team) {
      if (mate === player) continue;
      const mx = mate.x - player.x;
      const my = mate.y - player.y;
      const dist = Math.hypot(mx, my);
      if (dist === 0) continue;

      const dot = (mx * dx + my * dy) / (dist * mag);
      const ang = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;

      if (ang <= maxAngle) {
        // Enhanced scoring system for pass target selection
        const angleScore = 1 - (ang / maxAngle); // 0-1, higher is better

        // Distance score (prefer medium distances)
        let distanceScore;
        if (dist < 20) {
          distanceScore = dist / 20; // Penalty for very close
        } else if (dist < 60) {
          distanceScore = 1.0; // Optimal range
        } else {
          distanceScore = Math.max(0.2, 1 - (dist - 60) / 40);
        }

        // Goal advancement score
        const goal = { x: 525, y: 170 }; // Opponent goal
        const playerGoalDist = Math.hypot(player.x - goal.x, player.y - goal.y);
        const mateGoalDist = Math.hypot(mate.x - goal.x, mate.y - goal.y);
        const advancementScore = Math.max(0, (playerGoalDist - mateGoalDist) / playerGoalDist);

        // Pressure score (avoid heavily marked teammates)
        const pressureScore = this.calculateTeammatePressureSimple(mate, team);

        // Combined score
        const totalScore = angleScore * 0.4 + distanceScore * 0.3 +
                          advancementScore * 0.2 + pressureScore * 0.1;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          best = mate;
        }
      }
    }
    return best;
  }

  // Simple pressure calculation for teammate selection
  calculateTeammatePressureSimple(teammate, team) {
    // Get opponents (players not in our team)
    const allPlayers = [...this.players.player1.team, ...this.players.player2.team];
    const opponents = allPlayers.filter(p => !team.includes(p));

    let pressure = 0;
    opponents.forEach(opponent => {
      const distance = Math.hypot(teammate.x - opponent.x, teammate.y - opponent.y);
      if (distance < 15) {
        pressure += (15 - distance) / 15;
      }
    });

    return Math.max(0, 1 - Math.min(pressure, 1)); // Higher = less pressure
  }

  findNearestTeammate(player) {
    const team = this.players.player1.team.includes(player) ? 
                 this.players.player1.team : this.players.player2.team;
    
    let best = null;
    let min = Infinity;
    
    for (const mate of team) {
      if (mate === player) continue;
      const d = Math.hypot(mate.x - player.x, mate.y - player.y);
      if (d < min) {
        min = d;
        best = mate;
      }
    }
    return best;
  }

  switchToNearestPlayer(team, ball) {
    if (!team || !team.length) return;
    
    let nearest = team[0];
    let minDist = Infinity;
    
    for (const p of team) {
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    
    // Update the appropriate player
    if (team === this.players.player1.team) {
      if (this.players.player1.selected) this.players.player1.selected.controlledByUser = false;
      this.players.player1.selected = nearest;
    } else {
      if (this.players.player2.selected) this.players.player2.selected.controlledByUser = false;
      this.players.player2.selected = nearest;
    }
  }

  resetCharging(playerNum, type = 'all') {
    if (type === 'all' || type === 'shot') {
      this.charging[`shot${playerNum}`] = { active: false, charge: 0 };
    }
    if (type === 'all' || type === 'pass') {
      this.charging[`pass${playerNum}`] = { active: false, charge: 0, target: null };
    }
  }

  cancelCharging(playerNum) {
    this.resetCharging(playerNum);
  }

  updatePreviousStates(input1, input2) {
    this.previousStates.tackle1 = input1.tacklePressed || input1.slide;
    this.previousStates.tackle2 = input2.tacklePressed;
    this.previousStates.pass2 = input2.passPressed;
  }

  getPlayer2Input() {
    // This should be implemented based on your existing player 2 input system
    // For now, returning a mock structure
    return {
      dx: 0, dy: 0,
      passPressed: false,
      shootPressed: false,
      tacklePressed: false
    };
  }

  isResetPressed() {
    // Check if reset is pressed
    return false; // Placeholder
  }

  // Action execution methods (to be implemented with your existing logic)
  executeShoot(player, dirX, dirY, power) {
    // Implement shooting logic
    console.log(`Player ${player.role} shoots with power ${power}`);
  }

  executePass(player, target, power) {
    // Implement passing logic
    console.log(`Player ${player.role} passes to ${target.role} with power ${power}`);
  }

  executeTackle(player) {
    // Implement tackling logic
    console.log(`Player ${player.role} tackles`);
  }

  // Getters for UI updates
  getChargingState() {
    return {
      isCharging: Object.values(this.charging).some(c => c.active),
      maxCharge: Math.max(...Object.values(this.charging).map(c => c.charge))
    };
  }

  getPassIndicator() {
    const pass1 = this.charging.pass1;
    const pass2 = this.charging.pass2;
    
    if (pass1.active && pass1.target) {
      return {
        from: { x: this.players.player1.selected.x, y: this.players.player1.selected.y },
        to: { x: pass1.target.x, y: pass1.target.y },
        time: 0.2
      };
    }
    
    if (pass2.active && pass2.target) {
      return {
        from: { x: this.players.player2.selected.x, y: this.players.player2.selected.y },
        to: { x: pass2.target.x, y: pass2.target.y },
        time: 0.2
      };
    }
    
    return null;
  }
}
