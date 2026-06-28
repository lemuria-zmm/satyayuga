import { HAIYOU_PAINTING } from '../content/paintings';
import { LOCATIONS } from '../content/locations';
import { COURSES } from '../content/courses';
import { ACTIVITY_BY_ID, ALL_ACTIVITIES } from '../content/activities';
import type { ActivityCard } from '../content/activities';
import { DAILY_SKILL_CAP, DAILY_KNOWLEDGE_CAP } from '../types/core';
import { applyValidatedStatePatch } from './statePatches';
import { buildDailySummary, isLlmScene } from './sceneEngine';
import { commitMemoryPatch } from '../memory/writer';
import type { ActionResult, GameAction, GameState, LocationId, SkillId, ValidatedStatePatch } from '../types';

const skillNames: Record<SkillId, string> = {
  landscape: '山水',
  figure: '人物',
  architecture: '界画',
};

const moveNarratives: Record<LocationId, string> = {
  hall: '你穿过回廊，回到院堂。案上笔墨已备好。',
  library: '你推开书房门，书册堆叠如山，墨香沉静。',
  garden: '你绕过影壁来到后花园。竹影轻摇，水池尽头有风吹过。',
  market: '你出了院门，走入京城街市。叫卖声此起彼伏。',
  dining_hall: '你来到膳堂。长桌已陈，饭菜香气混着人语。',
  dormitory: '你回到宿舍。床榻铺得齐整，案上一盏灯还未点。',
  secret_archive: '你推开秘阁重门。灯影幽微，画卷气息古旧。',
  ximeng_studio: '你来到希孟画室门前。门半掩，青绿色的光从缝隙里透出。',
};

const pickNarrative = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)];

/** 叙事时段（上午/下午）每时段自动开场上限（2026-06-18 A+C）：满此数后停止自动开场；报时钟收尾签演完≥1场即亮 */
export const MAX_SLOT_SCENES = 3;

/** 报时钟收尾签（2026-06-18）：叙事时段唯一的时段推进出口（各处可见，locationId 取当前地点）。
 * 复用 type:'rest'（timeAdvance:true），id 'chime' 区分文案。演完 ≥1 场即可点；满 MAX_SLOT_SCENES 时 UI 高亮强调。 */
function chimeAction(state: GameState): GameAction {
  return {
    id: 'chime',
    type: 'rest',
    label: '时辰已到·往下一刻',
    locationId: state.currentLocation,
    staminaCost: 0,
  };
}

/**
 * 沙盒时段（2026-06-15 第一日流程重构）：午间/晚间为自由探索沙盒——机械活动不推进时间，
 * 靠体力/钱文为闸，玩够点收尾出口（午间「歇晌」/ 晚间「就寝」）才进下一时段。
 * 叙事时段（晨课/上午/下午）则一时段一行动，成长行动做完即推进。
 */
export function isSandboxSlot(slot: GameState['time']['timeSlot']): boolean {
  return slot === 'noon' || slot === 'evening';
}

/**
 * 出身持续优势（2026-06-12 拍板，三出身有持续钩子）：
 * - 商贾之家：市井消费 8 折（floor，至少 1 文）；
 * - 耕读之家：学识类收益 +1；
 * - 匠作之家：界画成长 +1。
 * 官宦/流民保留一次性初始修正（见 initialState.ORIGIN_EFFECTS），无持续钩子。
 */
export function effectiveMoneyCost(cost: number | undefined, origin: GameState['player']['origin']): number | undefined {
  if (!cost) return cost;
  if (origin === 'merchant') return Math.max(1, Math.floor(cost * 0.8));
  return cost;
}

/**
 * 出身持续优势 + 买画材 buff，调整本次成长收益（就地改 patch）：
 * - 耕读：本次本有学识收益时 +1；
 * - 匠作：本次本有界画收益时 +1；
 * - 买画材 buff（art_supplies_ready）：成长类行动下,技能(优先)或学识 +1，生效后落旗标清除。
 */
function applyGrowthBonuses(state: GameState, patch: ValidatedStatePatch, track: 'mechanical' | 'growth' | 'narrative'): void {
  const origin = state.player.origin;
  if (origin === 'farming_scholar' && patch.knowledgeDelta && patch.knowledgeDelta > 0) {
    patch.knowledgeDelta += 1;
  }
  if (origin === 'artisan' && patch.skillDelta?.architecture && patch.skillDelta.architecture > 0) {
    patch.skillDelta = { ...patch.skillDelta, architecture: patch.skillDelta.architecture + 1 };
  }
  if (track === 'growth' && state.progress.flags.art_supplies_ready) {
    let applied = false;
    if (patch.skillDelta) {
      const firstSkill = (Object.keys(patch.skillDelta) as SkillId[]).find((s) => (patch.skillDelta?.[s] ?? 0) > 0);
      if (firstSkill) {
        patch.skillDelta = { ...patch.skillDelta, [firstSkill]: (patch.skillDelta[firstSkill] ?? 0) + 1 };
        applied = true;
      }
    }
    if (!applied && patch.knowledgeDelta && patch.knowledgeDelta > 0) {
      patch.knowledgeDelta += 1;
      applied = true;
    }
    if (applied) patch.flagsSet = { ...patch.flagsSet, art_supplies_ready: false };
  }
}

