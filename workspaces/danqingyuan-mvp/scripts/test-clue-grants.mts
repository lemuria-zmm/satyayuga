/**
 * 临时 node 引擎单测：clueGrantsForAction（2026-07-02 秘阁五幕重做 commit 2）。
 * 运行：<cached-tsx>/tsx scripts/test-clue-grants.mts
 */
import { clueGrantsForAction } from '../src/engine/clueGrants';
import { createInitialGameState } from '../src/engine/initialState';
import type { GameAction, GameState } from '../src/types';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; }
  else { fail++; console.error(`  ✗ ${name}`); }
}

function baseState(): GameState {
  return createInitialGameState({ player: { name: '测者', styleOrigin: 'landscape' } });
}

const practiceAction = (id: string): GameAction => ({
  id: `act-${id}`,
  type: 'activity',
  label: id,
  activityId: id,
  locationId: 'library',
  staminaCost: 1,
});

// 1. 书房研读授旧档同名，幂等
{
  const s = baseState();
  s.currentLocation = 'hall'; // 排除希孟条件干扰
  const g1 = clueGrantsForAction(s, practiceAction('practice_read_treatise'));
  check('read_treatise 授 clue_archive_names', g1.cluesGranted.includes('clue_archive_names'));
  check('read_treatise 置 seen flag', g1.flagsSet.clueArchiveNamesSeen === true);
  // 幂等：flag 已置真则不再授
  s.progress.flags.clueArchiveNamesSeen = true;
  const g2 = clueGrantsForAction(s, practiceAction('practice_read_treatise'));
  check('幂等：已 seen 不重授', g2.cluesGranted.length === 0);
}

// 2. view_scrolls 也授旧档同名（同一线索两卡）
{
  const s = baseState(); s.currentLocation = 'hall';
  const g = clueGrantsForAction(s, practiceAction('practice_view_scrolls'));
  check('view_scrolls 授 clue_archive_names', g.cluesGranted.includes('clue_archive_names'));
}

// 3. deep_study 授涂改题记
{
  const s = baseState(); s.currentLocation = 'hall';
  const g = clueGrantsForAction(s, practiceAction('practice_deep_study'));
  check('deep_study 授 clue_altered_colophon', g.cluesGranted.includes('clue_altered_colophon'));
}

// 4. 街市卡授街市见闻
{
  const s = baseState(); s.currentLocation = 'hall';
  const gf = clueGrantsForAction(s, practiceAction('practice_market_figure'));
  check('market_figure 授 clue_market_hardship', gf.cluesGranted.includes('clue_market_hardship'));
  const ga = clueGrantsForAction(s, practiceAction('practice_market_architecture'));
  check('market_architecture 授 clue_market_hardship', ga.cluesGranted.includes('clue_market_hardship'));
}

// 5. 希孟线：书房 + 好感≥40 授案上另一卷；<40 不授
{
  const s = baseState();
  s.currentLocation = 'library';
  s.relationships.ximeng.hiddenAffinity = 45;
  const wander: GameAction = { id: 'w', type: 'wander', label: '信步', locationId: 'library', staminaCost: 0 };
  const g = clueGrantsForAction(s, wander);
  check('书房+好感45 授 clue_ximeng_second_scroll', g.cluesGranted.includes('clue_ximeng_second_scroll'));

  const s2 = baseState();
  s2.currentLocation = 'library';
  s2.relationships.ximeng.hiddenAffinity = 39;
  const g2 = clueGrantsForAction(s2, wander);
  check('书房但好感39 不授', !g2.cluesGranted.includes('clue_ximeng_second_scroll'));

  const s3 = baseState();
  s3.currentLocation = 'hall';
  s3.relationships.ximeng.hiddenAffinity = 60;
  const g3 = clueGrantsForAction(s3, wander);
  check('好感60但不在书房 不授', !g3.cluesGranted.includes('clue_ximeng_second_scroll'));
}

// 6. 非练习卡/无关行动 不授
{
  const s = baseState(); s.currentLocation = 'hall';
  const eat: GameAction = { id: 'eat', type: 'activity', label: '吃饭', activityId: 'meal_mantou', locationId: 'canteen', staminaCost: 0 };
  const g = clueGrantsForAction(s, eat);
  check('机械餐卡不授线索', g.cluesGranted.length === 0);
}

// 7. 书房练习同时命中练习线索+希孟线索（双授）
{
  const s = baseState();
  s.currentLocation = 'library';
  s.relationships.ximeng.hiddenAffinity = 50;
  const g = clueGrantsForAction(s, practiceAction('practice_read_treatise'));
  check('书房研读+好感50 同授两线索', g.cluesGranted.includes('clue_archive_names') && g.cluesGranted.includes('clue_ximeng_second_scroll'));
}

console.log(`clueGrants: ${pass}/${fail} (pass/fail)`);
process.exit(fail === 0 ? 0 : 1);
