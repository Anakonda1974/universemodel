export class Coach {
  constructor(players) {
    this.players = players;
    this.pressing = 1;
    this.attackSide = null; // 'left' or 'right'
    this.zoneSettings = {
      ST: { radius: 160 },
      LF: { radius: 150 },
      RF: { radius: 150 },
      OM: { radius: 130 },
      ZM: { radius: 130 },
      LM: { radius: 140 },
      RM: { radius: 140 },
      DM: { radius: 110 },
      IV: { radius: 90 },
      LIV: { radius: 90 },
      RIV: { radius: 90 },
      LV: { radius: 100 },
      RV: { radius: 100 },
      TW: { radius: 70 },
    };
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

  getZoneParameters(role) {
    const base = this.zoneSettings[role] || { radius: 120 };
    const factor = 1 / this.pressing;
    return { radius: base.radius * factor };
  }
}

