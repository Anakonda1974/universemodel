// capabilities.js

export const Capabilities = {
  // Offensiv
  shoot:      (player, world) => { /* Ziel auf Tor setzen, Aktion ausführen */ },
  pass:       (player, world, targetPlayer) => { /* Ziel auf Mitspieler setzen, Ball bewegen */ },
  dribble:    (player, world, direction) => { /* Ziel nach vorne setzen */ },
  cross:      (player, world, targetArea) => { /* Flanke */ },

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
  requestPass:    (player, world) => { /* Nachricht senden */ },
  shout:          (player, world, message, urgency) => { /* Message broadcasten */ },

  // Wahrnehmung/Kopf
  turnHeadTo:     (player, world, angle) => { player.turnHeadTo(angle); },
  scanField:      (player, world) => { /* Kopf in mehreren Schritten drehen */ },

  // Utility
  holdFormation:  (player, world) => { player.targetX = player.formationX; player.targetY = player.formationY; }
};
