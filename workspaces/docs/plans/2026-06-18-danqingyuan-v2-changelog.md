# 丹青院 v2 改动明细（2026-06-18 ~ 06-25）

**用途：** 汇总这一阶段「退役固定签 → A+C 叙事时段重构 → 七日流程打磨」的实现位置与依据。本阶段把叙事时段（晨课/上午/下午）彻底改造为「自动开场 + 三件套连续推进 + 报时钟收尾」的连续 LLM 流，并修掉随之暴露的一连串流程 bug。
**配套文档：**
- 设计总纲：`2026-06-10-danqingyuan-v2-design.md`
- 前序改动：`2026-06-16-danqingyuan-v2-changelog.md`（叙事系统四轮改造）
- 代码仓：`workspaces/danqingyuan-mvp`（下文相对路径以此为根）

> 定位以「文件 + 符号名」为准。本阶段主线：**叙事时段 = 连续 LLM 流，玩家靠三件套（继续/推荐/去别处）+ 自由走动推进，报时钟收尾跨时段。**

---

## 一、退役固定成长签 + 去掉小测/畅谈按钮（2026-06-18，拍板来源：明明「固定签以行动为由头开新场，不接续前文；小测/对谈两个固定按钮去掉」）

### 1.1 病根
叙事时段有两套并行开场逻辑：固定成长签（请教导师/书房查证/写生等）以 actionLabel 为由头开**独立场景**，只有 prevSceneEnding 弱接续，LLM 常「另起炉灶」；而三件套是连续流。两者割裂导致剧情不接续。

### 1.2 改动
| 改动 | 位置 |
|---|---|
| 退役 5 张叙事时段成长卡（library_research/deep_research/market_sketch/garden_view/consult_teacher）`timeSlots` 改 `[]` | `content/activities.ts` |
| 去掉「小测一下」「畅谈」固定按钮 + 相关 state/JSX；希孟便签卡改纯展示（不可点对谈） | `components/MainGameScreen.tsx`（删 canQuickExam/canChat/chatNpcs/showChatSelect）/`App.tsx`（移除 onQuickExam/onChat props） |
| 成长收益暂置零（拍板：数值留下轮）——退役卡后 wander 无数值收益，自然为零 | — |

---

## 二、A+C 叙事时段重构（2026-06-18，拍板来源：明明「去别处既收束又推进时段+自动开场，导致叙事时段无自由走动窗口」）

### 2.1 四个互相关联的 bug（同根）
根因：「去别处看看」既收束场景**又推进时段**（`advanceSlotOnCommit:true`）+ 自动开场，玩家在上午/下午**完全没有自由走动的窗口**。
1. 第一日街市解锁了却进不去（去别处直接推进沙盒）；
2. 推荐行动跳转撞日终字数预算保险丝 → 落模板「你循着方才的念头…」+ 固定签，不接前文；
3. 晚间夜读（sandbox growth）点去别处也推进 → 从 evening 跳次日，跳过就寝；
4. 去别处仍调 LLM 写收束段 + 缺回访接续。

### 2.2 拍板方案 A+C
- **「去别处」改语义** = 收束 + 回自由走动（**不推进时段、不调 LLM**）：新建 `concludeScene()`，直接用 openText 收束，写 `locationThreads[地点]`（记忆衔接，玩家任何时段回该地点自动开场喂 locationThread 接续），recordIntents 落持久层，countsAsScene。`endScene` 收敛为仅 `reason:'follow'`（推荐串场）。
- **自动开场粒度 = 每到新地点**：useEffect `autoStartRef={slotKey,visited:Set<LocationId>}`，每地点本时段只自动开一次（防去别处后原地重启），走到新地点才开新场。runAction 三条入场路径（auto-wander/follow_suggestion/手动 intent）统一标记 visited。
- **时段推进改报时钟收尾签**：`TimeState.slotSceneCount`（advanceTime 清零），报时钟（id `chime`、type `rest`、staminaCost 0、locationId 当前地点各处可见，复用 rest 的 timeAdvance）。`commitPendingSettlement` 加 `charDelta`（去别处传 0 防双重记账）+ `countsAsScene` 两参。
- **follow_suggestion 豁免字数预算**（治 #2）：startScene 预算检查跳过 follow，否则接续场景落模板。

