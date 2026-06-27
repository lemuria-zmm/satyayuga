import { COURSES } from '../content/courses';
import { ACTIVITY_BY_ID } from '../content/activities';
import { CHARACTERS } from '../content/characters';
import { LOCATIONS } from '../content/locations';
import {
  FAMILY_ORIGIN_LABELS,
  getRomancePolicy,
  RELATIONSHIP_STAGE_LABELS,
} from '../types/core';
import type {
  GameAction,
  GameState,
  LocationId,
  NpcId,
  PendingHook,
  SceneNarratorPlayerCard,
  SceneSuggestedAction,
  SceneSuggestedPatch,
  SummaryMemoryEntry,
  ValidatedStatePatch,
} from '../types';

/** 剧情段落预算 */
export const SEGMENT_MIN = 200;
export const SEGMENT_MAX = 500;
/**
 * 日终字数预算（2026-06-18 大幅放宽 4500→12000）：A+C 模型下一日叙事时段（晨课+上午+下午+可能赴约）
 * 各最多 3 场、每场 open+可多次「继续」，旧 4500 是按"一时段一场"的旧模型定的，新模型午后就会撞顶
 * 走 fallback 模板句（明明第二日午后回院堂只见模板正是此因）。12000 给正常游玩充足余量，
 * 同时仍为失控 LLM 兜底（场景数已由报时钟 MAX_SLOT_SCENES=3/时段 硬上限封顶，此预算只作字数侧保险）。
 */
export const DAY_CHARS_MAX = 12000;

/** 行动分轨（2026-06-12 拍板，行动三分法；2026-06-27 加 practice 第四轨） */
export type ActionTrack = 'mechanical' | 'growth' | 'narrative' | 'practice';

/**
 * 行动分轨判定（单一事实源）：
 * - 晨课（attend_class）恒为 growth；
 * - 活动卡（activity）读 ActivityCard.track，默认 mechanical（练习卡 track:'practice'）；
 * - 其余行动（move_to / take_exam / sleep / solve_puzzle / talk_to_npc / practice_skill[死路径]）→ mechanical 防御默认，永不触发 LLM。
 * 注：'narrative' 本轮无来源（NPC 偶遇系统未做），getActionTrack 本轮永不返回它；
 * 保留枚举供 prompt 区分对待，下一轮偶遇命中时再由调用方产出。
 */
export function getActionTrack(action: GameAction): ActionTrack {
  if (action.type === 'attend_class') return 'growth';
  // 赴约（剧情约定触发）、信步（空洞地点环境签）、推荐行动（剧情驱动下一步）都是 LLM 成长场景（2026-06-16/17）
  if (action.type === 'keep_appointment' || action.type === 'wander' || action.type === 'follow_suggestion') return 'growth';
  if (action.type === 'activity') return ACTIVITY_BY_ID[action.activityId ?? '']?.track ?? 'mechanical';
  return 'mechanical';
}

/**
 * 是否走 LLM 两阶段场景（成长类/叙事类）；机械类不调 LLM，纯模板 + 数值结算。
 * 注（2026-06-27）：practice 也调 LLM，但走独立的单段轻量路径（App.runPractice），**不进**三件套场景循环，
 * 故此处仍返回 false——isLlmScene 专指"是否进 startScene 三件套"，practice 由 runAction 单独拦截。
 */
export function isLlmScene(action: GameAction): boolean {
  return getActionTrack(action) === 'growth' || getActionTrack(action) === 'narrative';
}

const STYLE_LABELS: Record<GameState['player']['styleOrigin'], string> = {
  landscape: '山水',
  figure: '人物',
  architecture: '界画',
};

export function buildScenePlayerCard(player: GameState['player']): SceneNarratorPlayerCard {
  return {
    name: player.name,
    genderLabel: player.gender === 'female' ? '女' : '男',
    age: player.age,
    originLabel: FAMILY_ORIGIN_LABELS[player.origin],
    personalityLabel: player.personality,
    aspiration: player.aspiration,
    styleLabel: STYLE_LABELS[player.styleOrigin],
    romanceLabel:
      getRomancePolicy(player.age) === 'open'
        ? '情感线可缓缓发展为爱慕，不限玩家性别'
        : '情感线为忘年知己之谊，不涉爱情',
  };
}

/** NPC 常去之处：场景在场掷点的候选池 */
const NPC_HAUNTS: Record<LocationId, NpcId[]> = {
  hall: ['litang', 'song'],
  library: ['ximeng', 'litang'],
  garden: ['ximeng', 'song'],
  market: ['zeduan'],
  dining_hall: ['song'],
  dormitory: [],
  secret_archive: ['ximeng'],
  ximeng_studio: ['ximeng'],
};

