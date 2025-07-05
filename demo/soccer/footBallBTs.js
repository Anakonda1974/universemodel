// footballBTs.js

import { Selector, Sequence, Condition, Action } from "./behaviorTree.js";
import { 
  playerIsClosestToBall, 
  canPass, 
  canShoot, 
  findBestPass 
} from "./decision-rules.js";

// Behavior Tree für einen Fußballspieler
export function createPlayerBT() {
  return new Selector(

    // 0. Erschöpft? → Ruhen in Formation
    new Sequence(
      new Condition((agent, world) => (agent.stamina ?? 1) < 0.3),
      new Action((agent, world) => {
        agent.targetX = agent.formationX;
        agent.targetY = agent.formationY;
        agent.currentAction = "rest";
      })
    ),

    // 1. Ballbesitz → Entscheidung: Schuss > Pass > Dribbling
    new Sequence(
      new Condition((agent, world) => agent.hasBall),
      new Selector(
        // 1.1 Kann schießen?
        new Sequence(
          new Condition(canShoot),
          new Action((agent, world) => {
            agent.targetX = world.opponentGoal.x;
            agent.targetY = world.opponentGoal.y;
            agent.currentAction = "shoot";
          })
        ),

        // 1.2 Kann passen?
        new Sequence(
          new Condition(canPass),
          new Action((agent, world) => {
            const mate = findBestPass(agent, world.teammates);
            if (mate) {
              agent.targetX = mate.x;
              agent.targetY = mate.y;
              agent.currentAction = "pass";
            }
          })
        ),

        // 1.3 Dribble als letzter Ausweg
        new Action((agent, world) => {
          const angleRad = agent.bodyDirection * Math.PI / 180;
          const speed = 12 + Math.random() * 10; // leicht variabel
          agent.targetX = agent.x + Math.cos(angleRad) * speed;
          agent.targetY = agent.y + Math.sin(angleRad) * speed;
          agent.currentAction = "dribble";
        })
      )
    ),

    // 2. Nächster am Ball? → Verfolge Ball
    new Sequence(
      new Condition(playerIsClosestToBall),
      new Action((agent, world) => {
        agent.targetX = world.ball.x;
        agent.targetY = world.ball.y;
        agent.currentAction = "chase";
      })
    ),

    // 3. Standardverhalten: Position halten
    new Action((agent, world) => {
      agent.targetX = agent.formationX;
      agent.targetY = agent.formationY;
      agent.currentAction = "hold";
    })
  );
}
