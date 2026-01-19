import { PhaseDefinition, StoryEvent } from "../types/game";

export const phases: PhaseDefinition[] = [
  {
    id: "first_meet",
    name: "初识",
    description: "第一印象与初次交流",
    targetEvents: 4,
  },
  {
    id: "ambiguous",
    name: "暧昧",
    description: "若即若离与心动信号",
    targetEvents: 4,
  },
  {
    id: "confession",
    name: "确认关系",
    description: "表白时机与承诺",
    targetEvents: 3,
  },
  {
    id: "honeymoon",
    name: "热恋",
    description: "甜蜜约会与深入了解",
    targetEvents: 4,
  },
  {
    id: "adjustment",
    name: "磨合",
    description: "分歧冲突与沟通考验",
    targetEvents: 4,
  },
  {
    id: "stable",
    name: "稳定期/危机",
    description: "未来规划与关系定型",
    targetEvents: 4,
  },
];

export const storyEvents: StoryEvent[] = [
  {
    id: "meet_place",
    phase: "first_meet",
    title: "第一次见面",
    prompt: "你们在{place}相遇，气氛微妙而温暖。",
    keyInputs: [
      {
        id: "place",
        label: "见面地点",
        placeholder: "例如：旧书店 / 咖啡馆",
      },
    ],
    choices: [
      {
        id: "ice_break",
        text: "主动分享一个小故事",
        effects: { affection: 4, chemistry: 2 },
      },
      {
        id: "observe",
        text: "安静倾听，对方更自在",
        effects: { understanding: 4 },
      },
      {
        id: "humor",
        text: "用幽默化解紧张",
        effects: { chemistry: 4 },
      },
      {
        id: "polite",
        text: "保持礼貌距离",
        effects: { affection: 2, understanding: 1 },
      },
    ],
  },
  {
    id: "movie_date",
    phase: "ambiguous",
    title: "一起看电影",
    prompt: "你们约好去看{movie}，座位贴得很近。",
    keyInputs: [
      {
        id: "movie",
        label: "电影名",
        placeholder: "例如：春日恋歌",
      },
    ],
    choices: [
      {
        id: "snack",
        text: "分享零食，顺势靠近",
        effects: { affection: 3, chemistry: 2 },
      },
      {
        id: "comment",
        text: "认真聊剧情，拉近默契",
        effects: { chemistry: 4 },
      },
      {
        id: "observe",
        text: "注意对方情绪变化",
        effects: { understanding: 3 },
      },
      {
        id: "tease",
        text: "轻轻打趣对方",
        effects: { affection: 2, chemistry: 2 },
      },
    ],
  },
  {
    id: "confession_spot",
    phase: "confession",
    title: "告白时刻",
    prompt: "你选择在{confession_spot}表达心意。",
    keyInputs: [
      {
        id: "confession_spot",
        label: "告白地点",
        placeholder: "例如：天台 / 海边",
      },
    ],
    choices: [
      {
        id: "direct",
        text: "直白表达感受",
        effects: { affection: 4, chemistry: 1 },
      },
      {
        id: "gentle",
        text: "温柔询问对方想法",
        effects: { understanding: 4 },
      },
      {
        id: "creative",
        text: "准备惊喜仪式感",
        effects: { affection: 3, chemistry: 2 },
      },
      {
        id: "pause",
        text: "给彼此时间沉淀",
        effects: { understanding: 2, chemistry: 1 },
      },
    ],
  },
  {
    id: "honeymoon_trip",
    phase: "honeymoon",
    title: "第一次旅行",
    prompt: "你们决定去{destination}旅行。",
    keyInputs: [
      {
        id: "destination",
        label: "目的地",
        placeholder: "例如：京都 / 巴厘岛",
      },
    ],
    choices: [
      {
        id: "plan",
        text: "提前规划行程",
        effects: { chemistry: 3, understanding: 2 },
      },
      {
        id: "spontaneous",
        text: "随性探索惊喜",
        effects: { affection: 2, chemistry: 3 },
      },
      {
        id: "care",
        text: "关注对方舒适度",
        effects: { understanding: 4 },
      },
      {
        id: "capture",
        text: "记录每个瞬间",
        effects: { affection: 3 },
      },
    ],
  },
  {
    id: "conflict",
    phase: "adjustment",
    title: "争执出现",
    prompt: "因为{conflict_reason}你们产生分歧。",
    keyInputs: [
      {
        id: "conflict_reason",
        label: "争执原因",
        placeholder: "例如：时间安排 / 消息回复",
      },
    ],
    choices: [
      {
        id: "listen",
        text: "先倾听对方诉求",
        effects: { understanding: 4 },
      },
      {
        id: "apology",
        text: "主动道歉缓和气氛",
        effects: { affection: 2, chemistry: 1 },
      },
      {
        id: "explain",
        text: "表达自己的界限",
        effects: { chemistry: 2, understanding: 2 },
      },
      {
        id: "pause",
        text: "暂时冷静再沟通",
        effects: { understanding: 1 },
      },
    ],
  },
  {
    id: "future_plan",
    phase: "stable",
    title: "未来规划",
    prompt: "你们讨论{future_topic}，关系走向清晰。",
    keyInputs: [
      {
        id: "future_topic",
        label: "未来规划关键词",
        placeholder: "例如：同居 / 职业选择",
      },
    ],
    choices: [
      {
        id: "align",
        text: "寻找共同目标",
        effects: { chemistry: 3, understanding: 2 },
      },
      {
        id: "support",
        text: "表达支持与承诺",
        effects: { affection: 4 },
      },
      {
        id: "negotiate",
        text: "讨论彼此边界",
        effects: { understanding: 3 },
      },
      {
        id: "vision",
        text: "描绘幸福画面",
        effects: { affection: 2, chemistry: 2 },
      },
    ],
  },
];
