import { AnimatePresence, motion } from "framer-motion";
import { Brain, Heart, Sparkles } from "lucide-react";
import type { RefObject } from "react";
import type { GameState, StageStats } from "../types";
import MetricBox from "../components/MetricBox";
import InputModal from "../components/InputModal";

type GameScreenProps = {
  lang: "zh" | "en";
  t: (path: string) => any;
  game: GameState;
  totalEvents: number;
  currentEvent: any;
  stageStats: StageStats;
  sceneText: string;
  chatRef: RefObject<HTMLElement | null>;
  resolveTemplate: (text: string) => string;
  onSelectOption: (idx: number) => void;
  onCommitPrompt: (value: string) => void;
};

export default function GameScreen({
  lang,
  t,
  game,
  totalEvents,
  currentEvent,
  stageStats,
  sceneText,
  chatRef,
  resolveTemplate,
  onSelectOption,
  onCommitPrompt,
}: GameScreenProps) {
  const logs = [...game.logs, { role: "narration", text: sceneText }];

  return (
    <motion.section className="shell" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <section className="card setup">
        <div className="stage-strip">
          {stageStats.stageOrder.map((stageKey, idx) => {
            const cls = idx < stageStats.stageIndex ? "done" : idx === stageStats.stageIndex ? "active" : "";
            return (
              <div key={stageKey} className={`stage-chip ${cls}`}>
                {idx + 1}. {t(`sections.${stageKey}`)}
              </div>
            );
          })}
        </div>
        <div className="metric-wrap">
          <MetricBox icon={Heart} label={t("affection")} value={game.metrics.affection} />
          <MetricBox icon={Sparkles} label={t("chemistry")} value={game.metrics.chemistry} />
          <MetricBox icon={Brain} label={t("understanding")} value={game.metrics.understanding} />
        </div>
      </section>

      <section className="story-layout">
        <section className="card chat" ref={chatRef}>
          <AnimatePresence initial={false}>
            {logs.map((entry, idx) => (
              <motion.div
                layout
                key={`${entry.role}-${idx}-${entry.text.slice(0, 20)}`}
                className={`bubble ${entry.role}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <strong>{t(`labels.${entry.role}`)}:</strong> {entry.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        <section className="card choices">
          <h3 style={{ margin: 0 }}>{t(`sections.${currentEvent.stage}`)}</h3>
          <div className="note">
            {t("stage")}: {game.currentEvent + 1} / {totalEvents} · {t("gameSaved")}
          </div>

          {currentEvent.choices.map((choice: any, idx: number) => (
            <motion.button
              id={`option-${idx}`}
              key={choice.text.zh + choice.text.en}
              className={`option ${game.focusedOption === idx ? "focused" : ""}`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.995 }}
              onClick={() => onSelectOption(idx)}
            >
              {idx + 1}. {resolveTemplate(choice.text[lang])}
            </motion.button>
          ))}

          <div className="hotkey-tip">{t("hotkey")}</div>
        </section>
      </section>

      {game.promptInput && (
        <InputModal
          label={game.promptInput.label}
          placeholder={game.promptInput.placeholder}
          onSubmit={onCommitPrompt}
          onSkip={() => onCommitPrompt("")}
          skipText={t("skip")}
          submitText={t("submit")}
          hint={t("modalHint")}
        />
      )}
    </motion.section>
  );
}
