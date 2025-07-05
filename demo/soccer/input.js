export const defaultBindings = {
  move: {
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
  },
  sprint: ["ShiftLeft", "ShiftRight"],
  pass: ["KeyQ"],
  shoot: ["KeyE"],
  cancel: ["KeyC"],
  switchPlayer: ["Tab"],
  slide: ["KeyX"],
  reset: ["KeyR"],
};

function arr(val) {
  return Array.isArray(val) ? val : [val];
}

export class InputHandler {
  constructor(bindings = defaultBindings) {
    this.bindings = bindings;
    this.held = new Set();
    this.gamepadIndex = null;
    this.state = {
      direction: { x: 0, y: 0 },
      sprint: false,
      pass: false,
      passDown: false,
      passUp: false,
      shoot: false,
      shootDown: false,
      shootUp: false,
      slide: false,
      slideDown: false,
      slideUp: false,
      cancel: false,
      switch: false,
      reset: false,
      resetDown: false,
      resetUp: false,
    };
    this.prevButtons = { pass: false, shoot: false, slide: false, reset: false };
    this.cooldowns = { pass: 0, shoot: 0, slide: 0 };

    window.addEventListener("keydown", e => this.onKeyDown(e));
    window.addEventListener("keyup", e => this.onKeyUp(e));
    window.addEventListener("gamepadconnected", e => {
      if (this.gamepadIndex === null) this.gamepadIndex = e.gamepad.index;
    });
    window.addEventListener("gamepaddisconnected", e => {
      if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null;
    });
  }

  onKeyDown(e) {
    this.held.add(e.code);
  }
  onKeyUp(e) {
    this.held.delete(e.code);
  }

  _isPressed(codes) {
    for (const c of arr(codes)) {
      if (this.held.has(c)) return true;
    }
    return false;
  }

  sample(delta = 0) {
    const kb = window.keyBindings || {};
    const b = {
      move: {
        up: arr(kb.moveUp || this.bindings.move.up),
        down: arr(kb.moveDown || this.bindings.move.down),
        left: arr(kb.moveLeft || this.bindings.move.left),
        right: arr(kb.moveRight || this.bindings.move.right),
      },
      sprint: arr(kb.sprint || this.bindings.sprint),
      pass: arr(kb.pass || this.bindings.pass),
      shoot: arr(kb.shoot || this.bindings.shoot),
      cancel: arr(kb.cancel || this.bindings.cancel),
      switchPlayer: arr(kb.switch || this.bindings.switchPlayer),
      slide: arr(kb.tackle || this.bindings.slide),
      reset: arr(kb.reset || this.bindings.reset),
    };

    // Direction from keyboard
    let x = 0,
      y = 0;
    if (this._isPressed(b.move.left)) x -= 1;
    if (this._isPressed(b.move.right)) x += 1;
    if (this._isPressed(b.move.up)) y -= 1;
    if (this._isPressed(b.move.down)) y += 1;

    let pass = this._isPressed(b.pass);
    let shoot = this._isPressed(b.shoot);
    let slide = this._isPressed(b.slide);
    let sprint = this._isPressed(b.sprint);
    let cancel = this._isPressed(b.cancel);
    let sw = this._isPressed(b.switchPlayer);
    let rst = this._isPressed(b.reset);

    // Gamepad overrides
    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        const threshold = 0.2;
        const dz = v => (Math.abs(v) < threshold ? 0 : v);
        x = dz(gp.axes[0]);
        y = dz(gp.axes[1]);
        pass = gp.buttons[0] && gp.buttons[0].pressed;
        shoot = gp.buttons[1] && gp.buttons[1].pressed;
        slide = gp.buttons[2] && gp.buttons[2].pressed;
        cancel = gp.buttons[4] && gp.buttons[4].pressed;
        sw = gp.buttons[5] && gp.buttons[5].pressed;
        sprint = gp.buttons[7] && gp.buttons[7].pressed;
      }
    }

    const s = this.state;
    s.direction.x = x;
    s.direction.y = y;
    s.sprint = sprint;
    s.cancel = cancel;
    s.switch = sw;
    s.resetDown = !this.prevButtons.reset && rst;
    s.resetUp = this.prevButtons.reset && !rst;
    s.reset = rst;
    this.prevButtons.reset = rst;

    s.passDown = !this.prevButtons.pass && pass;
    s.passUp = this.prevButtons.pass && !pass;
    s.pass = pass;
    this.prevButtons.pass = pass;

    s.shootDown = !this.prevButtons.shoot && shoot;
    s.shootUp = this.prevButtons.shoot && !shoot;
    s.shoot = shoot;
    this.prevButtons.shoot = shoot;

    s.slideDown = !this.prevButtons.slide && slide;
    s.slideUp = this.prevButtons.slide && !slide;
    s.slide = slide;
    this.prevButtons.slide = slide;

    for (const k in this.cooldowns) {
      if (this.cooldowns[k] > 0) this.cooldowns[k] -= delta * 1000;
    }

    return s;
  }

  can(action) {
    return !this.cooldowns[action] || this.cooldowns[action] <= 0;
  }

  triggerCooldown(action, ms = 200) {
    this.cooldowns[action] = ms;
  }
}

