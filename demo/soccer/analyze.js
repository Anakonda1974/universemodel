
export function analyzePlayerPerformance(player) {
  const usedStamina = (player.startStamina - (player.endStamina ?? player.stamina)).toFixed(2);
  const readiness = (usedStamina * 100).toFixed(1);
  const distance = player.totalDistance.toFixed(1);
  return {
    role: player.role,
    preferredFoot: player.preferredFoot,
    fluidity: player.fluidity.toFixed(2),
    distance: distance + " px",
    usedStamina,
    readinessScore: readiness + " %",
    heatmapPoints: player.heatmap.length
  };
}

export function evaluateFootUse(player) {
  const total = player.heatmap.length || 1;
  const wrongFootCount = player.heatmap.filter(p => p.dribbleSide !== player.preferredFoot).length;
  const wrongFootRate = (wrongFootCount / total).toFixed(2);
  const score = ((1 - wrongFootRate) * player.fluidity).toFixed(2);
  return {
    wrongFootRate,
    footUsageScore: score
  };
}