# 丹青院 v2 改动明细（2026-06-27）

**用途：** 成长数值重设计——新增**沙盒练习成长系统**，填补退役固定签后"画院养成"核心支柱空缺。
**配套文档：**
- 设计总纲：`2026-06-10-danqingyuan-v2-design.md`
- 前序改动：`2026-06-25-danqingyuan-v2-changelog.md`（希孟 NPC 系统 + LLM 加固）
- 代码仓：`workspaces/danqingyuan-mvp`（下文相对路径以此为根）

> 本轮主线：**叙事阶段不再自动给数值（拉不开差异），改为玩家在午/晚沙盒自主走到书房/后花园/街市，点专属"练习签"主动练技能——调 LLM 出单段沉浸文 + 引擎确定性给技能点。差异化来自玩家如何分配有限的沙盒体力。** 记忆决策编号 69。

---

## 一、病根（退役固定签的后遗症）

退役固定成长签后（06-18，第49条），技能/学识近乎冻结：
- 七日里技能**唯一稳定来源是晨课**（本科+1/学识+1）。
- 上午/下午叙事场景（wander/follow）`clampSceneSuggestedPatch` **完全不裁决技能/学识 delta**。
- 结果：本科技能从 18 涨到约 24 就到顶，养成感薄、叙事与成长脱节。

明明拍板：**叙事阶段自动给数值无意义（所有人涨得一样、拉不开差异）**；改为沙盒主动练习，差异来自玩家的资源分配取舍。

## 二、核心机制：第四条行动路径 `practice`

| | 机械签（吃饭/娱乐） | 叙事成长签（晨课/wander/follow） | **练习签（新）** |
|---|---|---|---|
| LLM | 不调 | 三件套 open→continue→conclude 多段 | **单段 practice phase** |
| 推进时段 | 否（沙盒） | 是（叙事时段，报时钟收日） | **否（沙盒，扣体力）** |
| 主线账本 | 不写 | 写 | **不写** |
| 数值 | 模板固定 | LLM 软裁决 | **引擎确定性给技能** |

**关键**：练习调 LLM 但**不走 `isLlmScene`→`startScene` 三件套**（太重）；新建独立轻量路径 `App.runPractice`。

## 三、已确认决策（AskUserQuestion）

1. **防刷=只靠体力闸**：沙盒不推时间，但练习扣 1~2 体力；体力靠吃饭恢复、吃饭花钱、钱每日仅 5 文 → 体力+钱文天然双重隐性闸。**+ 每日技能涨幅封顶兜底**。
2. **轻量叙事=复用 scene_narrator 新增 `practice` phase**（单段沉浸文，不进三件套、不推主线、不引 NPC、不给分支）。
3. **沙盒结构=午/晚开放自由走动 + 各地练习签**（结构已就位，午间全开放/晚间开放书房后花园街市）。
4. **技能涨幅=本科（玩家 styleOrigin）每次 +2，副技能/学识 +1**。
5. **每日技能涨幅封顶 4 点**（仅三画技正增长计入；学识不计入、不受限）。
6. **练习签每地 2~3 种**。

## 四、改动清单

| 改动 | 位置 |
|---|---|
| `DAILY_SKILL_CAP=4`、`TimeState.skillGainedToday`（跨日清零） | `types/core.ts` |
| `ValidatedStatePatch.skillGainedTodayDelta`（练习封顶累加） | `types/actions.ts` |
| `ScenePhase` 加 `'practice'`；`ActivityCard.track` 加 `'practice'`、新增 `practiceSkill` 字段 | `types/llm.ts`/`content/activities.ts` |
| `ActionTrack` 加 `'practice'`；`isLlmScene` 收敛为只认 growth/narrative（practice 不进三件套） | `engine/sceneEngine.ts` |
| **7 张练习卡** `PRACTICE_ACTIVITIES`：书房（研读画论/阅古画卷/钻研旧档·学识）、后花园（对景写生/观竹石听泉·山水）、街市（速写市井人物·人物 / 画桥梁屋宇·界画），均 `timeSlots:['noon','evening']` | `content/activities.ts` |
| `computePracticeGain`（本科+2/副+1/学识+1）+ `resolvePractice`（确定性结算 + `applyGrowthBonuses` 兼容出身/买画材 buff + **每日封顶裁剪**）；resolveActivity 对 `track:'practice'` 分流 | `engine/gameEngine.ts` |
| `applyValidatedStatePatch` 累加 skillGainedToday；`advanceTime` 跨日清零 | `engine/statePatches.ts` |
| **`runPractice`**：runAction 在 isLlmScene 前拦截 → 调 scene_narrator phase:practice 单段 → 拿文即 `resolvePractice` 结算 + `showSettlement` + `setActiveScene(null)`（不进 reading 态/无三件套 dock）；失败兜底模板句**技能照给** | `App.tsx` |
| prompt 加 `practice` phase 段（单段≤500字纯沉浸·不推主线·不引 NPC·不给分支/钩子/memoryNote）；`SCENE_PROMPT_VERSION` v15→v16 | `server/prompts/scene_narrator.md`/`App.tsx` |
| 校验：phase 归一 `practice→intro`（宽松契约，只要 narrativeText）；mock 两处（mockAdapter/server 无需）加 practice 分支 | `server/llm-validation.mjs`/`llm/mockAdapter.ts` |
| 存档 `SCHEMA_VERSION 11→12` + `migrateV11`（skillGainedToday??=0）；migrateV10 返回 11 | `persistence/storage.ts` |

## 五、设计取舍

- **体力闸的策略意义**：本轮让体力第一次有真正取舍——午/晚沙盒体力有限，练技能 vs 吃饭回体力 vs 娱乐涨心情三选。
- **practice 不写主线账本**：练习与主线无关，纯沉浸，故 `commitMemoryPatch` 走 `isLlmSceneAction=true` 分支（memoryPatch={}）天然不入账本——无需额外改动。
- **封顶只管三画技、学识不限**：学识涨幅本就慢（书房卡每次+1），且有 minKnowledge gate 自限，无需封顶。
- **复用现成结构**：午/晚自由走动（getMoveActions）、地点过滤（getAvailableActions locationId===current）、出身/买画材 buff（applyGrowthBonuses）全部复用，改动收敛。

