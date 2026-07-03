/**
 * 临时 node 单测：考试后终章·秘阁可达性（2026-07-02 修复丹青试通过后秘阁流程断裂）。
 * 运行：<cached-tsx>/tsx scripts/test-final-chapter-archive.mts
 *
 * 病根：丹青试在晨课通过只推进到 forenoon、永不到晚间→finalChapter 从未设→玩家落回普通叙事时段，
 * 秘阁签被地点过滤+自动 wander 乱入。修复：commitTitleGrant 设 finalChapter=true。
 */
import { getAvailableActions } from '../src/engine/gameEngine';
import { applyValidatedStatePatch } from '../src/engine/statePatches';
import { createInitialGameState } from '../src/engine/initialState';
import type { GameState } from '../src/types';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) pass++; else { fail++; console.error(`  ✗ ${name}`); }
}

// 模拟授衔提交后的状态：finalChapter + archiveUnlocked + 解锁秘阁 + 落到秘阁
function grantedState(): GameState {
  const s = createInitialGameState({ player: { name: '测者', styleOrigin: 'landscape' } });
  s.time.day = 7;
  s.time.timeSlot = 'forenoon'; // 丹青试通过后实际停在的时段
  const granted = applyValidatedStatePatch(s, {
    rankChange: 'zhihou',
    flagsSet: { firstExamPassed: true, archiveUnlocked: true, finalChapter: true },
    unlockedLocations: ['secret_archive'],
  });
  return granted;
}

// 1. 终章 + 在秘阁：秘阁解谜签可见（0 体力）
{
  const s = grantedState();
  s.currentLocation = 'secret_archive';
  const actions = getAvailableActions(s);
  const puzzle = actions.find((a) => a.type === 'solve_puzzle');
  check('终章·秘阁内出解谜签', !!puzzle);
  check('解谜签 0 体力', puzzle?.staminaCost === 0);
  check('解谜签指向秘阁', puzzle?.locationId === 'secret_archive');
}

// 2. 终章不出报时钟/自动 wander 类推进签（时间冻结，只留秘阁+走动）
{
  const s = grantedState();
  s.currentLocation = 'secret_archive';
  const actions = getAvailableActions(s);
  check('终章无报时钟收尾签', !actions.some((a) => a.id === 'chime'));
  check('终章无信步 wander 环境签', !actions.some((a) => a.type === 'wander'));
}

// 3. 终章仍可走动到秘阁（不是晨课锁院堂）——移动签存在
{
  const s = grantedState();
  s.currentLocation = 'hall'; // 授衔后若仍在院堂，须能走到秘阁
  const actions = getAvailableActions(s);
  const moveToArchive = actions.find((a) => a.type === 'move_to' && a.locationId === 'secret_archive');
  check('终章·院堂可走到秘阁', !!moveToArchive);
}

// 4. 解读完（haiyouFirstInterpreted）后秘阁签消失（不可重入）
{
  const s = grantedState();
  s.currentLocation = 'secret_archive';
  s.progress.flags.haiyouFirstInterpreted = true;
  const actions = getAvailableActions(s);
  check('解读后秘阁签消失', !actions.some((a) => a.type === 'solve_puzzle'));
}

// 5. 兜底：终章·人在秘阁但 archiveUnlocked 未置（旧档/回退路径）——仍出解谜签（治"此处此刻无事可做"）
{
  const s = createInitialGameState({ player: { name: '测者', styleOrigin: 'landscape' } });
  s.time.day = 7;
  s.progress.flags.finalChapter = true;
  s.progress.flags.archiveUnlocked = false; // 关键：未置
  s.currentLocation = 'secret_archive';
  s.progress.unlockedLocations = [...s.progress.unlockedLocations, 'secret_archive'];
  const actions = getAvailableActions(s);
  check('兜底：在秘阁即使 archiveUnlocked 未置也出解谜签', actions.some((a) => a.type === 'solve_puzzle'));
}

// 6. 兜底不越界：终章·不在秘阁且 archiveUnlocked 未置——不出解谜签
{
  const s = createInitialGameState({ player: { name: '测者', styleOrigin: 'landscape' } });
  s.time.day = 7;
  s.progress.flags.finalChapter = true;
  s.progress.flags.archiveUnlocked = false;
  s.currentLocation = 'hall';
  const actions = getAvailableActions(s);
  check('兜底不越界：不在秘阁且未解锁不出解谜签', !actions.some((a) => a.type === 'solve_puzzle'));
}

console.log(`final-chapter-archive: ${pass}/${fail} (pass/fail)`);
process.exit(fail === 0 ? 0 : 1);
