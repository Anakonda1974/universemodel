// main.js

import { Player } from "./player.js";
import { Coach } from "./coach.js";
import { Ball, FIELD_BOUNDS } from "./ball.js";
import { drawField, drawPlayers, drawBall, drawOverlay, drawPasses, drawPerceptionHighlights, drawPassIndicator, drawRadar, drawActivePlayer, drawGoalHighlight, drawZones, drawBallDebug, drawFormationDebug, drawReferee } from "./render.js";
import { DebugManager } from "./debugManager.js";
import { logComment } from "./commentary.js";
import { initControlPanel } from "./ui-panel.js";
import { Referee } from "./referee.js";
import { InputHandler } from "./input.js";
import { Capabilities } from "./capabilities.js";
import { GameStateManager as FIFAGameStateManager } from "./gameStateManager.js";

import { }  from "./debugManager.js";


import { analyzePlayerPerformance, evaluateFootUse } from "./analyze.js";

// New modular systems
import { GameStateManager } from './gameState.js';
import { InputManager } from './inputManager.js';
import { GameLoop } from './gameLoop.js';
import { EventManager } from './eventManager.js';

// ----- Modular Game Setup -----
// Initialize centralized game state management
const gameState = new GameStateManager();

// Debug: Check if canvas elements are found
console.log("Canvas elements check:");
console.log("Main canvas:", gameState.canvas, "Context:", gameState.ctx);
console.log("Radar canvas:", gameState.ui.radarCanvas, "Context:", gameState.ui.radarCtx);
console.log("Canvas dimensions:", gameState.canvas?.width, "x", gameState.canvas?.height);

// Declare and initialize debug manager with proper context
let debugManager = new DebugManager(gameState.ui.debugCtx, gameState.ui.inspectorDiv);
console.log("Debug manager initialized with debug canvas context");

// --- Global Settings ---
window.keyBindings = {
  moveUp: ["ArrowUp", "KeyW"],
  moveDown: ["ArrowDown", "KeyS"],
  moveLeft: ["ArrowLeft", "KeyA"],
  moveRight: ["ArrowRight", "KeyD"],
  pass: "Space",
  shoot: "KeyF",
  tackle: "KeyX",
  switch: "KeyC",
  togglePress: "KeyP",
  reset: "KeyR",
};
const inputHandler = new InputHandler();

window.debugOptions = { showZones: true, showFOV: true, showBall: true, showFormation: false, showTargets: false };

window.colorProfiles = {
  default: { field: "#065", home: "#0000ff", away: "#ff0000", background: "#222" },
  classic: { field: "#020", home: "#006400", away: "#ff8c00", background: "#333" },
  highContrast: { field: "#022", home: "#ffff00", away: "#ff00ff", background: "#000" },
};
window.renderOptions = { lineAlpha: 1, colorProfile: "default", fieldColor: "#065" };

// Game state constants (kept for compatibility)
const GameState = {
  FORMATION: "Formation wählen",
  TRANSITION: "Positionswechsel",
  RUNNING: "Spiel läuft",
};

// Initialize modular systems
const inputManager = new InputManager(inputHandler);
const eventManager = new EventManager(gameState);

// Legacy compatibility - these will be gradually replaced
const teamHeim = gameState.teams.home;
const teamGast = gameState.teams.away;
const benchHeim = gameState.teams.benchHome;
const benchGast = gameState.teams.benchAway;

// Legacy variables that reference gameState
let ball = gameState.ball;
let coach = gameState.coach;
let referee = gameState.referee;
let selectedPlayer = gameState.selectedPlayer;
let selectedPlayer2 = gameState.teams.selectedPlayer2;
let userTeam = gameState.teams.userTeam;
let userTeam2 = gameState.teams.userTeam2;
let passIndicator = gameState.effects.passIndicator;
let formations = gameState.formation.formations;
let selectedFormationIndex = gameState.formation.selectedIndex;
let currentState = gameState.gameState.current;
let nextState = gameState.gameState.next;
let transitionStartTime = gameState.gameState.transitionStartTime;
let matchPaused = gameState.gameState.matchPaused;
let scoreHome = gameState.match.scoreHome;
let scoreAway = gameState.match.scoreAway;
let matchTime = gameState.match.time;
let halftime = gameState.match.halftime;
let halfLengthMinutes = gameState.match.halfLengthMinutes;
let lastFrameTime = gameState.match.lastFrameTime;
let yellowCards = gameState.discipline.yellowCards;
let redCards = gameState.discipline.redCards;
let goalFlashTimer = gameState.effects.goalFlash.timer;
let goalFlashSide = gameState.effects.goalFlash.side;
let goalOverlayTimer = gameState.effects.goalOverlay.timer;
let goalOverlayText = gameState.effects.goalOverlay.text;
let confettiParticles = gameState.effects.confettiParticles;
let freeKickTimer = gameState.restarts.freeKick.timer;
let freeKickTaker = gameState.restarts.freeKick.taker;
let restartTimer = gameState.restarts.restart.timer;
let restartTaker = gameState.restarts.restart.taker;
let restartType = gameState.restarts.restart.type;
let lastTouchTeam = gameState.restarts.lastTouchTeam;
let lastBallOwnerTeam = gameState.restarts.lastBallOwnerTeam;
let lastBallOwnerTeam2 = gameState.restarts.lastBallOwnerTeam2;
let formationOffsetHome = gameState.formation.offsetHome;
let formationOffsetAway = gameState.formation.offsetAway;
let difficulty = gameState.settings.difficulty;
let lastAnalysis = gameState.settings.lastAnalysis;
let lastFormationSwitch = gameState.formation.lastSwitch;

// Legacy input variables
let userInput = gameState.input.user1;
let userInput2 = gameState.input.user2;
let passCharge = gameState.charging.pass.charge;
let passCharging = gameState.charging.pass.active;
let shotCharge = gameState.charging.shot.charge;
let shotCharging = gameState.charging.shot.active;
let shotCharge2 = gameState.charging.shot2.charge;
let shotCharging2 = gameState.charging.shot2.active;
let passCharge2 = gameState.charging.pass2.charge;
let passCharging2 = gameState.charging.pass2.active;
let prevTackle = false;
let prevPass2 = false;
let prevTackle2 = false;
// Legacy compatibility variables (gradually being replaced)
const POIS = [{ x: 60, y: 340, role: "farLeft" }];

// --- Difficulty ---
const difficultyMultipliers = { easy: 0.8, normal: 1, hard: 1.2 };

// --- Weather (integrated into gameState) ---
window.weather = gameState.settings.weather;
const weather = window.weather;

function setLastTouch(player) {
  gameState.restarts.lastTouchTeam = teamHeim.includes(player) ? 0 : 1;
}

function applyWeather() {
  switch (weather.type) {
    case "wind":
      weather.windX = 0.03;
      weather.windY = 0.01;
      weather.friction = 0.990;
      break;
    case "rain":
      weather.windX = 0;
      weather.windY = 0;
      weather.friction = 0.985;
      break;
    default: // clear weather
      weather.windX = 0;
      weather.windY = 0;
      weather.friction = 0.992; // Normal grass friction
  }
}

function setupWeatherControls() {
  const select = document.getElementById("weatherSelect");
  if (select) {
    select.value = weather.type;
    select.onchange = () => {
      weather.type = select.value;
      applyWeather();
    };
  }
}