## 六、验证

- `npm run build`（tsc + vite）✅
- node 引擎单测 **28/0**：computePracticeGain 主/副/学识、练习结算（技能涨/体力扣/不推时段/skillGainedToday）、学识不计入封顶、每日封顶 4 点到顶归零、部分裁剪、跨日清零、出身加成兼容（匠作界画+1）、可见性（书房午间出签/体力0隐藏/晚间街市出·院堂不出）、minKnowledge 门槛。
- 真 LLM practice phase 冒烟：DeepSeek 输出 260 字纯写生沉浸文，**只含 narrativeText + atmosphereTags**（无 suggestedActions/钩子），符合契约。

## 七、待补

- 练习卡道具图：暂借现有 tool-*.png 占位（仿赁书/买画材先例），记入美术清单待出图。
- e2e 真人试玩验证（待明明跑七日）：第二日午间走书房点练习→出文+学识结算笺·时段不推进；连点到封顶仍出文不涨；报时钟/歇晌/就寝收日不受影响。

---

## 八、试玩反馈修正：学识封顶 + 心情作用（2026-06-28，明明试完三日）

**反馈两点**：①吃饭涨体力→点学识签刷数值，学识涨得比预估快；②心情值似乎没发挥作用。

### 8.1 学识刷得快——根因是学识无封顶（不是吃饭值）
上轮只给**技能**加了 `DAILY_SKILL_CAP=4`，学识当时判断"涨得慢+minKnowledge gate 自限"没加封顶。现书房有练习签后过时：午/晚沙盒不推时间，**免费「讨碗热茶」(+1体力) + 走书房(免费) + 研读画论(-1体力,学识+1) 循环 → 体力净零、不花钱、可无限刷学识**。调低吃饭体力治标不治本（免费讨茶照样刷）；**根治=给学识也加每日封顶**（与技能对称，封顶后点了仍出文但不涨）。

| 改动 | 位置 |
|---|---|
| `DAILY_KNOWLEDGE_CAP=3`、`TimeState.knowledgeGainedToday`（跨日清零）、`ValidatedStatePatch.knowledgeGainedTodayDelta` | `types/core.ts`/`types/actions.ts` |
| `resolvePractice` 加学识封顶裁剪（仿技能）；statePatches 累加+跨日清零；initialState 初始化 | `engine/gameEngine.ts`/`statePatches.ts`/`initialState.ts` |
| 存档 `SCHEMA 12→13`+`migrateV12`（knowledgeGainedToday??=0；migrateV11 返回12） | `persistence/storage.ts` |
| **顺手修上轮漏洞**：`practice_deep_study`（钻研旧档·体力-2·minKnowledge:10）原与画论同走 knowledge=1，性价比反更差→加卡字段 `practiceAmount` 覆盖默认涨量，钻研旧档=学识+2；`computePracticeGain` 加 baseOverride 第三参 | `content/activities.ts`/`engine/gameEngine.ts` |

> **吃饭体力值未动**——根因是学识无封顶，封顶一加，免费讨茶/付费买饭刷学识全堵死。晨课画理课的学识**不受练习封顶约束**（封顶仅 track:'practice'）。

### 8.2 心情曾是死数值 → 高低双向作用（明明：心情1+3，高低都发挥作用）
**病根**：心情能涨（饮食蜜煎/共膳、娱乐投壶听琴）但**无任何数值后果**——唯一读它的 `practiceGain`（≥8+1）是旧 `practice_skill` 死路径，新 `computePracticeGain` 没读；其余只是喂 LLM 写"落笔更准/画歪"文案。

**拍板（方向1+3，高低都要）**：
- **方向1（高心情奖励/低心情软惩罚）**：新增 `moodGrowthModifier(state)`（≥8→+1 / ≤3→-1 / 中性0）；作用于**练习签 + 晨课**的技能&学识正增长，clamp≥1（练了总有一点长进）。让娱乐/饮食的心情收益真正反哺成长。心情修正在每日封顶裁剪**之前**应用。
- **方向3（低心情硬闸）**：新增 `isPracticeMoodLocked(state,action)`——心情≤3 时**练习签被锁**（MainGameScreen dock 置灰「心绪不宁」disabled；applyAction 防御性 no-op 不扣体力不结算出提示文），逼玩家先用同时段饮食/娱乐调心情→当场解锁。**晨课不锁**（morning_class 时段无调心情手段，锁了卡死；晨课靠方向1的收益-1 软惩罚兜底）。

| 改动 | 位置 |
|---|---|
| `moodGrowthModifier` + `isPracticeMoodLocked` 导出 | `engine/gameEngine.ts` |
| resolvePractice / resolveMorningClass 应用心情修正（clamp≥1，封顶前） | `engine/gameEngine.ts` |
| applyAction 加 isPracticeMoodLocked 防御 no-op（在 stamina/money 守卫后） | `engine/gameEngine.ts` |
| dock 练习签心情≤3 置灰「心绪不宁」（仿钱不足 unaffordable 机制，usable=affordable&&!moodLocked） | `components/MainGameScreen.tsx` |

> **范围权衡（AskUserQuestion）**：锁练习签不锁晨课——避免锁晨课卡死 morning_class（同时段无调心情手段）。练习签在午/晚沙盒、同时段就有饮食/娱乐，闭环顺。

### 8.3 验证
- `npm run build` ✅；node 单测 **22/0**（moodGrowthModifier 三档/学识封顶3到顶归零+部分裁剪+跨日清零/钻研旧档+2/心情8练习+晨课收益+1/心情≤3锁练习isPracticeMoodLocked+applyAction no-op/餐签不受锁/晨课不锁且收益clamp≥1）+ 回归 **5/0**（技能封顶仍4/心情6无修正/吃饭机械不推时段回体力）。
- **未动 prompt/mock**（纯引擎+UI+存档），不重启 proxy。

