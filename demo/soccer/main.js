// main.js

import { Player } from "./player.js";
import { Coach } from "./coach.js";
import { drawField, drawPlayers, drawBall, drawOverlay, drawZones, drawPasses, drawPerceptionHighlights, drawPassIndicator } from "./render.js";
import { logComment } from "./commentary.js";
import { Referee } from "./referee.js";

// ----- Game Setup -----
const canvas = document.getElementById("spielfeld");
const ctx = canvas.getContext("2d");
const powerBarWrapper = document.getElementById("powerBarWrapper");
const powerBar = document.getElementById("powerBar");

const GameState = {
  FORMATION: "Formation wählen",
  TRANSITION: "Positionswechsel",
  RUNNING: "Spiel läuft",
};
let currentState = GameState.FORMATION;
let nextState = GameState.RUNNING;
const MAX_TRANSITION_TIME = 8000;
let transitionStartTime = null;

let formations = [];
let selectedFormationIndex = 0;
const teamHeim = [], teamGast = [];
const benchHeim = [], benchGast = [];
let ball;
let coach;
let referee;
let selectedPlayer = null;
let userTeam = teamHeim;
const userInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  dx: 0,
  dy: 0,
  passPressed: false,
  shootPressed: false,
  tacklePressed: false
};
let gamepadIndex = null;
let passIndicator = null;
let shotCharge = 0;
let shotCharging = false;
let prevPass = false;
let prevTackle = false;

let lastBallOwnerTeam = null;

const POIS = [
  { x: 60, y: 340, role: "farLeft" }
];

// --- Difficulty ---
let difficulty = "normal";
const difficultyMultipliers = { easy: 0.8, normal: 1, hard: 1.2 };

// --- Weather ---
let weather = { type: "clear", windX: 0, windY: 0, friction: 0.97 };

function applyWeather() {
  switch (weather.type) {
    case "wind":
      weather.windX = 0.03;
      weather.windY = 0.01;
      weather.friction = 0.97;
      break;
    case "rain":
      weather.windX = 0;
      weather.windY = 0;
      weather.friction = 0.985;
      break;
    default:
      weather.windX = 0;
      weather.windY = 0;
      weather.friction = 0.97;
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

function applyDifficulty() {
  const mult = difficultyMultipliers[difficulty] || 1;
  [...teamHeim, ...teamGast].forEach(p => {
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
    if (d < minDist) { minDist = d; nearest = p; }
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
startCrowdNoise();

function playBeep(freq, duration = 300) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  gain.gain.setValueAtTime(1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration/1000);
  osc.stop(audioCtx.currentTime + duration/1000);
}
function playWhistle() { playBeep(1200, 500); }
function playGoal() { playBeep(500, 700); }

// Score, timer, cards, etc.
let scoreHome = 0, scoreAway = 0;
let matchTime = 0; // in seconds
let halftime = 1;
let matchPaused = false;
let halfLengthMinutes = 45;
let lastFrameTime = null;
let yellowCards = [], redCards = [];
let lastFormationSwitch = 0;

// --- Ball-Objekt ---
class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 6;
    this.isLoose = true;
    this.owner = null;
    this.vx = 0;
    this.vy = 0;
    this.spin = 0; // einfache Rotation für Effet
  }
}

function findNearestTeammate(player) {
  const team = teamHeim.includes(player) ? teamHeim : teamGast;
  let best = null;
  let min = Infinity;
  for (const mate of team) {
    if (mate === player) continue;
    const d = Math.hypot(mate.x - player.x, mate.y - player.y);
    if (d < min) { min = d; best = mate; }
  }
  return best;
}

function passBall(from, to) {
  if (!from || !to) return;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return;
  ball.owner = null;
  ball.isLoose = true;
  ball.vx = (dx / dist) * 8;
  ball.vy = (dy / dist) * 8;
  ball.spin = (Math.random() - 0.5) * 0.02;
  from.currentAction = "pass";
  passIndicator = { from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, time: 0.5 };
}

function shootBall(player, power = 1) {
  if (!player) return;
  const goalX = teamHeim.includes(player) ? 1040 : 10;
  const goalY = 340;
  const dx = goalX - player.x;
  const dy = goalY - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return;
  ball.owner = null;
  ball.isLoose = true;
  const speed = 8 + power * 12;
  ball.vx = (dx / dist) * speed;
  ball.vy = (dy / dist) * speed;
  ball.spin = (Math.random() - 0.5) * 0.04;
  player.currentAction = "shoot";
}

function tryTackle(player) {
  if (!player || player.tackleCooldown > 0) return;
  if (!ball.owner || ball.owner === player) return;
  const target = ball.owner;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dist = Math.hypot(dx, dy);
  const tackleRadius = 18;
  const slideRadius = 40;
  if (dist < tackleRadius) {
    ball.owner = player;
    ball.isLoose = false;
    ball.vx = 0;
    ball.vy = 0;
    ball.x = player.x;
    ball.y = player.y;
    for (const p of [...teamHeim, ...teamGast]) p.hasBall = false;
    player.hasBall = true;
    player.currentAction = "tackle";
  } else if (dist < slideRadius) {
    player.sliding = true;
    player.slideDirX = dx / dist;
    player.slideDirY = dy / dist;
    player.slideSpeed = 8;
    player.slideTimer = 30;
    player.currentAction = "tackle";
  }
  player.tackleCooldown = 120;
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
      p.color = "blue";
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
      p.color = "red";
      p.position = formation.players[i].role;
    }
  });

  document.getElementById("formationDesc").textContent = formation.description;
  lastFormationSwitch = matchTime;
  playWhistle();
  logComment(`Formation gewechselt zu ${formation.name}`);
}

