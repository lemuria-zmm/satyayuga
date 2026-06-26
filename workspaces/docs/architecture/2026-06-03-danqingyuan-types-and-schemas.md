# 丹青院 TypeScript 类型与 Schema 规格

**用途：** 将 MVP 设计、提示词和世界书中的概念整理成前端可实现的 TypeScript 类型。本文不是最终代码，但应作为后续 `src/types`、`src/engine`、`src/memory`、`src/llm` 的源规格。

**核心原则：**

- LLM 输出必须结构化。
- LLM 只能建议状态变化，不能直接写入游戏状态。
- 所有状态变更由 `GameEngine` 校验后提交。
- 记忆系统分为只读真相、事件账本、角色记忆、玩家风格、线索图谱和摘要。
- 主线关键 flag 和隐藏设定不能由玩家自由输入覆盖。

---

## 1. 基础枚举

```ts
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export type Rank = 'student' | 'painter_regular';

export type SkillId = 'landscape' | 'figure' | 'architecture';

export type LocationId =
  | 'hall'
  | 'library'
  | 'garden'
  | 'market'
  | 'secret_archive'
  | 'ximeng_studio';

export type NpcId = 'ximeng' | 'zeduan' | 'tangweng' | 'song';

export type RelationshipStage =
  | 'stranger'
  | 'colleague'
  | 'same_path'
  | 'confidant'
  | 'intimate';

export type NpcEmotionState =
  | 'distant'
  | 'noticing'
  | 'silent'
  | 'irritated'
  | 'trusting'
  | 'avoidant'
  | 'shaken';

export type QuestionType =
  | 'observe_detail'
  | 'express_intent'
  | 'character_dispute'
  | 'archive_observation';

export type InterpretationTier =
  | 'core'
  | 'partial'
  | 'shallow';

export type LlmRole =
  | 'character_dialogue'
  | 'painting_prompt_generator'
  | 'painting_intent_evaluator';
```

### 命名说明

游戏 UI 可继续显示中文名称，例如“山水”“人物”“界画”。代码层使用英文 ID，减少拼写和序列化问题。

---

## 2. 玩家与游戏状态

### 2.1 PlayerProfile

```ts
export interface PlayerProfile {
  id: string;
  name: string;
  pronounLabel: string;
  styleOrigin: 'landscape' | 'figure' | 'architecture' | 'balanced';
}
```

### 2.2 SkillState

```ts
export type SkillState = Record<SkillId, number>;

export interface SkillDelta {
  landscape?: number;
  figure?: number;
  architecture?: number;
}
```

### 2.3 TimeState

```ts
export interface TimeState {
  day: number;
  maxDay: number;
  timeSlot: TimeSlot;
  actionsRemainingToday: number;
  stamina: number;
  maxStamina: number;
  isExamDay: boolean;
}
```

### 2.4 ProgressState

```ts
export interface ProgressState {
  rank: Rank;
  unlockedLocations: LocationId[];
  triggeredEventIds: string[];
  completedEventIds: string[];
  flags: Record<string, boolean>;
}
```

### 2.5 CharacterRelationshipState

```ts
export interface CharacterRelationshipState {
  npcId: NpcId;
  hiddenAffinity: number;
  stage: RelationshipStage;
  emotionState: NpcEmotionState;
  unlockedTopics: string[];
  lastInteractionDay?: number;
}

export type RelationshipMap = Record<NpcId, CharacterRelationshipState>;
```

### 2.6 PuzzleState

```ts
export interface PuzzleState {
  activePaintingId?: string;
  discoveredAnomalyIds: string[];
  collectedClueIds: string[];
  interpretationHistory: PuzzleInterpretationRecord[];
  unlockedPaintingIds: string[];
}

export interface PuzzleInterpretationRecord {
  id: string;
  paintingId: string;
  day: number;
  selectedClueIds: string[];
  freeText?: string;
  tier: InterpretationTier;
  styleTags: string[];
  feedback: string;
}
```

