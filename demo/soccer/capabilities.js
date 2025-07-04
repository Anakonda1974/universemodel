// capabilities.js

export const Capabilities = {
  // Offensiv
  shoot:      (player, world) => { /* Ziel auf Tor setzen, Aktion ausführen */ },
  pass:       (player, world, targetPlayer) => { /* Ziel auf Mitspieler setzen, Ball bewegen */ },
  dribble:    (player, world, direction) => { /* Ziel nach vorne setzen */ },
  cross:      (player, world, targetArea) => { /* Flanke */ },
  // Utility offensive movement
  runToSpace: (player, world, targetPos) => {
    if (!targetPos) return;
    player.targetX = targetPos.x;
    player.targetY = targetPos.y;
    player.currentAction = 'runToSpace';
  },

  // Defensiv
  tackle:     (player, world, targetPlayer) => { /* Tackle-Versuch */ },
  intercept:  (player, world, passPath) => { /* Pass abfangen */ },
  mark:       (player, world, opponent) => { /* Deckung aufnehmen */ },
  press:      (player, world, opponent) => { /* Gegner anlaufen */ },
  clear:      (player, world, targetArea) => { /* Ball weit schlagen */ },

  // Speziell (Torwart)
  goalKick:   (player, world, targetArea) => { /* Abstoß */ },
  throwIn:    (player, world, targetPlayer) => { /* Einwurf */ },

  // Kommunikation & Meta
  requestPass:    (player, world) => {
    const owner = world.ball?.owner;
    if (owner && owner !== player && world.teammates.includes(owner)) {
      player.sendMessage(owner, { type: 'requestPass', target: player });
    }
  },
  shout:          (player, world, message, urgency) => { /* Message broadcasten */ },

  // Wahrnehmung/Kopf
  turnHeadTo:     (player, world, angle) => { player.turnHeadTo(angle); },
  scanField:      (player, world) => { /* Kopf in mehreren Schritten drehen */ },

  // Utility
  holdFormation:  (player, world) => { player.targetX = player.formationX; player.targetY = player.formationY; },
  recoverStamina: (player, world) => {
    player.pressing = Math.max(0.5, (player.pressing ?? 1) - 0.02);
    player.stamina = Math.min(1, (player.stamina ?? 1) + 0.005);
  }
};