function showAnalysis(players) {
  const table = document.getElementById("analysisTable");
  const panel = document.getElementById("analysisPanel");
  if (!table || !panel) return;

  const header = `
    <table><thead><tr>
      <th>Rolle</th><th>Distanz</th><th>Stamina ⛽</th>
      <th>Workrate</th><th>Präf. Fuß</th><th>Falsche Fußnutzung</th>
    </tr></thead><tbody>`;
  const rows = players
    .map((p) => {
      const perf = analyzePlayerPerformance(p);
      const foot = evaluateFootUse(p);
      return `<tr>
      <td>${perf.role}</td><td>${perf.distance}</td>
      <td>${perf.usedStamina}</td><td>${perf.readinessScore}</td>
      <td>${perf.preferredFoot}</td><td>${foot.wrongFootRate}</td>
    </tr>`;
    })
    .join("\n");
  table.innerHTML = header + rows + "</tbody></table>";
  panel.style.display = "block";
}

function applyDifficulty() {
  const mult = difficultyMultipliers[difficulty] || 1;
  [...teamHeim, ...teamGast].forEach((p) => {
    if (!p.baseline) p.baseline = { ...p.base };
    p.base = { ...p.baseline };
    if (typeof p.base.speed === "number") p.base.speed *= mult;
    if (typeof p.base.stamina === "number") p.base.stamina *= mult;
    if (typeof p.base.technique === "number") p.base.technique *= mult;
    p.updateDerived();
  });
}

function setupDifficultyControls() {
  const select = document.getElementById("difficultySelect");
  if (select) {
    select.value = difficulty;
    select.onchange = () => {
      difficulty = select.value;
      applyDifficulty();
    };
  }
}

function applyColorProfile(name) {
  const profile = window.colorProfiles[name] || window.colorProfiles.default;
  window.renderOptions.fieldColor = profile.field;
  document.documentElement.style.setProperty("--bg-color", profile.background);
  document.documentElement.style.setProperty("--field-color", profile.field);
  [...teamHeim, ...benchHeim].forEach((p) => (p.color = profile.home));
  [...teamGast, ...benchGast].forEach((p) => (p.color = profile.away));
  if (window.invalidateField) window.invalidateField();
}
window.applyColorProfile = applyColorProfile;

//   const renderSection = document.createElement('details');
//     renderSection.innerHTML = `<summary>Rendering Options</summary>
//       <label><input id="cp-dark" type="checkbox"> Dark Mode</label><br>
//       <label>Line Alpha <input id="cp-alpha" type="range" min="0" max="1" step="0.1" value="1"></label><br>
//       <label>Colour Profile <select id="cp-colors">
//         <option value="default">Default</option>
//         <option value="classic">Classic</option>
//         <option value="highContrast">High Contrast</option>
//       </select></label>`;
//     content.appendChild(renderSection);
//     renderSection.querySelector('#cp-colors').value = window.renderOptions.colorProfile;
//     renderSection.querySelector('#cp-colors').onchange = e => {
//       window.renderOptions.colorProfile = e.target.value;
//       if (window.applyColorProfile) window.applyColorProfile(e.target.value);
//     };

function teamId(player) {
  if (!player) return null;
  if (teamHeim.includes(player)) return 0;
  if (teamGast.includes(player)) return 1;
  return null;
}

