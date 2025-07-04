export class Coach {
  constructor(players) {
    this.players = players;
    this.pressing = 1;
    this.attackSide = null; // 'left' or 'right'
  }

  setPressing(level) {
    this.pressing = level;
    this.players.forEach(p => {
      p.mailbox.push({ from: 'coach', type: 'pressing', level });
    });
  }

  analyzeOpponents(ball, allies, opponents) {
    let left = 0, right = 0;
    for (const o of opponents) {
      if (o.x < ball.x) left++; else right++;
    }
    if (left < right) this.attackSide = 'left';
    else if (right < left) this.attackSide = 'right';
    else this.attackSide = null;
  }
}
