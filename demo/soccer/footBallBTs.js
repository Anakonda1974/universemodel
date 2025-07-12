// footBallBTs_refactor.js – v3 ✔ Spacing & Pass-Fix

import { Selector, Sequence, Condition, Action } from "./behaviorTree.js";
import {
  playerIsClosestToBall,
  canShoot,
  findBestPass,
  getDynamicZone
} from "./decision-rules.js";
import { getTargetZoneCenter } from "./TacticsHelper.js";
import { avoidTeammateClumping } from "./decision-rules.js";

/** Dynamic ball-focused positioning with constant adaptation */
function holdFormation(agent) {
  const world = agent.lastWorld;
  if (!world || !world.ball) {
    // Fallback to basic formation if no world data
    agent.targetX = agent.formationX;
    agent.targetY = agent.formationY;
    agent.currentAction = "holdFormation";
    return;
  }

  // Calculate dynamic position based on ball location and game situation
  const dynamicPosition = calculateDynamicPosition(agent, world);

  agent.targetX = dynamicPosition.x;
  agent.targetY = dynamicPosition.y;
  agent.currentAction = "dynamicPositioning";

  // Continuous tactical adjustments every decision cycle
  performContinuousAdjustments(agent, world);
}

/** Calculate dynamic position based on ball and tactical situation */
function calculateDynamicPosition(agent, world) {
  const ball = world.ball;
  const baseFormation = { x: agent.formationX, y: agent.formationY };

  // Ball-relative positioning factors
  const ballInfluence = calculateBallInfluence(agent, ball, world);
  const teammateInfluence = calculateTeammateInfluence(agent, world);
  const opponentInfluence = calculateOpponentInfluence(agent, world);
  const tacticalInfluence = calculateTacticalInfluence(agent, world);

  // Combine all influences with weights
  const finalPosition = {
    x: baseFormation.x +
        ballInfluence.x * 0.4 +
        teammateInfluence.x * 0.2 +
        opponentInfluence.x * 0.2 +
        tacticalInfluence.x * 0.2,
    y: baseFormation.y +
        ballInfluence.y * 0.4 +
        teammateInfluence.y * 0.2 +
        opponentInfluence.y * 0.2 +
        tacticalInfluence.y * 0.2
  };

  // Ensure position stays within reasonable bounds
  return constrainPosition(finalPosition, agent, world);
}

/** Calculate ball influence on positioning */
function calculateBallInfluence(agent, ball, world) {
  const ballDistance = Math.hypot(agent.x - ball.x, agent.y - ball.y);
  const ballToAgent = { x: agent.x - ball.x, y: agent.y - ball.y };

  // Role-based ball attraction/repulsion
  const roleFactors = {
    'ST': { attraction: 0.8, optimalDistance: 25 },
    'LS': { attraction: 0.7, optimalDistance: 30 },
    'RS': { attraction: 0.7, optimalDistance: 30 },
    'OM': { attraction: 0.6, optimalDistance: 35 },
    'LF': { attraction: 0.6, optimalDistance: 30 },
    'RF': { attraction: 0.6, optimalDistance: 30 },
    'ZM': { attraction: 0.4, optimalDistance: 40 },
    'LM': { attraction: 0.5, optimalDistance: 35 },
    'RM': { attraction: 0.5, optimalDistance: 35 },
    'DM': { attraction: 0.3, optimalDistance: 45 },
    'IV': { attraction: 0.2, optimalDistance: 50 },
    'LIV': { attraction: 0.2, optimalDistance: 50 },
    'RIV': { attraction: 0.2, optimalDistance: 50 },
    'LV': { attraction: 0.3, optimalDistance: 40 },
    'RV': { attraction: 0.3, optimalDistance: 40 },
    'TW': { attraction: 0.1, optimalDistance: 60 }
  };

  const roleFactor = roleFactors[agent.role] || { attraction: 0.4, optimalDistance: 40 };

  // Calculate desired distance adjustment
  const distanceError = ballDistance - roleFactor.optimalDistance;
  const adjustmentMagnitude = Math.min(15, Math.abs(distanceError) * 0.3) * roleFactor.attraction;

  if (ballDistance === 0) return { x: 0, y: 0 };

  // Move toward or away from ball to maintain optimal distance
  const direction = distanceError > 0 ? -1 : 1; // Move toward ball if too far, away if too close

  return {
    x: (ballToAgent.x / ballDistance) * adjustmentMagnitude * direction,
    y: (ballToAgent.y / ballDistance) * adjustmentMagnitude * direction
  };
}

