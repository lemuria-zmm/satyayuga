import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ApiConfig, GameState, StatScores } from '../types/game';
import { defaultLanguage } from '../data/i18n';

const STORAGE_KEY = 'love-simulator-state';
const API_KEY = 'love-simulator-api';

const defaultStats: StatScores = {
  affection: 50,
  chemistry: 50,
  understanding: 50,
};

const defaultState: GameState = {
  player: {
    name: '玩家',
    gender: '未知',
    mbti: 'INFP',
    zodiac: '天秤座',
    hobbies: ['阅读', '音乐'],
    memory: '我有一只叫豆豆的猫。',
  },
  partner: {
    name: '恋人',
    gender: '未知',
    mbti: 'ENFJ',
    zodiac: '双鱼座',
    personalityTags: ['温柔', '阳光'],
    hobbies: ['电影', '旅行'],
    specialNote: '她总是戴着红围巾。',
  },
  stats: defaultStats,
  stageProgress: {
    stageIndex: 0,
    eventIndex: 0,
  },
  language: defaultLanguage,
  mirrorUnlocked: false,
};

const defaultApiConfig: ApiConfig = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

type GameContextValue = {
  state: GameState;
  apiConfig: ApiConfig;
  updateState: (partial: Partial<GameState>) => void;
  updateStats: (partial: Partial<StatScores>) => void;
  updateApiConfig: (partial: Partial<ApiConfig>) => void;
  resetProgress: () => void;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

const loadState = (): GameState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;
  try {
    const parsed = JSON.parse(raw) as GameState;
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
};

const loadApiConfig = (): ApiConfig => {
  const raw = localStorage.getItem(API_KEY);
  if (!raw) return defaultApiConfig;
  try {
    const parsed = JSON.parse(raw) as ApiConfig;
    return { ...defaultApiConfig, ...parsed };
  } catch {
    return defaultApiConfig;
  }
};

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<GameState>(() => loadState());
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => loadApiConfig());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(API_KEY, JSON.stringify(apiConfig));
  }, [apiConfig]);

  const updateState = (partial: Partial<GameState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const updateStats = (partial: Partial<StatScores>) => {
    setState((prev) => ({
      ...prev,
      stats: { ...prev.stats, ...partial },
    }));
  };

  const updateApiConfig = (partial: Partial<ApiConfig>) => {
    setApiConfig((prev) => ({ ...prev, ...partial }));
  };

  const resetProgress = () => {
    setState((prev) => ({
      ...prev,
      stats: defaultStats,
      stageProgress: { stageIndex: 0, eventIndex: 0 },
      mirrorUnlocked: false,
    }));
  };

  const value = useMemo(
    () => ({
      state,
      apiConfig,
      updateState,
      updateStats,
      updateApiConfig,
      resetProgress,
    }),
    [state, apiConfig]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
