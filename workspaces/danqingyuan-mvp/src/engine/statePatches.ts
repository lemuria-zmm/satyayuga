import { DAILY_ALLOWANCE, DAILY_BASE_STAMINA, STAT_LIMITS, TIME_SLOT_ORDER, stageFromAffinity } from '../types/core';
import type { GameState, NpcId, ValidatedStatePatch } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function applyValidatedStatePatch(state: GameState, patch: ValidatedStatePatch): GameState {
  const next: GameState = structuredClone(state);

  if (patch.skillDelta) {
    for (const [skillId, delta] of Object.entries(patch.skillDelta)) {
      const typedSkillId = skillId as keyof GameState['skills'];
      next.skills[typedSkillId] = clamp(next.skills[typedSkillId] + (delta ?? 0), 0, 100);
    }
  }

  if (patch.relationshipDeltaByNpc) {
    for (const [npcId, delta] of Object.entries(patch.relationshipDeltaByNpc)) {
      const typedNpcId = npcId as NpcId;
      const rel = next.relationships[typedNpcId];
      rel.hiddenAffinity = clamp(rel.hiddenAffinity + (delta ?? 0), 0, 100);
      // 好感变化后同步重算关系档位（2026-06-25 修：原 stage init 后从不更新）
      rel.stage = stageFromAffinity(rel.hiddenAffinity);
    }
  }

  if (patch.cluesGranted) {
    next.puzzle.collectedClueIds = Array.from(new Set([...next.puzzle.collectedClueIds, ...patch.cluesGranted]));
  }

  if (patch.flagsSet) {
    next.progress.flags = { ...next.progress.flags, ...patch.flagsSet };
  }

  if (patch.unlockedLocations) {
    next.progress.unlockedLocations = Array.from(
      new Set([...next.progress.unlockedLocations, ...patch.unlockedLocations]),
    );
  }

  if (patch.rankChange) {
    next.progress.rank = patch.rankChange;
  }

  if (patch.staminaDelta) {
    next.time.stamina = clamp(next.time.stamina + patch.staminaDelta, 0, next.time.maxStamina);
  }

  if (patch.moodDelta) {
    next.stats.mood = clamp(next.stats.mood + patch.moodDelta, STAT_LIMITS.mood.min, STAT_LIMITS.mood.max);
  }

  if (patch.knowledgeDelta) {
    next.stats.knowledge = clamp(
      next.stats.knowledge + patch.knowledgeDelta,
      STAT_LIMITS.knowledge.min,
      STAT_LIMITS.knowledge.max,
    );
  }

  if (patch.moneyDelta) {
    next.stats.money = clamp(next.stats.money + patch.moneyDelta, STAT_LIMITS.money.min, STAT_LIMITS.money.max);
  }

  if (patch.nextDayStaminaBonus) {
    next.time.nextDayStaminaBonus += patch.nextDayStaminaBonus;
  }

  // 沙盒练习每日技能涨幅累加（2026-06-27）：用于封顶 DAILY_SKILL_CAP，跨日清零
  if (patch.skillGainedTodayDelta) {
    next.time.skillGainedToday += patch.skillGainedTodayDelta;
  }

  // 沙盒练习每日学识涨幅累加（2026-06-28）：用于封顶 DAILY_KNOWLEDGE_CAP，跨日清零
  if (patch.knowledgeGainedTodayDelta) {
    next.time.knowledgeGainedToday += patch.knowledgeGainedTodayDelta;
  }

  if (patch.eventIdsCompleted) {
    next.progress.completedEventIds = Array.from(
      new Set([...next.progress.completedEventIds, ...patch.eventIdsCompleted]),
    );
  }

  if (patch.timeAdvance) {
    advanceTime(next);
    // 体力归零强制入夜（v2 拍板）：跳过当日剩余时段，直接进入次日晨课
    let collapsed = false;
    while (
      next.time.stamina === 0 &&
      next.time.timeSlot !== 'morning_class' &&
      !next.progress.flags.finalChapter
    ) {
      collapsed = true;
      advanceTime(next);
    }
    // 累垮扣心情（2026-06-28）：透支体力强制入夜额外 mood-2（正常就寝不扣）。
    // 在 advanceTime 跨日后扣——此时已是次日晨课、心情仍承上日基底（advanceTime 不重置心情）。
    if (collapsed) {
      next.stats.mood = clamp(next.stats.mood - 2, STAT_LIMITS.mood.min, STAT_LIMITS.mood.max);
    }
  }

  return next;
}

/**
 * 五时段时间机：晨课 → 上午 → 午间 → 下午 → 晚间 → 次日晨课。
 * 第 7 日晚间结束后进入终章（时间冻结），不再推进天数。
 */
function advanceTime(state: GameState) {
  const slotIndex = TIME_SLOT_ORDER.indexOf(state.time.timeSlot);
  // 叙事场景计数跨时段清零（2026-06-18）：进入新时段重新允许 3 场自动开场
  state.time.slotSceneCount = 0;
  if (slotIndex < TIME_SLOT_ORDER.length - 1) {
    state.time.timeSlot = TIME_SLOT_ORDER[slotIndex + 1];
    return;
  }

  // 晚间结束
  if (state.time.day >= state.time.maxDay) {
    // 终章：时间冻结，秘阁解读不再有时段压力
    state.progress.flags.finalChapter = true;
    return;
  }

  state.time.day += 1;
  state.time.timeSlot = 'morning_class';
  state.time.isExamDay = state.time.day === state.time.maxDay;
  state.time.stamina = clamp(DAILY_BASE_STAMINA + state.time.nextDayStaminaBonus, 0, state.time.maxStamina);
  state.time.nextDayStaminaBonus = 0;
  state.time.narrativeCharsToday = 0;
  // 沙盒练习每日技能涨幅封顶跨日清零（2026-06-27）
  state.time.skillGainedToday = 0;
  // 沙盒练习每日学识涨幅封顶跨日清零（2026-06-28）
  state.time.knowledgeGainedToday = 0;
  // 即时推荐意图当日有效，跨日清空（2026-06-17）
  state.suggestedIntents = {};
  // 每日闲聊次数 + 当日好感涨幅跨日清零（2026-06-25/26）：次日恢复满额、涨幅封顶重置
  for (const npcId of Object.keys(state.relationships) as NpcId[]) {
    state.relationships[npcId].chatsToday = 0;
    state.relationships[npcId].affinityGainedToday = 0;
  }
  // 晨起回院堂（2026-06-17 修 bug）：就寝在宿舍，跨日不重置则次日晨课背景/场景仍停宿舍
  state.currentLocation = 'hall';
  // 点卯例钱
  state.stats.money = clamp(state.stats.money + DAILY_ALLOWANCE, STAT_LIMITS.money.min, STAT_LIMITS.money.max);
}