/** Calculate teammate influence on positioning */
function calculateTeammateInfluence(agent, world) {
  const teammates = world.teammates.filter(t => t !== agent);
  let totalInfluence = { x: 0, y: 0 };

  teammates.forEach(teammate => {
    const distance = Math.hypot(agent.x - teammate.x, agent.y - teammate.y);

    if (distance < 25) { // Too close - create separation
      const separation = {
        x: agent.x - teammate.x,
        y: agent.y - teammate.y
      };
      const magnitude = Math.hypot(separation.x, separation.y) || 1;
      const strength = (25 - distance) / 25 * 8; // Stronger when closer

      totalInfluence.x += (separation.x / magnitude) * strength;
      totalInfluence.y += (separation.y / magnitude) * strength;
    }

    // Special coordination for ball carrier
    if (world.ball?.owner === teammate) {
      const supportAngle = calculateSupportAngle(agent, teammate, world);
      const supportDistance = 30;
      const supportPosition = {
        x: teammate.x + Math.cos(supportAngle) * supportDistance,
        y: teammate.y + Math.sin(supportAngle) * supportDistance
      };

      const toSupport = {
        x: supportPosition.x - agent.x,
        y: supportPosition.y - agent.y
      };
      const supportMagnitude = Math.hypot(toSupport.x, toSupport.y) || 1;
      const supportStrength = 5;

      totalInfluence.x += (toSupport.x / supportMagnitude) * supportStrength;
      totalInfluence.y += (toSupport.y / supportMagnitude) * supportStrength;
    }
  });

  return totalInfluence;
}

/** Calculate opponent influence on positioning */
function calculateOpponentInfluence(agent, world) {
  const opponents = world.opponents || [];
  let totalInfluence = { x: 0, y: 0 };

  opponents.forEach(opponent => {
    const distance = Math.hypot(agent.x - opponent.x, agent.y - opponent.y);

    if (distance < 30) {
      // Defensive positioning relative to opponent
      const opponentThreat = assessOpponentThreat(opponent, world);

      if (opponentThreat > 0.5) {
        // Position between opponent and goal
        const goal = world.ownGoal || { x: 0, y: 170 };
        const goalToOpponent = {
          x: opponent.x - goal.x,
          y: opponent.y - goal.y
        };
        const magnitude = Math.hypot(goalToOpponent.x, goalToOpponent.y) || 1;
        const interceptPosition = {
          x: goal.x + (goalToOpponent.x / magnitude) * (distance * 0.7),
          y: goal.y + (goalToOpponent.y / magnitude) * (distance * 0.7)
        };

        const toIntercept = {
          x: interceptPosition.x - agent.x,
          y: interceptPosition.y - agent.y
        };
        const interceptMagnitude = Math.hypot(toIntercept.x, toIntercept.y) || 1;
        const strength = opponentThreat * 6;

        totalInfluence.x += (toIntercept.x / interceptMagnitude) * strength;
        totalInfluence.y += (toIntercept.y / interceptMagnitude) * strength;
      }
    }
  });

  return totalInfluence;
}