### 2.7 GameState

```ts
export interface GameState {
  version: number;
  saveId: string;
  player: PlayerProfile;
  time: TimeState;
  skills: SkillState;
  progress: ProgressState;
  relationships: RelationshipMap;
  puzzle: PuzzleState;
  memory: MemoryState;
  lastRenderedText?: string;
}
```

---

## 3. 行动系统

### 3.1 ActionType

```ts
export type ActionType =
  | 'practice_skill'
  | 'talk_to_npc'
  | 'investigate_location'
  | 'observe_painting'
  | 'rest'
  | 'take_exam'
  | 'solve_puzzle';
```

### 3.2 GameAction

```ts
export interface GameAction {
  id: string;
  type: ActionType;
  label: string;
  locationId?: LocationId;
  npcId?: NpcId;
  skillId?: SkillId;
  paintingId?: string;
  staminaCost: number;
  requires?: ActionRequirement[];
}

export interface ActionRequirement {
  kind: 'rank' | 'flag' | 'location_unlocked' | 'skill_min' | 'clue_collected';
  id: string;
  value?: string | number | boolean;
}
```

### 3.3 ActionResult

```ts
export interface ActionResult {
  renderedText: string;
  statePatch: ValidatedStatePatch;
  memoryPatch?: MemoryPatch;
  nextActions: GameAction[];
  llmTraceId?: string;
}
```

---

## 4. 内容模型

### 4.1 WorldbookEntry

```ts
export type WorldbookEntryType =
  | 'place'
  | 'system'
  | 'rank'
  | 'skill'
  | 'painting'
  | 'item'
  | 'clue'
  | 'term'
  | 'event'
  | 'motif';

export interface WorldbookEntry {
  id: string;
  name: string;
  type: WorldbookEntryType;
  visibleDescription: string;
  hiddenDescription?: string;
  relatedNpcIds: NpcId[];
  relatedClueIds: string[];
  applicableLlmRoles: LlmRole[];
  misuseWarnings: string[];
}
```

### 4.2 PaintingBible

```ts
export interface PaintingBible {
  id: string;
  title: string;
  visibleSummary: string;
  hiddenSummary: string;
  requiredElements: string[];
  anomalies: PaintingAnomaly[];
  clueIds: string[];
  coreThemes: string[];
  partialInterpretations: string[];
  forbiddenInterpretations: string[];
  spoilerBoundaries: string[];
}

export interface PaintingAnomaly {
  id: string;
  visibleText: string;
  relatedSkillIds: SkillId[];
  requiredSkillToNotice?: Partial<Record<SkillId, number>>;
  grantsClueId?: string;
}
```

### 4.3 EventTemplate

```ts
export interface EventTemplate {
  id: string;
  locationId?: LocationId;
  npcId?: NpcId;
  priority: number;
  once: boolean;
  requirements: ActionRequirement[];
  result: EventStaticResult | EventLlmResult;
}

export interface EventStaticResult {
  kind: 'static';
  text: string;
  statePatch?: ValidatedStatePatch;
  memoryPatch?: MemoryPatch;
}

export interface EventLlmResult {
  kind: 'llm';
  llmRole: LlmRole;
  promptTemplateId: string;
}
```

---

## 5. LLM 输入输出

### 5.1 通用 LLM Envelope

```ts
export interface LlmRequestEnvelope<TInput> {
  traceId: string;
  role: LlmRole;
  promptVersion: string;
  input: TInput;
  context: RetrievedMemoryContext;
}

export interface LlmResponseEnvelope<TOutput> {
  traceId: string;
  role: LlmRole;
  promptVersion: string;
  output: TOutput;
  rawText?: string;
  validation: LlmValidationResult;
}

export interface LlmValidationResult {
  ok: boolean;
  errors: string[];
  safetyFlags: SafetyFlags;
  retryCount: number;
}
```

### 5.2 SafetyFlags

