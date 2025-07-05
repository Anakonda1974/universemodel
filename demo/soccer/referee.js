import { logComment } from './commentary.js';
import { isOffside, restartTypeForOut } from './rules.js';

export class Referee {
  constructor(onCardCallback, onFoulCallback, onOffsideCallback) {
    this.onCard = onCardCallback;
    this.onFoul = onFoulCallback;
    this.onOffside = onOffsideCallback;
  }

  update(players, ball) {
    for (const p of players) {
      if (p.currentAction === "tackle" && (!ball.owner || ball.owner !== p)) {
        for (const opp of players) {
          if (opp === p) continue;
          if (opp.color === p.color) continue;
          const dist = Math.hypot(p.x - opp.x, p.y - opp.y);
          if (dist < p.radius + opp.radius + 2) {
            this.callFoul(p, opp);
            break;
          }
        }
      }
    }
  }

  handlePass(passer, receiver, players) {
    if (isOffside(passer, receiver, players) && this.onOffside) {
      this.onOffside(receiver);
    }
  }

  checkRestart(ball, lastTouchTeam) {
    return restartTypeForOut(ball, lastTouchTeam);
  }

  callFoul(player, victim) {
    const chance = Math.random();
    const card = chance > 0.8 ? "red" : "yellow";
    if (this.onCard) this.onCard(player, card);
    if (Math.random() < 0.3) {
      victim.injured = true;
      victim.injuryRecovery = 30;
      logComment(`${victim.role} verletzt sich!`);
    }
    victim.highlightTimer = 1;
    if (this.onFoul) {
      this.onFoul(player, victim);
    }
  }
}
