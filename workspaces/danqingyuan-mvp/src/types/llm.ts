import type {
  InterpretationTier,
  LocationId,
  NpcEmotionState,
  NpcId,
  QuestionType,
  RelationshipStage,
  SkillId,
  SkillState,
  TimeSlot,
  LlmRole,
} from './core';
import type { SuggestedStatePatch } from './actions';
import type { MemoryPatch, RetrievedMemoryContext } from './memory';

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

export interface SafetyFlags {
  containsSpoiler: boolean;
  oocRisk: boolean;
  canonDrift: boolean;
  promptInjectionRisk: boolean;
  schemaViolation: boolean;
  needsReview: boolean;
}

export type ChatReplyTone = 'warm' | 'neutral' | 'probing';

export interface ChatReplyOption {
  /** 玩家可选的回复文本（≤30 字） */
  text: string;
  /** 语气倾向：warm 真诚谈画/共鸣（倾向涨好感）/ neutral 中性 / probing 追问隐私秘阁（倾向不涨或降） */
  tone: ChatReplyTone;
}

export interface CharacterDialogueInput {
  npcId: NpcId;
  day: number;
  timeSlot: TimeSlot;
  locationId: LocationId;
  relationshipStage: RelationshipStage;
  emotionState: NpcEmotionState;
  topicCard: string;
  playerText?: string;
  /** 玩家选中的回复（多轮闲聊，2026-06-25）：上一轮玩家选的 option 文本 */
  playerReply?: string;
  /** 玩家选中回复的语气（驱动好感裁决） */
  replyTone?: ChatReplyTone;
  /** 本场已发生的对话往来（多轮上下文，末几轮） */
  recentDialogue?: string[];
  /** 本轮是否为今日最后一次闲聊（2026-06-26）：true 时 NPC 应回完玩家这一问、再自然带一句作别，replyOptions 给空 */
  isFinalExchange?: boolean;
  /** 续聊开场（2026-06-26）：true 时无 playerReply，NPC 应延续 recentDialogue 上次话题主动开口、给 replyOptions（不计好感） */
  isOpening?: boolean;
  /** 结局导师点评（2026-06-30）：丹青试毕，本科导师按表现点评。含档位/分数/是否落第；落第时口吻给"补考机会" */
  examReview?: {
    tier: 'excellent' | 'good' | 'pass' | 'fail';
    score: number;
    failed: boolean;
    majorSkillLabel: string;
  };
  recentEvents: string[];
  relevantMemories: string[];
  availableClueIds: string[];
  canonWarnings: string[];
}

export interface CharacterDialogueOutput {
  dialogue: string;
  actionText: string;
  emotionState: NpcEmotionState;
  topicUnlocked: string[];
  cluesGranted: string[];
  relationshipDelta: number;
  /** 玩家下一轮可选的回复（2-3 个，多轮闲聊，2026-06-25）；空数组=本场可收 */
  replyOptions?: ChatReplyOption[];
  /** 安全/隐私越界标志（2026-06-26）：玩家问AI/大模型/元游戏等 → NPC 不出戏回避，引擎据此直接降一档 */
  boundaryViolation?: boolean;
  memoryPatch: MemoryPatch;
  safetyFlags: SafetyFlags;
}

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
  /** 玩家学识 0~50（2026-06-12 Gate③）：评估器据此软性调高批语认可度；引擎另做确定性加分 */
  knowledge?: number;
  relationshipStage?: RelationshipStage;
  canonWarnings: string[];
}

export interface PaintingIntentEvaluatorOutput {
  visibleFeedback: string;
  score: number;
  interpretationTier: InterpretationTier;
  styleTags: string[];
  suggestedStatePatch: SuggestedStatePatch;
  memoryPatch: MemoryPatch;
  safetyFlags: SafetyFlags;
}

/** 剧情写作器（v2 §6）：引擎先算结果，LLM 推演场景。intro=入院引文（无分支），open+mid+resolve=多轮场景（mid 仅第 1 日加轮用）。 */
export type ScenePhase = 'intro' | 'open' | 'mid' | 'continue' | 'resolve' | 'end' | 'practice';

export interface SceneNarratorPlayerCard {
  name: string;
  /** 中文标签："女" / "男" */
  genderLabel: string;
  age: number;
  /** 中文标签："商贩之家" 等 */
  originLabel: string;
  /** 中文标签："好奇敏锐" 等 */
  personalityLabel: string;
  /** 自由输入的未来志向 */
  aspiration: string;
  /** "山水" / "人物" / "界画" */
  styleLabel: string;
  /** 情感线口径（拍板）：≤50 岁恋爱线开放不限性别；>50 岁忘年知己 */
  romanceLabel: string;
}

