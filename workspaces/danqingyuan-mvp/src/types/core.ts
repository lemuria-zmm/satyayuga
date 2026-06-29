export type TimeSlot = 'morning_class' | 'forenoon' | 'noon' | 'afternoon' | 'evening';

export const TIME_SLOT_ORDER: TimeSlot[] = ['morning_class', 'forenoon', 'noon', 'afternoon', 'evening'];

/** 画院职称序列（史实：学生<祗候<艺学<待诏）。mvp：通过丹青试授最低阶祗候，后续篇章逐级晋升（艺学待加）。painter_awaiting=画待诏为最高阶，mvp 仅 NPC 择端持有 */
export type Rank = 'student' | 'zhihou' | 'painter_regular' | 'painter_awaiting';

export type SkillId = 'landscape' | 'figure' | 'architecture';

export type LocationId =
  | 'hall'
  | 'library'
  | 'garden'
  | 'market'
  | 'dining_hall'
  | 'dormitory'
  | 'secret_archive'
  | 'ximeng_studio';

export type NpcId = 'ximeng' | 'zeduan' | 'litang' | 'song';

/** 晨课课程（拍板：玩家自填课表，李唐总教习授课） */
export type CourseId = 'landscape_class' | 'figure_class' | 'architecture_class' | 'theory_class' | 'free_copy';

/** 玩家课表：第 1~6 日晨课各排一门；第 7 日固定丹青试 */
export type CurriculumState = Record<number, CourseId>;

export type RelationshipStage =
  | 'stranger'
  | 'colleague'
  | 'same_path'
  | 'confidant'
  | 'intimate';

/** 好感档位（设计 §7.4）：陌路 0-19 / 同僚 20-39 / 同道 40-59 / 知己 60-79 / 莫逆 80+ */
export function stageFromAffinity(affinity: number): RelationshipStage {
  if (affinity >= 80) return 'intimate';
  if (affinity >= 60) return 'confidant';
  if (affinity >= 40) return 'same_path';
  if (affinity >= 20) return 'colleague';
  return 'stranger';
}

/** 当前好感所在档的下限（0/20/40/60/80），用于越界降档计算（2026-06-26） */
export function stageFloor(affinity: number): number {
  if (affinity >= 80) return 80;
  if (affinity >= 60) return 60;
  if (affinity >= 40) return 40;
  if (affinity >= 20) return 20;
  return 0;
}

/** 好感档位中文名（喂 LLM / UI 显示） */
export const RELATIONSHIP_STAGE_LABELS: Record<RelationshipStage, string> = {
  stranger: '陌路',
  colleague: '同僚',
  same_path: '同道',
  confidant: '知己',
  intimate: '莫逆',
};

/** 每日闲聊次数（按好感档，2026-06-25）：陌路3/同僚10/同道20/知己30/莫逆40。实时按当前档算剩余 */
/** 每日闲聊次数（按好感档，2026-06-25；2026-06-26 陌路3→6 治前期闷在陌路）：陌路6/同僚10/同道20/知己30/莫逆40 */
export function dailyChatQuota(stage: RelationshipStage): number {
  switch (stage) {
    case 'intimate': return 40;
    case 'confidant': return 30;
    case 'same_path': return 20;
    case 'colleague': return 10;
    default: return 6;
  }
}

/** 每日好感涨幅封顶（2026-06-26）：防高档+warm 一日拉满，保证七日养成曲线 */
export const DAILY_AFFINITY_CAP = 12;

/** 每日技能涨幅封顶（2026-06-27 沙盒练习系统）：防买饭回体力无限刷技能；仅三画技正增长计入，学识不受限 */
export const DAILY_SKILL_CAP = 4;

/** 每日学识涨幅封顶（2026-06-28）：堵"讨茶回体力→刷学识签"漏洞；仅练习签学识正增长计入（晨课画理课不受限） */
export const DAILY_KNOWLEDGE_CAP = 3;

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

export type InterpretationTier = 'core' | 'partial' | 'shallow';

export type LlmRole =
  | 'character_dialogue'
  | 'painting_prompt_generator'
  | 'painting_intent_evaluator'
  | 'scene_narrator'
  | 'mainline_planner';

/** 七日主线种子（拍板）：开局引擎从池中随机抽组合，一次 LLM 扩写成节拍表 */
export interface MainlineSeed {
  motifId: string;
  motifLabel: string;
  /** 与主线牵连最深的 NPC */
  npcId: NpcId;
  /** 关键物件（复用《骸游图》伏笔元素：货郎、药瓶、婴孩、视线、摊位朝向） */
  objectId: string;
  objectLabel: string;
  /** 主线主要发生地 */
  locationId: LocationId;
}

