import type { WorldbookEntry } from '../types';

export const WORLDBOOK_ENTRIES: WorldbookEntry[] = [
  {
    id: 'painting_qianli',
    name: '《千里江山卷》',
    type: 'painting',
    visibleDescription: '希孟正在绘制的青绿山水长卷，要进献宫里，呈一派盛世气象。',
    hiddenDescription:
      '原型《千里江山图》。明面上的盛世长卷——与暗处的《骸游图》互为一体两面：一卷写繁华，一卷写黑暗，都出自同一群人之手。',
    relatedNpcIds: ['ximeng'],
    relatedClueIds: [],
    applicableLlmRoles: ['character_dialogue', 'scene_narrator'],
    misuseWarnings: ['不要把它写成已完成的传世名作（此刻仍在绘制）', '不要让 NPC 说破希孟将会消失'],
  },
  {
    id: 'painting_haiyou',
    name: '《骸游图》',
    type: 'painting',
    visibleDescription: '秘阁中封存的画卷，表面像市井风俗，细看却处处不安。',
    hiddenDescription:
      '希孟、择端、李唐、嵩四人共创、分工不同（有人执笔、有人只定立意）的画卷，画盛世底下的疮痍，本意欲进献以警戒当朝危局。MVP 中"四人共创"待秘阁揭开，"进献警戒"的目的与希孟消失的关联不点明。',
    relatedNpcIds: ['ximeng', 'zeduan', 'litang', 'song'],
    relatedClueIds: ['clue_medicine_bottle', 'clue_child_posture', 'clue_blocked_waterway'],
    applicableLlmRoles: ['character_dialogue', 'painting_prompt_generator', 'painting_intent_evaluator'],
    misuseWarnings: ['不要说它由某一个人独立绘制', '不要解释成纯风俗热闹', '秘阁揭开前不点明四人共创'],
  },
];
