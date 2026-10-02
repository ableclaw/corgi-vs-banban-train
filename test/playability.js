import {
  DUCK_H,
  GROUND,
  STAND_H,
  TUNING,
  jumpApex,
  jumpClearDistances,
  liftPauseNeeded,
} from "../js/constants.js";
import { createPilot } from "../js/bot.js";
import { createRun, normalizeSolid, overlap, step } from "../js/engine.js";
import { LEVELS } from "../js/levels.js";
import { applyClear, emptySave } from "../js/save.js";

const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function hitsBand(rect, top) {
  return rect.y < GROUND - 0.5 && rect.y + rect.h > top + 1;
}

function isOverhead(rect) {
  return hitsBand(rect, GROUND - STAND_H) && !hitsBand(rect, GROUND - DUCK_H);
}

function isGroundThreat(rect) {
  return hitsBand(rect, GROUND - STAND_H) && hitsBand(rect, GROUND - DUCK_H);
}

const apex = jumpApex();
console.log(
  `jump apex ${apex.toFixed(1)}px · stand ${STAND_H} · duck ${DUCK_H} · speed ${TUNING.maxSpeed}`,
);

for (const level of LEVELS) {
  assert(level.goal.x > 800, `L${level.id} goal too close`);
  assert(level.length > level.goal.x + 200, `L${level.id} length`);
  const solids = level.solids.map(normalizeSolid);
  for (const solid of solids) {
    if (solid.gate) {
      const gap = GROUND - (solid.y + solid.h);
      assert(gap > DUCK_H + 6, `L${level.id} gate gap ${gap} too tight`);
      assert(gap < STAND_H - 8, `L${level.id} gate does not block standing`);
      assert(GROUND - solid.y > apex + 24, `L${level.id} gate can be jumped`);
    } else if (solid.kind === "firewall") {
      const band = jumpClearDistances(solid.h, solid.w);
      assert(band && band.dMax > band.dMin + 36, `L${level.id} firewall x=${solid.x} h=${solid.h} not jumpable`);
    } else if (solid.kind === "platform") {
      const bottom = solid.y + solid.h;
      assert(bottom < GROUND - STAND_H - 8, `L${level.id} platform blocks the run`);
      assert(GROUND - solid.y < apex - 8, `L${level.id} platform too high`);
    }
  }
  for (const hazard of level.hazards) {
    if (hazard.motion === "lift") {
      const need = liftPauseNeeded(hazard.w);
      assert(hazard.pause >= need + 0.08, `L${level.id} coach "${hazard.label}" pause ${hazard.pause} < ${need.toFixed(2)}`);
      const highBottom = hazard.ymin + hazard.h;
      assert(highBottom <= GROUND - STAND_H - 16, `L${level.id} coach does not clear the corgi when raised`);
      assert(hazard.ymax + hazard.h >= GROUND - 2, `L${level.id} coach does not block when lowered`);
      continue;
    }
    if (hazard.motion === "ping") {
      assert(isOverhead(hazard), `L${level.id} moving ticket should be an overhead duck`);
      continue;
    }
    if (isOverhead(hazard)) {
      const band = jumpClearDistances(GROUND - hazard.y, hazard.w);
      assert(!band || band.dMax < band.dMin + 8, `L${level.id} overhead x=${hazard.x} can be jumped`);
      continue;
    }
    if (isGroundThreat(hazard)) {
      const band = jumpClearDistances(GROUND - hazard.y, hazard.w);
      assert(band && band.dMax > band.dMin + 36, `L${level.id} ${hazard.kind} x=${hazard.x} not jumpable`);
    }
  }
  const spans = [];
  for (const solid of level.solids) {
    if (solid.kind === "platform") continue;
    spans.push([solid.x, solid.x + solid.w, solid.gate ? "gate" : solid.kind]);
  }
  for (const hazard of level.hazards) {
    if (hazard.motion === "lift") spans.push([hazard.x - 40, hazard.x + hazard.w, "coach"]);
    else if (hazard.motion === "ping") spans.push([hazard.min - 36, hazard.max + hazard.w + 16, "ticket-air"]);
    else spans.push([hazard.x, hazard.x + hazard.w, hazard.kind]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i += 1) {
    const gap = spans[i][0] - spans[i - 1][1];
    assert(gap >= 220, `L${level.id} gap ${Math.round(gap)} between ${spans[i - 1][2]} and ${spans[i][2]}`);
  }

  for (const pickup of level.pickups || []) {
    for (const solid of solids) {
      assert(!overlap(pickup, solid), `L${level.id} treat stuck in solid at ${pickup.x}`);
    }
    for (const hazard of level.hazards) {
      if (hazard.motion === "lift" || hazard.motion === "ping") continue;
      assert(!overlap(pickup, hazard), `L${level.id} treat inside ${hazard.kind} at ${pickup.x}`);
    }
  }
}

function simulate(levelId) {
  const state = createRun(levelId);
  const pilot = createPilot();
  let t = 0;
  let still = 0;
  let lastX = state.player.x;
  const limit = 100;
  while (state.status === "play" && t < limit) {
    step(state, pilot(state), 1 / 60);
    t += 1 / 60;
    if (Math.abs(state.player.x - lastX) < 0.8) still += 1 / 60;
    else still = 0;
    lastX = state.player.x;
    if (still > 7) break;
  }
  return { status: state.status, x: Math.round(state.player.x), hp: state.hp, t: Number(t.toFixed(1)), score: Math.round(state.score) };
}

for (const level of LEVELS) {
  const result = simulate(level.id);
  console.log(
    `L${level.id} ${level.name}: ${result.status} x=${result.x}/${level.goal.x} hp=${result.hp} t=${result.t}s score=${result.score}`,
  );
  assert(result.status === "clear", `L${level.id} ${level.name} not cleared (${result.status} at x=${result.x})`);
}

let save = emptySave();
save = applyClear(save, 1, 1200);
assert(save.unlocked === 2, `beating level 1 should unlock 2, got ${save.unlocked}`);
assert(save.best[1] === 1200, "best score stored");
save = applyClear(save, 1, 800);
assert(save.best[1] === 1200, "lower score should not replace best");
save = applyClear(save, 5, 3000);
assert(save.cleared === true, "beating level 5 should set cleared");
assert(save.unlocked === 2, "beating the finale should not unlock a sixth level");

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const msg of failures) console.error(` - ${msg}`);
  process.exit(1);
}
console.log("\nAll levels are clearable, and level 1 unlocks level 2.");