/**
 * 修习收益公式（v2 设计文档 §3.2）：
 * 基础 2，心情≥8 +1，心情≤3 -1，当日晨课同科 +1。
 */
export function practiceGain(state: GameState, skillId: SkillId): number {
  let gain = 2;
  if (state.stats.mood >= 8) gain += 1;
  if (state.stats.mood <= 3) gain -= 1;
  const todayCourse = state.curriculum?.[state.time.day] ? COURSES[state.curriculum[state.time.day]] : undefined;
  if (todayCourse?.skillBonus && skillId in todayCourse.skillBonus) gain += 1;
  return Math.max(1, gain);
}

/**
 * 沙盒练习基础收益（2026-06-27）：本科（=玩家 styleOrigin）每次 +2，副技能 +1；学识固定 +1。
 * 出身持续优势 / 买画材 buff 由 applyGrowthBonuses 另行叠加；每日封顶在 resolvePractice 裁剪。
 */
export function computePracticeGain(state: GameState, target: SkillId | 'knowledge', baseOverride?: number): number {
  if (baseOverride !== undefined) return baseOverride;
  if (target === 'knowledge') return 1;
  return target === state.player.styleOrigin ? 2 : 1;
}

/**
 * 心情对成长效率的修正（2026-06-28）：心情≥8 → +1，≤3 → -1，其余 0。
 * 作用于练习签与晨课的技能&学识正增长（让娱乐/饮食的心情收益真正反哺成长，低心情则拖慢）。
 * 调用方负责 clamp（不把收益压到负数、不在 0 收益上倒扣）。
 */
export function moodGrowthModifier(state: GameState): number {
  if (state.stats.mood >= 8) return 1;
  if (state.stats.mood <= 3) return -1;
  return 0;
}

/**
 * 心情过低锁练习签（2026-06-28）：心情≤3 时练习类成长行动被锁（点不了，UI 置灰「心绪不宁」），
 * 逼玩家先用同时段的饮食/娱乐调心情。**晨课不锁**（morning_class 时段无调心情手段，锁了卡死；晨课保留收益-1 软惩罚）。
 */
export function isPracticeMoodLocked(state: GameState, action: GameAction): boolean {
  return action.type === 'activity'
    && ACTIVITY_BY_ID[action.activityId ?? '']?.track === 'practice'
    && state.stats.mood <= 3;
}

/**
 * 沙盒练习结算（2026-06-27）：track:'practice' 的活动卡。
 * 引擎确定性给技能/学识（不信 LLM 自报）+ 扣体力 + 不推进时段（沙盒）；LLM 只负责沉浸文（App.runPractice）。
 * 心情修正（2026-06-28）：≥8 收益+1 / ≤3 收益-1（clamp≥1，练了总有一点长进）。
 * 每日封顶：技能 DAILY_SKILL_CAP=4、学识 DAILY_KNOWLEDGE_CAP=3，当日正增长累计满后裁剪为 0（仍出文）。
 */
