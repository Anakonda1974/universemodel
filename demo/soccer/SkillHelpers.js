// Helper functions for skill-based weighting
// Provides reusable calculations for decision rules

export function shouldAttemptRiskyPass(player) {
  const base = 0.2; // 20% base chance
  const acc = player.derived?.passingAccuracy ?? 0.5;
  return Math.random() < base + acc * 0.5;
}

export function computeShootRadius(player) {
  const acc = player.derived?.shootingAccuracy ?? 0.5;
  return 60 + acc * 40; // 60-100px depending on skill
}

export function staminaOK(player, threshold = 0.3) {
  return (player.stamina ?? 1) > threshold;
}

