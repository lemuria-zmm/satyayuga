import { useEffect } from "react";
import type { GameState, Screen } from "../types";

type UseKeyboardControlsParams = {
  screen: Screen;
  game: GameState | null;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  setGame: React.Dispatch<React.SetStateAction<GameState | null>>;
  commitPromptInput: (value: string) => void;
  selectOption: (idx: number) => void;
};

export function useKeyboardControls({
  screen,
  game,
  setScreen,
  setGame,
  commitPromptInput,
  selectOption,
}: UseKeyboardControlsParams) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }

      if (screen === "ending" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setScreen("mirror");
        return;
      }

      if (screen !== "game" || !game) return;

      if (game.promptInput) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          commitPromptInput("");
        }
        return;
      }

      if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        setGame((prev) => (prev ? { ...prev, focusedOption: (prev.focusedOption + 3) % 4 } : prev));
      }

      if (["ArrowDown", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setGame((prev) => (prev ? { ...prev, focusedOption: (prev.focusedOption + 1) % 4 } : prev));
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectOption(game.focusedOption);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commitPromptInput, game, screen, selectOption, setGame, setScreen]);
}
