# 丹青院 v2 改动明细（2026-07-06 · 丹青试改版）

**用途：** 第七日丹青试从「2 道选项题」改为「**1 道选项题 + 1 道自由创作**」——自由创作让玩家从画案手记档案里择灵感、考官据此命题、玩家写创作思路、考官评档，把七日探索兑现进丹青试。
**配套：** 秘阁五幕（07-02）、第七日重构（07-05）、天气系统（本日）。
**代码仓：** `workspaces/danqingyuan-mvp`。

> 病根：丹青试原 2 道选项题与晚间温书自测同源，质感雷同、只是"选对答案"，也没用上七日攒的画案手记档案。明明拍板：加一道**自由创作**——玩家挑 3-5 个灵感 → 考官 LLM 据灵感+本科拟自由命题 → 玩家写创作思路 → 考官评 tier。**决策（AskUserQuestion）**：创作思路玩家写（复用秘阁缀线→解读→评档，非 LLM 全写）/ 1 选题+1 自由创作 / 自由创作权重更高。**山水不搭**的顾虑靠"灵感池含人物/地点/物件/母题/天气 + LLM 按本科命题"化解（山水玩家偏地点/母题/天气灵感，照样成题）。

## 一、类型 + 灵感引擎
- `QuestionType` 加 `free_creation`；`PaintingPromptGeneratorInput` 加 `inspirations?`/`majorSkillLabel?`；`ExamAnswer` 加 `inspirationIds?`。
- 新建 `engine/inspirations.ts` `buildInspirations(state)`：取 `clueGraph.nodes` 里 `discovered && !hidden` 的实体（分 人物/地点/物件/母题/画作/见闻）+ 天气灵感（当日 + 第≥4日加"第三日那场骤雨"）；**灵感<3 兜底补默认卡**（晨课/街市/竹石/共膳）保证不卡考。`INSPIRATION_KIND_LABELS`。
- `gameEngine` `FREE_CREATION_WEIGHT=0.6` + `weightedExamRawScore(选项分,自由创作分)`。

## 二、prompt（升版重启 proxy）
- `painting_prompt_generator.md`（v4→**v5**）加「自由创作」段：据 `inspirations`+`majorSkillLabel` 拟自由命题、**贴合本科**（山水/人物/界画各出对应题，灵感与本科不搭则巧转如"点景人物"）、`options` 空、hiddenRubric 三档（熔灵感有立意=core / 堆砌浅=partial / 离题空泛=shallow）、**守骸游图边界**（灵感含主线线索只取画意不点破）。
- `painting_intent_evaluator.md`（升版）加自由创作评分指引：评构思立意合本科、**不因未真作画扣分**、空泛喊口号判 shallow、守边界。
- `llm-validation.mjs`：allowlist 加 free_creation；free_creation 时 `options` 须空、跳过三选项校验。
- 两 mock（mockAdapter + mock-provider）加 free_creation 动态分支（据灵感+本科出命题）。

## 三、App 编排
- take_exam 改构题：**1 道选项题**（`examQuestionTypes` 随机 1）+ **1 道自由创作占位**（`buildFreeCreationShell`，真命题运行时拟）。温书自测/补考不变（仍选项题）。
- `composeFreeCreationTheme(ids)`：玩家择灵感 → `generatePaintingPrompt(...,'free_creation',...,inspirations)` → 存 `freeCreationComposed` 供评分。
- `submitExam`：自由创作用 `freeCreationComposed` 的 id/hiddenRubric 评分；**加权** `rawScore = 0.4*选项分 + 0.6*自由创作分`（其余单题/补考取均值）。
- ExamScreen 传 `inspirations`（buildInspirations）+ `onComposeTheme`。

## 四、ExamScreen 自由创作子流程
`questionType==='free_creation'` 时不渲选项，三段（仿秘阁缀线，ex-fc-* CSS）：
- **择灵感**：灵感卡按类别分组，勾选 3~5（gate ≥3）。
- **拟题**：「请太师命题」→ onComposeTheme（loading"太师拟题中"）→ 拿命题。
- **落墨**：命题 + 所选灵感 chips + textarea 写创作思路（≤300，≥10 可交）。

## 五、验证
- `npm run build` ✅；node 引擎单测 **72/0**（+inspirations 13：clueGraph 取 discovered/非hidden、天气灵感、<3 兜底、加权 0.4/0.6）。
- prompt 升版 painting v4→**v5** + evaluator 升版，**已重启 proxy**。真 LLM 冒烟：
  - 山水玩家（竹石+骤雨+被遮水路灵感）→ 命题"今以三者入山水一幅"（山水题、options空、无骸游图禁词）；
  - 人物玩家（老翁+争执灵感）→ 人物题；
  - 评分：有布局立意的构思 → **core**（专业画评"竹石为架、水路为气、留白得法"）；空泛套话"画得很美很有意境" → **shallow**（"未见具体经营之法"）。
- 通玩清单：第7日丹青试 = 选项题作答 → 下一题自由创作（择 3-5 灵感→请太师命题→写思路→交卷）→ 加权评分（自由创作重头）→ 结局序列照走；灵感<3 时兜底默认卡可用。

## 六、待明明微调（已用默认值，可改）
- 加权 选项 0.4 / 自由创作 0.6；灵感选 3-5（gate≥3）；补考仍走选项题。
