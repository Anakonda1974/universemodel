// main.js

import { Player } from "./player.js";
import { drawField, drawPlayers, drawBall, drawOverlay, drawZones, drawPasses, drawPerceptionHighlights } from "./render.js";

// ----- Game Setup -----
const canvas = document.getElementById("spielfeld");
const ctx = canvas.getContext("2d");

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
let ball;
let selectedPlayer = null;
const userInput = { up: false, down: false, left: false, right: false };
let gamepadIndex = null;

const POIS = [
  { x: 60, y: 340, role: "farLeft" }
];

// --- Difficulty ---
let difficulty = "normal";
const difficultyMultipliers = { easy: 0.8, normal: 1, hard: 1.2 };

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
ball = new Ball(525, 340);

loadFormations();
setupMatchControls();
setupDifficultyControls();
applyDifficulty();

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (selectedPlayer) selectedPlayer.controlledByUser = false;
  selectedPlayer = null;
  for (const p of [...teamHeim, ...teamGast]) {
    if (Math.hypot(p.x - x, p.y - y) <= p.radius) {
      selectedPlayer = p;
      break;
    }
  }
});

window.addEventListener('keydown', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') userInput.up = true;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') userInput.down = true;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') userInput.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') userInput.right = true;
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowUp' || e.code === 'KeyW') userInput.up = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') userInput.down = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') userInput.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') userInput.right = false;
});
window.addEventListener('gamepadconnected', e => { gamepadIndex = e.gamepad.index; });
window.addEventListener('gamepaddisconnected', e => { if (gamepadIndex === e.gamepad.index) gamepadIndex = null; });





function updateScoreboard() {
  document.getElementById("score").textContent = `${scoreHome} : ${scoreAway}`;
  document.getElementById("timer").textContent = toTimeString(matchTime);
  document.getElementById("halftime").textContent = halftime === 1 ? "1. Halbzeit" : "2. Halbzeit";
  document.getElementById("cards").textContent = "🟨" + yellowCards.length + " 🟥" + redCards.length;
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
    resetKickoff();
  }
  if (ball.x > 1035 && ball.y > 290 && ball.y < 390) {
    scoreHome++;
    playGoal();
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

function updateUserInput() {
  if (gamepadIndex !== null) {
    const gp = navigator.getGamepads()[gamepadIndex];
    if (gp) {
      const threshold = 0.2;
      userInput.left = gp.axes[0] < -threshold;
      userInput.right = gp.axes[0] > threshold;
      userInput.up = gp.axes[1] < -threshold;
      userInput.down = gp.axes[1] > threshold;
    }
  }
}

// ----- GAME LOOP -----
function gameLoop(timestamp) {
  if (lastFrameTime === null) lastFrameTime = timestamp;
  const delta = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  updateUserInput();
  if (selectedPlayer) {
    const active = userInput.up || userInput.down || userInput.left || userInput.right || gamepadIndex !== null;
    selectedPlayer.controlledByUser = active;
    if (active) {
      let dx = (userInput.right ? 1 : 0) - (userInput.left ? 1 : 0);
      let dy = (userInput.down ? 1 : 0) - (userInput.up ? 1 : 0);
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

  // 5. Ballphysik & Ballbesitz
  if (!ball.owner) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (Math.abs(ball.spin) > 0.0001) {
      const curve = ball.spin;
      const ax = -ball.vy * curve;
      const ay = ball.vx * curve;
      ball.vx += ax;
      ball.vy += ay;
    }
    ball.vx *= 0.97;
    ball.vy *= 0.97;
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
  drawPlayers(ctx, allPlayers, { showFOV: true, showRunDir: true, showHeadDir: true });

  drawPerceptionHighlights(ctx, selectedPlayer);

  drawBall(ctx, ball);
  drawOverlay(ctx, `Ball: ${ball.owner ? ball.owner.role : "Loose"}`, canvas.width);

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
