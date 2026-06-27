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
