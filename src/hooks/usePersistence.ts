import { useCallback, useEffect, useRef } from "react";
import { EVENTS, KEY_INPUT_LIBRARY, STORAGE_KEYS } from "../gameData";
import type { EndingState, GameState, Lang, Screen, SetupData } from "../types";
import { computeStageStats } from "../utils/gameUtils";
import { readStorage, writeStorage } from "../utils/storage";

type UsePersistenceParams = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  screen: Screen;
  setup: SetupData;
  game: GameState | null;
  ending: EndingState | null;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  setSetup: React.Dispatch<React.SetStateAction<SetupData>>;
  setGame: React.Dispatch<React.SetStateAction<GameState | null>>;
  setEnding: React.Dispatch<React.SetStateAction<EndingState | null>>;
  setAiNotice: React.Dispatch<React.SetStateAction<string>>;
  setProgressExists: React.Dispatch<React.SetStateAction<boolean>>;
  resolveTemplate: (text: string, ext?: Record<string, string>, setupSnapshot?: SetupData, gameSnapshot?: GameState | null) => string;
};

export function usePersistence({
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
}: UsePersistenceParams) {
  const stateRef = useRef<{ screen: Screen; lang: Lang; game: GameState | null; ending: EndingState | null }>({
    screen,
    lang,
    game,
    ending,
  });

  useEffect(() => {
    writeStorage(STORAGE_KEYS.setup, setup);
  }, [setup]);

  useEffect(() => {
    if (!game) return;
    writeStorage(STORAGE_KEYS.progress, { game, setup, lang, screen, ending });
    setProgressExists(true);
  }, [ending, game, lang, screen, setProgressExists, setup]);

  useEffect(() => {
    if (screen !== "game") return;
    setGame((prev) => {
      if (!prev) return prev;
      const event = EVENTS[prev.currentEvent] as any;
      if (!event?.keyInput) return prev;
      if (prev.memory[event.keyInput] || prev.promptInput) return prev;
      const slot = KEY_INPUT_LIBRARY[event.keyInput][lang];
      return {
        ...prev,
        promptInput: {
          key: event.keyInput,
          label: slot.label,
          placeholder: slot.placeholder,
          value: "",
        },
      };
    });
  }, [lang, screen, game?.currentEvent, setGame]);

  useEffect(() => {
    document.body.classList.toggle("mirror-mode", screen === "mirror");
  }, [screen]);

  useEffect(() => {
    stateRef.current = { screen, lang, game, ending };
  }, [ending, game, lang, screen]);

  useEffect(() => {
    window.render_game_to_text = () => {
      const current = stateRef.current;
      const event = current.game ? (EVENTS[current.game.currentEvent] as any) : null;
      const currentSceneText =
        current.screen === "game" && event
          ? resolveTemplate(event.scene[current.lang], {}, setup, current.game)
          : null;

      const payload = {
        screen: current.screen,
        coordinate_system:
          current.lang === "zh" ? "文本恋爱模式（无空间坐标）" : "Text romance mode (no spatial coordinates)",
        lang: current.lang,
        stage: current.game ? computeStageStats(current.game.currentEvent).currentStage : null,
        event_index: current.game ? current.game.currentEvent : null,
        metrics: current.game ? current.game.metrics : null,
        current_prompt: currentSceneText,
        options:
          current.screen === "game" && event
            ? event.choices.map((x: any) => resolveTemplate(x.text[current.lang], {}, setup, current.game))
            : null,
        ending: current.ending ? current.ending.title : null,
        mirror_events: current.game ? current.game.history.length : 0,
      };
      return JSON.stringify(payload, null, 2);
    };

    window.advanceTime = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [resolveTemplate, setup]);

  const loadProgress = useCallback(() => {
    const progress = readStorage<any>(STORAGE_KEYS.progress, null);
    if (!progress || !progress.game || !progress.setup) return false;
    setGame(progress.game as GameState);
    setSetup(progress.setup as SetupData);
    if (progress.lang && progress.lang !== lang) setLang(progress.lang as Lang);
    setScreen((progress.screen as Screen) || "game");
    setEnding((progress.ending as EndingState) || null);
    setAiNotice("");
    setProgressExists(true);
    return true;
  }, [lang, setAiNotice, setEnding, setGame, setLang, setProgressExists, setScreen, setSetup]);

  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.progress);
    setProgressExists(false);
  }, [setProgressExists]);

  return {
    loadProgress,
    clearProgress,
  };
}
