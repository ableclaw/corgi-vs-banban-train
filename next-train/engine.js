/** 《下一班火车》— seeded hand, hierarchical sign-offs, trains that come back. */

export const CHANGES = [
  {
    id: "color",
    title: "按钮改成品牌蓝",
    diff: "- color: #8c8c8c;\n+ color: #1677ff;",
    blurb: "签字更多，会惊动影子架构师，审计风险从 1 开始。",
    extraNodes: 2,
    bosses: ["architect"],
    audit: 1,
  },
  {
    id: "typo",
    title: "文案少一个错别字",
    diff: "- 立即够买\n+ 立即购买",
    blurb: "只动一个字。起步只有基础审批，没有老板级门禁。",
    extraNodes: 0,
    bosses: [],
    audit: 0,
  },
  {
    id: "period",
    title: "注释补一个句号",
    diff: "- // TODO 下个版本再说\n+ // TODO 下个版本再说。",
    blurb: "注释没有主人。薛定谔的负责人藏在两三个名字里。",
    extraNodes: 1,
    bosses: ["schrodinger"],
    audit: 0,
  },
];

export const CARDS = [
  { id: "talk", name: "去问问", detail: "多一个签字。能问出隐藏要求，或收回一点人情。", energy: 1, favor: 0, sanity: 0 },
  { id: "align", name: "拉通对齐", detail: "指出真负责人，或把两个节点并成一个。会再抄送一个人。", energy: 1, favor: 1, sanity: 1 },
  { id: "cc", name: "向上管理", detail: "老板点头，通过一个节点。跨团队抄送掉理智。", energy: 1, favor: 1, sanity: 2 },
  { id: "reframe", name: "偷换概念", detail: "标题改成体验优化。合规对峙时，特批才不被按住。", energy: 1, favor: 0, sanity: 0 },
  { id: "hotfix", name: "Hotfix特批", detail: "跳过普通签字。审计那格盖不过。成功会抬高审计风险。", energy: 2, favor: 1, sanity: 0 },
  { id: "weekend", name: "周末突击", detail: "亲手通过一个节点。打在卡夫卡身上，这回合不再增生表格。", energy: 2, favor: 0, sanity: 0 },
  { id: "rest", name: "休息", detail: "补精力和理智。不签字，表格仍可能自己长。", energy: 0, favor: 0, sanity: 0 },
];

const DECK = ["talk", "talk", "align", "align", "cc", "cc", "reframe", "weekend", "weekend", "weekend", "hotfix", "rest", "rest"];
export const RECOVERY = { energy: 4, sanity: 1, favor: 1 };
const REST_ENERGY = 4;
const REST_SANITY = 1;
const HAND_SIZE = 4;
const AUDIT_THRESHOLD = 2;
const MAX_FORMS = 1;

const APPROVERS = [
  { name: "文案负责人", lines: ["这个用词谁拍板？我只是先看看。", "原则上可以，但请再对一下品牌语气。", "我签可以，别在发布说明里写我的名字。"] },
  { name: "设计", lines: ["颜色不在这期规范里。", "我没意见，让设计系统的人看一眼。", "这颗按钮下个版本可能换掉，你确定现在改？"] },
  { name: "测试", lines: ["回归范围发我。一行也要测。", "我可以过，但今晚的包已经冻结了。", "用例我补上了，你别再改文案。"] },
  { name: "客户端", lines: ["热修通道今晚有人值守吗？", "这行我可以合，别顺手改别的。", "包体积没变，我没理由拦。"] },
  { name: "产品", lines: ["需求单里没有这一句。", "用户不会因为一个字留下来。", "你要上就上，别说是我催的。"] },
  { name: "数据", lines: ["埋点不用改的话，我签字。", "改颜色算不算一次实验？", "报表口径别动就行。"] },
  { name: "运营", lines: ["活动页还指着旧颜色。", "文案我们群里对过了，应该是这版。", "大促素材已经发出去了，你悠着点。"] },
];

const BOSS_LINES = {
  kafka: [
    "补充材料。这份和上一份不矛盾，但都要交。",
    "原则上我不反对。请把流程编号填在第三栏。",
    "材料收了。还差一页，页码你自己编。",
  ],
  schrodinger: [
    "他人不在办公区。这个风险谁来背？原则上我不反对，但建议拉下合规。",
    "真负责人可能是这几位里的一个。我只是代收消息。",
    "你找到人之前，这格会一直亮着。",
  ],
  architect: [
    "技术洁癖。一行改动请先抽象成主题变量，这周评审不过。",
    "这张牌的效果我按回去。就这一次，下不为例。",
    "主题系统以后再说。今天我只否这一手。",
  ],
  vp: [
    "VP 的会只有十五分钟。你要讲风险，还是讲这一行？",
    "助理问：这个风险谁来背？",
    "会议纪要明天才出。车不等纪要。",
  ],
  audit: [
    "特批次数到了。这一笔审计单独过，特批盖不过。",
    "审计只看特批记录。你越跳，这格越硬。",
  ],
};

