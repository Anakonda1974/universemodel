// decision-rules.js
import { FIELD_BOUNDS } from './ball.js';
import { interpolate, computeEllipseRadii } from './TacticsHelper.js';
import { computeShootRadius, shouldAttemptRiskyPass, staminaOK } from './SkillHelpers.js';

export function canPass(player, world) {
    if (!world.ball || world.ball.isLoose) return false;
    if (player.hasBall || (world.ball.owner && world.ball.owner === player)) {
        // Check if there are open teammates to pass to
        let openTeammates = world.teammates.filter(mate => {
            if (mate === player) return false; // Can't pass to self
            let d = Math.hypot(player.x - mate.x, player.y - mate.y);
            if (d < 35 || d > 320) return false; // Too close or too far
            return true;
        });
        return openTeammates.length > 0;
    }
    return false;
}

export function canShoot(player, world) {
    if (!world.ball || world.ball.isLoose) return false;
    if (player.hasBall || (world.ball.owner && world.ball.owner === player)) {
        let dx = world.opponentGoal.x - player.x;
        let dy = world.opponentGoal.y - player.y;
        let dist = Math.hypot(dx, dy);
        return dist < computeShootRadius(player);
    }
    return false;
}





function playerIsClosestToBall(player, world) {
  // Defensive programming - check if world and world.ball exist
  if (!world) {
    console.error('playerIsClosestToBall: world is undefined');
    return false;
  }
  if (!world.ball) {
    console.error('playerIsClosestToBall: world.ball is undefined');
    return false;
  }
  if (!world.ball.isLoose) return false;
  let d = Math.hypot(player.x - world.ball.x, player.y - world.ball.y);
    let closest = true;
    for (let p of world.players) {
        if (p === player) continue;
        let d2 = Math.hypot(p.x - world.ball.x, p.y - world.ball.y);
        if (d2 < d) {
            closest = false;
            break;
        }
    }
    return closest;
    }
  
  export { playerIsClosestToBall };


// ---- Tactical Zone Definition ----
function getAllowedZone(player, world) {
  let marginX = 20, marginY = 15;
  let width = 160, height = 180;
  switch (player.role) {
    case "TW": width = 80; height = 140; break;
    case "IV": case "LIV": case "RIV": width = 110; height = 190; break;
    case "LV": case "RV": width = 135; height = 220; break;
    case "DM": width = 170; height = 210; break;
    case "ZM": case "OM": width = 270; height = 220; break;
    case "LM": case "RM": width = 250; height = 270; break;
    case "LF": case "RF": width = 320; height = 210; break;
    case "ST": width = 320; height = 230; break;
    default: width = 170; height = 200; break;
  }
  // Widen each role's zone to ensure the team collectively covers its half
  width += 200;
  height += 80;

  // --- Defensive PUSH: If ball is in our half, push formation up ---
  let push = 0;
  if (world && world.ball) {
    const defendingLeft = player.formationX < 525;
    if (["IV", "LIV", "RIV", "LV", "RV"].includes(player.role)) {
      if (defendingLeft && world.ball.x > 350) push = 32;
      if (!defendingLeft && world.ball.x < 700) push = -32;
    }
  }
  let formationX = player.formationX + push;
  const minX = Math.max(marginX, formationX - width / 2);
  const maxX = Math.min(1050 - marginX, formationX + width / 2);
  const minY = Math.max(marginY, player.formationY - height / 2);
  const maxY = Math.min(680 - marginY, player.formationY + height / 2);

  return { minX, maxX, minY, maxY };
}
function clampToZone(x, y, zone) {
  return {
    x: Math.max(zone.minX, Math.min(zone.maxX, x)),
    y: Math.max(zone.minY, Math.min(zone.maxY, y)),
  };
}

