# 柯基闯火车 / Corgi vs. the Release Train

一只短腿柯基，一列不等人的版本火车，还有几堵跳不过去的防火墙。

A browser platformer. The corgi’s legs are short, the firewalls are not, and the release train is the boss hazard.

## 在线游玩 / Play

公开地址，不用登录。这是单文件页面，浏览器直接打开就能玩：

**https://htmlpreview.github.io/?https://github.com/ableclaw/corgi-vs-banban-train/blob/gh-pages/play.html**

Public URL, no login:

**https://htmlpreview.github.io/?https://github.com/ableclaw/corgi-vs-banban-train/blob/gh-pages/play.html**

仓库里已经准备好 GitHub Pages 用的 `gh-pages` 分支。当前令牌没有 Pages 管理权限，站点开关需要仓库主人点一次（见下面的部署）。打开之后，干净地址是：

**https://ableclaw.github.io/corgi-vs-banban-train/**

## 故事 / Lore

短腿柯基没跳过防火墙，从版本火车上摔了下去。现在它要一关一关爬回去。

The short-legged corgi missed the firewall, fell off the release train, and is climbing back one level at a time.

关卡都是发布流程里的梗，不是政治段子：

| 关卡 | 中文 | English |
| --- | --- | --- |
| 1 | 入职第一天 | Day One |
| 2 | 需求评审 | Spec Review |
| 3 | 联调之夜 | Integration Night |
| 4 | 封版前夕 | Code Freeze |
| 5 | 版本火车 | Release Train |

路上会遇到：

- **防火墙**：矮的跳得过，底下留缝的只能蹲。
- **工单**：地上的要跳，贴着头顶飞的要蹲。
- **坏构建**：红色箱子，踩上去掉体力。
- **热修**：绿补丁。矮的跳，长条的蹲。
- **版本车厢**：会落下、再抬起。灯变绿、写着「冲」再跑过去。

## 操作 / Controls

- 键盘：← → 或 A / D 移动，空格 / ↑ / W 跳跃，↓ / S 蹲下，P 暂停，M 静音。
- 屏幕按钮：← → 蹲 跳，手机和桌面都能用。
- 跳跃高度是固定的，按久也不会跳得更高——短腿是规则，不是手感 bug。
- 三滴体力。碰到危险会回到最近的检查点。体力归零则本关失败。
- 到达「到站」或终点「车头」即过关，并解锁下一关。进度保存在本机 `localStorage`。

## 本地运行 / Run locally

需要 Node.js 18+。没有额外依赖。

```bash
npm install
npm test
npm start
npm run build
```

浏览器打开 `http://127.0.0.1:3000`。

`npm test` 会用一套固定走位把 5 关都打通，并检查「通过第 1 关会解锁第 2 关」。

## 部署 / Deploy

静态文件，没有后端。本地多文件站点用相对路径，GitHub Pages 项目页可以直接挂。

`gh-pages` 分支已经推上去了，里面有可玩的 `index.html` 和单文件 `play.html`。开启 Pages 需要仓库管理员：

1. 打开仓库 Settings → Pages。
2. Build and deployment 选 Deploy from a branch。
3. Branch 选 `gh-pages`，目录选 `/ (root)`，保存。
4. 等一分钟，打开 https://ableclaw.github.io/corgi-vs-banban-train/

命令行（令牌需要 Pages 管理权限时）：

```bash
npm run build
git push origin HEAD:gh-pages
gh api --method POST repos/ableclaw/corgi-vs-banban-train/pages \
  -f build_type=legacy \
  -f source[branch]=gh-pages \
  -f source[path]=/
```

以后更新：

```bash
npm run build
git push origin HEAD:gh-pages
```

`npm run build` 用 esbuild 把脚本打进 `play.html`。GitHub 的 HTML 预览服务不加载相对路径的模块，所以现在的公开链接指向这个单文件。

## 项目结构 / Layout

```
index.html          标题、选关、对局
css/style.css       界面
js/constants.js     短腿跳跃的物理常数
js/levels.js        五关布局
js/engine.js        碰撞、受伤、过关
js/render.js        画面
js/main.js          键盘、触屏、存档
test/playability.js 关卡可通关测试
```