const LEVELS = {
  1: { name: "修错别字", days: 6, energy: 14, sanity: 10, favor: 5, baseNodes: 1, bosses: [], audit: 0, businessCut: false },
  2: { name: "版本大联调", days: 6, energy: 12, sanity: 10, favor: 5, baseNodes: 2, bosses: ["architect"], audit: 0, businessCut: false },
  3: { name: "红线行动", days: 6, energy: 14, sanity: 10, favor: 5, baseNodes: 2, bosses: ["kafka", "schrodinger"], audit: 1, businessCut: false },
  4: { name: "封网期大促", days: 6, energy: 14, sanity: 10, favor: 5, baseNodes: 2, bosses: ["kafka", "vp"], audit: 1, businessCut: true },
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
    text: "理智见底。你坐上流程负责人的位子，给下一班又加了一道审批。",
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
    title: "没有下一班了",
    text: "这几班都准点开走了。审批一次次清零，窗口用完了。",
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

export function stageLabel(state) {
  if (state.nodes.some((node) => node.boss === "vp")) return "VP 会议";
  if (state.nodes.some((node) => node.boss === "kafka" || node.boss === "schrodinger")) return "跨团队";
  if (state.nodes.filter((node) => !node.fake && !node.form).length >= 3) return "3 位审批";
  return "起步";
}

export function createRun(levelId, changeId, seed = 1) {
  const level = getLevel(levelId);
  const change = getChange(changeId);
  if (!level) throw new Error(`Unknown level ${levelId}`);
  const state = blank(levelId, level, change, seed >>> 0 || 1);
  push(state, "列车", introLine(level, change));
  deal(state, level, change, null);
  if (state.businessCut) {
    say(state, "产品", ["这个按钮业务已经砍了。你要是还塞上去，当天就会被撤下来。", "封网期还改这个？上了也会被撤。"]);
  }
  openVp(state);
  ensureHand(state);
  return state;
}

export function continueLevel(prev) {
  const next = createRun(prev.outcome.id, prev.changeId, (prev.seed + prev.levelId * 17) >>> 0);
  next.energy = Math.min(next.energyMax, prev.energy + RECOVERY.energy);
  next.sanity = Math.min(next.sanityMax, Math.max(1, prev.sanity + RECOVERY.sanity));
  next.favor = Math.min(next.favorMax, prev.favor + RECOVERY.favor);
  next.audit = prev.audit;
  next.ledger = prev.ledger.map((row) => ({ ...row }));
  if (next.audit >= AUDIT_THRESHOLD) ensureAudit(next);
  const back = `上一关带回精力 ${prev.energy}，休息后是 ${next.energy}。理智 ${next.sanity}，人情 ${next.favor}。`;
  push(next, "列车", back);
  next.turns = [{ source: "过关恢复", text: `精力 ${signed(next.energy - prev.energy)} · 理智 ${signed(next.sanity - prev.sanity)} · 人情 ${signed(next.favor - prev.favor)}` }];
  if (next.energy <= 0) {
    next.outcome = { kind: "failure", id: "quit" };
    return next;
  }
  if (next.sanity <= 0) {
    next.sanity = 0;
    next.pendingChoice = "corrupt";
    return next;
  }
  ensureHand(next);
  return next;
}

export function conflictOpen(state) {
  const kafka = state.nodes.some((node) => node.boss === "kafka" && node.status !== "approved");
  const security = state.nodes.some((node) => node.boss === "schrodinger" && node.status !== "approved");
  return kafka && security;
}

export function blockReason(state, actionId) {
  if (!state || state.outcome) return "这局已经结束";
  if (state.pendingChoice) return "先做眼前的选择";
  const card = CARDS.find((item) => item.id === actionId);
  if (!card) return "没有这张牌";
  if (!state.hand.includes(actionId)) return "不在手牌里";
  if (state.days <= 0) return "没有天数了";
  if (state.energy < card.energy) return "精力不足";
  if (state.favor < card.favor) return "人情不足";
  if (actionId === "hotfix" && state.nodes.some((node) => node.boss === "audit" && node.status !== "approved")) return "审计节点不吃特批";
  if (actionId === "hotfix" && conflictOpen(state) && !state.conceptSwap) return "对峙未解开，特批无效";
  if (actionId === "reframe" && state.conceptSwap) return "标题已经改过";
  if (actionId === "align") {
    const canReveal = !state.schrodingerRevealed && state.nodes.some((node) => node.real);
    const pending = state.nodes.filter((node) => blocking(state, node));
    if (!canReveal && pending.length < 2) return "没有可合并的节点";
  }
  if (actionId === "cc" && !firstBlocking(state, (node) => node.boss !== "audit")) return "没有能点头的节点";
  if (actionId === "weekend" && !firstBlocking(state)) return "没有可补的节点";
  return "";
}

export function canPlay(state, actionId) {
  return blockReason(state, actionId) === "";
}

export function legalActions(state) {
  if (!state || state.outcome) return [];
  if (state.pendingChoice === "corrupt") return ["corrupt", "decline"];
  if (state.pendingChoice === "vp") return ["vp-attend", "vp-delegate", "vp-skip"];
  const actions = CARDS.map((card) => card.id).filter((id) => canPlay(state, id));
  if (conflictOpen(state)) actions.push("nihil", "force");
  return actions;
}

export function applyAction(prev, actionId) {
  if (!prev || prev.outcome) return prev;
  const before = takeStats(prev);
  const next = dispatch(prev, actionId);
  if (next !== prev) stamp(next, before, actionId);
  return next;
}

function dispatch(prev, actionId) {
  if (actionId === "nihil") return chooseNihil(prev);
  if (actionId === "force") return chooseForce(prev);
  if (actionId === "corrupt") return chooseCorrupt(prev);
  if (actionId === "decline") return chooseDecline(prev);
  if (actionId === "vp-attend" || actionId === "vp-delegate" || actionId === "vp-skip") return chooseVp(prev, actionId);
  if (!canPlay(prev, actionId)) return prev;
  const state = structuredClone(prev);
  state.addressedKafka = false;
  if (actionId === "hotfix") return playHotfix(state);
  if (actionId === "rest") return playRest(state);
  const card = CARDS.find((item) => item.id === actionId);
  pay(state, card);
  const snap = snapshot(state);
  if (actionId === "talk") talk(state);
  else if (actionId === "align") align(state);
  else if (actionId === "cc") cc(state);
  else if (actionId === "reframe") reframe(state);
  else if (actionId === "weekend") weekend(state);
  if (architectReverse(state, snap)) {
    discard(state, actionId);
    return closeTurn(state, false);
  }
  discard(state, actionId);
  return closeTurn(state, true);
}

function chooseNihil(prev) {
  if (!conflictOpen(prev)) return prev;
  const state = structuredClone(prev);
  say(state, "你", ["那先出一份合规报告吧。需求先别上。", "两边的话我都写进报告。车先别等。"]);
  say(state, "合规", ["报告很完整。分数是 100。", "流程分满分。产品分没有这项。"]);
  state.outcome = { kind: "ending", id: "nihil" };
  return state;
}

function chooseForce(prev) {
  if (!conflictOpen(prev)) return prev;
  const state = structuredClone(prev);
  say(state, "你", ["这个风险我来背，强行合入。", "日志打满，同时承诺不采集。我两个都写上。"]);
  say(state, "合规", ["安全要日志，隐私不让记。这个字我签不了。", "两份要求对冲。合并请求退回，名单清空。"]);
  state.outcome = { kind: "failure", id: "deadlock" };
  return state;
}

function chooseCorrupt(prev) {
  if (prev.pendingChoice !== "corrupt") return prev;
  const state = structuredClone(prev);
  state.pendingChoice = null;
  say(state, "你", ["那我来做流程负责人。下一班，加一道卡点。", "行。门禁我来守。这一行先别上了。"]);
  state.outcome = { kind: "ending", id: "corrupt" };
  return state;
}

function chooseDecline(prev) {
  if (prev.pendingChoice !== "corrupt") return prev;
  const state = structuredClone(prev);
  state.pendingChoice = null;
  state.sanity = Math.max(state.sanity, 5);
  say(state, "你", ["流程负责人我不当。我还是要把这一行送上车。"]);
  say(state, "大老板", ["那你自己跟。位子先空着，理智给你留一点。", "不当也行。别在群里消失。"]);
  return finish(state);
}

function chooseVp(prev, actionId) {
  if (prev.pendingChoice !== "vp") return prev;
  const state = structuredClone(prev);
  state.pendingChoice = null;
  state.vpResolved = true;
  state.addressedKafka = false;
  if (actionId === "vp-attend") {
    state.sanity -= 1;
    state.days -= 1;
    const vp = state.nodes.find((node) => node.boss === "vp");
    if (vp) vp.status = "approved";
    const other = firstBlocking(state, (node) => node.boss !== "vp" && node.boss !== "audit");
    if (other) {
      other.status = "approved";
      say(state, "VP", [`会开完了。${other.name}这关算过。你的理智不在纪要里。`, "十五分钟讲完一行。VP 点了头，助理记下了风险。"]);
    } else {
      say(state, "VP", ["人到齐了。这页没有可放行的名字，会还是开了。"]);
    }
    return closeTurn(state, true);
  }
  if (actionId === "vp-delegate") {
    state.sanity -= 1;
    say(state, "助理", ["助理代开了。原则上没问题，建议再拉通一下。纪要没有决议。", "你没进会议室。助理说：这个风险谁来背？"]);
    return finish(state);
  }
  say(state, "你", ["这个会你没去。纪要里没有你的名字，节点也还在。"]);
  return finish(state);
}

function playRest(state) {
  state.days -= 1;
  const snap = snapshot(state);
  state.energy = Math.min(state.energyMax, state.energy + REST_ENERGY);
  state.sanity = Math.min(state.sanityMax, state.sanity + REST_SANITY);
  say(state, "你", ["你合上电脑，去茶水间站了十分钟。", "休息补回一点精力。审批树没动，表还可能自己长。"]);
  if (architectReverse(state, snap)) {
    discard(state, "rest");
    return closeTurn(state, false);
  }
  discard(state, "rest");
  return closeTurn(state, true);
}

function playHotfix(state) {
  const blocked = (conflictOpen(state) && !state.conceptSwap) || state.nodes.some((node) => node.boss === "audit");
  if (blocked) {
    state.energy -= 1;
    say(state, "合规", [
      "特批被按住。失败这一下只扣了一点精力，人情和天数都没动。",
      "审计那格特批盖不过。卡还在你手里。",
      "安全要日志，合规不让记。特批先放回去。",
    ]);
    return finish(state);
  }
  state.energy -= 2;
  state.favor -= 1;
  state.days -= 1;
  const snap = snapshot(state);
  for (const node of state.nodes) {
    if (node.boss || node.form || node.real || node.fake) continue;
    node.status = "approved";
  }
  state.audit += 1;
  say(state, "发布值班", ["Hotfix 特批通过了普通签字。审计风险往上走了一格。", "一行被推进列车。审计台在旁边记了一笔。"]);
  if (architectReverse(state, snap)) {
    discard(state, "hotfix");
    return closeTurn(state, false);
  }
  ensureAudit(state);
  discard(state, "hotfix");
  return closeTurn(state, true);
}

function talk(state) {
  const hidden = state.nodes.find((node) => node.hidden && !node.revealed);
  if (hidden) {
    hidden.revealed = true;
    hidden.hidden = false;
    say(state, hidden.name, [hidden.line, `${hidden.name}终于把隐藏要求说出来了：${hidden.line}`]);
  } else if (!state.schrodingerRevealed && state.nodes.some((node) => node.real)) {
    revealSchrodinger(state, "问");
  } else {
    state.favor += 1;
    say(state, "同事", ["问完，有人私下说可以帮你递一下。人情 +1。", "对方没签字，但把你拉进了那个小群。人情 +1。"]);
  }
  const parent = firstBlocking(state);
  const extra = addApprover(state, parent ? parent.id : null);
  say(state, "系统", [`去问的代价是多了一位：${extra.name}。`, `${extra.name}被加进审批树。原来的人还没签。`]);
}

function align(state) {
  if (!state.schrodingerRevealed && state.nodes.some((node) => node.real)) {
    revealSchrodinger(state, "对齐");
    const real = state.nodes.find((node) => node.real);
    const boss = state.nodes.find((node) => node.boss === "schrodinger");
    if (real) real.status = "approved";
    if (boss) boss.status = "approved";
  } else {
    const pending = state.nodes.filter((node) => blocking(state, node));
    if (pending.length >= 2) {
      pending[1].status = "approved";
      say(state, "纪要", [
        `${pending[0].name}和${pending[1].name}并成一个会签。后者这关不用再单独签。`,
        `拉通之后，${pending[1].name}的格子并进去了。`,
      ]);
    } else {
      say(state, "纪要", ["纪要写了「原则上不反对」。人还在，但你看清了卡在谁身上。", "对齐没有可合并的两格，不过责任人写明白了。"]);
    }
  }
  const extra = addApprover(state, null);
  extra.status = "read";
  say(state, "系统", [`抄送了${extra.name}。这格不用再签，只是多一个人看见。`, `${extra.name}回了已读。人在树上，但不挡这班车。`]);
}

function cc(state) {
  state.ccCount += 1;
  const node = firstBlocking(state, (item) => item.boss !== "audit");
  if (node) {
    node.status = "approved";
    if (node.boss === "kafka" || node.form) state.addressedKafka = true;
    say(state, "大老板", [`已读。${node.name}先点头。抄送列表又长了一截。`, `老板回了个「看过」。${node.name}这关过了，你的理智没过。`]);
  } else {
    say(state, "大老板", ["已读。能点头的格子不多了，邮件还是发出去了。"]);
  }
}

function reframe(state) {
  state.conceptSwap = true;
  state.title = "体验优化（非功能变更）";
  say(state, "你", ["标题改模糊了。diff 还是原来那一行。", "你把它叫成体验优化。审核的人要翻到代码才知道是改色。"]);
}

function weekend(state) {
  const node = firstBlocking(state);
  if (!node) {
    say(state, "你", ["周六夜里办公室只有你。已经没有卡点可补了。"]);
    return;
  }
  node.status = "approved";
  if (node.boss === "kafka" || node.form) state.addressedKafka = true;
  say(state, "你", [
    `周末午夜你把材料补上了。${node.name}变成已通过。`,
    `灯只开了一排。${node.name}的格子你自己填完了。`,
  ]);
}

function architectReverse(state, snap) {
  const architect = snap.nodes.find((node) => node.boss === "architect" && node.status !== "approved");
  if (!architect || state.architectUsed) return false;
  state.nodes = snap.nodes;
  state.conceptSwap = snap.conceptSwap;
  state.audit = snap.audit;
  state.title = snap.title;
  state.schrodingerRevealed = snap.schrodingerRevealed;
  state.favor = snap.favor;
  state.architectUsed = true;
  const restored = state.nodes.find((node) => node.boss === "architect");
  if (restored) restored.status = "approved";
  push(state, "影子架构师", "影子架构师：把上一张牌的效果按了回去。");
  return true;
}

function closeTurn(state, kafka) {
  if (kafka) spawnKafkaForm(state);
  ensureAudit(state);
  return finish(state);
}

function finish(state) {
  if (state.outcome) return state;
  if (cleared(state)) {
    state.outcome = state.businessCut || state.levelId >= 4
      ? { kind: "ending", id: "absurd" }
      : { kind: "level", id: state.levelId + 1 };
    return state;
  }
  if (state.energy <= 0) {
    state.outcome = { kind: "failure", id: "quit" };
    return state;
  }
  if (state.sanity <= 0) {
    state.sanity = 0;
    state.pendingChoice = "corrupt";
    say(state, "大老板", ["理智见底了。那你来做流程负责人吧。", "你看起来会喜欢门禁。下一班的卡点，要不要你来加？"]);
    return state;
  }
  if (state.days <= 0) return missTrain(state);
  ensureHand(state);
  if (!legalActions(state).length) ensureHand(state);
  return state;
}

function missTrain(state) {
  state.train += 1;
  if (state.train > state.maxTrains) {
    say(state, "列车", ["这班也准点开走了。窗口用完，没有下一班。", "审批清零过好几次。发车时刻表翻到头了。"]);
    state.outcome = { kind: "failure", id: "miss" };
    return state;
  }
  const kept = state.nodes.find((node) => node.status === "approved" && node.boss !== "audit" && !node.fake && !node.form);
  const level = getLevel(state.levelId);
  const change = getChange(state.changeId);
  state.days = state.dayBudget;
  state.bossDone = state.bossDone || {};
  for (const node of state.nodes) {
    if (node.boss && node.status === "approved") state.bossDone[node.boss] = true;
  }
  state.vpResolved = !!state.bossDone.vp;
  state.pendingChoice = null;
  say(state, "列车", [
    `这班准点开走了，没有你这一行。审批清零，下一班是第 ${state.train} 班。精力和理智还在。`,
    `错过了。签字作废，只留一个已经通过的名字当进度。第 ${state.train} / ${state.maxTrains} 班。`,
  ]);
  deal(state, level, change, kept || null);
  openVp(state);
  ensureHand(state);
  return state;
}

function spawnKafkaForm(state) {
  const kafka = state.nodes.find((node) => node.boss === "kafka" && node.status !== "approved");
  if (!kafka || state.addressedKafka) return;
  const forms = state.nodes.filter((node) => node.form).length;
  if (forms >= MAX_FORMS) return;
  const form = addNode(state, {
    name: `补充材料 ${forms + 1}`,
    status: "blocked",
    boss: "",
    form: forms + 1,
    line: "又一份表。原则上我不反对，但这份也得填。",
  }, kafka.id);
  state.sanity -= 1;
  push(state, "流程卡夫卡", "流程卡夫卡：又长出一张表，+1 节点。");
}

function ensureAudit(state) {
  if (state.audit < AUDIT_THRESHOLD) return;
  if (state.nodes.some((node) => node.boss === "audit")) return;
  addNode(state, {
    name: "审计",
    status: "blocked",
    boss: "audit",
    line: BOSS_LINES.audit[0],
  }, null);
  push(state, "审计", "审计：风险到了，多了一格。特批盖不过。");
}

function revealSchrodinger(state, via) {
  state.schrodingerRevealed = true;
  const real = state.nodes.find((node) => node.real);
  for (const node of state.nodes) {
    if (node.fake) node.status = "read";
  }
  if (real) {
    say(state, "薛定谔的负责人·安全专家", [
      `${via}完才看清：真负责人是${real.name}。其余两位只是被写进群里。`,
      `真人是${real.name}。另外几个名字不用签了。`,
    ]);
  }
}

function pay(state, card) {
  state.energy -= card.energy;
  state.favor -= card.favor;
  state.sanity -= card.sanity;
  state.days -= 1;
}

function blank(levelId, level, change, seed) {
  return {
    seed,
    rngS: seed >>> 0,
    levelId: Number(levelId),
    levelName: level.name,
    changeId: change.id,
    title: change.title,
    diff: change.diff,
    energy: level.energy,
    sanity: level.sanity,
    favor: level.favor,
    days: level.days,
    dayBudget: level.days,
    train: 1,
    maxTrains: 3,
    audit: level.audit + change.audit,
    energyMax: 16,
    sanityMax: 12,
    favorMax: 8,
    auditMax: 3,
    nodes: [],
    ledger: [],
    turns: [],
    nextId: 1,
    log: [],
    hand: [],
    deck: [],
    discard: [],
    lastLine: {},
    ccCount: 0,
    conceptSwap: false,
    businessCut: !!level.businessCut,
    architectUsed: false,
    bossDone: {},
    schrodingerRevealed: false,
    vpResolved: false,
    addressedKafka: false,
    pendingChoice: null,
    outcome: null,
  };
}

function deal(state, level, change, keep) {
  state.nodes = [];
  state.nextId = 1;
  state.deck = DECK.slice();
  state.discard = [];
  state.hand = [];
  shuffle(state, state.deck);
  if (keep) {
    addNode(state, {
      name: keep.name,
      status: "approved",
      boss: keep.boss && keep.boss !== "kafka" && keep.boss !== "vp" ? keep.boss : "",
      line: "上一班通过的名字，这班还算数。",
    }, null);
  }
  const pool = APPROVERS.slice();
  shuffle(state, pool);
  const count = level.baseNodes + change.extraNodes;
  for (let i = 0; i < count; i += 1) {
    const person = pool[i % pool.length];
    const line = person.lines[randInt(state, person.lines.length)];
    const node = addNode(state, {
      name: person.name,
      status: "pending",
      line,
      hidden: i === 1,
    }, null);
    if (!node.hidden) say(state, node.name, [line]);
    else say(state, "系统", [`${node.name}在名单上，具体要求先没说。`, `${node.name}接了单，隐藏条件和签字一起压着。`]);
  }
  const bosses = [];
  for (const boss of [...level.bosses, ...change.bosses]) {
    if (!bosses.includes(boss)) bosses.push(boss);
  }
  for (const boss of bosses) addBoss(state, boss);
  ensureAudit(state);
  drawTo(state, HAND_SIZE);
}

function addBoss(state, boss) {
  if (boss === "schrodinger") {
    const done = !!state.bossDone?.schrodinger;
    const node = addNode(state, {
      name: "薛定谔的负责人·安全专家",
      status: done ? "approved" : "blocked",
      boss: "schrodinger",
      line: BOSS_LINES.schrodinger[0],
    }, null);
    if (done) state.schrodingerRevealed = true;
    say(state, node.name, BOSS_LINES.schrodinger);
    const names = ["值班同学", "接口人", "前负责人"];
    const count = 2 + randInt(state, 2);
    const realAt = randInt(state, count);
    for (let i = 0; i < count; i += 1) {
      addNode(state, {
        name: names[i],
        status: done || i !== realAt ? "read" : "pending",
        fake: i !== realAt,
        real: i === realAt,
        line: i === realAt ? "日志要打全。这个风险可以写我的名字。" : "我只是在群里，签不了安全。",
      }, node.id);
    }
    return;
  }
  const table = {
    kafka: "流程卡夫卡·合规总监",
    architect: "影子架构师",
    vp: "VP 评审会",
  };
  const node = addNode(state, {
    name: table[boss],
    status: state.bossDone?.[boss] ? "approved" : "blocked",
    boss,
    line: BOSS_LINES[boss][0],
  }, null);
  if (boss === "architect" && state.bossDone?.architect) state.architectUsed = true;
  say(state, node.name, BOSS_LINES[boss]);
}

function addApprover(state, parentId) {
  const person = APPROVERS[randInt(state, APPROVERS.length)];
  const line = person.lines[randInt(state, person.lines.length)];
  return addNode(state, { name: person.name, status: "pending", line }, parentId);
}

function addNode(state, spec, parentId) {
  const node = {
    id: state.nextId,
    parentId: parentId ?? null,
    name: spec.name,
    status: spec.status || "pending",
    boss: spec.boss || "",
    line: spec.line || "",
    hidden: !!spec.hidden,
    revealed: false,
    fake: !!spec.fake,
    real: !!spec.real,
    form: spec.form || 0,
  };
  state.nextId += 1;
  state.nodes.push(node);
  return node;
}

function openVp(state) {
  if (state.vpResolved) return;
  if (state.nodes.some((node) => node.boss === "vp")) state.pendingChoice = "vp";
}

function introLine(level, change) {
  if (level.name === "修错别字") return `「${change.title}」进了第 1 关。车会一班一班开，错过还能等下一班。`;
  if (level.name === "版本大联调") return "上一行上车了。这班是大联调，影子架构师会否掉你打出的第一张牌。";
  if (level.name === "红线行动") return "红线开了。合规表格会自己长，安全负责人的真身还藏着。特批盖不过审计。";
  return "封网了。时间更短。业务已经把这个按钮砍了，真合进去也会当天被撤。";
}

function cleared(state) {
  return state.nodes.length > 0 && state.nodes.every((node) => !blocking(state, node));
}

function blocking(state, node) {
  if (node.status === "approved" || node.status === "read") return false;
  if (node.fake) return false;
  if ((node.boss === "schrodinger" || node.real) && !state.schrodingerRevealed) return false;
  return true;
}

function firstBlocking(state, pred = () => true) {
  const list = state.nodes.filter((node) => blocking(state, node) && pred(node));
  const rank = (node) => {
    if (node.form) return 0;
    if (node.boss === "kafka") return 1;
    if (node.boss === "audit") return 2;
    if (node.real) return 3;
    return 4;
  };
  list.sort((a, b) => rank(a) - rank(b) || a.id - b.id);
  return list[0];
}

function snapshot(state) {
  return {
    nodes: structuredClone(state.nodes),
    conceptSwap: state.conceptSwap,
    audit: state.audit,
    title: state.title,
    schrodingerRevealed: state.schrodingerRevealed,
    favor: state.favor,
  };
}

function discard(state, actionId) {
  const index = state.hand.indexOf(actionId);
  if (index >= 0) state.hand.splice(index, 1);
  state.discard.push(actionId);
  drawTo(state, HAND_SIZE);
}

function ensureHand(state) {
  if (state.outcome || state.pendingChoice) return;
  drawTo(state, HAND_SIZE);
  if (state.days <= 0 || state.energy <= 0) return;
  if (CARDS.some((card) => canPlay(state, card.id))) return;
  if (state.energy >= 1 && !state.hand.includes("talk")) state.hand.push("talk");
}

function drawTo(state, count) {
  while (state.hand.length < count) {
    if (!state.deck.length) {
      if (!state.discard.length) break;
      state.deck = state.discard;
      state.discard = [];
      shuffle(state, state.deck);
    }
    if (!state.deck.length) break;
    state.hand.push(state.deck.pop());
  }
}

function shuffle(state, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = randInt(state, i + 1);
    const swap = list[i];
    list[i] = list[j];
    list[j] = swap;
  }
}

