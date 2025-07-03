export function findNeighbors(target, planets, maxDistance) {
  const result = [];
  for (const p of planets) {
    if (!p.position || p.id === target.id) continue;
    const dx = p.position.x - target.position.x;
    const dy = p.position.y - target.position.y;
    const dz = p.position.z - target.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist <= maxDistance) result.push({ planet: p, distance: dist });
  }
  return result;
}