function resolvePractice(state: GameState, action: GameAction): { patch: ValidatedStatePatch; text: string } {
  const card = ACTIVITY_BY_ID[action.activityId ?? ''];
  if (!card?.practiceSkill) {
    // 防御：练习卡缺 practiceSkill（不应发生）——只扣体力出兜底文，不给数值
    return { patch: { staminaDelta: -action.staminaCost, timeAdvance: false }, text: '你练了半日，却没什么长进。' };
  }

  const patch: ValidatedStatePatch = {
    staminaDelta: -card.staminaCost,
    timeAdvance: false, // 沙盒：不推进时段
    moodDelta: -1, // 用功消耗心气（2026-06-28）：练习耗心情-1，靠饮食/娱乐回补，逼劳逸平衡
  };
  const target = card.practiceSkill;
  const mood = moodGrowthModifier(state);
  // 心情修正：基础收益 + mood，clamp ≥1（练了至少长一点，不因心情低彻底白练；锁练习已挡住心情≤3 的常态触发，此处仅兜底）
  const gain = Math.max(1, computePracticeGain(state, target, card.practiceAmount) + mood);
  if (target === 'knowledge') {
    patch.knowledgeDelta = gain;
  } else {
    patch.skillDelta = { [target]: gain };
  }

  // 出身持续优势（耕读学识+1 / 匠作界画+1）+ 买画材 buff：与晨课同样吃 growth 加成
  applyGrowthBonuses(state, patch, 'growth');

  // 每日技能封顶：三画技正增长之和受 DAILY_SKILL_CAP - skillGainedToday 约束
  if (patch.skillDelta) {
    const remaining = Math.max(0, DAILY_SKILL_CAP - state.time.skillGainedToday);
    let applied = 0;
    const capped: Partial<Record<SkillId, number>> = {};
    for (const [skillId, delta] of Object.entries(patch.skillDelta) as [SkillId, number][]) {
      if (delta > 0) {
        const room = Math.max(0, remaining - applied);
        const granted = Math.min(delta, room);
        applied += granted;
        capped[skillId] = granted;
      } else {
        capped[skillId] = delta;
      }
    }
    patch.skillDelta = capped;
    if (applied > 0) patch.skillGainedTodayDelta = applied;
  }

  // 每日学识封顶（2026-06-28）：练习签学识正增长受 DAILY_KNOWLEDGE_CAP - knowledgeGainedToday 约束
  if (patch.knowledgeDelta && patch.knowledgeDelta > 0) {
    const room = Math.max(0, DAILY_KNOWLEDGE_CAP - state.time.knowledgeGainedToday);
    const granted = Math.min(patch.knowledgeDelta, room);
    patch.knowledgeDelta = granted;
    if (granted > 0) patch.knowledgeGainedTodayDelta = granted;
  }

  return { patch, text: pickNarrative(card.narratives) };
}

/**
 * 温书自测奖励（2026-06-28）：晚间宿舍小测答得好时给的小额加成。
 * 与练习签同口径——心情修正 + 每日封顶（技能 DAILY_SKILL_CAP / 学识 DAILY_KNOWLEDGE_CAP），
 * 防止小测成为绕过封顶的刷点后门。base 默认 1。target 为技能或 'knowledge'。
 * 返回 patch 片段（skillDelta/knowledgeDelta + 对应 GainedTodayDelta），封顶满则返回空（不涨）。
 */
export function buildQuickExamReward(
  state: GameState,
  target: SkillId | 'knowledge',
  base = 1,
): ValidatedStatePatch {
  const gain = Math.max(0, base + moodGrowthModifier(state));
  if (gain <= 0) return {};
  if (target === 'knowledge') {
    const room = Math.max(0, DAILY_KNOWLEDGE_CAP - state.time.knowledgeGainedToday);
    const granted = Math.min(gain, room);
    return granted > 0 ? { knowledgeDelta: granted, knowledgeGainedTodayDelta: granted } : {};
  }
  const room = Math.max(0, DAILY_SKILL_CAP - state.time.skillGainedToday);
  const granted = Math.min(gain, room);
  return granted > 0 ? { skillDelta: { [target]: granted }, skillGainedTodayDelta: granted } : {};
}


function activityToAction(card: ActivityCard, origin: GameState['player']['origin']): GameAction {
  return {
    id: `activity-${card.id}`,
    type: 'activity',
    label: card.label,
    activityId: card.id,
    locationId: card.locationId,
    staminaCost: card.staminaCost,
    // 商贾 8 折在生成行动时即体现，扣款/可负担过滤/UI 显示统一用此折后价
    moneyCost: effectiveMoneyCost(card.moneyCost, origin),
  };
}

/** 晨课时段行动：第7日固定丹青试 / 自由临摹三选一 / 其余按玩家课表；上完一场后报时钟接管推进上午 */
function getMorningClassActions(state: GameState): GameAction[] {
  if (state.time.day >= 7) {
    return [{ id: 'take-first-exam', type: 'take_exam', label: '入场，应丹青试', locationId: 'hall', staminaCost: 3 }];
  }

  // 晨课已上过一场（2026-06-18）：晨课是单次课业，上完即由报时钟收尾签推进上午（不可反复上课刷体力/卡时段）
  if (state.time.slotSceneCount >= 1) {
    return [chimeAction(state)];
  }

  const courseId = state.curriculum?.[state.time.day];
  const course = courseId ? COURSES[courseId] : undefined;
  if (!course) return [];

  if (course.freeChoice) {
    // 自由临摹（2026-06-25 重做）：改"选场景，场景定技能"——院堂临古帖(本科+1)/后花园写生(山水+1)/街市写生(人物+1)。
    // 各场景不同 LLM 叙事与背景图。本科由玩家画风决定。
    const major = state.player.styleOrigin;
    return [
      {
        id: 'free-copy-hall',
        type: 'attend_class' as const,
        label: `临古帖·${skillNames[major]}`,
        skillId: major,
        locationId: 'hall' as const,
        staminaCost: 1,
      },
      {
        id: 'free-copy-garden',
        type: 'attend_class' as const,
        label: '后花园写生',
        skillId: 'landscape' as const,
        locationId: 'garden' as const,
        staminaCost: 1,
      },
      {
        id: 'free-copy-market',
        type: 'attend_class' as const,
        label: '街市写生',
        skillId: 'figure' as const,
        locationId: 'market' as const,
        staminaCost: 1,
      },
    ];
  }

  return [
    {
      id: `attend-class-day${state.time.day}`,
      type: 'attend_class',
      label: `晨课·${course.label}`,
      locationId: course.id === 'theory_class' ? 'library' : 'hall',
      staminaCost: 1,
    },
  ];
}