function say(state, who, lines) {
  const pool = lines.filter((line) => line !== state.lastLine[who]);
  const text = pool[randInt(state, pool.length)] || lines[0];
  state.lastLine[who] = text;
  push(state, who, text);
}

function push(state, who, text) {
  state.log.push({ who, text });
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

function signed(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function takeStats(state) {
  return {
    energy: state.energy,
    sanity: state.sanity,
    favor: state.favor,
    days: state.days,
    audit: state.audit,
    nodes: state.nodes.length,
    train: state.train,
  };
}

const ACTION_LABEL = {
  talk: "去问问",
  align: "拉通对齐",
  cc: "向上管理",
  reframe: "偷换概念",
  hotfix: "Hotfix特批",
  weekend: "周末突击",
  rest: "休息",
  "vp-attend": "跨团队会议",
  "vp-delegate": "跨团队会议",
  "vp-skip": "不去开会",
  nihil: "合规报告",
  force: "强行合入",
  corrupt: "黑化",
  decline: "拒绝黑化",
};

function stamp(state, before, actionId) {
  const parts = [];
  const dEnergy = state.energy - before.energy;
  const dSanity = state.sanity - before.sanity;
  const dFavor = state.favor - before.favor;
  const dDays = state.days - before.days;
  const dAudit = state.audit - before.audit;
  const dNodes = state.nodes.length - before.nodes;
  if (dEnergy) parts.push(`精力 ${signed(dEnergy)}`);
  if (dSanity) parts.push(`理智 ${signed(dSanity)}`);
  if (dFavor) parts.push(`人情 ${signed(dFavor)}`);
  if (dDays) parts.push(`天数 ${signed(dDays)}`);
  if (dAudit) parts.push(`审计 ${signed(dAudit)}`);
  if (dNodes) parts.push(`${dNodes > 0 ? "+" : ""}${dNodes} 节点`);
  if (state.train !== before.train) parts.push(`第 ${state.train} 班`);
  const source = ACTION_LABEL[actionId] || actionId;
  state.turns.push({ source, text: parts.join(" · ") || "没有数值变化" });
  if (state.turns.length > 6) state.turns.splice(0, state.turns.length - 6);
  if (dEnergy < 0 || dSanity < 0) {
    state.ledger.push({
      source,
      energy: dEnergy < 0 ? -dEnergy : 0,
      sanity: dSanity < 0 ? -dSanity : 0,
    });
  }
}

function biggestCost(ledger, key) {
  const totals = {};
  for (const row of ledger) totals[row.source] = (totals[row.source] || 0) + (row[key] || 0);
  let source = "";
  let n = 0;
  for (const [name, value] of Object.entries(totals)) {
    if (value > n) {
      source = name;
      n = value;
    }
  }
  return { source: source || "出牌", n };
}

export function currentBlocker(state) {
  return firstBlocking(state) || null;
}

export function blockingCount(state) {
  return state.nodes.filter((node) => blocking(state, node)).length;
}

export function nodeBrief(state, node) {
  const live = blocking(state, node);
  if (node.status === "approved") return { why: "这格已经通过。", clears: "", blocking: false, text: "已通过" };
  if (node.fake || node.status === "read") return { why: "只是被写进群里，不用签。", clears: "", blocking: false, text: "不用签" };
  if (node.hidden && !node.revealed) {
    return { why: `${node.name}：要求还没公开。`, clears: "可用：去问问。", blocking: live, text: `${node.name}：要求未公开。可用：去问问。` };
  }
  if (node.boss === "audit") {
    return { why: "审计：特批次数到了，这格单独过。", clears: "可用：周末突击。特批无效。", blocking: live, text: "审计：特批盖不过。可用：周末突击。特批无效。" };
  }
  if (node.boss === "kafka" || node.form) {
    const why = node.form ? "补充材料：卡夫卡这回合没被处理，又长出来的表。" : "流程卡夫卡：这个回合不处理，下一回合再长一张表。";
    return { why, clears: "可用：周末突击 / 向上管理。", blocking: live, text: `${why}可用：周末突击 / 向上管理。` };
  }
  if (node.boss === "architect" && !state.architectUsed) {
    return { why: "影子架构师：下一张牌的效果会被按回去。", clears: "先打一张便宜的牌让他出手，或周末突击打在他身上。", blocking: live, text: "影子架构师：会打回下一张牌。先用休息或偷换概念喂他。" };
  }
  if (node.boss === "vp") {
    return { why: "VP 评审会：人不到场，这格不过。", clears: "可用：去开会。", blocking: live, text: "VP 评审会：要人到场。可用：去开会。" };
  }
  if (node.boss === "schrodinger" || node.real) {
    const hiddenOwner = !state.schrodingerRevealed;
    if (hiddenOwner) {
      return {
        why: "安全组：真负责人藏在两三个名字里。",
        clears: "可用：拉通对齐 / 去问问。和卡夫卡对峙时特批无效。",
        blocking: live,
        text: "安全组：要行为日志。可用：拉通对齐 / 偷换概念。特批无效。",
      };
    }
    return {
      why: "安全组：要行为日志。合规不让记。",
      clears: "可用：拉通对齐 / 周末突击。没偷换概念时特批无效。",
      blocking: live,
      text: "安全组：要行为日志。可用：拉通对齐 / 偷换概念。特批无效。",
    };
  }
  const why = `${node.name}：还没签字。${node.line || ""}`.trim();
  return { why, clears: "可用：周末突击 / 向上管理。两个以上时拉通对齐能并掉一个。", blocking: live, text: `${node.name}：等人签字。可用：周末突击 / 向上管理。` };
}

export function cardView(state, actionId) {
  const card = CARDS.find((item) => item.id === actionId);
  const reason = blockReason(state, actionId);
  const target = currentBlocker(state);
  let effect = card ? card.detail : "";
  if (actionId === "weekend" && target) effect = `通过当前节点：${target.name}`;
  if (actionId === "cc" && target && target.boss !== "audit") effect = `通过当前节点：${target.name}`;
  if (actionId === "hotfix") effect = "跳过普通签字 · 老板和审计不过 · 审计风险 +1";
  if (actionId === "rest") effect = `精力 +${REST_ENERGY} · 理智 +${REST_SANITY} · 不签字`;
  if (actionId === "talk") effect = "问出隐藏要求或人情 +1 · 多一个签字";
  if (actionId === "align") effect = "指出真负责人，或并掉一个节点";
  if (actionId === "reframe") effect = "标题改成体验优化 · 解开特批";
  if (state && state.nodes.some((node) => node.boss === "architect" && node.status !== "approved" && !state.architectUsed) && actionId !== "rest") {
    effect += " · 架构师可能按回效果";
  }
  const bits = [];
  if (card && actionId === "rest") {
    bits.push(`精力 +${REST_ENERGY}`, `理智 +${REST_SANITY}`, "天数 -1");
  } else if (card) {
    if (card.energy) bits.push(`精力 -${card.energy}`);
    if (card.favor) bits.push(`人情 -${card.favor}`);
    if (card.sanity) bits.push(`理智 -${card.sanity}`);
    bits.push("天数 -1");
  }
  const preview = state ? {
    energy: state.energy,
    sanity: state.sanity,
    favor: state.favor,
    days: state.days,
    audit: state.audit,
  } : null;
  if (preview && card && !reason) {
    if (actionId === "rest") {
      preview.energy = Math.min(state.energyMax, state.energy + REST_ENERGY);
      preview.sanity = Math.min(state.sanityMax, state.sanity + REST_SANITY);
      preview.days = state.days - 1;
    } else {
      preview.energy = state.energy - card.energy;
      preview.favor = state.favor - card.favor;
      preview.sanity = state.sanity - card.sanity;
      preview.days = state.days - 1;
      if (actionId === "hotfix") preview.audit = state.audit + 1;
      if (actionId === "talk") {
        const hidden = state.nodes.some((node) => node.hidden && !node.revealed);
        const owner = !state.schrodingerRevealed && state.nodes.some((node) => node.real);
        if (!hidden && !owner) preview.favor += 1;
      }
    }
  }
  return {
    id: actionId,
    name: card ? card.name : actionId,
    cost: bits.join(" · "),
    effect,
    reason,
    playable: !reason,
    preview,
  };
}

export function outcomeReport(state) {
  const id = state.outcome?.id;
  const left = blockingCount(state);
  const energySpend = biggestCost(state.ledger, "energy");
  const sanitySpend = biggestCost(state.ledger, "sanity");
  const where = `第 ${state.levelId} 关还剩 ${left} 个节点`;
  if (id === "quit") {
    return {
      title: "精力归零",
      cause: `精力归零：${where}，最大消耗来自${energySpend.source} -${energySpend.n}。`,
      tip: "少打高耗的牌。过关会回一点精力，手牌里的休息也能补。",
    };
  }
  if (id === "miss") {
    return {
      title: "没有下一班了",
      cause: `窗口用尽：${where}。${state.maxTrains} 班都准点开走了。`,
      tip: "先打当前亮着的卡点。去问问会多一个签字，别把天数耗光。",
    };
  }
  if (id === "deadlock") {
    return {
      title: "合规死锁",
      cause: `强行合入失败：安全要日志，合规不让记。${where}，审批被打回。`,
      tip: "对峙时出合规报告会进虚无结局。想继续就先偷换概念。",
    };
  }
  if (id === "absurd") {
    return {
      title: "荒诞胜利",
      cause: `荒诞胜利：第 ${state.levelId} 关合进去了。业务早就砍了这个按钮。精力还剩 ${state.energy}。`,
      tip: "封网期真合进去，也会当天被撤。这就是这关的结局。",
    };
  }
  if (id === "corrupt") {
    return {
      title: "黑化结局",
      cause: `理智归零：你接下了流程负责人。最大消耗来自${sanitySpend.source} -${sanitySpend.n}。`,
      tip: "拒绝的话理智会回到至少 5，这班还能继续送。",
    };
  }
  if (id === "nihil") {
    return {
      title: "虚无结局",
      cause: `虚无结局：合规报告 100 分。第 ${state.levelId} 关一个字都没上车。`,
      tip: "这份报告会结束这一局。想上车就别选它。",
    };
  }
  return { title: "这班结束了", cause: where, tip: "看清当前卡点和每张牌的费用再出。" };
}

export const HELP = [
  "目标：把一行改动送上四班火车。",
  "精力归零就辞职。过关和休息能补回来。",
  "理智归零会请你去管流程，可以拒绝。",
  "人情用来拉通、向上管理和特批。",
  "天数归零，这班开走，审批清零，下一班还会来。",
  "三班都错过，这局就结束。",
  "审计涨到头会出现一格，特批盖不过。",
  "亮着的格子是当前卡点，下面写着为什么、用什么牌。",
  "安全要日志、合规不让记时，特批无效。",
  "结局有三种：荒诞、黑化、虚无。",
];

function randInt(state, count) {
  if (count <= 1) return 0;
  return Math.floor(nextRand(state) * count);
}

function nextRand(state) {
  let s = (state.rngS + 0x6D2B79F5) >>> 0;
  state.rngS = s;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
