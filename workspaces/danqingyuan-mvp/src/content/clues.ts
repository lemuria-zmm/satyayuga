/**
 * 秘阁线索注册表（2026-07-02）——秘阁五幕重做的单一真相源。
 *
 * 8 条线索，两类来源：
 * - `carried`：七日养成中预收集（书房 practice 卡 / 街市 practice 卡 / 希孟好感≥同道），
 *   由 `engine/clueGrants.ts` 确定性授予，入 `PuzzleState.collectedClueIds`。秘阁幕一「入阁」展示。
 * - `observe`：秘阁幕二「观画」选中画面异常（HAIYOU_PAINTING.anomalies）解锁。
 *
 * 映射 canon（docs/plans/2026-06-30-worldview-rework-canon.md）§4 书房 3 线索 + paintings.ts 五元素。
 * PuzzleScreen 展示与引擎授予共用此表，勿在别处硬编码线索文案。
 */

export type ClueSource = '书房' | '希孟' | '秘阁' | '街市';
export type ClueAct = 'carried' | 'observe';

export interface ClueDef {
  id: string;
  title: string;
  text: string;
  source: ClueSource;
  act: ClueAct;
}

export const CLUES: ClueDef[] = [
  // —— 七日预收集（carried）——
  {
    id: 'clue_archive_names',
    title: '旧档同名',
    text: '几页旧档里，四位先生的名字反复同时出现，像在共事一桩没记入册的事。',
    source: '书房',
    act: 'carried',
  },
  {
    id: 'clue_altered_colophon',
    title: '涂改题记',
    text: '一函旧批的题记年月被涂改，夹着半张草图——画的是流民疾苦，与青绿盛世截然相反。',
    source: '书房',
    act: 'carried',
  },
  {
    id: 'clue_ximeng_second_scroll',
    title: '案上另一卷',
    text: '希孟案上压着千里江山卷之外的另一卷，他见你来匆匆收起，未曾言语。',
    source: '希孟',
    act: 'carried',
  },
  {
    id: 'clue_market_hardship',
    title: '街市见闻',
    text: '写生街市时你留意到：热闹底下，粮价在涨，讨生活的人脸上有掩不住的苦色。',
    source: '街市',
    act: 'carried',
  },
  // —— 秘阁观画解锁（observe，对应 HAIYOU_PAINTING.anomalies）——
  {
    id: 'clue_medicine_bottle',
    title: '药瓶',
    text: '瓶口朝外，像被刻意摆给看画的人。',
    source: '秘阁',
    act: 'observe',
  },
  {
    id: 'clue_child_posture',
    title: '婴孩',
    text: '孩子的哭不是热闹的一部分，更像无人回应的求救。',
    source: '秘阁',
    act: 'observe',
  },
  {
    id: 'clue_blocked_waterway',
    title: '被遮住的水路',
    text: '摊位与人群挡住画角，那里似乎有一条走不到尽头的水路。',
    source: '秘阁',
    act: 'observe',
  },
  {
    id: 'clue_onlooker_gaze',
    title: '旁观者视线',
    text: '人群里有一道视线不肯移开，冷冷盯着画外，像在替谁记着什么。',
    source: '秘阁',
    act: 'observe',
  },
];

export const CLUE_BY_ID: Record<string, ClueDef> = Object.fromEntries(
  CLUES.map((clue) => [clue.id, clue]),
);

/** 七日预收集线索 ID（幕一入阁展示）。 */
export const CARRIED_CLUE_IDS: string[] = CLUES.filter((c) => c.act === 'carried').map((c) => c.id);

/** 秘阁观画解锁线索 ID。 */
export const OBSERVE_CLUE_IDS: string[] = CLUES.filter((c) => c.act === 'observe').map((c) => c.id);
