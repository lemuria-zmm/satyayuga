import type { NpcId, NpcEmotionState } from '../types';

/**
 * NPC 立绘按情绪/好感选图（2026-07-06 接入已产表情差分）。
 *
 * 现有各 NPC 表情文件（public/char/char-{npc}-{expr}.png）——嵩/书童尚缺部分表情，用 normal 兜底：
 * - 希孟：normal/calm/smile/sad/stern/surprise/trust/painting/special
 * - 李唐：normal/serious/smile/sad/stern/surprise/trust
 * - 择端：normal/calm/smile/sad/stern/surprise
 * - 嵩：normal/smile/thinking（缺 calm/stern/sad/surprise → 待明明补图）
 * - 书童：normal（缺 smile/surprise → 待补）
 */
const NPC_EXPRESSIONS: Record<string, ReadonlySet<string>> = {
  ximeng: new Set(['normal', 'calm', 'smile', 'sad', 'stern', 'surprise', 'trust', 'painting', 'special']),
  litang: new Set(['normal', 'serious', 'smile', 'sad', 'stern', 'surprise', 'trust']),
  zeduan: new Set(['normal', 'calm', 'smile', 'sad', 'stern', 'surprise']),
  song: new Set(['normal', 'smile', 'thinking']),
  shutong: new Set(['normal']),
};

/** 情绪 → 目标表情（Bible C.3）。目标表情该 NPC 没有时回退（calm→normal）。 */
const EMOTION_TO_EXPR: Record<NpcEmotionState, string> = {
  distant: 'calm',
  silent: 'calm',
  avoidant: 'calm',
  noticing: 'smile',
  trusting: 'smile',
  irritated: 'stern',
  shaken: 'surprise',
};

/**
 * 取 NPC 立绘路径：按 emotionState 选表情，选不到则回退。
 * 希孟 + trusting + 好感≥知己(60) → 专属 trust 表情。
 */
export function npcSpriteFor(npcId: NpcId, emotionState?: NpcEmotionState, affinity?: number): string {
  const avail = NPC_EXPRESSIONS[npcId] ?? new Set(['normal']);
  let expr = emotionState ? (EMOTION_TO_EXPR[emotionState] ?? 'normal') : 'normal';
  if (npcId === 'ximeng' && emotionState === 'trusting' && (affinity ?? 0) >= 60 && avail.has('trust')) {
    expr = 'trust';
  }
  if (!avail.has(expr)) expr = avail.has('calm') ? 'calm' : 'normal';
  return `/char/char-${npcId}-${expr}.png`;
}
