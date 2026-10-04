import { GATES } from "./catalog.js";
import { budgetLeft, createRun, place, remove, step } from "./engine.js";
import { LEVELS } from "./levels.js";
import { applyClear, emptySave, loadSave, writeSave } from "./save.js";

const REASONS = {
  empty: "这种牌没有了",
  occupied: "这个格子已经有牌",
  locked: "车已经在走，牌不能拿起来",
  departed: "这班已经开了",
  slot: "这里不能放",
  lane: "这条轨道没有",
  late: "它已经走过这一格了",
};

const screens = {
  title: document.querySelector("#screen-title"),
  select: document.querySelector("#screen-select"),
  play: document.querySelector("#screen-play"),
};
const board = document.querySelector("#board");
const palette = document.querySelector("#palette");
const roster = document.querySelector("#roster");
const modal = document.querySelector("#modal");
const toast = document.querySelector("#toast");
const levelList = document.querySelector("#level-list");
const startButton = document.querySelector("#btn-start");

let mode = "title";
let run = null;
let selected = null;
let history = [];
let settled = false;
let briefing = false;
let toastUntil = 0;
let lastTs = 0;

const params = new URLSearchParams(location.search);
const debug = params.has("debug");

function show(next) {
  mode = next;
  for (const [name, el] of Object.entries(screens)) el.hidden = name !== next;
  if (next !== "play") {
    briefing = false;
    document.querySelector("#brief").hidden = true;
  }
  if (next === "title") paintStart();
  if (next === "select") renderSelect();
}

function targetNames(level) {
  return level.features.filter((feature) => feature.target).map((feature) => feature.name);
}

function paintStart() {
  const save = loadSave();
  const level = LEVELS[Math.max(0, save.unlocked - 1)];
  startButton.textContent = save.unlocked > 1 ? `继续第 ${level.id} 步 · ${level.name}` : "从「需求」开始";
}

function renderSelect() {
  const save = loadSave();
  levelList.innerHTML = "";
  for (const level of LEVELS) {
    const locked = level.id > save.unlocked;
    const best = Number(save.best[level.id]) || 0;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `level-card${locked ? " locked" : ""}`;
    card.disabled = locked;
    const lv = document.createElement("span");
    lv.className = "lv";
    lv.textContent = `第 ${level.id} 步${locked ? " · 未解锁" : ""}`;
    const title = document.createElement("strong");
    title.textContent = level.name;
    const en = document.createElement("em");
    en.textContent = `要留下 ${targetNames(level).join("、")}`;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = locked ? "先拦住上一步" : best ? `已拦住 · ${best} 分` : level.brief;
    card.append(lv, title, en, meta);
    card.addEventListener("click", () => startLevel(level.id));
    levelList.appendChild(card);
  }
}

function say(text) {
  toast.hidden = false;
  toast.textContent = text;
  toastUntil = performance.now() + 1600;
}

function startLevel(id) {
  run = createRun(id);
  selected = run.inventory.find((item) => item.count > 0)?.id ?? null;
  history = [];
  settled = false;
  briefing = true;
  modal.hidden = true;
  modal.innerHTML = "";
  buildBoard();
  buildPalette();
  const targets = targetNames(run.level);
  document.querySelector("#brief-kicker").textContent = `v2.0 · 第 ${run.level.id} 步`;
  document.querySelector("#brief-title").textContent = run.level.name;
  document.querySelector("#brief-text").textContent = run.level.brief;
  document.querySelector("#brief-goal").textContent = `这一步要留下：${targets.join("、")}`;
  document.querySelector("#brief").hidden = false;
  show("play");
  paint();
}

function buildBoard() {
  board.innerHTML = "";
  const trainRow = document.createElement("div");
  trainRow.className = "train-row";
  const label = document.createElement("div");
  label.className = "train-label";
  label.textContent = "v2.0 · 到点就开";
  const rail = document.createElement("div");
  rail.className = "train-rail";
  const train = document.createElement("div");
  train.id = "train";
  train.className = "train";
  for (const car of run.level.train) {
    const span = document.createElement("span");
    span.textContent = car;
    train.appendChild(span);
  }
  rail.appendChild(train);
  trainRow.append(label, rail);
  board.appendChild(trainRow);

  for (let lane = 0; lane < run.laneCount; lane += 1) {
    const feature = run.features.find((item) => item.lane === lane);
    const row = document.createElement("div");
    row.className = `lane${feature?.target ? " target" : ""}`;
    const name = document.createElement("div");
    name.className = "fname";
    const strong = document.createElement("strong");
    strong.textContent = feature ? feature.name : `轨道 ${lane + 1}`;
    const em = document.createElement("em");
    em.textContent = feature?.target ? "别上这班" : "可以上";
    name.append(strong, em);
    const track = document.createElement("div");
    track.className = "rail";
    track.style.gridTemplateColumns = `repeat(${run.level.slots + 1}, minmax(0, 1fr))`;
    for (let slot = 0; slot < run.level.slots; slot += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.lane = String(lane);
      cell.dataset.slot = String(slot);
      cell.addEventListener("click", () => onCell(lane, slot));
      track.appendChild(cell);
    }
    const station = document.createElement("div");
    station.className = "station";
    station.textContent = "上线站";
    track.appendChild(station);
    if (feature) {
      const token = document.createElement("div");
      token.className = `token${feature.target ? " is-target" : ""}`;
      token.dataset.feature = feature.id;
      token.textContent = feature.target ? `${feature.name} · 别上这班` : `${feature.name} · 可以上`;
      track.appendChild(token);
    }
    row.append(name, track);
    board.appendChild(row);
  }
}

