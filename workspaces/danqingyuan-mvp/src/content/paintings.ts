import type { PaintingBible } from '../types';

export const HAIYOU_PAINTING: PaintingBible = {
  id: 'painting_haiyou',
  title: '《骸游图》',
  visibleSummary:
    '秘阁中封存的市井画卷。货郎、药瓶、婴孩、摊位和旁观者挤在一处，热闹里透着不安。',
  hiddenSummary:
    '四个主要角色都以不同方式参与过的共同画卷。表层主题是操控与被操控，深层伏笔是被遮住的水路与不合时令的云气。',
  requiredElements: ['药瓶', '婴孩', '摊位朝向', '旁观者视线', '被遮住的水路'],
  anomalies: [
    {
      id: 'medicine_bottle',
      visibleText: '药瓶摆得太醒目，像怕人看不见。',
      relatedSkillIds: ['figure'],
      grantsClueId: 'clue_medicine_bottle',
    },
    {
      id: 'child_posture',
      visibleText: '婴孩姿态不自然，像在哭，却无人真正看他。',
      relatedSkillIds: ['figure'],
      grantsClueId: 'clue_child_posture',
    },
    {
      id: 'blocked_waterway',
      visibleText: '画角似有水路，被摊位和人群遮住。',
      relatedSkillIds: ['landscape', 'architecture'],
      grantsClueId: 'clue_blocked_waterway',
    },
  ],
  clueIds: ['clue_medicine_bottle', 'clue_child_posture', 'clue_blocked_waterway'],
  coreThemes: ['操控与被操控', '民生疾苦', '被遮住的去处'],
  partialInterpretations: ['罪证', '交易', '监视', '逃离'],
  forbiddenInterpretations: ['现代医学', '超自然诅咒', '单纯药案'],
  spoilerBoundaries: ['不得透露云起时真实地点', '不得透露希孟未来消失'],
};

