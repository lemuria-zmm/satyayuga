import type { EndingResult } from '../types';

/** 谢幕一行：文字 + 可选触发的角色背影（该行显示时对应角色入画消融） */
export interface CurtainLine {
  text: string;
  /** public/char/char-{key}-full-body-back.png */
  figure?: 'litang' | 'zeduan' | 'song' | 'ximeng';
}

/** 结局档变体开篇（复用 ending.tier；落第经补考保底过后 tier 已≠fail，留兜底） */
const OPENING: Record<EndingResult['tier'], string> = {
  excellent: '七日光阴，弹指而过。你以一手好画立在众人之前——可回望这几日，你记住的，远不止画。',
  good: '七日光阴，弹指而过。你稳稳立住了脚跟——而回望这几日，最难忘的，是院里那几位先生。',
  pass: '七日光阴，弹指而过。你勉力留了下来——根基尚浅，可这几日的人和事，已刻进了心里。',
  fail: '七日光阴，弹指而过。你走得踉跄，可回望这几日，那几位先生的模样，却分外清晰。',
};

/**
 * 谢幕回顾文案（2026-07-11 明明改：不提告别，只写玩家这几日对几位导师的了解与回顾）。
 * 保留四位背影逐一入画消融的视觉；文字为"你渐渐看懂了他们"的追忆，而非作别。
 * 顺序 李唐→择端→嵩→希孟(压轴)；化名安全。
 */
export function buildCurtainCallLines(tier: EndingResult['tier']): CurtainLine[] {
  return [
    { text: OPENING[tier] ?? OPENING.pass },
    { text: '这几日与你朝夕相处的人，一个个在你心里，落下了清晰的模样——' },
    {
      text: '总教习李唐，须发皆白，戒尺从不离手。可你渐渐看出，那一身严厉底下，是把山水看得比什么都重的一片痴心。',
      figure: 'litang',
    },
    {
      text: '择端先生整日往街市里钻，桥梁楼阁过目不忘。你才明白，他笔下从不是死物，而是半座都城活着的人间烟火。',
      figure: 'zeduan',
    },
    {
      text: '嵩先生话少，眼却毒。他总说画人要先看够活人——直到此刻你才懂，他要你画的，是人身上那些补不起的破洞。',
      figure: 'song',
    },
    {
      text: '还有那位青衣少年希孟，独来独往，一卷青绿能画到废寝忘食。你始终看不透他，却莫名想护住他笔尖那点将落未落的念头。',
      figure: 'ximeng',
    },
    { text: '七日太短，你对他们的了解，其实才刚刚开始。' },
    { text: '这些人，这座画院，都还在你尚未画完的长卷里，等着你一笔一笔，慢慢看清。' },
  ];
}
