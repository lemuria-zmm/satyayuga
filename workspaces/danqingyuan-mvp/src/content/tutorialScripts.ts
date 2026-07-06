import type { GameState, LocationId, SkillId, TimeSlot } from '../types';

/**
 * 固定引导脚本池（拍板：引导对话用固定脚本，不走 LLM）。
 * 三处使用：① 入院小书童介绍（画院/课表/导师/目标）② 第 1 日小书童午间/晚间引导 ③ 希孟书房首场。
 * 上午/下午改静默解锁（2026-06-11 拍板：减少打断，让玩家沉浸文字）。
 */
export interface GuideScript {
  id: string;
  speakerName: string;
  /** 立绘路径（public/char/） */
  portrait: string;
  /** 可选场景背景图（public/）：设了则铺满作背景、不再单独渲染半身立绘（如希孟书房初遇，图里已有希孟） */
  sceneImage?: string;
  /** 逐句点击推进 */
  lines: string[];
  /** 末句按钮文案 */
  endButton: string;
}

export interface GuideStep {
  script: GuideScript;
  /** 收尾时落的旗标 */
  flagsSet: Record<string, boolean>;
  /** 收尾时解锁的去处 */
  unlockLocations?: LocationId[];
  /** 收尾后续：希孟首场接自由对话 */
  after?: 'ximeng_chat';
}

/** 第 2 日起全开放的基础去处（秘阁/希孟画室仍按主线 gate） */
export const BASE_LOCATIONS: LocationId[] = ['hall', 'library', 'garden', 'market', 'dining_hall', 'dormitory'];

export const TUTORIAL_SLOT_FLAGS: Record<string, string> = {
  forenoon: 'tutorial_forenoon_done',
  noon: 'tutorial_noon_done',
  afternoon: 'tutorial_afternoon_done',
  evening: 'tutorial_evening_done',
};

const SHUTONG_PORTRAIT = '/char/char-shutong-smile.png';

/** 本科导师介绍差分句（2026-06-11 拍板：山水/画理=李唐，人物=嵩，界画=择端） */
const MAJOR_LINE_BY_STYLE: Record<SkillId, string> = {
  landscape: '你本科是山水，正是总教习李唐先生亲自带——好造化，戒尺也离得近，自己掂量。',
  figure: '你本科是人物，往后多在嵩先生跟前用功便是，他最看重肯下笨功夫的学子。',
  architecture: '你本科是界画，择端先生为人随和，不懂只管问，他能从一根椽子讲到半座汴京。',
};

/** 入院小书童介绍：画院背景 → 作息课表 → 三导师 + 特招讲师希孟 → 入学目标 → 去排课表 */
function buildShutongAdmissionScript(styleOrigin: SkillId): GuideScript {
  return {
    id: 'shutong_admission',
    speakerName: '小书童',
    portrait: SHUTONG_PORTRAIT,
    lines: [
      '诶——你就是今日新来的学子罢？我是院里的小书童，扫地、研墨、传话，院里大小事问我准没错。',
      '咱们丹青院是奉旨设的画院，天下习画的人挤破头想进来。这院堂便是日后点卯、晨课、听训的地方。',
      '院中一日分五段：晨课、上午、午间、下午、晚间。晨课必到，其余辰光怎么用，全看你自己。',
      '晨课的课业由你自排六日，呈给总教习过目。第七日是丹青试——考砸了，可没处哭去。',
      '教习有三位。总教习李唐先生，山水、画理都是他亲授，戒尺不认生人，课上别打瞌睡。',
      '人物课是嵩先生——一位中年画师，画人的功夫院里没几个及得上，眼睛毒得很。',
      '界画课是择端先生，整日往街市跑，桥梁屋宇过目不忘，他课上能听见半个汴京的新鲜事。',
      MAJOR_LINE_BY_STYLE[styleOrigin],
      '对了，院里还有位特招的讲师，唤作希孟。不授课，常独自待在书房画自己的画——等你去书房，兴许就遇上了。',
      '七日后丹青试见真章。想站稳脚跟，先把课表排明白——走，我领你去。',
    ],
    endButton: '去排课表',
  };
}

/** 第 1 日时段引导：仅午间/晚间出场（上午/下午静默解锁） */
const SHUTONG_SLOT_SCRIPTS: Partial<Record<TimeSlot, GuideScript>> = {
  noon: {
    id: 'shutong_noon',
    speakerName: '小书童',
    portrait: SHUTONG_PORTRAIT,
    lines: [
      '响午了响午了！学子，该用午膳了。',
      '院里的食堂在东廊尽头，午间饭食按例收几枚钱文，管饱——炊饼豆羹、灌浆馒头，今日有什么吃什么。',
      '吃饱了下午才有气力握笔。同僚们也都在食堂，闲话比饭菜还热乎。',
    ],
    endButton: '去用午膳',
  },
  evening: {
    id: 'shutong_evening',
    speakerName: '小书童',
    portrait: SHUTONG_PORTRAIT,
    lines: [
      '你回宿舍了？正好，你的铺位在西舍这间，被褥我晌午就给你晒过了。',
      '今日逛也逛了、玩也玩了，乏了就早些歇下罢——一觉睡到明日晨课，气力才足。',
      '明日晨课可别迟了，总教习的戒尺不认生人。睡前把灯吹了。',
    ],
    endButton: '这就歇下',
  },
};

