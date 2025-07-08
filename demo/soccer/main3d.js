import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';
import { Player3D } from './player3d.js';
import { Ball3D } from './ball3d.js';
import { SoccerPitch3D } from './pitch3d.js';
import { initMultiplayer } from './multiplayer.js';

// Import all 2D components for reuse
import { Player } from './player.js';
import { Coach } from './coach.js';
import { Ball, FIELD_BOUNDS } from './ball.js';
import { Referee } from './referee.js';
import { GameStateManager } from './gameStateManager.js';
import { logComment } from './commentary.js';
import { TraitProfiles, getTraitProfile } from './traitConfig.js';
import { Capabilities } from './capabilities.js';
import { DebugManager } from './debugManager.js';
import { createPlayerBT } from './footBallBTs.js';

// ===== GAME STATE VARIABLES (from 2D version) =====
let teamHeim = [];
let teamGast = [];
let benchHeim = [];
let benchGast = [];
let allPlayers = [];
let ball2D; // 2D ball for game logic
let coach;
let referee;
let gameStateManager;
let selectedPlayer = null;
let selectedPlayer2 = null;

// Game timing and state
let matchTime = 0;
let halfTime = 1;
let matchPaused = false;
let scoreHeim = 0;
let scoreGast = 0;

// Game flow variables
let restartTimer = 0;
let restartType = "";
let freeKickTimer = 0;
let goalFlashTimer = 0;
let goalFlashSide = "";
let goalOverlayTimer = 0;
let goalOverlayText = "";

// Debug and UI state
window.debugOptions = {
  showZones: false,
  showFOV: false,
  showBall: false,
  showFormation: false,
  showTargets: false
};

// Weather system
window.weather = { type: "clear", windX: 0, windY: 0, friction: 0.992 };
const weather = window.weather;

// Points of Interest (from 2D version)
const POIS = [
  { x: 10, y: 340, role: "leftGoal" },
  { x: 1040, y: 340, role: "rightGoal" },
  { x: 525, y: 340, role: "centerField" },
  { x: 165, y: 340, role: "leftPenaltySpot" },
  { x: 885, y: 340, role: "rightPenaltySpot" }
];

// ===== THREE.JS SETUP =====
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraOffset = new THREE.Vector3(0, -15, 10);
camera.position.copy(cameraOffset);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== ENHANCED LIGHTING =====
const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
scene.add(ambient);

// Main directional light (sun)
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 50, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 200;
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

// Stadium lights
const stadiumLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
stadiumLight1.position.set(-30, 30, 20);
scene.add(stadiumLight1);

const stadiumLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
stadiumLight2.position.set(30, 30, 20);
scene.add(stadiumLight2);

// ===== MODULAR SOCCER PITCH WITH ADVANCED GRASS SHADER =====
// Create professional soccer pitch with dynamic wear tracking
const pitch = new SoccerPitch3D(renderer);
pitch.addTo(scene);

// Get field dimensions for coordinate conversion
const fieldDimensions = pitch.getDimensions();
const fieldWidth = fieldDimensions.width;
const fieldHeight = fieldDimensions.height;

// Test coordinate conversion consistency
testCoordinateConversion();









// ===== TEAM INITIALIZATION (from 2D version) =====
console.log("Creating teams...");

// Color profiles for teams
window.colorProfiles = {
  classic: { home: "#0000ff", away: "#ff0000" },
  modern: { home: "#1e90ff", away: "#ff4500" }
};
window.renderOptions = { colorProfile: "classic" };

// Create home team (blue) with proper formation positioning
const homeFormation = [
  { x: 150, y: 340, pos: "GK" },   // Goalkeeper
  { x: 250, y: 200, pos: "LB" },   // Left back
  { x: 250, y: 280, pos: "CB" },   // Center back 1
  { x: 250, y: 400, pos: "CB" },   // Center back 2
  { x: 250, y: 480, pos: "RB" },   // Right back
  { x: 400, y: 240, pos: "LM" },   // Left mid
  { x: 400, y: 340, pos: "CM" },   // Center mid
  { x: 400, y: 440, pos: "RM" },   // Right mid
  { x: 550, y: 280, pos: "LW" },   // Left wing
  { x: 550, y: 340, pos: "ST" },   // Striker
  { x: 550, y: 400, pos: "RW" }    // Right wing
];

for (let i = 0; i < 11; i++) {
  const formation = homeFormation[i];
  const player2D = new Player(formation.x, formation.y, window.colorProfiles.classic.home, {
    position: formation.pos,
    trait: i === 9 ? "sniper" : null,
  });

  // Initialize behavior tree
  player2D.behaviorTree = createPlayerBT(player2D);

  // Convert 2D position to 3D coordinates for proper alignment
  const pos3D = convert2Dto3D(player2D.x, player2D.y);

  // Create corresponding 3D player with jersey number
  const player3D = new Player3D(0x0000ff, pos3D.x, pos3D.z, {
    number: i + 1,
    position: formation.pos
  });
  player3D.player2D = player2D; // Link 2D and 3D
  player2D.player3D = player3D; // Link back

  teamHeim.push(player2D);
  player3D.addTo(scene);
}

// Create away team (red) with proper formation positioning
const awayFormation = [
  { x: 900, y: 340, pos: "GK" },   // Goalkeeper
  { x: 800, y: 200, pos: "LB" },   // Left back
  { x: 800, y: 280, pos: "CB" },   // Center back 1
  { x: 800, y: 400, pos: "CB" },   // Center back 2
  { x: 800, y: 480, pos: "RB" },   // Right back
  { x: 650, y: 240, pos: "LM" },   // Left mid
  { x: 650, y: 340, pos: "CM" },   // Center mid
  { x: 650, y: 440, pos: "RM" },   // Right mid
  { x: 500, y: 280, pos: "LW" },   // Left wing
  { x: 500, y: 340, pos: "ST" },   // Striker
  { x: 500, y: 400, pos: "RW" }    // Right wing
];

for (let i = 0; i < 11; i++) {
  const formation = awayFormation[i];
  const player2D = new Player(formation.x, formation.y, window.colorProfiles.classic.away, {
    position: formation.pos,
    trait: i === 2 ? "wall" : null,
  });

  // Initialize behavior tree
  player2D.behaviorTree = createPlayerBT(player2D);

  // Convert 2D position to 3D coordinates for proper alignment
  const pos3D = convert2Dto3D(player2D.x, player2D.y);

  // Create corresponding 3D player with jersey number
  const player3D = new Player3D(0xff0000, pos3D.x, pos3D.z, {
    number: i + 1,
    position: formation.pos
  });
  player3D.player2D = player2D; // Link 2D and 3D
  player2D.player3D = player3D; // Link back

  teamGast.push(player2D);
  player3D.addTo(scene);
}