function buildPalette() {
  palette.innerHTML = "";
  run.inventory.forEach((item, index) => {
    const gate = GATES[item.id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gate";
    button.dataset.gate = item.id;
    const title = document.createElement("b");
    title.textContent = `${index + 1}. ${gate.name}`;
    const detail = document.createElement("small");
    detail.textContent = gate.detail;
    const count = document.createElement("em");
    count.dataset.count = item.id;
    button.append(title, detail, count);
    button.addEventListener("click", () => {
      selected = item.id;
      paint();
    });
    palette.appendChild(button);
  });
}

function onCell(lane, slot) {
  if (!run || run.phase === "departed") return;
  const occupied = run.obstacles.some((item) => item.lane === lane && item.slot === slot);
  if (occupied) {
    const result = remove(run, lane, slot);
    if (!result.ok) say(REASONS[result.reason] || "不能拿起");
    else history = history.filter((item) => !(item.lane === lane && item.slot === slot));
    paint();
    return;
  }
  if (!selected) {
    say("先点一张流程牌");
    return;
  }
  const result = place(run, selected, lane, slot);
  if (!result.ok) say(REASONS[result.reason] || "放不下去");
  else history.push({ lane, slot });
  paint();
}

function undo() {
  if (!run || run.phase !== "setup") {
    say("只有布置窗口能撤回");
    return;
  }
  const last = history.pop();
  if (!last) return;
  remove(run, last.lane, last.slot);
  paint();
}

function featureStatus(feature) {
  if (feature.result === "boarded") return feature.target ? "上车了" : "上车了";
  if (feature.result === "missed") return "没赶上";
  if (feature.platform) return "已在月台";
  if (feature.blocked) return `被${feature.blocked}拖住`;
  return "还在路上";
}

function paint() {
  if (!run) return;
  const level = run.level;
  document.querySelector("#lv-kicker").textContent = `v2.0 · 第 ${level.id} 步`;
  document.querySelector("#lv-name").textContent = level.name;
  document.querySelector("#mission").textContent = `要留下：${targetNames(level).join("、")}`;
  document.querySelector("#lv-blurb").textContent = level.brief;
  document.querySelector("#hint").textContent = level.hint;
  const sec = Math.max(0, run.departIn);
  const clock = document.querySelector("#clock");
  clock.textContent = sec < 10 ? sec.toFixed(1) : String(Math.ceil(sec));
  document.querySelector("#clock-wrap").classList.toggle("urgent", sec < 5 && run.phase !== "departed");
  document.querySelector("#phase-label").textContent = briefing
    ? "先看要留下谁"
    : run.phase === "setup" ? `布置窗口 ${Math.ceil(run.setupLeft)} 秒，牌还能拿起` :
    run.phase === "running" ? "车在走。空位还能补牌，不能再拿起" :
    "已准点发车";
  document.querySelector("#budget").textContent = String(budgetLeft(run));
  const spent = level.inventory.reduce((sum, item) => sum + item.count, 0) - budgetLeft(run);
  document.querySelector("#used-label").textContent = `已放 ${spent} 张`;

  const train = document.querySelector("#train");
  if (train) {
    const progress = 1 - run.departIn / run.total;
    train.style.left = `${Math.max(0, Math.min(0.72, progress * 0.72)) * 100}%`;
    train.classList.toggle("gone", run.phase === "departed");
  }

  for (const cell of board.querySelectorAll(".cell")) {
    const lane = Number(cell.dataset.lane);
    const slot = Number(cell.dataset.slot);
    const obstacle = run.obstacles.find((item) => item.lane === lane && item.slot === slot);
    const feature = run.features.find((item) => item.lane === lane);
    const passed = feature && run.phase !== "setup" && feature.x >= (slot + 1) * run.slotW - 0.05;
    cell.className = "cell";
    if (obstacle) {
      const gate = GATES[obstacle.gate];
      cell.classList.add("filled", gate.effect);
      cell.textContent = gate.name;
    } else {
      cell.textContent = passed ? "走过了" : "";
    }
    if (passed && !obstacle) cell.classList.add("passed");
    const who = feature ? feature.name : `轨道${lane + 1}`;
    cell.setAttribute("aria-label", `${who} 第 ${slot + 1} 格`);
  }

  for (const token of board.querySelectorAll(".token")) {
    const feature = run.features.find((item) => item.id === token.dataset.feature);
    if (!feature) continue;
    token.style.left = `calc(${feature.x}% + 6px)`;
  }

  roster.innerHTML = "";
  for (const feature of run.features) {
    const li = document.createElement("li");
    const status = featureStatus(feature);
    li.textContent = `${feature.name} · ${feature.target ? "别上这班" : "可以上"} · ${status}`;
    if (feature.result === "missed" || (feature.blocked && feature.target)) li.className = "good";
    else if (feature.result === "boarded" && feature.target) li.className = "bad";
    else if (feature.platform && feature.target) li.className = "wait";
    roster.appendChild(li);
  }

  for (const button of palette.querySelectorAll(".gate")) {
    const item = run.inventory.find((entry) => entry.id === button.dataset.gate);
    button.classList.toggle("on", selected === button.dataset.gate);
    button.disabled = !item || item.count <= 0;
    const count = button.querySelector("em");
    count.textContent = item ? `还剩 ${item.count}` : "";
  }

  if (toastUntil && performance.now() > toastUntil) toast.hidden = true;
  if (run.phase === "departed") finish();
}

function resultLine(state) {
  const boarded = state.features.filter((feature) => feature.result === "boarded").map((feature) => feature.name);
  const missed = state.features.filter((feature) => feature.result === "missed").map((feature) => feature.name);
  const parts = [];
  if (missed.length) parts.push(`${missed.join("、")}没赶上`);
  if (boarded.length) parts.push(`${boarded.join("、")}上车了`);
  parts.push("这班准点开了");
  parts.push(state.win ? "你拦住了" : "没拦住");
  return `${parts.join("。")}。`;
}

function finish() {
  if (settled) return;
  settled = true;
  if (run.win) writeSave(applyClear(loadSave(), run.level.id, run.score));
  const last = run.level.id >= LEVELS.length;
  modal.hidden = false;
  modal.dataset.result = run.win ? "win" : "lose";
  const card = document.createElement("div");
  card.className = `modal-card${run.win ? " win" : ""}`;
  const kicker = document.createElement("p");
  kicker.className = "eyebrow";
  kicker.textContent = `v2.0 · ${run.level.name}`;
  const title = document.createElement("h3");
  title.textContent = run.win ? (last ? "拦住了，车也开走了" : "拦住了") : "没拦住";
  const body = document.createElement("p");
  body.className = "result-line";
  body.textContent = resultLine(run);
  const score = document.createElement("p");
  score.textContent = run.win ? `分数 ${run.score}。越早拦住，分越高。` : "车还是准点开了。再布置一次。";
  const actions = document.createElement("div");
  actions.className = "actions";
  if (run.win && !last) {
    const next = document.createElement("button");
    next.type = "button";
    next.className = "primary";
    next.dataset.act = "next";
    next.textContent = "下一步";
    actions.appendChild(next);
  }
  const retry = document.createElement("button");
  retry.type = "button";
  retry.dataset.act = "retry";
  retry.textContent = "再布置一次";
  const back = document.createElement("button");
  back.type = "button";
  back.dataset.act = "select";
  back.textContent = "看这五步";
  actions.append(retry, back);
  card.append(kicker, title, body, score, actions);
  modal.innerHTML = "";
  modal.appendChild(card);
}

function frame(ts) {
  const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 1 / 60);
  lastTs = ts;
  if (mode === "play" && run && !briefing && run.phase !== "departed") step(run, dt);
  if (mode === "play" && run) paint();
  requestAnimationFrame(frame);
}