// --- New dynamic allowed zone relative to the ball ---
export function getDynamicZone(player, world) {
  const { ball, tactic, coach, teammates } = world;
  const awareness = player.derived?.awareness ?? 0.5;
  const press = coach ? coach.pressing : player.pressing ?? 1;
  const baseCenter = { x: player.formationX, y: player.formationY };
  const ballPos = ball ? { x: ball.x, y: ball.y } : baseCenter;
  const interp = 0.1 + 0.1 * awareness;
  const c = interpolate(baseCenter, ballPos, interp);
  let centerX = c.x;
  let centerY = c.y;

  // Determine if player is on home team (blue) or away team (red)
  // Home team defends left side (x < 525), away team defends right side (x > 525)
  const isHomeTeam = player.formationX < 525;

  let zoneWidth = 200;
  let zoneHeight = 200;
  let offsetX = 0;
  let offsetY = 0;

  switch (player.role) {
    case "TW":
      zoneWidth = 100; zoneHeight = 150;
      offsetX = isHomeTeam ? -300 : 300;  // Home defends left, away defends right
      break;
    case "IV": case "LIV": case "RIV":
      zoneWidth = 140; zoneHeight = 200;
      offsetX = isHomeTeam ? -150 : 150;  // Home defends left, away defends right
      break;
    case "DM":
      zoneWidth = 180; zoneHeight = 240;
      offsetX = isHomeTeam ? -80 : 80;    // Home defends left, away defends right
      break;
    case "ZM": case "OM":
      zoneWidth = 250; zoneHeight = 250;
      offsetX = 0;
      break;
    case "LM": case "RM":
      zoneWidth = 200; zoneHeight = 300;
      offsetY = (player.role === "LM" ? -150 : 150);
      break;
    case "LF": case "RF":
      zoneWidth = 200; zoneHeight = 180;
      offsetX = isHomeTeam ? 100 : -100;  // Home attacks right, away attacks left
      offsetY = (player.role === "LF" ? -80 : 80);
      break;
    case "ST":
      zoneWidth = 180; zoneHeight = 150;
      offsetX = isHomeTeam ? 160 : -160;  // Home attacks right, away attacks left
      break;
  }

  // adjust width/height and offsets by tactical state / pressing
  if (tactic === 'pressing') {
    zoneWidth *= 1 / press;
    zoneHeight *= 1 / press;
    offsetX *= press;
    offsetY *= press;
  } else if (tactic === 'zurückgezogen') {
    zoneWidth *= 1.2;
    zoneHeight *= 1.2;
    offsetX *= 0.6;
    offsetY *= 0.6;
  }


  // modify by team phase
  if (world.phase === 'offense') {
    zoneWidth *= 1.1;
    offsetX += isHomeTeam ? 20 : -20;  // Home pushes right when attacking, away pushes left
  } else if (world.phase === 'defense') {
    zoneWidth *= 0.9;
    offsetX += isHomeTeam ? -20 : 20;  // Home pulls back left when defending, away pulls back right
  }

  const zoneParams = coach ? coach.getZoneParameters(player.role) : null;
  const radii = computeEllipseRadii(player.role, press, zoneParams);
  if ((player.derived?.dribblingSkill ?? 0) > 0.7) radii.rx *= 1.2;
  zoneWidth = radii.rx * 2;
  zoneHeight = radii.ry * 2;

  let x = centerX + offsetX - zoneWidth / 2;
  let y = centerY + offsetY - zoneHeight / 2;
  x = Math.max(FIELD_BOUNDS.minX, Math.min(FIELD_BOUNDS.maxX - zoneWidth, x));
  y = Math.max(FIELD_BOUNDS.minY, Math.min(FIELD_BOUNDS.maxY - zoneHeight, y));

  // Debug zone calculation occasionally
  if (Math.random() < 0.001) {
   // console.log(`Zone for ${isHomeTeam ? 'HOME' : 'AWAY'} ${player.role}: formationX=${player.formationX.toFixed(0)}, centerX=${centerX.toFixed(0)}, offsetX=${offsetX}, zone.x=${x.toFixed(0)}-${(x + zoneWidth).toFixed(0)}`);
  }

  return {
    x,
    y,
    width: zoneWidth,
    height: zoneHeight,
    minX: x,
    maxX: x + zoneWidth,
    minY: y,
    maxY: y + zoneHeight
  };
}



