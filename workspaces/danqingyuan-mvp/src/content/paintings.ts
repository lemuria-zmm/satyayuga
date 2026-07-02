import type { PaintingBible } from '../types';

export const HAIYOU_PAINTING: PaintingBible = {
  id: 'painting_haiyou',
  title: '《骸游图》',
  visibleSummary:
    '秘阁中封存的市井画卷。货郎、药瓶、婴孩、摊位和旁观者挤在一处，热闹里透着不安。',
  hiddenSummary:
    '希孟、择端、李唐、嵩四人共创、分工不同（有人执笔、有人只定立意）的画卷，画盛世底下的疮痍，本意欲进献以警戒当朝危局。表层主题是繁华与黑暗的交织，深层是这群画师以画进谏的隐秘担当。',
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
    {
      id: 'onlooker_gaze',
      visibleText: '人群里有一道视线不肯移开，冷冷盯着画外。',
      relatedSkillIds: ['figure'],
      grantsClueId: 'clue_onlooker_gaze',
    },
  ],
  clueIds: [
    'clue_medicine_bottle',
    'clue_child_posture',
    'clue_blocked_waterway',
    'clue_onlooker_gaze',
  ],
  carriedClueIds: [
    'clue_archive_names',
    'clue_altered_colophon',
    'clue_ximeng_second_scroll',
    'clue_market_hardship',
  ],
  coreThemes: ['繁华与黑暗的交织', '民生疾苦', '以画进谏'],
  partialInterpretations: ['罪证', '交易', '监视', '逃离'],
  forbiddenInterpretations: ['现代医学', '超自然诅咒', '单纯药案'],
  spoilerBoundaries: ['秘阁揭开前不点明四人共创', '不得坐实希孟未来消失的原因'],
};

