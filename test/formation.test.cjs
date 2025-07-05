const fs = require('fs');
const assert = require('assert');
const {
  loadFormations,
  DEFAULT_ROLE_CONFIG,
  getDynamicZone,
  spawnPlayers,
  mergeZones,
} = require('../dist/formation/index.js');

const json = fs.readFileSync('demo/soccer/formations.json', 'utf-8');
const formations = loadFormations(json);
assert(formations.length >= 13, 'expected at least 13 formations');
formations.forEach(f => assert.equal(f.players.length, 11));

for (const f of formations) {
  for (const p of f.players) {
    assert(p.role in DEFAULT_ROLE_CONFIG);
  }
}

const cfg = mergeZones(DEFAULT_ROLE_CONFIG, { ST: { width: 190 } });
assert.equal(cfg.ST.width, 190);

const world = { ball: { x: 500, y: 300 } };
const player = { formationX: 100, formationY: 200, role: 'ST', side: 'home' };
const zone = getDynamicZone(player, world);
assert.strictEqual(typeof zone.x, 'number');
assert.strictEqual(typeof zone.width, 'number');

const spawned = spawnPlayers(formations[0], 'home');
assert.equal(spawned.length, 11);
assert.equal(spawned[0].formationX, formations[0].players[0].x);

const zoneHome = getDynamicZone({ formationX: 100, formationY: 200, role: 'ST', side: 'home' }, world);
const zoneAway = getDynamicZone({ formationX: 100, formationY: 200, role: 'ST', side: 'away' }, world);
assert(zoneHome.x > zoneAway.x, 'away zone should mirror x-offset');

const zoneFallback = getDynamicZone(player, { ball: null });
const expected = player.formationX + DEFAULT_ROLE_CONFIG.ST.offsetX - DEFAULT_ROLE_CONFIG.ST.width / 2;
assert.equal(zoneFallback.x, expected);

const spawnedAway = spawnPlayers(formations[0], 'away');
assert.equal(spawnedAway[0].formationX, 1050 - formations[0].players[0].x);

console.log('tests passed');