async function loadFormations() {
  formations = await fetch("formations.json").then(res => res.json());
  const select = document.getElementById("formationSelect");
  select.innerHTML = "";
  formations.forEach((f, i) => {
    let opt = document.createElement("option");
    opt.value = i;
    opt.textContent = f.name;
    select.appendChild(opt);
  });
  select.onchange = e => {
    selectedFormationIndex = +e.target.value;
    setFormation(selectedFormationIndex);
  };
  document.getElementById("formationDesc").textContent = formations[0].description;
  setFormation(0);
}

// --- Teams initialisieren (mit Basiswerten für Skill/Trade/Position) ---
for (let i = 0; i < 11; i++) {
  const p = new Player(80 + Math.random() * 20, 100 + i * 40, "blue", {
    position: "ST",
    trade: (i === 9 ? "sniper" : null)
  });
  p.baseline = { ...p.base };
  teamHeim.push(p);
}
for (let i = 0; i < 11; i++) {
  const p = new Player(970 - Math.random() * 20, 100 + i * 40, "red", {
    position: "IV",
    trade: (i === 2 ? "wall" : null)
  });
  p.baseline = { ...p.base };
  teamGast.push(p);
}
for (let i = 0; i < 3; i++) {
  const p = new Player(-30, -30, "blue", { position: "ST" });
  p.baseline = { ...p.base };
  benchHeim.push(p);
}
for (let i = 0; i < 3; i++) {
  const p = new Player(-30, -30, "red", { position: "IV" });
  p.baseline = { ...p.base };
  benchGast.push(p);
}
ball = new Ball(525, 340);
coach = new Coach([...teamHeim, ...teamGast]);
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
referee = new Referee(handleCard);

loadFormations();
setupMatchControls();
setupDifficultyControls();
applyDifficulty();
setupWeatherControls();
applyWeather();
selectedPlayer = teamHeim[0];
userTeam = teamHeim;

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (selectedPlayer) selectedPlayer.controlledByUser = false;
  selectedPlayer = null;
  for (const p of [...teamHeim, ...teamGast]) {
    if (Math.hypot(p.x - x, p.y - y) <= p.radius) {
      selectedPlayer = p;
      userTeam = teamHeim.includes(p) ? teamHeim : teamGast;
      break;
    }
  }
});

window.addEventListener('keydown', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') userInput.up = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') userInput.down = true;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') userInput.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') userInput.right = true;
  if (e.code === 'Space') {
    if (selectedPlayer && ball.owner === selectedPlayer) {
      const mate = findNearestTeammate(selectedPlayer);
      if (mate) passBall(selectedPlayer, mate);
    }
  }
  if (e.code === 'KeyF') {
    userInput.shootPressed = true;
  }
  if (e.code === 'KeyX') {
    if (selectedPlayer) {
      tryTackle(selectedPlayer);
    }
    userInput.tacklePressed = true;
  }
  if (e.code === 'KeyR') resetGame();
  if (e.code === 'KeyP') {
    const level = coach.pressing === 1 ? 1.5 : 1;
    coach.setPressing(level);
    logComment(level > 1 ? 'Coach: Pressing hoch!' : 'Coach: Pressing normal');
  }
  if (e.code === 'KeyC') {
    switchToNearestPlayer(userTeam);
    logComment('Spieler gewechselt');
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') userInput.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') userInput.down = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') userInput.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') userInput.right = false;
  if (e.code === 'KeyX') userInput.tacklePressed = false;
  if (e.code === 'KeyF') userInput.shootPressed = false;
});
window.addEventListener('gamepadconnected', e => { gamepadIndex = e.gamepad.index; });
window.addEventListener('gamepaddisconnected', e => { if (gamepadIndex === e.gamepad.index) gamepadIndex = null; });