/** 引擎掷点决定在场 NPC：晨课授课导师必在场（按课表），其余地点候选各 40%，至多 2 人 */
export function rollNpcsPresent(state: GameState, action: GameAction, locationId: LocationId): NpcId[] {
  const present = new Set<NpcId>();
  if (action.type === 'attend_class') {
    const courseId = state.curriculum?.[state.time.day];
    const course = courseId ? COURSES[courseId] : undefined;
    if (course?.freeChoice) {
      // 自由临摹（2026-06-25 场景化）：院堂临帖李唐偶尔巡看；后花园/街市写生不强加导师，交给地点常客 roll
      if (locationId === 'hall') present.add('litang');
    } else {
      // 正课：授课导师必在场（画理课等无 teacher 的，李唐巡看）
      present.add(course?.teacher ?? 'litang');
    }
  }
  // 赴约（2026-06-16）：约定对象必在场（hook.npcId，或该地点常客首位），否则赴约扑空
  if (action.type === 'keep_appointment') {
    const hook = (state.pendingHooks ?? []).find((h) => h.id === action.hookId);
    const target = hook?.npcId ?? NPC_HAUNTS[locationId]?.[0];
    if (target) present.add(target);
  }
  // 希孟画室：希孟必在场（专属场景，2026-06-25）
  if (locationId === 'ximeng_studio') present.add('ximeng');
  for (const npcId of NPC_HAUNTS[locationId] ?? []) {
    if (present.size >= 2) break;
    if (!present.has(npcId) && Math.random() < 0.4) present.add(npcId);
  }
  return [...present];
}

/** 在场 NPC 卡（喂 scene_narrator）：带人设(persona 禁OOC) + 好感线 NPC 带当前好感档（2026-06-25/26） */
export function npcIdsToCards(
  npcIds: NpcId[],
  relationships?: GameState['relationships'],
): Array<{ id: string; name: string; persona?: string; affinityStage?: string }> {
  return npcIds.map((id) => {
    const card: { id: string; name: string; persona?: string; affinityStage?: string } = {
      id,
      name: CHARACTERS[id]?.name ?? id,
      persona: CHARACTERS[id]?.persona,
    };
    // 仅希孟有好感线（MVP）：带好感档让 LLM 写出"关系在变深"的态度
    if (id === 'ximeng' && relationships?.[id]) {
      card.affinityStage = RELATIONSHIP_STAGE_LABELS[relationships[id].stage];
    }
    return card;
  });
}

const skillNames: Record<string, string> = {
  landscape: '山水',
  figure: '人物',
  architecture: '界画',
};

/** 场景事实清单：引擎已结算的结果，LLM 只可改写不可增删 */
export function buildSceneFacts(prevState: GameState, action: GameAction, locationId: LocationId): string[] {
  const facts: string[] = [`地点：${LOCATIONS[locationId]?.name ?? '院堂'}`];

  if (action.type === 'keep_appointment') {
    const hook = (prevState.pendingHooks ?? []).find((h) => h.id === action.hookId);
    facts.push(`今日玩家来赴前约：${hook?.summary ?? '一桩约定'}`);
    return facts;
  }

  if (action.type === 'wander') {
    // 希孟画室（好感≥知己解锁）：专属场景，希孟引玩家入画室、示那卷未完的大画（2026-06-25）
    if (locationId === 'ximeng_studio') {
      facts.push('玩家来到希孟画室——这是交情到了知己才得入的地方');
      facts.push('希孟在此，案上是他那卷迟迟未完的大画（青绿山水，水至画角、云从山背升起）');
      facts.push('此处只宜两人静处论画、吐露心迹，不必再客套');
      return facts;
    }
    facts.push('玩家在此处信步，四下看看，并无定事');
    // 院堂只有晨课才上课；上午/下午在院堂是课后闲憩，明确告知 LLM 勿演绎课堂内容（2026-06-18）
    if (locationId === 'hall' && prevState.time.timeSlot !== 'morning_class') {
      facts.push('此刻非晨课时分，院堂里并无授课，玩家只是在课后的院中走动歇息');
    }
    return facts;
  }

  if (action.type === 'follow_suggestion') {
    facts.push(`玩家循着上一场的念头来到此处：${action.intent ?? '想看看接下来会怎样'}`);
    return facts;
  }

  if (action.type === 'attend_class') {
    const courseId = prevState.curriculum?.[prevState.time.day];
    const course = courseId ? COURSES[courseId] : undefined;
    if (course) {
      if (course.freeChoice && action.skillId) {
        // 自由临摹（2026-06-25 场景化）：按所选场景给不同事实，无人授课、玩家自主写生/临帖
        const where: Record<string, string> = {
          garden: '今晨自由临摹，玩家到后花园对景写生（山水），无人授课',
          market: '今晨自由临摹，玩家到街市写生市井人物，无人授课',
          hall: '今晨自由临摹，玩家在院堂临摹古帖，无人授课，李唐偶尔巡看',
        };
        facts.push(where[action.locationId ?? 'hall'] ?? where.hall);
        facts.push(`所习画科：${skillNames[action.skillId]}，画技有细微长进`);
      } else {
        if (course.teacher) {
          const teacherName = CHARACTERS[course.teacher]?.name ?? '李唐';
          facts.push(`晨课：${course.label}（${teacherName}授课）`);
        } else {
          facts.push(`晨课：${course.label}（无人授课，总教习李唐偶尔巡看）`);
        }
        if (course.skillBonus) facts.push('画技有细微长进');
        if (course.knowledgeBonus) facts.push('对画理的见识深了一层');
      }
    }
    if (prevState.time.day === 1) facts.push('今日入院点卯，领到画院例钱五文');
    return facts;
  }

  if (action.type === 'practice_skill' && action.skillId) {
    facts.push(`玩家在此修习${skillNames[action.skillId]}，笔意有所长进`);
    if (prevState.stats.mood >= 8) facts.push('心情正好，落笔比平日更准');
    if (prevState.stats.mood <= 3) facts.push('心绪不宁，几笔总归画歪');
    return facts;
  }

  if (action.type === 'activity' && action.activityId) {
    const card = ACTIVITY_BY_ID[action.activityId];
    if (card) {
      facts.push(`玩家选择了「${card.label}」`);
      if (card.moneyCost) facts.push(`花了${card.moneyCost}文钱`);
      if (card.effects?.mood && card.effects.mood > 0) facts.push('心情舒展了些');
      if (card.effects?.knowledge) facts.push('见识增长了些');
      if (card.staminaGain) facts.push('歇息后气力恢复了些');
    }
  }

  return facts;
}