---

## 九、心情下降通道 + 练习生文收窄（2026-06-28，明明试玩反馈）

**反馈两点**：①一直没看到心情值减少的触发；②练习签生文太长，想约束每次 ≤150 字。

### 9.1 心情曾只升不降 → 加两条确定性下降通道
**病根**：所有活动卡 mood effect 全是正值（饮食/娱乐都涨心情），唯一能减的是 LLM 场景 resolve 的 suggestedPatch.moodDelta（极少给负值）。**心情基本只升到 10 封顶，第八节做的"心情≤3 锁练习/收益-1"惩罚永不触发**——正是明明"看不到心情减少"的原因。

**拍板（AskUserQuestion 多选）**：成长行动消耗心情 + 体力归零扣心情。
| 改动 | 值 | 位置 |
|---|---|---|
| 成长行动耗心情：晨课 + 练习签每场 `moodDelta -1`（叙事 wander/follow 不扣——逢偶非苦练） | -1/场 | `resolvePractice`/`resolveMorningClass` |
| 体力归零强制入夜额外 `mood -2`（"累垮了"；**正常就寝不扣**，只在强制跳段路径触发一次） | -2 | `statePatches.advanceTime` while 循环后，collapsed 标记 |

> **经济平衡**：心情初始6/上限10；一天成长行动约扣 2~4，饮食娱乐一天可回补 +3~5（蜜煎+2/听曲+3/投壶+2 等）。劳逸失衡→心情跌到≤3→练习被锁，逼玩家停下来调节。心情现在是真正流动的资源。

### 9.2 练习生文收窄 ≤150 字
- `PRACTICE_SEGMENT_MIN=60`/`PRACTICE_SEGMENT_MAX=150`（sceneEngine 导出），runPractice 用之替代全局 SEGMENT_MIN/MAX(200/500)。
- prompt practice 段加"简短·精炼克制·宁短勿长·不铺陈环境长描写"；校验/sanitize 用传入 segmentMax 自然按 150 卡范围+截断。
- SCENE_PROMPT_VERSION v16→**v17**，已重启 proxy。

### 9.3 验证
- `npm run build` ✅；node 单测 **12/0**（练习字数常量 60/150、练习扣心情-1、晨课扣心情-1、强制入夜额外-2、正常推进不扣、正常就寝不扣）。
- 真 LLM 冒烟：研读画论生文 **127 字**（≤150），只含 narrativeText+atmosphereTags，简洁不注水。
- **改了 prompt → 已重启 proxy**（v17 前后端一致）。

---

## 十、晚间宿舍「温书自测」（周中小测系统）（2026-06-28，明明指定方向）

**背景**：退役小测后（06-18）1~6 日只有晨课，**第7日才突然来唯一一次丹青试**——七天对考核零预期零反馈、丹青试突兀。明明拍板：**晚间回宿舍休息时段加「温书自测」签**，夜里灯下温书自省、自测当日所学，给七日养成补阶段性自检+反馈，为丹青试预热。**模板句要自然衔接夜读情境**。

**决策（AskUserQuestion）**：①触发=晚间宿舍（就寝签旁）；②**独自温书自测、导师不在场**（夜里独处非课堂抽考）；③1~6 日每晚回宿舍可测一次（flag `quick_exam_d{day}` 当晚限一次），第7日终章不测；④答对小额加成、**答差不罚**；⑤小测 **1 题**（丹青试 2 题）。

**复用**：出题 `generatePaintingPrompt(mode:'exam')`、答题 `ExamScreen`、评分 `evaluatePaintingIntent`、学识加分——整条 LLM 出卷→评分管道**一行未改**。

| 改动 | 位置 |
|---|---|
| 新 ActionType `'quick_exam'`（getActionTrack 默认归 mechanical，不进 isLlmScene 三件套） | `types/actions.ts` |
| 晚间宿舍注入「温书自测」签（`day<maxDay` 且 flag 未设，就寝签**之前**，staminaCost1）；locationId==='dormitory' 天然过滤 | `engine/gameEngine.ts` getSlotActions evening |
| `buildQuickExamReward(state,target,base)`：答对加成走心情修正+每日封顶（技能DAILY_SKILL_CAP/学识DAILY_KNOWLEDGE_CAP），**防小测成绕过封顶的刷点后门**；封顶满返回空 patch | `engine/gameEngine.ts` |
| handleAction 加 `quick_exam` 分支：出 1 题（pickQuickExamQuestionType 随机非archive）→setExamMode('quick')→ExamScreen | `app/App.tsx` |
| `examMode: 'final'\|'quick'` state；submitExam 按 examMode 分流：**quick**=答好(≥60)给本科技能/学识+1(本科满封顶转学识)、扣体力1、**不推时段**、落flag、夜读自省renderedText、不碰丹青试硬编码；**final**=维持现状(晋画正/解锁秘阁) | `app/App.tsx` |
| ExamScreen 加 `mode` prop：examChrome 按模式切门头/开场/批阅/按钮文案（小测="夜读·温书自测"/"摊开课业"/"温书毕"，夜读自省口吻） | `components/ExamScreen.tsx` |

**自然衔接**：小测 renderedText="夜深，宿舍灯下，你把今日所学默了一遍。{批语} 灯花结了又落，心里渐渐有了底"（答差="有几处仍是夹生，明日再看"）；测后仍在宿舍，就寝签还在，直接就寝收日，衔接顺。

**验证**：build ✅；node **14/0**（可见性：晚间宿舍未测出签/已测不出/第7日不出/非宿舍不出/午间不出/就寝签仍在；getActionTrack=mechanical+isLlmScene=false；buildQuickExamReward 心情6本科+1/心情8+2/技能封顶满空/学识封顶剩1给1/封顶满空/心情3抵消为0）。真 LLM 出题冒烟（123字题面+3选项+hiddenRubric）。**未改 painting prompt → 不重启 proxy**。存档无新字段（用 flags 动态键 quick_exam_d{day}，SCHEMA 不变）。

