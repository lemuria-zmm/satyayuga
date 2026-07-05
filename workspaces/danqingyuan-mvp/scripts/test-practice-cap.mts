/**
 * 临时 node 单测：练习封顶反馈 + 体力平衡（2026-07-06 Stage2 #4a/#4b）。
 * 运行：<cached-tsx>/tsx scripts/test-practice-cap.mts
 */
import { applyAction } from '../src/engine/gameEngine';
import { createInitialGameState } from '../src/engine/initialState';
import { ACTIVITY_BY_ID } from '../src/content/activities';
import type { GameAction, GameState } from '../src/types';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) { if (cond) pass++; else { fail++; console.error(`  ✗ ${name}`); } }

function landscapeState(): GameState {
  const s = createInitialGameState({ player: { name: '测者', styleOrigin: 'landscape' } });
  s.time.timeSlot = 'noon'; // 沙盒时段可练习
  s.currentLocation = 'garden';
  s.stats.mood = 6; // 不锁练习、无心情修正
  return s;
}
const gardenSketch = (): GameAction => ({ id: 'a', type: 'activity', label: '对景写生', activityId: 'practice_garden_sketch', locationId: 'garden', staminaCost: 1 });

// 1. 首次对景写生（本科山水）→ 山水 +2 正常显示（证明 #4a 非显示 bug，是封顶）
{
  const s = landscapeState();
  const r = applyAction(s, gardenSketch());
  check('首次对景写生 山水+2', r.statePatch.skillDelta?.landscape === 2);
  check('首次不触发封顶提示', !r.statePatch.cappedNote);
}

// 2. 当日技能已满(skillGainedToday=4)→ 再练归 0 + 出封顶提示
{
  const s = landscapeState();
  s.time.skillGainedToday = 4;
  const r = applyAction(s, gardenSketch());
  check('封顶后山水+0', (r.statePatch.skillDelta?.landscape ?? 0) === 0);
  check('封顶出提示', r.statePatch.cappedNote === '今日画技已臻精进之限，明日再来');
}

// 3. #4b 体力平衡：标准练习卡统一体力1（观竹石听泉/速写市井人物/画桥梁屋宇 由2→1）
{
  check('观竹石听泉 体力1', ACTIVITY_BY_ID['practice_garden_observe'].staminaCost === 1);
  check('速写市井人物 体力1', ACTIVITY_BY_ID['practice_market_figure'].staminaCost === 1);
  check('画桥梁屋宇 体力1', ACTIVITY_BY_ID['practice_market_architecture'].staminaCost === 1);
  check('对景写生 体力1（未变）', ACTIVITY_BY_ID['practice_garden_sketch'].staminaCost === 1);
  check('钻研旧档 保持体力2（给+2）', ACTIVITY_BY_ID['practice_deep_study'].staminaCost === 2);
}

// 4. 学识封顶也出提示（钻研旧档 +2，先把当日学识刷满）
{
  const s = landscapeState();
  s.currentLocation = 'library';
  s.stats.knowledge = 20; // 过 minKnowledge:10 门槛
  s.time.knowledgeGainedToday = 3; // 学识封顶 DAILY_KNOWLEDGE_CAP=3 已满
  const r = applyAction(s, { id: 'k', type: 'activity', label: '研读画论', activityId: 'practice_read_treatise', locationId: 'library', staminaCost: 1 });
  check('学识封顶出提示', r.statePatch.cappedNote === '今日学识已积到尽头，明日再进');
}

console.log(`practice-cap: ${pass}/${fail} (pass/fail)`);
process.exit(fail === 0 ? 0 : 1);
