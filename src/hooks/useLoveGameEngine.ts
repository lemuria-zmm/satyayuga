import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_SETUP, EVENTS, STORAGE_KEYS } from "../gameData";
import type { EndingState, GameState, Lang, Screen, SetupData } from "../types";
import { computeStageStats, deepSet } from "../utils/gameUtils";
import { readStorage } from "../utils/storage";
import { useKeyboardControls } from "./useKeyboardControls";
import { useNarrativeFlow } from "./useNarrativeFlow";
import { usePersistence } from "./usePersistence";

type UseLoveGameEngineOptions = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (path: string) => any;
  tr: (zhText: string, enText: string) => string;
};

export function useLoveGameEngine({ lang, setLang, t, tr }: UseLoveGameEngineOptions) {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [setup, setSetup] = useState<SetupData>(() => readStorage<SetupData>(STORAGE_KEYS.setup, structuredClone(DEFAULT_SETUP)));
  const [setupStep, setSetupStep] = useState(0);
  const [game, setGame] = useState<GameState | null>(null);
  const [ending, setEnding] = useState<EndingState | null>(null);
  const [aiNotice, setAiNotice] = useState("");
  const [progressExists, setProgressExists] = useState(() => Boolean(readStorage(STORAGE_KEYS.progress, null)));

  const chatRef = useRef<HTMLElement | null>(null);

  const {
    resolveTemplate,
    startNewGame,
    selectOption,
    commitPromptInput,
    onQuickStart,
  } = useNarrativeFlow({
    lang,
    t,
    tr,
    screen,
    setup,
    game,
    setSetup,
    setGame,
    setScreen,
    setSetupStep,
    setEnding,
    setAiNotice,
  });

  const { loadProgress, clearProgress } = usePersistence({
    lang,
    setLang,
    screen,
    setup,
    game,
    ending,
    setScreen,
    setSetup,
    setGame,
    setEnding,
    setAiNotice,
    setProgressExists,
    resolveTemplate,
  });

  useKeyboardControls({
    screen,
    game,
    setScreen,
    setGame,
    commitPromptInput,
    selectOption,
  });

  useEffect(() => {
    if (screen === "game" && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [game?.logs.length, game?.currentEvent, screen]);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.progress);
    localStorage.removeItem(STORAGE_KEYS.setup);
    setSetup(structuredClone(DEFAULT_SETUP));
    setGame(null);
    setEnding(null);
    setAiNotice("");
    setSetupStep(0);
    setScreen("welcome");
    setProgressExists(false);
  }, []);

  const toggleTag = useCallback((path: string, value: string) => {
    setSetup((prev) => {
      const keys = path.split(".");
      let arr: any = prev;
      for (const key of keys) arr = arr[key];
      const nextArr = arr.includes(value) ? arr.filter((x: string) => x !== value) : [...arr, value];
      return deepSet(prev, path, nextArr);
    });
  }, []);

  const updateSetupField = useCallback((path: string, value: string) => {
    setSetup((prev) => deepSet(prev, path, value));
  }, []);

  const currentEvent = game ? ((EVENTS[game.currentEvent] as any) || null) : null;
  const sceneText = currentEvent ? resolveTemplate(currentEvent.scene[lang]) : "";
  const stageStats = game ? computeStageStats(game.currentEvent) : null;

  const onContinue = useCallback(() => {
    loadProgress();
  }, [loadProgress]);

  const onRestartStory = useCallback(() => {
    clearProgress();
    startNewGame();
  }, [clearProgress, startNewGame]);

  return {
    screen,
    setScreen,
    setup,
    setupStep,
    setSetupStep,
    game,
    ending,
    aiNotice,
    progressExists,
    chatRef,
    resolveTemplate,
    currentEvent,
    sceneText,
    stageStats,
    startNewGame,
    onContinue,
    onQuickStart,
    onRestartStory,
    resetAll,
    toggleTag,
    updateSetupField,
    selectOption,
    commitPromptInput,
  };
}
