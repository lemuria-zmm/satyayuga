import type { GameState } from '../types';

/**
 * 行动签 → 场景图替换（2026-07-07 自 MainGameScreen 抽出共享，明明："子场景配合行动签用，避免一直停留在一个bg单调"）。
 * 两处使用：
 * - App.runAction：所有行动统一设/清 activityBg（practice/膳食等**不起场景**的行动也要换背景——2026-07-07 修"点行动签不弹场景"）；
 * - MainGameScreen：LLM 场景进行中按 scene.action.activityId 取（场景优先级最高）。
 */
export const sceneActivityBackgrounds: Record<string, string> = {
  // 街市子场景（固定）
  teahouse: '/bg-teahouse.png',
  eve_tingqu: '/bg-washe-theater.png',
  eve_nightmarket: '/bg-market-folk-night.png', // 夜市闲逛→市井夜景（街市晚间默认 market-night，点行动签才切 folk，2026-07-08 明明拍板）
  // 书房子场景：查证/深查在书架间
  library_research: '/bg-library-shelf.png',
  library_deep_research: '/bg-library-shelf.png',
  // 膳堂子场景：热食去灶间
  meal_chuibing: '/bg-dining-stove.png',
  meal_mantou: '/bg-dining-stove.png',
  meal_botuo: '/bg-dining-stove.png',
};

/** 晚间读书类行动签 → 灯下书案图（不局限于一个行动签；白日仍用书房日景） */
const EVENING_STUDY_ACTIVITIES = new Set(['practice_read_treatise', 'practice_view_scrolls', 'practice_deep_study']);

/** 昼夜双图子场景（2026-07-08 二批场景图）：按时段选 day/night 版 */
const DAY_NIGHT_ACTIVITIES: Record<string, { day: string; night: string }> = {
  practice_garden_observe: { day: '/bg-garden-bamboo-day.png', night: '/bg-garden-bamboo-night.png' },
  practice_market_figure: { day: '/bg-market-folk-day.png', night: '/bg-market-folk-night.png' },
  market_sketch: { day: '/bg-market-folk-day.png', night: '/bg-market-folk-night.png' },
  meal_street: { day: '/bg-market-folk-day.png', night: '/bg-market-folk-night.png' },
  practice_market_architecture: { day: '/bg-market-bridge-canal-day.png', night: '/bg-market-bridge-canal-night.png' },
};

export function activityBackground(activityId: string, timeSlot: GameState['time']['timeSlot']): string | undefined {
  if (timeSlot === 'evening' && EVENING_STUDY_ACTIVITIES.has(activityId)) {
    return '/bg-library-desk-night.png';
  }
  const dayNight = DAY_NIGHT_ACTIVITIES[activityId];
  if (dayNight) {
    return timeSlot === 'evening' ? dayNight.night : dayNight.day;
  }
  return sceneActivityBackgrounds[activityId];
}
