import type { LocationId, MainlineBeat, MainlineSeed, NpcId } from '../types';

/**
 * 七日主线种子池（拍板）：开局引擎随机抽「事件母题 × NPC × 关键物件 × 地点」组合，
 * 一次 LLM 调用扩写成 7 日节拍表。物件复用《骸游图》伏笔元素，但母题组合各不相同。
 */

export interface MainlineMotif {
  id: string;
  label: string;
  /** 给扩写器的母题提示：这件事底下藏着什么 */
  hint: string;
}

export const MAINLINE_MOTIFS: MainlineMotif[] = [
  {
    id: 'missing_peddler',
    label: '常来的货郎不见了',
    hint: '一个每日按时出现的小人物突然消失，没人肯说原因，摊位被人很快顶替。',
  },
  {
    id: 'swapped_draft',
    label: '画稿被人调换',
    hint: '一幅写实的画稿在呈送途中被换成粉饰过的版本，原稿下落不明。',
  },
  {
    id: 'night_crates',
    label: '夜里抬进院的箱笼',
    hint: '深夜有箱笼悄悄抬进画院偏门，白日里无人提起，封条上的字号眼熟。',
  },
  {
    id: 'returning_patient',
    label: '反复出现的求医人',
    hint: '同一个抱着孩子求医的身影几日里反复出现，离药铺越来越远。',
  },
  {
    id: 'silenced_sketch',
    label: '不许入画的一角',
    hint: '写生时总有一处街角被差役拦着不许画，那里的人家一户户在搬空。',
  },
];

export interface MainlineObject {
  id: string;
  label: string;
}

/** 关键物件池：《骸游图》伏笔元素 */
export const MAINLINE_OBJECTS: MainlineObject[] = [
  { id: 'peddler_load', label: '货郎的担子' },
  { id: 'medicine_bottle', label: '一只药瓶' },
  { id: 'swaddled_infant', label: '襁褓中的婴孩' },
  { id: 'fixed_gaze', label: '一道不肯移开的视线' },
  { id: 'stall_facing', label: '朝向反常的摊位' },
];

/** 牵连 NPC 池：主线与谁牵连最深（李唐总教习亦可入局） */
const MAINLINE_NPCS: NpcId[] = ['ximeng', 'zeduan', 'song', 'litang'];

/** 主要发生地池：限开局已可到达之处 */
const MAINLINE_LOCATIONS: LocationId[] = ['market', 'garden', 'library', 'hall'];

const pick = <T>(pool: T[]): T => pool[Math.floor(Math.random() * pool.length)];

export function rollMainlineSeed(): MainlineSeed {
  const motif = pick(MAINLINE_MOTIFS);
  const object = pick(MAINLINE_OBJECTS);
  return {
    motifId: motif.id,
    motifLabel: motif.label,
    npcId: pick(MAINLINE_NPCS),
    objectId: object.id,
    objectLabel: object.label,
    locationId: pick(MAINLINE_LOCATIONS),
  };
}

export function getMotifHint(motifId: string): string {
  return MAINLINE_MOTIFS.find((motif) => motif.id === motifId)?.hint ?? '';
}

/** LLM 扩写失败时的兜底节拍表：按种子拼模板，保证主线始终存在 */
export function buildFallbackBeats(seed: MainlineSeed): MainlineBeat[] {
  const o = seed.objectLabel;
  return [
    { day: 1, beat: `初见端倪：${o}在寻常处出现了一次，无人留意` },
    { day: 2, beat: `再次出现：${o}与「${seed.motifLabel}」隐约相关` },
    { day: 3, beat: '有人欲言又止，话头被岔开' },
    { day: 4, beat: `${o}换了地方出现，对不上前两次` },
    { day: 5, beat: '玩家撞见相关之人慌张离开的背影' },
    { day: 6, beat: '一句无意的话把几次见闻串到一起' },
    { day: 7, beat: `揭开一层：${seed.motifLabel}背后有人安排，更深处仍未明` },
  ];
}
