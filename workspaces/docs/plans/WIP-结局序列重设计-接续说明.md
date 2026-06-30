# WIP · 结局序列重设计（批一）接续说明

> 临时接续文档（2026-06-30，跨窗口交接用）。批一完成后并入正式 changelog 并删除本文件。

## 任务背景

明明要把丹青试结局从"单张静态卷轴 EndingScreen"改成**多段立绘对话演出序列**。完整计划见 `~/.claude/plans/temporal-leaping-firefly.md`（已批准）。

**目标序列**：交卷→【A 导师点评】→【B 授衔】→（好感≥知己）【C 引出希孟线+D 见希孟】→【E 收尾动画】。落第→补考保底过。

**已拍板决策**：
1. 点评导师=本科对应导师（山水/画理→litang、人物→song、界画→zeduan）。
2. 点评=LLM 生成（复用 character_dialogue role）。
3. 落第=补考保底过（再考必过，不重走七日）。
4. 见希孟=仅好感≥知己(60) 触发。
5. 收尾=CSS 打字机/渐显，美术后补。

**分两批（明明定）**：
- **批一（进行中）**=骨架编排 + 导师点评(A) + 授衔(B) + 收尾动画(E)。落第补考、见希孟(C/D)先留桩。
- 批二=补考完整(ExamScreen retake) + 见希孟(C/D)。

## 已完成的改动（工作区未提交，2 个文件）

1. **src/types/llm.ts**：`CharacterDialogueInput` 加了 `examReview?` 字段（tier/score/failed/majorSkillLabel），在 isOpening 字段后。
2. **server/prompts/character_dialogue.md**：
   - 版本升 `character_dialogue@2026-06-26.v5` → `@2026-06-30.v6`。
   - 加了「## 结局导师点评（2026-06-30）」段：examReview 非空时按档位点评，落第给补考转机，relationshipDelta=0、replyOptions=[]（单向点评，界面"继续"推进）。

## 待做（批一剩余）

### 0. 先补 mock（必须，否则 build 后跑不通 mock 路径）
- `src/llm/mockAdapter.ts` generateCharacterDialogue 加 `examReview` 分支：返回一段点评文案、replyOptions=[]、relationshipDelta=0。参考其 isOpening 分支写法（约 line 31）。
- 确认 server/llm-validation.mjs 不会拒 examReview（validateCharacterDialogueOutput 只校验 output，不限 input.npcId=litang/song/zeduan，已确认 OK）。
- **前后端 promptVersion 常量**：App.tsx 里 `character_dialogue@2026-06-26.v5` 有 2 处（openDialogue line~1412、submitDialogue line~1465），改 v6 时要同步（或导出常量统一）。grep `character_dialogue@` 全局核对。

### 1. 结局序列骨架（App.tsx）
- 新增 `endingStage` state：类型 `'mentor_review' | 'title_grant' | 'epilogue' | null`（批一只这 3 个 + retake/ximeng 桩）。
- submitExam final 分支：算出 ending 后**不再直接靠 state.ending 渲 EndingScreen**，改 `setEndingStage('mentor_review')` 启动序列（ending 仍存 state）。
- `advanceEndingStage(from)` 推进：mentor_review →（落第?桩=直接保底过）→ title_grant →（好感≥60?桩=跳过见希孟）→ epilogue。
- 渲染分支：endingStage 非 null 时按 stage 渲对应组件，优先级在现有 `state.ending && !endingDismissed → EndingScreen` 之前（或替换它）。
- **rank 授予移到 title_grant 段提交**（落第补考通过后才授；批一落第桩直接保底）。

### 2. 导师点评段 A（新建 EndingDialogue 组件 + App 接 LLM）
- **不直接复用 DialogueScreen**（它带好感梅花格/句数额度等闲聊噪音）。新建轻量 `EndingDialogue` 组件：立绘（npcSprites/char-*）+ 对话框 + "继续"按钮（单段点评，非多轮）。导师点评、批二见希孟都可用它。
- 本科→导师映射：复用 styleOrigin→teacher（参 content/courses.ts 或 sceneEngine 的 GUIDE/TEACHER 映射；山水/画理 litang、人物 song、界画 zeduan）。
- App 加 `fetchMentorReview()`：调 generateCharacterDialogue，input 带 `examReview`（从 state.ending.tier/score + 落第判断 + 本科 label），npcId=本科导师。展示在 EndingDialogue。
- 立绘：litang→char-litang-serious.png（严肃）、song→char-song-normal、zeduan→char-zeduan-normal（public/ 已有）。

### 3. 授衔提示段 B（新建 TitleGrantOverlay）
- 居中"画院循例授你——祗候"，CSS 朱印/钤印仪式感。点击继续→下一段。
- 此处提交 rank=zhihou（落第补考通过也到这）。
- 原 EndingScreen 的"七日养成回顾 + 解锁入口(秘阁/画室)"信息并入此段或 E 前（待定，倾向并入 B）。

### 4. 收尾动画段 E（新建 EpilogueScreen）
- CSS 黑场 + 打字机/渐显"画院之路，才刚刚开始……" + 淡入后"重新开始"按钮（序列终点，替代旧 EndingScreen 重开）。

### 5. 验证收尾
- `npm run build`；node 单测（advanceEndingStage 分支）；DEV 预览入口（主界面名牌"预览·优双开"等，line~1642 App.tsx onPreviewEnding）接序列逐段可点。
- 真 LLM e2e：导师点评出文符合本科导师口吻、落第给补考转机。
- 回归：通过/落第主流程、温书自测、秘阁/画室入口。
- **改了 prompt → 必须重启 proxy（npm run llm:proxy），版本号前后端一致**。
- 清 console.log；改 changelog（2026-06-27 那份加"十五、结局序列重设计批一"）+ project-memory（决策77）+ CLAUDE；commit。删本 WIP 文件。

## 关键复用点 / 注意
- DialogueScreen 结构见 src/components/DialogueScreen.tsx（立绘 npcSprites line15、希孟好感差分 line23、character_dialogue 调用 App.tsx openDialogue line1405/submitDialogue line1449）。
- EndingResult 结构：types/core.ts（tier/rankChange/unlockArchive/unlockStudio/ximengNote/themeNote/summaryLines）。determineEnding 在 gameEngine.ts:261。
- 现有 EndingScreen（components/EndingScreen.tsx）批一后可能保留为"被序列各段拆解"或废弃——批一倾向**新序列组件并存，submitExam 改走 endingStage**，EndingScreen 暂留作参考/回退。
- 立绘资产已齐：litang(normal/serious)/zeduan(normal/smile)/song(normal/thinking)/ximeng(normal/painting/smile/special)，均 public/ 下。
- 美术待补（非阻塞，CSS 占位先跑）：授衔朱印图、收尾背景图。