function switchToNearestPlayer(team) {
  if (!team || !team.length) return;
  let nearest = team[0];
  let minDist = Infinity;
  const bx = ball.x;
  const by = ball.y;
  for (const p of team) {
    const d = Math.hypot(p.x - bx, p.y - by);
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  if (selectedPlayer) selectedPlayer.controlledByUser = false;
  selectedPlayer = nearest;
}

// --- Soundeffekte ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const crowdGain = audioCtx.createGain();
crowdGain.gain.value = 0.05;

function startCrowdNoise() {
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  noise.connect(crowdGain).connect(audioCtx.destination);
  noise.start(0);
}
//startCrowdNoise();

function playBeep(freq, duration = 300) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.setValueAtTime(1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
  osc.stop(audioCtx.currentTime + duration / 1000);
}
function playWhistle() {
  playBeep(1200, 500);
}
function playGoal() {
  playBeep(500, 700);
}

// Score, timer, cards, etc. (now managed by gameState)

function findNearestTeammate(player) {
  const team = teamHeim.includes(player) ? teamHeim : teamGast;
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

function findTeammateInDirection(player, dx, dy, maxAngle = 60) {
  const team = teamHeim.includes(player) ? teamHeim : teamGast;
  const mag = Math.hypot(dx, dy);
  if (mag < 0.01) return null;
  let best = null;
  let bestAng = maxAngle;
  for (const mate of team) {
    if (mate === player) continue;
    const mx = mate.x - player.x;
    const my = mate.y - player.y;
    const dist = Math.hypot(mx, my);
    if (dist === 0) continue;
    const dot = (mx * dx + my * dy) / (dist * mag);
    const ang = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
    if (ang <= bestAng) {
      bestAng = ang;
      best = mate;
    }
  }
  return best;
}

function handleOffside(player) {
  playWhistle();
  logComment("Abseits!");
  const oppTeam = teamHeim.includes(player) ? teamGast : teamHeim;
  const kicker = oppTeam.reduce(
    (best, p) => {
      const d = Math.hypot(p.x - player.x, p.y - player.y);
      return d < best.dist ? { p, dist: d } : best;
    },
    { p: oppTeam[0], dist: Infinity }
  ).p;
  ball.x = player.x;
  ball.y = player.y;
  ball.vx = 0;
  ball.vy = 0;
  ball.owner = kicker;
  ball.isLoose = false;
  setLastTouch(kicker);
  kicker.x = player.x;
  kicker.y = player.y;
  kicker.currentAction = "freekick";
}

function calcPassSpeedForDistance(dist) {
  const min = 10;
  const max = 22;
  const speed = min + (dist / 250) * (max - min);
  return Math.max(min, Math.min(max, speed));
}

function orientationMisalignment(player, angle) {
  const diffHead = Math.abs(((angle - player.headDirection + 540) % 360) - 180);
  const diffBody = Math.abs(((angle - player.bodyDirection + 540) % 360) - 180);
  return Math.max(diffHead, diffBody);
}

function applyKickError(vx, vy, angleErrorDeg) {
  const rad = (angleErrorDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { vx: vx * cos - vy * sin, vy: vx * sin + vy * cos };
}

function passBall(from, to, power = 1) {
  // old pass logic
}

function shootBall(player, power = 1, dirX = null, dirY = null) {
  if (!player) return;
  let dx = dirX;
  let dy = dirY;
  const mag = Math.hypot(dx ?? 0, dy ?? 0);
  if (mag < 0.1) {
    const goalX = teamHeim.includes(player) ? 1040 : 10;
    const goalY = 340;
    dx = goalX - player.x;
    dy = goalY - player.y;
  }
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return;
  setLastTouch(player);
  ball.owner = null;
  ball.isLoose = true;
  const speed = 8 + power * 12;
  let vx = (dx / dist) * speed;
  let vy = (dy / dist) * speed;
  const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const mis = orientationMisalignment(player, targetAngle);
  const err = (Math.random() - 0.5) * mis * 0.2;
  ({ vx, vy } = applyKickError(vx, vy, err));
  const speedFinal = Math.hypot(vx, vy);
  const offset = player.radius + ball.radius + 2;
  const startX = player.x + (dx / dist) * offset;
  const startY = player.y + (dy / dist) * offset;
  //ball.kick(startX, startY, vx, vy, speedFinal, player);
  ball.kickVelocity(startX, startY, vx, vy, player);

  ball.angularVelocity = (Math.random() - 0.5) * 0.04;
  player.currentAction = "shoot";
  // old shoot logic
}

function tryTackle(player) {
  // old tackle logic
}


function buildWorld(player) {
  return {
    ball,
    referee,
    players: [...teamHeim, ...teamGast],
    opponentGoal: teamHeim.includes(player)
      ? { x: 1040, y: 340 }
      : { x: 10, y: 340 },
  };
}

function doPass(player, target, power = 1) {
  if (!player || !target) return;
  Capabilities.pass(player, buildWorld(player), target, power);
  passIndicator = {
    from: { x: player.x, y: player.y },
    to: { x: target.x, y: target.y },
    time: 0.5,
  };
}

function doShoot(player, dirX, dirY, power = 1) {
  if (!player) return;
  let goal = undefined;
  const mag = Math.hypot(dirX ?? 0, dirY ?? 0);
  if (mag > 0.1) {
    goal = { x: player.x + dirX * 50, y: player.y + dirY * 50 };
  }
  Capabilities.shoot(player, buildWorld(player), goal, power);
}

function doTackle(player) {
  if (!player) return;
  Capabilities.tackle(player, buildWorld(player), ball.owner);
}

// --- Formation laden und zuweisen ---
function setFormation(index) {
  if (index < 0 || index >= formations.length) return;
  const formation = formations[index];
  currentState = GameState.TRANSITION;
  transitionStartTime = Date.now();
  nextState = GameState.RUNNING;

  teamHeim.forEach((p, i) => {
    if (formation.players[i]) {
      p.role = formation.players[i].role;
      p.style = formation.players[i].style;
      p.formationX = formation.players[i].x;
      p.formationY = formation.players[i].y;
      p.targetX = formation.players[i].x;
      p.targetY = formation.players[i].y;
      p.color = window.colorProfiles[window.renderOptions.colorProfile].home;
      p.position = formation.players[i].role;
    }
  });
  teamGast.forEach((p, i) => {
    if (formation.players[i]) {
      p.role = formation.players[i].role;
      p.style = formation.players[i].style;
      p.formationX = 1050 - formation.players[i].x;
      p.formationY = formation.players[i].y;
      p.targetX = 1050 - formation.players[i].x;
      p.targetY = formation.players[i].y;
      p.color = window.colorProfiles[window.renderOptions.colorProfile].away;
      p.position = formation.players[i].role;
    }
  });

  document.getElementById("formationDesc").textContent = formation.description;
  lastFormationSwitch = matchTime;
  playWhistle();
  logComment(`Formation gewechselt zu ${formation.name}`);
}

async function loadFormations() {
  formations = await fetch("formations.json").then((res) => res.json());
  const select = document.getElementById("formationSelect");
  select.innerHTML = "";
  formations.forEach((f, i) => {
    let opt = document.createElement("option");
    opt.value = i;
    opt.textContent = f.name;
    select.appendChild(opt);
  });
  select.onchange = (e) => {
    selectedFormationIndex = +e.target.value;
    setFormation(selectedFormationIndex);
  };
  document.getElementById("formationDesc").textContent = formations[0].description;
  setFormation(0);
}

// --- Teams initialisieren (mit Basiswerten für Skill/Trait/Position) ---
console.log("Creating teams...");
for (let i = 0; i < 11; i++) {
  const p = new Player(80 + Math.random() * 20, 100 + i * 40, window.colorProfiles[window.renderOptions.colorProfile].home, {
    position: "ST",
    trait: i === 9 ? "sniper" : null,
  });
  p.baseline = { ...p.base };
  gameState.teams.home.push(p);
  console.log(`Home player ${i}: x=${p.x}, y=${p.y}, color=${p.color}`);
}
for (let i = 0; i < 11; i++) {
  const p = new Player(970 - Math.random() * 20, 100 + i * 40, window.colorProfiles[window.renderOptions.colorProfile].away, {
    position: "IV",
    trait: i === 2 ? "wall" : null,
  });
  p.baseline = { ...p.base };
  gameState.teams.away.push(p);
  console.log(`Away player ${i}: x=${p.x}, y=${p.y}, color=${p.color}`);
}
console.log(`Teams created: Home=${gameState.teams.home.length}, Away=${gameState.teams.away.length}`);
for (let i = 0; i < 3; i++) {
  const p = new Player(-30, -30, window.colorProfiles[window.renderOptions.colorProfile].home, { position: "ST" });
  p.baseline = { ...p.base };
  gameState.teams.benchHome.push(p);
}
for (let i = 0; i < 3; i++) {
  const p = new Player(-30, -30, window.colorProfiles[window.renderOptions.colorProfile].away, { position: "IV" });
  p.baseline = { ...p.base };
  gameState.teams.benchAway.push(p);
}
gameState.setBall(new Ball(525, 340));
gameState.setCoach(new Coach([...gameState.teams.home, ...gameState.teams.away]));

// Initialize ball state properly
console.log("Initializing ball at:", gameState.ball.x, gameState.ball.y);
gameState.ball.vx = 0;
gameState.ball.vy = 0;
gameState.ball.isLoose = false;
gameState.ball.outOfBounds = null;

function handleCard(player, card) {
  if (card === "yellow") {
    yellowCards.push(player);
    logComment(`Gelbe Karte für ${player.role}`);
  } else {
    redCards.push(player);
    logComment(`Rote Karte für ${player.role}!`);
    if (ball.owner === player) {
      ball.owner = null;
      ball.isLoose = true;
    }
    player.x = -30;
    player.y = -30;
  }
  playWhistle();
}

// Enhanced game event handler for FIFA rules
function handleGameEvent(eventType, data) {
  console.log(`FIFA Event: ${eventType}`, data);

  switch (eventType) {
    case 'goal':
      handleGoalEvent(data);
      break;
    case 'halftime':
      handleHalftimeEvent();
      break;
    case 'fulltime':
      handleFulltimeEvent();
      break;
    case 'throwIn':
      handleThrowInEvent(data);
      break;
    case 'corner':
      handleCornerEvent(data);
      break;
    case 'freeKick':
      handleFreeKickEvent(data);
      break;
    case 'penalty':
      handlePenaltyEvent(data);
      break;
    default:
      console.log(`Unhandled FIFA event: ${eventType}`);
  }
}

function handleGoalEvent(data) {
  goalFlashTimer = 2;
  goalFlashSide = teamHeim.includes(data.scorer) ? "home" : "away";
  goalOverlayTimer = 3;

  if (teamHeim.includes(data.scorer)) {
    scoreHeim++;
  } else {
    scoreGast++;
  }

  setTimeout(() => {
    resetKickoff();
  }, 3000);
}

function handleHalftimeEvent() {
  logComment("Halbzeitpause");
}

function handleFulltimeEvent() {
  logComment(`Spielende! ${scoreHeim}:${scoreGast}`);
}

function handleThrowInEvent(data) {
  startThrowIn(data.side);
}

function handleCornerEvent(data) {
  startGoalRestart(data.side);
}

function handleFreeKickEvent(data) {
  freeKickTimer = 2;
  const team = data.side === 'home' ? teamHeim : teamGast;
  freeKickTaker = team[0];
  ball.x = data.position.x;
  ball.y = data.position.y;
  ball.owner = freeKickTaker;
  ball.isLoose = false;
}

function handlePenaltyEvent(data) {
  restartTimer = 3;
  restartType = "Elfmeter";
  const team = data.side === 'home' ? teamHeim : teamGast;
  const penaltyTaker = team.find(p => p.role === 'ST') || team[0];

  ball.owner = penaltyTaker;
  ball.isLoose = false;
  ball.x = data.side === 'home' ? 885 : 165;
  ball.y = 340;

  logComment(`Elfmeter für ${data.side}!`);
}

function handleFoul(fouler, victim, restart) {
  if (restart && restart.type === "penalty") {
    restartTimer = 2;
    restartType = "Elfmeter";
    ball.owner = victim;
    ball.isLoose = false;
    ball.x = victim.side === "home" ? 165 : 885;
    ball.y = 340;
  } else {
    freeKickTimer = 2;
    freeKickTaker = victim;
    ball.owner = victim;
    ball.isLoose = false;
    ball.x = victim.x;
    ball.y = victim.y;
  }
  setLastTouch(victim);
  logComment(`Foul an ${victim.role}`);
  playWhistle();
}

function startThrowIn(side) {
  restartTimer = 2;
  restartType = "Einwurf";
  const team = lastTouchTeam === 0 ? teamGast : teamHeim;
  const taker = team.reduce(
    (b, p) => {
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      return d < b.d ? { p, d } : b;
    },
    { p: team[0], d: Infinity }
  ).p;
  restartTaker = taker;
  ball.owner = taker;
  ball.isLoose = false;
  ball.x = Math.min(FIELD_BOUNDS.maxX - 5, Math.max(FIELD_BOUNDS.minX + 5, ball.x));
  ball.y = side === "top" ? FIELD_BOUNDS.minY : FIELD_BOUNDS.maxY;
  taker.x = ball.x;
  taker.y = side === "top" ? ball.y + 5 : ball.y - 5;
  playWhistle();
  logComment("Einwurf");
}

function startGoalRestart(side) {
  const defending = side === "left" ? teamHeim : teamGast;
  const attacking = side === "left" ? teamGast : teamHeim;
  if (lastTouchTeam === (side === "left" ? 0 : 1)) {
    restartType = "Ecke";
    const cornerX = side === "left" ? FIELD_BOUNDS.minX : FIELD_BOUNDS.maxX;
    const cornerY = ball.y < 340 ? FIELD_BOUNDS.minY : FIELD_BOUNDS.maxY;
    const taker = attacking.reduce(
      (b, p) => {
        const d = Math.hypot(p.x - cornerX, p.y - cornerY);
        return d < b.d ? { p, d } : b;
      },
      { p: attacking[0], d: Infinity }
    ).p;
    restartTaker = taker;
    restartTimer = 2;
    ball.owner = taker;
    ball.isLoose = false;
    ball.x = cornerX;
    ball.y = cornerY;
    taker.x = cornerX;
    taker.y = cornerY;
    playWhistle();
    logComment("Ecke");
  } else {
    restartType = "Abstoß";
    const keeper = defending.find((p) => p.role === "TW") || defending[0];
    restartTaker = keeper;
    restartTimer = 2;
    ball.owner = keeper;
    ball.isLoose = false;
    ball.x = side === "left" ? FIELD_BOUNDS.minX + 5 : FIELD_BOUNDS.maxX - 5;
    ball.y = 340;
    keeper.x = ball.x;
    keeper.y = 340;
    playWhistle();
    logComment("Abstoß");
  }
}
// Initialize FIFA game state manager
const fifaGameStateManager = new FIFAGameStateManager(eventManager.handleEvent.bind(eventManager));

// Initialize enhanced referee with FIFA rules
gameState.setReferee(new Referee(handleCard, handleFoul, handleOffside, eventManager.handleEvent.bind(eventManager)));

loadFormations();
setupMatchControls();
setupDifficultyControls();
applyDifficulty();
setupWeatherControls();
applyWeather();
applyColorProfile(window.renderOptions.colorProfile);
initControlPanel({ teams: { home: gameState.teams.home, away: gameState.teams.away }, ball: gameState.ball, coach: gameState.coach, formations: gameState.formation.formations });

// Set up input manager with players
gameState.setSelectedPlayer(gameState.teams.home[0]);
gameState.teams.selectedPlayer2 = gameState.teams.away[0];
gameState.teams.userTeam = gameState.teams.home;
gameState.teams.userTeam2 = gameState.teams.away;

inputManager.setPlayers(
  gameState.selectedPlayer, gameState.teams.home,
  gameState.teams.selectedPlayer2, gameState.teams.away
);

debugManager.setSelectedPlayer(gameState.selectedPlayer);

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (selectedPlayer) selectedPlayer.controlledByUser = false;
  if (selectedPlayer2) selectedPlayer2.controlledByUser = false;
  for (const p of [...teamHeim, ...teamGast]) {
    if (Math.hypot(p.x - x, p.y - y) <= p.radius) {
      if (teamHeim.includes(p)) {
        selectedPlayer = p;
      } else {
        selectedPlayer2 = p;
      }
      debugManager.setSelectedPlayer(p);
      break;
    }
  }
});

function updateScoreboard() {
  document.getElementById("score").textContent = `${scoreHome} : ${scoreAway}`;
  document.getElementById("timer").textContent = toTimeString(matchTime);
  document.getElementById("halftime").textContent = halftime === 1 ? "1. Halbzeit" : "2. Halbzeit";
  document.getElementById("cards").textContent = "🟨" + yellowCards.length + " 🟥" + redCards.length;
}

function updatePowerBar() {
  if (!powerBarWrapper || !powerBar) return;
  if (shotCharging || shotCharging2 || passCharging || passCharging2) {
    powerBarWrapper.style.display = "block";
    let val = 0;
    if (shotCharging) val = shotCharge;
    else if (shotCharging2) val = shotCharge2;
    else if (passCharging) val = passCharge;
    else val = passCharge2;
    powerBar.style.width = `${Math.round(val * 100)}%`;
  } else {
    powerBarWrapper.style.display = "none";
    powerBar.style.width = "0%";
  }
}

function spawnConfetti(side) {
  const baseX = side === "left" ? 60 : 990;
  for (let i = 0; i < 25; i++) {
    confettiParticles.push({
      x: baseX + (Math.random() - 0.5) * 40,
      y: 320 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 3 - 2,
      color: `hsl(${Math.random() * 360},80%,60%)`,
      life: 1.5,
    });
  }
}

function updateConfetti(delta) {
  confettiParticles = confettiParticles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 6 * delta;
    p.life -= delta;
    return p.life > 0;
  });
}

