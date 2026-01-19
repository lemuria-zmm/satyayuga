import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ApiSettings,
  EndingResult,
  GameState,
  MetricsState,
  PlayerProfile,
  LoverProfile,
  StoryChoice,
} from "../types/game";
import { phases, storyEvents } from "../data/stages";

const STORAGE_KEY = "love-simulator-state";

const emptyMetrics: MetricsState = { affection: 50, chemistry: 50, understanding: 50 };

const emptyPlayer: PlayerProfile = {
  name: "",
  gender: "",
  mbti: "",
  constellation: "",
  hobbies: [],
  memory: "",
};

const emptyLover: LoverProfile = {
  name: "",
  gender: "",
  mbti: "",
  constellation: "",
  traits: [],
  hobbies: [],
  signature: "",
};

const emptyApi: ApiSettings = {
  provider: "openai",
  apiKey: "",
  baseUrl: "",
  model: "gpt-4o-mini",
};

const initialState: GameState = {
  language: "zh",
  phaseIndex: 0,
  eventIndex: 0,
  metrics: emptyMetrics,
  player: emptyPlayer,
  lover: emptyLover,
  apiSettings: emptyApi,
  notes: {},
  completed: false,
  mirrorMode: false,
};

interface GameContextValue {
  state: GameState;
  updatePlayer: (profile: PlayerProfile) => void;
  updateLover: (profile: LoverProfile) => void;
  updateApi: (settings: ApiSettings) => void;
  updateNote: (id: string, value: string) => void;
  applyChoice: (choice: StoryChoice) => void;
  nextEvent: () => void;
  toggleMirror: () => void;
  resetGame: () => void;
  currentEventId: string | null;
  ending: EndingResult | null;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const calculateEnding = (metrics: MetricsState): EndingResult => {
  const score = Math.round(metrics.affection * 0.4 + metrics.chemistry * 0.3 + metrics.understanding * 0.3);
  if (score >= 85) {
    return {
      tier: "perfect",
      score,
      title: "完美结局 · 灵魂伴侣",
      summary: "你们彼此懂得，像命中注定般契合。",
      mirrorInsight: "镜像视角揭示：恋人一直默默收集你的小习惯，才有了如此高的默契。",
    };
  }
  if (score >= 70) {
    return {
      tier: "happy",
      score,
      title: "幸福结局 · 稳定幸福",
      summary: "关系稳定向前，未来仍有无限可能。",
      mirrorInsight: "镜像视角揭示：对方在你的努力中找到了安全感。",
    };
  }
  if (score >= 50) {
    return {
      tier: "neutral",
      score,
      title: "普通结局 · 平淡陪伴",
      summary: "温和的陪伴让你们保持关系，但火花逐渐减弱。",
      mirrorInsight: "镜像视角揭示：恋人其实想要更多惊喜，却不知道如何开口。",
    };
  }
  if (score >= 30) {
    return {
      tier: "regret",
      score,
      title: "遗憾结局 · 最终分手",
      summary: "沟通不足让你们错过彼此。",
      mirrorInsight: "镜像视角揭示：对方的沉默是因为害怕打扰你。",
    };
  }
  return {
    tier: "sad",
    score,
    title: "悲伤结局 · 不欢而散",
    summary: "关系在误解中崩塌。",
    mirrorInsight: "镜像视角揭示：恋人其实仍留恋，只是失去了表达方式。",
  };
};

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return initialState;
    }
    try {
      return { ...initialState, ...JSON.parse(saved) } as GameState;
    } catch {
      return initialState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updatePlayer = (profile: PlayerProfile) => {
    setState((prev) => ({ ...prev, player: profile }));
  };

  const updateLover = (profile: LoverProfile) => {
    setState((prev) => ({ ...prev, lover: profile }));
  };

  const updateApi = (settings: ApiSettings) => {
    setState((prev) => ({ ...prev, apiSettings: settings }));
  };

  const updateNote = (id: string, value: string) => {
    setState((prev) => ({ ...prev, notes: { ...prev.notes, [id]: value } }));
  };

  const applyChoice = (choice: StoryChoice) => {
    setState((prev) => ({
      ...prev,
      metrics: {
        affection: clamp(prev.metrics.affection + (choice.effects.affection ?? 0)),
        chemistry: clamp(prev.metrics.chemistry + (choice.effects.chemistry ?? 0)),
        understanding: clamp(prev.metrics.understanding + (choice.effects.understanding ?? 0)),
      },
    }));
  };

  const nextEvent = () => {
    setState((prev) => {
      const nextEventIndex = prev.eventIndex + 1;
      const totalEvents = storyEvents.length;
      if (nextEventIndex >= totalEvents) {
        return { ...prev, completed: true };
      }
      const nextPhaseIndex = phases.findIndex(
        (phase) => phase.id === storyEvents[nextEventIndex].phase
      );
      return {
        ...prev,
        eventIndex: nextEventIndex,
        phaseIndex: nextPhaseIndex,
      };
    });
  };

  const toggleMirror = () => {
    setState((prev) => ({ ...prev, mirrorMode: !prev.mirrorMode }));
  };

  const resetGame = () => {
    setState(initialState);
  };

  const currentEvent = storyEvents[state.eventIndex];

  const ending = useMemo(() => {
    if (!state.completed) {
      return null;
    }
    return calculateEnding(state.metrics);
  }, [state.completed, state.metrics]);

  const value: GameContextValue = {
    state,
    updatePlayer,
    updateLover,
    updateApi,
    updateNote,
    applyChoice,
    nextEvent,
    toggleMirror,
    resetGame,
    currentEventId: currentEvent?.id ?? null,
    ending,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
};
