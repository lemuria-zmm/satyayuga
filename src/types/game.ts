export type Language = 'zh' | 'en';

export type StatScores = {
  affection: number;
  chemistry: number;
  understanding: number;
};

export type PlayerProfile = {
  name: string;
  gender: string;
  mbti: string;
  zodiac: string;
  hobbies: string[];
  memory: string;
};

export type PartnerProfile = {
  name: string;
  gender: string;
  mbti: string;
  zodiac: string;
  personalityTags: string[];
  hobbies: string[];
  specialNote: string;
};

export type ChoiceOption = {
  id: string;
  text: Record<Language, string>;
  statDelta: Partial<StatScores>;
  followUp?: Record<Language, string>;
};

export type EventNode = {
  id: string;
  title: Record<Language, string>;
  description: Record<Language, string>;
  promptKey?: string;
  choices: ChoiceOption[];
};

export type Stage = {
  id: string;
  title: Record<Language, string>;
  theme: Record<Language, string>;
  events: EventNode[];
};

export type MirrorEntry = {
  stageId: string;
  eventId: string;
  innerMonologue: Record<Language, string>;
};

export type StageProgress = {
  stageIndex: number;
  eventIndex: number;
};

export type GameState = {
  player: PlayerProfile;
  partner: PartnerProfile;
  stats: StatScores;
  stageProgress: StageProgress;
  language: Language;
  mirrorUnlocked: boolean;
};

export type ApiConfig = {
  provider: 'openai' | 'gemini' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
};