---

## 十一、丹青试目标线：技能 gating + 多维结局 + 独立结局页（2026-06-28，明明指定方向）

**背景**：丹青试是七日养成终点却形同虚设——只有过/不过二元、不过也无后果（末日"再观一日"是空话）、本科技能几乎不进通过门槛、无结局收尾（技能/学识/好感/暗线七日积累零回响）。明明拍板：**技能 gating + 多维结局分档 + 独立结局页**。

**决策（AskUserQuestion）**：①gating+结局分档都做；②**本科技能不足则封顶分**（手生过不了，技能硬门槛）；③**多维结局（分数+好感+暗线）**；④**独立结局页**。

| 改动 | 位置 |
|---|---|
| `computeExamScore(state,rawScore)`：学识加分floor(k/5)+**本科技能<EXAM_SKILL_GATE(40)则封顶EXAM_SKILL_CAP_SCORE(59)**，返回{finalScore,cappedBySkill} | `engine/gameEngine.ts` |
| `determineEnding(state,exam):EndingResult`：**分数定主轴档**（优≥85画待诏/良70-84画正+秘阁/中60-69画正勉过/落第<60），**好感(希孟stage≥知己60/莫逆80)+暗线(haiyouDiscovered/noticedWaterEndCloudStrong/secondScrollTeased觉察数)只修饰文本**(ximengNote/themeNote)；summaryLines七日回顾 | `engine/gameEngine.ts` |
| Rank 加 `painter_awaiting`(画待诏)；EndingTier/EndingResult 类型 + GameState.ending 字段 | `types/core.ts` |
| `EndingScreen.tsx` 新建：仿ExamScreen卷轴风，TIER_PROLOGUE各档结语(**固定模板不调LLM**)+七日养成回顾卡(.ed-recap)+希孟/暗线点缀+入秘阁/重新开始按钮 | `components/EndingScreen.tsx` |
| submitExam final 分支：computeExamScore→determineEnding→存 state.ending+rank/archiveUnlocked按tier(不再无脑passed→画正)；App 渲染 state.ending&&!endingDismissed→EndingScreen(入秘阁=endingDismissed暂隐进主界面看《骸游图》) | `app/App.tsx` |
| rankLabels/结算笺加 painter_awaiting；存档 SCHEMA 13→14+migrateV13(ending可选passthrough) | `MainGameScreen.tsx`/`persistence/storage.ts` |

**关键约束**：技能 gating 在引擎纯函数（可 node 测）；**分数定主轴 rank、好感/暗线只修饰文本**（不让好感高免试通过，保持丹青试技艺考核本质）；结局页固定模板不调 LLM（稳定优先）；温书自测/秘阁路径不受影响。

**验证**：build ✅；node **22/0**（computeExamScore 技能足/不足封顶/低分不封顶/学识加分；determineEnding 四档+边界60/70/84/85/59+好感空/知己/莫逆+暗线0/1/2+技能封顶落第标注）+回归 3/0。**未调 LLM → 不重启 proxy**。

**待补（todo）**：结局页美术资产（各档结局卷轴/配图，与温书自测 UI 美术一起后补）；结局 LLM 散文增强（读玩家七日轨迹生成个性化收尾，现为固定模板）。

---

## 十二、试玩三修（2026-06-29，明明试玩反馈）

1. **温书自测第2/3日晚消失**：根因=温书自测 `staminaCost:1`，被 `getAvailableActions` 的 `stamina>=cost` 过滤——白天体力耗尽（晨课/练习消耗）后晚上回宿舍体力≈0，温课签(cost1)被剔只剩就寝(cost0)。第1日教程流体力宽裕所以正常。**修：staminaCost 1→0**（夜读自省本不该耗体力，且与"答对加成不罚"精神一致）。submitExam quick 分支 staminaDelta 随 examAction.staminaCost 自动为 0。`engine/gameEngine.ts`。
2. **讨碗热茶可无限刷体力+心情**：idle_tea 免费+体力+1+心情+1，午间食堂沙盒不推时间→可无限点。**修：ActivityCard 加 `oncePerDay` 字段**，getActivitySlotActions 按 flag `{id}_d{day}` 当日做过即过滤、resolveActivity 落 flag。idle_tea 标 oncePerDay（通用机制，将来别的免费加属性卡可复用）。`content/activities.ts`/`engine/gameEngine.ts`。
3. **去掉闲聊选项 tone 角标**：DialogueScreen replyOptions 移除「诚/平/探」小角标（dlg-reply-tone span + toneLabels 定义），保留选项文本。`components/DialogueScreen.tsx`。

**验证**：build ✅；node **9/0**（温书自测体力0/3 都出、已测不出；讨茶初次有/喝后体力+1心情+1落flag/当日再看消失/餐签不受影响）。纯引擎+UI，**不重启 proxy**。

---

## 十三、七日流程平衡两修（2026-06-29，明明试玩反馈）

1. **温书自测看不到数值涨**：根因=`buildQuickExamReward` 的 `gain = base + moodGrowthModifier(state)`，心情≤3 时 mod=-1 → `1+(-1)=0` 返回空 patch。而晚上回宿舍时白天课业/练习每场扣心情（06-28 加的），心情大概率已≤3 → **温书几乎总白测**。设计本是"答对加成不罚"，温书复习答对就该有收获、与白天心情无关。**修：buildQuickExamReward 去掉 moodGrowthModifier**，答对稳 +1（仍受每日封顶 DAILY_SKILL_CAP/DAILY_KNOWLEDGE_CAP 约束防刷）。副作用：高心情不再给温书 +2（温书=确定性复习走稳定+1，练习签才吃心情修正——分工清晰）。`engine/gameEngine.ts`。
2. **丹青试太难（59分落第）**：玩家学识25(+5分)、59分落第——根因=本科技能<EXAM_SKILL_GATE(40) 被封顶59。**门槛40 需本科18→40 即+22，普通玩法够呛**（七日中等投入约+13达31）。明明目标"大部分人能过"。**修：EXAM_SKILL_GATE 40→30**（七日中等投入约可达31，刚够；配合温书修复每日再+1更宽裕）。**通过线60不变**（中等 rawScore+学识加分应过）。`engine/gameEngine.ts`。复盘：技能达30、学识25(+5)、rawScore55 → 60 正好过线。