/** 约定只能约在必开放的寻常去处（剔除 secret_archive/ximeng_studio，防约在未解锁地点） */
const HOOK_ALLOWED_LOCATIONS = new Set<LocationId>([
  'hall', 'library', 'garden', 'market', 'dining_hall', 'dormitory',
]);

/** clamp 产出的约定草稿（引擎再补 id/status） */
export type PendingHookDraft = Omit<PendingHook, 'id' | 'status'>;

/**
 * 引擎裁决 LLM 建议的小幅状态变化（拍板上限）：
 * 心情 ±1；好感每人 -2~+3 且仅限在场 NPC；线索仅限白名单。
 * 另裁决剧情约定 pendingHook（day 越界/地点非法/空文案则整条丢弃），单独返回（非 ValidatedStatePatch 字段）。
 */
export function clampSceneSuggestedPatch(
  suggested: SceneSuggestedPatch | undefined,
  npcsPresent: NpcId[],
  allowedClueIds: string[],
  currentDay: number,
): { patch: ValidatedStatePatch; hook?: PendingHookDraft } {
  const patch: ValidatedStatePatch = {};
  if (!suggested) return { patch };

  if (typeof suggested.moodDelta === 'number' && suggested.moodDelta !== 0) {
    patch.moodDelta = Math.max(-1, Math.min(1, Math.round(suggested.moodDelta)));
  }

  if (suggested.affinityDeltaByNpc) {
    const presentSet = new Set<string>(npcsPresent);
    const deltas: Partial<Record<NpcId, number>> = {};
    for (const [npcId, delta] of Object.entries(suggested.affinityDeltaByNpc)) {
      if (!presentSet.has(npcId) || typeof delta !== 'number' || delta === 0) continue;
      deltas[npcId as NpcId] = Math.max(-2, Math.min(3, Math.round(delta)));
    }
    if (Object.keys(deltas).length > 0) patch.relationshipDeltaByNpc = deltas;
  }

  if (suggested.clueIds?.length) {
    const allowed = new Set(allowedClueIds);
    const clues = suggested.clueIds.filter((id) => allowed.has(id));
    if (clues.length > 0) patch.cluesGranted = clues;
  }

  // 剧情约定裁决：语义错（日越界/地点非法/空文案）宁可整条丢弃，不 clamp 到合法值
  const hook = clampPendingHook(suggested.pendingHook, currentDay);
  return hook ? { patch, hook } : { patch };
}

function clampPendingHook(
  raw: SceneSuggestedPatch['pendingHook'],
  currentDay: number,
): PendingHookDraft | undefined {
  if (!raw) return undefined;
  if (!Number.isInteger(raw.day) || raw.day <= currentDay || raw.day > 7) return undefined;
  if (!HOOK_ALLOWED_LOCATIONS.has(raw.locationId)) return undefined;
  const label = raw.label?.trim().slice(0, 12) ?? '';
  const summary = raw.summary?.trim().slice(0, 50) ?? '';
  if (!label || !summary) return undefined;
  const npcId = raw.npcId && ['ximeng', 'zeduan', 'litang', 'song'].includes(raw.npcId) ? raw.npcId : undefined;
  return { day: raw.day, locationId: raw.locationId, npcId, label, summary, createdDay: currentDay };
}