export function decidePlayerAction(player, world, gameState) {
  if (gameState !== "Spiel läuft") return;

  if (!staminaOK(player)) {
    return boundedIntent(player, "rest", player.formationX, player.formationY, world);
  }

  // --- 1. Ballbesitz/Offense ---
  if (player.hasBall || (world.ball.owner && world.ball.owner === player)) {
    return decideBallOwnerAction(player, world);
  }

  // --- 0. If ball is loose, nearest player should chase! ---
  if (world.ball.isLoose && !player.hasBall) {
    let minDist = Infinity, closest = null;
    for (let p of world.players) {
      let d = Math.hypot(p.x - world.ball.x, p.y - world.ball.y);
      if (d < minDist) { minDist = d; closest = p; }
    }
    if (closest === player) {
      return boundedIntent(player, "chase", world.ball.x, world.ball.y, world, true);
    }
  }

  // --- 2. Defensive: Press, Tackle, and Swarm the Ball Holder! ---
  if (world.ball.owner && world.opponents.includes(world.ball.owner)) {
    const ballHolder = world.ball.owner;
    const dist = Math.hypot(player.x - ballHolder.x, player.y - ballHolder.y);

    // If defender is "touching distance" (i.e. within 18px): Tackle
    if (dist < 18) {
      return boundedIntent(player, "tackle", ballHolder.x, ballHolder.y, world, true);
    }

    // If within "swarm/press" radius (up to 40px): press (not just closest!)
    if (dist < 40) {
      return boundedIntent(player, "press", ballHolder.x, ballHolder.y, world, true);
    }

    // (Optional) The closest "DM/IV/LV/RV" defender can be even more aggressive:
    const defenders = world.teammates.filter(t => ["IV","LIV","RIV","LV","RV","DM"].includes(t.role));
    let minDist = Infinity, closest = null;
    for (const d of defenders) {
      let dDist = Math.hypot(d.x - ballHolder.x, d.y - ballHolder.y);
      if (dDist < minDist) { minDist = dDist; closest = d; }
    }
    if (closest === player && dist < 70) {
      // Closest central defender: always closes down!
      return boundedIntent(player, "close_down", ballHolder.x, ballHolder.y, world, true);
    }

    // If within "intercept" radius (up to 130px): try to cut off lane to goal
    const goal = world.opponentGoal;
    if (dist < 130) {
      const px = 0.68 * ballHolder.x + 0.32 * goal.x;
      const py = 0.68 * ballHolder.y + 0.32 * goal.y;
      return boundedIntent(player, "press", px, py, world, true);
    }
    // Not in range: cover formation
  }

  // --- 3. Marking: Stay near nearest attacking threat ---
  if (["IV", "LIV", "RIV", "LV", "RV", "DM"].includes(player.role)) {
    const threat = findNearestOpponent(player, world.opponents, ["ST", "LF", "RF", "OM", "ZM"]);
    if (threat && Math.hypot(player.x - threat.x, player.y - threat.y) < 110) {
      return boundedIntent(player, "mark", threat.x, threat.y, world);
    }
  }

  // --- 4. Midfielders & Forwards: Get Open / Offer Pass / Break Lines ---
  if (["ZM", "OM", "LM", "RM"].includes(player.role)) {
    const open = findOpenSpaceNearGoal(player, world);
    return boundedIntent(player, "offer", open.x, open.y, world);
  }
  if (["LF", "RF", "ST"].includes(player.role)) {
    const lastLine = findLastLineSpace(player, world);
    return boundedIntent(player, "break", lastLine.x, lastLine.y, world);
  }

  // --- 5. Default: Hold tactical formation spot ---
  return boundedIntent(player, "hold", player.formationX, player.formationY, world);
}