/** 第 1 日静默解锁（上午/下午/晚间不弹引导，右栏灰牌直接亮起；晚间小书童叮嘱改到「回宿舍时」才弹，见 getActiveGuideStep） */
const SILENT_SLOT_UNLOCKS: Partial<Record<TimeSlot, { flagId: string; locations: LocationId[] }>> = {
  forenoon: { flagId: 'tutorial_forenoon_done', locations: ['library', 'garden'] },
  afternoon: { flagId: 'tutorial_afternoon_done', locations: ['market'] },
  // 晚间静默解锁宿舍：玩家先自由玩晚间沙盒，回宿舍就寝前小书童才弹叮嘱（2026-06-18）
  evening: { flagId: 'tutorial_evening_unlocked', locations: ['dormitory'] },
};

/** 当前时段应静默解锁的内容（App 在 state 变化时调用，随时可应用，不依赖场景状态） */
export function getSilentSlotUnlock(state: GameState): { flagsSet: Record<string, boolean>; unlockLocations: LocationId[] } | null {
  if (!state.progress.flags.admitted || !state.curriculum || state.time.day !== 1) return null;
  const entry = SILENT_SLOT_UNLOCKS[state.time.timeSlot];
  if (!entry || state.progress.flags[entry.flagId]) return null;
  return { flagsSet: { [entry.flagId]: true }, unlockLocations: entry.locations };
}

/** 希孟书房首场（走进书房掷点遇上才触发；收尾接自由对话，此后主界面希孟便签常驻可点） */
const XIMENG_FIRST_MEET: GuideScript = {
  id: 'ximeng_first_meet',
  speakerName: '希孟',
  portrait: '/char/char-ximeng-calm.png',
  sceneImage: '/scene-himeng-first-meet.png',
  lines: [
    '书房尽头的窗下，立着一个青衣的背影。少年身量不高，肩背却挺得笔直，正低头对着案上一卷长长的青绿设色出神，连你进门也没察觉。',
    '日光从糊窗的纸上漏下来，照得那卷山水里的石青石绿微微发亮。他执笔的手悬在半空，许久没有落下——仿佛整座书房的安静，都是为了护住他笔尖那一点将落未落的念头。',
    '你的心跳忽然漏了一拍。这个背影、这卷画……你比这院里任何人都清楚他是谁，也清楚这卷画日后会有怎样的名声——更清楚，画成之后，他便会从所有记载里悄然消失，再无下落。',
    '那个堵了你一千年的疑问，此刻近在咫尺。你定了定神：谜底，或许就从眼前这个尚不知情的少年开始。你想上前，与他说说话。',
  ],
  endButton: '上前攀谈',
};

/**
 * 当前应播的引导步骤（引擎判定，App 在无场景/无弹层时调用）：
 * 入院小书童介绍 → 第 1 日午间/晚间小书童 → 书房希孟首场。
 */
export function getActiveGuideStep(state: GameState): GuideStep | null {
  const { flags } = state.progress;
  if (!flags.admitted) return null;

  // ① 入院小书童介绍（收尾落 intro_tour_done，进课表页）
  if (!flags.intro_tour_done) {
    return {
      script: buildShutongAdmissionScript(state.player.styleOrigin),
      flagsSet: { intro_tour_done: true },
    };
  }
  if (!state.curriculum) return null;

  // ② 第 1 日午间引导（slot 开头弹，引向食堂用膳）；上午/下午/晚间静默解锁
  if (state.time.day === 1) {
    const noonFlag = TUTORIAL_SLOT_FLAGS.noon;
    if (state.time.timeSlot === 'noon' && !flags[noonFlag]) {
      return { script: SHUTONG_SLOT_SCRIPTS.noon!, flagsSet: { [noonFlag]: true }, unlockLocations: ['dining_hall'] };
    }
    // 晚间叮嘱改到「玩家回到宿舍时」才弹（2026-06-18）：晚间开头静默解锁宿舍，玩家自由玩消遣，
    // 走回宿舍 → 小书童叮嘱该歇了 → 关掉看见「就寝」签 → 一日终。治"刚吃完饭就提示睡觉"的跳跃感。
    const eveningFlag = TUTORIAL_SLOT_FLAGS.evening;
    if (state.time.timeSlot === 'evening' && state.currentLocation === 'dormitory' && !flags[eveningFlag]) {
      return { script: SHUTONG_SLOT_SCRIPTS.evening!, flagsSet: { [eveningFlag]: true } };
    }
  }

  // ③ 希孟书房首场（不再固定首次进书房触发：走进书房时引擎掷点，掷中才落 ximeng_in_library）
  if (state.currentLocation === 'library' && flags.ximeng_in_library && !flags.metXimeng) {
    return { script: XIMENG_FIRST_MEET, flagsSet: { metXimeng: true, ximeng_in_library: false }, after: 'ximeng_chat' };
  }

  return null;
}
