/**
 * 临时 node 单测：generateWeatherWeek 约束（2026-07-08 天气随机化）。
 * 运行：<cached-tsx>/tsx scripts/test-weather.mts
 */
import { generateWeatherWeek, legacyWeatherWeek, getWeather, getWeatherLabel, isRainyWeather } from '../src/engine/ambience';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) { if (cond) pass++; else { fail++; console.error(`  ✗ ${name}`); } }

// 1. 约束在 200 次生成中恒成立
{
  let ok = { len: true, rainMin: true, rainMax: true, notAll: true, afterRain: true, adjacent: true };
  for (let i = 0; i < 200; i++) {
    const week = generateWeatherWeek();
    if (week.length !== 7) ok.len = false;
    const rains = week.map((w, idx) => (isRainyWeather(w) ? idx + 1 : 0)).filter(Boolean);
    if (rains.length < 1) ok.rainMin = false;
    if (rains.length > 2) ok.rainMax = false;
    if (rains.length === 7) ok.notAll = false;
    // 两天雨不相邻
    if (rains.length === 2 && Math.abs(rains[0] - rains[1]) <= 1) ok.adjacent = false;
    // 雨后次日（若非雨天且未出界）应是雨歇初晴
    for (const r of rains) {
      if (r < 7 && !rains.includes(r + 1) && !week[r].includes('雨歇')) ok.afterRain = false;
    }
  }
  check('每周 7 天', ok.len);
  check('至少 1 天雨', ok.rainMin);
  check('至多 2 天雨', ok.rainMax);
  check('不会全是雨天', ok.notAll);
  check('两天雨不相邻', ok.adjacent);
  check('雨后次日接雨歇初晴', ok.afterRain);
}

// 2. legacy 表与取值回退
{
  const legacy = legacyWeatherWeek();
  check('legacy 第3日是骤雨', isRainyWeather(legacy[2]));
  check('getWeather 优先 weatherWeek', getWeather(1, ['细雨，试', '', '', '', '', '', '']) === '细雨，试');
  check('getWeather 缺省回退固定表', getWeather(3) === '骤雨，檐声不断');
  check('label 取首段', getWeatherLabel(1, ['晴，其他细节']) === '晴');
}

// 3. 雨歇不算雨天（背景变体判定）
{
  check('骤雨算雨', isRainyWeather('骤雨，檐声不断'));
  check('细雨算雨', isRainyWeather('细雨，烟丝斜织，檐滴成线'));
  check('雨歇初晴不算雨', !isRainyWeather('雨歇初晴，草木新洗'));
  check('晴不算雨', !isRainyWeather('晴，日色和暖'));
}

console.log(`weather: ${pass}/${fail} (pass/fail)`);
process.exit(fail === 0 ? 0 : 1);