// ---- Enhanced Ball Owner Behavior ----
function decideBallOwnerAction(player, world) {
  const playerIntelligence = player.derived?.awareness || player.base?.intelligence || 0.5;
  const playerVision = player.derived?.vision || player.base?.vision || 0.5;
  const goalDistance = Math.hypot(player.x - world.opponentGoal.x, player.y - world.opponentGoal.y);

  // 1. Evaluate shooting opportunity
  const shootingOpportunity = evaluateShootingOpportunity(player, world, world.opponentGoal);
  const shootingThreshold = 0.4 + playerIntelligence * 0.3; // Smarter players shoot when better opportunities

  if (canShoot(player, world) && shootingOpportunity > shootingThreshold) {
    return boundedIntent(player, "shoot", world.opponentGoal.x, world.opponentGoal.y, world);
  }

  // 2. Evaluate passing opportunities
  const bestPass = findBestPass(player, world.teammates, world);
  const currentPressure = evaluatePlayerPressure(player, world);

  // Decision matrix based on intelligence and situation
  const passThreshold = Math.max(0.2, 0.6 - playerIntelligence * 0.4 - currentPressure * 0.3);

  if (bestPass) {
    let passScore = evaluatePassOpportunity(player, bestPass, world, world.opponentGoal, playerVision, playerIntelligence);

    // Enhanced coordination bonuses + TIKI-TAKA elements
    if (player.pendingPassTarget === bestPass) {
      passScore += 30; // Bonus for requested passes
      console.log(`📞 PASS REQUEST: Bonus for ${bestPass.role} request`);
    }

    if (player.availableSupport && player.availableSupport.player === bestPass) {
      passScore += 20; // Bonus for support positions
      console.log(`🤝 SUPPORT: Bonus for ${bestPass.role} support`);
    }

    if (bestPass.currentAction === 'overlap') {
      passScore += 35; // High bonus for overlapping runs
      console.log(`🏃‍♂️ OVERLAP: Bonus for ${bestPass.role} overlap`);
    }

    // TIKI-TAKA BONUSES
    const tikitakaBonus = calculateTikiTakaBonus(player, bestPass, world);
    passScore += tikitakaBonus;

    if (tikitakaBonus > 0) {
      console.log(`⚽ TIKI-TAKA: +${tikitakaBonus.toFixed(1)} bonus for ${bestPass.role}`);
    }

    // Check for overlap timing
    if (player.overlapTiming && performance.now() >= player.overlapTiming - 500) {
      if (player.overlapRunner === bestPass) {
        passScore += 50; // Very high bonus for timed overlaps
        console.log(`⏰ TIMED OVERLAP: Executing timed pass to ${bestPass.role}`);
      }
    }

    // Intelligent players make better passing decisions with coordination
    const enhancedThreshold = passThreshold * 100 * 0.8; // Lower threshold for coordinated play
    if (passScore > enhancedThreshold || currentPressure > 0.7) {
      // Execute coordinated pass
      const result = boundedIntent(player, "pass", bestPass.x, bestPass.y, world);

      // Clear coordination states after pass
      if (player.pendingPassTarget === bestPass) {
        player.pendingPassTarget = null;
        console.log(`✅ PASS REQUEST: Fulfilled request from ${bestPass.role}`);
      }

      if (player.overlapTiming && player.overlapRunner === bestPass) {
        player.overlapTiming = null;
        player.overlapRunner = null;
        console.log(`✅ OVERLAP: Completed timed overlap pass`);
      }

      return result;
    }
  }

  // No good pass available - consider coordination actions
  if (Math.random() < 0.15) { // 15% chance for coordination actions
    const teammates = world.teammates.filter(t => t !== player);

    if (teammates.length > 0) {
      const nearbyTeammates = teammates.filter(t =>
        Math.hypot(player.x - t.x, player.y - t.y) < 50
      );

      if (nearbyTeammates.length > 0) {
        const teammate = nearbyTeammates[Math.floor(Math.random() * nearbyTeammates.length)];

        // Randomly choose coordination action
        const actions = ['createSpace', 'supportBallCarrier', 'requestPass'];
        const action = actions[Math.floor(Math.random() * actions.length)];

        switch (action) {
          case 'createSpace':
            Capabilities.createSpace(player, world, teammate);
            console.log(`🏃 COORDINATION: ${player.role} creating space for ${teammate.role}`);
            break;
          case 'supportBallCarrier':
            if (world.ball?.owner && world.teammates.includes(world.ball.owner)) {
              Capabilities.supportBallCarrier(player, world);
              console.log(`🤝 COORDINATION: ${player.role} supporting ball carrier`);
            }
            break;
          case 'requestPass':
            if (world.ball?.owner && world.teammates.includes(world.ball.owner)) {
              Capabilities.requestPass(player, world);
              console.log(`📞 COORDINATION: ${player.role} requesting pass`);
            }
            break;
        }
      }
    }
  }

  // 3. Dribble toward goal if no good passing options
  const open = findOpenSpaceNearGoal(player, world);
  return boundedIntent(player, "dribble", open.x, open.y, world);
}