/** Calculate tactical influence based on game phase */
function calculateTacticalInfluence(agent, world) {
  const ball = world.ball;
  const ballOwnership = determineBallOwnership(ball, world);

  let tacticalAdjustment = { x: 0, y: 0 };

  if (ballOwnership === 'own') {
    // Attacking phase - push forward
    const goal = world.opponentGoal || { x: 525, y: 170 };
    const forwardPush = calculateForwardPush(agent, goal);
    tacticalAdjustment.x += forwardPush.x;
    tacticalAdjustment.y += forwardPush.y;
  } else if (ballOwnership === 'opponent') {
    // Defensive phase - drop back
    const goal = world.ownGoal || { x: 0, y: 170 };
    const defensiveRetreat = calculateDefensiveRetreat(agent, goal, ball);
    tacticalAdjustment.x += defensiveRetreat.x;
    tacticalAdjustment.y += defensiveRetreat.y;
  }

  return tacticalAdjustment;
}

/** Perform continuous micro-adjustments */
function performContinuousAdjustments(agent, world) {
  // Update spatial awareness
  updateSpatialAwareness(agent, world);

  // Adjust body orientation toward ball
  adjustBodyOrientation(agent, world.ball);

  // Update tactical state
  updateTacticalState(agent, world);

  // Communicate positioning changes
  communicatePositionChange(agent, world);
}

// ===== HELPER FUNCTIONS FOR DYNAMIC POSITIONING =====

/** Calculate support angle for ball carrier */
function calculateSupportAngle(supporter, ballCarrier, world) {
  const goal = world.opponentGoal || { x: 525, y: 170 };
  const ballToGoal = Math.atan2(goal.y - ballCarrier.y, goal.x - ballCarrier.x);

  // Position at angle that provides passing option toward goal
  const supportAngleOffset = (Math.random() - 0.5) * Math.PI / 2; // ±45 degrees
  return ballToGoal + supportAngleOffset;
}

/** Assess threat level of opponent */
function assessOpponentThreat(opponent, world) {
  const goal = world.ownGoal || { x: 0, y: 170 };
  const distanceToGoal = Math.hypot(opponent.x - goal.x, opponent.y - goal.y);

  let threat = 0;

  // Distance threat (closer = more dangerous)
  threat += Math.max(0, 1 - distanceToGoal / 100);

  // Ball possession threat
  if (world.ball?.owner === opponent) {
    threat += 0.5;
  }

  // Role-based threat
  const dangerousRoles = ['ST', 'LS', 'RS', 'OM', 'LF', 'RF'];
  if (dangerousRoles.includes(opponent.role)) {
    threat += 0.3;
  }

  return Math.min(1, threat);
}

/** Determine ball ownership */
function determineBallOwnership(ball, world) {
  if (!ball) return 'neutral';

  if (ball.owner) {
    return world.teammates.includes(ball.owner) ? 'own' : 'opponent';
  }

  // Check which team is closer to loose ball
  const teammateDistances = world.teammates.map(t =>
    Math.hypot(t.x - ball.x, t.y - ball.y)
  );
  const opponentDistances = (world.opponents || []).map(o =>
    Math.hypot(o.x - ball.x, o.y - ball.y)
  );

  const closestTeammate = Math.min(...teammateDistances);
  const closestOpponent = Math.min(...opponentDistances);

  if (closestTeammate < closestOpponent) return 'own';
  if (closestOpponent < closestTeammate) return 'opponent';
  return 'neutral';
}

/** Calculate forward push for attacking */
function calculateForwardPush(agent, goal) {
  const toGoal = {
    x: goal.x - agent.x,
    y: goal.y - agent.y
  };
  const distance = Math.hypot(toGoal.x, toGoal.y) || 1;

  // Role-based push intensity
  const pushIntensity = {
    'ST': 12, 'LS': 10, 'RS': 10,
    'OM': 8, 'LF': 8, 'RF': 8,
    'ZM': 5, 'LM': 6, 'RM': 6,
    'DM': 3, 'IV': 2, 'LIV': 2, 'RIV': 2,
    'LV': 4, 'RV': 4, 'TW': 0
  };

  const intensity = pushIntensity[agent.role] || 5;

  return {
    x: (toGoal.x / distance) * intensity,
    y: (toGoal.y / distance) * intensity
  };
}

