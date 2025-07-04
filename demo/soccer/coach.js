export class Coach {
  constructor(players) {
    this.players = players;
    this.pressing = 1;
  }

  setPressing(level) {
    this.pressing = level;
    this.players.forEach(p => {
      p.mailbox.push({ from: 'coach', type: 'pressing', level });
    });
  }
}
