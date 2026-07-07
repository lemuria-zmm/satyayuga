import type { GameState } from '../types';
import type { ClueGraphNode } from '../types/memory';
import { getWeather, getWeatherLabel, isRainyWeather } from './ambience';

/** 中文日序（灵感卡标签用） */
const DAY_CN: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七' };

/**
 * 自由创作灵感（2026-07-06 丹青试改版）。
 *
 * 丹青试自由创作题：玩家从画案手记档案（clueGraph.nodes）+ 七日天气里择取 3~5 个灵感，
 * 考官据此 + 本科画科拟一道自由命题。灵感池含人物/地点/物件/母题/画作/见闻/天气，
 * 故山水（偏地点/母题/天气）、人物（偏 npc）、界画（偏建筑地点）都能成立。
 */
export interface Inspiration {
  id: string;
  label: string;
  /** 分组类别（含 clueGraph 六类 + weather + default 兜底） */
  kind: ClueGraphNode['kind'] | 'weather' | 'default';
  note?: string;
}

/** 至少要凑够的灵感数（不足则补默认卡） */
export const MIN_INSPIRATIONS = 3;

/** 人人都见过的兜底灵感（探索太少时补足，保证考试不被卡） */
const DEFAULT_INSPIRATIONS: Omit<Inspiration, 'id'>[] = [
  { kind: 'default', label: '晨课临帖', note: '这七日日日在院堂晨课上临的帖' },
  { kind: 'default', label: '京城街市的烟火', note: '桥头摊贩、货郎、往来行人' },
  { kind: 'default', label: '后花园的竹石', note: '池畔太湖石与一丛修竹' },
  { kind: 'default', label: '膳堂的一餐', note: '同窗共膳、碗箸声里的院中闲话' },
];

/**
 * 构建自由创作可选灵感：画案手记里已发现且非隐藏的实体 + 当日天气 + 一条七日印象天气；
 * 不足 MIN_INSPIRATIONS 时补默认卡。
 */
export function buildInspirations(state: GameState): Inspiration[] {
  const list: Inspiration[] = [];

  // 档案实体（已发现、非隐藏）
  for (const node of state.memory.clueGraph.nodes) {
    if (!node.discovered || node.hidden) continue;
    list.push({ id: `entity-${node.id}`, label: node.label, kind: node.kind, note: node.note });
  }

  // 天气灵感：当日天气 + （若已下过）最近一场雨作往日灵感（2026-07-07 天气随机化后动态找雨日）
  const day = state.time.day;
  list.push({ id: `weather-${day}`, label: `今日的${getWeatherLabel(day, state.weatherWeek)}`, kind: 'weather', note: '这一日的天光物候' });
  for (let d = day - 1; d >= 1; d--) {
    const w = getWeather(d, state.weatherWeek);
    if (isRainyWeather(w)) {
      list.push({ id: `weather-${d}`, label: `第${DAY_CN[d] ?? d}日那场${getWeatherLabel(d, state.weatherWeek)}`, kind: 'weather', note: '檐声犹在耳，草木新洗的气味' });
      break;
    }
  }

  // 兜底：可选灵感不足 3 个时补默认卡（去重 label）
  if (list.length < MIN_INSPIRATIONS) {
    for (const d of DEFAULT_INSPIRATIONS) {
      if (list.length >= MIN_INSPIRATIONS + 1) break;
      if (list.some((i) => i.label === d.label)) continue;
      list.push({ id: `default-${list.length}`, ...d });
    }
  }

  return list;
}

/** 灵感分组标签（UI 展示） */
export const INSPIRATION_KIND_LABELS: Record<Inspiration['kind'], string> = {
  npc: '人物',
  place: '地点',
  item: '物件',
  motif: '母题',
  painting: '画作',
  clue: '见闻',
  weather: '天时',
  default: '院中日常',
};
