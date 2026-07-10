import type { EndingResult } from '../types';

/** 谢幕一行：文字 + 可选触发的角色背影（该行显示时对应角色入画谢幕） */
export interface CurtainLine {
  text: string;
  /** public/char/char-{key}-full-body-back.png */
  figure?: 'litang' | 'zeduan' | 'song' | 'ximeng';
}

/** 结局档变体开篇（复用 ending.tier；落第经补考保底过后 tier 已≠fail，留兜底） */
const OPENING: Record<EndingResult['tier'], string> = {
  excellent: '七日光阴，弹指而过。你以一手好画立在众人之前——可落幕这一刻，你比谁都清楚：真正的长卷，才刚刚展开。',
  good: '七日光阴，弹指而过。你稳稳立住了脚跟，而这画院的故事，正要在你眼前徐徐铺展。',
  pass: '七日光阴，弹指而过。你勉力留了下来——根基尚浅，却已看见了旁人看不见的东西。',
  fail: '七日光阴，弹指而过。你走得踉跄，却到底没有离开这卷未完的长画。',
};

/**
 * 谢幕落幕文案（2026-07-10 固定模板）：结局档开篇 → 引子 → 四位主创依次入画致意 → 落幕。
 * 四人顺序 李唐→择端→嵩→希孟(压轴)；不出现真名地名（化名：都城/大梁京）。
 */
export function buildCurtainCallLines(tier: EndingResult['tier']): CurtainLine[] {
  return [
    { text: OPENING[tier] ?? OPENING.pass },
    { text: '此刻，与你同度七日的人，一个个向这卷长画作别——' },
    {
      text: '总教习李唐负手转身，步入他画了一辈子的千山万壑。山高水长，他没有回头，只把一句"好造化"留在了风里。',
      figure: 'litang',
    },
    {
      text: '择端最后望了一眼那座不夜的桥市，抬脚踏进桥影深处，将半座都城的喧闹与烟火，一并带走了。',
      figure: 'zeduan',
    },
    {
      text: '嵩收起画囊，朝你微一颔首，转身没入烟树。临行只留一句：肯下笨功夫的人，早晚画得出人心。',
      figure: 'song',
    },
    {
      text: '最后是那位青衣少年。他抱着尚未干透的青绿长卷，回眸看了你一眼，便一步步走进自己画出的江山里——身影渐渐融进石青石绿，再也分不清，是人，还是画。',
      figure: 'ximeng',
    },
    { text: '四人次第入画，烟岚合拢，山河依旧。' },
    { text: '而你的故事，才刚在这卷长画上，落下第一笔。' },
  ];
}
