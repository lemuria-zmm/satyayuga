import { Stage } from '../types/game';

export const stages: Stage[] = [
  {
    id: 'first-meet',
    title: { zh: '初识', en: 'First Meet' },
    theme: { zh: '第一印象与心动信号', en: 'First impressions and sparks' },
    events: [
      {
        id: 'cafe-encounter',
        title: { zh: '咖啡馆偶遇', en: 'Cafe encounter' },
        description: {
          zh: '你在街角咖啡馆遇见了对方，对方正在为一本书出神。',
          en: 'You spot them in a corner cafe, lost in a book.',
        },
        promptKey: 'meetingPlace',
        choices: [
          {
            id: 'greet',
            text: { zh: '礼貌问候', en: 'Offer a polite greeting' },
            statDelta: { affection: 6, chemistry: 4 },
          },
          {
            id: 'share',
            text: { zh: '分享同一本书', en: 'Talk about the same book' },
            statDelta: { affection: 5, understanding: 6 },
          },
          {
            id: 'smile',
            text: { zh: '静静微笑', en: 'Smile quietly' },
            statDelta: { chemistry: 5 },
          },
          {
            id: 'leave',
            text: { zh: '留下便条后离开', en: 'Leave a note and walk away' },
            statDelta: { affection: 4, understanding: 2 },
          },
        ],
      },
    ],
  },
  {
    id: 'ambiguous',
    title: { zh: '暧昧', en: 'Ambiguous' },
    theme: { zh: '试探与心动', en: 'Signals and uncertainty' },
    events: [
      {
        id: 'late-night-chat',
        title: { zh: '深夜聊天', en: 'Late-night chat' },
        description: {
          zh: '你们分享最近的心事，对方第一次透露了不安。',
          en: 'You share worries, and they admit a quiet fear.',
        },
        choices: [
          {
            id: 'comfort',
            text: { zh: '温柔安慰', en: 'Offer gentle comfort' },
            statDelta: { affection: 5, understanding: 5 },
          },
          {
            id: 'joke',
            text: { zh: '轻松玩笑', en: 'Light-hearted joke' },
            statDelta: { chemistry: 6 },
          },
          {
            id: 'ask',
            text: { zh: '追问原因', en: 'Ask for the reason' },
            statDelta: { understanding: 6 },
          },
          {
            id: 'space',
            text: { zh: '给对方空间', en: 'Give them space' },
            statDelta: { affection: 3 },
          },
        ],
      },
    ],
  },
];