function drawConfetti(ctx) {
  ctx.save();
  confettiParticles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  });
  ctx.restore();
}

function setupMatchControls() {
  const input = document.getElementById("halfLengthInput");
  if (input) {
    halfLengthMinutes = parseInt(input.value, 10) || 45;
    input.onchange = () => {
      halfLengthMinutes = parseInt(input.value, 10) || 45;
    };
  }
}
function toTimeString(seconds) {
  let min = Math.floor(seconds / 60);
  let sec = Math.floor(seconds % 60);
  return (min < 10 ? "0" : "") + min + ":" + (sec < 10 ? "0" : "") + sec;
}

function checkGoal(ball) {
  if (ball.x < 15 && ball.y > 290 && ball.y < 390) {
    scoreAway++;
    playGoal();
    logComment("Tor für Auswärtsteam!");
    goalFlashSide = "left";
    goalFlashTimer = 1;
    goalOverlayText = "Tor für Auswärtsteam!";
    goalOverlayTimer = 2;
    spawnConfetti("left");
    resetKickoff();
  }
  if (ball.x > 1035 && ball.y > 290 && ball.y < 390) {
    scoreHome++;
    playGoal();
    logComment("Tor für Heimteam!");
    goalFlashSide = "right";
    goalFlashTimer = 1;
    goalOverlayText = "Tor für Heimteam!";
    goalOverlayTimer = 2;
    spawnConfetti("right");
    resetKickoff();
  }
}
function resetKickoff() {
  ball.x = 525;
  ball.y = 340;
  ball.vx = 0;
  ball.vy = 0;
  ball.isLoose = true;
  ball.outOfBounds = null; // Clear any out of bounds state
  setFormation(selectedFormationIndex);
  ball.owner = teamHeim[4]; // oder nach Zufall/Regel
  ball.isLoose = false;
  setLastTouch(teamHeim[4]);

  // Clear any restart timers
  restartTimer = 0;
  freeKickTimer = 0;
  restartTaker = null;
  freeKickTaker = null;

  playWhistle();
  logComment("Anstoß");
  console.log("Game reset - ball position:", ball.x, ball.y);
}

