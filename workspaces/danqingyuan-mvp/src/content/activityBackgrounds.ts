import type { GameState } from '../types';

/**
 * 行动签 → 场景图替换（2026-07-07 自 MainGameScreen 抽出共享；07-08 三批图补齐雨天变体）。
 * 两处使用：
 * - App.runAction：所有行动统一设/清 activityBg（practice/膳食等**不起场景**的行动也要换背景）；
 * - MainGameScreen：LLM 场景进行中按 scene.action.activityId 取（场景优先级最高）。
 */
export const sceneActivityBackgrounds: Record<string, string> = {
  // 室内子场景（不分天气）
  teahouse: '/bg-teahouse.png',
  eve_tingqu: '/bg-washe-theater.png',
};

/** 晚间读书类行动签 → 灯下书案图（通用，不分天气；白日仍用书房日景） */
const EVENING_STUDY_ACTIVITIES = new Set(['practice_read_treatise', 'practice_view_scrolls', 'practice_deep_study']);

/** 昼/夜/雨四态子场景（2026-07-08 三批图）：按时段+天气选 */
interface VariantSet {
  day: string;
  night: string;
  /** 雨天日间（缺省回退 day） */
  rainy?: string;
  /** 雨天晚间（缺省回退 night） */
  rainyNight?: string;
}

const VARIANT_ACTIVITIES: Record<string, VariantSet> = {
  practice_garden_observe: {
    day: '/bg-garden-bamboo-day.png',
    night: '/bg-garden-bamboo-night.png',
    rainy: '/bg-garden-bamboo-rainy.png',
  },
  practice_market_figure: {
    day: '/bg-market-folk-day.png',
    night: '/bg-market-folk-night.png',
    rainy: '/bg-market-folk-rainy.png',
    rainyNight: '/bg-market-folk-rainy-night.png',
  },
  market_sketch: {
    day: '/bg-market-folk-day.png',
    night: '/bg-market-folk-night.png',
    rainy: '/bg-market-folk-rainy.png',
    rainyNight: '/bg-market-folk-rainy-night.png',
  },
  meal_street: {
    day: '/bg-market-folk-day.png',
    night: '/bg-market-folk-night.png',
    rainy: '/bg-market-folk-rainy.png',
    rainyNight: '/bg-market-folk-rainy-night.png',
  },
  practice_market_architecture: {
    day: '/bg-market-bridge-canal-day.png',
    night: '/bg-market-bridge-canal-night.png',
    rainy: '/bg-market-bridge-canal-rainy.png',
    rainyNight: '/bg-market-bridge-canal-rainy-night.png',
  },
  // 夜市闲逛→市井夜景（街市晚间默认 market-night，点行动签才切 folk，2026-07-08 明明拍板）
  eve_nightmarket: {
    day: '/bg-market-folk-night.png',
    night: '/bg-market-folk-night.png',
    rainyNight: '/bg-market-folk-rainy-night.png',
  },
  // 书房查证/深查在书架间
  library_research: {
    day: '/bg-library-shelf.png',
    night: '/bg-library-shelf.png',
    rainy: '/bg-library-shelf-rainy.png',
  },
  library_deep_research: {
    day: '/bg-library-shelf.png',
    night: '/bg-library-shelf.png',
    rainy: '/bg-library-shelf-rainy.png',
  },
  // 膳堂热食去灶间
  meal_chuibing: { day: '/bg-dining-stove.png', night: '/bg-dining-stove.png', rainy: '/bg-dining-stove-rainy.png' },
  meal_mantou: { day: '/bg-dining-stove.png', night: '/bg-dining-stove.png', rainy: '/bg-dining-stove-rainy.png' },
  meal_botuo: { day: '/bg-dining-stove.png', night: '/bg-dining-stove.png', rainy: '/bg-dining-stove-rainy.png' },
};

export function activityBackground(
  activityId: string,
  timeSlot: GameState['time']['timeSlot'],
  rainy = false,
): string | undefined {
  if (timeSlot === 'evening' && EVENING_STUDY_ACTIVITIES.has(activityId)) {
    return '/bg-library-desk-night.png';
  }
  const set = VARIANT_ACTIVITIES[activityId];
  if (set) {
    if (timeSlot === 'evening') {
      return rainy ? set.rainyNight ?? set.night : set.night;
    }
    return rainy ? set.rainy ?? set.day : set.day;
  }
  return sceneActivityBackgrounds[activityId];
}