**验证**：build ✅；node **10/0**（温书心情3/0 仍+1、高心情不再+2、封顶仍约束防刷；门槛技能29封顶59/30不封顶/技能30+学识25 rawScore55=60过线）。纯引擎，**不重启 proxy**。

---

## 十四、史实对齐 · 职称体系 + 结局双入口（2026-06-29，依据《宋代翰林图画院》史料）

**背景**：明明提供史料（docs/历史背景资料.docx）。本轮做其中两层（第一+三层，纯引擎+UI）：职称体系 + 结局分支双入口。靖康暗线、小测以诗入画（均改 prompt）留后续轮。

**史实抓手**：画院职称序列 学生<祗候<艺学<待诏（待诏最高）；三大师（希孟/择端/李唐）皆徽宗画学所出。

**决策（AskUserQuestion）**：①通过考试**统一授最低阶「祗候」**（mvp，后续篇章逐级晋升）；②**择端改「画院待诏」**（最高阶，与玩家祗候成阶梯）；③秘阁入口=**通过即解锁**（含中档）；④画室入口=**通过+希孟好感≥知己(60)**，双开预热后续篇章；⑤结局页双入口=**两按钮并列+预热语**，点击**暂隐进主界面**看专属场景。

| 改动 | 位置 |
|---|---|
| Rank 加 `'zhihou'`（祗候）：序列 student<zhihou<painter_regular<painter_awaiting；rankLabels 加祗候；结算笺加"授祗候" | `types/core.ts`/`MainGameScreen.tsx` |
| 择端 role/persona 改"画院待诏"（院内最高职阶画师） | `content/characters.ts` |
| determineEnding 重写：通过(tier≠fail)统一授 zhihou（不再优=画待诏，画待诏留 NPC 择端）；unlockArchive=通过即解锁；新增 unlockStudio=通过+好感≥60；EndingResult 加 unlockStudio 字段；ENDING_TITLES 改"入院·得授祗候"系 | `types/core.ts`/`engine/gameEngine.ts` |
| EndingScreen 双入口：TIER_PROLOGUE 改祗候文案；ed-gates 入口区（双开并列+「两扇门同时为你敞开」预热语/仅秘阁/仅画室分支文案）；onEnterStudio prop | `components/EndingScreen.tsx`/`styles/app.css` |
| App.tsx：EndingScreen 传 onEnterStudio（仿 onEnterArchive 暂隐）；submitExam 落 unlockedLocations（秘阁+画室按 unlock 标志） | `app/App.tsx` |
| 存档 SCHEMA 14→15+migrateV14（旧 ending 补 unlockStudio=false） | `persistence/storage.ts` |

**验证**：build ✅；node **15/0**（职称：通过授祗候/落第无rank；秘阁通过即解锁含中档；画室通过+知己60；双入口矩阵：通过+知己=双开、通过+好感低=仅秘阁、落第=都无）。纯引擎+UI，**不重启 proxy**。

**待与明明对齐/后续**：①靖康暗线（第二层，改 ambience THEME_BEATS + scene prompt，结局 themeNote 引出历史前奏，半架空不用真名）；②小测以诗入画（第四层，改 painting_prompt_generator prompt）；③结局页/温书自测专属美术（与之前待补美术一起）。








---

## 十五、结局序列重设计（批一）：多段立绘演出（导师点评→授衔→收尾）（2026-06-30）

明明预览旧单张静态卷轴 EndingScreen 觉不够，要改成**多段角色立绘+对话框演出序列**，落第改**补考保底过**（不重走七日）。完整计划 `~/.claude/plans/temporal-leaping-firefly.md`（已批）。**分两批**：批一=骨架编排+导师点评(A)+授衔(B)+收尾(E)，落第补考(retake)/见希孟(C/D) 先留桩；批二补全。

**目标序列**：交卷→【A 导师点评(LLM)】→（落第?补考保底过）→【B 授衔】→（好感≥知己?C/D 见希孟[批二]）→【E 收尾动画】。

| 改动 | 位置 |
|---|---|
| **结局序列状态机**（纯函数）：`EndingStage` 类型（mentor_review/retake/title_grant/ximeng_bridge/ximeng_meet/epilogue）+ `nextEndingStage(current,ending,state)` 推进（落第→retake、通过+好感≥60→见希孟、否则→收尾）+ `mentorForStyle`（复用 TEACHER_BY_STYLE）+ `XIMENG_MEET_AFFINITY=60` | **新建** `engine/endingSequence.ts` |
| **导师点评轻量对白页**（不复用 DialogueScreen，去好感梅花格/句数噪音）：立绘（litang-serious/song-normal/zeduan-normal，批二见希孟复用 ximeng-smile）+ 对话框 + 「继续」单向推进；loading 显省略号 | **新建** `components/EndingDialogue.tsx` |
| **授衔段 B**：CSS 朱印「授—祗候」仪式（tgSealStamp 盖章动画）+ 七日养成回顾 + 好感/暗线点缀 + 解锁入口（秘阁/画室并入本段，双开并列）+「继续」进收尾 | **新建** `components/TitleGrantOverlay.tsx` |
| **收尾动画段 E**：CSS 黑场 + JS 打字机渐显「画院之路，才刚刚开始……」+ 淡入「重新开始」（序列终点） | **新建** `components/EpilogueScreen.tsx` |
| **mock examReview 分支**：按 tier 给点评文案、replyOptions=[]、delta=0（落第含"补试"转机） | `llm/mockAdapter.ts` |
| **App 编排**：`endingStage`/`mentorReview` state；submitExam final **不再提前授名分**（rank/解锁/firstExamPassed 推迟到授衔段）只结算考试本身→`setEndingStage('mentor_review')`+`fetchMentorReview`（LLM 复用 character_dialogue+examReview，失败兜底）；`advanceEndingStage`（批一桩：retake/ximeng_bridge/ximeng_meet→折叠）；`commitTitleGrant`（授 zhihou+解锁，落第补考保底过同授+解锁秘阁）；渲染分支优先于旧 EndingScreen（保留作回退）；DEV 预览入口改启动序列；DIALOGUE_PROMPT_VERSION 常量统一（前后端 v6 一致） | `app/App.tsx` |
| 结局序列 CSS（tg-*/epi-*/dlg-reply-row） | `styles/app.css` |