/** 当前时段的活动卡行动（2026-06-11 拍板：修习三签已去除，画技成长走晨课与活动附带收益） */
function getActivitySlotActions(state: GameState, slot: GameState['time']['timeSlot']): GameAction[] {
  return ALL_ACTIVITIES.filter(
    // 学识门槛（2026-06-12 Gate①）：学识不足的卡（如书房深查 ≥10）不出现
    (card) => card.timeSlots.includes(slot) && state.stats.knowledge >= (card.minKnowledge ?? 0),
  ).map((card) => activityToAction(card, state.player.origin));
}

/** 上午/下午行动：活动卡 + 秘阁（解锁后）+ 报时钟收尾签（演完 ≥1 场即可点，满 3 场 UI 高亮） */
function getDaySlotActions(state: GameState): GameAction[] {
  const actions = getActivitySlotActions(state, state.time.timeSlot);

  if (state.progress.flags.archiveUnlocked && !state.progress.flags.haiyouFirstInterpreted) {
    actions.unshift({
      id: 'solve-haiyou',
      type: 'solve_puzzle',
      label: '秘阁观《骸游图》',
      paintingId: HAIYOU_PAINTING.id,
      locationId: 'secret_archive',
      staminaCost: 1,
    });
  }

  // 报时钟收尾签（2026-06-18 A+C 修正）：演完 ≥1 场即可点，玩家随时有推进出口（治"去别处后卡死跳不出院堂"）；
  // 自动开场仍上限 MAX_SLOT_SCENES，满后 UI 高亮强调"该收了"。
  if (state.time.slotSceneCount >= 1) {
    actions.push(chimeAction(state));
  }

  return actions;
}

/** 终章（第7日晚间后时间冻结）：只保留秘阁与自由走动 */
function getFinalChapterActions(state: GameState): GameAction[] {
  const actions: GameAction[] = [];
  if (state.progress.flags.archiveUnlocked && !state.progress.flags.haiyouFirstInterpreted) {
    actions.push({
      id: 'solve-haiyou',
      type: 'solve_puzzle',
      label: '秘阁观《骸游图》',
      paintingId: HAIYOU_PAINTING.id,
      locationId: 'secret_archive',
      staminaCost: 0,
    });
  }
  return actions;
}

function getSlotActions(state: GameState): GameAction[] {
  if (state.progress.flags.finalChapter) return getFinalChapterActions(state);

  switch (state.time.timeSlot) {
    case 'morning_class':
      return getMorningClassActions(state);
    case 'noon':
      // 午间沙盒·饮食（2026-06-15）：机械活动不推进时间；「歇晌」收尾签仅在食堂出现，别处需走回食堂
      return [
        ...getActivitySlotActions(state, 'noon'),
        ...(state.currentLocation === 'dining_hall'
          ? [{ id: 'rest', type: 'rest' as const, label: '用罢午膳·歇晌', locationId: 'dining_hall' as const, staminaCost: 0 }]
          : []),
      ];
    case 'evening':
      // 晚间沙盒·娱乐：不限次数（不推进时间）；「就寝」收尾签仅在宿舍出现，别处需走回宿舍（2026-06-11/06-15）
      // 温书自测（2026-06-28）：晚间回宿舍可点「温书自测」（day<7、当晚未测），夜读自省 1 题；放就寝签之前
      return [
        ...getActivitySlotActions(state, 'evening'),
        ...(state.currentLocation === 'dormitory' &&
        state.time.day < state.time.maxDay &&
        !state.progress.flags[`quick_exam_d${state.time.day}`]
          ? [{ id: 'quick-exam', type: 'quick_exam' as const, label: '温书自测', locationId: 'dormitory' as const, staminaCost: 1 }]
          : []),
        ...(state.currentLocation === 'dormitory'
          ? [{ id: 'sleep', type: 'sleep' as const, label: '就寝', locationId: 'dormitory' as const, staminaCost: 0 }]
          : []),
      ];
    case 'forenoon':
    case 'afternoon':
      return getDaySlotActions(state);
  }
}