allPlayers = [...teamHeim, ...teamGast];
console.log("Teams created:", teamHeim.length, "vs", teamGast.length);
// ===== BALL INITIALIZATION =====
ball2D = new Ball(525, 340); // Center of 2D field
ball2D = new Ball(525, 340); // Center of 2D field

// Convert 2D ball position to 3D coordinates
const ballPos3D = convert2Dto3D(ball2D.x, ball2D.y);

// Create 3D ball for visualization
const ball3D = new Ball3D(ballPos3D.x, ballPos3D.z, 0.11);
ball3D.ball2D = ball2D; // Link 2D and 3D
ball2D.ball3D = ball3D; // Link back
ball3D.addTo(scene);

// ===== GAME SYSTEMS INITIALIZATION =====
// Initialize coach
coach = new Coach();

// Initialize FIFA game state manager
gameStateManager = new GameStateManager(handleGameEvent);

// Initialize enhanced referee with FIFA rules
referee = new Referee(handleCard, handleFoul, handleOffside, handleGameEvent);

// Apply weather
applyWeather();

console.log("Game systems initialized");

// ===== GAME EVENT HANDLERS (from 2D version) =====
function handleCard(player, card) {
  if (card === "yellow") {
    logComment(`Gelbe Karte für ${player.role}`);
  } else {
    logComment(`Rote Karte für ${player.role}`);
    player.sentOff = true;
    if (player.player3D) {
      player.player3D.mesh.visible = false; // Hide 3D representation
    }
  }
  player.highlightTimer = 2;
}

function handleFoul(fouler, victim, restart) {
  logComment(`Foul von ${fouler.role} an ${victim.role}`);
  restartTimer = 2;
  restartType = restart.type;
}

function handleOffside(player) {
  logComment(`Abseits: ${player.role}`);
}

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
    default:
      console.log(`Unhandled FIFA event: ${eventType}`);
  }
}

function handleGoalEvent(data) {
  goalFlashTimer = 2;
  goalOverlayTimer = 3;

  if (teamHeim.includes(data.scorer)) {
    scoreHeim++;
    goalOverlayText = `GOAL! ${data.scorer.role} scores for Home!`;
  } else {
    scoreGast++;
    goalOverlayText = `GOAL! ${data.scorer.role} scores for Away!`;
  }

  updateScoreboard();
  logComment(goalOverlayText);
}

function handleHalftimeEvent() {
  logComment("Halbzeitpause");
}

function handleFulltimeEvent() {
  logComment(`Spielende! ${scoreHeim}:${scoreGast}`);
}

// ===== WEATHER SYSTEM =====
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
      weather.friction = 0.992;
  }
}

// ===== COORDINATE CONVERSION =====
// Convert 2D coordinates (0-1050, 0-680) to 3D coordinates
// 2D field: 1050x680, center at (525,340), goals at x=10 and x=1040
// 3D field: 52.5x34, center at (0,0), goals at x=-26.25 and x=+26.25
function convert2Dto3D(x2d, y2d) {
  const x3d = (x2d - 525) / 20; // Center and scale: 2D X -> 3D X (now wider range)
  const z3d = -(y2d - 340) / 20; // Center, scale, and flip: 2D Y -> 3D Z (now narrower range)
  return { x: x3d, z: z3d };
}

// Convert 3D coordinates back to 2D
function convert3Dto2D(x3d, z3d) {
  const x2d = x3d * 20 + 525;    // 3D X -> 2D X
  const y2d = -z3d * 20 + 340;   // 3D Z -> 2D Y (flipped)
  return { x: x2d, y: y2d };
}

