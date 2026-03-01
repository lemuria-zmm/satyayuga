export type Lang = "zh" | "en";

export type Screen = "welcome" | "setup" | "game" | "ending" | "mirror";

export interface SetupData {
  me: {
    name: string;
    gender: string;
    mbti: string;
    star: string;
    hobbies: string[];
    specialMemory: string;
  };
  lover: {
    name: string;
    gender: string;
    mbti: string;
    star: string;
    hobbies: string[];
    traits: string[];
    specialSetting: string;
  };
  api: {
    provider: "none" | "openai" | "gemini" | string;
    apiKey: string;
    model: string;
  };
}

export interface Metrics {
  affection: number;
  chemistry: number;
  understanding: number;
}

export interface PromptInput {
  key: string;
  label: string;
  placeholder: string;
  value: string;
}

export interface HistoryItem {
  stage: string;
  eventId: string;
  scene: string;
  choice: string;
  reply: string;
  inner: string;
  metrics: Metrics;
}

export interface GameState {
  currentEvent: number;
  focusedOption: number;
  metrics: Metrics;
  logs: Array<{ role: "system" | "narration" | "player" | "lover"; text: string }>;
  history: HistoryItem[];
  memory: Record<string, string>;
  promptInput: PromptInput | null;
  aiBusy: boolean;
}

export interface EndingState {
  key: "perfect" | "happy" | "normal" | "regret" | "sad";
  score: number;
  title: string;
  desc: string;
  story: string;
  polished: boolean;
}

export interface StageStats {
  stageOrder: string[];
  currentStage: string;
  stageIndex: number;
}

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (path: string) => any;
  tr: (zhText: string, enText: string) => string;
}