function resetGame() {
  scoreHome = 0;
  scoreAway = 0;
  matchTime = 0;
  halftime = 1;
  yellowCards = [];
  redCards = [];
  resetKickoff();
  updateScoreboard();
  logComment("Spiel zurückgesetzt");
  matchPaused = false;
}

function resolvePlayerCollisions(players) {
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

function substitute(team, bench, idx) {
  if (!bench.length) return;
  const out = team[idx];
  const sub = bench.shift();
  sub.role = out.role;
  sub.style = out.style;
  sub.formationX = out.formationX;
  sub.formationY = out.formationY;
  sub.targetX = out.targetX;
  sub.targetY = out.targetY;
  sub.x = out.x;
  sub.y = out.y;
  sub.color = out.color;
  team[idx] = sub;
  if (ball.owner === out) ball.owner = sub;
  logComment(`Wechsel: ${out.role} verlässt das Feld.`);
  coach.players = [...teamHeim, ...teamGast];
}

function maybeSubstitute(team, bench) {
  if (!bench.length) return;
  for (let i = 0; i < team.length; i++) {
    const p = team[i];
    if ((p.stamina ?? 1) < 0.3 || p.injured) {
      substitute(team, bench, i);
      break;
    }
  }
}

function checkSubstitutions() {
  maybeSubstitute(teamHeim, benchHeim);
  maybeSubstitute(teamGast, benchGast);
}

function updateUserInput(delta) {
  const state = inputHandler.sample(delta);
  userInput.dx = state.direction.x;
  userInput.dy = state.direction.y;
  userInput.passPressed = state.pass;

  userInput.passDown = state.passDown;
  userInput.passUp = state.passUp;
  userInput.shootPressed = state.shoot;
  userInput.shootDown = state.shootDown;
  userInput.shootUp = state.shootUp;
  userInput.tacklePressed = state.slide;
  userInput.tackleDown = state.slideDown;
  userInput.tackleUp = state.slideUp;
  userInput.resetPressed = state.reset;
  userInput.resetDown = state.resetDown;
  userInput.resetUp = state.resetUp;

  if (state.switch) {
    switchToNearestPlayer(userTeam);
    logComment("Spieler gewechselt");
    inputHandler.triggerCooldown("pass"); // small neutral cooldown
  }
  if (state.cancel) {
    shotCharging = false;
    shotCharge = 0;

    passCharging = false;
    passCharge = 0;
  }
}

function updateUserInput2() {
  userInput2.dx = (userInput2.right ? 1 : 0) - (userInput2.left ? 1 : 0);
  userInput2.dy = (userInput2.down ? 1 : 0) - (userInput2.up ? 1 : 0);
}

function updateFormationOffsets() {
  const sideShift = ((ball.x - 525) / 525) * 30;
  formationOffsetHome.x = sideShift;
  formationOffsetAway.x = sideShift;
  const ownerTeam = teamId(ball.owner);
  if (ownerTeam !== null) {
    if (ownerTeam === 0) {
      formationOffsetHome.x += 20;
      formationOffsetAway.x -= 20;
    } else {
      formationOffsetHome.x -= 20;
      formationOffsetAway.x += 20;
    }
  }
  if (coach.attackSide === "left") {
    formationOffsetHome.x -= 15;
    formationOffsetAway.x += 15;
  } else if (coach.attackSide === "right") {
    formationOffsetHome.x += 15;
    formationOffsetAway.x -= 15;
  }
  formationOffsetHome.y = 0;
  formationOffsetAway.y = 0;
}

// ----- MODULAR GAME LOOP -----
// Create a simple renderer for the new game loop
class SimpleRenderer {
  constructor(gameState, debugManager) {
    this.gameState = gameState;
    this.debugManager = debugManager;
  }

  render(gameState) {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    const allPlayers = gameState.getAllPlayers();
    const ball = gameState.ball;
    const coach = gameState.coach;

    // Main rendering
    drawField(ctx, canvas.width, canvas.height, gameState.effects.goalFlash.timer, gameState.effects.goalFlash.side);

    if (window.debugOptions.showZones) {
      const playersToDebug = [];
      if (gameState.selectedPlayer) playersToDebug.push(gameState.selectedPlayer);
      if (gameState.teams.selectedPlayer2) playersToDebug.push(gameState.teams.selectedPlayer2);
      if (playersToDebug.length > 0) {
        drawZones(ctx, playersToDebug, { ball, coach, tactic: coach?.pressing > 1 ? "pressing" : null });
      }
    }

    drawPasses(ctx, allPlayers, ball);
    drawPassIndicator(ctx, gameState.effects.passIndicator);
    this.drawConfetti(ctx, gameState.effects.confettiParticles);

    try {
      drawPlayers(ctx, allPlayers, { showFOV: window.debugOptions.showFOV, showRunDir: true, showHeadDir: true, showTargets: window.debugOptions.showTargets });
    } catch (error) {
      console.error("Error drawing players:", error);
    }

    drawReferee(ctx, gameState.referee);

    if (window.debugOptions.showFormation) {
      const playersToDebug = [];
      if (gameState.selectedPlayer) playersToDebug.push(gameState.selectedPlayer);
      if (gameState.teams.selectedPlayer2) playersToDebug.push(gameState.teams.selectedPlayer2);
      if (playersToDebug.length > 0) {
        drawFormationDebug(ctx, playersToDebug);
      }
    }

    if (gameState.selectedPlayer) {
      drawPlayers(ctx, [gameState.selectedPlayer], { showFOV: window.debugOptions.showFOV, showRunDir: true, showHeadDir: true, showTargets: window.debugOptions.showTargets });
    }
    if (gameState.teams.selectedPlayer2) {
      drawPlayers(ctx, [gameState.teams.selectedPlayer2], { showFOV: true, showRunDir: true, showHeadDir: true, showTargets: window.debugOptions.showTargets });
    }

    drawActivePlayer(ctx, gameState.selectedPlayer);
    drawActivePlayer(ctx, gameState.teams.selectedPlayer2);

    drawPerceptionHighlights(ctx, gameState.selectedPlayer);
    drawPerceptionHighlights(ctx, gameState.teams.selectedPlayer2);

    drawBall(ctx, ball);
    if (window.debugOptions.showBall) drawBallDebug(ctx, ball);
    drawOverlay(ctx, `Ball: ${ball.owner ? ball.owner.role : "Loose"} | Weather: ${gameState.settings.weather.type}`, canvas.width);
    drawGoalHighlight(ctx, gameState.effects.goalOverlay.text, gameState.effects.goalOverlay.timer, canvas.width, canvas.height);
    drawRadar(gameState.ui.radarCtx, allPlayers, ball, gameState.ui.radarCanvas.width, gameState.ui.radarCanvas.height);

    this.debugManager.draw({ players: allPlayers, ball, tactic: coach?.pressing > 1 ? "pressing" : null });

    if (gameState.isMatchPaused()) {
      drawOverlay(ctx, "Game Ended", canvas.width);
      const all = [...gameState.teams.home, ...gameState.teams.away];
      all.forEach((p) => (p.endStamina = p.stamina));
      showAnalysis(all);
    }
  }

  drawConfetti(ctx, particles) {
    ctx.save();
    particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
    });
    ctx.restore();
  }

  renderRestartState(restart) {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    const allPlayers = gameState.getAllPlayers();

    drawField(ctx, canvas.width, canvas.height, gameState.effects.goalFlash.timer, gameState.effects.goalFlash.side);
    if (window.debugOptions.showZones) {
      drawZones(ctx, allPlayers, { ball: gameState.ball, coach: gameState.coach, tactic: gameState.coach?.pressing > 1 ? "pressing" : null });
    }
    drawPlayers(ctx, allPlayers, { showTargets: window.debugOptions.showTargets });
    drawReferee(ctx, gameState.referee);
    if (window.debugOptions.showFormation && gameState.selectedPlayer) {
      drawFormationDebug(ctx, [gameState.selectedPlayer]);
    }
    drawBall(ctx, gameState.ball);
    if (window.debugOptions.showBall) drawBallDebug(ctx, gameState.ball);
    drawOverlay(ctx, `${restart.type}: ${restart.timer.toFixed(1)}s`, canvas.width);
    updateScoreboard();
  }

  renderFreeKickState(freeKick) {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    const allPlayers = gameState.getAllPlayers();

    drawField(ctx, canvas.width, canvas.height, gameState.effects.goalFlash.timer, gameState.effects.goalFlash.side);
    if (window.debugOptions.showZones && gameState.selectedPlayer) {
      drawZones(ctx, [gameState.selectedPlayer], { ball: gameState.ball, coach: gameState.coach, tactic: gameState.coach?.pressing > 1 ? "pressing" : null });
    }
    drawPlayers(ctx, allPlayers, { showTargets: window.debugOptions.showTargets });
    drawReferee(ctx, gameState.referee);
    if (window.debugOptions.showFormation && gameState.selectedPlayer) {
      drawFormationDebug(ctx, [gameState.selectedPlayer]);
    }
    drawBall(ctx, gameState.ball);
    if (window.debugOptions.showBall) drawBallDebug(ctx, gameState.ball);
    drawOverlay(ctx, `Free Kick: ${freeKick.timer.toFixed(1)}s`, canvas.width);
    updateScoreboard();
  }
}

