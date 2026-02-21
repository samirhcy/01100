import { Config } from '../src/config.js';
import { State } from './state.js';
import { Utils } from '../src/utils.js';

export const PlayerEntity = {
  update: (timeScale) => {
    if (State.player.isDead) return;

    let speedMod = State.player.mode === "combat" ? 0.7 : 1.0;
    const vec = State.input.moveVector;
    
    if (Math.abs(vec.x) > 0) State.player.vx += vec.x * Config.player.accel * timeScale * speedMod;
    if (Math.abs(vec.y) > 0) State.player.vy += vec.y * Config.player.accel * timeScale * speedMod;

    let currentMax = Config.player.maxSpeed;
    if (Math.abs(State.player.vx) > currentMax) State.player.vx *= 0.9;
    if (Math.abs(State.player.vy) > currentMax) State.player.vy *= 0.9;

    State.player.vx *= Config.player.friction;
    State.player.vy *= Config.player.friction;

    let nextX = State.player.x + State.player.vx * timeScale;
    let nextY = State.player.y + State.player.vy * timeScale;

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

    State.player.x = nextX;
    State.player.y = nextY;

    if (State.player.cloaked) if (--State.player.cloakTimer <= 0) State.player.cloaked = false;
    if (State.player.scanActive) State.player.scanTimer--;
  },
};