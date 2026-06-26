# 丹青院 v2 改动明细（2026-06-16 ~ 06-17）

**用途：** 汇总 06-16~06-17 四轮叙事系统改造（剧情连贯+画案手记 / 事件驱动 pendingHook / 剧情驱动三件套 / 三件套信号化修正）的实现位置与依据。
**配套文档：**
- 设计总纲：`2026-06-10-danqingyuan-v2-design.md`
- 前序改动：`2026-06-15-danqingyuan-v2-changelog.md`（双沙盒+场景完才推进+晚间修复）
- 代码仓：`workspaces/danqingyuan-mvp`（下文相对路径以此为根）

> 行号为落笔快照，定位以「文件 + 符号名」为准。这四轮主线是「让 LLM 剧情连贯、可承载事件、由剧情驱动行动签」。

---

## 一、剧情连贯 + 画案手记（2026-06-16，拍板来源：明明「成长LLM被机械行动干扰后忘记接前文；第二日与第一日不衔接；想要阅读档案」）

### 1.1 方向：保留时段模型，靠「喂上下文」连贯（非可恢复场景）
明明先倾向"真·可续读连续剧"（场景按线程恢复），评估后否决（与时段模型冲突、改动大）。改走：每个场景仍自包含演完即弃，但开场被喂「上一场余韵+本地点上次+昨日小结」，LLM 自然写承接。**连贯是上下文问题，不是场景恢复问题。**

### 1.2 改动
| 改动 | 位置 |
|---|---|
| **A 修 prevSceneEnding 污染**：新增 `GameState.lastSceneEnding`，只 LLM 成长场景 commit 写（gate isLlmRendered，机械行动/兜底句不碰）；`buildPrevSceneEnding(state)` 改读它 | `core.ts`/`sceneEngine.ts buildEnding+buildPrevSceneEnding`/`App.tsx commitPendingSettlement` |
| **B 地点线程**：`memory.locationThreads`（地点→上次摘要），回该地点喂 `appointmentContext` 类似位 | `memory.ts`/`commitPendingSettlement` 写/`buildSceneInput` 喂 `locationThread`/prompt 段（prevSceneEnding=紧接上一场硬锚点 vs locationThread=本地软回响，定优先级） |
| **C 跨日当日小结**：`buildDailySummary(state)` 拼当日 storyLedger（不调LLM，方案b），就寝/强制入夜跨日时 push `memory.summaries`，次日晨课 retriever 喂入承接 | `sceneEngine.ts buildDailySummary`/`gameEngine.ts applyAction 跨日块` |
| **D 画案手记**：`storyLedger.visibleText` 已存每场全文（commitMemoryPatch），补「LLM空memoryNote也写账本」缺口（双gate：档案=resolveTextLen>0 含兜底句不缺格；锚点=isLlmRendered）；新建 `ArchiveScreen` 按日×时段列全文+当日提要，顶栏「画案手记」入口 | `App.tsx commit`/`components/ArchiveScreen.tsx`新建/`MainGameScreen onOpenArchive` |
| prompt v7 + 存档 v6 | `scene_narrator@2026-06-16.v7`；`storage SCHEMA_VERSION 6 + migrateV5` |

### 1.3 入院引文首场锚点（边界）
改读 lastSceneEnding 后首场承接会断 → `enterAcademy` 把 `lastSceneEnding: admissionText` 一并写（入院引文是真实叙事正文）。

### 1.4 验证
node 实测（prevEnding 防机械污染、buildDailySummary 筛当日、就寝跨日生成小结）+ e2e PASSED（画案手记 12 条全文、当日提要、跨日承接）。

---

## 二、事件驱动剧情 pendingHook（2026-06-16，拍板来源：明明「去赴画摊少年的约，到街市LLM不出剧情；某地点成长签空洞」）

### 2.1 病根
叙事与行动签脱节：LLM 正文说"明日街市见"，但**约定没变成任何系统状态**；事件骨架（triggeredEventIds/completedEventIds/eventIdsCompleted）类型+处理逻辑都在但**从未被调用**（现成空壳）。

