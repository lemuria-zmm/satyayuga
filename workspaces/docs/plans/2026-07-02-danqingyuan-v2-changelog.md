# 丹青院 v2 改动明细（2026-07-02）

**用途：** 秘阁三幕重做 → 落地为**五幕**演出 + **8 线索**（周内+秘阁混合）+ 揭卷**固定脚本**收束骸游图四人共创；顺手清理「云起时」技术债。
**配套文档：**
- 世界观/解谜线 canon（单一真相源）：`2026-06-30-worldview-rework-canon.md`
- 前序改动：`2026-06-27-danqingyuan-v2-changelog.md`（截至 §19 画案手记升档案库）
- 代码仓：`workspaces/danqingyuan-mvp`（下文相对路径以此为根）

> 本轮主线：秘阁是七日养成的叙事终点与解谜高潮。旧秘阁只是扁平两段（观画选异常→自由解读→LLM 评一档）、仅 3 条硬编码线索、与七日养成脱节。本轮改为**五幕线性演出**，线索**周内预收集 + 秘阁观画混合**共 8 条，末幕**揭卷固定脚本**按解读档收束 canon 真相（骸游图=希孟/择端/李唐/嵩四人共创、以画进谏、埋希孟消失钩）。明明 2026-07-01 拍板：五幕更细 / 8 线索周内+秘阁混合 / 揭卷固定脚本。记忆决策编号 83。

---

## 一、病根

1. **旧秘阁扁平**：`PuzzleScreen` 只有观画→解读两段，3 条异常=3 条线索，评一档即关屏，无"幕"、无收束四人共创的高潮。
2. **七日线索是死 flavor**：canon §4 的书房 3 线索 + 希孟对话埋线，此前只是 prompt flavor / LLM 抽取的档案实体，**从未成为结构化可展示的线索**——秘阁无从展示"你这七日收集到了什么"。
3. **云起时技术债（§18 世界观重构漏清）**：重构只改了内容、没清代码——已废弃的「云起时」母题仍活在秘阁反馈里（`App.submitPuzzle` 硬编码 `水尽处，云从山背升起`）、旧 flag `noticedWaterEndCloud*`/`secondScrollTeased` 仍驱动结局觉察计数、3 个死 applyAction handler（take_exam/solve_puzzle/talk_to_npc）残留云起文案。

## 二、核心设计

**五幕线性演出**（`engine/puzzleActs.ts` 纯函数态机）：
【一 入阁】展示七日带入线索 →【二 观画】选画面异常解锁秘阁线索 →【三 缀线】跨来源组合线索（gate：≥3 条、跨≥2 来源）→【四 解读】自由文 + LLM 评 tier →【五 揭卷】按 tier 分档固定脚本收束四人共创。

**8 线索（周内 4 carried + 秘阁 4 observe）**，注册表 `content/clues.ts` 单一真相源：
| id | 来源 | act | 授予点 |
|---|---|---|---|
| clue_archive_names 旧档同名 | 书房 | carried | practice_read_treatise/view_scrolls |
| clue_altered_colophon 涂改题记 | 书房 | carried | practice_deep_study（minKnowledge:10 天然保 §4-2 学识≥10）|
| clue_ximeng_second_scroll 案上另一卷 | 希孟 | carried | 身处书房+希孟好感≥同道40 |
| clue_market_hardship 街市见闻 | 街市 | carried | practice_market_figure/architecture |
| clue_medicine_bottle 药瓶 | 秘阁 | observe | 观画异常 medicine_bottle |
| clue_child_posture 婴孩 | 秘阁 | observe | 观画异常 child_posture |
| clue_blocked_waterway 被遮住的水路 | 秘阁 | observe | 观画异常 blocked_waterway |
| clue_onlooker_gaze 旁观者视线 | 秘阁 | observe | 观画异常 onlooker_gaze（**新增第4异常**）|

## 三、改动清单

