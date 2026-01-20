export type Language = "zh" | "en";

export type AffinityMetric = "affection" | "chemistry" | "understanding";

export type PhaseId =
  | "first_meet"
  | "ambiguous"
  | "confession"
  | "honeymoon"
  | "adjustment"
  | "stable";

export interface PhaseDefinition {
  id: PhaseId;
  name: string;
  description: string;
  targetEvents: number;
}

export interface PlayerProfile {
  name: string;
  gender: string;
  mbti: string;
  constellation: string;
  hobbies: string[];
  memory: string;
}

export interface LoverProfile {
  name: string;
  gender: string;
  mbti: string;
  constellation: string;
  traits: string[];
  hobbies: string[];
  signature: string;
}

export interface KeyInput {
  id: string;
  label: string;
  placeholder: string;
  value?: string;
}

export interface StoryChoice {
  id: string;
  text: string;
  effects: Partial<Record<AffinityMetric, number>>;
}

export interface StoryEvent {
  id: string;
  phase: PhaseId;
  title: string;
  prompt: string;
  keyInputs?: KeyInput[];
  choices: StoryChoice[];
}

export interface MetricsState {
  affection: number;
  chemistry: number;
  understanding: number;
}

export type EndingTier = "perfect" | "happy" | "neutral" | "regret" | "sad";

export interface EndingResult {
  tier: EndingTier;
  score: number;
  title: string;
  summary: string;
  mirrorInsight: string;
}

export interface ApiSettings {
  provider: "openai" | "gemini";
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface GameState {
  language: Language;
  phaseIndex: number;
  eventIndex: number;
  metrics: MetricsState;
  player: PlayerProfile;
  lover: LoverProfile;
  apiSettings: ApiSettings;
  notes: Record<string, string>;
  completed: boolean;
  mirrorMode: boolean;
}