```ts
export interface SafetyFlags {
  containsSpoiler: boolean;
  oocRisk: boolean;
  canonDrift: boolean;
  promptInjectionRisk: boolean;
  schemaViolation: boolean;
  needsReview: boolean;
}
```

### 5.3 CharacterDialogueInput

```ts
export interface CharacterDialogueInput {
  npcId: NpcId;
  day: number;
  timeSlot: TimeSlot;
  locationId: LocationId;
  relationshipStage: RelationshipStage;
  emotionState: NpcEmotionState;
  topicCard: string;
  playerText?: string;
  recentEvents: string[];
  relevantMemories: string[];
  availableClueIds: string[];
  canonWarnings: string[];
}
```

### 5.4 CharacterDialogueOutput

```ts
export interface CharacterDialogueOutput {
  dialogue: string;
  actionText: string;
  emotionState: NpcEmotionState;
  topicUnlocked: string[];
  cluesGranted: string[];
  relationshipDelta: number;
  memoryPatch: MemoryPatch;
  safetyFlags: SafetyFlags;
}
```

### 5.5 PaintingPromptGeneratorInput

```ts
export interface PaintingPromptGeneratorInput {
  mode: 'exam' | 'puzzle';
  questionType: QuestionType;
  difficulty: number;
  relatedSkills: SkillId[];
  day: number;
  playerStyleTags: string[];
  requiredElements: string[];
  forbiddenElements: string[];
  tone: 'plain' | 'restrained' | 'literary';
}
```

### 5.6 PaintingPromptGeneratorOutput

```ts
export interface PaintingPromptGeneratorOutput {
  id: string;
  questionType: QuestionType;
  promptText: string;
  options: PaintingPromptOption[];
  freeInputHint: string;
  hiddenRubric: HiddenRubric;
  relatedSkills: SkillId[];
  potentialClueIds: string[];
  canonWarnings: string[];
}

export interface PaintingPromptOption {
  id: 'A' | 'B' | 'C';
  text: string;
  leansTo: SkillId[];
}

export interface HiddenRubric {
  coreSignals: string[];
  partialSignals: string[];
  shallowSignals: string[];
  forbiddenInterpretations: string[];
}
```

### 5.7 PaintingIntentEvaluatorInput

```ts
export interface PaintingIntentEvaluatorInput {
  mode: 'exam' | 'puzzle';
  question: {
    id: string;
    hiddenRubric: HiddenRubric;
  };
  playerAnswer: {
    selectedOptionIds?: string[];
    selectedClueIds?: string[];
    freeText?: string;
  };
  playerStats: SkillState;
  relationshipStage?: RelationshipStage;
  canonWarnings: string[];
}
```

### 5.8 PaintingIntentEvaluatorOutput

```ts
export interface PaintingIntentEvaluatorOutput {
  visibleFeedback: string;
  score: number;
  interpretationTier: InterpretationTier;
  styleTags: string[];
  suggestedStatePatch: SuggestedStatePatch;
  memoryPatch: MemoryPatch;
  safetyFlags: SafetyFlags;
}
```

---

## 6. 状态补丁与白名单

### 6.1 SuggestedStatePatch

LLM 只能返回建议补丁。

```ts
export interface SuggestedStatePatch {
  skillDelta?: SkillDelta;
  relationshipDelta?: number;
  cluesGranted?: string[];
  flagsSuggested?: string[];
  topicUnlocked?: string[];
}
```

### 6.2 ValidatedStatePatch

游戏引擎校验后转换成可提交补丁。

```ts
export interface ValidatedStatePatch {
  skillDelta?: SkillDelta;
  relationshipDeltaByNpc?: Partial<Record<NpcId, number>>;
  cluesGranted?: string[];
  flagsSet?: Record<string, boolean>;
  unlockedLocations?: LocationId[];
  rankChange?: Rank;
  staminaDelta?: number;
  timeAdvance?: boolean;
  eventIdsCompleted?: string[];
}
```

