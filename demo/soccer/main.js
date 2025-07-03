// main.js

import { Player } from "./player.js";
import { drawField, drawPlayers, drawBall, drawOverlay, drawZones, drawPasses } from "./render.js";

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

// Score, timer, cards, etc.
let scoreHome = 0, scoreAway = 0;
let matchTime = 0; // in seconds
let halftime = 1;
let matchPaused = false;
let halfLengthMinutes = 45;
let lastFrameTime = null;
let yellowCards = [], redCards = [];

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
for (let i = 0; i < 11; i++) teamHeim.push(new Player(80 + Math.random() * 20, 100 + i * 40, "blue", {
  position: "ST", // Später aus Formation-JSON überschreiben
  trade: (i === 9 ? "sniper" : null) // Beispiel: Stürmer als Sniper, andere Standard
}));
for (let i = 0; i < 11; i++) teamGast.push(new Player(970 - Math.random() * 20, 100 + i * 40, "red", {
  position: "IV", // Beispiel: als IV, kann überschrieben werden
  trade: (i === 2 ? "wall" : null)
}));
ball = new Ball(525, 340);

loadFormations();
setupMatchControls();



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
    resetKickoff();
  }
  if (ball.x > 1035 && ball.y > 290 && ball.y < 390) {
    scoreHome++;
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
}

// --- Ball auf Spielfeld halten
function clampBall(ball) {
  let changed = false;
  if (ball.x < 15) { ball.x = 15; changed = true; }
  if (ball.x > 1035) { ball.x = 1035; changed = true; }
  if (ball.y < 15) { ball.y = 15; changed = true; }
  if (ball.y > 665) { ball.y = 665; changed = true; }
  if (changed) {
    ball.vx = 0; ball.vy = 0;
  }
}

// ----- GAME LOOP -----
function gameLoop(timestamp) {
  if (lastFrameTime === null) lastFrameTime = timestamp;
  const delta = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

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
  allPlayers.forEach(p => p.perceive([...allPlayers, ball]));

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
    ball.isLoose = true;
    ball.owner = null;
  }

  // 4. Spieler bewegen
  allPlayers.forEach(p => p.moveToTarget());
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
    ball.vx *= 0.97;
    ball.vy *= 0.97;

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
  drawPlayers(ctx, allPlayers, { showFOV: true });
  drawBall(ctx, ball);
  drawOverlay(ctx, `Ball: ${ball.owner ? ball.owner.role : "Loose"}`, canvas.width);

  // 8. Score/Goal Check/Timer
  checkGoal(ball);
  updateScoreboard();
  // matchTime update usw. kannst du hier einbauen!

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