/** Calculate defensive retreat */
function calculateDefensiveRetreat(agent, ownGoal, ball) {
  const toGoal = {
    x: ownGoal.x - agent.x,
    y: ownGoal.y - agent.y
  };
  const distance = Math.hypot(toGoal.x, toGoal.y) || 1;

  // Role-based retreat intensity
  const retreatIntensity = {
    'ST': 2, 'LS': 3, 'RS': 3,
    'OM': 5, 'LF': 4, 'RF': 4,
    'ZM': 8, 'LM': 6, 'RM': 6,
    'DM': 10, 'IV': 12, 'LIV': 12, 'RIV': 12,
    'LV': 10, 'RV': 10, 'TW': 0
  };

  const intensity = retreatIntensity[agent.role] || 6;

  return {
    x: (toGoal.x / distance) * intensity,
    y: (toGoal.y / distance) * intensity
  };
}

/** Constrain position within field bounds and role limits */
function constrainPosition(position, agent, world) {
  // Field boundaries
  const fieldBounds = {
    minX: 10, maxX: 515,
    minY: 10, maxY: 330
  };

  // Role-based constraints
  const roleConstraints = {
    'TW': { minX: 0, maxX: 80 },
    'IV': { minX: 50, maxX: 300 },
    'LIV': { minX: 50, maxX: 300 },
    'RIV': { minX: 50, maxX: 300 },
    'LV': { minX: 30, maxX: 350, minY: 0, maxY: 120 },
    'RV': { minX: 30, maxX: 350, minY: 220, maxY: 340 },
    'DM': { minX: 80, maxX: 400 },
    'ZM': { minX: 120, maxX: 450 },
    'LM': { minX: 100, maxX: 500, minY: 0, maxY: 140 },
    'RM': { minX: 100, maxX: 500, minY: 200, maxY: 340 },
    'OM': { minX: 200, maxX: 525 },
    'LF': { minX: 250, maxX: 525, minY: 0, maxY: 160 },
    'RF': { minX: 250, maxX: 525, minY: 180, maxY: 340 },
    'ST': { minX: 300, maxX: 525 }
  };

  const constraints = roleConstraints[agent.role] || {};

  return {
    x: Math.max(
      constraints.minX || fieldBounds.minX,
      Math.min(constraints.maxX || fieldBounds.maxX, position.x)
    ),
    y: Math.max(
      constraints.minY || fieldBounds.minY,
      Math.min(constraints.maxY || fieldBounds.maxY, position.y)
    )
  };
}

/** Update spatial awareness of surroundings */
function updateSpatialAwareness(agent, world) {
  // Track nearby players
  agent.nearbyTeammates = world.teammates.filter(t =>
    t !== agent && Math.hypot(agent.x - t.x, agent.y - t.y) < 40
  );

  agent.nearbyOpponents = (world.opponents || []).filter(o =>
    Math.hypot(agent.x - o.x, agent.y - o.y) < 40
  );

  // Update ball awareness
  const ballDistance = Math.hypot(agent.x - world.ball.x, agent.y - world.ball.y);
  agent.ballAwareness = {
    distance: ballDistance,
    canReach: ballDistance < 15,
    inRange: ballDistance < 30
  };
}

/** Adjust body orientation toward ball */
function adjustBodyOrientation(agent, ball) {
  const ballAngle = Math.atan2(ball.y - agent.y, ball.x - agent.x) * 180 / Math.PI;

  // Smooth turn toward ball
  let angleDiff = ((ballAngle - agent.bodyDirection + 540) % 360) - 180;
  const maxTurn = 15; // degrees per update

  if (Math.abs(angleDiff) > maxTurn) {
    agent.bodyDirection += Math.sign(angleDiff) * maxTurn;
  } else {
    agent.bodyDirection = ballAngle;
  }

  // Normalize angle
  if (agent.bodyDirection > 180) agent.bodyDirection -= 360;
  if (agent.bodyDirection < -180) agent.bodyDirection += 360;
}

