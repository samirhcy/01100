import { Config } from '../config.js';
import { State } from '../state.js';
import { Utils } from '../utils.js';

export const PlayerEntity = {
  update: (timeScale) => {
    if (State.player.isDead) return;

    // 1. Calculate Speed Modifier based on Profile
    let speedMod = State.player.mode === "combat" ? 0.7 : 1.0;

    // 2. Apply Acceleration from Input
    if (State.input.keys.w)
      State.player.vy -= Config.player.accel * timeScale * speedMod;
    if (State.input.keys.s)
      State.player.vy += Config.player.accel * timeScale * speedMod;
    if (State.input.keys.a)
      State.player.vx -= Config.player.accel * timeScale * speedMod;
    if (State.input.keys.d)
      State.player.vx += Config.player.accel * timeScale * speedMod;

    // 3. Cap Velocity (Max Speed)
    let currentMax = Config.player.maxSpeed;
    if (Math.abs(State.player.vx) > currentMax) State.player.vx *= 0.9;
    if (Math.abs(State.player.vy) > currentMax) State.player.vy *= 0.9;

    // 4. Apply Friction
    State.player.vx *= Config.player.friction;
    State.player.vy *= Config.player.friction;

    // 5. Calculate Next Position
    let nextX = State.player.x + State.player.vx * timeScale;
    let nextY = State.player.y + State.player.vy * timeScale;

    // 6. Collision Detection (Walls)
    for (let s of State.world.structures) {
      if (Utils.checkRectCollide(nextX, State.player.y, s)) {
        State.player.vx *= -0.5;
        nextX = State.player.x;
      }
      if (Utils.checkRectCollide(nextX, nextY, s)) {
        State.player.vy *= -0.5;
        nextY = State.player.y;
      }
    }

    // 7. Update Position
    State.player.x = nextX;
    State.player.y = nextY;

    // 8. Update Timers (Cloak & Scan)
    if (State.player.cloaked)
      if (--State.player.cloakTimer <= 0) State.player.cloaked = false;
    if (State.player.scanActive) State.player.scanTimer--;
  },
};