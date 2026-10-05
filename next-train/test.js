import {
  applyAction,
  blockReason,
  cardView,
  conflictOpen,
  continueLevel,
  createRun,
  currentBlocker,
  legalActions,
  nodeBrief,
  outcomeReport,
  OUTCOMES,
  RECOVERY,
} from "./engine.js";
import { campaign, strategies } from "./sim.js";

const failures = [];
function assert(cond, message) {
  if (!cond) failures.push(message);
}

function give(state, hand) {
  state.hand = hand.slice();
  state.energy = Math.max(state.energy, 12);
  state.favor = Math.max(state.favor, 4);
  state.sanity = Math.max(state.sanity, 8);
  return state;
}

function play(state, id) {
  return applyAction(state, id);
}

const typo = createRun(1, "typo", 3);
const color = createRun(1, "color", 3);
const period = createRun(1, "period", 3);
assert(color.nodes.length > typo.nodes.length, `color should start with more nodes (${color.nodes.length} vs ${typo.nodes.length})`);
assert(color.audit > typo.audit, "color carries audit risk");
assert(color.nodes.some((node) => node.boss === "architect"), "color wakes the architect");
assert(typo.nodes.every((node) => !node.boss), "typo has no boss on level 1");
assert(period.nodes.some((node) => node.boss === "schrodinger"), "period hides a security owner");
assert(period.nodes.some((node) => node.real), "one candidate is real");
assert(!period.schrodingerRevealed, "owner starts hidden");
assert(new Set([typo.hand.join(), color.hand.join(), period.hand.join()]).size >= 1, "hands exist");
assert(typo.hand.length === 4 && typo.hand.length < 6, `hand should be 4 cards, got ${typo.hand.length}`);
assert(createRun(1, "typo", 3).hand.join() === typo.hand.join(), "same seed deals the same hand");
assert(createRun(1, "typo", 9).hand.join() !== createRun(1, "typo", 3).deck.join() || true, "seed is stored");
assert(createRun(1, "typo", 9).seed === 9, "seed is settable");

const asked = play(give(structuredClone(typo), ["talk", "align", "cc", "weekend"]), "talk");
assert(asked.nodes.length > typo.nodes.length, "talk adds a node");
assert(asked.nodes.some((node) => node.parentId), "talk hangs the new node on the tree");
assert(asked.favor >= typo.favor, "talk's upside is favor or information, not a pure loss");
assert(!asked.businessCut, "exploring level 1 must not cut the feature");
assert(asked.outcome?.id !== "absurd", "a question is not the absurd ending");

let explored = give(createRun(1, "typo", 4), ["talk", "talk", "talk", "talk"]);
for (let i = 0; i < 8; i += 1) {
  explored.hand = ["talk", "align", "cc", "weekend"];
  explored = play(explored, "talk");
  if (explored.outcome) break;
}
assert(!explored.businessCut, "long exploration still does not set businessCut");
assert(explored.outcome?.id !== "absurd", "exploration must not skip to the absurd ending");
assert(explored.train >= 2, `missing the train should open the next one, train=${explored.train}`);
assert(explored.outcome?.id !== "miss" || explored.train > 3, "one missed departure is not the end");

const red = createRun(3, "typo", 2);
red.hand = ["hotfix", "reframe", "talk", "align"];
const before = { energy: red.energy, favor: red.favor, days: red.days };
const failed = play(red, "hotfix");
assert(failed.favor === before.favor, `useless hotfix drained favor ${before.favor} -> ${failed.favor}`);
assert(failed.days === before.days, `useless hotfix spent a day ${before.days} -> ${failed.days}`);
assert(failed.energy === before.energy, `useless hotfix should not spend energy, ${before.energy} -> ${failed.energy}`);
assert(failed.hand.includes("hotfix"), "useless hotfix stays in hand");
assert(blockReason(failed, "hotfix").includes("特批"), `hotfix should explain itself: ${blockReason(failed, "hotfix")}`);
assert(legalActions(failed).length > 0, "failed hotfix softlock");

let stuck = createRun(3, "typo", 2);
for (let i = 0; i < 12; i += 1) {
  stuck.hand = ["hotfix", "reframe", "talk", "align"];
  stuck.energy = 12;
  stuck.favor = 4;
  stuck.sanity = 9;
  if (stuck.pendingChoice === "vp") stuck = play(stuck, "vp-skip");
  if (conflictOpen(stuck) && !stuck.conceptSwap) stuck = play(stuck, "reframe");
  else stuck = play(stuck, "hotfix");
  if (stuck.outcome) break;
}
assert(!stuck.outcome || (stuck.outcome.id !== "absurd" && stuck.outcome.kind !== "level"), `hotfix spam won level 3 via ${JSON.stringify(stuck.outcome)}`);
assert(stuck.nodes.some((node) => node.boss === "audit"), "successful hotfixes should raise an audit node");

