// footballBTs.js

import { Selector, Sequence, Condition, Action } from "./behaviorTree.js";
import {  playerIsClosestToBall, canPass, canShoot, findBestPass } from "./decision-rules.js";

// Beispiel: Decision-Tree für Feldspieler
export function createPlayerBT() {
  return new Selector(
    // 0. Bei niedriger Ausdauer: in Position bleiben und Energie sparen
    new Sequence(
      new Condition((a, w) => (a.stamina ?? 1) < 0.3),
      new Action((a, w) => {
        a.targetX = a.formationX;
        a.targetY = a.formationY;
        a.currentAction = "rest";
      })
    ),
    // 1. Ballbesitz? → Shoot/Pass/Dribble
    new Sequence(
      new Condition((agent, world) => agent.hasBall),
      new Selector(
        new Sequence(
          new Condition((agent, world) => canShoot(agent, world)),
          new Action((agent, world) => {
            // z. B. setze Ziel auf Tor, führe Schuss aus:
            agent.targetX = world.opponentGoal.x;
            agent.targetY = world.opponentGoal.y;
            agent.currentAction = "shoot";
          })
        ),
        new Sequence(
          new Condition((agent, world) => canPass(agent, world)),
          new Action((agent, world) => {
            let mate = findBestPass(agent, world.teammates);
            if (mate) {
              agent.targetX = mate.x;
              agent.targetY = mate.y;
              agent.currentAction = "pass";
            }
          })
        ),
        // Kein Pass/Schuss → Dribble
        new Action((agent, world) => {
          agent.targetX = agent.x + Math.cos(agent.bodyDirection * Math.PI / 180) * 22;
          agent.targetY = agent.y + Math.sin(agent.bodyDirection * Math.PI / 180) * 22;
          agent.currentAction = "dribble";
        })
      )
    ),
    // 2. Nächster am Ball? → Hingehen
    new Sequence(
      new Condition((agent, world) => playerIsClosestToBall(agent, world)),
      new Action((agent, world) => {
        agent.targetX = world.ball.x;
        agent.targetY = world.ball.y;
        agent.currentAction = "chase";
      })
    ),
    // 3. Standard-Rollenverhalten (Formation halten, Markieren…)
    new Action((agent, world) => {
      agent.targetX = agent.formationX;
      agent.targetY = agent.formationY;
      agent.currentAction = "hold";
    })
  );
}

// --- Helper-Funktionen wie gehabt ---
// canShoot, canPass, findBestPass, playerIsClosestToBall
// Du kannst sie aus deinen bisherigen Decision-Rules übernehmen!
