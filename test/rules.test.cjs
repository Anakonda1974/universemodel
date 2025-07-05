const assert = require('assert');
const { inPenaltyBox, restartTypeForFoul, PENALTY_BOX } = require('../demo/soccer/rules.js');

assert(inPenaltyBox(PENALTY_BOX.home.x1 + 10, 340, 'home'));
assert(!inPenaltyBox(PENALTY_BOX.home.x2 + 10, 340, 'home'));

const victim = { x: 20, y: 340, side: 'home' };
const fouler = { x: 25, y: 340, side: 'away' };
const restart = restartTypeForFoul(victim, fouler);
assert.equal(restart.type, 'penalty');
assert.equal(restart.side, 'home');

console.log('rules tests passed');
