import { AnimatePresence } from "framer-motion";
import TopBar from "./components/TopBar";
import { useLanguage } from "./context/LanguageContext";
import { EVENTS } from "./gameData";
import { useLoveGameEngine } from "./hooks/useLoveGameEngine";
import EndingScreen from "./screens/EndingScreen";
import GameScreen from "./screens/GameScreen";
import MirrorScreen from "./screens/MirrorScreen";
import SetupScreen from "./screens/SetupScreen";
import WelcomeScreen from "./screens/WelcomeScreen";

function App() {
  const { lang, setLang, t, tr } = useLanguage();

  const {
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
  } = useLoveGameEngine({ lang, setLang, t, tr });

  const screenView = (() => {
    if (screen === "welcome") {
      return (
        <WelcomeScreen
          t={t}
          progressExists={progressExists}
          onStart={() => setScreen("setup")}
          onQuickStart={onQuickStart}
          onContinue={onContinue}
          onReset={resetAll}
        />
      );
    }

    if (screen === "setup") {
      return (
        <SetupScreen
          t={t}
          tr={tr}
          setup={setup}
          setupStep={setupStep}
          updateSetupField={updateSetupField}
          toggleTag={toggleTag}
          onPrev={() => setSetupStep((s) => Math.max(0, s - 1))}
          onNext={() => {
            if (setupStep < 2) setSetupStep((s) => s + 1);
            else startNewGame();
          }}
        />
      );
    }

    if (screen === "game" && game && currentEvent && stageStats) {
      return (
        <GameScreen
          lang={lang}
          t={t}
          game={game}
          totalEvents={EVENTS.length}
          currentEvent={currentEvent}
          stageStats={stageStats}
          sceneText={sceneText}
          chatRef={chatRef}
          resolveTemplate={resolveTemplate}
          onSelectOption={selectOption}
          onCommitPrompt={commitPromptInput}
        />
      );
    }

    if (screen === "ending" && ending && game) {
      return (
        <EndingScreen
          t={t}
          ending={ending}
          game={game}
          aiNotice={aiNotice}
          onViewTruth={() => setScreen("mirror")}
          onRestart={onRestartStory}
          onBackHome={() => setScreen("welcome")}
        />
      );
    }

    if (screen === "mirror" && game) {
      return <MirrorScreen t={t} game={game} onBackEnding={() => setScreen("ending")} onRestart={onRestartStory} />;
    }

    return null;
  })();

  return (
    <div className="shell">
      <TopBar title={t("appTitle") as string} lang={lang} setLang={setLang} />
      <AnimatePresence mode="wait">{screenView}</AnimatePresence>
    </div>
  );
}

export default App;
