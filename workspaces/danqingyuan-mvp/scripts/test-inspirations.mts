/**
 * 临时 node 单测：buildInspirations + weightedExamRawScore（2026-07-06 丹青试改版）。
 * 运行：<cached-tsx>/tsx scripts/test-inspirations.mts
 */
import { buildInspirations, MIN_INSPIRATIONS } from '../src/engine/inspirations';
import { weightedExamRawScore, FREE_CREATION_WEIGHT } from '../src/engine/gameEngine';
import { createInitialGameState } from '../src/engine/initialState';
import type { GameState } from '../src/types';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) { if (cond) pass++; else { fail++; console.error(`  ✗ ${name}`); } }

function stateWithNodes(nodes: { id: string; label: string; kind: string; discovered: boolean; hidden: boolean; note?: string }[]): GameState {
  const s = createInitialGameState({ player: { name: '测者', styleOrigin: 'landscape' } });
  s.memory.clueGraph.nodes = nodes as GameState['memory']['clueGraph']['nodes'];
  // 天气随机化后（2026-07-08）测试固定一周天气：第3日骤雨、第4日雨歇，其余晴云
  s.weatherWeek = [
    '晴，日色和暖，绿荫渐浓',
    '薄云，风里带了暑气',
    '骤雨，檐声不断',
    '雨歇初晴，草木新洗',
    '闷阴，云脚低，蝉声乍起',
    '风清，竹声飒飒，天光疏朗',
    '天朗气清，日头已有夏意',
  ];
  return s;
}

// 1. 只取 discovered 且非 hidden 的实体
{
  const s = stateWithNodes([
    { id: 'a', label: '卖浆老翁', kind: 'npc', discovered: true, hidden: false },
    { id: 'b', label: '未发现物', kind: 'item', discovered: false, hidden: false },
    { id: 'c', label: '隐藏线索', kind: 'clue', discovered: true, hidden: true },
    { id: 'd', label: '虹桥', kind: 'place', discovered: true, hidden: false },
  ]);
  s.time.day = 5;
  const insp = buildInspirations(s);
  const labels = insp.map((i) => i.label);
  check('含已发现老翁/虹桥', labels.includes('卖浆老翁') && labels.includes('虹桥'));
  check('不含未发现/隐藏', !labels.includes('未发现物') && !labels.includes('隐藏线索'));
  check('含当日天气灵感', insp.some((i) => i.kind === 'weather' && i.id === 'weather-5'));
  check('第≥4日含第三日骤雨', insp.some((i) => i.id === 'weather-3'));
}

// 2. 探索太少（0 实体）→ 兜底补默认卡，凑够 ≥MIN
{
  const s = stateWithNodes([]);
  s.time.day = 1; // day1 无往日天气，只有当日天气1条
  const insp = buildInspirations(s);
  check('灵感数≥MIN', insp.length >= MIN_INSPIRATIONS);
  check('含默认兜底卡', insp.some((i) => i.kind === 'default'));
  check('day1 不含第三日骤雨', !insp.some((i) => i.id === 'weather-3'));
}

// 3. 实体够多则不补默认
{
  const nodes = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, label: `见闻${i}`, kind: 'clue', discovered: true, hidden: false }));
  const s = stateWithNodes(nodes); s.time.day = 6;
  const insp = buildInspirations(s);
  check('实体够多不补默认', !insp.some((i) => i.kind === 'default'));
}

// 4. 加权计分：0.4 选项 + 0.6 自由创作
{
  check('权重=0.6', FREE_CREATION_WEIGHT === 0.6);
  check('50/100 → 80', weightedExamRawScore(50, 100) === 80); // 0.4*50+0.6*100=20+60=80
  check('100/50 → 70', weightedExamRawScore(100, 50) === 70); // 40+30=70
  check('60/60 → 60', weightedExamRawScore(60, 60) === 60);
  check('自由创作权重更高(同分差)', weightedExamRawScore(40, 80) > weightedExamRawScore(80, 40));
}

console.log(`inspirations: ${pass}/${fail} (pass/fail)`);
process.exit(fail === 0 ? 0 : 1);