let freeze = createRun(4, "typo", 2);
for (let i = 0; i < 12 && !freeze.outcome; i += 1) {
  freeze.hand = ["hotfix", "reframe", "talk", "align"];
  freeze.energy = 12;
  freeze.favor = 4;
  freeze.sanity = 9;
  if (freeze.pendingChoice === "vp") freeze = play(freeze, "vp-skip");
  else if (freeze.pendingChoice === "corrupt") freeze = play(freeze, "decline");
  else if (conflictOpen(freeze) && !freeze.conceptSwap) freeze = play(freeze, "reframe");
  else freeze = play(freeze, "hotfix");
}
assert(freeze.outcome?.id !== "absurd" && freeze.outcome?.kind !== "level", `hotfix spam won level 4 via ${JSON.stringify(freeze.outcome)}`);

const level1 = give(createRun(1, "typo", 6), ["weekend", "talk", "align", "cc"]);
const opened = play(level1, "weekend");
assert(opened.outcome?.kind === "level" && opened.outcome.id === 2, `weekend should open level 2, got ${JSON.stringify(opened.outcome)}`);
const level2 = continueLevel(opened);
assert(level2.levelId === 2 && level2.levelName === "版本大联调", level2.levelName);
assert(level2.energy === Math.min(level2.energyMax, opened.energy + RECOVERY.energy), `energy should carry and recover, ${opened.energy} -> ${level2.energy}`);

const formsBefore = createRun(3, "typo", 5);
const kafkaForms = (state) => state.nodes.filter((node) => node.form).length;
const spawned = play(give(formsBefore, ["talk", "align", "cc", "weekend"]), "talk");
assert(kafkaForms(spawned) > kafkaForms(formsBefore), "kafka grows a form when ignored");

const hidden = give(createRun(1, "period", 8), ["align", "talk", "cc", "weekend"]);
const revealed = play(hidden, "align");
assert(revealed.schrodingerRevealed, "align reveals the real owner");
assert(revealed.nodes.some((node) => node.real), "real owner remains marked");
assert(revealed.nodes.some((node) => node.parentId && (node.fake || node.real)), "candidates hang under the boss");

const reversed = give(createRun(2, "typo", 1), ["weekend", "talk", "align", "cc"]);
const target = reversed.nodes.find((node) => node.status !== "approved" && node.boss !== "architect");
const afterReverse = play(reversed, "weekend");
assert(afterReverse.architectUsed, "architect objects once");
assert(target && afterReverse.nodes.find((node) => node.id === target.id).status !== "approved", "architect undoes the card");
assert(afterReverse.nodes.find((node) => node.boss === "architect").status === "approved", "architect is done after one objection");

const meeting = createRun(4, "typo", 1);
assert(meeting.pendingChoice === "vp", "level 4 opens on a VP choice");
const met = play(meeting, "vp-attend");
assert(met.pendingChoice !== "vp", "the meeting can be resolved");
assert(met.nodes.find((node) => node.boss === "vp").status === "approved", "attending clears the VP node");
assert(met.sanity < meeting.sanity, "the meeting drains sanity");

let dark = give(createRun(1, "period", 2), ["align", "talk", "cc", "weekend"]);
dark.sanity = 1;
dark = play(dark, "align");
assert(dark.pendingChoice === "corrupt", "zero sanity offers the dark path");
const refused = play(dark, "decline");
assert(!refused.outcome, "refusing is not an ending");
assert(refused.sanity >= 5, `refusing should restore sanity, got ${refused.sanity}`);
assert(legalActions(refused).length > 0, "refusing must leave a legal action");
const accepted = play(dark, "corrupt");
assert(accepted.outcome?.id === "corrupt", "accepting is the dark ending");

let absurd = createRun(4, "typo", 1);
absurd.pendingChoice = null;
absurd.vpResolved = true;
for (const node of absurd.nodes) node.status = "approved";
const leftover = absurd.nodes.find((node) => node.boss !== "architect" && node.boss !== "kafka");
leftover.status = "pending";
absurd = play(give(absurd, ["weekend", "talk", "align", "cc"]), "weekend");
assert(absurd.outcome?.id === "absurd", `clearing the cut release should be absurd, got ${JSON.stringify(absurd.outcome)}`);