### 6.3 禁止 LLM 修改

以下内容不得由 LLM 直接修改：

- `saveId`
- `version`
- `CoreCanonMemory`
- `rankChange`
- `unlockedLocations`
- 主线关键 flag，例如 `archiveUnlocked`、`firstExamPassed`
- 任意删除操作

LLM 可建议，`GameEngine` 决定是否生效。

---

## 7. 记忆系统类型

### 7.1 MemoryState

```ts
export interface MemoryState {
  coreCanon: CoreCanonMemory;
  storyLedger: StoryLedgerEntry[];
  characterMemories: Record<NpcId, CharacterMemory>;
  playerStyle: PlayerStyleMemory;
  clueGraph: ClueGraphMemory;
  summaries: SummaryMemoryEntry[];
}
```

### 7.2 CoreCanonMemory

```ts
export interface CoreCanonMemory {
  version: string;
  worldPremise: string;
  hiddenAnchors: HiddenAnchor[];
  spoilerBoundaries: string[];
  forbiddenCanonDrifts: string[];
}

export interface HiddenAnchor {
  id: string;
  codename: string;
  privateTruth: string;
  allowedForeshadowing: string[];
  forbiddenReveals: string[];
}
```

### 7.3 StoryLedgerEntry

```ts
export interface StoryLedgerEntry {
  id: string;
  day: number;
  timeSlot: TimeSlot;
  locationId?: LocationId;
  npcId?: NpcId;
  actionType: ActionType;
  summary: string;
  visibleText?: string;
  gainedClueIds: string[];
  flagsSet: string[];
  createdAt: string;
}
```

### 7.4 CharacterMemory

```ts
export interface CharacterMemory {
  npcId: NpcId;
  impressionOfPlayer: string;
  knownPlayerStyleTags: string[];
  knownClueIds: string[];
  avoidedTopics: string[];
  relationshipNotes: string[];
  lastSummary: string;
}
```

### 7.5 PlayerStyleMemory

```ts
export interface PlayerStyleMemory {
  tags: string[];
  skillBias: SkillId[];
  interpretationPatterns: string[];
  notableChoices: string[];
}
```

### 7.6 ClueGraphMemory

```ts
export interface ClueGraphMemory {
  nodes: ClueGraphNode[];
  edges: ClueGraphEdge[];
}

export interface ClueGraphNode {
  id: string;
  label: string;
  kind: 'painting' | 'clue' | 'npc' | 'place' | 'motif' | 'item';
  discovered: boolean;
  hidden: boolean;
}

export interface ClueGraphEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  discovered: boolean;
}
```

### 7.7 SummaryMemoryEntry

```ts
export interface SummaryMemoryEntry {
  id: string;
  kind: 'daily' | 'exam' | 'puzzle' | 'chapter';
  day: number;
  summary: string;
  relatedNpcIds: NpcId[];
  relatedClueIds: string[];
}
```

### 7.8 MemoryPatch

```ts
export interface MemoryPatch {
  characterImpression?: string;
  playerStyleTags?: string[];
  storyLedgerNote?: string;
  clueLinks?: Array<[string, string, string]>;
  summaryCandidate?: string;
}
```

---

## 8. 记忆检索上下文

### 8.1 RetrievedMemoryContext

```ts
export interface RetrievedMemoryContext {
  coreCanonExcerpt: string;
  worldbookEntries: WorldbookEntry[];
  characterMemory?: CharacterMemory;
  recentLedgerEntries: StoryLedgerEntry[];
  playerStyle: PlayerStyleMemory;
  relatedClueNodes: ClueGraphNode[];
  summaries: SummaryMemoryEntry[];
  canonWarnings: string[];
}
```

### 8.2 检索策略

对话：

- 当前地点世界书。
- 当前 NPC 角色记忆。
- 最近 3 条 StoryLedger。
- 与话题相关线索。
- CoreCanon 摘要与禁止剧透规则。

丹青试：

