/** Process gates. They delay a requirement. They never touch the train. */
export const GATES = {
  firewall: { name: "防火墙", en: "Firewall", effect: "stop", detail: "一直挡住，过不去" },
  review: { name: "需求评审", en: "Spec review", effect: "slow", slow: 0.28, detail: "过这一格会变得很慢" },
  security: { name: "安全评审", en: "Security review", effect: "hold", hold: 3.6, detail: "拉去开会，干等一会儿" },
  compliance: { name: "合规", en: "Compliance", effect: "push", push: 18, detail: "打回去补材料" },
  integration: { name: "联调失败", en: "Integration failed", effect: "hold", hold: 4.4, detail: "接口没通，干等" },
  ticket: { name: "工单", en: "Ticket", effect: "slow", slow: 0.65, detail: "排个短队" },
  hotfix: { name: "热修", en: "Hotfix", effect: "hold", hold: 1.5, detail: "临时候补一下" },
  freeze: { name: "封版检查", en: "Code freeze", effect: "stop", detail: "封版了，别进站" },
};

export const GATE_ORDER = Object.keys(GATES);