function updateScoreboard() {
  document.getElementById("score").textContent = `${scoreHome} : ${scoreAway}`;
  document.getElementById("timer").textContent = toTimeString(matchTime);
  document.getElementById("halftime").textContent = halftime === 1 ? "1. Halbzeit" : "2. Halbzeit";
  document.getElementById("cards").textContent = "🟨" + yellowCards.length + " 🟥" + redCards.length;
}

function updatePowerBar() {
  if (!powerBarWrapper || !powerBar) return;
  if (shotCharging) {
    powerBarWrapper.style.display = "block";
    powerBar.style.width = `${Math.round(shotCharge * 100)}%`;
  } else {
    powerBarWrapper.style.display = "none";
    powerBar.style.width = "0%";
  }
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
    logComment('Tor für Auswärtsteam!');
    resetKickoff();
  }
  if (ball.x > 1035 && ball.y > 290 && ball.y < 390) {
    scoreHome++;
    playGoal();
    logComment('Tor für Heimteam!');
    resetKickoff();
  }
}
function resetKickoff() {
  ball.x = 525;
  ball.y = 340;
  ball.isLoose = true;
  setFormation(selectedFormationIndex);
  ball.owner = teamHeim[4]; // oder nach Zufall/Regel
  ball.isLoose = false;
  playWhistle();
  logComment('Anstoß');
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
  logComment('Spiel zurückgesetzt');
}

