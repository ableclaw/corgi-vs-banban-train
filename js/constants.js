/** World scale: 800×450 view. Short-leg jump is about 1.5 body-heights. */
export const VIEW_W = 800;
export const VIEW_H = 450;
export const GROUND = 376;
export const PLAYER_W = 78;
export const STAND_H = 70;
export const DUCK_H = 36;

export const TUNING = Object.freeze({
  gravity: 1210,
  jumpV: -696,
  maxSpeed: 360,
  accel: 2400,
  friction: 2800,
});

export const BOT_WAIT_PAD = 40;
export const BOT_CLEAR_PAD = 24;
export const BOT_TIME_PAD = 0.3;

export function jumpApex(tuning = TUNING) {
  const v = Math.abs(tuning.jumpV);
  return (v * v) / (2 * tuning.gravity);
}

/** Seconds the feet stay at least `rise` px above the ground during a full jump. */
export function airWindow(rise, tuning = TUNING) {
  const v = Math.abs(tuning.jumpV);
  const g = tuning.gravity;
  const disc = v * v - 2 * g * rise;
  if (disc <= 0) return 0;
  return (2 * Math.sqrt(disc)) / g;
}

/**
 * Distances (px ahead of the player's front) where a full-speed jump clears
 * a stationary obstacle of the given rise and width.
 */
export function jumpClearDistances(rise, width, tuning = TUNING) {
  const v = Math.abs(tuning.jumpV);
  const g = tuning.gravity;
  const disc = v * v - 2 * g * rise;
  if (disc <= 0) return null;
  const s = Math.sqrt(disc);
  const tA = (v - s) / g;
  const tB = (v + s) / g;
  const speed = tuning.maxSpeed;
  return {
    dMin: tA * speed,
    dMax: tB * speed - width - PLAYER_W,
  };
}

/** Worst-case seconds a lift-coach must stay parked up so a runner at the wait line can cross. */
export function liftPauseNeeded(width, tuning = TUNING) {
  const dist = width + BOT_CLEAR_PAD + BOT_WAIT_PAD + PLAYER_W;
  return dist / tuning.maxSpeed + BOT_TIME_PAD;
}
