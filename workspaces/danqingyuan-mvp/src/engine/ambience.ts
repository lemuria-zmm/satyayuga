/** 场景氛围参数（供剧情写作器输入，v2 设计文档 §6.2） */
/** 季节统一为春夏之交（暮春入初夏）——全程以此为准，勿写秋冬（2026-07-06 天气系统）。 */
export const SEASON = '春夏之交';

/**
 * 七日天气（2026-07-07 改随机，明明拍板）：开局随机生成一周天气存入 GameState.weatherWeek，
 * 约束：七天内**至少一天雨、至多两天雨**（不能全雨）；雨后次日（若非雨天）自然接"雨歇初晴"。
 * 首段为短标签（供 UI 状态栏），其后为供 LLM 落笔的细节。
 */
const NON_RAIN_POOL = [
  '晴，日色和暖，绿荫渐浓',
  '薄云，风里带了暑气',
  '闷阴，云脚低，蝉声乍起',
  '风清，竹声飒飒，天光疏朗',
  '天朗气清，日头已有夏意',
  '晴，蝉声初起，槐影正浓',
];

const RAIN_POOL = [
  '骤雨，檐声不断',
  '细雨，烟丝斜织，檐滴成线',
];

const AFTER_RAIN = '雨歇初晴，草木新洗';

/** 旧固定表（v16 及更早存档的天气，迁移时沿用，保证半程玩家看过的天气不变） */
const LEGACY_WEATHER_BY_DAY: Record<number, string> = {
  1: '晴，日色和暖，绿荫渐浓',
  2: '薄云，风里带了暑气',
  3: '骤雨，檐声不断',
  4: '雨歇初晴，草木新洗',
  5: '闷阴，云脚低，蝉声乍起',
  6: '风清，竹声飒飒，天光疏朗',
  7: '天朗气清，日头已有夏意',
};

/** 是否雨天（含"雨"且非"雨歇"）——背景雨景变体/天空转场共用此判定 */
export function isRainyWeather(weather: string): boolean {
  return weather.includes('雨') && !weather.includes('歇');
}

/** 开局生成一周天气：1~2 天雨（随机落点），雨后接初晴，其余从晴/云池不重复取。 */
export function generateWeatherWeek(): string[] {
  const rainCount = Math.random() < 0.5 ? 1 : 2;
  const days = [1, 2, 3, 4, 5, 6, 7];
  // 随机选雨日（两天雨时不相邻，免得连雨压抑）
  const rainDays = new Set<number>();
  while (rainDays.size < rainCount) {
    const d = days[Math.floor(Math.random() * days.length)];
    if ([...rainDays].some((r) => Math.abs(r - d) <= 1)) continue;
    rainDays.add(d);
  }
  const pool = [...NON_RAIN_POOL].sort(() => Math.random() - 0.5);
  const week: string[] = [];
  for (let d = 1; d <= 7; d++) {
    if (rainDays.has(d)) {
      week.push(RAIN_POOL[Math.floor(Math.random() * RAIN_POOL.length)]);
    } else if (rainDays.has(d - 1)) {
      week.push(AFTER_RAIN);
    } else {
      week.push(pool.pop() ?? NON_RAIN_POOL[0]);
    }
  }
  return week;
}

/** 迁移用：旧存档沿用固定表作 weatherWeek（玩家已看过的天气不变） */
export function legacyWeatherWeek(): string[] {
  return [1, 2, 3, 4, 5, 6, 7].map((d) => LEGACY_WEATHER_BY_DAY[d]);
}

/** 取某日天气：优先存档里的 weatherWeek，缺失（异常/旧数据）回退固定表 */
export function getWeather(day: number, weatherWeek?: string[]): string {
  return weatherWeek?.[day - 1] ?? LEGACY_WEATHER_BY_DAY[day] ?? '晴';
}

/** 天气短标签（状态栏用）：取首段。 */
export function getWeatherLabel(day: number, weatherWeek?: string[]): string {
  return getWeather(day, weatherWeek).split('，')[0];
}

/**
 * 「繁华与黑暗的交织」主题暗线节拍（按日递进）：
 * 表面是半架空的汴京繁华与人情味，底下逐日显出阴影与不公；后两日并隐隐透出亡国前奏。
 * 写作器每场景至多轻点一笔，不得说破结论（尤其不得明说将要亡国/被外敌攻破）。
 * 半架空：可写"北边""花石的船""乡间的乱子"等，**不出现金/辽/徽宗/靖康等真实名号**。
 */
const THEME_BEATS_BY_DAY: Record<number, string> = {
  1: '繁华表层：街市叫卖、画院体面，一切如常，最多一闪而过的疲惫面孔。',
  2: '细小裂缝：脚店伙计算账时叹气，或院役领钱时被克扣了一文，无人深究。',
  3: '人情两面：有人慷慨施粥，也有人把伞价抬了三倍；雨天里穷人和富人走的不是同一条街。',
  4: '体面的代价：画院采买的绢价压得极低，织户敢怒不敢言；院中只谈笔墨，不谈绢从何来。',
  5: '粉饰本身：上头要的是祥瑞太平图，画师心里清楚有些东西不能入画；删改与留白成了规矩。',
  6: '盛景之耗：为修上头的园子，南边运花石的大船一路征调民夫舟船，沿途鸡犬不宁；街市传着南边乡间起了乱子的风声，说书人讲到一半被拦下。画院照旧要画祥瑞，仿佛什么都没发生。',
  7: '太平之问：又听说北边边关不太平、粮价悄悄涨了。丹青试要画的是太平气象，而玩家已见过太平底下被掏空的东西；画或不画，都是回答——这看似最盛的一年，底下已有看不见的裂缝在走。',
};

export function getThemeBeat(day: number): string {
  return THEME_BEATS_BY_DAY[day] ?? THEME_BEATS_BY_DAY[1];
}