// Evaluate how much pressure the player is under
function evaluatePlayerPressure(player, world) {
  let pressure = 0;
  const pressureRadius = 80;

  world.opponents.forEach(opp => {
    const distance = Math.hypot(player.x - opp.x, player.y - opp.y);
    if (distance < pressureRadius) {
      pressure += Math.max(0, 1 - distance / pressureRadius);
    }
  });

  return Math.min(1, pressure);
}

// ---- Intent Resolver (bounds action to zone) ----
function boundedIntent(player, intent, tx, ty, world, allowOutside = false) {
  const zone = getDynamicZone(player, world);
  let target = allowOutside ? { x: tx, y: ty } : clampToZone(tx, ty, zone);
  target.x = Math.max(FIELD_BOUNDS.minX, Math.min(FIELD_BOUNDS.maxX, target.x));
  target.y = Math.max(FIELD_BOUNDS.minY, Math.min(FIELD_BOUNDS.maxY, target.y));
  player.targetX = target.x;
  player.targetY = target.y;
  player.currentAction = intent;
  avoidTeammateClumping(player, world.teammates, 18);
  return { type: intent, targetX: target.x, targetY: target.y };
}

// ---- Enhanced Passing Intelligence: Goal-oriented and opportunity-aware ----
export function findBestPass(player, teammates, world) {
  let bestScore = -Infinity, best = null;
  const goal = world.opponentGoal;
  const playerVision = player.derived?.vision || player.base?.vision || 0.5;
  const playerIntelligence = player.derived?.awareness || player.base?.intelligence || 0.5;

  teammates.forEach(mate => {
    if (mate === player) return;
    const distance = Math.hypot(player.x - mate.x, player.y - mate.y);

    // Basic distance filter
    if (distance < 35 || distance > 320) return;

    // Calculate comprehensive pass score
    const passScore = evaluatePassOpportunity(player, mate, world, goal, playerVision, playerIntelligence);

    if (passScore > bestScore) {
      bestScore = passScore;
      best = mate;
    }
  });

  // Debug occasionally
  if (best && Math.random() < 0.01) {
    console.log(`Best pass: ${player.role} -> ${best.role}, score=${bestScore.toFixed(2)}`);
  }

  return best;
}

