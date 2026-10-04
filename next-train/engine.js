/** 《下一班火车》— one-line MR, growing sign-offs, energy and favor. */

export const CHANGES = [
  { id: "color", title: "按钮改成品牌蓝", diff: "- color: #8c8c8c;\n+ color: #1677ff;" },
  { id: "typo", title: "文案少一个错别字", diff: "- 立即够买\n+ 立即购买" },
  { id: "period", title: "注释补一个句号", diff: "- // TODO 下个版本再说\n+ // TODO 下个版本再说。" },
];

export const STAGE_LABEL = {
  one: "1 位审批",
  three: "3 位审批",
  cross: "跨团队",
  vp: "VP 会议",
};

export const CARDS = [
  { id: "talk", name: "去问问", detail: "不会通过。对方会把签字名单加长。", energy: 1, favor: 0 },
  { id: "align", name: "拉通对齐", detail: "纪要很好看。原则上不反对，人变多了。", energy: 2, favor: 1 },
  { id: "cc", name: "向上管理 / CC大老板", detail: "抄送给大老板。有人会点头，你也会被看见。", energy: 1, favor: 2 },
  { id: "reframe", name: "偷换概念", detail: "把一行改动说成体验优化。", energy: 1, favor: 0 },
  { id: "hotfix", name: "Hotfix特批跳过", detail: "跳过剩下的签字。合规对峙时会先被按住。", energy: 3, favor: 2 },
  { id: "weekend", name: "周末午夜突击", detail: "自己把一个卡点的材料补完。", energy: 3, favor: 0 },
];

const BOSSES = {
  kafka: {
    name: "流程卡夫卡·合规总监",
    status: "blocked",
    line: "补充材料。原则上我不反对，但隐私不让记任何行为日志。",
  },
  schrodinger: {
    name: "薛定谔的负责人·安全专家",
    status: "blocked",
    line: "他人不在办公区。这个风险谁来背？原则上我不反对，但建议拉下合规。",
  },
  architect: {
    name: "影子架构师",
    status: "blocked",
    line: "技术洁癖。一行改动请先抽象成主题变量，这周评审不过。",
  },
};

const LEVELS = {
  1: {
    name: "修错别字",
    days: 6,
    energy: 10,
    favor: 4,
    stage: "one",
    nodes: [{ name: "文案负责人" }],
    intro: "就改一个错别字。门禁分到了文案负责人。",
  },
  2: {
    name: "版本大联调",
    days: 5,
    energy: 9,
    favor: 3,
    stage: "three",
    nodes: [{ name: "客户端" }, { name: "测试" }, { name: "设计" }],
    intro: "上一行上车了。这班是大联调，三个人要同时看你这一行。时间更短。",
  },
  3: {
    name: "红线行动",
    days: 4,
    energy: 8,
    favor: 2,
    stage: "cross",
    nodes: [{ name: "设计" }, { name: "测试" }, { boss: "kafka" }, { boss: "schrodinger" }, { boss: "architect" }],
    intro: "红线开了。合规、安全、架构都在名单上。只靠补材料会赶不上。",
  },
  4: {
    name: "封网期大促",
    days: 3,
    energy: 8,
    favor: 3,
    stage: "vp",
    businessCut: true,
    nodes: [{ name: "VP 评审会" }, { boss: "kafka" }, { boss: "schrodinger" }, { boss: "architect" }, { name: "测试" }, { name: "设计" }],
    intro: "封网了。只剩三天。业务其实已经把这个按钮砍了，合进去当天也会被撤。",
  },
};

const GROWTH = {
  one: { stage: "three", add: [{ name: "设计" }, { name: "测试" }] },
  three: { stage: "cross", add: [{ boss: "kafka" }, { boss: "schrodinger" }, { boss: "architect" }] },
  cross: { stage: "vp", add: [{ name: "VP 评审会" }] },
  vp: null,
};