| 改动 | 位置 | commit |
|---|---|---|
| 线索注册表 `CLUES`（8 条）+ CARRIED/OBSERVE 分组 | 新建 `content/clues.ts` | 1 |
| 第 4 异常 `onlooker_gaze` + `carriedClueIds` 字段；`PaintingBible.carriedClueIds?`；`PuzzleState.haiyouRevealTier?` | `content/paintings.ts`/`types/content.ts`/`types/core.ts` | 1 |
| flag 重命名：删 `noticedWaterEndCloudWeak/Strong`+`secondScrollTeased`；加 `haiyouRevealed`/`haiyouThreadStrong`/`haiyouDisappearanceHooked`+4 个 `clue*Seen` | `content/flags.ts` | 1 |
| `clueGrantsForAction`（幂等纯函数，按 `*Seen` 守卫）+ applyAction 接入（走现成 cluesGranted patch，`applyValidatedStatePatch` 无需改） | 新建 `engine/clueGrants.ts`/`engine/gameEngine.ts` | 2 |
| 删 3 个死 handler（take_exam/solve_puzzle/talk_to_npc，含云起残文）；submitPuzzle 删云起文+换新 flag（haiyouThreadStrong/DisappearanceHooked）+落 haiyouRevealTier；determineEnding awareCount 换新 flag；两 mock 擦旧 flagsSuggested/云气留白/希孟默认对白改千里江山卷 | `engine/gameEngine.ts`/`app/App.tsx`/`llm/mockAdapter.ts`/`server/llm-providers/mock-provider.mjs` | 3 |
| 存档 `SCHEMA 15→16`+`migrateV15`（云起 flag 翻译为骸游图语义+删旧键+补 `*Seen`/haiyouRevealed；haiyouRevealTier passthrough）；抽 `migrateHaiyouFlagsV15` 导出供单测 | `persistence/storage.ts` | 4 |
| 五幕态机 `nextAct`/`canAdvanceAct`/`ACT_LABELS`；PuzzleScreen 重写四幕（入阁显 carried、观画 4 异常、缀线跨来源分组 gate、解读）；删硬编码 clueCards 改从 clues.ts；App 传 `collectedClueIds` prop | 新建 `engine/puzzleActs.ts`/`components/PuzzleScreen.tsx`/`app/App.tsx` + `styles/app.css`(pzl-carried/thread) | 5 |
| 幕五揭卷：`HAIYOU_REVEAL` 三档固定脚本（守 canon §7 边界）+ `HaiyouRevealScreen` 打字机；submitPuzzle 改 tier 数据流（不关屏→转揭卷演出，`finishPuzzleReveal` 合卷才关闭+出延后结算笺） | 新建 `content/haiyouReveal.ts`/`components/HaiyouRevealScreen.tsx`/`app/App.tsx` + `styles/app.css`(hry-) | 6 |

## 四、关键设计取舍

- **确定性授予 vs LLM 白名单**：七日线索走引擎 `cluesGranted` patch 确定性授予（不依赖 LLM 自报）——scene 侧 `allowedClueIds` 各调用点都传 `[]`，白名单早已死；秘阁必须可靠展示预收集线索。
- **希孟线确定性化**：撞见另一卷的叙事 flavor 仍由 sceneEngine 出（好感≥40 书房信步），但结构化线索改走状态条件（`currentLocation==='library' && affinity>=40`）确定性授予，与叙事触发同门槛。
- **揭卷固定脚本**：不调 LLM（稳定优先，仿 EndingScreen TIER_PROLOGUE）；三档分深浅——shallow 只隐约"非一人所作"、partial 点四人共创+一体两面、core 完整以画进谏+埋消失钩。**即便 core 也守 canon §7**：不坐实消失原因、进谏目的含蓄留余地。
- **tier 数据流**：submit 后不关屏，`puzzleReveal` state 驱动 HaiyouRevealScreen 演出；结算笺延后到「合卷」出，避免盖在揭卷上。`haiyouFirstInterpreted` 在 submit 即置真，中途退出也不可重入（正确——已解读）。

## 五、验证

- `npm run build`（tsc + vite）✅
- node 引擎单测 **38/0**：puzzleActs 态机 10/0（五幕顺序+终点 null+各幕 gate）、clueGrants 12/0（幂等/deep_study/街市/希孟书房门槛/双授/机械卡不授）、migrate-v16 16/0（flag 翻译/删旧键/补新 flag/新档就绪）。
- 真 LLM proxy **已重启**（改了 `server/llm-providers/mock-provider.mjs`，虽默认 provider 非 mock，按铁律 9 重启）；8 线索 puzzle 冒烟：DeepSeek 返 **core / 85 分**、无 spoiler、批语守边界（只读信号不点破四人共创/不坐实消失）。
- **回归 grep**：`云起/云从山背/水至画角/水若走到尽头/noticedWaterEndCloud/secondScrollTeased/haiyouLlmCoreRead` 在 src/server 仅剩 `migrateV15` 内翻译逻辑必需的旧名引用，无其他残留。console.log 洁净（src 无残留）。