document.querySelector("#btn-brief").addEventListener("click", () => {
  briefing = false;
  document.querySelector("#brief").hidden = true;
  paint();
});
document.querySelector("#btn-start").addEventListener("click", () => startLevel(loadSave().unlocked || 1));
document.querySelector("#btn-levels").addEventListener("click", () => show("select"));
document.querySelector("#btn-select-back").addEventListener("click", () => show("title"));
document.querySelector("#btn-giveup").addEventListener("click", () => show("select"));
document.querySelector("#btn-reset").addEventListener("click", () => {
  if (!window.confirm("清空这台设备上的班次进度？")) return;
  writeSave(emptySave());
  renderSelect();
});
modal.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !run) return;
  if (button.dataset.act === "retry") startLevel(run.level.id);
  else if (button.dataset.act === "next") startLevel(Math.min(LEVELS.length, run.level.id + 1));
  else if (button.dataset.act === "select") show("select");
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Enter" && mode === "title") startLevel(loadSave().unlocked || 1);
  if (mode !== "play" || !run) return;
  if (event.code === "KeyZ") undo();
  const num = Number(event.key);
  if (num >= 1 && num <= run.inventory.length) {
    selected = run.inventory[num - 1].id;
    paint();
  }
});

paintStart();
requestAnimationFrame(frame);

if (debug) {
  window.__train = {
    get run() {
      return run;
    },
    startLevel,
    loadSave,
  };
}
