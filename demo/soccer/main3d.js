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
camera.position.set(0, -15, 10);
camera.lookAt(0, 0, 0);

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

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;

  updatePlayerControls(dt);
  players.forEach(p => p.update(dt));
  ball.update(dt);
  handleCollisions();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