// Enhanced pass evaluation with realistic factors
function evaluatePassOpportunity(passer, receiver, world, goal, vision, intelligence) {
  const distance = Math.hypot(passer.x - receiver.x, passer.y - receiver.y);

  // 1. Goal Advancement Score (how much closer to goal)
  const passerGoalDist = Math.hypot(passer.x - goal.x, passer.y - goal.y);
  const receiverGoalDist = Math.hypot(receiver.x - goal.x, receiver.y - goal.y);
  const goalAdvancement = (passerGoalDist - receiverGoalDist) / passerGoalDist;
  const advancementScore = goalAdvancement * 100; // 0-100 points for advancement

  // 2. Shooting Opportunity Score
  const shootingScore = evaluateShootingOpportunity(receiver, world, goal) * 150; // 0-150 points

  // 3. Pass Difficulty Score (NEW)
  const passDifficulty = evaluatePassDifficulty(passer, receiver, world);
  const difficultyPenalty = passDifficulty * 50; // 0-50 point penalty

  // 4. Receiver Pressure Score (NEW)
  const receiverPressure = evaluateReceiverPressure(receiver, world);
  const pressurePenalty = receiverPressure * 30; // 0-30 point penalty

  // 5. Pass Lane Clearance (NEW)
  const laneClearance = evaluatePassLane(passer, receiver, world);
  const laneBonus = laneClearance * 40; // 0-40 point bonus

  // 6. Receiver Movement Score (NEW)
  const movementScore = evaluateReceiverMovement(receiver, goal) * 25; // 0-25 points

  // Calculate final score with all factors
  const totalScore = advancementScore + shootingScore + laneBonus + movementScore - difficultyPenalty - pressurePenalty;

  return Math.max(0, totalScore);
}

// Evaluate how difficult the pass is to execute
function evaluatePassDifficulty(passer, receiver, world) {
  const distance = Math.hypot(passer.x - receiver.x, passer.y - receiver.y);

  // Distance difficulty (0-1, higher is more difficult)
  let difficulty = Math.min(1, distance / 80); // Max difficulty at 80m

  // Angle difficulty (passes behind or to the side are harder)
  const passerToGoal = Math.atan2(world.opponentGoal.y - passer.y, world.opponentGoal.x - passer.x);
  const passerToReceiver = Math.atan2(receiver.y - passer.y, receiver.x - passer.x);
  let angleDiff = Math.abs(passerToGoal - passerToReceiver);
  if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

  // Backward passes are more difficult
  if (angleDiff > Math.PI / 2) {
    difficulty += 0.3;
  }

  // Passer pressure increases difficulty
  const passerPressure = evaluatePlayerPressure(passer, world);
  difficulty += passerPressure * 0.4;

  return Math.min(1, difficulty);
}

// Evaluate pressure on the potential receiver
function evaluateReceiverPressure(receiver, world) {
  let pressure = 0;
  const opponents = world.players ? world.players.filter(p => p.team !== receiver.team) : [];

  opponents.forEach(opponent => {
    const distance = Math.hypot(receiver.x - opponent.x, receiver.y - opponent.y);
    if (distance < 10) {
      pressure += 0.8; // Very close opponent
    } else if (distance < 20) {
      pressure += 0.4; // Nearby opponent
    }
  });

  return Math.min(1, pressure);
}

// Evaluate if the pass lane is clear of opponents
function evaluatePassLane(passer, receiver, world) {
  const opponents = world.players ? world.players.filter(p => p.team !== passer.team) : [];
  let clearance = 1.0;

  // Check for opponents in the pass lane
  opponents.forEach(opponent => {
    const distanceToLane = distancePointToLine(
      opponent.x, opponent.y,
      passer.x, passer.y,
      receiver.x, receiver.y
    );

    if (distanceToLane < 8) { // Opponent within 8m of pass lane
      const positionOnLane = getPositionOnLine(
        opponent.x, opponent.y,
        passer.x, passer.y,
        receiver.x, receiver.y
      );

      // Only count opponents between passer and receiver
      if (positionOnLane > 0 && positionOnLane < 1) {
        clearance -= 0.3; // Reduce clearance for each blocking opponent
      }
    }
  });

  return Math.max(0, clearance);
}

// Evaluate receiver's movement toward goal
function evaluateReceiverMovement(receiver, goal) {
  if (!receiver.targetX || !receiver.targetY) return 0;

  // Calculate if receiver is moving toward goal
  const currentGoalDist = Math.hypot(receiver.x - goal.x, receiver.y - goal.y);
  const targetGoalDist = Math.hypot(receiver.targetX - goal.x, receiver.targetY - goal.y);

  if (targetGoalDist < currentGoalDist) {
    return 1.0; // Moving toward goal
  } else if (targetGoalDist > currentGoalDist + 10) {
    return 0.2; // Moving away from goal
  } else {
    return 0.6; // Lateral movement
  }
}