## 六、待补

- **美术**：秘阁五幕专属图（缀线分组卡、揭卷背景/朱印/四人题款示意）；现用 CSS 占位（pzl-carried/thread、hry- 黑场打字机）。
- **prompt 增强（可选）**：painting_intent_evaluator 未改（8 线索复用现管道，多几个 clue ID 只是进 selectedClueIds）；若要"跨来源缀线越多→评档越高"显式激励，再改 prompt 升版。
- **e2e 七日通玩**（待明明跑）：(a) 书房/街市 practice 卡授对应 carried 线索（deep 需学识≥10）；(b) 希孟好感≥40 进书房授案上另一卷；(c) 第7日秘阁幕一预载全部 carried；(d) 缀线 gate≥3 条 2 来源；(e) 揭卷按解读档出对应脚本、合卷后结算笺出、不可重入；(f) 结局 themeNote 反映新 awareCount。

---

## 七、试玩修复：考试后秘阁流程断裂（2026-07-02，明明七日通玩反馈）

**反馈**：第七日授完头衔点「入秘阁」没有后续；重进后秘阁里只有一个外景+一句话，没有解谜。

**病根（两层）**：
1. **`finalChapter`（终章·时间冻结）从未被设置**。它只在「第7日*晚间*结束」由 `advanceTime` 触发；而丹青试在*晨课*，通过后 `timeAdvance` 只推进到 forenoon，永远走不到晚间。秘阁五幕解谜整个设计假定在终章进行（`getFinalChapterActions` 干净出 0 体力秘阁签、无自动 wander），但玩家实际落回 **day7/forenoon/院堂** 的普通叙事时段。
2. 连锁后果：①秘阁签 `locationId='secret_archive'` 被 `getAvailableActions` 的「locationId===当前地点」过滤（玩家在院堂）→"没有后续"；②forenoon 非终章 → 自动 `wander` 场景触发，走到秘阁也被 wander 场景（"外景+一句话"）盖住解谜签。

| 修复 | 位置 |
|---|---|
| **`commitTitleGrant` 落 `finalChapter: true`**——授衔即进终章（直接通过/补考保底过都经此点，语义统一：时间冻结、自动 wander 被 useEffect 守卫掐断、`getSlotActions` 走 `getFinalChapterActions`） | `app/App.tsx` |
| **「入秘阁一观/赴希孟画室」落地到对应地点**（`enterAt` 设 `currentLocation` + 存档）——否则解谜签因地点过滤不可见，玩家还得自己摸路；结局序列（Epilogue）与旧 EndingScreen 回退路径都改 | `app/App.tsx` |
| **`getAmbienceAction` 终章不出「信步走走」环境签**（引擎侧漏洞，node 测抓出：终章 forenoon 仍出 wander 签 → 又一个"外景+一句话"源头） | `engine/gameEngine.ts` |

**验证**：build ✅；node 新测 `test-final-chapter-archive.mts` **7/0**（终章秘阁内出 0 体力解谜签/无报时钟/无 wander 签/院堂可走到秘阁/解读后签消失不可重入）+ 全量回归 38/0。纯前端+引擎，**不动 prompt 不重启 proxy**。

**修复后流程**：第7日晨课丹青试 → 交卷 →【导师点评】→（落第→补考保底过）→【授衔·进终章】→（好感≥知己→见希孟）→【收尾打字机】→ 点「入秘阁一观」**直接落到秘阁、解谜签就在眼前** → 五幕（入阁→观画→缀线→解读→揭卷）→ 合卷。终章时间冻结，可自由走动看各处，无时段压力。

---

## 八、秘阁引桥过场（2026-07-02，明明：授衔后直接开秘阁突兀，加文字引导剧情）

**方向**：玩家发现秘阁往昔紧闭的门虚掩着，走进去才见里面的秘密——给"为什么现在能进秘阁"一个情节交代。