- 丹青试制度。
- 相关技能条目。
- 玩家风格记忆。
- 若埋伏笔，加载水穷云起条目。
- 不加载完整隐藏真相。

秘阁解谜：

- 秘阁地点。
- 当前画卷 bible。
- 已发现异常点。
- 已收集线索卡。
- 四人共同参与《骸游图》的事实层摘要。
- CoreCanon 禁止剧透规则。

---

## 9. Guardrails 规格

### 9.1 校验流程

```ts
export interface GuardrailCheckResult {
  ok: boolean;
  safetyFlags: SafetyFlags;
  blockedReasons: string[];
  sanitizedOutput?: unknown;
}
```

校验顺序：

1. JSON parse。
2. Schema 校验。
3. 白名单字段校验。
4. 剧透检测。
5. 现代化跑偏检测。
6. 人设跑偏检测。
7. 状态越权检测。

### 9.2 剧透检测概念

应拦截或标记：

- 希孟将来会消失。
- 云起时是真实地点。
- 云起时能拯救苍生。
- 玩家已经知道终局。
- 第二幅画卷完整真相。

### 9.3 状态越权检测

如果 LLM 输出包含以下意图，应拒绝：

- 直接改变职级。
- 直接解锁秘阁。
- 删除、覆盖或改写 CoreCanon。
- 写入非白名单 flag。
- 生成不存在的地点、NPC 或画卷 ID。

---

## 10. 持久化与版本

### 10.1 SaveFile

```ts
export interface SaveFile {
  saveId: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  label: string;
  gameState: GameState;
}
```

### 10.2 PromptVersionRecord

```ts
export interface PromptVersionRecord {
  role: LlmRole;
  version: string;
  createdAt: string;
  notes: string;
}
```

### 10.3 LlmTrace

```ts
export interface LlmTrace {
  traceId: string;
  role: LlmRole;
  promptVersion: string;
  inputPreview: string;
  outputPreview: string;
  safetyFlags: SafetyFlags;
  createdAt: string;
}
```

---

## 11. 首批关键 Flags

```ts
export const INITIAL_FLAGS = {
  metXimeng: false,
  firstExamTaken: false,
  firstExamPassed: false,
  archiveEntranceHeard: false,
  archiveUnlocked: false,
  haiyouDiscovered: false,
  haiyouFirstInterpreted: false,
  noticedWaterEndCloudWeak: false,
  noticedWaterEndCloudStrong: false,
  secondScrollTeased: false,
} as const;
```

### Flag 写入规则

- `metXimeng`：固定初遇事件写入。
- `firstExamTaken`：考试行动完成写入。
- `firstExamPassed`：考试分数和引擎规则决定。
- `archiveUnlocked`：职级为 `painter_regular` 且完成指定事件后写入。
- `noticedWaterEndCloudWeak`：弱伏笔事件或考试题触发后，由引擎确认写入。
- `noticedWaterEndCloudStrong`：玩家在《骸游图》中关注被遮住水路或云气后，由评估器建议、引擎确认写入。
- `secondScrollTeased`：MVP 结尾事件写入。

---

## 12. 待实现文件建议

后续建项目时建议拆为：

```text
src/types/core.ts
src/types/actions.ts
src/types/content.ts
src/types/llm.ts
src/types/memory.ts
src/types/persistence.ts
src/engine/gameEngine.ts
src/engine/statePatches.ts
src/memory/retriever.ts
src/memory/writer.ts
src/llm/adapter.ts
src/llm/mockAdapter.ts
src/guardrails/validateLlmOutput.ts
src/content/worldbook.ts
src/content/paintings.ts
src/content/characters.ts
src/content/flags.ts
```

---

## 13. 下一步

建议下一步创建实际项目骨架，并优先实现：

1. `src/types/*`
2. 初始 `GameState`
3. `GameEngine.applyAction`
4. mock LLM adapter
5. 记忆写入与检索的纯函数
6. 开发期 debug panel