// Helper function: distance from point to line
function distancePointToLine(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return Math.hypot(A, B);

  const param = dot / lenSq;
  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return Math.hypot(px - xx, py - yy);
}

// Helper function: get position on line (0 = start, 1 = end)
function getPositionOnLine(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return 0;

  return dot / lenSq;
}

// Evaluate if receiver has a good shooting opportunity
function evaluateShootingOpportunity(receiver, world, goal) {
  const goalDistance = Math.hypot(receiver.x - goal.x, receiver.y - goal.y);
  const shootingRange = computeShootRadius(receiver);

  if (goalDistance > shootingRange) return 0;

  // Check shooting angle and obstacles
  const angleToGoal = Math.atan2(goal.y - receiver.y, goal.x - receiver.x);
  const goalWidth = 100; // Approximate goal width
  const shootingAngle = Math.atan(goalWidth / goalDistance);

  // Check for defenders blocking the shot
  let clearShot = 1.0;
  world.opponents.forEach(opp => {
    const oppDistance = Math.hypot(receiver.x - opp.x, receiver.y - opp.y);
    const oppAngle = Math.atan2(opp.y - receiver.y, opp.x - receiver.x);
    const angleDiff = Math.abs(angleToGoal - oppAngle);

    if (oppDistance < goalDistance && angleDiff < shootingAngle) {
      clearShot *= Math.max(0.1, oppDistance / 50); // Reduce score based on blocking
    }
  });

  // Score based on distance, angle, and clearness
  const distanceScore = Math.max(0, 1 - goalDistance / shootingRange);
  const angleScore = Math.min(1, shootingAngle * 2); // Better angle = higher score

  return distanceScore * angleScore * clearShot;
}

// Evaluate space around receiver (how open they are)
function evaluateReceiverSpace(receiver, world) {
  const checkRadius = 60;
  let spaceScore = 1.0;

  // Check opponents near receiver
  world.opponents.forEach(opp => {
    const distance = Math.hypot(receiver.x - opp.x, receiver.y - opp.y);
    if (distance < checkRadius) {
      spaceScore *= Math.max(0.1, distance / checkRadius);
    }
  });

  // Bonus for being in advanced positions
  const isHomeTeam = receiver.formationX < 525;
  const advancedPosition = isHomeTeam ? receiver.x > 525 : receiver.x < 525;
  if (advancedPosition) spaceScore *= 1.3;

  return spaceScore;
}

// Evaluate pass safety (clear path, no interceptions)
function evaluatePassSafety(passer, receiver, world) {
  const passVector = { x: receiver.x - passer.x, y: receiver.y - passer.y };
  const passDistance = Math.hypot(passVector.x, passVector.y);
  const passDirection = { x: passVector.x / passDistance, y: passVector.y / passDistance };

  let safetyScore = 1.0;

  // Check for opponents who could intercept
  world.opponents.forEach(opp => {
    // Project opponent position onto pass line
    const toOpp = { x: opp.x - passer.x, y: opp.y - passer.y };
    const projection = toOpp.x * passDirection.x + toOpp.y * passDirection.y;

    // Only consider opponents between passer and receiver
    if (projection > 0 && projection < passDistance) {
      const projectedPoint = {
        x: passer.x + passDirection.x * projection,
        y: passer.y + passDirection.y * projection
      };

      const distanceToPassLine = Math.hypot(opp.x - projectedPoint.x, opp.y - projectedPoint.y);
      const interceptRadius = 25; // How close opponent needs to be to intercept

      if (distanceToPassLine < interceptRadius) {
        safetyScore *= Math.max(0.2, distanceToPassLine / interceptRadius);
      }
    }
  });

  return safetyScore;
}