export interface MainlineBeat {
  day: number;
  /** ≤40 字的当日主线节拍 */
  beat: string;
}

export interface MainlineState {
  seed: MainlineSeed;
  /** 主线暗题（玩家不可见，供写作器把握方向） */
  title: string;
  /** 7 日节拍表；第 7 日揭一层秘密留钩子 */
  beats: MainlineBeat[];
}

export type PlayerGender = 'female' | 'male';

/** 家庭出身：轻微影响初始数值与剧情口吻 */
export type FamilyOrigin =
  | 'merchant' // 商贩之家：+5 钱文
  | 'farming_scholar' // 耕读之家：+3 学识
  | 'official_branch' // 官宦旁支：+5 钱文 +2 学识 -1 心情
  | 'artisan' // 匠作之家：界画 +2
  | 'displaced'; // 流民出身：体力上限 +1，-5 钱文

export interface PlayerProfile {
  id: string;
  name: string;
  pronounLabel: string;
  /** 画风倾向三选一，同时决定引路人（拍板：去掉均衡） */
  styleOrigin: SkillId;
  gender: PlayerGender;
  /** 18~60（滚轮选择） */
  age: number;
  origin: FamilyOrigin;
  /** 性格：自由输入，供剧情写作器推演 */
  personality: string;
  /** 未来志向：自由输入，供剧情写作器推演 */
  aspiration: string;
}

/** 各画科授课导师（2026-06-11 拍板）：山水/画理=李唐（总教习），人物=嵩，界画=择端。希孟为特招讲师，不授课，书房偶遇后开启对谈。 */
export const TEACHER_BY_STYLE: Record<SkillId, NpcId> = {
  landscape: 'litang',
  figure: 'song',
  architecture: 'zeduan',
};

/** 恋爱线开关（拍板）：≤50 岁希孟线可发展爱情、不限玩家性别；>50 岁转忘年知己。 */
export function getRomancePolicy(age: number): 'open' | 'platonic' {
  return age > 50 ? 'platonic' : 'open';
}

export const FAMILY_ORIGIN_LABELS: Record<FamilyOrigin, string> = {
  merchant: '商贩之家',
  farming_scholar: '耕读之家',
  official_branch: '官宦旁支',
  artisan: '匠作之家',
  displaced: '流民出身',
};

export type SkillState = Record<SkillId, number>;

export type SkillDelta = Partial<Record<SkillId, number>>;

export interface TimeState {
  day: number;
  maxDay: number;
  timeSlot: TimeSlot;
  stamina: number;
  maxStamina: number;
  /** 次日晨起体力修正（早歇 +1，蹴鞠 -1），结算后清零 */
  nextDayStaminaBonus: number;
  isExamDay: boolean;
  /** 当日已渲染的剧情字数（日终预算 3000），跨日清零 */
  narrativeCharsToday: number;
  /** 当前叙事时段已演场景数（2026-06-18）：满 3 场后报时钟收尾签亮起、停止自动开场；跨时段清零 */
  slotSceneCount: number;
  /** 当日已累计的技能涨幅（2026-06-27 沙盒练习系统）：仅三画技正增长计入，跨日清零，用于每日封顶 DAILY_SKILL_CAP */
  skillGainedToday: number;
  /** 当日已累计的学识涨幅（2026-06-28）：仅练习签学识正增长计入，跨日清零，用于每日封顶 DAILY_KNOWLEDGE_CAP */
  knowledgeGainedToday: number;
}

/** 体力之外的玩家属性。体力随每日作息走，留在 TimeState。 */
export interface PlayerStats {
  /** 心情 0~10：修习效率修正，过低触发低压事件 */
  mood: number;
  /** 学识 0~50：考试发挥加成，解锁书房深层查证与部分秘阁线索 */
  knowledge: number;
  /** 钱文 0~99：市井消费专用，不 gate 主线 */
  money: number;
}

export const STAT_LIMITS = {
  mood: { min: 0, max: 10 },
  knowledge: { min: 0, max: 50 },
  money: { min: 0, max: 99 },
} as const;

export const DAILY_ALLOWANCE = 5;
export const DAILY_BASE_STAMINA = 8;

