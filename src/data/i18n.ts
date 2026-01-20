import { Language } from '../types/game';

export const defaultLanguage: Language = 'zh';

export const translations = {
  zh: {
    title: '恋人模拟器',
    subtitle: '你的故事，从心动开始。',
    start: '开始你的爱情故事',
    stage: '阶段',
    stats: {
      affection: '好感度',
      chemistry: '默契值',
      understanding: '理解度',
    },
    choice: '你的选择',
    mirror: '查看真相',
  },
  en: {
    title: 'Love Simulator',
    subtitle: 'Your story begins with a heartbeat.',
    start: 'Start your love story',
    stage: 'Stage',
    stats: {
      affection: 'Affection',
      chemistry: 'Chemistry',
      understanding: 'Understanding',
    },
    choice: 'Your choice',
    mirror: 'Reveal the truth',
  },
};