export const OUTCOMES = {
  absurd: {
    kind: "ending",
    title: "荒诞胜利",
    text: "一行改动合并了。业务其实早就把这个按钮砍了。它当天上线，当天被下掉。",
  },
  corrupt: {
    kind: "ending",
    title: "黑化结局",
    text: "你成了流程负责人。下一班火车出发前，你又加了一道审批。",
  },
  nihil: {
    kind: "ending",
    title: "虚无结局",
    text: "一连几个月，没有东西上车。合规报告打了 100 分。竞品已经上线了同样的按钮。",
  },
  quit: {
    kind: "failure",
    title: "精力耗尽",
    text: "你提了离职。这一行还停在草稿里。",
  },
  miss: {
    kind: "failure",
    title: "没赶上这班",
    text: "车准点开了，没有你这一行。合并请求被打回，审批全部清零。",
  },
  deadlock: {
    kind: "failure",
    title: "合规死锁",
    text: "安全要明细行为日志，合规禁止记录任何行为。两份要求对冲，谁也签不了字。合并请求被打回，审批全部清零。",
  },
};

export function getChange(id) {
  return CHANGES.find((item) => item.id === id) || CHANGES[0];
}

export function getLevel(id) {
  return LEVELS[id] || null;
}

export function createRun(levelId, changeId) {
  const level = getLevel(levelId);
  const change = getChange(changeId);
  if (!level) throw new Error(`Unknown level ${levelId}`);
  const state = {
    levelId,
    levelName: level.name,
    changeId: change.id,
    title: change.title,
    diff: change.diff,
    energy: level.energy,
    favor: level.favor,
    days: level.days,
    stage: level.stage,
    nodes: [],
    nextId: 1,
    log: [],
    ccCount: 0,
    conceptSwap: false,
    businessCut: !!level.businessCut,
    corruptDeclined: false,
    pendingChoice: null,
    outcome: null,
  };
  push(state, "列车", level.intro);
  for (const spec of level.nodes) addNode(state, spec, true);
  push(state, "系统", `门禁已分配。当前是${STAGE_LABEL[state.stage]}。`);
  if (state.businessCut) {
    push(state, "产品", "这个按钮业务已经砍了。你要是还塞上去，当天就会被撤下来。");
  }
  return state;
}

export function conflictOpen(state) {
  const kafka = state.nodes.some((node) => node.boss === "kafka" && node.status !== "approved");
  const security = state.nodes.some((node) => node.boss === "schrodinger" && node.status !== "approved");
  return kafka && security;
}

export function canPlay(state, actionId) {
  if (!state || state.outcome || state.pendingChoice) return false;
  const card = CARDS.find((item) => item.id === actionId);
  if (!card) return false;
  return state.energy >= card.energy && state.favor >= card.favor && state.days > 0;
}

export function applyAction(prev, actionId) {
  if (!prev || prev.outcome) return prev;
  const state = structuredClone(prev);
  if (actionId === "nihil") return chooseNihil(state);
  if (actionId === "force") return chooseForce(state);
  if (actionId === "corrupt") return chooseCorrupt(state);
  if (actionId === "decline") return chooseDecline(state);
  if (!canPlay(state, actionId)) return prev;
  const card = CARDS.find((item) => item.id === actionId);
  tick(state, card.energy, card.favor);
  if (actionId === "talk") talk(state);
  else if (actionId === "align") align(state);
  else if (actionId === "cc") cc(state);
  else if (actionId === "reframe") reframe(state);
  else if (actionId === "hotfix") hotfix(state);
  else if (actionId === "weekend") weekend(state);
  return finish(state, false);
}

function chooseNihil(state) {
  if (!conflictOpen(state)) return state;
  push(state, "你", "那先出一份合规报告吧。需求先别上。");
  push(state, "合规", "报告很完整。分数是 100。车，先别等了。");
  state.outcome = { kind: "ending", id: "nihil" };
  return state;
}

function chooseForce(state) {
  if (!conflictOpen(state)) return state;
  push(state, "你", "这个风险我来背，强行合入。");
  push(state, "合规", "安全要日志，隐私不让记。这个字我签不了。");
  state.outcome = { kind: "failure", id: "deadlock" };
  return state;
}

function chooseCorrupt(state) {
  if (state.pendingChoice !== "corrupt") return state;
  push(state, "你", "那我来做流程负责人。下一班，加一道卡点。");
  state.pendingChoice = null;
  state.outcome = { kind: "ending", id: "corrupt" };
  return state;
}

function chooseDecline(state) {
  if (state.pendingChoice !== "corrupt") return state;
  state.pendingChoice = null;
  state.corruptDeclined = true;
  state.favor = Math.max(0, state.favor - 1);
  push(state, "你", "我还是想把这一行送上车。");
  push(state, "大老板", "行。那你自己跟。人情我先记下了。");
  return state;
}

