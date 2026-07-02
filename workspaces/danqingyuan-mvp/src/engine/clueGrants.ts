import type { GameAction, GameState } from '../types';
import { ACTIVITY_BY_ID } from '../content/activities';

/**
 * 七日预收集线索的确定性授予（2026-07-02 秘阁五幕重做）。
 *
 * 秘阁「入阁」幕需要可靠展示七日里收集到的线索，故走引擎确定性授予（不依赖 LLM 自报，
 * scene 侧 allowedClueIds 各调用点都传 []，白名单已死）。授予走现成 `cluesGranted` patch 字段，
 * 由 applyValidatedStatePatch 去重并入 PuzzleState.collectedClueIds。
 *
 * 幂等：每条线索一个 `*Seen` flag 守卫，授一次后置真，防重复授予/刷。
 *
 * 授予点（映射 canon §4 书房 3 线索 + 线 A 街市）：
 * - 书房 practice 卡 read_treatise/view_scrolls → 旧档同名 clue_archive_names
 * - 书房 practice 卡 deep_study（minKnowledge:10，天然保 §4-2 学识≥10 门槛）→ 涂改题记 clue_altered_colophon
 * - 街市 practice 卡 market_figure/market_architecture → 街市见闻 clue_market_hardship
 * - 希孟好感≥同道(40) 且身处书房（对齐 sceneEngine 撞见另一卷叙事触发）→ 案上另一卷 clue_ximeng_second_scroll
 */
export function clueGrantsForAction(
  state: GameState,
  action: GameAction,
): { cluesGranted: string[]; flagsSet: Record<string, boolean> } {
  const cluesGranted: string[] = [];
  const flagsSet: Record<string, boolean> = {};
  const flags = state.progress.flags;

  const grant = (clueId: string, seenFlag: string) => {
    if (!flags[seenFlag]) {
      cluesGranted.push(clueId);
      flagsSet[seenFlag] = true;
    }
  };

  // —— practice 卡完成授予（action.type==='activity' 且卡为 practice track）——
  if (action.type === 'activity') {
    const card = ACTIVITY_BY_ID[action.activityId ?? ''];
    if (card?.track === 'practice') {
      switch (card.id) {
        case 'practice_read_treatise':
        case 'practice_view_scrolls':
          grant('clue_archive_names', 'clueArchiveNamesSeen');
          break;
        case 'practice_deep_study':
          grant('clue_altered_colophon', 'clueColophonSeen');
          break;
        case 'practice_market_figure':
        case 'practice_market_architecture':
          grant('clue_market_hardship', 'clueMarketHardshipSeen');
          break;
      }
    }
  }

  // —— 希孟线：身处书房 + 好感≥同道(40) → 撞见案上另一卷 ——
  // 与 sceneEngine 书房信步「撞见另一卷」叙事触发同门槛；玩家在书房 wander/练习时命中。
  const affinity = state.relationships?.ximeng?.hiddenAffinity ?? 0;
  if (state.currentLocation === 'library' && affinity >= 40) {
    grant('clue_ximeng_second_scroll', 'clueSecondScrollSeen');
  }

  return { cluesGranted, flagsSet };
}