/** Update tactical state based on situation */
function updateTacticalState(agent, world) {
  const ballOwnership = determineBallOwnership(world.ball, world);

  agent.tacticalState = {
    phase: ballOwnership,
    pressure: agent.nearbyOpponents?.length || 0,
    support: agent.nearbyTeammates?.length || 0,
    ballDistance: agent.ballAwareness?.distance || Infinity
  };
}

/** Communicate position changes to teammates */
function communicatePositionChange(agent, world) {
  // Occasionally communicate significant position changes
  if (Math.random() < 0.05) { // 5% chance per update
    const positionChange = Math.hypot(
      agent.targetX - agent.x,
      agent.targetY - agent.y
    );

    if (positionChange > 10) {
      const message = {
        type: 'positionUpdate',
        player: agent,
        newPosition: { x: agent.targetX, y: agent.targetY },
        reason: agent.currentAction
      };

      // Inform nearby teammates
      agent.nearbyTeammates?.forEach(teammate => {
        agent.sendMessage(teammate, message);
      });
    }
  }
}

/** Ziel in Zone einklemmen (mit Spielraum) */
function clampIntoZone(agent, world, tol = 0) {
  const z = getDynamicZone(agent, world);
  agent.targetX = Math.max(z.x - tol, Math.min(z.x + z.width + tol, agent.targetX));
  agent.targetY = Math.max(z.y - tol, Math.min(z.y + z.height + tol, agent.targetY));
}

/** Nach Entscheidungs-Tick Abstand zu Mitspielern erzwingen */
function spreadOut(agent, teammates) {
  avoidTeammateClumping(agent, teammates, 24); // größerer Mindestabstand
}

export function createPlayerBT() {
  return new Selector(
    // 0) Ausgepowert → Formation halten
    new Sequence(
      new Condition((a) => (a.stamina ?? 1) < 0.25),
      new Action((a) => holdFormation(a))
    ),

    // 1) Ballbesitz – Schuss > Pass > Dribble
    new Sequence(
      new Condition((a) => a.hasBall),
      new Selector(
        // 1.1 Schuss
        new Sequence(
          new Condition(canShoot),
          new Action((a, w) => {
            a.targetX = w.opponentGoal.x;
            a.targetY = w.opponentGoal.y;
            a.currentAction = "shoot";
            clampIntoZone(a, w, 25);
          })
        ),
        // 1.2 Pass (keine isLoose-Abhängigkeit mehr)
        new Action((a, w) => {
          const mate = findBestPass(a, w.teammates, w);
          if (mate) {
            a.targetX = mate.x;
            a.targetY = mate.y;
            a.currentAction = "pass";
          } else {
            // Kein guter Abnehmer → Formation wahren
            holdFormation(a);
          }
        }),
        // 1.3 Dribbling in Zone
        new Action((a, w) => {
          const c = getTargetZoneCenter(a, w.ball, a.pressing ?? 1);
          const ang = Math.atan2(w.opponentGoal.y - c.y, w.opponentGoal.x - c.x);
          a.targetX = a.x + Math.cos(ang) * 18;
          a.targetY = a.y + Math.sin(ang) * 18;
          a.currentAction = "dribble";
          clampIntoZone(a, w);
        })
      )
    ),

    // 2) Nächster am freien Ball → Chase (Zone ignorieren)
    new Sequence(
      new Condition(playerIsClosestToBall),
      new Action((a, w) => {
        a.targetX = w.ball.x;
        a.targetY = w.ball.y;
        a.currentAction = "chase";
      })
    ),

    // 3) Defensive Phase – Press oder Formation
    new Sequence(
      new Condition((a, w) => w.ball.owner && w.opponents.includes(w.ball.owner)),
      new Action((a, w) => {
        const h = w.ball.owner;
        const d = Math.hypot(a.x - h.x, a.y - h.y);
        if (d < 40) {
          a.targetX = h.x;
          a.targetY = h.y;
          a.currentAction = "press";
        } else {
          holdFormation(a);
        }
      })
    ),

    // 4) Standard – Zone halten + Spread
    new Action((a, w) => {
      holdFormation(a);
      spreadOut(a, w.teammates);
    })
  );
}