function talk(state) {
  const growth = GROWTH[state.stage];
  if (!growth) {
    push(state, "VP 助理", "这个风险谁来背？原则上我不反对，但建议拉下合规。会议改期。");
    return;
  }
  state.stage = growth.stage;
  for (const spec of growth.add) addNode(state, spec, true);
  push(state, "你", "我去问了一圈。没有人点通过。");
  push(state, "系统", `审批树长到了「${STAGE_LABEL[state.stage]}」。`);
}

function align(state) {
  const node = state.nodes.find((item) => item.status === "pending" || item.status === "blocked");
  if (node && node.status === "pending") node.status = "read";
  addNode(state, { name: "相关协作方" }, false);
  push(state, "纪要", "拉通对齐已发送。原则上没人反对，名单上又多了一个人。");
}

function cc(state) {
  state.ccCount += 1;
  const node = state.nodes.find((item) => item.status !== "approved");
  if (node) {
    node.status = "approved";
    push(state, "大老板", `已读。${node.name}先点头。邮件抄送列表又长了一截。`);
  } else {
    push(state, "大老板", "已读。名单是空的，不过大家都看见你了。");
  }
}

function reframe(state) {
  state.conceptSwap = true;
  state.title = "体验优化（非功能变更）";
  const architect = state.nodes.find((node) => node.boss === "architect" && node.status !== "approved");
  if (architect) {
    architect.status = "approved";
    push(state, "影子架构师", "体验优化的话，这周我先不拦。主题系统以后再说。");
  }
  push(state, "你", "标题改模糊了。还是原来那一行。");
}

function hotfix(state) {
  if (conflictOpen(state) && !state.conceptSwap) {
    push(state, "合规", "特批也要签字。安全要日志，合规不让记。先按住。");
    return;
  }
  for (const node of state.nodes) node.status = "approved";
  push(state, "发布值班", "Hotfix 特批通过。这一行被推进了版本火车。");
  state.merged = true;
}

function weekend(state) {
  const node = state.nodes.find((item) => item.status !== "approved");
  if (!node) {
    push(state, "你", "周六夜里办公室只有你。已经没有卡点可补了。");
    return;
  }
  node.status = "approved";
  push(state, "你", `周末午夜你把材料补上了。${node.name}变成已通过。`);
  if (allApproved(state)) state.merged = true;
}

function finish(state, _ignored) {
  if (state.outcome) return state;
  if (state.merged || allApproved(state)) {
    if (state.businessCut) state.outcome = { kind: "ending", id: "absurd" };
    else if (state.levelId < 4) state.outcome = { kind: "level", id: state.levelId + 1 };
    else state.outcome = { kind: "ending", id: "absurd" };
    return state;
  }
  if (state.energy <= 0) {
    state.outcome = { kind: "failure", id: "quit" };
    return state;
  }
  if (state.days <= 0) {
    state.outcome = { kind: "failure", id: "miss" };
    return state;
  }
  if (state.ccCount >= 2 && state.stage === "vp" && !state.corruptDeclined) {
    state.pendingChoice = "corrupt";
    push(state, "大老板", "那你来做流程负责人吧。下一班的门禁，你来加。");
  }
  return state;
}

function tick(state, energy, favor) {
  state.energy -= energy;
  state.favor -= favor;
  state.days -= 1;
  if (state.levelId === 1 && state.days <= 3 && !state.businessCut) {
    state.businessCut = true;
    push(state, "产品", "对了，这个按钮业务已经砍了。塞上去的话，当天就会被撤下来。");
  }
}

function allApproved(state) {
  return state.nodes.length > 0 && state.nodes.every((node) => node.status === "approved");
}

function addNode(state, spec, announce) {
  const boss = spec.boss ? BOSSES[spec.boss] : null;
  const node = {
    id: state.nextId,
    name: boss ? boss.name : spec.name,
    status: boss ? boss.status : "pending",
    boss: spec.boss || "",
  };
  state.nextId += 1;
  state.nodes.push(node);
  if (announce && boss) push(state, node.name, boss.line);
  return node;
}

function push(state, who, text) {
  state.log.push({ who, text });
}
