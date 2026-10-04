import { applyAction, canPlay, CARDS, CHANGES, conflictOpen, createRun, OUTCOMES, STAGE_LABEL } from "./engine.js";

const pick = document.querySelector("#pick");
const play = document.querySelector("#play");
const modal = document.querySelector("#modal");
const picks = document.querySelector("#picks");
const STATUS = { pending: "待审批", read: "原则上不反对", approved: "已通过", blocked: "卡住" };

let state = null;
const debug = new URLSearchParams(location.search).has("debug");

for (const change of CHANGES) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pick";
  button.dataset.change = change.id;
  const title = document.createElement("b");
  title.textContent = change.title;
  const diff = document.createElement("small");
  diff.textContent = change.diff.replace("\n", "  ");
  button.append(title, diff);
  button.addEventListener("click", () => begin(change.id, 1));
  picks.appendChild(button);
}

document.querySelector("#btn-nihil").addEventListener("click", () => act("nihil"));
document.querySelector("#btn-force").addEventListener("click", () => act("force"));

function begin(changeId, levelId) {
  state = createRun(levelId, changeId);
  pick.hidden = true;
  play.hidden = false;
  modal.hidden = true;
  modal.innerHTML = "";
  render();
}

function act(actionId) {
  if (!state) return;
  state = applyAction(state, actionId);
  render();
}

function render() {
  if (!state) return;
  document.querySelector("#kicker").textContent = `!42 开放中 · ${state.levelName}`;
  document.querySelector("#mr-title").textContent = state.title;
  document.querySelector("#stat-level").textContent = `第 ${state.levelId} 关 · ${state.levelName}`;
  const days = document.querySelector("#stat-days");
  days.textContent = `距发车 ${state.days} 天`;
  days.classList.toggle("hot", state.days <= 2);
  document.querySelector("#stat-energy").textContent = `精力 ${state.energy}`;
  document.querySelector("#stat-favor").textContent = `人情 ${state.favor}`;
  document.querySelector("#stat-stage").textContent = STAGE_LABEL[state.stage];
  const diff = document.querySelector("#diff");
  diff.innerHTML = "";
  for (const line of state.diff.split("\n")) {
    const row = document.createElement("div");
    row.className = line.startsWith("+") ? "add" : "del";
    row.textContent = line;
    diff.appendChild(row);
  }

  const tree = document.querySelector("#tree");
  tree.innerHTML = "";
  const root = document.createElement("li");
  root.textContent = `一行改动 · ${state.title}`;
  tree.appendChild(root);
  for (const node of state.nodes) {
    const li = document.createElement("li");
    li.dataset.status = node.status;
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = node.name;
    const badge = document.createElement("span");
    badge.className = `badge ${node.status}`;
    badge.textContent = STATUS[node.status] || node.status;
    li.append(who, badge);
    tree.appendChild(li);
  }

  const feed = document.querySelector("#feed");
  feed.innerHTML = "";
  for (const line of state.log) {
    const block = document.createElement("article");
    block.className = "comment";
    const who = document.createElement("b");
    who.textContent = line.who;
    const text = document.createElement("p");
    text.textContent = line.text;
    block.append(who, text);
    feed.appendChild(block);
  }
  feed.scrollTop = feed.scrollHeight;

  const conflict = document.querySelector("#conflict");
  conflict.hidden = !conflictOpen(state) || !!state.outcome;
  document.querySelector("#conflict-text").textContent = "安全要明细行为日志，合规禁止记录任何行为。这个风险谁来背？原则上两边都不反对，也都签不了。";

  const cards = document.querySelector("#cards");
  cards.innerHTML = "";
  for (const card of CARDS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.action = card.id;
    button.disabled = !canPlay(state, card.id);
    const name = document.createElement("b");
    name.textContent = card.name;
    const detail = document.createElement("small");
    detail.textContent = card.detail;
    const cost = document.createElement("em");
    cost.textContent = `精力 ${card.energy}${card.favor ? ` · 人情 ${card.favor}` : ""} · 1 天`;
    button.append(name, detail, cost);
    button.addEventListener("click", () => act(card.id));
    cards.appendChild(button);
  }

  if (state.pendingChoice === "corrupt" && !state.outcome) showCorrupt();
  else if (state.outcome) showOutcome();
  else {
    modal.hidden = true;
    modal.innerHTML = "";
  }
}

function showCorrupt() {
  modal.hidden = false;
  modal.innerHTML = "";
  const card = document.createElement("div");
  card.className = "modal-card";
  card.innerHTML = "<p class='kicker'>大老板已读</p><h3>那你来做流程负责人吧</h3>";
  const body = document.createElement("p");
  body.textContent = "抄送了两次。大老板说下一班的门禁你来加。你可以继续追这一行，也可以坐到流程那一侧。";
  const actions = document.createElement("div");
  actions.className = "choices";
  actions.append(choice("我来加一道卡点", "corrupt", true), choice("我还是要把这一行送上车", "decline", false));
  card.append(body, actions);
  modal.appendChild(card);
}

function showOutcome() {
  const outcome = state.outcome;
  modal.hidden = false;
  modal.innerHTML = "";
  const card = document.createElement("div");
  card.className = "modal-card";
  card.dataset.outcome = outcome.id;
  if (outcome.kind === "level") {
    const info = createRun(outcome.id, state.changeId);
    card.innerHTML = `<p class="kicker">合进这班了</p><h3>这一行先上车了</h3>`;
    const body = document.createElement("p");
    body.textContent = `下一关是「${info.levelName}」。签字 ${info.nodes.length} 个，距发车 ${info.days} 天。`;
    const actions = document.createElement("div");
    actions.className = "choices";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "primary";
    next.dataset.level = String(outcome.id);
    next.textContent = `进入${info.levelName}`;
    next.addEventListener("click", () => begin(state.changeId, outcome.id));
    actions.appendChild(next);
    card.append(body, actions);
  } else {
    const info = OUTCOMES[outcome.id];
    card.innerHTML = `<p class="kicker">${info.kind === "ending" ? "结局" : "这班没了"}</p><h3></h3>`;
    card.querySelector("h3").textContent = info.title;
    const body = document.createElement("p");
    body.className = "result-line";
    body.textContent = info.text;
    const actions = document.createElement("div");
    actions.className = "choices";
    const again = document.createElement("button");
    again.type = "button";
    again.className = "primary";
    again.textContent = "再选一个改动";
    again.addEventListener("click", () => {
      state = null;
      play.hidden = true;
      pick.hidden = false;
      modal.hidden = true;
      modal.innerHTML = "";
    });
    actions.appendChild(again);
    card.append(body, actions);
  }
  modal.appendChild(card);
}

function choice(label, actionId, primary) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = primary ? "primary" : "choice";
  button.dataset.action = actionId;
  button.textContent = label;
  button.addEventListener("click", () => act(actionId));
  return button;
}

if (debug) {
  window.__next = {
    get state() {
      return state;
    },
    begin,
    act,
  };
}
