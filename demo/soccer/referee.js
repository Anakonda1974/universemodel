export class Referee {
  constructor(onCardCallback) {
    this.onCard = onCardCallback;
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

  callFoul(player, victim) {
    const chance = Math.random();
    const card = chance > 0.8 ? "red" : "yellow";
    if (this.onCard) this.onCard(player, card);
  }
}