**关键设计**：①rank/解锁**推迟到授衔段提交**——落第须先点评→补考保底过才授名分，交卷时只结算考试本身；②序列状态机纯函数可测；③导师点评 LLM 失败有兜底（结局不卡死）；④批一落第桩=retake 直接折叠到 title_grant 保底过+解锁秘阁；⑤见希孟桩=ximeng_bridge/meet 折叠到 epilogue。`endingStage` 是 UI 临时态不入存档，`state.ending` 已存。

**验证**：build ✅；node **19/0**（mentorForStyle 映射；nextEndingStage 四矩阵：通过+好感低→跳见希孟、通过+知己→见希孟、落第→补考、epilogue→null；mock examReview 通过/落第分支 replyOptions=[]+delta=0+含画科/补试）；真 LLM proxy 探针确认 v6 已加载——李唐点评山水（皴法/水口专业画评）、择端落第点评（界画线不稳）replyOptions=[]/delta=0、普通闲聊不受影响（warm→+1）。**prompt v6 上轮已提交+proxy 已加载，无需重启**。

**批二待做**：补考完整（ExamScreen examMode='retake' 保底过 finalScore≥60）+ 引出希孟线 C 过场 + 见希孟 D（EndingDialogue npcId=ximeng，结局语境预热后续篇章）。**待补美术**：授衔朱印图、收尾背景图、导师点评宿舍夜读区别美术（现 CSS 占位）。

---

## 十六、结局序列重设计（批二）：补考完整 + 引希孟线 C + 见希孟 D（2026-06-30）

接批一（第十五节），补全批一留的两个桩：**落第补考(retake)** + **见希孟(C 过场 + D 对白)**。

| 改动 | 位置 |
|---|---|
| `character_dialogue` input 加 `endingMeet?:boolean`；prompt v6→**v7** 加「结局见希孟」段（好感≥知己、希孟说"画院之路同行"预热话+水路钩子、不重述外貌/不揭终局、单段 delta=0/replyOptions=[]/emotion=trusting） | `types/llm.ts`/`server/prompts/character_dialogue.md` |
| mock 加 endingMeet 分支（话别预热语、单向） | `llm/mockAdapter.ts` |
| **引希孟线 C 过场**：黑场水墨 + 一句独白「放榜既毕…未曾好好道一句话别」+「去寻他」 | **新建** `components/XimengBridge.tsx` |
| ExamScreen mode 加 `'retake'`：补试门头/开场/复阅文案（"丹青补试"/"画给我看"）；cancelBtn 空 → 补试无取消/返回出口（不可中途逃出序列）；reviewing dots 用 chrome.reviewInfo | `components/ExamScreen.tsx` |
| App.tsx：examMode 加 retake；`ximengMeet` state；**advanceEndingStage 去批一折叠桩**——retake→launchRetake 真出题、ximeng_meet→fetchXimengMeet 拉希孟话别；`launchRetake`（复用 final 出题）；`fetchXimengMeet`（LLM+兜底）；**submitExam retake 分支**（finalScore=max(实际,60) 保底过→重算通过档 ending→commitTitleGrant 授名分→title_grant，不重启序列/不扣体力/不推时段，技能加成照给）；commitTitleGrant 改收 (baseState,ending) 参数避 stale state；渲染加 ximeng_bridge/ximeng_meet/retake-loading 分支；DIALOGUE_PROMPT_VERSION v7 | `app/App.tsx` |
| XimengBridge CSS（xb-*） | `styles/app.css` |

**关键设计**：①补考在结局序列中进行（第7日丹青试已应过、无 take_exam 行动、不再扣体力）——submitExam retake 分支独立早 return；②保底过=`max(finalScore,60)` 重算 ending 必为通过档，commitTitleGrant 据此授祗候+解锁秘阁（画室仍需好感知己，补考不补）；③见希孟 D 复用 EndingDialogue（npcId=ximeng）；④补试无取消出口防中途逃出序列卡死；⑤commitTitleGrant 收显式 baseState/ending 参数（不读 stale state）。

**验证**：build ✅；node **15/0**（序列不再折叠/补考保底过 finalScore≥60+tier≠fail+授祗候+解锁秘阁+好感0不解锁画室+不压高分/mock endingMeet 单向+examReview/普通闲聊回归）；真 LLM proxy **重启加载 v7**，见希孟探针出文符合预热语境（希孟在场认可+水路钩子、replyOptions=[]/delta=0/trusting、无终局剧透）。**改 prompt 已重启 proxy，前后端 v7 一致**。

**至此结局序列完整**：交卷→导师点评(A)→（落第→补考保底过）→授衔(B)→（好感≥知己→引希孟线 C→见希孟 D）→收尾(E)。**待补美术**：授衔朱印图、收尾/过场背景图、导师点评宿舍夜读区别美术（现 CSS 占位）；结局 LLM 散文增强（个性化收尾，现 TIER_PROLOGUE 固定模板）。

### 批二 · 试玩两修（2026-06-30）