// Initialize the new modular game loop
const renderer = new SimpleRenderer(gameState, debugManager);
const gameLoop = new GameLoop(gameState, inputManager, renderer);

// Legacy game loop function (to be replaced)
function legacyGameLoop(timestamp) {

  // Debug: Log timer states occasionally
  if (Math.random() < 0.001) {
    console.log(`Debug: restartTimer=${restartTimer}, freeKickTimer=${freeKickTimer}, ball.outOfBounds=${ball.outOfBounds}`);
  }

  if (restartTimer > 0) {
    restartTimer -= delta;
    ball.x = restartTaker.x;
    ball.y = restartTaker.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.owner = restartTaker;
    const allPlayers = [...teamHeim, ...teamGast];
    drawField(ctx, canvas.width, canvas.height, goalFlashTimer, goalFlashSide);
    if (window.debugOptions.showZones) {
      drawZones(ctx, allPlayers, { ball, coach, tactic: coach?.pressing > 1 ? "pressing" : null });
    }
    drawPlayers(ctx, allPlayers, { showTargets: window.debugOptions.showTargets });
    drawReferee(ctx, referee);
    if (window.debugOptions.showFormation && selectedPlayer) {
      drawFormationDebug(ctx, [selectedPlayer]);
    }
    drawBall(ctx, ball);
    if (window.debugOptions.showBall) drawBallDebug(ctx, ball);
    drawOverlay(ctx, `${restartType}: ${restartTimer.toFixed(1)}s`, canvas.width);
    updateScoreboard();
    requestAnimationFrame(gameLoop);
    return;
  }
  if (freeKickTimer > 0) {
    freeKickTimer -= delta;
    ball.x = freeKickTaker.x;
    ball.y = freeKickTaker.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.owner = freeKickTaker;
    const allPlayers = [...teamHeim, ...teamGast];
    drawField(ctx, canvas.width, canvas.height, goalFlashTimer, goalFlashSide);
    if (window.debugOptions.showZones && selectedPlayer) {
      drawZones(ctx, [selectedPlayer], { ball, coach, tactic: coach?.pressing > 1 ? "pressing" : null });
    }
    drawPlayers(ctx, allPlayers, { showTargets: window.debugOptions.showTargets });
    drawReferee(ctx, referee);
    if (window.debugOptions.showFormation && selectedPlayer) {
      drawFormationDebug(ctx, [selectedPlayer]);
    }
    drawBall(ctx, ball);
    if (window.debugOptions.showBall) drawBallDebug(ctx, ball);
    drawOverlay(ctx, `Freistoß: ${freeKickTimer.toFixed(1)}s`, canvas.width);
    updateScoreboard();
    requestAnimationFrame(gameLoop);
    return;
  }
  updateUserInput(delta);
  updateUserInput2();
  if (userInput.resetDown) {
    resetGame();
    matchPaused = false;
  }
  updateFormationOffsets();
  if (selectedPlayer) {
    const active = Math.abs(userInput.dx) > 0.01 || Math.abs(userInput.dy) > 0.01;
    selectedPlayer.controlledByUser = active;
    if (active) {
      let dx = userInput.dx;
      let dy = userInput.dy;
      const mag = Math.hypot(dx, dy);
      if (mag > 0) {
        const step = (selectedPlayer.derived.topSpeed ?? 2) * 4;
        dx = (dx / mag) * step;
        dy = (dy / mag) * step;
        selectedPlayer.targetX = selectedPlayer.x + dx;
        selectedPlayer.targetY = selectedPlayer.y + dy;
      }
    }
  }

  if (selectedPlayer2) {
    const active2 = Math.abs(userInput2.dx) > 0.01 || Math.abs(userInput2.dy) > 0.01;
    selectedPlayer2.controlledByUser = active2;
    if (active2) {
      let dx = userInput2.dx;
      let dy = userInput2.dy;
      const mag = Math.hypot(dx, dy);
      if (mag > 0) {
        const step = (selectedPlayer2.derived.topSpeed ?? 2) * 4;
        dx = (dx / mag) * step;
        dy = (dy / mag) * step;
        selectedPlayer2.targetX = selectedPlayer2.x + dx;
        selectedPlayer2.targetY = selectedPlayer2.y + dy;
      }
    }
  }

  let potentialMate = null;
  if (selectedPlayer && ball.owner === selectedPlayer) {
    if (userInput.shootPressed) {
      shotCharging = true;
      shotCharge = Math.min(1, shotCharge + delta);
    } else if (shotCharging && inputHandler.can("shoot")) {
      doShoot(selectedPlayer, userInput.dx, userInput.dy, shotCharge);
      shotCharging = false;
      shotCharge = 0;
      inputHandler.triggerCooldown("shoot");
    }

    if (userInput.passDown) {
      passCharging = true;
      passCharge = 0;
    }
    if (passCharging) {
      passCharge = Math.min(1, passCharge + delta);
      potentialMate = findTeammateInDirection(selectedPlayer, userInput.dx, userInput.dy);
      if (!potentialMate) potentialMate = findNearestTeammate(selectedPlayer);
      if (potentialMate) {
        passIndicator = { from: { x: selectedPlayer.x, y: selectedPlayer.y }, to: { x: potentialMate.x, y: potentialMate.y }, time: 0.2 };
      }
    }
    if (userInput.passUp && passCharging && inputHandler.can("pass")) {
      if (!potentialMate) {
        potentialMate = findTeammateInDirection(selectedPlayer, userInput.dx, userInput.dy);
        if (!potentialMate) potentialMate = findNearestTeammate(selectedPlayer);
      }
      if (potentialMate) {
        doPass(selectedPlayer, potentialMate, passCharge);
        inputHandler.triggerCooldown("pass");
      }
      passCharging = false;
      passCharge = 0;
    }

    if (userInput.tacklePressed && !prevTackle && inputHandler.can("slide")) {
      doTackle(selectedPlayer);
      inputHandler.triggerCooldown("slide");
    }
  } else {
    shotCharging = false;
    shotCharge = 0;
    passCharging = false;
    passCharge = 0;
  }

  if (selectedPlayer2 && ball.owner === selectedPlayer2) {
    if (userInput2.shootPressed) {
      shotCharging2 = true;
      shotCharge2 = Math.min(1, shotCharge2 + delta);
    } else if (shotCharging2) {
      doShoot(selectedPlayer2, userInput2.dx, userInput2.dy, shotCharge2);
      shotCharging2 = false;
      shotCharge2 = 0;
    }
  } else {
    shotCharging2 = false;
    shotCharge2 = 0;
  }
  if (passCharging && selectedPlayer && ball.owner === selectedPlayer) {
    potentialMate = findTeammateInDirection(selectedPlayer, userInput.dx, userInput.dy);
    if (!potentialMate) potentialMate = findNearestTeammate(selectedPlayer);
    if (potentialMate) {
      passIndicator = { from: { x: selectedPlayer.x, y: selectedPlayer.y }, to: { x: potentialMate.x, y: potentialMate.y }, time: 0.2 };
    }
  }

  let potentialMate2 = null;
  if (userInput2.passPressed && !prevPass2) {
    passCharging2 = true;
    passCharge2 = 0;
  }
  if (passCharging2 && selectedPlayer2 && ball.owner === selectedPlayer2) {
    passCharge2 = Math.min(1, passCharge2 + delta);
    potentialMate2 = findTeammateInDirection(selectedPlayer2, userInput2.dx, userInput2.dy);
    if (!potentialMate2) potentialMate2 = findNearestTeammate(selectedPlayer2);
    if (potentialMate2) {
      passIndicator = { from: { x: selectedPlayer2.x, y: selectedPlayer2.y }, to: { x: potentialMate2.x, y: potentialMate2.y }, time: 0.2 };
    }
  }
  if (!userInput2.passPressed && passCharging2 && selectedPlayer2 && ball.owner === selectedPlayer2) {
    if (!potentialMate2) {
      potentialMate2 = findTeammateInDirection(selectedPlayer2, userInput2.dx, userInput2.dy);
      if (!potentialMate2) potentialMate2 = findNearestTeammate(selectedPlayer2);
    }
    if (potentialMate2) doPass(selectedPlayer2, potentialMate2, passCharge2);
    passCharging2 = false;
    passCharge2 = 0;
  }
  if (!prevTackle2 && userInput2.tacklePressed && selectedPlayer2) {
    doTackle(selectedPlayer2);
  }
  prevTackle = userInput.tacklePressed;
  prevPass2 = userInput2.passPressed;
  prevTackle2 = userInput2.tacklePressed;
  updatePowerBar();
  updateConfetti(delta);

  if (!matchPaused) {
    matchTime += delta;
    const halfSeconds = halfLengthMinutes * 60;
    if (halftime === 1 && matchTime >= halfSeconds) {
      halftime = 2;
    }
    if (halftime === 2 && matchTime >= halfSeconds * 2) {
      matchPaused = true;
    }
  }
  const allPlayers = [...teamHeim, ...teamGast];
  allPlayers.forEach((p) => {
    p.updateInjury(delta);

    // Update ball cooldown timer
    if (p.ballCooldown > 0) {
      p.ballCooldown -= delta;
      if (p.ballCooldown <= 0) {
        p.ballCooldown = 0;
      }
    }
  });

  // 1. Wahrnehmung (inkl. FOV/Kopf/Memory)
  allPlayers.forEach((p) => {
    const poiGoal = teamHeim.includes(p) ? { x: 1040, y: 340, role: "opponentGoal" } : { x: 10, y: 340, role: "opponentGoal" };
    p.perceive([...allPlayers, ball, poiGoal, ...POIS]);
  });

  // 2. Decision/Behavior Tree (jeder Spieler individuell, Skill-basiertes Timing)
  allPlayers.forEach((p) => {
    p.hasBall = ball.owner === p;
    const myTeam = teamHeim.includes(p) ? teamHeim : teamGast;
    const otherTeam = teamHeim.includes(p) ? teamGast : teamHeim;
    const world = {
      players: allPlayers,
      teammates: myTeam,
      opponents: otherTeam,
      ball,
      referee,
      coach,
      phase: coach?.phase,
      opponentGoal: teamHeim.includes(p) ? { x: 1040, y: 340 } : { x: 10, y: 340 },
      farLeft: { x: 60, y: 340 },
    };
    // Jeder Spieler entscheidet im eigenen Rhythmus (siehe Player.maybeDecide)
    p.maybeDecide(performance.now(), world, currentState);
    const teamIdx = teamHeim.includes(p) ? 0 : 1;
    const off = teamIdx === 0 ? formationOffsetHome : formationOffsetAway;
    if (!p.controlledByUser && (p.currentAction === "hold" || p.currentAction === "rest")) {
      let tx = p.formationX + off.x;
      let ty = p.formationY + off.y;
      const dxBall = ball.x - p.formationX;
      const dyBall = ball.y - p.formationY;
      if (Math.hypot(dxBall, dyBall) < 200) {
        tx += dxBall * 0.2;
        ty += dyBall * 0.2;
      }
      p.targetX = tx;
      p.targetY = ty;
    }
  });

  // 3. PASS LOGIC: Nur Ballbesitzer kann passen
  if (ball.owner && ball.owner.currentAction === "pass") {
    const owner = ball.owner;
    logComment(`${owner.role} spielt einen Pass`);
    const dx = owner.targetX - ball.x,
      dy = owner.targetY - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 8; // Skill-basiert möglich!
    const offset = owner.radius + ball.radius + 2;
    const startX = ball.x + (dx / dist) * offset;
    const startY = ball.y + (dy / dist) * offset;
    ball.kick(startX, startY, dx, dy, speed);
    ball.angularVelocity = (Math.random() - 0.5) * 0.02;
    ball.isLoose = true;
    ball.owner = null;
  }

  // 4. Spieler bewegen
  allPlayers.forEach((p) => {
    const myTeam = teamHeim.includes(p) ? teamHeim : teamGast;
    const otherTeam = teamHeim.includes(p) ? teamGast : teamHeim;
    const world = { ball, teammates: myTeam, opponents: otherTeam, referee, coach, phase: coach?.phase };
    p.moveToTarget(world);
  });
  allPlayers.forEach((p) =>
    p.updateHead(ball, delta, {
      teammates: teamHeim.includes(p) ? teamHeim : teamGast,
      opponents: teamHeim.includes(p) ? teamGast : teamHeim,
    })
  );
  resolvePlayerCollisions(allPlayers);
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

  // Update FIFA game state and referee
  gameStateManager.updateMatchTime(delta);
  referee.update(allPlayers, ball, delta, gameStateManager.matchTime);

  checkSubstitutions();

  // 5. Ballphysik & Ballbesitz
  ball.update(delta, allPlayers, FIELD_BOUNDS, weather);
  if (ball.lastTouch) setLastTouch(ball.lastTouch);
  if (ball.outOfBounds && restartTimer <= 0 && freeKickTimer <= 0) {
    const info = referee.checkRestart(ball, lastTouchTeam);
    if (info) {
      if (info.type === "throwIn") startThrowIn(info.side);
      else if (info.type === "corner" || info.type === "goalKick") {
        startGoalRestart(info.side);
      }
    }
    ball.outOfBounds = null;
  }

  const currentTeam = teamId(ball.owner);
  const myTeamId = userTeam === teamHeim ? 0 : 1;
  if (lastBallOwnerTeam === myTeamId && currentTeam !== myTeamId) {
    switchToNearestPlayer(userTeam);
    logComment("Automatischer Spielerwechsel");
  }
  lastBallOwnerTeam = currentTeam;
  const myTeamId2 = userTeam2 === teamHeim ? 0 : 1;
  if (lastBallOwnerTeam2 === myTeamId2 && currentTeam !== myTeamId2) {
    switchToNearestPlayer(userTeam2);
    logComment("Spieler 2 automatisch gewechselt");
  }
  lastBallOwnerTeam2 = currentTeam;

  if (passIndicator && passIndicator.time > 0) {
    passIndicator.time -= delta;
    if (passIndicator.time <= 0) passIndicator = null;
  }

  // 6. Ballschatten rendern (optional)
  if (ball.isLoose && (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5)) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x + ball.vx * 12, ball.y + ball.vy * 12, 8, 0, 2 * Math.PI);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#00bfff";
    ctx.fill();
    ctx.restore();
  }

  // 7. RENDER
  // Debug occasionally (not every frame)
  if (Math.random() < 0.01) {
    //console.log("Main render - players count:", allPlayers.length, "ball:", ball.x, ball.y);
  }

  drawField(ctx, canvas.width, canvas.height, goalFlashTimer, goalFlashSide);

  if (window.debugOptions.showZones) {
    const playersToDebug = [];
    if (selectedPlayer) playersToDebug.push(selectedPlayer);
    if (selectedPlayer2) playersToDebug.push(selectedPlayer2);
    if (playersToDebug.length > 0) {
      drawZones(ctx, playersToDebug, { ball, coach, tactic: coach?.pressing > 1 ? "pressing" : null });
    }
  }
  drawPasses(ctx, allPlayers, ball);
  drawPassIndicator(ctx, passIndicator);
  drawConfetti(ctx);

  //console.log("About to draw players:", allPlayers.length);
  try {
    drawPlayers(ctx, allPlayers, { showFOV: window.debugOptions.showFOV, showRunDir: true, showHeadDir: true, showTargets: window.debugOptions.showTargets });
    //console.log("Players drawn successfully");
  } catch (error) {
    console.error("Error drawing players:", error);
  }

  drawReferee(ctx, referee);
  if (window.debugOptions.showFormation) {
    const playersToDebug = [];
    if (selectedPlayer) playersToDebug.push(selectedPlayer);
    if (selectedPlayer2) playersToDebug.push(selectedPlayer2);
    if (playersToDebug.length > 0) {
      drawFormationDebug(ctx, playersToDebug);
    }
  }
  if (selectedPlayer) {
    drawPlayers(ctx, [selectedPlayer], { showFOV: window.debugOptions.showFOV, showRunDir: true, showHeadDir: true, showTargets: window.debugOptions.showTargets });
  }
  if (selectedPlayer2) {
    drawPlayers(ctx, [selectedPlayer2], { showFOV: true, showRunDir: true, showHeadDir: true, showTargets: window.debugOptions.showTargets });
  }
  drawActivePlayer(ctx, selectedPlayer);
  drawActivePlayer(ctx, selectedPlayer2);

  drawPerceptionHighlights(ctx, selectedPlayer);
  drawPerceptionHighlights(ctx, selectedPlayer2);

  drawBall(ctx, ball);
  if (window.debugOptions.showBall) drawBallDebug(ctx, ball);
  drawOverlay(ctx, `Ball: ${ball.owner ? ball.owner.role : "Loose"} | Wetter: ${weather.type}`, canvas.width);
  drawGoalHighlight(ctx, goalOverlayText, goalOverlayTimer, canvas.width, canvas.height);
  drawRadar(radarCtx, allPlayers, ball, radarCanvas.width, radarCanvas.height);
  debugManager.draw({ players: allPlayers, ball, tactic: coach?.pressing > 1 ? "pressing" : null });
  if (matchPaused) {
    drawOverlay(ctx, "Spiel beendet", canvas.width);

    const all = [...teamHeim, ...teamGast];
    all.forEach((p) => (p.endStamina = p.stamina)); // falls nicht geschehen
    showAnalysis(all);
  }

  // 8. Score/Goal Check/Timer
  checkGoal(ball);
  updateScoreboard();
  if (goalFlashTimer > 0) {
    goalFlashTimer -= delta;
    if (goalFlashTimer < 0) goalFlashTimer = 0;
  }
  if (goalOverlayTimer > 0) {
    goalOverlayTimer -= delta;
    if (goalOverlayTimer < 0) goalOverlayTimer = 0;
  }
  if (currentState === GameState.RUNNING && matchTime - lastFormationSwitch > 30) {
    selectedFormationIndex = (selectedFormationIndex + 1) % formations.length;
    setFormation(selectedFormationIndex);
  }
  // matchTime update usw. kannst du hier einbauen!

  requestAnimationFrame(gameLoop);
}

// Ensure proper game start
eventManager.resetKickoff();
console.log("Game initialized and ready to start with modular systems");

// Start the new modular game loop
gameLoop.start();
