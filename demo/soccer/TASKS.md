# Movement & Decision-Making Improvements

The following tasks outline potential enhancements for the soccer demo.
They focus on refining player decisions and producing more natural head movement.

- [x] **Gaze Tracking**: Use `smoothTurnHeadTo` to continuously orient the head toward the ball or the current tactical focus. Interpolate the motion so sudden changes look smooth.
- [x] **Awareness Scans**: When the ball is far away, occasionally trigger short head turns to nearby teammates or opponents. This simulates players scanning the field.
- [x] **Orientation-Based Actions**: Incorporate head and body alignment into pass and shot success. Actions performed without proper orientation should have reduced accuracy.
- [x] **Prediction Integration**: Extend `predictObjectPosition` so players can look ahead to the anticipated ball location, turning their head before the ball arrives.
- [x] **Movement Anticipation**: While running, have the head lead the body slightly when changing direction. Couple this with slower body turning for more believable motion.
- [x] **Idle Head Motion**: Add subtle idle animations where stationary players perform small, periodic head movements to avoid a frozen appearance.

## Behavior Tree Action Nodes

The soccer demo uses behavior trees to orchestrate player decisions. The
following tasks outline the core action nodes that still need dedicated
implementations.

### Ball Possession & Offensive Actions
- [x] **shoot(goalPos)**: allow a player to attempt a shot on goal.
- [x] **pass(targetPlayer/pos)**: execute a ground or lofted pass to a teammate.
- [x] **lobPass(targetPlayer/pos)**: play an elevated long pass.
- [x] **cross(targetArea)**: deliver a cross into the target zone.
- [x] **dribble(targetPos/dir)**: move while controlling the ball.
- [x] **holdBall()**: shield the ball and slow the play down.
- [x] **fakeShot() / feint()**: perform a body feint or fake shot.
- [x] **oneTwo(targetPlayer)**: initiate a quick one-two pass sequence.
- [x] **backPass(targetPlayer/pos)**: recycle possession with a back pass.

### Off-the-Ball Actions
- [x] **runToSpace(targetPos)**: move into open space to receive a pass.
- [x] **requestPass()**: signal a teammate for the ball.
- [x] **prepareShot()**: position for a shot attempt.
- [x] **screenOpponent(opponent)**: block or screen an opponent.
- [x] **overlap(teammate)**: perform an overlapping run.
- [x] **delayRun()**: time a run to avoid offside.

### Defensive Actions
- [x] **tackle(targetPlayer/pos)**: challenge the ball carrier.
- [x] **interceptPass(passPath)**: anticipate and intercept a pass.
- [x] **markOpponent(opponent)**: apply man marking to an opponent.
- [x] **coverZone(targetZone)**: guard a defensive zone.
- [x] **trackBack()**: retreat towards the defensive half.
- [x] **pressBallCarrier(opponent)**: close down the player with the ball.
- [x] **clearBall(targetArea)**: perform a defensive clearance.
- [x] **blockShot()**: block an incoming shot.
- [x] **delayAttack()**: slow down the opponent without tackling.

### Special Role Actions
- [x] **goalKick(targetArea)**: goalkeeper performs a goal kick.
- [x] **throwIn(targetPlayer/pos)**: take a throw-in.
- [x] **takeCorner(targetArea)**: take a corner kick.
- [x] **takeFreeKick(targetArea)**: take a free kick.
- [x] **commandDefense(action/teammate)**: issue defensive commands.

### Communication & Meta Actions
- [x] **shoutInstruction(type, urgency, [targetPlayer])**: call out instructions.
- [x] **callForMarkSwitch(targetOpponent, targetTeammate)**: signal a mark switch.
- [x] **signalOffsideTrap()**: trigger the offside trap.
- [x] **signalKeeperOut()**: request the keeper to come out.

### Perception & Focus
- [x] **turnHeadTo(angle/targetPos)**: deliberately turn the head to scan.
- [x] **scanField()**: perform a quick field awareness scan.
- [x] **memorizeSituation()**: store the current situation for prediction.
- [x] **focusOnObject(object)**: fix attention on a specific object.

### Utility Actions
- [x] **holdFormation()**: maintain the tactical formation.
- [x] **recoverStamina()**: slow down to regain stamina.
- [x] **simulateInjury()**: feign an injury (for completeness).

