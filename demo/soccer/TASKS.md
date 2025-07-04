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
- [ ] **shoot(goalPos)**: allow a player to attempt a shot on goal.
- [ ] **pass(targetPlayer/pos)**: execute a ground or lofted pass to a teammate.
- [ ] **lobPass(targetPlayer/pos)**: play an elevated long pass.
- [ ] **cross(targetArea)**: deliver a cross into the target zone.
- [ ] **dribble(targetPos/dir)**: move while controlling the ball.
- [ ] **holdBall()**: shield the ball and slow the play down.
- [ ] **fakeShot() / feint()**: perform a body feint or fake shot.
- [ ] **oneTwo(targetPlayer)**: initiate a quick one-two pass sequence.
- [ ] **backPass(targetPlayer/pos)**: recycle possession with a back pass.

### Off-the-Ball Actions
- [x] **runToSpace(targetPos)**: move into open space to receive a pass.
- [x] **requestPass()**: signal a teammate for the ball.
- [ ] **prepareShot()**: position for a shot attempt.
- [ ] **screenOpponent(opponent)**: block or screen an opponent.
- [ ] **overlap(teammate)**: perform an overlapping run.
- [ ] **delayRun()**: time a run to avoid offside.

### Defensive Actions
- [ ] **tackle(targetPlayer/pos)**: challenge the ball carrier.
- [ ] **interceptPass(passPath)**: anticipate and intercept a pass.
- [ ] **markOpponent(opponent)**: apply man marking to an opponent.
- [ ] **coverZone(targetZone)**: guard a defensive zone.
- [ ] **trackBack()**: retreat towards the defensive half.
- [ ] **pressBallCarrier(opponent)**: close down the player with the ball.
- [ ] **clearBall(targetArea)**: perform a defensive clearance.
- [ ] **blockShot()**: block an incoming shot.
- [ ] **delayAttack()**: slow down the opponent without tackling.

### Special Role Actions
- [ ] **goalKick(targetArea)**: goalkeeper performs a goal kick.
- [ ] **throwIn(targetPlayer/pos)**: take a throw-in.
- [ ] **takeCorner(targetArea)**: take a corner kick.
- [ ] **takeFreeKick(targetArea)**: take a free kick.
- [ ] **commandDefense(action/teammate)**: issue defensive commands.

### Communication & Meta Actions
- [ ] **shoutInstruction(type, urgency, [targetPlayer])**: call out instructions.
- [ ] **callForMarkSwitch(targetOpponent, targetTeammate)**: signal a mark switch.
- [ ] **signalOffsideTrap()**: trigger the offside trap.
- [ ] **signalKeeperOut()**: request the keeper to come out.

### Perception & Focus
- [ ] **turnHeadTo(angle/targetPos)**: deliberately turn the head to scan.
- [ ] **scanField()**: perform a quick field awareness scan.
- [ ] **memorizeSituation()**: store the current situation for prediction.
- [ ] **focusOnObject(object)**: fix attention on a specific object.

### Utility Actions
- [ ] **holdFormation()**: maintain the tactical formation.
- [x] **recoverStamina()**: slow down to regain stamina.
- [ ] **simulateInjury()**: feign an injury (for completeness).

