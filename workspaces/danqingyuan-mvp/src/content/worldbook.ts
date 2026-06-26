import type { WorldbookEntry } from '../types';

export const WORLDBOOK_ENTRIES: WorldbookEntry[] = [
  {
    id: 'motif_water_end_cloud_rise',
    name: '水穷云起',
    type: 'motif',
    visibleDescription: '画中水路走到尽头，而云气从断处、山背或留白处升起。',
    hiddenDescription: '云起时的核心视觉结构。MVP 中只能作为构图异象或画意问题出现。',
    relatedNpcIds: ['ximeng', 'litang'],
    relatedClueIds: ['clue_blocked_waterway', 'clue_unseasonal_cloud'],
    applicableLlmRoles: ['character_dialogue', 'painting_prompt_generator', 'painting_intent_evaluator'],
    misuseWarnings: ['不要把它解释成真实地点', '不要在 MVP 中揭示最终意义'],
  },
  {
    id: 'painting_haiyou',
    name: '《骸游图》',
    type: 'painting',
    visibleDescription: '秘阁中封存的画卷，表面像市井风俗，细看却处处不安。',
    hiddenDescription:
      '希孟、择端、李唐、嵩都以不同方式参与过的共同画卷，体现四人对民生疾苦的关注。',
    relatedNpcIds: ['ximeng', 'zeduan', 'litang', 'song'],
    relatedClueIds: ['clue_medicine_bottle', 'clue_child_posture', 'clue_blocked_waterway'],
    applicableLlmRoles: ['character_dialogue', 'painting_prompt_generator', 'painting_intent_evaluator'],
    misuseWarnings: ['不要说它由某一个人独立绘制', '不要解释成纯风俗热闹'],
  },
];