/** 推荐行动（2026-06-17）：裁决后的即时下一步，渲染为推荐行动签 */
export type ValidatedSuggestedAction = { label: string; locationId: LocationId; summary: string; npcId?: NpcId };

/**
 * 裁决 LLM 产出的推荐行动（复用 clampPendingHook 思路）：
 * 地点须已解锁（未解锁剔除，防指向去不了的地方）、label≤12/summary≤50 截断、npcId 白名单、最多 3 个。
 */
export function clampSuggestedActions(
  raw: SceneSuggestedAction[] | undefined,
  unlockedLocations: LocationId[],
): ValidatedSuggestedAction[] {
  if (!raw?.length) return [];
  const allowed = new Set(unlockedLocations);
  return raw
    .filter((a) => a && allowed.has(a.locationId))
    .map((a) => ({
      label: a.label?.trim().slice(0, 12) ?? '',
      locationId: a.locationId,
      summary: a.summary?.trim().slice(0, 50) ?? '',
      npcId: a.npcId && ['ximeng', 'zeduan', 'litang', 'song'].includes(a.npcId) ? a.npcId : undefined,
    }))
    .filter((a) => a.label && a.summary)
    .slice(0, 3);
}

/** 记忆白名单（引擎判定）：memoryNote 非空且 ≤50 字才入剧情账本 */
export function sanitizeMemoryNote(memoryNote: string | undefined): string | null {
  const trimmed = memoryNote?.trim() ?? '';
  if (trimmed.length === 0 || trimmed.length > 50) return null;
  return trimmed;
}

const TIME_SLOT_LABELS: Record<GameState['time']['timeSlot'], string> = {
  morning_class: '晨课',
  forenoon: '上午',
  noon: '午间',
  afternoon: '下午',
  evening: '晚间',
};

/** 今日安排摘要（治剧情发散）：课表 + 当前时段 + 明日去向，供写作器自然提及 */
export function buildTodayPlan(state: GameState): string | undefined {
  const parts: string[] = [];
  if (state.time.day >= 7) {
    parts.push('今日为丹青试之日');
  } else {
    const courseId = state.curriculum?.[state.time.day];
    if (courseId) {
      const course = COURSES[courseId];
      const teacherName = course.teacher ? CHARACTERS[course.teacher]?.name : undefined;
      parts.push(`今日晨课：${course.label}${teacherName ? `（${teacherName}授课）` : ''}`);
    }
  }
  parts.push(`现下时段：${TIME_SLOT_LABELS[state.time.timeSlot]}`);
  if (state.time.day + 1 === 7) {
    parts.push('明日便是丹青试');
  } else {
    const tomorrowCourseId = state.curriculum?.[state.time.day + 1];
    if (tomorrowCourseId) parts.push(`明日晨课：${COURSES[tomorrowCourseId].label}`);
  }
  return parts.length > 0 ? parts.join('；') : undefined;
}

/** 取文本末尾片段（80字）作锚点；空则 undefined。供「上一场衔接」与「地点线程」复用 */
export function buildEnding(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 80 ? trimmed.slice(-80) : trimmed;
}

/**
 * 上一场结尾锚点（治割裂，2026-06-16 改读 lastSceneEnding）：
 * 只读 LLM 成长/叙事场景写的 lastSceneEnding，机械行动的模板句不会污染它。
 */
export function buildPrevSceneEnding(state: GameState): string | undefined {
  return buildEnding(state.lastSceneEnding);
}

/**
 * 当日小结（2026-06-16，方案 b 拼 ledger 不调 LLM）：筛当日 storyLedger 各条摘要拼接，
 * 供次日晨课 LLM 承接昨日。当日无条目返回 null。须在 timeAdvance（day+1）之前用当日 state 调用。
 */
export function buildDailySummary(state: GameState): SummaryMemoryEntry | null {
  const day = state.time.day;
  const entries = state.memory.storyLedger.filter((e) => e.day === day);
  if (entries.length === 0) return null;
  const summary = entries
    .map((e) => e.summary?.trim())
    .filter((s): s is string => Boolean(s))
    .join('；')
    .slice(0, 300);
  if (!summary) return null;
  const npcIds = Array.from(new Set(entries.map((e) => e.npcId).filter((n): n is NpcId => Boolean(n))));
  const clueIds = Array.from(new Set(entries.flatMap((e) => e.gainedClueIds ?? [])));
  return {
    id: `summary-d${day}-${entries.length}`,
    kind: 'daily',
    day,
    summary,
    relatedNpcIds: npcIds,
    relatedClueIds: clueIds,
  };
}