/** 自由走动：不消耗体力、不推进时间；晨课锁院堂（不可走动）；宿舍仅晚间开启；晚间院堂/食堂歇业（2026-06-11/06-15 拍板） */
function getMoveActions(state: GameState): GameAction[] {
  // 晨课期间锁定院堂——上课不能去别处（2026-06-15）；晨课 attend_class 各处可见、点击自动前往的逻辑不受影响
  if (state.time.timeSlot === 'morning_class') return [];
  const isEvening = state.time.timeSlot === 'evening';
  // 晚间院堂、食堂歇业（2026-06-15）：晚间只逛市井/后花园/书房/宿舍
  const eveningClosed: LocationId[] = ['hall', 'dining_hall'];
  return state.progress.unlockedLocations
    .filter(
      (locId) =>
        locId !== state.currentLocation &&
        (locId !== 'dormitory' || isEvening) &&
        !(isEvening && eveningClosed.includes(locId)),
    )
    .map((locId) => ({
      id: `move-${locId}`,
      type: 'move_to' as const,
      label: `前往${LOCATIONS[locId].name}`,
      locationId: locId,
      staminaCost: 0,
    }));
}

/** 剧情约定触发签（2026-06-16）：本日本地点有 pending 约定时，注入专属赴约签（staminaCost 0，不被体力卡死） */
function getHookActions(state: GameState): GameAction[] {
  // 只在叙事时段（上午/下午）注入，避免沙盒时段赴约导致跳段；晨课锁地点不注入
  const slot = state.time.timeSlot;
  if (slot !== 'forenoon' && slot !== 'afternoon') return [];
  return (state.pendingHooks ?? [])
    .filter((h) => h.status === 'pending' && h.day === state.time.day && h.locationId === state.currentLocation)
    .map((h) => ({
      id: `hook-${h.id}`,
      type: 'keep_appointment' as const,
      label: h.label,
      locationId: h.locationId,
      hookId: h.id,
      staminaCost: 0,
    }));
}

/**
 * 空洞地点环境签（2026-06-16）：叙事时段当前地点无成长签、且无 pending 约定时，注入零成本「信步走走」。
 * 注意：这是 **growth 签 → 调 LLM 写环境/偶遇场景**（与 2026-06-15 已废弃的 mechanical 兜底签 look_around 完全不同——
 * 那个不调 LLM 只弹空提示。本签是有内容的环境场景，亦是将来 NPC 偶遇系统的挂载点）。
 */
function getAmbienceAction(state: GameState): GameAction[] {
  const slot = state.time.timeSlot;
  if (slot !== 'forenoon' && slot !== 'afternoon') return [];
  // 演满上限后不再出「信步走走」（与自动开场同 MAX_SLOT_SCENES 上限）：只剩报时钟推进时段（2026-06-18）
  if (state.time.slotSceneCount >= MAX_SLOT_SCENES) return [];
  const hasGrowth = getSlotActions(state).some(
    (a) => a.locationId === state.currentLocation && isLlmScene(a),
  );
  if (hasGrowth) return [];
  const hasHook = (state.pendingHooks ?? []).some(
    (h) => h.status === 'pending' && h.day === state.time.day && h.locationId === state.currentLocation,
  );
  if (hasHook) return [];
  return [{ id: `wander-${state.currentLocation}`, type: 'wander', label: '信步走走', locationId: state.currentLocation, staminaCost: 0 }];
}

export function getAvailableActions(state: GameState): GameAction[] {
  // 行动签只显示当前地点的（2026-06-11 拍板）；晨课/丹青试各处可见点击自动前往。
  // 就寝/歇晌已绑专属地点（2026-06-15），靠 locationId===current 天然过滤，不再走白名单。
  // 钱不足的签不再过滤掉（2026-06-25）：保留在列表里由 UI 置灰显示「需X文」，避免餐签凭空消失让玩家以为 bug（设计§3.4）。
  const slotActions = getSlotActions(state).filter(
    (action) =>
      state.time.stamina >= action.staminaCost &&
      (action.type === 'attend_class' ||
        action.type === 'take_exam' ||
        action.locationId === state.currentLocation),
  );
  // 事件驱动（2026-06-16）：赴约签（hook 优先）+ 空洞地点环境签（无成长签且无 hook 时）。
  return [...slotActions, ...getHookActions(state), ...getAmbienceAction(state), ...getMoveActions(state)];
}

/** 行动是否买得起（2026-06-25）：UI 据此置灰钱不足的签并显示所需钱数 */
export function isActionAffordable(state: GameState, action: GameAction): boolean {
  return state.stats.money >= (action.moneyCost ?? 0);
}

