/**
 * 临时 node 单测：endingSequence 新拓扑（2026-07-05 第七日重构 commit）。
 * 运行：<cached-tsx>/tsx scripts/test-ending-sequence.mts
 */
import { nextEndingStage, XIMENG_MEET_AFFINITY } from '../src/engine/endingSequence';
import type { EndingStage } from '../src/engine/endingSequence';
import { createInitialGameState } from '../src/engine/initialState';
import type { EndingResult, GameState } from '../src/types';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) pass++; else { fail++; console.error(`  ✗ ${name}`); }
}

const ending: EndingResult = {
  tier: 'good', title: '入院·得授祗候', score: 75, cappedBySkill: false,
  rankChange: 'zhihou', unlockArchive: true, unlockStudio: false,
  summaryLines: [],
};

function stateWithAffinity(a: number): GameState {
  const s = createInitialGameState({ player: { name: '测者', styleOrigin: 'landscape' } });
  s.relationships.ximeng.hiddenAffinity = a;
  return s;
}

// 1. 日终链·好感低（<知己）：title_grant → archive_bridge → puzzle → reveal → epilogue → null
{
  const s = stateWithAffinity(40);
  const chain: (EndingStage | null)[] = [];
  let cur: EndingStage | null = 'title_grant';
  while (cur) { chain.push(cur); cur = nextEndingStage(cur, ending, s); }
  check('好感低日终链', JSON.stringify(chain) === JSON.stringify(['title_grant', 'archive_bridge', 'puzzle', 'reveal', 'epilogue']));
  check('epilogue 后终点 null', nextEndingStage('epilogue', ending, s) === null);
}

// 2. 日终链·知己(≥60)：title_grant → ximeng_bridge → ximeng_meet → archive_bridge → puzzle → reveal → epilogue
{
  const s = stateWithAffinity(XIMENG_MEET_AFFINITY);
  const chain: (EndingStage | null)[] = [];
  let cur: EndingStage | null = 'title_grant';
  while (cur) { chain.push(cur); cur = nextEndingStage(cur, ending, s); }
  check('知己日终链含见希孟', JSON.stringify(chain) === JSON.stringify(['title_grant', 'ximeng_bridge', 'ximeng_meet', 'archive_bridge', 'puzzle', 'reveal', 'epilogue']));
}

// 3. 秘阁在见希孟之后（archive_bridge 紧跟 ximeng_meet）
{
  const s = stateWithAffinity(80);
  check('见希孟后进秘阁引桥', nextEndingStage('ximeng_meet', ending, s) === 'archive_bridge');
  check('秘阁引桥→五幕解谜', nextEndingStage('archive_bridge', ending, s) === 'puzzle');
  check('五幕→揭卷', nextEndingStage('puzzle', ending, s) === 'reveal');
  check('揭卷→收尾', nextEndingStage('reveal', ending, s) === 'epilogue');
}

// 4. exam_review/retake 不进日终链（返回 null）
{
  const s = stateWithAffinity(40);
  check('exam_review 不进日终链', nextEndingStage('exam_review', ending, s) === null);
  check('retake 不进日终链', nextEndingStage('retake', ending, s) === null);
}

// 5. 门槛边界：好感 59 走秘阁不见希孟；60 见希孟
{
  check('好感59不见希孟', nextEndingStage('title_grant', ending, stateWithAffinity(59)) === 'archive_bridge');
  check('好感60见希孟', nextEndingStage('title_grant', ending, stateWithAffinity(60)) === 'ximeng_bridge');
}

console.log(`ending-sequence: ${pass}/${fail} (pass/fail)`);
process.exit(fail === 0 ? 0 : 1);
