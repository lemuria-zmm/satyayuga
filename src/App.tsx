import { useMemo, useState } from 'react';
import { stages } from './data/stages';
import { ChoiceOption } from './types/game';
import { useLanguage } from './context/LanguageContext';
import { useGame } from './context/GameContext';
import { StageIndicator } from './components/StageIndicator';
import { StatBar } from './components/StatBar';
import { StoryPanel } from './components/StoryPanel';
import { ChoiceGrid } from './components/ChoiceGrid';
import { LanguageToggle } from './components/LanguageToggle';
import './styles.css';

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export const App = () => {
  const { language, setLanguage, t } = useLanguage();
  const { state, updateStats, updateState } = useGame();
  const [followUp, setFollowUp] = useState<string>();

  const activeStage = stages[state.stageProgress.stageIndex];
  const activeEvent = activeStage.events[state.stageProgress.eventIndex];

  const themeLabel = useMemo(() => activeStage.theme[language], [activeStage, language]);

  const handleSelect = (option: ChoiceOption) => {
    setFollowUp(option.followUp?.[language]);
    updateStats({
      affection: clamp(state.stats.affection + (option.statDelta.affection ?? 0)),
      chemistry: clamp(state.stats.chemistry + (option.statDelta.chemistry ?? 0)),
      understanding: clamp(state.stats.understanding + (option.statDelta.understanding ?? 0)),
    });

    const nextEventIndex = state.stageProgress.eventIndex + 1;
    if (nextEventIndex < activeStage.events.length) {
      updateState({ stageProgress: { ...state.stageProgress, eventIndex: nextEventIndex } });
      return;
    }

    const nextStageIndex = state.stageProgress.stageIndex + 1;
    if (nextStageIndex < stages.length) {
      updateState({ stageProgress: { stageIndex: nextStageIndex, eventIndex: 0 } });
      return;
    }

    updateState({ mirrorUnlocked: true });
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
        <LanguageToggle language={language} onChange={setLanguage} />
      </header>

      <section className="stage-section">
        <div className="stage-header">
          <div>
            <span className="stage-label">{t.stage}</span>
            <h2>{activeStage.title[language]}</h2>
            <p className="stage-theme">{themeLabel}</p>
          </div>
          <StageIndicator stages={stages} activeIndex={state.stageProgress.stageIndex} />
        </div>

        <div className="stat-panel">
          <StatBar label={t.stats.affection} value={state.stats.affection} color="#FF8FB1" />
          <StatBar label={t.stats.chemistry} value={state.stats.chemistry} color="#C5B3FF" />
          <StatBar label={t.stats.understanding} value={state.stats.understanding} color="#8AD7FF" />
        </div>
      </section>

      <main className="story-section">
        <StoryPanel
          title={activeEvent.title[language]}
          description={activeEvent.description[language]}
          followUp={followUp}
        />
        <div className="choice-header">{t.choice}</div>
        <ChoiceGrid language={language} options={activeEvent.choices} onSelect={handleSelect} />
      </main>

      {state.mirrorUnlocked ? (
        <footer className="mirror-hint">
          <span>{t.mirror}</span>
        </footer>
      ) : null}
    </div>
  );
};
