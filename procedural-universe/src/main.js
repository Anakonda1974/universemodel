// src/main.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { globalSeed, getGalaxies } from "./universe.js";
import { generateGalaxy } from "./galaxy.js";
import { generateSystem } from "./system.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 300);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Universe-Level: zeigen alle Galaxien
const galaxies = getGalaxies(globalSeed, 20);
galaxies.forEach((g, gi) => {
  const gal = generateGalaxy(gi, globalSeed, 500);
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(gal.stars.length * 3);
  const colors = new Float32Array(gal.stars.length * 3);

  gal.stars.forEach((s, i) => {
    positions[i*3] = s.x + g.position.x;
    positions[i*3+1] = s.y + g.position.y;
    positions[i*3+2] = s.z + g.position.z;
    colors[i*3] = s.color.r;
    colors[i*3+1] = s.color.g;
    colors[i*3+2] = s.color.b;
  });

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 0.5, vertexColors: true });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // Für jede Galaxie: zeige Systeme (max 5)
  const sys = generateSystem(g.seed, 0, 5);
  sys.planets.forEach(p => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.size * 0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: p.color })
    );
    mesh.position.set(p.position.x + g.position.x, p.position.y + g.position.y, p.position.z + g.position.z);
    scene.add(mesh);
  });
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

console.log("Init OK - Galaxien & Systeme sichtbar");