// Evaluate tactical value of receiver's position
function evaluateTacticalPosition(receiver, world, goal) {
  const isHomeTeam = receiver.formationX < 525;
  const goalDistance = Math.hypot(receiver.x - goal.x, receiver.y - goal.y);

  let tacticalScore = 0.5; // Base score

  // Role-based tactical value
  switch (receiver.role) {
    case "ST": case "LF": case "RF":
      // Strikers get bonus for being close to goal
      tacticalScore += Math.max(0, 1 - goalDistance / 300);
      break;
    case "OM": case "ZM":
      // Midfielders get bonus for central positions
      const centerDistance = Math.abs(receiver.y - 340);
      tacticalScore += Math.max(0, 1 - centerDistance / 200);
      break;
    case "LM": case "RM":
      // Wing players get bonus for wide positions
      const wideBonus = receiver.role === "LM" ?
        Math.max(0, 1 - receiver.y / 340) :
        Math.max(0, 1 - (680 - receiver.y) / 340);
      tacticalScore += wideBonus * 0.5;
      break;
  }

  // Bonus for being in opponent's half
  const inOpponentHalf = isHomeTeam ? receiver.x > 525 : receiver.x < 525;
  if (inOpponentHalf) tacticalScore += 0.3;

  return Math.min(1, tacticalScore);
}

// Evaluate receiver's ability to make use of the pass
function evaluateReceiverAbility(receiver) {
  const technique = receiver.derived?.passingAccuracy || receiver.base?.technique || 0.5;
  const vision = receiver.derived?.vision || receiver.base?.vision || 0.5;
  const shooting = receiver.derived?.shootingAccuracy || receiver.base?.technique || 0.5;
  const stamina = receiver.stamina || 1;

  // Combine abilities with stamina factor
  const abilityScore = (technique * 0.4 + vision * 0.3 + shooting * 0.3) * stamina;

  return abilityScore;
}

// ---- Open Space Navigation for Ball Holder & Attackers ----
function findOpenSpaceNearGoal(player, world) {
  const steps = 8;
  const RADIUS = 48;
  let bestScore = -Infinity, best = { x: player.x, y: player.y };
  let dx = world.opponentGoal.x - player.x;
  let dy = world.opponentGoal.y - player.y;
  let baseAngle = Math.atan2(dy, dx);
  for (let i = -2; i <= 2; i++) {
    let angle = baseAngle + (i * Math.PI / steps);
    let tx = player.x + Math.cos(angle) * RADIUS;
    let ty = player.y + Math.sin(angle) * RADIUS;
    let zone = getDynamicZone(player, world);
    const { x: cx, y: cy } = clampToZone(tx, ty, zone);
    let minOpponentDist = Math.min(
      ...world.opponents.map(opp => Math.hypot(cx - opp.x, cy - opp.y))
    );
    let toGoal = 200 - Math.hypot(world.opponentGoal.x - cx, world.opponentGoal.y - cy);
    let score = minOpponentDist + toGoal;
    if (score > bestScore) {
      bestScore = score;
      best = { x: cx, y: cy };
    }
  }
  return best;
}
function findLastLineSpace(player, world) {
  let zone = getDynamicZone(player, world);
  let x = Math.max(zone.minX, Math.min(zone.maxX, world.opponentGoal.x - 35));
  let y = Math.max(zone.minY, Math.min(zone.maxY, player.y));
  return { x, y };
}

// ---- Marking/Support/Helpers ----
export function avoidTeammateClumping(player, teammates, minDist = 18) {
  for (const mate of teammates) {
    if (mate === player) continue;
    let d = Math.hypot(player.x - mate.x, player.y - mate.y);
    if (d < minDist) {
      player.targetX += (player.x - mate.x) * 0.35;
      player.targetY += (player.y - mate.y) * 0.35;
    }
  }
}

function findNearestOpponent(player, opponents, roles = []) {
  let filtered = roles.length ? opponents.filter(p => roles.includes(p.role)) : opponents;
  let minDist = Infinity, best = null;
  for (let opp of filtered) {
    let d = Math.hypot(player.x - opp.x, player.y - opp.y);
    if (d < minDist) { minDist = d; best = opp; }
  }
  return best;
}


