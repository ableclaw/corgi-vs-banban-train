import { applyAction, canPlay, conflictOpen, createRun, OUTCOMES } from "./engine.js";

const failures = [];
function assert(cond, message) {
  if (!cond) failures.push(message);
}

function play(state, ...ids) {
  let next = state;
  for (const id of ids) next = applyAction(next, id);
  return next;
}

const fresh = createRun(1, "typo");
assert(fresh.nodes.length === 1, "level 1 starts with one gatekeeper");
assert(fresh.nodes[0].name === "文案负责人", fresh.nodes[0].name);
assert(fresh.days === 6 && fresh.energy === 10, "level 1 budget");

const asked = applyAction(fresh, "talk");
assert(asked.nodes.length === 3, `talk should grow 1 → 3, got ${asked.nodes.length}`);
assert(asked.nodes.every((node) => node.status !== "approved"), "talking must not approve");
assert(asked.stage === "three", asked.stage);
assert(!asked.outcome, "growing the tree is not the end");

const cross = applyAction(asked, "talk");
assert(cross.stage === "cross", cross.stage);
assert(cross.nodes.some((node) => node.name.includes("流程卡夫卡")), "kafka should appear");
assert(cross.nodes.some((node) => node.name.includes("薛定谔")), "schrodinger should appear");
assert(cross.nodes.some((node) => node.name.includes("影子架构师")), "architect should appear");
assert(conflictOpen(cross), "security and compliance should contradict");
assert(cross.log.some((line) => line.text.includes("这个风险谁来背")), "brush-off line");
assert(cross.log.some((line) => line.text.includes("补充材料")), "kafka asks for materials");

const nihil = applyAction(cross, "nihil");
assert(nihil.outcome?.id === "nihil", "compliance report is the nihil ending");
assert(OUTCOMES.nihil.text.includes("100"), "nihil copy");

const force = applyAction(cross, "force");
assert(force.outcome?.id === "deadlock", "forcing the merge deadlocks");

const level2 = applyAction(fresh, "weekend");
assert(level2.outcome?.kind === "level" && level2.outcome.id === 2, `weekend on the single gate should open level 2, got ${JSON.stringify(level2.outcome)}`);
assert(level2.nodes.every((node) => node.status === "approved"), "the gatekeeper passed");

const next = createRun(2, "typo");
assert(next.nodes.length === 3, "level 2 starts with three sign-offs");
assert(next.days === 5 && next.days < fresh.days, "level 2 has less time");
const cleared2 = play(next, "weekend", "weekend", "weekend");
assert(cleared2.outcome?.id === 3, `three weekends should reach level 3, got ${JSON.stringify(cleared2.outcome)}`);

const red = createRun(3, "color");
assert(red.nodes.length > next.nodes.length, "level 3 has more sign-offs");
assert(red.days < next.days, "level 3 is shorter");
assert(conflictOpen(red), "level 3 opens on the contradiction");
const held = applyAction(red, "hotfix");
assert(!held.outcome, "hotfix cannot skip a live compliance fight");
assert(held.log.some((line) => line.text.includes("按住")), held.log.at(-1)?.text);
const toFour = play(red, "reframe", "hotfix");
assert(toFour.outcome?.id === 4, `reframe then hotfix should board level 4, got ${JSON.stringify(toFour.outcome)}`);

const freeze = createRun(4, "color");
assert(freeze.days < red.days, "level 4 is the shortest");
assert(freeze.nodes.length > red.nodes.length, "level 4 has the longest list");
const absurd = play(freeze, "reframe", "hotfix");
assert(absurd.outcome?.id === "absurd", `level 4 merge is the absurd victory, got ${JSON.stringify(absurd.outcome)}`);

const late = play(fresh, "talk", "talk", "reframe", "hotfix");
assert(late.businessCut, "the button is cut once the train is close");
assert(late.outcome?.id === "absurd", `late hotfix is absurd, got ${JSON.stringify(late.outcome)}`);

const towardCorrupt = play(fresh, "talk", "talk", "talk", "cc", "cc");
assert(towardCorrupt.stage === "vp", towardCorrupt.stage);
assert(towardCorrupt.pendingChoice === "corrupt", "two CC at the VP meeting offers the dark ending");
const corrupt = applyAction(towardCorrupt, "corrupt");
assert(corrupt.outcome?.id === "corrupt", "accepting the process seat is the dark ending");

const broke = play(createRun(1, "period"), "talk", "talk", "weekend", "weekend", "talk", "talk");
assert(broke.outcome?.id === "quit", `spending all energy should quit, got ${JSON.stringify(broke.outcome)} energy ${broke.energy}`);

let waiting = createRun(1, "color");
while (!waiting.outcome && waiting.days > 0) {
  assert(canPlay(waiting, "talk"), "talk should stay available");
  waiting = applyAction(waiting, "talk");
}
assert(waiting.outcome?.id === "miss" || waiting.outcome?.id === "quit", `idling should fail the departure, got ${JSON.stringify(waiting.outcome)}`);

const aligned = applyAction(fresh, "align");
assert(aligned.nodes.length === 2, "alignment adds a person");
assert(aligned.nodes.some((node) => node.status === "read"), "alignment does not approve, it only says 原则上");
assert(!aligned.nodes.some((node) => node.status === "approved"), "align must not pass the node");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("next-train: level 1 clears into level 2, and all three endings are reachable.");
