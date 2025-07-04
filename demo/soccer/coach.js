export class Coach {
  constructor(players) {
    this.players = players;
    this.pressing = 1;
    this.attackSide = null; // 'left' or 'right'
    this.zoneSettings = {
      ST: { rx: 160, ry: 120 },
      LF: { rx: 150, ry: 110 },
      RF: { rx: 150, ry: 110 },
      OM: { rx: 130, ry: 110 },
      ZM: { rx: 130, ry: 110 },
      LM: { rx: 140, ry: 120 },
      RM: { rx: 140, ry: 120 },
      DM: { rx: 110, ry: 100 },
      IV: { rx: 90, ry: 80 },
      LIV: { rx: 90, ry: 80 },
      RIV: { rx: 90, ry: 80 },
      LV: { rx: 100, ry: 90 },
      RV: { rx: 100, ry: 90 },
      TW: { rx: 70, ry: 60 },
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
    const base = this.zoneSettings[role] || { rx: 120, ry: 100 };
    const factor = 1 / this.pressing;
    return { rx: base.rx * factor, ry: base.ry * factor };
  }
}

