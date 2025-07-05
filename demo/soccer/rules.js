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
