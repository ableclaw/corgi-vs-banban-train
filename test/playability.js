import { budgetLeft, createRun, place, remove, step } from "../js/engine.js";
import { LEVELS } from "../js/levels.js";
import { applyClear, emptySave } from "../js/save.js";

const failures = [];
function assert(cond, message) {
  if (!cond) failures.push(message);
}

function play(levelId, actions) {
  const state = createRun(levelId);
  for (const action of actions) {
    const result = place(state, action.gate, action.lane, action.slot);
    assert(result.ok, `L${levelId} place ${action.gate} failed: ${result.reason}`);
  }
  let guard = 0;
  while (state.phase !== "departed" && guard < 8000) {
    step(state, 1 / 30);
    guard += 1;
  }
  return state;
}

function line(state) {
  return state.features
    .map((feature) => `${feature.name}:${feature.result}@${feature.x.toFixed(1)}`)
    .join(" ");
}

const plans = {
  1: [{ gate: "review", lane: 0, slot: 2 }],
  2: [{ gate: "security", lane: 1, slot: 2 }],
  3: [
    { gate: "integration", lane: 1, slot: 2 },
    { gate: "integration", lane: 2, slot: 1 },
  ],
  4: [{ gate: "firewall", lane: 1, slot: 2 }],
  5: [
    { gate: "freeze", lane: 1, slot: 1 },
    { gate: "security", lane: 3, slot: 2 },
  ],
};

for (const level of LEVELS) {
  const won = play(level.id, plans[level.id]);
  console.log(`L${level.id} ${level.name}: ${won.win ? "win" : "lose"} ${won.score} ${line(won)}`);
  assert(won.phase === "departed", `L${level.id} train should still depart`);
  assert(won.win, `L${level.id} scripted plan should win (${line(won)})`);
  assert(
    won.features.filter((feature) => feature.target).every((feature) => feature.result === "missed"),
    `L${level.id} target boarded`,
  );
}

const nothing = play(1, []);
assert(!nothing.win && nothing.features[0].result === "boarded", "level 1 with no gate should let the target ship");

const ticketOnly = play(1, [{ gate: "ticket", lane: 0, slot: 2 }]);
assert(!ticketOnly.win, "a ticket alone should not stop level 1");

const undone = createRun(1);
assert(place(undone, "review", 0, 2).ok, "place review");
assert(budgetLeft(undone) === 1, "budget spent");
assert(remove(undone, 0, 2).ok, "remove during setup");
assert(budgetLeft(undone) === 2, "budget refunded");
for (let t = 0; t < 8; t += 1 / 30) step(undone, 1 / 30);
assert(undone.phase === "running", "setup should end");
assert(!remove(undone, 0, 1).ok, "cannot lift a gate after the setup window");

let save = emptySave();
save = applyClear(save, 1, 900);
assert(save.unlocked === 2, `beating level 1 should unlock 2, got ${save.unlocked}`);
save = applyClear(save, 1, 100);
assert(save.best[1] === 900, "lower score should not replace best");
save = applyClear(save, 5, 1500);
assert(save.cleared === true, "beating the last departure should mark cleared");
assert(save.unlocked === 2, "there is no level 6");

if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log("\nAll five departures can be held, and level 1 unlocks level 2.");
