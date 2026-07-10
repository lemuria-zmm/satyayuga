import type { EndingResult, GameState, NpcId, SkillId } from '../types';
import { TEACHER_BY_STYLE } from '../types/core';

/**
 * 结局序列编排（2026-06-30 初版；2026-07-05 第七日重构：拆"考后简评"+"日终收尾序列"两段）。
 *
 * 新第七日流程：
 *   上午丹青试交卷 →【exam_review 简短点评】（落第→retake 补考保底过）→ 回考后日常
 *   → 午/下午/晚正常日常（考后余韵+靖康前奏）→ 晚间就寝→日终（finalChapter）
 *   → 日终收尾序列：【title_grant 授衔】→（好感≥知己【ximeng_bridge→ximeng_meet】）
 *     →【archive_bridge 秘阁引桥】→【puzzle 五幕解谜】→【reveal 骸游图揭卷】→【epilogue 收尾文章】
 *
 * `exam_review`/`retake` 在考后就地处理（App.submitExam），不进 nextEndingStage 的日终链。
 * `nextEndingStage` 只推进日终链（title_grant 起，此时成绩已定为通过档）。
 */
export type EndingStage =
  | 'exam_review' // 考后简短点评（EndingDialogue，npcId=本科导师；「继续」回日常）
  | 'retake' // 落第补考（考后就地办，ExamScreen examMode='retake' 保底过）
  | 'title_grant' // 日终·授衔（TitleGrantOverlay，提交 rank/解锁）
  | 'ximeng_bridge' // 日终·引出希孟线过场（好感≥知己）
  | 'ximeng_meet' // 日终·见希孟（EndingDialogue npcId=ximeng）
  | 'archive_bridge' // 日终·秘阁引桥过场（门虚掩→推门而入）
  | 'puzzle' // 日终·秘阁五幕解谜（PuzzleScreen）
  | 'reveal' // 日终·骸游图揭卷（HaiyouRevealScreen）
  | 'epilogue' // 日终·收尾文章（EpilogueScreen，续作预热）
  | 'curtain_call'; // 日终·谢幕落幕（CurtainCallScreen，四人入画+回顾，终幕）

/** 见希孟门槛：希孟好感≥知己(60)，与画室入口一致 */
export const XIMENG_MEET_AFFINITY = 60;

/** 本科 styleOrigin → 点评导师（山水/画理 litang、人物 song、界画 zeduan） */
export function mentorForStyle(styleOrigin: SkillId): NpcId {
  return TEACHER_BY_STYLE[styleOrigin];
}

/**
 * 日终收尾序列推进：给定当前段 + 状态，算下一段（null = 序列终点）。纯函数，便于单测。
 * 只覆盖日终链（title_grant 起）；exam_review/retake 由 App 就地处理，传入时返回 null。
 *
 * - title_grant → 好感≥知己? ximeng_bridge : archive_bridge
 * - ximeng_bridge → ximeng_meet
 * - ximeng_meet → archive_bridge
 * - archive_bridge → puzzle
 * - puzzle → reveal
 * - reveal → epilogue
 * - epilogue → curtain_call
 * - curtain_call → null（终幕）
 */
export function nextEndingStage(
  current: EndingStage,
  _ending: EndingResult,
  state: GameState,
): EndingStage | null {
  const metXimeng = state.relationships.ximeng.hiddenAffinity >= XIMENG_MEET_AFFINITY;
  switch (current) {
    case 'title_grant':
      return metXimeng ? 'ximeng_bridge' : 'archive_bridge';
    case 'ximeng_bridge':
      return 'ximeng_meet';
    case 'ximeng_meet':
      return 'archive_bridge';
    case 'archive_bridge':
      return 'puzzle';
    case 'puzzle':
      return 'reveal';
    case 'reveal':
      return 'epilogue';
    case 'epilogue':
      return 'curtain_call';
    case 'curtain_call':
      return null;
    case 'exam_review':
    case 'retake':
      return null;
  }
}
