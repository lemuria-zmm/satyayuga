import type { EndingResult, GameState, NpcId, SkillId } from '../types';
import { TEACHER_BY_STYLE } from '../types/core';

/**
 * 结局序列编排（2026-06-30，结局序列重设计批一）。
 *
 * 丹青试交卷后不再直接渲一张静态 EndingScreen，而是分段演出：
 *   【A 导师点评】→【B 授衔】→（好感≥知己）【C 引出希孟线 + D 见希孟】→【E 收尾动画】。
 *   落第 → 导师点评里给补考机会 →【补考·保底过】→ 回授衔。
 *
 * 批一只实现 A / B / E（+ 落第补考桩=直接保底过、见希孟 C/D 桩=跳过）。
 * retake / ximeng_bridge / ximeng_meet 类型先占位，批二补全。
 */
export type EndingStage =
  | 'mentor_review' // A 导师点评（EndingDialogue，npcId=本科导师）
  | 'retake' // 落第补考（批二补 ExamScreen；批一桩=直接保底过）
  | 'title_grant' // B 授衔（TitleGrantOverlay，提交 rank）
  | 'ximeng_bridge' // C 引出希孟线过场（批二）
  | 'ximeng_meet' // D 见希孟（批二，EndingDialogue npcId=ximeng）
  | 'epilogue'; // E 收尾动画（EpilogueScreen）

/** 见希孟门槛：希孟好感≥知己(60)，与画室入口一致 */
export const XIMENG_MEET_AFFINITY = 60;

/** 本科 styleOrigin → 点评导师（山水/画理 litang、人物 song、界画 zeduan） */
export function mentorForStyle(styleOrigin: SkillId): NpcId {
  return TEACHER_BY_STYLE[styleOrigin];
}

/**
 * 序列推进：给定当前段 + 结局结果 + 当前状态，算下一段（null = 序列结束）。
 * 纯函数，便于单测。
 *
 * - mentor_review → 落第? retake : title_grant
 * - retake → title_grant（补考保底过后授衔）
 * - title_grant → 好感≥知己? ximeng_bridge : epilogue（批一桩里 ximeng_bridge 段直接跳过，见 App）
 * - ximeng_bridge → ximeng_meet
 * - ximeng_meet → epilogue
 * - epilogue → null（序列终点）
 */
export function nextEndingStage(
  current: EndingStage,
  ending: EndingResult,
  state: GameState,
): EndingStage | null {
  const failed = ending.tier === 'fail';
  const metXimeng = state.relationships.ximeng.hiddenAffinity >= XIMENG_MEET_AFFINITY;
  switch (current) {
    case 'mentor_review':
      return failed ? 'retake' : 'title_grant';
    case 'retake':
      return 'title_grant';
    case 'title_grant':
      return metXimeng ? 'ximeng_bridge' : 'epilogue';
    case 'ximeng_bridge':
      return 'ximeng_meet';
    case 'ximeng_meet':
      return 'epilogue';
    case 'epilogue':
      return null;
  }
}
