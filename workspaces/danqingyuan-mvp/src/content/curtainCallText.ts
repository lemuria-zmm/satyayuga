import type { EndingResult } from '../types';

export type CurtainFigure = 'litang' | 'zeduan' | 'song' | 'ximeng';

/** 谢幕长卷一屏：一张画（vignette）+ 该屏消融谢幕的背影立绘 + 右侧竖排文字（写多点，不留空） */
export interface CurtainPanel {
  bg: string;
  figures: CurtainFigure[];
  /** 右侧竖排文字（每屏都有，多列） */
  lines: string[];
}

/** 结局档变体开篇（并入首屏文字首句） */
const OPENING: Record<EndingResult['tier'], string> = {
  excellent: '七日光阴，弹指而过。你以一手好画立在众人之前——却在此刻，比谁都清楚：这卷长画，才刚刚展开。',
  good: '七日光阴，弹指而过。你稳稳立住了脚跟，而这卷长画，正要在你眼前徐徐展开。',
  pass: '七日光阴，弹指而过。你勉力留了下来——根基尚浅，却已看见了旁人看不见的东西。',
  fail: '七日光阴，弹指而过。你走得踉跄，却到底没有离开这卷未完的长画。',
};

/**
 * 谢幕长卷（2026-07-10 明明·方案A 展卷）：镜头横向展开四屏画，四位主创背影逐屏消融入画。
 * 次序：嵩（嵩立舟头）→ 择端·李唐（二人对弈）→ 希孟（俯瞰山水）→ 定格青绿山水。
 * 文字右侧竖排、每屏都写足；化名安全（都城/大梁京，不出现汴京宣和）。
 */
export function buildCurtainCallPanels(tier: EndingResult['tier']): CurtainPanel[] {
  return [
    {
      bg: '/vignette-song-boat.png',
      figures: ['song'],
      lines: [
        OPENING[tier] ?? OPENING.pass,
        '嵩立于舟头，一篙点开满江烟水。',
        '他回身望你，没有多话，只将那管用秃了的旧笔递来——',
        '「画人先画骨，你还差着火候。往后的路，慢慢磨罢。」',
        '言罢转篙，舟影一点点没入苍茫。',
      ],
    },
    {
      bg: '/vignette-duel.png',
      figures: ['litang', 'zeduan'],
      lines: [
        '水阁之上，李唐与择端对坐手谈，落子铮然。',
        '李唐头也不抬：「山水一道，讲究一个『让』字——你且记着。」',
        '择端推枰起身，朝你长揖：「界画的门道，日后有的是时候同你细说。」',
        '二人相视一笑，身影渐渐隐入满室水墨。',
      ],
    },
    {
      bg: '/vignette-ximeng-cliff.png',
      figures: ['ximeng'],
      lines: [
        '崖畔风起，希孟负手远眺，怀里还抱着那卷未干的青绿。',
        '他侧过脸，眉眼间是你熟悉的、却终将追不上的少年意气。',
        '「这万里江山，我到底是画进去了。」',
        '「你若得空，替我把那条没走完的水路，走一走。」',
        '话音落处，他一步步走进自己画出的山河，身影融进石青石绿。',
      ],
    },
    {
      bg: '/bg-shanshui.png',
      figures: [],
      lines: [
        '四人次第入画，烟岚合拢，山河依旧。',
        '而你的故事，才刚在这卷长画上，落下第一笔。',
      ],
    },
  ];
}
