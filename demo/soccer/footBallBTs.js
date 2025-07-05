// footBallBTs_refactor.js – v3 ✔ Spacing & Pass-Fix

import { Selector, Sequence, Condition, Action } from "./behaviorTree.js";
import {
  playerIsClosestToBall,
  canShoot,
  findBestPass,
  getDynamicZone
} from "./decision-rules.js";
import { getTargetZoneCenter } from "./TacticsHelper.js";
import { avoidTeammateClumping } from "./decision-rules.js";

/** Position strikt an Grundordnung */
function holdFormation(agent) {
  agent.targetX = agent.formationX;
  agent.targetY = agent.formationY;
  agent.currentAction = "holdFormation";
}

/** Ziel in Zone einklemmen (mit Spielraum) */
function clampIntoZone(agent, world, tol = 0) {
  const z = getDynamicZone(agent, world);
  agent.targetX = Math.max(z.x - tol, Math.min(z.x + z.width + tol, agent.targetX));
  agent.targetY = Math.max(z.y - tol, Math.min(z.y + z.height + tol, agent.targetY));
}

/** Nach Entscheidungs-Tick Abstand zu Mitspielern erzwingen */
function spreadOut(agent, teammates) {
  avoidTeammateClumping(agent, teammates, 24); // größerer Mindestabstand
}

export function createPlayerBT() {
  return new Selector(
    // 0) Ausgepowert → Formation halten
    new Sequence(
      new Condition((a) => (a.stamina ?? 1) < 0.25),
      new Action((a) => holdFormation(a))
    ),

    // 1) Ballbesitz – Schuss > Pass > Dribble
    new Sequence(
      new Condition((a) => a.hasBall),
      new Selector(
        // 1.1 Schuss
        new Sequence(
          new Condition(canShoot),
          new Action((a, w) => {
            a.targetX = w.opponentGoal.x;
            a.targetY = w.opponentGoal.y;
            a.currentAction = "shoot";
            clampIntoZone(a, w, 25);
          })
        ),
        // 1.2 Pass (keine isLoose-Abhängigkeit mehr)
        new Action((a, w) => {
          const mate = findBestPass(a, w.teammates, w);
          if (mate) {
            a.targetX = mate.x;
            a.targetY = mate.y;
            a.currentAction = "pass";
          } else {
            // Kein guter Abnehmer → Formation wahren
            holdFormation(a);
          }
        }),
        // 1.3 Dribbling in Zone
        new Action((a, w) => {
          const c = getTargetZoneCenter(a, w.ball, a.pressing ?? 1);
          const ang = Math.atan2(w.opponentGoal.y - c.y, w.opponentGoal.x - c.x);
          a.targetX = a.x + Math.cos(ang) * 18;
          a.targetY = a.y + Math.sin(ang) * 18;
          a.currentAction = "dribble";
          clampIntoZone(a, w);
        })
      )
    ),

    // 2) Nächster am freien Ball → Chase (Zone ignorieren)
    new Sequence(
      new Condition(playerIsClosestToBall),
      new Action((a, w) => {
        a.targetX = w.ball.x;
        a.targetY = w.ball.y;
        a.currentAction = "chase";
      })
    ),

    // 3) Defensive Phase – Press oder Formation
    new Sequence(
      new Condition((a, w) => w.ball.owner && w.opponents.includes(w.ball.owner)),
      new Action((a, w) => {
        const h = w.ball.owner;
        const d = Math.hypot(a.x - h.x, a.y - h.y);
        if (d < 40) {
          a.targetX = h.x;
          a.targetY = h.y;
          a.currentAction = "press";
        } else {
          holdFormation(a);
        }
      })
    ),

    // 4) Standard – Zone halten + Spread
    new Action((a, w) => {
      holdFormation(a);
      spreadOut(a, w.teammates);
    })
  );
}