| 改动 | 位置 |
|---|---|
| `slotSceneCount` 字段 + 跨时段清零 + 存档迁移 | `types/core.ts`/`engine/statePatches.ts advanceTime`/`engine/initialState.ts`/`persistence/storage.ts SCHEMA 8→9 migrateV8` |
| concludeScene/endScene 收敛/charDelta/countsAsScene | `App.tsx` |
| 报时钟收尾签注入 + chimeAction helper + MAX_SLOT_SCENES | `engine/gameEngine.ts` |
| 报时钟 UI（gm-action-tag-chime + 青铜钟图 icon-chime.png） | `components/MainGameScreen.tsx`/`styles/app.css`/`public/ui/icon-chime.png` |

---

## 三、A+C 第二轮：晨课出口 + 报时钟阈值 + 晚间叮嘱时机 + 午后回院堂（2026-06-18，拍板来源：明明试玩 3 问题）

| # | 问题 | 修复 | 位置 |
|---|---|---|---|
| 1/2 | 卡院堂、报时钟不出现 | **真因晨课时段无推进出口**（玩家卡在 morning_class）。晨课上完 1 场报时钟接管（`getMorningClassActions` slotSceneCount≥1 返回 [chimeAction]）；报时钟阈值从满 3 场改**演完 ≥1 场即可点**（不卡死，自动开场仍上限 3，满 3 场 UI 加 `gm-action-tag-chime-urge` 强脉动） | `engine/gameEngine.ts` |
| 3 | 午后到晚上跳跃感 | **(a)** 晚间小书童叮嘱从「晚间 slot 开头弹」改到「玩家回宿舍时才弹」（`getActiveGuideStep` evening gate `currentLocation==='dormitory'`；晚间开头改 SILENT_SLOT_UNLOCKS 静默解锁宿舍 flag `tutorial_evening_unlocked`）；**(b)** 午间歇晌后 currentLocation 回院堂（applyAction targetLocation：rest+id`rest`+noon→`hall`），wander facts 院堂非晨课加「此刻非晨课、无授课、课后走动」防 LLM 演课堂 | `content/tutorialScripts.ts`/`engine/gameEngine.ts`/`engine/sceneEngine.ts` |

---

## 四、字数预算放宽（2026-06-18，拍板来源：明明「第二日午后回院堂只见模板句」）

**根因**：`DAY_CHARS_MAX=4500` 是旧模型（一时段一场、一天约 10 段）定的；A+C 新模型一时段最多 3 场、每场 open + 可多次「继续」，第二日午后累积 ~5100 撞顶走 fallback 模板句。第一日因教程流场景受限没暴露，第二日才现。

**修**：`DAY_CHARS_MAX` 4500→**12000**（`engine/sceneEngine.ts`）。正常游玩充足余量，仍为失控 LLM 字数侧兜底（场景数已由报时钟 MAX_SLOT_SCENES=3/时段硬封顶）。

---

## 五、推荐签「去别处」困死院堂（2026-06-25，拍板来源：明明试玩 + proxy/console 日志定位）

**根因（useEffect 竞态）**：进 forenoon/afternoon 时，自动开场 useEffect（定义在前先跑）用 stale 的 `unlockedLocations=['hall']` 开场，静默解锁 useEffect（定义在后，加 library/garden）还没跑。自动开场把 stale 快照带进整条 follow 链 → `clampSuggestedActions` 把 LLM 正确返回的 `library` 推荐签按 ['hall'] 全裁成 [] → 困死院堂；点推荐签 follow 又在院堂原地开场，LLM 按 intent 自己演「去书房」→「标题院堂、正文书房」矛盾。

**日志铁证**：`raw=[{label:"细看花鸟稿",locationId:"library"}] clamped=[] unlocked=['hall']`。

