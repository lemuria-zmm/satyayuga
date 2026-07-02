/**
 * 临时 node 单测：puzzleActs 五幕态机（2026-07-02 秘阁五幕重做 commit 5）。
 * 运行：<cached-tsx>/tsx scripts/test-puzzle-acts.mts
 */
import { nextAct, canAdvanceAct, MIN_THREAD_CLUES } from '../src/engine/puzzleActs';
import type { PuzzleAct, PuzzleActContext } from '../src/engine/puzzleActs';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) pass++; else { fail++; console.error(`  ✗ ${name}`); }
}

const ctx = (o: number, c: number, s: number): PuzzleActContext => ({
  observedAnomalyCount: o, threadedClueCount: c, threadedSourceCount: s,
});

// 1. 线性推进顺序
{
  const chain: (PuzzleAct | null)[] = [];
  let a: PuzzleAct | null = 'enter';
  while (a) { chain.push(a); a = nextAct(a); }
  check('五幕顺序 enter→observe→thread→interpret→reveal', JSON.stringify(chain) === JSON.stringify(['enter', 'observe', 'thread', 'interpret', 'reveal']));
  check('reveal 后终点 null', nextAct('reveal') === null);
}

// 2. gate：入阁总可推进
check('入阁总可推进', canAdvanceAct('enter', ctx(0, 0, 0)) === true);

// 3. gate：观画需≥1异常
check('观画0异常不可推进', canAdvanceAct('observe', ctx(0, 0, 0)) === false);
check('观画1异常可推进', canAdvanceAct('observe', ctx(1, 0, 0)) === true);

// 4. gate：缀线需≥3线索且跨≥2来源
check('缀线2线索不可推进', canAdvanceAct('thread', ctx(2, 2, 2)) === false);
check('缀线3线索但单来源不可推进', canAdvanceAct('thread', ctx(4, 3, 1)) === false);
check('缀线3线索跨2来源可推进', canAdvanceAct('thread', ctx(4, MIN_THREAD_CLUES, 2)) === true);

// 5. gate：解读/揭卷推进恒真（提交另判）
check('解读可推进', canAdvanceAct('interpret', ctx(0, 0, 0)) === true);
check('揭卷可推进', canAdvanceAct('reveal', ctx(0, 0, 0)) === true);

console.log(`puzzle-acts: ${pass}/${fail} (pass/fail)`);
process.exit(fail === 0 ? 0 : 1);