- 新建 `components/ArchiveBridge.tsx`：黑场水墨过场（仿 XimengBridge），**三段渐入**——①授衔人散、行至秘阁前回廊脚步顿住；②那扇门开了一线（入院以来重门从来落锁、只听同窗说里头封着不外示的旧卷，此刻门缝漏出灯影）；③守阁老吏不见踪影——"也许是新授祗候的名分到了，阁门理当为你而开；也许……只是有人忘了上锁"，门缝灯影"像一句没说完的话"（轻钩骸游图暗线，不点破）→「推门而入」按钮末段浮现。
- **接线**：收尾页/旧结局页点「入秘阁一观」→ `setArchiveBridgeOpen(true)` 先播过场（渲染优先级最高）→「推门而入」→ `enterEndingLocation('secret_archive')` 落地；落地文同步写 `lastRenderedText`（"门轴轻响，你侧身入内……正中的石案上，平展着一幅画"）与过场无缝接续，画室入口同理给落地文。原 `enterAt` 抽成共享 `enterEndingLocation`（Epilogue+旧 EndingScreen 两路都走桥）；resetGame 重置桥状态。
- CSS `.ab-*`（三段 tgFadeIn 延时 0/1.4s/3s、按钮 4.4s 浮现）。
- **情节合理性**：祗候名分刚授 → 门为新祗候而开的"名分说"+"忘了上锁"的暧昧留白——不坐实是谁开的门，与骸游图"欲进献警戒"的隐秘性一致（canon §7 边界内）。

**验证**：build ✅；纯前端组件+CSS，不动引擎/prompt，不重启 proxy。回归 test-final-chapter-archive 7/0 不受影响。

---

## 九、试玩两修：入口顺序 + 秘阁仍无解谜（2026-07-03，明明试玩反馈）

**反馈**：①授衔界面直接出现「入秘阁一观」按钮、点了才出引文，顺序不对（应授衔→引文→入秘阁按钮）；②点进秘阁后仍只有落地模板句、没有解谜页（截图：终章·画正·人在秘阁，dock 显"此处此刻无事可做"）。

**病根**：
1. **入口顺序**：结果页（收尾 Epilogue / 旧 EndingScreen）把「入秘阁一观/赴画室」destination 按钮直接摆在页上，点了才跳引桥引文——引文反而在按钮之后。
2. **秘阁无解谜（截图关键证据：rank=画正而非祗候）**：画正只可能来自 endingStage 丢失后命中的 **fallback EndingScreen**（reload/DEV 直跳），其入口只调 `enterEndingLocation` 落地、**未跑 `commitTitleGrant`→archiveUnlocked 从未置**，于是人已在秘阁但解谜签 gate（`archiveUnlocked && !haiyouFirstInterpreted`）不成立→"此处此刻无事可做"。

**修**（纯前端+引擎，不动 prompt）：
| 修 | 位置 |
|---|---|
| **入口顺序统一**：结果页只留「继续」→ 秘阁引桥过场（引文）→ **过场末尾**才给「推门而入」+（好感够）「先赴希孟画室」。EndingScreen/Epilogue 去掉 destination 按钮改单一 onContinue；ArchiveBridge 承接 onEnterStudio 次要入口 | `EndingScreen.tsx`/`EpilogueScreen.tsx`/`ArchiveBridge.tsx`/`app/App.tsx` |
| **enterEndingLocation 自足解锁**：入秘阁必带 `archiveUnlocked+finalChapter`+解锁 secret_archive（幂等）——治 fallback/旧档进来时 commitTitleGrant 未跑过导致解谜签不出 | `app/App.tsx` |
| **getFinalChapterActions 兜底**：身处 secret_archive 即视为已达（archiveUnlocked 兜底），治已卡在秘阁的旧存档——人在阁里就出解谜签，不越界（不在阁+未解锁仍不出） | `engine/gameEngine.ts` |

**验证**：build ✅；node `test-final-chapter-archive` **9/0**（新增：在秘阁 archiveUnlocked 未置仍出解谜签 / 不在秘阁未解锁不越界出签）+ 全量回归 47/0。ArchiveBridge 次要入口 `.ab-studio` 暗底可读样式。

**修复后顺序**：…【授衔·进终章】→（见希孟）→【收尾打字机·「继续」】→【秘阁引桥·门虚掩引文·「推门而入」/「先赴画室」】→ 落地秘阁·解谜签就在眼前 → 五幕。
