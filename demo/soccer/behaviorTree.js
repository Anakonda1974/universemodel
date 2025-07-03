// behaviorTree.js

export class BTNode {
  tick(agent, world) { throw new Error("Not implemented."); }
}

// Selector: Erster Kind-Knoten, der true zurückgibt, wird ausgeführt
export class Selector extends BTNode {
  constructor(...children) { super(); this.children = children; }
  tick(agent, world) {
    for (let child of this.children) {
      if (child.tick(agent, world)) return true;
    }
    return false;
  }
}

// Sequence: Alle Kinder der Reihe nach – Abbruch, wenn eines false zurückgibt
export class Sequence extends BTNode {
  constructor(...children) { super(); this.children = children; }
  tick(agent, world) {
    for (let child of this.children) {
      if (!child.tick(agent, world)) return false;
    }
    return true;
  }
}

// Condition: Prüft Bedingung
export class Condition extends BTNode {
  constructor(fn) { super(); this.fn = fn; }
  tick(agent, world) { return this.fn(agent, world); }
}

// Action: Führt Aktion aus
export class Action extends BTNode {
  constructor(fn) { super(); this.fn = fn; }
  tick(agent, world) { this.fn(agent, world); return true; }
}