**修（两处，`App.tsx`）**：
1. 核心：自动开场 useEffect 开头加 `if (getSilentSlotUnlock(state)) return`——本时段有待应用静默解锁时 bail 这一拍，让解锁 effect 先更新 state，下一拍以正确 unlocked 再开场；
2. 防御：startScene open 阶段 clampSuggestedActions 改用 `stateRef.current`（live）而非 settledState 快照（与 continue 阶段一致）。

---

## 六、七日流程打磨（2026-06-25，拍板来源：明明七日试玩）

| 项 | 改动 | 位置 |
|---|---|---|
| 四张夜景图 | 院堂/后花园/街市/书房晚间换夜景（main-night/garden-night/market-night/library-night），backgroundUrl 按 bgLocation+isEveningBg 切换 | `components/MainGameScreen.tsx`/`public/*-night-bg.png` |
| 删夜读画论 eve_yedu | 晚间唯一 growth(LLM) 卡，但晚间 sandbox 不推进时间 → 可反复刷读画论剧情，与「晚间=机械娱乐」矛盾。删卡，晚间书房显「无事可做」 | `content/activities.ts` |
| 餐签钱不足置灰（非消失） | 根因是没钱（非 bug）。钱过滤从 getAvailableActions 移除（只留 stamina），新增 `isActionAffordable`，dock 钱不足签置灰 + 显「需X文」（设计 §3.4 原意） | `engine/gameEngine.ts`/`components/MainGameScreen.tsx`/`styles/app.css` |
| 自由临摹场景化 | free_copy 从「选技能」改「选场景，场景定技能」：临古帖[院堂,本科+1]/后花园写生[山水+1]/街市写生[人物+1]。各场景不同地点/背景图/LLM 叙事/在场 NPC（院堂李唐巡看，街市等交地点常客 roll） | `engine/gameEngine.ts getMorningClassActions+resolveMorningClass`/`engine/sceneEngine.ts buildSceneFacts+rollNpcsPresent` |
| 第一日不可排自由临摹 | 刚入院须正课打底。SchedulePlanner 第一日不渲染 free_copy chip + validateCurriculum 兜底校验 | `components/SchedulePlanner.tsx`/`content/courses.ts validateCurriculum` |

---

## 七、本阶段已知坑 / 教训

1. **改时段/场景循环模型后必须重算字数预算**：预算常量按旧模型节奏定，新模型场景密度变了会静默触发 fallback，且因教程流第一日不暴露、第二日才现。
2. **多个 useEffect 监听同一 [state] 时执行顺序 = 定义顺序**：先定义的拿到本拍未经后续 effect 更新的 state。渐进解锁 + 自动触发类逻辑必须让「状态变更 effect」先于「消费状态 effect」，或在消费方显式 gate 住未完成的状态变更。
3. **异步收尾/clamp 用 live `stateRef.current`，不用进场快照**：settledState/pendingSettledState 是场景开始时捕获的，渐进解锁等后续变更不在其中。
4. **调试组合**：临时 proxy 日志（role/phase/loc）+ 浏览器 console（raw/clamped/unlocked）定位最快。
5. **环境坑**：`npx tsx` 冷启动慢且并发多实例会互相挂起；用缓存的 `.npm/_npx/<hash>/node_modules/.bin/tsx` 串行单跑，勿 pkill 打断运行中实例。

---

## 八、决策溯源索引

| 决策 | 来源 |
|---|---|
| 退役固定签 + 自动开场 + 去小测/畅谈 | 明明 2026-06-18 口述 + AskUserQuestion |
| A+C（去别处不推进/每到新地点开场/报时钟满3场） | 明明 2026-06-18 AskUserQuestion |
| 晨课报时钟出口 / 报时钟≥1场可点 / 晚间叮嘱回宿舍弹 / 歇晌回院堂 | 明明 2026-06-18 口述 + AskUserQuestion |
| 字数预算放宽 | 明明 2026-06-18 试玩反馈 |
| 竞态修复（困死院堂） | 明明 2026-06-25 试玩 + 日志定位 |
| 四夜景 / 删夜读 / 餐签置灰 / 自由临摹场景化 / 第一日禁自由临摹 | 明明 2026-06-25 试玩 + AskUserQuestion |
