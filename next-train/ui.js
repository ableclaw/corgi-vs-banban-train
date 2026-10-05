import {
  applyAction,
  canPlay,
  CARDS,
  CHANGES,
  conflictOpen,
  continueLevel,
  createRun,
  legalActions,
  OUTCOMES,
  stageLabel,
} from "./engine.js";

const pick = document.querySelector("#pick");
const play = document.querySelector("#play");
const modal = document.querySelector("#modal");
const picks = document.querySelector("#picks");
const seedInput = document.querySelector("#seed-input");
const STATUS = {
  pending: "待审批",
  read: "原则上不反对",
  approved: "已通过",
  blocked: "卡住",
};

let state = null;
const params = new URLSearchParams(location.search);
const debug = params.has("debug");
const initialSeed = Math.max(1, Number(params.get("seed")) || 1);
seedInput.value = String(initialSeed);

for (const change of CHANGES) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pick";
  button.dataset.change = change.id;
  const title = document.createElement("b");
  title.textContent = change.title;
  const detail = document.createElement("small");
  detail.textContent = change.blurb;
  button.append(title, detail);
  button.addEventListener("click", () => begin(change.id, 1, Number(seedInput.value) || 1));
  picks.appendChild(button);
}

document.querySelector("#btn-nihil").addEventListener("click", () => act("nihil"));
document.querySelector("#btn-force").addEventListener("click", () => act("force"));

function begin(changeId, levelId, nextSeed = Number(seedInput.value) || 1) {
  state = createRun(levelId, changeId, nextSeed);
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
  document.querySelector("#kicker").textContent = `!42 开放中 · ${state.levelName} · 种子 ${state.seed}`;
  document.querySelector("#mr-title").textContent = state.title;
  document.querySelector("#stat-level").textContent = `第 ${state.levelId} 关 · ${state.levelName}`;
  const days = document.querySelector("#stat-days");
  days.textContent = `距发车 ${state.days} 天`;
  days.classList.toggle("hot", state.days <= 2);
  document.querySelector("#stat-energy").textContent = `精力 ${state.energy}`;
  const sanity = document.querySelector("#stat-sanity");
  sanity.textContent = `理智 ${state.sanity}`;
  sanity.classList.toggle("hot", state.sanity <= 3);
  document.querySelector("#stat-favor").textContent = `人情 ${state.favor}`;
  document.querySelector("#stat-audit").textContent = `审计风险 ${state.audit}`;
  document.querySelector("#stat-train").textContent = `第 ${state.train} / ${state.maxTrains} 班`;
  document.querySelector("#stat-stage").textContent = stageLabel(state);
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
  root.className = "root";
  const rootLabel = document.createElement("span");
  rootLabel.className = "who";
  rootLabel.textContent = `!42 ${state.title}`;
  root.append(rootLabel, renderBranch(null));
  tree.appendChild(root);

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
  conflict.hidden = !conflictOpen(state) || !!state.outcome || !!state.pendingChoice;
  document.querySelector("#conflict-text").textContent = "安全要明细行为日志，合规禁止记录任何行为。这个风险谁来背？两边原则上都不反对，字都签不下去。";

  const cards = document.querySelector("#cards");
  cards.innerHTML = "";
  state.hand.forEach((id, index) => {
    const card = CARDS.find((item) => item.id === id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.action = id;
    button.dataset.index = String(index);
    button.disabled = !canPlay(state, id);
    const name = document.createElement("b");
    name.textContent = card.name;
    const detail = document.createElement("small");
    detail.textContent = card.detail;
    const cost = document.createElement("em");
    const bits = [`精力 ${card.energy}`];
    if (card.favor) bits.push(`人情 ${card.favor}`);
    if (card.sanity) bits.push(`理智 ${card.sanity}`);
    bits.push("1 天");
    cost.textContent = bits.join(" · ");
    button.append(name, detail, cost);
    button.addEventListener("click", () => act(id));
    cards.appendChild(button);
  });

  if (state.pendingChoice === "corrupt" && !state.outcome) showCorrupt();
  else if (state.pendingChoice === "vp" && !state.outcome) showVp();
  else if (state.outcome) showOutcome();
  else {
    modal.hidden = true;
    modal.innerHTML = "";
  }
}

function renderBranch(parentId) {
  const list = document.createElement("ul");
  const children = state.nodes.filter((node) => (node.parentId ?? null) === parentId);
  for (const node of children) {
    const item = document.createElement("li");
    item.dataset.status = node.status;
    if (node.boss) item.dataset.boss = node.boss;
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = labelFor(node);
    const badge = document.createElement("span");
    badge.className = `badge ${node.status}`;
    badge.textContent = badgeFor(node);
    item.append(who, badge);
    const nested = renderBranch(node.id);
    if (nested.childElementCount) item.appendChild(nested);
    list.appendChild(item);
  }
  return list;
}

function labelFor(node) {
  if ((node.fake || node.real) && !state.schrodingerRevealed) return `${node.name} · 可能的负责人`;
  if (node.real && state.schrodingerRevealed) return `${node.name} · 真负责人`;
  if (node.hidden && !node.revealed) return `${node.name} · 要求未公开`;
  return node.name;
}

function badgeFor(node) {
  if ((node.fake || node.real) && !state.schrodingerRevealed) return "未揭晓";
  return STATUS[node.status] || node.status;
}

function showCorrupt() {
  modal.hidden = false;
  modal.innerHTML = "";
  const card = document.createElement("div");
  card.className = "modal-card";
  card.innerHTML = "<p class='kicker'>理智见底</p><h3>那你来做流程负责人吧</h3>";
  const body = document.createElement("p");
  body.textContent = "大老板看着你空掉的理智。你可以坐到门禁那一侧，也可以把位子推回去，理智会回来一点。";
  const actions = document.createElement("div");
  actions.className = "choices";
  actions.append(choice("我来加一道卡点", "corrupt", true), choice("我还是要把这一行送上车", "decline", false));
  card.append(body, actions);
  modal.appendChild(card);
}

function showVp() {
  modal.hidden = false;
  modal.innerHTML = "";
  const card = document.createElement("div");
  card.className = "modal-card";
  card.innerHTML = "<p class='kicker'>VP 评审会</p><h3>十五分钟，只讲这一行</h3>";
  const body = document.createElement("p");
  body.textContent = "助理已经在问：这个风险谁来背？去开会掉理智，但能放过一个节点。让助理代开，纪要里没有决议。不去，节点还在。";
  const actions = document.createElement("div");
  actions.className = "choices";
  actions.append(
    choice("去开会", "vp-attend", true),
    choice("让助理代开", "vp-delegate", false),
    choice("这个会我不去", "vp-skip", false),
  );
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
    const info = continueLevel(state);
    card.innerHTML = "<p class='kicker'>合进这班了</p><h3>这一行先上车了</h3>";
    const body = document.createElement("p");
    body.textContent = `下一关是「${info.levelName}」。精力 ${info.energy}，理智 ${info.sanity}，还带着你。`;
    const actions = document.createElement("div");
    actions.className = "choices";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "primary";
    next.dataset.level = String(outcome.id);
    next.textContent = `进入${info.levelName}`;
    next.addEventListener("click", () => {
      state = info;
      modal.hidden = true;
      modal.innerHTML = "";
      render();
    });
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
    legalActions: () => legalActions(state),
  };
}