export interface ProgressState {
  rank: Rank;
  unlockedLocations: LocationId[];
  triggeredEventIds: string[];
  completedEventIds: string[];
  flags: Record<string, boolean>;
}

export interface CharacterRelationshipState {
  npcId: NpcId;
  hiddenAffinity: number;
  stage: RelationshipStage;
  emotionState: NpcEmotionState;
  unlockedTopics: string[];
  lastInteractionDay?: number;
  /** 当日已闲聊次数（2026-06-25）：跨日清零；剩余 = max(0, dailyChatQuota(stage) - chatsToday) */
  chatsToday?: number;
  /** 对话往来历史（2026-06-26）：每轮 "我：…" / "希孟：…"，持久化、跨日保留，供续聊衔接与「往来」记录 */
  chatHistory?: string[];
  /** 当日已累计的好感涨幅（2026-06-26）：跨日清零，用于每日涨幅封顶 DAILY_AFFINITY_CAP */
  affinityGainedToday?: number;
}

export type RelationshipMap = Record<NpcId, CharacterRelationshipState>;

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

export interface GameState {
  version: number;
  saveId: string;
  player: PlayerProfile;
  time: TimeState;
  stats: PlayerStats;
  skills: SkillState;
  progress: ProgressState;
  relationships: RelationshipMap;
  puzzle: PuzzleState;
  memory: import('./memory').MemoryState;
  currentLocation: LocationId;
  /** 玩家自填课表（入院引导后填写；未填则晨课不可上） */
  curriculum?: CurriculumState;
  /** 七日主线（开局种子 + 一次 LLM 扩写节拍表；失败回落模板节拍） */
  mainline?: MainlineState;
  lastRenderedText?: string;
  /** 上一场 LLM 成长/叙事场景的结尾锚点（2026-06-16）：只被 LLM 场景写、机械行动不碰，供下一场承接 */
  lastSceneEnding?: string;
  /** 剧情约定队列（2026-06-16）：LLM 在场景里立下的"明日某地赴约"，对应日去对应地点触发专属赴约场景 */
  pendingHooks?: PendingHook[];
  /** 即时推荐意图（2026-06-17）：当日 LLM 产出的"去某地接续剧情"意图。点推荐签或手动走到该地都触发 follow 接续场景；当日即时有效、消费即删、跨日清空（区别于 pendingHooks 跨日约定） */
  suggestedIntents?: Partial<Record<LocationId, string>>;
  /** 丹青试结局（2026-06-28）：第7日丹青试结算后由 determineEnding 写入，驱动 EndingScreen */
  ending?: EndingResult;
}

/** 丹青试结局档（2026-06-28）：分数定主轴，好感/暗线修饰文本 */
export type EndingTier = 'excellent' | 'good' | 'pass' | 'fail';

export interface EndingResult {
  /** 结局档：优（画待诏）/良（画正解锁秘阁）/中（画正勉过）/落第 */
  tier: EndingTier;
  /** 结局标题（按 tier） */
  title: string;
  /** 最终分数（含技能 gating + 学识加分） */
  score: number;
  /** 是否因本科技能不足被封顶（手生落第，结局文案区分） */
  cappedBySkill: boolean;
  /** 晋升 rank（落第不变） */
  rankChange?: Rank;
  /** 是否解锁秘阁（2026-06-29：通过即解锁，含中档） */
  unlockArchive: boolean;
  /** 是否解锁希孟画室（2026-06-29：通过 + 希孟好感≥知己60）。与 unlockArchive 同满足=双入口预热后续篇章 */
  unlockStudio: boolean;
  /** 希孟羁绊点缀（好感达知己/莫逆时非空） */
  ximengNote?: string;
  /** 暗线觉察点缀（看破粉饰太平/骸游图伏笔时非空） */
  themeNote?: string;
  /** 七日养成回顾（本科技能/学识/好感档/暗线觉察条目） */
  summaryLines: string[];
}

/** 剧情约定（2026-06-16）：LLM resolve 产出 day/locationId/label/summary，引擎补 id/createdDay/status 入队 */
export interface PendingHook {
  id: string;
  /** 赴约日，> 产出日且 ≤7 */
  day: number;
  locationId: LocationId;
  /** 约定对象（可选）：赴约场景保证其在场 */
  npcId?: NpcId;
  /** ≤12 字行动签文案，如「赴画摊少年之约」 */
  label: string;
  /** ≤50 字约定上下文，喂赴约场景的 LLM */
  summary: string;
  createdDay: number;
  status: 'pending' | 'completed' | 'missed';
}