### 2.2 机制：LLM 产出剧情约定，引擎承载并在正确地点触发
| 改动 | 位置 |
|---|---|
| `GameState.pendingHooks: PendingHook[]{id,day,locationId,npcId?,label,summary,createdDay,status}` | `core.ts`；`storage SCHEMA_VERSION 7 + migrateV6` |
| LLM resolve 输出 `suggestedPatch.pendingHook`；`clampSceneSuggestedPatch` 改返回 `{patch,hook}`，裁决：day>当前≤7、**locationId∈BASE_LOCATIONS（剔秘阁/画室防约在未解锁地）**、label≤12/summary≤50截断、npcId白名单 | `llm.ts`/`sceneEngine clampPendingHook`/`llm-validation validateSceneSuggestedPatch`（只类型/长度硬校验，业务边界交clamp静默丢弃） |
| **绕开 ACTIVITY_BY_ID 坑**：新 ActionType `keep_appointment`（getActionTrack 认 growth，否则查不到卡判 mechanical 不调LLM）；`getHookActions` 对应日地点注入赴约签（staminaCost 0 不被体力卡死，仅叙事时段）；rollNpcsPresent 赴约保证对象在场；buildSceneFacts 喂约定 | `actions.ts`/`gameEngine.ts`/`sceneEngine.ts`/`App buildSceneInput appointmentContext` |
| 完成标记：commitPendingSettlement 标 status:'completed' + 归档 completedEventIds（**时序坑：在 next 链末尾覆盖，否则被 settled 行动前快照盖掉**）；新约定入队 | `App.tsx commitPendingSettlement` |
| 跨日未赴标 missed（不再注入签）；prompt v8 加 pendingHook 产出段+赴约段 | `gameEngine 跨日块`/`scene_narrator@2026-06-16.v8` |

### 2.3 空洞地点环境签 wander
新 ActionType `wander`（growth）：叙事时段当前地点无成长签且无 hook 时注入零成本「信步走走」→调 LLM 写环境/偶遇。**与 06-15 废弃的 mechanical look_around 明确区分（代码加注释）**：那个不调LLM只弹空提示，wander 是完整 LLM 场景、是将来 NPC 偶遇挂载点。

### 2.4 验证
9 项 node 单测全绿（clamp 裁决/getHookActions 注入/getActionTrack/跨日missed）+ e2e 回归 PASSED（day1 不受 hook 干扰）。完整 hook 端到端依赖 LLM 自发产出约定（不稳定），留手动验。

---

## 三、剧情驱动三件套（2026-06-17，拍板来源：明明「行动签固定词条致LLM注水；否决纯自由输入会失控」）

### 3.1 方向
取代叙事场景内的固定分支选项，改三件套（剧情驱动）：
- **继续**：LLM 沿剧情续写，不预设题材（治"夜读画论"注水），不推进时段。
- **去别处看看**：LLM 收束本场，回主界面开放地点跳转。
- **推荐行动**（1~3，LLM 按剧情产出带地点的下一步）：复用 pendingHook 裁决骨架。
- **继续的语义闸（方案A）**：scene_narrator 每段输出 `sceneCanContinue`（本场还有无张力），不靠字数硬切；**硬上限保险丝** maxSegments（叙事4/晨课3）防失控。

### 3.2 改动：场景循环 open→mid→resolve 改 open→continue\*→end
| 改动 | 位置 |
|---|---|
| ActiveScene 删 rounds/answeredRounds/choices，加 segmentCount/maxSegments/sceneCanContinue/suggestedActions；状态 loading-open/reading/loading-continue/loading-end | `App.tsx` |
| open 不要求 choices；新 `continueScene(playerInput?)`（复用 mid 通道、不结算不推进）；新 `endScene({reason,next?})`（复用 resolve 通道+commit）取代 resolveScene；commitPendingSettlement 加 afterCommit（推荐行动结算后用 committed state 串场） | `App.tsx` |
| 新 ActionType `follow_suggestion`（getActionTrack growth）+ GameAction.intent；`clampSuggestedActions(raw,unlocked)`（未解锁剔除/截断/≤3）；SceneNarratorOutput sceneCanContinue/suggestedActions/SceneSuggestedAction | `actions.ts`/`llm.ts`/`sceneEngine.ts` |
| 三件套 UI（reading 态）+ 自由输入=带话的继续；prompt v9 open/continue/end 三段；mock 适配 | `MainGameScreen.tsx`/`scene_narrator@2026-06-17.v9`/`mockAdapter.ts`/`llm-validation` continue phase |

