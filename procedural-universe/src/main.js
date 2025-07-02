import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { globalSeed, getGalaxies } from './universe.js';

const galaxies = getGalaxies(globalSeed, 50);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 100;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(galaxies.length * 3);
for (let i = 0; i < galaxies.length; i++) {
  const p = galaxies[i].position;
  positions[i * 3] = p.x;
  positions[i * 3 + 1] = p.y;
  positions[i * 3 + 2] = p.z;
}
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
const points = new THREE.Points(geometry, material);
scene.add(points);

let zoomLevel = 0;
export function updateZoom(level) {
  zoomLevel = level;
  switch (level) {
    case 0:
      break; // Universe
    case 1:
      break; // Galaxy
    case 2:
      break; // System
    case 3:
      break; // Planet
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

console.log('Init OK');
