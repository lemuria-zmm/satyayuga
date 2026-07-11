# 丹青院 v2 改动明细（2026-07-11）

**用途：** ①谢幕页回退到长卷之前那版（四背影居中逐一消融）；②新增**每日过场小剧场**——就寝跨日→次日晨课前的全屏水墨过场。
**代码仓：** `workspaces/danqingyuan-mvp`，分支 `danqingyuan-v2-baseline`。

---

## 一、谢幕页回退（明明：还是用之前的版本）
方案A 长卷展卷撤回：`CurtainCallScreen.tsx` / `curtainCallText.ts` git checkout 回 78fb6f6（静态青绿山水 + 四位背影 multiply 居中逐一消融 + 细密粒子 + 底部横排文字 + 朱印标题）；`app.css` 的 `.cc-*` 块反向换回四位置版（删长卷 cc-scroll/cc-panel/cc-panel-vtext 等）。3 张 vignette 图仍留 public（供过场复用）。

## 二、每日过场小剧场（明明·过场动画式）
- **触发**：`state.time.day` 递增（就寝跨日）→ 次日晨课前，全屏弹一段水墨过场。进第 2~7 日各一段（6 段）。读档/首拍不触发。App 加 `dayInterlude` state + `prevDayRef` + 跨日 effect。
- **组件** `DayInterludeScreen`：全屏水墨图 + 底部暗幕 + 左上「入院第 N 日」+ **逐字模板小故事**（数行、逐行打字）+ 点击快进/继续进次日。早于主界面/引导 render。
- **内容** `content/dayInterludes.ts`（固定模板、化名安全、暗线只暗示）：
  - 第2日·希孟作画——希孟怪癖：越是风雨天越爱抱画具往外跑
  - 第3日·二人对弈——李唐择端为皴法争红却落子不让
  - 第4日·嵩立舟头——嵩「画里的人要活，先得看够活人」
  - 第5日·希孟俯瞰山水——希孟登高看江山一日、闭门作画
  - 第6日·亭子与舟——花石船过境、渔家渐少（暗线一笔）
  - 第7日·希孟作画——丹青试今日、昨夜书房灯亮到天明
- 5 张 vignette 图（希孟作画/二人对弈/嵩立舟头/希孟俯瞰山水/亭子与舟）拷 public。

## 三、验证
- `npm run build`✅；回归 `test-activity-backgrounds` 23/0、`test-weather` 14/0；无 console.log；谢幕长卷类已清空。5 张 vignette 资源 200。
- **待明明真机走查**：过场触发时机（就寝→次日晨课前）、逐字节奏、图文观感；谢幕页回退是否是要的版本。