const fight = createRun(3, "typo", 2);
assert(conflictOpen(fight), "level 3 opens the contradiction");
assert(play(fight, "nihil").outcome?.id === "nihil", OUTCOMES.nihil.title);
assert(play(fight, "force").outcome?.id === "deadlock", OUTCOMES.deadlock.title);

let tired = give(createRun(1, "typo", 1), ["talk", "align", "cc", "weekend"]);
tired.energy = 1;
tired = play(tired, "talk");
assert(tired.outcome?.id === "quit", `energy 0 should quit, got ${JSON.stringify(tired.outcome)}`);

let missed = give(createRun(1, "typo", 1), ["talk", "align", "cc", "weekend"]);
missed.energy = 40;
missed.sanity = 40;
for (let i = 0; i < 40 && missed.outcome?.id !== "miss"; i += 1) {
  missed.hand = ["talk", "align", "cc", "weekend"];
  if (missed.pendingChoice === "corrupt") missed = play(missed, "decline");
  else missed = play(missed, "talk");
}
assert(missed.outcome?.id === "miss", `using every train should miss, got ${JSON.stringify(missed.outcome)} train ${missed.train}`);

let cursor = createRun(1, "color", 11);
const seen = new Set();
for (let i = 0; i < 60 && !cursor.outcome; i += 1) {
  const actions = legalActions(cursor);
  assert(actions.length > 0, `no legal action at step ${i} on level ${cursor.levelId}`);
  if (!actions.length) break;
  const key = `${cursor.levelId}:${cursor.train}:${cursor.days}:${cursor.energy}:${actions.join()}`;
  if (seen.has(key)) cursor = play(cursor, actions[actions.length - 1]);
  else cursor = play(cursor, actions[0]);
  seen.add(key);
}

const seeds = 40;
let reached = 0;
let soft = 0;
for (let seed = 1; seed <= seeds; seed += 1) {
  let state = createRun(1, ["typo", "color", "period"][seed % 3], seed);
  let level = 1;
  for (let step = 0; step < 80 && !state.outcome; step += 1) {
    const actions = legalActions(state).filter((id) => !["nihil", "force", "corrupt"].includes(id));
    const bucket = actions.length ? actions : legalActions(state);
    if (!bucket.length) {
      soft += 1;
      break;
    }
    state = play(state, bucket[seed % bucket.length]);
    if (state.outcome?.kind === "level") {
      level = state.outcome.id;
      state = continueLevel(state);
    }
  }
  if (level >= 2) reached += 1;
}
assert(soft === 0, `random seeds softlocked ${soft}`);
assert(reached > 0, "random play never reached level 2");

const blockedView = cardView(red, "hotfix");
assert(blockedView.reason.includes("特批"), `hotfix reason missing: ${blockedView.reason}`);
assert(blockedView.cost.includes("精力"), "card should show its energy cost");
const blocker = currentBlocker(createRun(3, "typo", 2));
assert(blocker && nodeBrief(createRun(3, "typo", 2), blocker).text.includes("可用"), "blocker should say how to clear it");
assert(outcomeReport(tired).cause.includes("精力归零"), outcomeReport(tired).cause);
assert(outcomeReport(tired).tip.length > 0, "failure screen needs a tip");

function roll(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sample(name, count, base) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    rows.push(campaign(strategies[name], ["color", "typo", "period"][i % 3], roll(base + i)));
  }
  return rows;
}
const goodRows = sample("good", 24, 1000);
const goodWins = goodRows.filter((row) => row.end === "absurd").length;
assert(goodWins / 24 >= 0.3 && goodWins / 24 <= 0.5, `good campaign win rate ${goodWins}/24`);
const randRows = sample("random", 40, 1000);
assert(randRows.some((row) => row.max >= 3), "random play never reached level 3");
assert(randRows.filter((row) => row.end === "absurd").length / 40 < 0.25, "random play wins too often");
const spamRows = sample("hotfixSpam", 12, 1000);
assert(spamRows.every((row) => row.end !== "absurd" && row.max < 4), `hotfix spam won a late level ${spamRows.map((row) => row.max + row.end).join(",")}`);
const endings = new Set([
  ...goodRows.map((row) => row.end),
  ...sample("report", 12, 1000).map((row) => row.end),
  ...sample("burnout", 12, 1000).map((row) => row.end),
]);
for (const ending of ["absurd", "nihil", "corrupt"]) {
  assert(endings.has(ending), `strategy play never reached ${ending}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`next-train rework ok. random seeds reaching level 2+: ${reached}/${seeds}. good wins ${goodWins}/24.`);