1. **DEV 预览「优双开」却落第（commit c9be68a）**：根因=`computeExamScore` 本科技能 gating（本科 <`EXAM_SKILL_GATE`(30) 时分数封顶 59=落第），预览时玩家本科技能仍是初始 18，"优 90 分"被封成落第。**非结局序列 bug，是预览入口没绕过真实门槛**。修：`onPreviewEnding` 预览态把本科技能临时拉到 `Math.max(当前, EXAM_SKILL_GATE)` 让传入目标分生效（其余好感修饰/画室入口逻辑不变）。教训：DEV 直跳预览须连同 gating 前置条件一起满足，否则被真实硬门槛拦截。
2. **解锁入口移到收尾页（commit 14a577d，明明：授衔后「赴希孟画室」与「继续」两个希孟入口误导）**：授衔页原同时摆「入秘阁/赴希孟画室」（=通关探索入口，点了跳出序列进主界面）+「继续」（=推进演出→见希孟），两个"希孟"撞一起误导玩家。**拍板（AskUserQuestion）挪到收尾页**：TitleGrantOverlay 去掉入口区只留「继续」；EpilogueScreen 加 `ending`+enter 回调，打字机播完后淡入「入秘阁/赴希孟画室/重新开始」（`.epi-tail` 整体淡入，gates 复用 ed-gates 文案 + 新 .epi-gate-btn 暗色描边样式）。**演出走完（含见希孟）才给探索入口**，线性不误导。纯组件+CSS，不动 prompt/引擎，不重启 proxy。

**流程已确认（明明 2026-06-30 试玩）。文字（各段文案/点评/见希孟语气）+ 美术（朱印/过场/收尾背景/夜读区别图 + 结局 LLM 散文）后续统一打磨。**

---

## 十七、主线增强：靖康暗线前奏 + 以诗入画题型（2026-06-30，依据史料 docs/历史背景资料.docx）

memory 待办的两项主线 prompt 增强。**决策（AskUserQuestion）**：以诗入画=新题型 poem_intent / 丹青试+温书自测都用 / 靖康=七日节拍加前奏+结局点 / poem_intent 复用现有 hiddenRubric 评分 / 诗句 LLM 自选。

| 改动 | 位置 |
|---|---|
| **靖康暗线前奏**：THEME_BEATS_BY_DAY 第 6~7 日改写加亡国前奏（花石纲式搜刮民夫舟船/南边乡间乱子风声/北边边关不安/粮价悄涨，**半架空不用金辽徽宗靖康方腊真名**）；scene_narrator prompt「粉饰太平」段加「亡国前奏」指引（仅 6~7 日、只作市井风声远处阴云、绝不说破将亡国、不用真名、一场一笔）；prompt v17→**v18** | `engine/ambience.ts`/`server/prompts/scene_narrator.md`/`app/App.tsx`(SCENE_PROMPT_VERSION) |
| 结局 themeNote 加亡国前奏一层（awareCount≥2「南边花石船/北边风声/裂缝在走」、=1「这太平怕是长不了」） | `engine/gameEngine.ts` determineEnding |
| **以诗入画 poem_intent**：QuestionType 加 `poem_intent`；painting_prompt_generator prompt 加「以诗入画」段（取古诗句考"虚"字藏/锁/香，三选项=不同"怎么画出虚字"巧思有高下、含蓄写意/照实/画偏，hiddenRubric coreSignals=抓虚字言外之意/partial=照实不含蓄/shallow=画错重点，LLM 自选诗句可用史料经典题），prompt v1→**v2** | `types/core.ts`/`server/prompts/painting_prompt_generator.md` |
| examQuestionTypes 池加 poem_intent（丹青试+温书自测共用此池=两者都可能出诗题；archive_observation 仍秘阁专用不入池）；ExamScreen questionTypeLabels 加「以诗入画」；llm-validation allowedQuestionTypes 加 poem_intent；mock generatePaintingPrompt 加 poem_intent 分支（竹锁桥边卖酒家·考"锁"） | `app/App.tsx`/`components/ExamScreen.tsx`/`server/llm-validation.mjs`/`llm/mockAdapter.ts` |

**关键设计**：①靖康半架空——只透市井风声/远处阴云，**不说破亡国、不用真实名号**，保留游戏架空设定不变成历史课；②poem_intent 复用整条出题→评分管道（hiddenRubric 三档信号不变），只是题面换成诗句考虚字；③诗句 LLM 自选（可用史料经典题如竹锁桥边卖酒家=李唐真实夺魁案例），灵活不写死。

**验证**：build ✅；node **23/0**（七日 themeBeat 非空+无真实名号+6/7 日含前奏意象+day1 不超前；poem_intent mock 题面含诗句/3选项/rubric/透传+observe_detail 回归）；真 LLM proxy **重启加载 v18+painting v2**——poem_intent 探针出「竹锁桥边卖酒家」考"锁"三档巧思+rubric 到位，day7 街市写生场景轻点粮价涨/北边不太平且无禁词。**改 scene+painting prompt 已重启 proxy，scene 前后端 v18 一致**。

**后续**：丹青试题型改法（明明另定）；秘阁三幕重做+8张线索；扩充择端/嵩/李唐好感线；结局/温书美术。

---

## 十八、世界观/解谜线重构：废云起时 + 骸游图四导师共创 + 希孟千里江山卷暗线 + 穿越 framing（2026-06-30，明明拍板）

明明重构七日 MVP 的解谜线与世界观。**单一真相源**见 `2026-06-30-worldview-rework-canon.md`。**决策（AskUserQuestion）**：穿越=入院页明说 / 希孟消失只埋钩不给答案 / 书房线索克制。

**真相层级**：L0 玩家穿越疑问「希孟画完千里江山卷为何消失」→ L1 千里江山卷（明面进献盛世）→ L2 繁华与黑暗的交织（社会暗线，原粉饰太平改名）→ L3 骸游图（希孟/择端/李唐/嵩四人共创、分工不同[含只定立意者]、欲进献警戒危局，秘阁揭开才点四人共创）→ L4 希孟消失（与骸游图有关，只埋钩不坐实）。