function resolveActivity(state: GameState, action: GameAction): { patch: ValidatedStatePatch; text: string } {
  const card = ACTIVITY_BY_ID[action.activityId ?? ''];
  const isSandbox = isSandboxSlot(state.time.timeSlot);
  const isEvening = state.time.timeSlot === 'evening';
  if (!card) {
    return {
      patch: { timeAdvance: !isSandbox },
      text: isSandbox ? '这件事不知怎么没做成。时辰还早。' : '这件事不知怎么没做成。日影照旧往前挪。',
    };
  }

  // 沙盒练习卡（2026-06-27）：独立结算（确定性技能 + 封顶 + 不推时段）；LLM 沉浸文由 App.runPractice 单独调
  if (card.track === 'practice') {
    return resolvePractice(state, action);
  }

  const patch: ValidatedStatePatch = {
    staminaDelta: (card.staminaGain ?? 0) - card.staminaCost,
    // 沙盒时段（午/晚）机械活动不推进时间（不限次数，点收尾出口才进下一时段）；叙事时段做完即推进
    timeAdvance: !isSandbox,
  };
  const flagsSet: Record<string, boolean> = {};
  // 晚间娱乐旗标（就寝判早歇用）：仅晚间设；午间沙盒不需要
  if (isEvening) flagsSet[`evening_fun_d${state.time.day}`] = true;
  if (card.setsFlag) flagsSet[card.setsFlag] = true;
  if (Object.keys(flagsSet).length > 0) patch.flagsSet = flagsSet;
  // 扣款用 action.moneyCost（已含商贾 8 折）；card.moneyCost 为原价
  if (action.moneyCost) patch.moneyDelta = -action.moneyCost;
  if (card.effects?.skills) patch.skillDelta = card.effects.skills;
  if (card.effects?.mood) patch.moodDelta = card.effects.mood;
  if (card.effects?.knowledge) patch.knowledgeDelta = card.effects.knowledge;
  if (card.nextDayStaminaBonus) patch.nextDayStaminaBonus = card.nextDayStaminaBonus;
  // 出身持续优势 + 买画材 buff（买画材本身非成长类，不会消费自己的 buff）
  applyGrowthBonuses(state, patch, card.track ?? 'mechanical');

  return { patch, text: pickNarrative(card.narratives) };
}

function resolveMorningClass(state: GameState, action: GameAction): { patch: ValidatedStatePatch; text: string } {
  const courseId = state.curriculum?.[state.time.day];
  const course = courseId ? COURSES[courseId] : undefined;
  const patch: ValidatedStatePatch = {
    staminaDelta: -action.staminaCost,
    timeAdvance: true,
    moodDelta: -1, // 用功消耗心气（2026-06-28）：晨课耗心情-1（与练习同），靠饮食/娱乐回补
  };
  let text = course?.narrative ?? '晨课如常。';

  if (course?.freeChoice && action.skillId) {
    patch.skillDelta = { [action.skillId]: 1 };
    // 场景化兜底文案（2026-06-25）：自由临摹按所选场景给不同模板（LLM 失败时用）
    const freeCopyText: Record<string, string> = {
      garden: '你携纸笔到后花园，对着池水竹影写生。山水的远近，在腕底一点点活了过来。',
      market: '你到街市支起小案，挑夫货郎来去皆入画。人物的活法，比临帖更扎实。',
      hall: '你在院堂铺开古帖临摹。无人指点，反而看清了自己的手。',
    };
    text = freeCopyText[action.locationId ?? 'hall'] ?? freeCopyText.hall;
  } else if (course) {
    if (course.skillBonus) patch.skillDelta = course.skillBonus;
    if (course.knowledgeBonus) patch.knowledgeDelta = course.knowledgeBonus;
  }

  // 心情修正（2026-06-28）：心情≥8 收益+1 / ≤3 收益-1（clamp≥1，上课总有一点长进）。
  // 晨课不受每日封顶约束（封顶仅练习签）；晨课不锁（morning_class 无调心情手段），低心情靠此软惩罚。
  const moodMod = moodGrowthModifier(state);
  if (moodMod !== 0) {
    if (patch.skillDelta) {
      patch.skillDelta = Object.fromEntries(
        Object.entries(patch.skillDelta).map(([k, v]) => [k, v > 0 ? Math.max(1, v + moodMod) : v]),
      ) as ValidatedStatePatch['skillDelta'];
    }
    if (patch.knowledgeDelta && patch.knowledgeDelta > 0) patch.knowledgeDelta = Math.max(1, patch.knowledgeDelta + moodMod);
  }

  // 晨课恒为成长类：应用出身持续优势（耕读学识+1/匠作界画+1）+ 买画材 buff
  applyGrowthBonuses(state, patch, 'growth');

  if (state.time.day === 1 && state.time.timeSlot === 'morning_class') {
    text += '\n（点卯例钱已入袋。）';
  }

  return { patch, text };
}