// Test coordinate conversion consistency
function testCoordinateConversion() {
  console.log('🧪 COORDINATE TEST: Testing conversion consistency with new field orientation...');
  console.log('🧪 COORDINATE TEST: 3D Field now 52.5x34 (width x height), goals at X=±26.25');

  // Test key field positions
  const testPoints = [
    { name: 'Center', x2d: 525, y2d: 340 },
    { name: 'Left Goal', x2d: 10, y2d: 340 },
    { name: 'Right Goal', x2d: 1040, y2d: 340 },
    { name: 'Top Left Corner', x2d: 15, y2d: 15 },
    { name: 'Bottom Right Corner', x2d: 1035, y2d: 665 }
  ];

  testPoints.forEach(point => {
    const pos3d = convert2Dto3D(point.x2d, point.y2d);
    const pos2d = convert3Dto2D(pos3d.x, pos3d.z);
    const error = Math.hypot(pos2d.x - point.x2d, pos2d.y - point.y2d);

    console.log(`🧪 ${point.name}: 2D(${point.x2d}, ${point.y2d}) -> 3D(${pos3d.x.toFixed(2)}, ${pos3d.z.toFixed(2)}) -> 2D(${pos2d.x.toFixed(2)}, ${pos2d.y.toFixed(2)}) [Error: ${error.toFixed(4)}]`);
  });

  // Test field bounds
  const fieldBounds = pitch.getBounds();
  console.log(`🧪 COORDINATE TEST: 3D Field bounds: X[${fieldBounds.minX}, ${fieldBounds.maxX}], Z[${fieldBounds.minZ}, ${fieldBounds.maxZ}]`);
  console.log(`🧪 COORDINATE TEST: Field dimensions: ${fieldBounds.maxX - fieldBounds.minX} x ${fieldBounds.maxZ - fieldBounds.minZ}`);

  // Verify orientation
  const widthDimension = fieldBounds.maxX - fieldBounds.minX;
  const heightDimension = fieldBounds.maxZ - fieldBounds.minZ;
  const orientationCorrect = widthDimension > heightDimension;
  console.log(`🧪 COORDINATE TEST: Orientation check - Width(${widthDimension}) > Height(${heightDimension}): ${orientationCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
  console.log(`🧪 COORDINATE TEST: Goals should be at X=±${fieldBounds.maxX} (width ends)`);
  console.log(`🧪 COORDINATE TEST: Sidelines should be at Z=±${fieldBounds.maxZ} (height ends)`);
}

// ===== UI FUNCTIONS =====
function updateScoreboard() {
  const scoreElement = document.getElementById('score');
  const timerElement = document.getElementById('timer');

  if (scoreElement) {
    scoreElement.textContent = `Home ${scoreHeim} : ${scoreGast} Away`;
  }

  if (timerElement) {
    const minutes = Math.floor(matchTime / 60);
    const seconds = Math.floor(matchTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const halfStr = halfTime === 1 ? "1st Half" : "2nd Half";
    timerElement.textContent = `${timeStr} - ${halfStr}`;
  }
}

function updateMatchInfo() {
  const ballOwnerElement = document.getElementById('ball-owner');
  const weatherElement = document.getElementById('weather-display');
  const phaseElement = document.getElementById('game-phase');

  if (ballOwnerElement) {
    ballOwnerElement.textContent = ball2D.owner ? ball2D.owner.role : "Loose";
  }

  if (weatherElement) {
    weatherElement.textContent = weather.type.charAt(0).toUpperCase() + weather.type.slice(1);
  }

  if (phaseElement) {
    phaseElement.textContent = gameStateManager ? gameStateManager.gameState : "Playing";
  }
}

const mp = initMultiplayer(teamHeim[0]?.player3D, teamGast[0]?.player3D, ball3D) || { sendState: () => {}, sendKick: () => {} };

// ===== UI INITIALIZATION =====
function initializeUI() {
  // Control panel toggle
  const toggleButton = document.getElementById('control-panel-toggle');
  const controlPanel = document.getElementById('control-panel');

  if (toggleButton && controlPanel) {
    toggleButton.addEventListener('click', () => {
      controlPanel.classList.toggle('open');
    });
  }

  // Debug controls
  const debugControls = {
    'debug-zones': 'showZones',
    'debug-fov': 'showFOV',
    'debug-ball': 'showBall',
    'debug-formation': 'showFormation',
    'debug-targets': 'showTargets'
  };

  Object.entries(debugControls).forEach(([id, option]) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        window.debugOptions[option] = e.target.checked;
        console.log(`Debug option ${option}: ${e.target.checked}`);
      });
    }
  });

  // Weather controls
  const weatherSelect = document.getElementById('weatherSelect');
  if (weatherSelect) {
    weatherSelect.addEventListener('change', (e) => {
      weather.type = e.target.value;
      applyWeather();
      console.log(`Weather changed to: ${weather.type}`);
    });
  }

  // Enhanced Camera controls
  const cameraControls = {
    mode: document.getElementById('cameraMode'),
    height: document.getElementById('cameraHeight'),
    distance: document.getElementById('cameraDistance'),
    fov: document.getElementById('cameraFOV'),
    speed: document.getElementById('cameraSpeed'),
    smooth: document.getElementById('smoothCamera'),
    autoFocus: document.getElementById('autoFocus')
  };

  if (cameraControls.mode) {
    cameraControls.mode.addEventListener('change', (e) => {
      window.cameraMode = e.target.value;
      console.log(`Camera mode: ${window.cameraMode}`);
      updateCamera(true);
    });
  }

  if (cameraControls.height) {
    const display = document.getElementById('cameraHeightValue');
    cameraControls.height.addEventListener('input', (e) => {
      window.cameraHeightValue = parseFloat(e.target.value);
      if (display) display.textContent = window.cameraHeightValue;
      updateCamera(true);
    });
  }

  if (cameraControls.distance) {
    const display = document.getElementById('cameraDistanceValue');
    cameraControls.distance.addEventListener('input', (e) => {
      window.cameraDistanceValue = parseFloat(e.target.value);
      if (display) display.textContent = window.cameraDistanceValue;
      updateCamera(true);
    });
  }

  if (cameraControls.fov) {
    const display = document.getElementById('fovValue');
    cameraControls.fov.addEventListener('input', (e) => {
      window.cameraFOV = parseFloat(e.target.value);
      if (display) display.textContent = window.cameraFOV;
      updateCamera(true);
    });
  }

  if (cameraControls.speed) {
    const display = document.getElementById('cameraSpeedValue');
    cameraControls.speed.addEventListener('input', (e) => {
      window.cameraSpeed = parseFloat(e.target.value);
      if (display) display.textContent = window.cameraSpeed;
    });
  }

  if (cameraControls.smooth) {
    cameraControls.smooth.addEventListener('change', (e) => {
      window.smoothCamera = e.target.checked;
      console.log(`Smooth camera: ${window.smoothCamera}`);
    });
  }

  if (cameraControls.autoFocus) {
    cameraControls.autoFocus.addEventListener('change', (e) => {
      window.autoFocus = e.target.checked;
      console.log(`Auto focus: ${window.autoFocus}`);
    });
  }

  // Game speed control
  const gameSpeedSelect = document.getElementById('gameSpeed');
  if (gameSpeedSelect) {
    gameSpeedSelect.addEventListener('change', (e) => {
      window.gameSpeed = parseFloat(e.target.value);
      console.log(`Game speed changed to: ${window.gameSpeed}x`);
    });
  }

  // Pause control
  const pauseCheckbox = document.getElementById('pauseGame');
  if (pauseCheckbox) {
    pauseCheckbox.addEventListener('change', (e) => {
      matchPaused = e.target.checked;
      console.log(`Game ${matchPaused ? 'paused' : 'resumed'}`);
    });
  }

  console.log("UI initialized");
}

// Initialize default values
window.gameSpeed = 1.0;
window.cameraMode = 'follow';
window.cameraHeightValue = 15;
window.cameraDistanceValue = 10;
window.cameraFOV = 60;
window.cameraSpeed = 0.1;
window.smoothCamera = true;
window.autoFocus = false;

// ===== ENHANCED CAMERA SYSTEM =====
function updateCamera(snap = false) {
  const followPlayer = selectedPlayer?.player3D || teamHeim[0]?.player3D;
  const height = window.cameraHeightValue || 15;
  const distance = window.cameraDistanceValue || 10;
  const speed = window.smoothCamera ? (window.cameraSpeed || 0.1) : 1.0;
  const ballPos = ball3D?.mesh?.position || new THREE.Vector3(0, 0, 0);

  // Update FOV
  if (camera.fov !== window.cameraFOV) {
    camera.fov = window.cameraFOV;
    camera.updateProjectionMatrix();
  }

  let targetPos = new THREE.Vector3();
  let lookAtPos = new THREE.Vector3();

  switch (window.cameraMode) {
    case 'follow':
      if (followPlayer && followPlayer.mesh) {
        const playerPos = followPlayer.mesh.position;
        targetPos.set(playerPos.x - distance, height, playerPos.z);
        lookAtPos.copy(window.autoFocus ? ballPos : playerPos);
      }
      break;

    case 'broadcast':
      // TV broadcast style - follows ball from sideline
      const sideOffset = ballPos.x > 0 ? -1 : 1;
      targetPos.set(
        ballPos.x + sideOffset * distance,
        height,
        ballPos.z
      );
      lookAtPos.copy(ballPos);
      break;

    case 'overview':
      // Tactical overview from above
      targetPos.set(0, height * 2, 0);
      lookAtPos.set(0, 0, 0);
      break;

    case 'cinematic':
      // Dynamic cinematic camera
      const time = Date.now() * 0.001;
      const radius = distance * 1.5;
      targetPos.set(
        Math.cos(time * 0.1) * radius,
        height + Math.sin(time * 0.05) * 5,
        Math.sin(time * 0.1) * radius
      );
      lookAtPos.copy(ballPos);
      break;

    case 'drone':
      // Drone-like following camera
      targetPos.set(
        ballPos.x + Math.sin(Date.now() * 0.0005) * distance,
        height + Math.cos(Date.now() * 0.0003) * 3,
        ballPos.z - distance * 0.7
      );
      lookAtPos.copy(ballPos);
      break;

    case 'free':
      // Free camera controlled by mouse - no automatic movement
      return;

    default:
      // Default to ball following
      targetPos.set(ballPos.x - distance, height, ballPos.z);
      lookAtPos.copy(ballPos);
  }

  // Apply camera movement
  if (snap || !window.smoothCamera) {
    camera.position.copy(targetPos);
  } else {
    camera.position.lerp(targetPos, speed);
  }

  camera.lookAt(lookAtPos);
}

// HUD elements (keep existing for compatibility)
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');

const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// ===== ENHANCED PLAYER CONTROLS =====
function updatePlayerControls(dt) {
  if (!selectedPlayer || !selectedPlayer.player3D) return;

  const player3D = selectedPlayer.player3D;
  const player2D = selectedPlayer;

  // Enhanced movement controls
  const acc = new THREE.Vector3();
  const moveSpeed = 8; // Adjust as needed

  if (keys['KeyW']) acc.z -= moveSpeed;
  if (keys['KeyS']) acc.z += moveSpeed;
  if (keys['KeyA']) acc.x -= moveSpeed;
  if (keys['KeyD']) acc.x += moveSpeed;

  if (acc.length() > 0) {
    player3D.velocity.addScaledVector(acc, dt);

    // Update 2D position
    const pos2D = convert3Dto2D(player3D.mesh.position.x, player3D.mesh.position.z);
    player2D.x = pos2D.x;
    player2D.y = pos2D.y;
    player2D.targetX = pos2D.x;
    player2D.targetY = pos2D.y;
  }

  // Enhanced ball interaction
  if (keys['Space']) {
    const ballPos = ball3D.mesh.position;
    const playerPos = player3D.mesh.position;
    const dist = ballPos.distanceTo(playerPos);

    if (dist < 2.0) {
      // Calculate kick direction and power
      const dir3D = ballPos.clone().sub(playerPos).normalize();
      const power = 8; // Adjust as needed

      // Convert to 2D and kick
      const dir2D = { dx: dir3D.x, dy: -dir3D.z };
      const pos2D = convert3Dto2D(ballPos.x, ballPos.z);

      ball2D.kick(pos2D.x, pos2D.y, dir2D.dx, dir2D.dy, power, 0, player2D);

      mp.sendKick(dir3D.x, dir3D.z, power);
    }
  }

  mp.sendState();
}


function toTimeString(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function updateHUD() {
  if (scoreEl) scoreEl.textContent = `${scoreHome} : ${scoreAway}`;
  if (timerEl) timerEl.textContent = toTimeString(matchTime);
}

function resetKickoff() {
  ball.position.set(0, 0, ball.radius);
  ball.velocity.set(0, 0, 0);
  players[0].position.set(-2, 0, 0);
  players[1].position.set(2, 0, 0);
  players.forEach(p => p.velocity.set(0, 0, 0));
  updateHUD();
  updateCamera(true);
}

function checkGoals() {
  if (ball.position.x < -9.5 && Math.abs(ball.position.y) < 1.5 && ball.position.z < ball.radius * 2) {
    scoreAway++;
    resetKickoff();
  } else if (ball.position.x > 9.5 && Math.abs(ball.position.y) < 1.5 && ball.position.z < ball.radius * 2) {
    scoreHome++;
    resetKickoff();
  }
}

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;

  updatePlayerControls(dt);
  players.forEach(p => p.update(dt));
  ball.update(dt, players);
  updateCamera();
  checkGoals();
  matchTime += dt;
  updateHUD();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
// Replace the simple loop with enhanced version
// requestAnimationFrame(loop);

// ===== ENHANCED GAME LOOP WITH 2D INTEGRATION =====
function buildWorld(player) {
  return {
    ball: ball2D,
    teammates: player.color === teamHeim[0].color ? teamHeim : teamGast,
    opponents: player.color === teamHeim[0].color ? teamGast : teamHeim,
    coach: coach,
    opponentGoal: player.color === teamHeim[0].color ? { x: 1040, y: 340 } : { x: 10, y: 340 },
    phase: 'playing'
  };
}

function syncPositions() {
  // Sync 2D to 3D positions and track grass wear
  allPlayers.forEach(player2D => {
    if (player2D.player3D) {
      const oldPos3D = {
        x: player2D.player3D.mesh.position.x,
        z: player2D.player3D.mesh.position.z
      };
      const pos3D = convert2Dto3D(player2D.x, player2D.y);
      player2D.player3D.mesh.position.x = pos3D.x;
      player2D.player3D.mesh.position.z = pos3D.z;

      // Track grass wear based on player movement
      const moved = Math.hypot(pos3D.x - oldPos3D.x, pos3D.z - oldPos3D.z);
      if (moved > 0.1) { // Only track significant movement
        let activityType = 'walk';
        let intensity = 1.0;

        // Determine activity type based on player state and movement speed
        if (moved > 2.0) {
          activityType = 'run';
          intensity = 1.5;
        }

        if (player2D.currentAction === 'tackle') {
          activityType = 'tackle';
          intensity = 3.0;
        } else if (player2D.currentAction === 'slide') {
          activityType = 'slide';
          intensity = 4.0;
        } else if (player2D.currentAction === 'shoot') {
          activityType = 'shot';
          intensity = 2.0;
        }

        // Record the activity for grass wear
        pitch.recordPlayerActivity(pos3D.x, pos3D.z, activityType, intensity);
      }

      // Update player orientation
      if (player2D.bodyDirection !== undefined) {
        player2D.player3D.mesh.rotation.y = -player2D.bodyDirection * Math.PI / 180;
      }
    }
  });

  // Sync ball position
  if (ball2D && ball3D) {
    const ballPos3D = convert2Dto3D(ball2D.x, ball2D.y);
    ball3D.mesh.position.x = ballPos3D.x;
    ball3D.mesh.position.z = ballPos3D.z;
    ball3D.mesh.position.y = ball3D.radius; // Keep ball on ground
  }
}

function enhancedResetKickoff() {
  // Reset 2D positions
  ball2D.x = 525;
  ball2D.y = 340;
  ball2D.vx = 0;
  ball2D.vy = 0;
  ball2D.owner = null;
  ball2D.isLoose = true;

  // Reset 3D positions
  ball3D.mesh.position.set(0, ball3D.radius, 0);
  ball3D.velocity.set(0, 0, 0);

  updateCamera(true);
  logComment("Kickoff!");
}

function enhancedCheckGoals() {
  // Use 2D goal detection
  const leftGoal = ball2D.x <= 10 && ball2D.y >= 240 && ball2D.y <= 440;
  const rightGoal = ball2D.x >= 1040 && ball2D.y >= 240 && ball2D.y <= 440;

  if (leftGoal) {
    scoreGast++;
    if (gameStateManager) {
      gameStateManager.handleGoal({ scorer: { role: "Unknown", color: teamGast[0].color } });
    }
    enhancedResetKickoff();
  } else if (rightGoal) {
    scoreHeim++;
    if (gameStateManager) {
      gameStateManager.handleGoal({ scorer: { role: "Unknown", color: teamHeim[0].color } });
    }
    enhancedResetKickoff();
  }
}

// ===== ENHANCED MAIN GAME LOOP =====
let enhancedLast = performance.now();
function enhancedLoop(now) {
  const dt = Math.min((now - enhancedLast) / 1000, 1/30) * (window.gameSpeed || 1.0);
  enhancedLast = now;

  if (matchPaused) {
    renderer.render(scene, camera);
    requestAnimationFrame(enhancedLoop);
    return;
  }

  // Update grass shader with dynamic wear tracking
  pitch.update(dt, { x: 1, y: 0.5 }, 0.02);

  // Update 2D game systems
  if (gameStateManager) {
    gameStateManager.updateMatchTime(dt);
  }

  // Update all 2D players with AI (following 2D version pattern)
  allPlayers.forEach(player => {
    // Update injury and cooldown timers
    player.updateInjury(dt);

    if (player.ballCooldown > 0) {
      player.ballCooldown -= dt;
      if (player.ballCooldown <= 0) {
        player.ballCooldown = 0;
      }
    }
  });

  // 1. Perception phase
  allPlayers.forEach(player => {
    const poiGoal = teamHeim.includes(player) ? { x: 1040, y: 340, role: "opponentGoal" } : { x: 10, y: 340, role: "opponentGoal" };
    player.perceive([...allPlayers, ball2D, poiGoal, ...POIS]);
  });

  // 2. Decision/Behavior Tree phase
  allPlayers.forEach(player => {
    player.hasBall = ball2D.owner === player;
    const myTeam = teamHeim.includes(player) ? teamHeim : teamGast;
    const otherTeam = teamHeim.includes(player) ? teamGast : teamHeim;

    // Build complete world object matching what behavior trees expect
    const world = {
      // Core game objects
      ball: ball2D,
      players: allPlayers,
      teammates: myTeam,
      opponents: otherTeam,

      // Game systems
      referee: referee,
      coach: coach,
      tactic: coach?.tactic || null,

      // Game state
      phase: coach?.phase || 'playing',
      weather: weather,

      // Goals and field info
      opponentGoal: teamHeim.includes(player) ? { x: 1040, y: 340 } : { x: 10, y: 340 },
      ownGoal: teamHeim.includes(player) ? { x: 10, y: 340 } : { x: 1040, y: 340 },

      // Field bounds
      fieldBounds: FIELD_BOUNDS,

      // Points of interest
      pois: POIS
    };

    // Run behavior tree
    if (player.behaviorTree) {
      // Debug world object occasionally
      if (Math.random() < 0.001) {
        console.log('World object for behavior tree:', {
          hasBall: !!world.ball,
          ballOwner: world.ball?.owner?.role || 'none',
          teammates: world.teammates?.length || 0,
          opponents: world.opponents?.length || 0
        });
      }

      try {
        player.behaviorTree.tick(player, world);
      } catch (error) {
        console.error(`Behavior tree error for ${player.role}:`, error);
        console.log('World object:', world);
        console.log('Player object:', player);
      }
    }
  });

  // 3. Movement phase
  allPlayers.forEach(player => {
    const myTeam = teamHeim.includes(player) ? teamHeim : teamGast;
    const otherTeam = teamHeim.includes(player) ? teamGast : teamHeim;
    const world = {
      ball: ball2D,
      teammates: myTeam,
      opponents: otherTeam,
      referee: referee,
      coach: coach,
      phase: coach?.phase || 'playing'
    };
    player.moveToTarget(world);
  });

  // 4. Head movement phase
  allPlayers.forEach(player => {
    player.updateHead(ball2D, dt, {
      teammates: teamHeim.includes(player) ? teamHeim : teamGast,
      opponents: teamHeim.includes(player) ? teamGast : teamHeim,
    });
  });

  // Update 2D ball physics
  ball2D.update(dt, allPlayers, FIELD_BOUNDS, weather);

  // Update referee
  if (referee) {
    referee.update(allPlayers, ball2D, dt, gameStateManager?.matchTime || 0);
  }

  // Update player controls for selected player
  updatePlayerControls(dt);

  // Update 3D physics for all players
  allPlayers.forEach(player => {
    if (player.player3D) {
      player.player3D.update(dt);
    }
  });

  // Update 3D ball (pass 2D players for collision detection)
  ball3D.update(dt, allPlayers);

  // Sync positions between 2D and 3D
  syncPositions();

  // Update camera
  updateCamera();

  // Check for goals
  enhancedCheckGoals();

  // Update UI
  updateScoreboard();
  updateMatchInfo();

  // Render
  renderer.render(scene, camera);
  requestAnimationFrame(enhancedLoop);
}

// ===== WEAR TEST MODE SYSTEM =====
let wearTestMode = false;
let wearIntensity = 2.0;
let wearActivityType = 'tackle';
let lastWearTime = 0;

function initializeWearTestMode() {
  const wearTestCheckbox = document.getElementById('wearTestMode');
  const wearIntensitySlider = document.getElementById('wearIntensity');
  const wearIntensityValue = document.getElementById('wearIntensityValue');
  const wearActivitySelect = document.getElementById('wearActivityType');
  const resetWearButton = document.getElementById('resetWear');

  // Wear test mode toggle
  if (wearTestCheckbox) {
    wearTestCheckbox.addEventListener('change', (e) => {
      wearTestMode = e.target.checked;
      console.log('Wear test mode:', wearTestMode ? 'ENABLED' : 'DISABLED');

      const indicator = document.getElementById('wearTestIndicator');

      // Change cursor and show indicator when in test mode
      if (wearTestMode) {
        renderer.domElement.style.cursor = 'crosshair';
        if (indicator) indicator.classList.add('active');
      } else {
        renderer.domElement.style.cursor = 'default';
        if (indicator) indicator.classList.remove('active');
      }
    });
  }

  // Wear intensity slider
  if (wearIntensitySlider && wearIntensityValue) {
    wearIntensitySlider.addEventListener('input', (e) => {
      wearIntensity = parseFloat(e.target.value);
      wearIntensityValue.textContent = wearIntensity.toFixed(1);
    });
  }

  // Activity type selector
  if (wearActivitySelect) {
    wearActivitySelect.addEventListener('change', (e) => {
      wearActivityType = e.target.value;
      console.log('Wear activity type:', wearActivityType);
    });
  }

  // Reset wear button
  if (resetWearButton) {
    resetWearButton.addEventListener('click', () => {
      pitch.resetWear();
      console.log('All grass wear reset!');
    });
  }

  // Displacement strength control
  const displacementSlider = document.getElementById('displacementStrength');
  const displacementValue = document.getElementById('displacementValue');
  if (displacementSlider && displacementValue) {
    displacementSlider.addEventListener('input', (e) => {
      const strength = parseFloat(e.target.value);
      displacementValue.textContent = strength.toFixed(1);

      // Update the grass shader displacement strength
      if (pitch && pitch.grassShader && pitch.grassShader.material) {
        const oldValue = pitch.grassShader.material.uniforms.displacementStrength.value;
        pitch.grassShader.material.uniforms.displacementStrength.value = strength;
        console.log(`🏔️ DISPLACEMENT DEBUG: Strength changed from ${oldValue} to ${strength}`);
        console.log(`🏔️ DISPLACEMENT DEBUG: Material uniforms:`, {
          grassHeight: pitch.grassShader.material.uniforms.grassHeight.value,
          displacementStrength: pitch.grassShader.material.uniforms.displacementStrength.value,
          noiseScale: pitch.grassShader.material.uniforms.noiseScale.value
        });
      } else {
        console.error('🏔️ DISPLACEMENT DEBUG: Cannot update displacement - missing references:', {
          pitch: !!pitch,
          grassShader: !!(pitch && pitch.grassShader),
          material: !!(pitch && pitch.grassShader && pitch.grassShader.material)
        });
      }
    });
  }

  // Debug displacement button
  const debugButton = document.getElementById('debugDisplacement');
  if (debugButton) {
    debugButton.addEventListener('click', () => {
      console.log('🏔️ DISPLACEMENT DEBUG: Manual debug triggered');

      if (pitch && pitch.grassShader) {
        console.log('🏔️ DISPLACEMENT DEBUG: Grass shader state:');
        console.log(`🏔️ DISPLACEMENT DEBUG: - Field dimensions: ${pitch.grassShader.fieldWidth} x ${pitch.grassShader.fieldHeight}`);
        console.log(`🏔️ DISPLACEMENT DEBUG: - Wear resolution: ${pitch.grassShader.wearResolution}`);

        if (pitch.grassShader.material) {
          const uniforms = pitch.grassShader.material.uniforms;
          console.log('🏔️ DISPLACEMENT DEBUG: Material uniforms:');
          console.log(`🏔️ DISPLACEMENT DEBUG: - grassHeight: ${uniforms.grassHeight.value}`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - displacementStrength: ${uniforms.displacementStrength.value}`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - noiseScale: ${uniforms.noiseScale.value}`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - time: ${uniforms.time.value}`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - heightMap: ${uniforms.heightMap.value ? 'LOADED' : 'MISSING'}`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - wearMap: ${uniforms.wearMap.value ? 'LOADED' : 'MISSING'}`);
        }

        if (pitch.grassMesh) {
          console.log('🏔️ DISPLACEMENT DEBUG: Grass mesh:');
          console.log(`🏔️ DISPLACEMENT DEBUG: - Vertices: ${pitch.grassMesh.geometry.attributes.position.count}`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - Position: (${pitch.grassMesh.position.x}, ${pitch.grassMesh.position.y}, ${pitch.grassMesh.position.z})`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - Rotation: (${pitch.grassMesh.rotation.x}, ${pitch.grassMesh.rotation.y}, ${pitch.grassMesh.rotation.z})`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - Scale: (${pitch.grassMesh.scale.x}, ${pitch.grassMesh.scale.y}, ${pitch.grassMesh.scale.z})`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - Visible: ${pitch.grassMesh.visible}`);
          console.log(`🏔️ DISPLACEMENT DEBUG: - Material type: ${pitch.grassMesh.material.type}`);
        }
      } else {
        console.error('🏔️ DISPLACEMENT DEBUG: Pitch or grass shader not available');
      }
    });
  }

  // Displacement visualization button
  const visualizeButton = document.getElementById('visualizeDisplacement');
  let visualizationMode = false;
  if (visualizeButton) {
    visualizeButton.addEventListener('click', () => {
      visualizationMode = !visualizationMode;

      if (pitch && pitch.grassShader && pitch.grassShader.material) {
        // Toggle displacement visualization in fragment shader
        const fragmentShader = pitch.grassShader.fragmentShader;

        if (visualizationMode) {
          // Enable visualization mode
          const newFragmentShader = fragmentShader.replace(
            '// finalColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), vDebugHeight / 2.0);',
            'finalColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), vDebugHeight / 2.0);'
          );

          // Create new material with visualization
          const newMaterial = new THREE.ShaderMaterial({
            uniforms: pitch.grassShader.material.uniforms,
            vertexShader: pitch.grassShader.vertexShader,
            fragmentShader: newFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1
          });

          pitch.grassMesh.material = newMaterial;
          pitch.grassShader.material = newMaterial;
          visualizeButton.textContent = '🌱 Normal View';
          visualizeButton.style.background = '#4CAF50';
          console.log('🏔️ DISPLACEMENT DEBUG: Visualization mode ENABLED - Red=High, Blue=Low displacement');
        } else {
          // Disable visualization mode
          pitch.grassMesh.material = pitch.grassShader.createGrassMaterial();
          pitch.grassShader.material = pitch.grassMesh.material;
          visualizeButton.textContent = '🌈 Visualize Displacement';
          visualizeButton.style.background = '#FF9800';
          console.log('🏔️ DISPLACEMENT DEBUG: Visualization mode DISABLED - Normal grass view');
        }
      }
    });
  }

  // UV correction test button
  const uvTestButton = document.getElementById('testUVCorrection');
  let uvCorrectionMode = 0;
  const uvCorrections = [
    'vec2(1.0 - uv.x, uv.y)',           // 0: Flip X
    'vec2(uv.x, 1.0 - uv.y)',           // 1: Flip Y
    'vec2(1.0 - uv.x, 1.0 - uv.y)',     // 2: Flip both
    'vec2(uv.y, uv.x)',                 // 3: Swap XY
    'vec2(1.0 - uv.y, uv.x)',           // 4: 90° rotation
    'vec2(uv.y, 1.0 - uv.x)',           // 5: -90° rotation
    'vec2(1.0 - uv.y, 1.0 - uv.x)',     // 6: 180° rotation + swap
    'uv'                                 // 7: No correction
  ];

  if (uvTestButton) {
    uvTestButton.addEventListener('click', () => {
      uvCorrectionMode = (uvCorrectionMode + 1) % uvCorrections.length;

      if (pitch && pitch.grassShader) {
        // Update the vertex shader with new UV correction
        const newVertexShader = pitch.grassShader.vertexShader.replace(
          /correctedUV = vec2\([^;]+\);/,
          `correctedUV = ${uvCorrections[uvCorrectionMode]};`
        );

        // Create new material with updated shader
        const newMaterial = new THREE.ShaderMaterial({
          uniforms: pitch.grassShader.material.uniforms,
          vertexShader: newVertexShader,
          fragmentShader: pitch.grassShader.fragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: 0.1
        });

        pitch.grassMesh.material = newMaterial;
        pitch.grassShader.material = newMaterial;

        uvTestButton.textContent = `🔄 UV Mode ${uvCorrectionMode}`;
        console.log(`🔄 UV CORRECTION: Mode ${uvCorrectionMode} - ${uvCorrections[uvCorrectionMode]}`);
      }
    });
  }

  // Coordinate test button
  const coordTestButton = document.getElementById('testCoordinates');
  if (coordTestButton) {
    coordTestButton.addEventListener('click', () => {
      if (pitch && pitch.grassShader) {
        console.log('🎯 COORDINATE TEST: Creating wear at known positions...');

        // Test specific coordinates to verify mapping
        // Updated for new field dimensions: width=52.5 (goal to goal), height=34 (sideline to sideline)
        const testPoints = [
          { x: 0, z: 0, name: 'Center' },
          { x: 25, z: 0, name: 'Right Goal Area' },
          { x: -25, z: 0, name: 'Left Goal Area' },
          { x: 0, z: 15, name: 'Top Sideline' },
          { x: 0, z: -15, name: 'Bottom Sideline' },
          { x: 26, z: 16, name: 'Top Right Corner' },
          { x: -26, z: -16, name: 'Bottom Left Corner' }
        ];

        testPoints.forEach((point, index) => {
          setTimeout(() => {
            console.log(`🎯 COORDINATE TEST: Creating wear at ${point.name}: (${point.x}, ${point.z})`);
            pitch.recordPlayerActivity(point.x, point.z, 'tackle', 10);
          }, index * 500); // Stagger the points
        });
      }
    });
  }

  // Debug helpers toggle button
  const debugHelpersButton = document.getElementById('toggleDebugHelpers');
  if (debugHelpersButton) {
    debugHelpersButton.addEventListener('click', () => {
      if (pitch) {
        console.log('🔍 DEBUG: Attempting to toggle debug helpers...');
        console.log('🔍 DEBUG: Pitch object:', pitch);
        console.log('🔍 DEBUG: toggleDebugHelpers method exists:', typeof pitch.toggleDebugHelpers);

        if (typeof pitch.toggleDebugHelpers === 'function') {
          const isVisible = pitch.toggleDebugHelpers();
          debugHelpersButton.textContent = isVisible ? '🔍 Hide Debug Helpers' : '🔍 Show Debug Helpers';
          debugHelpersButton.style.background = isVisible ? '#4CAF50' : '#607D8B';
        } else {
          console.error('🔍 DEBUG: toggleDebugHelpers method not found on pitch object');
          console.log('🔍 DEBUG: Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(pitch)));
        }
      } else {
        console.error('🔍 DEBUG: Pitch object not available');
      }
    });
  }

  // Debug mode cycling button
  const debugModeButton = document.getElementById('cycleDebugMode');
  let debugMode = 0;
  const debugModes = [
    { name: 'Normal', shader: 'normal' },
    { name: 'Displacement', shader: 'finalColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), clamp(vDebugHeight / 1.5, 0.0, 1.0));' },
    { name: 'UV Coords', shader: 'finalColor = vec3(vDebugUV.x, vDebugUV.y, 0.5);' },
    { name: 'Wear Map', shader: 'finalColor = mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), vWear);' }
  ];

  if (debugModeButton) {
    debugModeButton.addEventListener('click', () => {
      debugMode = (debugMode + 1) % debugModes.length;
      const mode = debugModes[debugMode];

      if (pitch && pitch.grassShader) {
        if (mode.shader === 'normal') {
          // Reset to normal grass material
          pitch.grassMesh.material = pitch.grassShader.createGrassMaterial();
          pitch.grassShader.material = pitch.grassMesh.material;
        } else {
          // Create debug material with visualization
          const debugFragmentShader = pitch.grassShader.fragmentShader.replace(
            /\/\/ Add subtle color variation for realism/,
            `${mode.shader}\n        // Add subtle color variation for realism`
          );

          const debugMaterial = new THREE.ShaderMaterial({
            uniforms: pitch.grassShader.material.uniforms,
            vertexShader: pitch.grassShader.vertexShader,
            fragmentShader: debugFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1
          });

          pitch.grassMesh.material = debugMaterial;
          pitch.grassShader.material = debugMaterial;
        }

        debugModeButton.textContent = `🎨 Debug Mode: ${mode.name}`;
        console.log(`🎨 DEBUG MODE: Switched to ${mode.name}`);
      }
    });
  }

  // Displacement pattern test button
  const displacementTestButton = document.getElementById('testDisplacementPattern');
  if (displacementTestButton) {
    displacementTestButton.addEventListener('click', () => {
      console.log('🧪 DISPLACEMENT TEST: Creating test pattern from blue goal perspective...');
      console.log('🧪 DISPLACEMENT TEST: Your viewing angle: Behind blue goal toward midpoint');
      console.log('🧪 DISPLACEMENT TEST: Expected movement: Only height (Y-axis) changes');

      if (pitch && pitch.grassShader) {
        // Switch to displacement visualization mode
        const debugMode = 1; // Displacement mode
        const mode = {
          name: 'Displacement',
          shader: 'finalColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), clamp(vDebugHeight / 1.5, 0.0, 1.0));'
        };

        const debugFragmentShader = pitch.grassShader.fragmentShader.replace(
          /\/\/ Add subtle color variation for realism/,
          `${mode.shader}\n        // Add subtle color variation for realism`
        );

        const debugMaterial = new THREE.ShaderMaterial({
          uniforms: pitch.grassShader.material.uniforms,
          vertexShader: pitch.grassShader.vertexShader,
          fragmentShader: debugFragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
          alphaTest: 0.1
        });

        pitch.grassMesh.material = debugMaterial;
        pitch.grassShader.material = debugMaterial;

        console.log('🧪 DISPLACEMENT TEST: Switched to displacement visualization');
        console.log('🧪 DISPLACEMENT TEST: Blue = low height, Red = high height');
        console.log('🧪 DISPLACEMENT TEST: Now adjust displacement strength slider');
        console.log('🧪 DISPLACEMENT TEST: Colors should change but positions should NOT shift');
      }
    });
  }

  // Mouse move handler for wear test mode
  renderer.domElement.addEventListener('mousemove', handleWearTestMouseMove);
}

