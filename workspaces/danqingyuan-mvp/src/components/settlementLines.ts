import type { SkillId, ValidatedStatePatch } from '../types';

export const skillLabels: Record<SkillId, string> = {
  landscape: '山水',
  figure: '人物',
  architecture: '界画',
};

/** 结算纸签内容：把本次行动的数值变化列成短句（结算笺 + 午餐/夜娱弹窗共用） */
export function buildSettlementLines(patch: ValidatedStatePatch): string[] {
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const lines: string[] = [];
  for (const [skillId, delta] of Object.entries(patch.skillDelta ?? {})) {
    if (delta) lines.push(`${skillLabels[skillId as SkillId]} ${signed(delta)}`);
  }
  if (patch.staminaDelta) lines.push(`体力 ${signed(patch.staminaDelta)}`);
  if (patch.moodDelta) lines.push(`心情 ${signed(patch.moodDelta)}`);
  if (patch.knowledgeDelta) lines.push(`学识 ${signed(patch.knowledgeDelta)}`);
  if (patch.moneyDelta) lines.push(`钱文 ${signed(patch.moneyDelta)}`);
  if (patch.nextDayStaminaBonus) lines.push(`明日晨起体力 ${signed(patch.nextDayStaminaBonus)}`);
  if (patch.cluesGranted?.length) lines.push(`线索 +${patch.cluesGranted.length}`);
  if (patch.cappedNote) lines.push(patch.cappedNote);
  if (patch.rankChange === 'zhihou') lines.push('授祗候');
  if (patch.rankChange === 'painter_regular') lines.push('晋为画正');
  if (patch.rankChange === 'painter_awaiting') lines.push('擢为画待诏');
  return lines;
}