### 3.3 顺手修第三日 bug（晨课背景停宿舍）
就寝跨日 currentLocation 不重置 → 晨课背景/场景错位为宿舍。三处+1连带：①advanceTime 跨日 `currentLocation='hall'`；②runAction loading 期 setState 带 currentLocation；③MainGameScreen backgroundUrl 取 `scene.locationId`；④applyAction `targetLocation` 跨日不被 action.locationId(宿舍) 覆盖（连带坑）。

### 3.4 范围收敛（明明拍板）
保留固定成长签+数值不动，数值/刷分/退役固定签留下轮。验证：node 3项+e2e PASSED（三件套全流程+第三日bug+全回归）。

---

## 四、三件套信号化修正（2026-06-17，拍板来源：明明「去别处恒显示是错的；三按钮应全由LLM判断驱动；UI应移到底部dock」）

### 4.1 上轮错误
「去别处看看」做成了**恒显示**（MainGameScreen 无条件渲染）→ "该续写/推荐时却出现去别处，点了又续写"。明明规则：三按钮**全由 LLM 每段判断驱动**。

### 4.2 修正：三独立信号（拍板）
- **继续** = `sceneCanContinue`（已对）
- **去别处** = **新增 `shouldConclude`**（LLM 判断剧情该收束了才亮，**不再恒显示**）
- **推荐行动** = `suggestedActions`（已对）
- **全灭兜底**：三信号都没给时强亮去别处防卡死（`showLeave = shouldConclude || (!showContinue && suggestedActions空)`）。

| 改动 | 位置 |
|---|---|
| SceneNarratorOutput 加 shouldConclude?；校验布尔；ActiveScene 加 shouldConclude；startScene/continueScene 读取 | `llm.ts`/`llm-validation`/`App.tsx` |
| **三件套移出正文→底部 dock，同 gm-action-tag 样式**（推荐金/继续墨/去别处灰）；正文区只留 loading 文案 | `MainGameScreen.tsx`/`app.css` |
| prompt v10：open/continue 三信号指引（剧情正酣只 canContinue；转折给 suggestedActions；了结给 shouldConclude；至少给一个）；mock continue 段给 shouldConclude | `scene_narrator@2026-06-17.v10`/`mockAdapter.ts` |

### 4.3 验证
e2e PASSED：真实 LLM 给 `shouldConclude=False` 时去别处确实不出现（治 bug 主诉），继续到 maxSegments 后兜底强亮；第三日 bug、画案手记、全回归正常。

---

## 五、本期已知坑 / 教训

1. **连贯靠喂上下文，不是恢复场景**：lastSceneEnding（上一场）/locationThreads（本地点）/summaries（昨日）三层喂 LLM。
2. **pendingHook/三件套签绝不能用 `type:'activity'`+假 activityId**：getActionTrack 查不到 ACTIVITY_BY_ID 判 mechanical→不调 LLM。必须新 ActionType + getActionTrack 显式认 growth。
3. **commitPendingSettlement 写 pendingHooks/lastSceneEnding 必须在 next 链末尾**：next 起于 settled（行动前快照），早写被覆盖。
4. **跨日 currentLocation 重置后，applyAction 的 targetLocation 会用 action.locationId 覆盖**——跨日行动须特判保留 advanceTime 设的 hall。
5. **SCENE_PROMPT_VERSION 常量与 prompt 文件版本只需各自非空**（proxy 发文件版本，请求只校验非空字符串）——上轮 v9 常量漏改仍跑通即因此，但应保持一致以免 traceability 断。
6. **e2e 只验状态不验视觉**：去别处恒显示这类 UI 逻辑 bug、半透明遮罩透出这类视觉重叠，须浏览器探针 is_visible 定位。

---

## 六、决策溯源索引

| 决策 | 来源 |
|---|---|
| 连贯靠记忆上下文 / 画案手记 | 明明 2026-06-16 口述+AskUserQuestion（上一场+地点线程/生成当日小结/时段编年全文） |
| LLM 产出剧情约定 pendingHook / 空洞补环境签 / 保留机械签 | 明明 2026-06-16 AskUserQuestion |
| 剧情驱动三件套 / sceneCanContinue 方案A / 硬上限保险丝 | 明明 2026-06-17 口述+AskUserQuestion（否决纯自由输入） |
| 三独立信号 shouldConclude / 全灭兜底强亮去别处 / UI 移底部 dock | 明明 2026-06-17 AskUserQuestion |
| 数值/刷分/退役固定签留下轮 | 明明 2026-06-17 拍板（范围收敛） |
