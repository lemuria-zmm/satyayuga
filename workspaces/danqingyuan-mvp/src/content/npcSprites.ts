import type { NpcId, NpcEmotionState } from '../types';

/**
 * NPC 立绘按情绪/好感选图（2026-07-06 接入新表情半身集，calm 为通用兜底）。
 *
 * 现有各 NPC 表情半身（public/char/char-{npc}-{expr}.png）：
 * - 希孟 ximeng：calm/sad/smile/stern/surprise/trust
 * - 李唐 litang：calm/sad/smile/stern/surprise/trust
 * - 嵩 song：calm/sad/smile/stern/surprise（无 trust）
 * - 择端 zeduan：calm/sad/smile/stern/surprise（无 trust）
 * - 书童 shutong：仅 smile（引导脚本固定图，非 NpcId、不走此表）
 *
 * 兜底：选不到目标表情一律回退 calm（全员必有）。
 */
const NPC_EXPRESSIONS: Record<string, ReadonlySet<string>> = {
  ximeng: new Set(['calm', 'sad', 'smile', 'stern', 'surprise', 'trust']),
  litang: new Set(['calm', 'sad', 'smile', 'stern', 'surprise', 'trust']),
  song: new Set(['calm', 'sad', 'smile', 'stern', 'surprise']),
  zeduan: new Set(['calm', 'sad', 'smile', 'stern', 'surprise']),
  shutong: new Set(['smile']),
};

/** 情绪 → 目标表情（Bible C.3）。目标该 NPC 没有时回退 calm。sad 暂无情绪入口，留作备用。 */
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
 * 取 NPC 立绘路径：按 emotionState 选表情，选不到则回退 calm。
 * 希孟 + trusting + 好感≥知己(60) → 专属 trust 表情。
 */
export function npcSpriteFor(npcId: NpcId, emotionState?: NpcEmotionState, affinity?: number): string {
  const avail = NPC_EXPRESSIONS[npcId] ?? new Set(['calm']);
  let expr = emotionState ? (EMOTION_TO_EXPR[emotionState] ?? 'calm') : 'calm';
  if (npcId === 'ximeng' && emotionState === 'trusting' && (affinity ?? 0) >= 60 && avail.has('trust')) {
    expr = 'trust';
  }
  if (!avail.has(expr)) expr = avail.has('calm') ? 'calm' : [...avail][0];
  return `/char/char-${npcId}-${expr}.png`;
}
