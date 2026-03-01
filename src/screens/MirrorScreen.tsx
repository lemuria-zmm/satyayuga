import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import type { GameState } from "../types";

type MirrorScreenProps = {
  t: (path: string) => any;
  game: GameState;
  onBackEnding: () => void;
  onRestart: () => void;
};

export default function MirrorScreen({ t, game, onBackEnding, onRestart }: MirrorScreenProps) {
  return (
    <motion.section className="card timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 style={{ margin: 0 }}>{t("mirrorTitle")}</h2>
      <p className="note">{t("mirrorDesc")}</p>

      {game.history.map((item, idx) => (
        <motion.div
          className="timeline-item"
          key={`${item.eventId}-${idx}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(idx * 0.02, 0.25) }}
        >
          <small>
            {idx + 1}. {t(`sections.${item.stage}`)}
          </small>
          <div>
            <strong>{item.scene}</strong>
          </div>
          <div className="note">{item.choice}</div>
          <div className="inner-voice">{item.inner}</div>
        </motion.div>
      ))}

      <div className="hero-actions" style={{ justifyContent: "flex-end" }}>
        <button id="back-ending-btn" className="btn" onClick={onBackEnding}>
          {t("backEnding")}
        </button>
        <button id="restart-btn-mirror" className="btn soft" onClick={onRestart}>
          <RotateCcw size={16} /> {t("restart")}
        </button>
      </div>
    </motion.section>
  );
}
