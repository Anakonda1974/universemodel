import * as THREE from 'https://unpkg.com/three@0.156.1/build/three.module.js';
import { Player3D } from './player3d.js';
import { Ball3D } from './ball3d.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraOffset = new THREE.Vector3(0, -15, 10);
camera.position.copy(cameraOffset);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// lighting
const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(5, -5, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// field
const fieldGeo = new THREE.PlaneGeometry(20, 13);
const fieldMat = new THREE.MeshStandardMaterial({ color: 0x065000 });
const field = new THREE.Mesh(fieldGeo, fieldMat);
field.rotation.x = -Math.PI/2;
field.receiveShadow = true;
scene.add(field);

const players = [
  new Player3D(0x0000ff, -2, 0),
  new Player3D(0xff0000, 2, 0)
];
players.forEach(p => { p.addTo(scene); });

const ball = new Ball3D(0, 0, 0.11);
ball.addTo(scene);

function updateCamera(snap = false) {
  const target = ball.position.clone().add(cameraOffset);
  if (snap) {
    camera.position.copy(target);
  } else {
    camera.position.lerp(target, 0.1);
  }
  camera.lookAt(ball.position);
}

// HUD elements
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
let scoreHome = 0;
let scoreAway = 0;
let matchTime = 0;

const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

function updatePlayerControls(dt) {
  const p = players[0];
  const acc = new THREE.Vector3();
  if (keys['KeyW']) acc.y += p.speed;
  if (keys['KeyS']) acc.y -= p.speed;
  if (keys['KeyA']) acc.x -= p.speed;
  if (keys['KeyD']) acc.x += p.speed;
  p.velocity.addScaledVector(acc, dt);

  if (keys['Space']) {
    const dir = ball.position.clone().sub(p.position);
    if (dir.length() < 1.5) {
      ball.kick(dir, 5);
    }
  }
}

function handleCollisions() {
  for (const p of players) {
    const dist = p.position.distanceTo(ball.position);
    const minDist = p.radius + ball.radius;
    if (dist < minDist) {
      const normal = ball.position.clone().sub(p.position).normalize();
      ball.position.copy(p.position).addScaledVector(normal, minDist);
      const rel = ball.velocity.clone().sub(p.velocity);
      const impact = rel.dot(normal);
      if (impact < 0) {
        ball.velocity.addScaledVector(normal, -impact * (1 + ball.restitution));
      }
    }
  }
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
  ball.update(dt);
  updateCamera();
  handleCollisions();
  checkGoals();
  matchTime += dt;
  updateHUD();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
