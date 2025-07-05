export function secondLastDefenderX(players, attackingSide) {
  const defenders = players.filter(p => p.side !== attackingSide);
  const xs = defenders.map(p => p.x).sort((a, b) => a - b);
  if (xs.length < 2) {
    return attackingSide === 'home' ? 1035 : 15;
  }
  return attackingSide === 'home' ? xs[xs.length - 2] : xs[1];
}

export function isOffside(passer, receiver, players) {
  if (!receiver || receiver.side !== passer.side) return false;
  const line = secondLastDefenderX(players, passer.side);
  if (passer.side === 'home') {
    return receiver.x > line && receiver.x > passer.x && receiver.x > 525;
  }
  return receiver.x < line && receiver.x < passer.x && receiver.x < 525;
}

export function restartTypeForOut(ball, lastTouchTeam) {
  if (!ball.outOfBounds) return null;
  if (ball.outOfBounds === 'top' || ball.outOfBounds === 'bottom') {
    return { type: 'throwIn', side: ball.outOfBounds };
  }
  const side = ball.outOfBounds;
  if (lastTouchTeam === (side === 'left' ? 0 : 1)) {
    return { type: 'corner', side };
  }
  return { type: 'goalKick', side };
}

export const PENALTY_BOX = {
  home: { x1: 15, x2: 165, y1: 215, y2: 465 },
  away: { x1: 885, x2: 1035, y1: 215, y2: 465 },
};

export function inPenaltyBox(x, y, defendingSide) {
  const box = defendingSide === 'home' ? PENALTY_BOX.home : PENALTY_BOX.away;
  return x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2;
}

export function restartTypeForFoul(victim, fouler) {
  const defendingSide = victim.side;
  if (inPenaltyBox(victim.x, victim.y, defendingSide)) {
    return { type: 'penalty', side: defendingSide };
  }
  return { type: 'freeKick', side: defendingSide };
}
