import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "./contexts/LanguageContext";
import { useGame } from "./contexts/GameContext";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { SetupWizard } from "./components/SetupWizard";
import { GameScreen } from "./components/GameScreen";
import { EndingScreen } from "./components/EndingScreen";

export const App = () => {
  const { t } = useLanguage();
  const { state } = useGame();
  const [stage, setStage] = useState<"welcome" | "setup" | "game" | "ending">("welcome");

  const handleStart = () => setStage("setup");
  const handleSetupComplete = () => setStage("game");

  return (
    <div className={state.mirrorMode ? "app mirror" : "app"}>
      <header className="app-header">
        <div>
          <h1>{t("title")}</h1>
          <p className="subtitle">AI 剧情驱动的双语恋爱冒险</p>
        </div>
      </header>
      <main className="app-content">
        <AnimatePresence mode="wait">
          {stage === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <WelcomeScreen onStart={handleStart} />
            </motion.div>
          )}
          {stage === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <SetupWizard onComplete={handleSetupComplete} />
            </motion.div>
          )}
          {stage === "game" && (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
            >
              {state.completed ? <EndingScreen onReset={() => setStage("welcome")} /> : <GameScreen />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