export interface SceneNarratorInput {
  phase: ScenePhase;
  day: number;
  timeSlot: TimeSlot;
  locationId: LocationId;
  weather: string;
  season: string;
  player: SceneNarratorPlayerCard;
  /** 玩家本时段选择的行动标签，如 "晨课·山水课" "街边吃食" */
  actionLabel: string;
  /** 引擎事实清单，如 "晨课：山水课，李唐授课" "山水 +1" */
  facts: string[];
  /** 当日主题暗线（"粉饰太平"递进节拍），如 "繁华底下：脚店伙计提到拖欠的工钱" */
  themeBeat: string;
  /** 当日主线节拍（七日主线规划器产出）：场景里轻轻落一笔，点到即止 */
  mainlineBeat?: string;
  /**
   * 叙事分轨（2026-06-12，双轨叙事）：
   * - growth（成长类·晨课/写生/查证等）：借行动从侧面照见 themeBeat（暗线·民生百态），不直接碰主线线索；
   * - narrative（叙事类·偶遇/主线节拍日）：侧重正面推动 mainlineBeat（明线·大事件线索）。
   * 机械类不调 LLM，不会出现在此输入。
   */
  narrativeTrack?: 'growth' | 'narrative';
  /** 上一场结尾片段：开场承接用，避免每场重新起灶 */
  prevSceneEnding?: string;
  /** 本地点上次那场的余韵（2026-06-16）：又回到此地时作软回响淡淡提一句，时序以 prevSceneEnding 为准 */
  locationThread?: string;
  /** 赴约上下文（2026-06-16）：keep_appointment 场景专用，本场须正面兑现这桩前约 */
  appointmentContext?: string;
  /** 错过的约定（2026-06-16，预留）：次日开场可淡淡交代遗憾 */
  missedAppointment?: string;
  /** 当前所在地点中文名（2026-06-17）：叙事只能发生在此处，不得让玩家"走进"别处 */
  currentLocationLabel?: string;
  /** 已解锁去处中文名清单（2026-06-17）：推荐行动/正文提及去处只能从此选，不得虚构新地点 */
  allowedLocations?: string[];
  /** 今日安排摘要（课表 + 当前时段），供人物口中自然提及，防剧情发散 */
  todayPlan?: string;
  /** 场景中在场 NPC（引擎掷点决定），不在此列的 NPC 不得出场；好感建议须用 id 作键。persona=人设硬约束(禁OOC)，affinityStage=好感档中文名（仅好感线 NPC 带） */
  npcsPresent: Array<{ id: string; name: string; persona?: string; affinityStage?: string }>;
  /** 玩家是否已与希孟正式相识（2026-06-26）：false 时希孟不得在正文出场/被点名 */
  ximengMet?: boolean;
  /** 字数预算：每段下限/上限、当日已用/当日上限 */
  lengthBudget: {
    segmentMin: number;
    segmentMax: number;
    dayCharsUsed: number;
    dayCharsMax: number;
  };
  /** resolve 阶段：open 段正文（供承接） */
  openNarrative?: string;
  /** resolve 阶段：玩家选择的分支文本或自由输入 */
  playerChoice?: string;
  /** resolve 阶段允许授予的线索白名单（引擎给定，超出即剔除） */
  allowedClueIds?: string[];
  playerStyleTags: string[];
  recentLedger: string[];
  canonWarnings: string[];
}

export interface SceneChoice {
  id: string;
  text: string;
}

/** 推荐行动（2026-06-17）：LLM 根据当前剧情产出的即时下一步，渲染为推荐行动签 */
export interface SceneSuggestedAction {
  /** ≤12 字签文案，如「去街市找画摊少年」 */
  label: string;
  locationId: LocationId;
  /** ≤50 字下一步要做什么，喂下一场承接 */
  summary: string;
  npcId?: NpcId;
}

export interface SceneSuggestedPatch {
  /** 心情建议 -1~+1，引擎裁决 */
  moodDelta?: number;
  /** 好感建议 -2~+3，按 NPC，引擎裁决 */
  affinityDeltaByNpc?: Record<string, number>;
  /** 仅可来自 allowedClueIds 白名单 */
  clueIds?: string[];
  /** 剧情约定（2026-06-16）：本场引出的明日赴约，引擎裁决后入 pendingHooks。LLM 不给 id/createdDay/status */
  pendingHook?: {
    day: number;
    locationId: LocationId;
    npcId?: NpcId;
    label: string;
    summary: string;
  };
}

export interface SceneNarratorOutput {
  /** 每段 ≥segmentMin 字的剧情正文 */
  narrativeText: string;
  /** （旧）open/mid 分支选项；2026-06-17 三件套模型下 open/continue 不再产出 */
  choices?: SceneChoice[];
  /** open/continue 阶段（2026-06-17）：本场是否还有剧情张力；false 则「继续」消失。缺省按 true */
  sceneCanContinue?: boolean;
  /** open/continue 阶段（2026-06-17）：剧情是否到了自然收束点；true 则亮「去别处看看」。缺省 false */
  shouldConclude?: boolean;
  /** open/continue 阶段（2026-06-17）：剧情驱动的即时下一步推荐行动，0~3 个 */
  suggestedActions?: SceneSuggestedAction[];
  /** resolve/end 阶段：建议的小幅状态变化，引擎裁决后才生效 */
  suggestedPatch?: SceneSuggestedPatch;
  /** resolve/end 阶段：≤50 字的关键事件记忆摘要，空字符串表示无需记忆 */
  memoryNote?: string;
  /** 仅供 UI 氛围用，不入状态 */
  atmosphereTags?: string[];
}

export const safeFlags: SafetyFlags = {
  containsSpoiler: false,
  oocRisk: false,
  canonDrift: false,
  promptInjectionRisk: false,
  schemaViolation: false,
  needsReview: false,
};

/** 七日主线规划器（拍板）：开局种子一次扩写成 7 日节拍表 */
export interface MainlinePlannerInput {
  seed: {
    motifLabel: string;
    /** 母题提示：这件事底下藏着什么 */
    motifHint: string;
    npcId: NpcId;
    npcName: string;
    objectLabel: string;
    locationLabel: string;
  };
  playerName: string;
  /** "山水" / "人物" / "界画" */
  styleLabel: string;
  aspiration: string;
  canonWarnings: string[];
}

export interface MainlinePlannerOutput {
  /** ≤20 字的主线暗题（玩家不可见） */
  title: string;
  /** 恰好 7 条，day 1~7，每条 beat ≤40 字；第 7 日揭一层秘密并留钩子 */
  beats: Array<{ day: number; beat: string }>;
}