export function applyAction(state: GameState, action: GameAction): ActionResult {
  if (state.time.stamina < action.staminaCost) {
    return {
      renderedText: '你有些乏了。墨未落纸，手腕先沉。',
      nextState: state,
      statePatch: {},
      nextActions: getAvailableActions(state),
    };
  }

  if (action.moneyCost && state.stats.money < action.moneyCost) {
    return {
      renderedText: '你摸了摸袖中钱袋，铜钱不够。只好作罢。',
      nextState: state,
      statePatch: {},
      nextActions: getAvailableActions(state),
    };
  }

  // 心情过低锁练习（2026-06-28）：防御性兜底（UI 已置灰，此处防绕过）。点了 no-op 出提示，不结算不扣体力。
  if (isPracticeMoodLocked(state, action)) {
    return {
      renderedText: '你心绪不宁，对着纸笔半晌，一个字、一根线都落不下去。也许该先松快松快。',
      nextState: state,
      statePatch: {},
      nextActions: getAvailableActions(state),
    };
  }

  // 自由走动：不推进时间
  if (action.type === 'move_to' && action.locationId) {
    let text = moveNarratives[action.locationId] ?? `你来到了${LOCATIONS[action.locationId].name}。`;
    const withLocation: GameState = { ...structuredClone(state), currentLocation: action.locationId };
    withLocation.progress.flags[`visited_${action.locationId}`] = true;
    // 书房偶遇（2026-06-11 / 2026-06-26 兜底）：未遇希孟时走进书房**保证触发**首遇（不再 45% 漏过，
    // 治"没掷中就永远遇不到"）。首遇脚本是书房场景，故只在书房触发。
    if (action.locationId === 'library' && !state.progress.flags.metXimeng) {
      withLocation.progress.flags.ximeng_in_library = true;
    }
    const withMemory = commitMemoryPatch({
      state: withLocation,
      actionType: action.type,
      renderedText: text,
      locationId: action.locationId,
      memoryPatch: { storyLedgerNote: text },
    });
    return {
      renderedText: text,
      nextState: { ...withMemory, lastRenderedText: text },
      statePatch: {},
      nextActions: getAvailableActions(withMemory),
    };
  }

  let patch: ValidatedStatePatch = {
    staminaDelta: -action.staminaCost,
    timeAdvance: true,
  };
  let text = '';

  if (action.type === 'attend_class') {
    ({ patch, text } = resolveMorningClass(state, action));
  }

  if (action.type === 'activity') {
    ({ patch, text } = resolveActivity(state, action));
  }

  // 午间歇晌收段（2026-06-15）/ 叙事时段报时钟收段（2026-06-18）：本时段唯一推进出口
  if (action.type === 'rest') {
    text =
      action.id === 'chime'
        ? '院墙外的钟声不知敲了几响。你抬眼看了看天色，这一刻的事算是了了，该往下一刻去了。'
        : '你搁下碗筷，略歇了歇。日头偏过晌午，该收拾收拾，往下半日去了。';
  }

  // 赴约 / 信步 / 推荐行动（2026-06-16/17）：走 LLM 成长场景；此处只给兜底文案，正文由场景生成。叙事时段做完推进。
  if (action.type === 'keep_appointment') {
    text = '你依约前来。';
  }
  if (action.type === 'wander') {
    text = '你信步走着，留意四下的光景。';
  }
  if (action.type === 'follow_suggestion') {
    text = '你循着方才的念头，往那处去了。';
  }

  // 就寝收日（2026-06-11 拍板）：晚间唯一收日出口；当晚没玩娱乐 = 自动早歇，次日晨体力 +1
  if (action.type === 'sleep') {
    const hadEveningFun = Boolean(state.progress.flags[`evening_fun_d${state.time.day}`]);
    if (!hadEveningFun) {
      patch.nextDayStaminaBonus = 1;
      text = '你回宿舍早早吹了灯。养精蓄锐，明日的笔会替你谢今晚的觉。';
    } else {
      text = '玩兴散了，你回宿舍放下帐子。灯一灭，这一日才算真正过完。';
    }
  }

  if (action.type === 'practice_skill' && action.skillId) {
    const gain = practiceGain(state, action.skillId);
    patch.skillDelta = { [action.skillId]: gain };
    const locName = state.currentLocation === 'library' ? '书房' : '院堂';
    text = `你在${locName}临摹半日，${skillNames[action.skillId]}的笔意稳了一点。`;
    if (state.stats.mood >= 8) text += '心情正好，落笔比平日多了三分准头。';
    if (state.stats.mood <= 3) text += '只是心绪不宁，几笔总归画歪了。';
  }

  if (action.type === 'talk_to_npc') {
    patch.relationshipDeltaByNpc = { ximeng: 1 };
    patch.timeAdvance = false;
    text = '希孟听你问起水路，只说："水若走到尽头，画也不一定完。"';
  }

  if (action.type === 'take_exam') {
    patch.skillDelta = { [state.player.styleOrigin]: 2 };
    patch.flagsSet = {
      firstExamTaken: true,
      firstExamPassed: true,
      archiveUnlocked: true,
      noticedWaterEndCloudWeak: true,
    };
    patch.rankChange = 'painter_regular';
    patch.unlockedLocations = ['secret_archive'];
    text = '丹青试抽到一幅残画：水至画角而云起。你的答卷没有急着补桥。李唐批曰："尚知留白。"你晋为画正，秘阁入口由此开启。';
  }

  if (action.type === 'solve_puzzle') {
    patch.cluesGranted = ['clue_medicine_bottle', 'clue_child_posture', 'clue_blocked_waterway'];
    patch.flagsSet = {
      haiyouDiscovered: true,
      haiyouFirstInterpreted: true,
      noticedWaterEndCloudStrong: true,
      secondScrollTeased: true,
    };
    if (state.progress.flags.finalChapter) patch.timeAdvance = false;
    text =
      '《骸游图》里，药瓶、婴孩与旁观者的视线挤在一处。你注意到画角水路被摊位遮住。希孟没有称赞，只伸手压住画卷边角。另一只画匣松开一线：水尽处，云从山背升起。';
  }

  // LLM 叙事场景行动（晨课/成长活动/赴约/信步/推荐行动，2026-06-17 时段模型修正）：
  // 场景成品不自带时段推进——时段推进只在玩家点「去别处看看」时由 endScene 补一次。
  // 治"推荐行动原地耗时段、地点死锁"老问题：与沙盒"点收尾签才推进"心智统一。
  if (isLlmScene(action)) patch.timeAdvance = false;

  const patched = applyValidatedStatePatch(state, patch);
  // 当日小结（2026-06-16）：凡跨日（就寝 / 体力归零强制入夜）都把"将尽这一日"的 storyLedger 拼成小结，
  // 供次日晨课 LLM 承接。用 state（仍是当日）筛，patched 已 day+1。
  if (patched.time.day > state.time.day) {
    const daily = buildDailySummary(state);
    if (daily) patched.memory.summaries.push(daily);
    // 跨日把仍 pending 且约定日已过的约定标 missed（2026-06-16）：不再注入触发签，避免时间错乱
    if (patched.pendingHooks?.length) {
      patched.pendingHooks = patched.pendingHooks.map((h) =>
        h.status === 'pending' && h.day < patched.time.day ? { ...h, status: 'missed' as const } : h,
      );
    }
  }
  // 体力归零强制入夜：日子被直接推到次日晨课时补一句交代
  if (patched.time.day > state.time.day && state.time.timeSlot !== 'evening' && !state.progress.flags.finalChapter) {
    text += '\n气力耗尽，你伏案睡去。一夜无梦，晨钟响时，已是新的一日。';
  }
  // 活动/行动自动跳转到对应地点；但跨日行动（就寝/强制入夜）保留 advanceTime 设的晨起院堂，不被 action.locationId(宿舍) 覆盖
  const crossedDay = patched.time.day > state.time.day;
  // 午间「歇晌」推进到下午后回院堂（2026-06-18）：午睡后给下午一个像样起点，不在食堂空地点开场
  const noonRestToHall = action.type === 'rest' && action.id === 'rest' && state.time.timeSlot === 'noon';
  const targetLocation = crossedDay
    ? patched.currentLocation
    : noonRestToHall
      ? 'hall'
      : (action.locationId ?? patched.currentLocation);
  const withLocation: GameState = { ...patched, currentLocation: targetLocation };
  // LLM 场景行动的剧情账本由场景收束时的 memoryNote 写入；模板文本不入账本（防 LLM 复读模板）
  const isLlmSceneAction = action.type === 'attend_class' || action.type === 'activity' || action.type === 'practice_skill';
  const withMemory = commitMemoryPatch({
    state: withLocation,
    actionType: action.type,
    renderedText: text,
    locationId: action.locationId,
    npcId: action.npcId,
    memoryPatch: isLlmSceneAction ? {} : { storyLedgerNote: text },
  });

  return {
    renderedText: text,
    nextState: { ...withMemory, lastRenderedText: text },
    statePatch: patch,
    nextActions: getAvailableActions(withMemory),
  };
}
