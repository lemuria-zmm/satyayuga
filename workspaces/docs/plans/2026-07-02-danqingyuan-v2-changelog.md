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
