export const DEFAULT_SETUP = {
  me: {
    name: "",
    gender: "",
    mbti: "",
    star: "",
    hobbies: [],
    specialMemory: "",
  },
  lover: {
    name: "",
    gender: "",
    mbti: "",
    star: "",
    hobbies: [],
    traits: [],
    specialSetting: "",
  },
  api: {
    provider: "none",
    apiKey: "",
    model: "gpt-4.1-mini",
  },
};

export const DEFAULT_GAME = {
  currentEvent: 0,
  focusedOption: 0,
  metrics: {
    affection: 50,
    chemistry: 50,
    understanding: 50,
  },
  logs: [],
  history: [],
  memory: {},
  promptInput: null,
  aiBusy: false,
};

