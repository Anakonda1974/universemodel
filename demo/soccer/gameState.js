/**
 * Centralized Game State Management
 * Consolidates all game state variables into organized objects
 */

export class GameStateManager {
  constructor() {
    // UI Elements
    this.ui = {
      canvas: document.getElementById("spielfeld"),
      ctx: null,
      debugCanvas: document.getElementById("debugCanvas"),
      debugCtx: null,
      inspectorDiv: document.getElementById("inspector"),
      powerBarWrapper: document.getElementById("powerBarWrapper"),
      powerBar: document.getElementById("powerBar"),
      radarCanvas: document.getElementById("radar"),
      radarCtx: null
    };
    
    // Initialize contexts
    this.ui.ctx = this.ui.canvas?.getContext("2d");
    this.ui.debugCtx = this.ui.debugCanvas?.getContext("2d");
    this.ui.radarCtx = this.ui.radarCanvas?.getContext("2d");

    // Game State
    this.gameState = {
      current: "Formation wählen",
      next: "Spiel läuft",
      transitionStartTime: null,
      matchPaused: false
    };

    // Match Data
    this.match = {
      time: 0,
      halftime: 1,
      halfLengthMinutes: 45,
      scoreHome: 0,
      scoreAway: 0,
      lastFrameTime: null
    };

    // Teams and Players
    this.teams = {
      home: [],
      away: [],
      benchHome: [],
      benchAway: [],
      selectedPlayer: null,
      selectedPlayer2: null,
      userTeam: null,
      userTeam2: null
    };

    // Game Objects
    this.gameObjects = {
      ball: null,
      coach: null,
      referee: null,
      gameStateManager: null
    };

    // Input State
    this.input = {
      user1: this.createInputState(),
      user2: this.createInputState()
    };

    // Visual Effects
    this.effects = {
      goalFlash: { timer: 0, side: null },
      goalOverlay: { timer: 0, text: "" },
      confettiParticles: [],
      passIndicator: null
    };

    // Charging States
    this.charging = {
      pass: { active: false, charge: 0, player: 1 },
      pass2: { active: false, charge: 0, player: 2 },
      shot: { active: false, charge: 0, player: 1 },
      shot2: { active: false, charge: 0, player: 2 }
    };

    // Restart States
    this.restarts = {
      freeKick: { timer: 0, taker: null },
      restart: { timer: 0, taker: null, type: "" },
      lastTouchTeam: null,
      lastBallOwnerTeam: null,
      lastBallOwnerTeam2: null
    };

    // Formation System
    this.formation = {
      formations: [],
      selectedIndex: 0,
      offsetHome: { x: 0, y: 0 },
      offsetAway: { x: 0, y: 0 },
      lastSwitch: 0
    };

    // Cards and Discipline
    this.discipline = {
      yellowCards: [],
      redCards: []
    };

    // Settings
    this.settings = {
      difficulty: "normal",
      weather: { type: "clear", windX: 0, windY: 0, friction: 1 },
      lastAnalysis: 0
    };
  }

  createInputState() {
    return {
      up: false,
      down: false,
      left: false,
      right: false,
      dx: 0,
      dy: 0,
      passPressed: false,
      passDown: false,
      passUp: false,
      shootPressed: false,
      shootDown: false,
      shootUp: false,
      tacklePressed: false,
      tackleDown: false,
      tackleUp: false,
      resetPressed: false,
      resetDown: false,
      resetUp: false
    };
  }

  // Getters for easy access
  get canvas() { return this.ui.canvas; }
  get ctx() { return this.ui.ctx; }
  get ball() { return this.gameObjects.ball; }
  get coach() { return this.gameObjects.coach; }
  get referee() { return this.gameObjects.referee; }
  get teamHome() { return this.teams.home; }
  get teamAway() { return this.teams.away; }
  get selectedPlayer() { return this.teams.selectedPlayer; }
  get matchTime() { return this.match.time; }
  get scoreHome() { return this.match.scoreHome; }
  get scoreAway() { return this.match.scoreAway; }

  // Setters for common operations
  setBall(ball) { this.gameObjects.ball = ball; }
  setCoach(coach) { this.gameObjects.coach = coach; }
  setReferee(referee) { this.gameObjects.referee = referee; }
  setSelectedPlayer(player) { this.teams.selectedPlayer = player; }
  
  updateMatchTime(delta) {
    if (!this.gameState.matchPaused) {
      this.match.time += delta;
    }
  }

  addGoal(team) {
    if (team === 'home') {
      this.match.scoreHome++;
    } else {
      this.match.scoreAway++;
    }
  }

  resetMatch() {
    this.match.time = 0;
    this.match.halftime = 1;
    this.match.scoreHome = 0;
    this.match.scoreAway = 0;
    this.discipline.yellowCards = [];
    this.discipline.redCards = [];
    this.effects.confettiParticles = [];
    this.gameState.matchPaused = false;
  }

  getAllPlayers() {
    return [...this.teams.home, ...this.teams.away];
  }

  isMatchPaused() {
    return this.gameState.matchPaused;
  }

  pauseMatch() {
    this.gameState.matchPaused = true;
  }

  resumeMatch() {
    this.gameState.matchPaused = false;
  }
}