| 改动 | 位置 |
|---|---|
| **主题改名**「粉饰太平」→「繁华与黑暗的交织」全索引 | ambience.ts/scene_narrator/mainline_planner/painting_prompt/types(llm,core)/gameEngine |
| **废云起时**：删 motif_water_end_cloud_rise；coreCanon anchor cloud_rise_time→haiyou_collab（穿越疑问入 worldPremise）；各 prompt 叙事边界删云起时改骸游图导向；guardrail/validation/mock 的云起时 spoiler 模式改为「坐实希孟消失/四人共创/进献警戒」 | worldbook/initialState/5 prompts/validateLlmOutput/llm-validation/mock-provider/mockAdapter/App.tsx |
| **骸游图升级**：worldbook+paintings hiddenSummary 改「四人共创、分工不同、进献警戒危局」，coreThemes 含繁华与黑暗，spoilerBoundaries 改「秘阁揭开前不点四人共创/不坐实消失」；新增 worldbook 千里江山卷条目 | worldbook.ts/paintings.ts |
| **希孟千里江山卷+消失钩**：character_dialogue 叙事边界重写+新增「希孟谈话分档」（陌路同僚只谈千里江山卷→同道松口"画了不能进献"→知己吐露另一幅画+"若有一日我不在了"钩→莫逆近交底不点破）；画室 facts 改千里江山卷+墙根另一卷 | character_dialogue.md/sceneEngine.ts |
| **书房线索（克制3条）**：①library_research 模板=四导师名旧档同现；②library_deep_research 模板=题记涂改+流民草图（与青绿盛世相反）；③sceneEngine wander：好感≥同道40 进书房瞥见希孟案上另一卷被掩 | activities.ts/sceneEngine.ts |
| **穿越 framing**：SetupScreen 顶部加 .adm-prologue 一行（千年后穿越+带着"希孟为何消失"之谜）；aspiration 保留作世俗志向；穿越疑问标注玩家私有、NPC 不知情（prompt 已约束） | SetupScreen.tsx/app.css |
| prompt 版本统一升：scene v18→v19、character_dialogue v7→v8、painting_prompt v2→v3、painting_intent→@2026-06-30、mainline v1→v2（前后端常量同步） | server/prompts/*/App.tsx |

**关键设计**：①穿越疑问是全游戏固定前提（入院页+canon worldPremise），不塞 aspiration、不喂 NPC（防泄露）；②希孟一人同画千里江山卷（明·盛世）+骸游图（暗·黑暗）="繁华与黑暗交织"主题的化身；③秘阁线索（药瓶/婴孩/被遮水路=民生疾苦）原样复用，只升级来历叙事为"四导师以画进谏"；④消失之谜 MVP 只埋钩，秘阁见骸游图后仍开放。

**验证**：build ✅；node **10/0**（云起时/粉饰太平 从 canon 数据清除、千里江山卷条目、骸游图四人共创、anchor=haiyou_collab、worldPremise 含穿越疑问、themeBeat 仍工作）；grep 全量确认两词无残留；真 LLM proxy **重启加载 v8/v19 等**——希孟知己档谈千里江山卷"交上去便是天下该有的样子"（弦外有音不点破）、书房同道档场景瞥见"另一卷被掩"且无禁词。**改 5 prompt 已重启 proxy，前后端版本一致**。

**后续**：丹青试题型改法（明明另定）；秘阁三幕重做+8线索（届时收束骸游图四人共创）；扩充择端/嵩/李唐好感线（可各自埋骸游图分工线索）。

### 十八·补 · 穿越引语页（2026-06-30，先简单做）

明明：入院页没有穿越引语，单做一页打字机引语放在入院页之前（后续会详细设计这一页）。
- 新建 `components/ProloguePage.tsx`：黑场 + 6 行穿越缘起逐字打字（CHAR_MS=80/行末停顿 600ms），点击跳过/继续；放完显"点击继续·填写入院名录"。
- App 加 `prologueSeen` state（初值=有存档则跳过），`state===null && !prologueSeen` 时先渲引语页；resetGame 重置 prologueSeen（重新开始会重放）。
- CSS `.prologue-*`（仿 epi- 黑场风），hint 柔和脉冲。纯前端，不动 prompt/引擎，不重启 proxy。build ✅。**这一页后续详细设计（配乐/分镜/美术）。**

### 十八·补2 · 首遇/对话自然过渡四改（2026-06-30，明明）

为首遇希孟与首次对话的自然过渡：①温书小测不提骸游图；②首遇环境+背影+现代视角心理描写；③首次闲聊不主动报千里江山卷名；④允许旁观者视角铺垫希孟。
- ①`PaintingPromptGeneratorInput` 加 `quickReview?`，generatePaintingPrompt 加参，quick_exam 传 true；painting_prompt v3→**v4** 加 quickReview 段（纯画意题、不碰骸游图/主线/希孟）。
- ②`XIMENG_FIRST_MEET` 脚本重写：青衣背影对着青绿长卷出神→日光/笔悬未落→玩家现代视角心跳漏拍（知他是谁、知此画名声、知他画成后消失）→带千年疑问上前攀谈（去掉旧"云从山背升起"motif）。
- ③DialogueScreen OPENING_REPLIES 改委婉（"你在画什么？"不点名）+希孟 atmosphere/greeting 改首次接触陌生口吻（"……何事？"）；character_dialogue v8→**v9** 陌路档加"首次接触不主动报千里江山卷名，玩家问起才淡淡道青绿山水"。
- ④scene v19→**v20** 希孟出场门槛段：ximengMet=false 时**可借旁观者视角**（同窗/小书童/街市闲话）聊起青年画师与他要进献的青绿山水（可点千里江山卷名作谈资），未见其人先闻其事；本人仍不出场。
- 验证 build ✅；真 LLM proxy 重启 v9/v20/painting v4：温书自测题不含骸游图/希孟、首次闲聊希孟只说"青绿山水要进献宫里"不报画名、选项不点名。**改 3 prompt 已重启 proxy 前后端版本一致**。
