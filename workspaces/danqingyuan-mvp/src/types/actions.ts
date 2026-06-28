import type { LocationId, NpcId, Rank, SkillDelta, SkillId } from './core';
import type { GameState } from './core';
import type { MemoryPatch } from './memory';

export type ActionType =
  | 'practice_skill'
  | 'talk_to_npc'
  | 'investigate_location'
  | 'observe_painting'
  | 'rest'
  | 'take_exam'
  | 'quick_exam'
  | 'solve_puzzle'
  | 'move_to'
  | 'attend_class'
  | 'activity'
  | 'sleep'
  | 'keep_appointment'
  | 'wander'
  | 'follow_suggestion';

export interface GameAction {
  id: string;
  type: ActionType;
  label: string;
  locationId?: LocationId;
  npcId?: NpcId;
  skillId?: SkillId;
  paintingId?: string;
  /** 活动卡 id（type === 'activity' 时指向 content/activities） */
  activityId?: string;
  /** 剧情约定 id（type === 'keep_appointment' 时指向 GameState.pendingHooks） */
  hookId?: string;
  /** 推荐行动承接上下文（type === 'follow_suggestion' 时，喂下一场 LLM 的下一步 summary） */
  intent?: string;
  staminaCost: number;
  /** 钱文消费（仅市井消费卡） */
  moneyCost?: number;
  requires?: ActionRequirement[];
}

export interface ActionRequirement {
  kind: 'rank' | 'flag' | 'location_unlocked' | 'skill_min' | 'clue_collected';
  id: string;
  value?: string | number | boolean;
}

export interface SuggestedStatePatch {
  skillDelta?: SkillDelta;
  relationshipDelta?: number;
  cluesGranted?: string[];
  flagsSuggested?: string[];
  topicUnlocked?: string[];
}

export interface ValidatedStatePatch {
  skillDelta?: SkillDelta;
  relationshipDeltaByNpc?: Partial<Record<NpcId, number>>;
  cluesGranted?: string[];
  flagsSet?: Record<string, boolean>;
  unlockedLocations?: LocationId[];
  rankChange?: Rank;
  staminaDelta?: number;
  moodDelta?: number;
  knowledgeDelta?: number;
  moneyDelta?: number;
  /** 次日晨起体力修正（早歇/蹴鞠） */
  nextDayStaminaBonus?: number;
  timeAdvance?: boolean;
  eventIdsCompleted?: string[];
  /** 当日技能涨幅累加（2026-06-27 沙盒练习封顶）：仅练习结算填，累加到 time.skillGainedToday */
  skillGainedTodayDelta?: number;
  /** 当日学识涨幅累加（2026-06-28 学识封顶）：仅练习结算填，累加到 time.knowledgeGainedToday */
  knowledgeGainedTodayDelta?: number;
}

export interface ActionResult {
  renderedText: string;
  nextState?: GameState;
  statePatch: ValidatedStatePatch;
  memoryPatch?: MemoryPatch;
  nextActions: GameAction[];
  llmTraceId?: string;
}