// --- Ball auf Spielfeld halten
function clampBall(ball) {
  let changed = false;
  if (ball.x < 15) { ball.x = 15; ball.vx *= -0.7; ball.spin *= 0.5; changed = true; }
  if (ball.x > 1035) { ball.x = 1035; ball.vx *= -0.7; ball.spin *= 0.5; changed = true; }
  if (ball.y < 15) { ball.y = 15; ball.vy *= -0.7; ball.spin *= 0.5; changed = true; }
  if (ball.y > 665) { ball.y = 665; ball.vy *= -0.7; ball.spin *= 0.5; changed = true; }
  if (changed) {
    // leichte Dämpfung beim Abprall
  }
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

function updateUserInput() {
  let usingGp = false;
  if (gamepadIndex !== null) {
    const gp = navigator.getGamepads()[gamepadIndex];
    if (gp) {
      usingGp = true;
      const threshold = 0.2;
      const dz = v => Math.abs(v) < threshold ? 0 : (v - Math.sign(v)*threshold)/(1-threshold);
      userInput.dx = dz(gp.axes[0]);
      userInput.dy = dz(gp.axes[1]);
      userInput.passPressed = gp.buttons[1] && gp.buttons[1].pressed;
      userInput.shootPressed = gp.buttons[0] && gp.buttons[0].pressed;
      userInput.tacklePressed = gp.buttons[2] && gp.buttons[2].pressed;
    }
  }
  if (!usingGp) {
    userInput.dx = (userInput.right ? 1 : 0) - (userInput.left ? 1 : 0);
    userInput.dy = (userInput.down ? 1 : 0) - (userInput.up ? 1 : 0);
  }
}

// ----- GAME LOOP -----
function gameLoop(timestamp) {
  if (lastFrameTime === null) lastFrameTime = timestamp;
  const delta = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  updateUserInput();
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

  if (selectedPlayer && ball.owner === selectedPlayer) {
    if (userInput.shootPressed) {
      shotCharging = true;
      shotCharge = Math.min(1, shotCharge + delta);
    } else if (shotCharging) {
      shootBall(selectedPlayer, shotCharge);
      shotCharging = false;
      shotCharge = 0;
    }
  } else {
    shotCharging = false;
    shotCharge = 0;
  }
  if (!prevPass && userInput.passPressed && selectedPlayer && ball.owner === selectedPlayer) {
    const mate = findNearestTeammate(selectedPlayer);
    if (mate) passBall(selectedPlayer, mate);
  }
  if (!prevTackle && userInput.tacklePressed && selectedPlayer) {
    tryTackle(selectedPlayer);
  }
  prevPass = userInput.passPressed;
  prevTackle = userInput.tacklePressed;
  updatePowerBar();

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
  allPlayers.forEach(p => p.updateInjury(delta));

  // 1. Wahrnehmung (inkl. FOV/Kopf/Memory)
  allPlayers.forEach(p => {
    const poiGoal = teamHeim.includes(p) ? { x: 1040, y: 340, role: "opponentGoal" }
                                        : { x: 10, y: 340, role: "opponentGoal" };
    p.perceive([...allPlayers, ball, poiGoal, ...POIS]);
  });

  // 2. Decision/Behavior Tree (jeder Spieler individuell, Skill-basiertes Timing)
  allPlayers.forEach(p => {
    p.hasBall = (ball.owner === p);
    const myTeam = teamHeim.includes(p) ? teamHeim : teamGast;
    const otherTeam = teamHeim.includes(p) ? teamGast : teamHeim;
    const world = {
      players: allPlayers,
      teammates: myTeam,
      opponents: otherTeam,
      ball,
      opponentGoal: teamHeim.includes(p) ? { x: 1040, y: 340 } : { x: 10, y: 340 },
      farLeft: { x: 60, y: 340 }
    };
    // Jeder Spieler entscheidet im eigenen Rhythmus (siehe Player.maybeDecide)
    p.maybeDecide(performance.now(), world, currentState);
  });

  // 3. PASS LOGIC: Nur Ballbesitzer kann passen
  if (ball.owner && ball.owner.currentAction === "pass") {
    const owner = ball.owner;
    logComment(`${owner.role} spielt einen Pass`);
    const dx = owner.targetX - ball.x, dy = owner.targetY - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 8; // Skill-basiert möglich!
    ball.vx = (dx / dist) * speed;
    ball.vy = (dy / dist) * speed;
    ball.spin = (Math.random() - 0.5) * 0.02;
    ball.isLoose = true;
    ball.owner = null;
  }

  // 4. Spieler bewegen
  allPlayers.forEach(p => p.moveToTarget());
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

  referee.update(allPlayers, ball);

  checkSubstitutions();

  // 5. Ballphysik & Ballbesitz
  if (!ball.owner) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (weather.windX || weather.windY) {
      ball.vx += weather.windX;
      ball.vy += weather.windY;
    }
    if (Math.abs(ball.spin) > 0.0001) {
      const curve = ball.spin;
      const ax = -ball.vy * curve;
      const ay = ball.vx * curve;
      ball.vx += ax;
      ball.vy += ay;
    }
    ball.vx *= weather.friction;
    ball.vy *= weather.friction;
    ball.spin *= 0.985;

    for (const p of allPlayers) {
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < p.radius + ball.radius + 2) {
        ball.owner = p;
        ball.isLoose = false;
        ball.vx = 0; ball.vy = 0;
        ball.x = p.x;
        ball.y = p.y;
        break;
      }
    }
    clampBall(ball);

  } else {
    ball.x = ball.owner.x;
    ball.y = ball.owner.y;
  }

  const currentTeam = teamId(ball.owner);
  const myTeamId = userTeam === teamHeim ? 0 : 1;
  if (lastBallOwnerTeam === myTeamId && currentTeam !== myTeamId) {
    switchToNearestPlayer(userTeam);
    logComment('Automatischer Spielerwechsel');
  }
  lastBallOwnerTeam = currentTeam;

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
  drawField(ctx, canvas.width, canvas.height);
  drawZones(ctx, allPlayers);
  drawPasses(ctx, allPlayers, ball);
  drawPassIndicator(ctx, passIndicator);
  drawPlayers(ctx, allPlayers, { showFOV: true, showRunDir: true, showHeadDir: true });

  drawPerceptionHighlights(ctx, selectedPlayer);

  drawBall(ctx, ball);
  drawOverlay(ctx, `Ball: ${ball.owner ? ball.owner.role : "Loose"} | Wetter: ${weather.type}`, canvas.width);

  // 8. Score/Goal Check/Timer
  checkGoal(ball);
  updateScoreboard();
  if (currentState === GameState.RUNNING && matchTime - lastFormationSwitch > 30) {
    selectedFormationIndex = (selectedFormationIndex + 1) % formations.length;
    setFormation(selectedFormationIndex);
  }
  // matchTime update usw. kannst du hier einbauen!

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
