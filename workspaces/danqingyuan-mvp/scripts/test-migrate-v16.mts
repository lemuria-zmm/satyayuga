/**
 * 临时 node 单测：存档迁移 v15→v16（2026-07-02 秘阁五幕重做 commit 4）。
 * 运行：<cached-tsx>/tsx scripts/test-migrate-v16.mts
 *
 * 直接单测导出的 migrateHaiyouFlagsV15（storage.ts）——真实实现，不复刻逻辑。
 */
import { migrateHaiyouFlagsV15 } from '../src/persistence/storage';
import { createInitialGameState } from '../src/engine/initialState';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) pass++; else { fail++; console.error(`  ✗ ${name}`); }
}

const migrateFlagsV15 = (flags: Record<string, boolean>) => migrateHaiyouFlagsV15({ ...flags });

// 1. 旧档 strong=true/teased=true → 翻译为新 flag，旧键删除
{
  const old = { haiyouDiscovered: true, noticedWaterEndCloudStrong: true, secondScrollTeased: true, noticedWaterEndCloudWeak: true };
  const m = migrateFlagsV15(old);
  check('strong→haiyouThreadStrong', m.haiyouThreadStrong === true);
  check('teased→haiyouDisappearanceHooked', m.haiyouDisappearanceHooked === true);
  check('旧 strong 键删除', !('noticedWaterEndCloudStrong' in m));
  check('旧 teased 键删除', !('secondScrollTeased' in m));
  check('旧 weak 键删除', !('noticedWaterEndCloudWeak' in m));
  check('haiyouDiscovered 保留', m.haiyouDiscovered === true);
}

// 2. 旧档 false → 新 flag false
{
  const old = { noticedWaterEndCloudStrong: false, secondScrollTeased: false };
  const m = migrateFlagsV15(old);
  check('strong=false→false', m.haiyouThreadStrong === false);
  check('teased=false→false', m.haiyouDisappearanceHooked === false);
}

// 3. 无旧 flag 的档 → 新 flag/*Seen 补 false
{
  const m = migrateFlagsV15({ metXimeng: true });
  check('*Seen 补 false', m.clueArchiveNamesSeen === false && m.clueSecondScrollSeen === false && m.clueMarketHardshipSeen === false && m.clueColophonSeen === false);
  check('haiyouRevealed 补 false', m.haiyouRevealed === false);
  check('无关 flag 保留', m.metXimeng === true);
}

// 4. 新档（createInitialGameState）应已含新 flag、无旧 flag
{
  const s = createInitialGameState();
  const f = s.progress.flags as Record<string, boolean>;
  check('新档含 haiyouThreadStrong', 'haiyouThreadStrong' in f);
  check('新档含 4个 *Seen', 'clueArchiveNamesSeen' in f && 'clueColophonSeen' in f && 'clueSecondScrollSeen' in f && 'clueMarketHardshipSeen' in f);
  check('新档无旧云起 flag', !('noticedWaterEndCloudStrong' in f) && !('secondScrollTeased' in f) && !('noticedWaterEndCloudWeak' in f));
  check('新档 PuzzleState.haiyouRevealTier 为 undefined', s.puzzle.haiyouRevealTier === undefined);
  check('新档 collectedClueIds 空数组', Array.isArray(s.puzzle.collectedClueIds) && s.puzzle.collectedClueIds.length === 0);
}

console.log(`migrate-v16: ${pass}/${fail} (pass/fail)`);
process.exit(fail === 0 ? 0 : 1);