function handleWearTestMouseMove(event) {
  if (!wearTestMode) return;

  const currentTime = performance.now();
  if (currentTime - lastWearTime < 50) return; // Throttle to 20fps for performance
  lastWearTime = currentTime;

  // Get mouse position relative to canvas
  const rect = renderer.domElement.getBoundingClientRect();
  const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  // Use top-down raycasting instead of camera-based raycasting
  const fieldBounds = pitch.getBounds();
  const fieldWidth = fieldBounds.maxX - fieldBounds.minX;
  const fieldHeight = fieldBounds.maxZ - fieldBounds.minZ;

  // Convert normalized mouse coordinates (-1 to 1) to field coordinates
  // CORRECTED: Fix 90-degree misorientation
  // The field is now oriented with width (52.5) > height (34)
  // Mouse X should map to field Z (left-right movement on screen)
  // Mouse Y should map to field X (up-down movement on screen)
  const fieldX = fieldBounds.minX + (-mouseY + 1) * 0.5 * fieldWidth;  // Mouse Y -> Field X (inverted for screen coords)
  const fieldZ = fieldBounds.minZ + (mouseX + 1) * 0.5 * fieldHeight;  // Mouse X -> Field Z

  // Create top-down raycaster from high above the field
  const raycaster = new THREE.Raycaster();
  const rayOrigin = new THREE.Vector3(fieldX, 50, fieldZ); // High above the field
  const rayDirection = new THREE.Vector3(0, -1, 0); // Pointing straight down
  raycaster.set(rayOrigin, rayDirection);

  // Try to intersect with the grass mesh for precise positioning
  let intersectionPoint;
  if (pitch.grassMesh) {
    const intersects = raycaster.intersectObject(pitch.grassMesh);
    if (intersects.length > 0) {
      intersectionPoint = intersects[0].point;
    } else {
      // Fallback to calculated position
      intersectionPoint = new THREE.Vector3(fieldX, 0, fieldZ);
    }
  } else {
    intersectionPoint = new THREE.Vector3(fieldX, 0, fieldZ);
  }

  // Check if intersection is within field bounds
  if (intersectionPoint.x >= fieldBounds.minX && intersectionPoint.x <= fieldBounds.maxX &&
      intersectionPoint.z >= fieldBounds.minZ && intersectionPoint.z <= fieldBounds.maxZ) {

    // Record wear at the intersection point (top-down projection)
    console.log(`🎯 COORDINATE DEBUG: Mouse: (${mouseX.toFixed(2)}, ${mouseY.toFixed(2)}) -> Field: (${intersectionPoint.x.toFixed(2)}, ${intersectionPoint.z.toFixed(2)}) - Type: ${wearActivityType}, Intensity: ${wearIntensity}`);

    // Enhanced coordinate debugging with orientation info
    const fieldBounds = pitch.getBounds();
    console.log(`🎯 COORDINATE DEBUG: Field bounds: X[${fieldBounds.minX}, ${fieldBounds.maxX}] (goals), Z[${fieldBounds.minZ}, ${fieldBounds.maxZ}] (sidelines)`);
    console.log(`🎯 COORDINATE DEBUG: Field dimensions: ${fieldBounds.maxX - fieldBounds.minX} x ${fieldBounds.maxZ - fieldBounds.minZ} (width x height)`);
    console.log(`🎯 COORDINATE DEBUG: Mouse mapping - X:${mouseX.toFixed(2)}->Z:${intersectionPoint.z.toFixed(2)}, Y:${mouseY.toFixed(2)}->X:${intersectionPoint.x.toFixed(2)}`);
    pitch.recordPlayerActivity(
      intersectionPoint.x,
      intersectionPoint.z,
      wearActivityType,
      wearIntensity
    );
  }
}

// ===== INITIALIZATION =====
// Initialize UI
initializeUI();

// Initialize wear test mode
initializeWearTestMode();

// Set default selected player
selectedPlayer = teamHeim[0];

// Start the enhanced game loop
requestAnimationFrame(enhancedLoop);

console.log("3D Football Sim Enhanced - Ready!");
