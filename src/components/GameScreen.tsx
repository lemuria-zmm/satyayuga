import { motion } from "framer-motion";
import { Heart, Sparkle, Brain } from "lucide-react";
import { phases, storyEvents } from "../data/stages";
import { useGame } from "../contexts/GameContext";

const metricIcons = {
  affection: Heart,
  chemistry: Sparkle,
  understanding: Brain,
};

const metricLabels = {
  affection: "好感度",
  chemistry: "默契值",
  understanding: "理解度",
};

const fillPrompt = (template: string, notes: Record<string, string>) =>
  template.replace(/\{(.*?)\}/g, (_, key) => notes[key] ?? "____");

export const GameScreen = () => {
  const { state, updateNote, applyChoice, nextEvent } = useGame();
  const currentEvent = storyEvents[state.eventIndex];
  const currentPhase = phases[state.phaseIndex];

  if (!currentEvent || !currentPhase) {
    return null;
  }

  return (
    <div className="card game">
      <div className="game-header">
        <div>
          <h2>{currentPhase.name}</h2>
          <p>{currentPhase.description}</p>
        </div>
        <div className="metrics">
          {(Object.keys(state.metrics) as Array<keyof typeof state.metrics>).map((key) => {
            const Icon = metricIcons[key];
            return (
              <div key={key} className="metric">
                <Icon size={18} />
                <span>{metricLabels[key]}</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${state.metrics[key]}%` }} />
                </div>
                <strong>{state.metrics[key]}</strong>
              </div>
            );
          })}
        </div>
      </div>
      <motion.div
        key={currentEvent.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="story"
      >
        <h3>{currentEvent.title}</h3>
        <p className="prompt">{fillPrompt(currentEvent.prompt, state.notes)}</p>
        {currentEvent.keyInputs?.map((input) => (
          <label key={input.id} className="input-row">
            <span>{input.label}</span>
            <input
              value={state.notes[input.id] ?? ""}
              onChange={(event) => updateNote(input.id, event.target.value)}
              placeholder={input.placeholder}
            />
          </label>
        ))}
        <div className="choices">
          {currentEvent.choices.map((choice) => (
            <button
              key={choice.id}
              className="choice"
              onClick={() => {
                applyChoice(choice);
                nextEvent();
              }}
            >
              {choice.text}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
