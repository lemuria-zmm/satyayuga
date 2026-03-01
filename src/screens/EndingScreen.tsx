import { motion } from "framer-motion";
import { Eye, Home, RotateCcw } from "lucide-react";
import RadarChart from "../components/RadarChart";
import type { EndingState, GameState } from "../types";

type EndingScreenProps = {
  t: (path: string) => any;
  ending: EndingState;
  game: GameState;
  aiNotice: string;
  onViewTruth: () => void;
  onRestart: () => void;
  onBackHome: () => void;
};

export default function EndingScreen({
  t,
  ending,
  game,
  aiNotice,
  onViewTruth,
  onRestart,
  onBackHome,
}: EndingScreenProps) {
  return (
    <motion.section className="card ending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2>
        {t("endingTitle")}: {ending.title}
      </h2>
      <div>{ending.desc}</div>
      {game.aiBusy ? <div className="note">{t("loadingAi")}</div> : null}
      {aiNotice ? <div className="note">{aiNotice}</div> : null}

      <div className="ending-meta">
        <div className="score-box">
          <div>
            {t("finalScore")}: <strong>{ending.score}</strong>
          </div>
          <div className="note">
            {t("affection")} {game.metrics.affection} · {t("chemistry")} {game.metrics.chemistry} · {t("understanding")} {game.metrics.understanding}
          </div>
        </div>
        <div className="score-box">
          <RadarChart metrics={game.metrics} labels={[t("affection"), t("chemistry"), t("understanding")]} />
        </div>
      </div>

      <div className="card story-text" style={{ padding: 12, background: "rgba(255,255,255,0.38)" }}>
        {ending.story}
      </div>

      <div className="hero-actions" style={{ justifyContent: "flex-end" }}>
        <button id="view-truth-btn" className="btn" onClick={onViewTruth}>
          <Eye size={16} /> {t("viewTruth")}
        </button>
        <button id="restart-btn-ending" className="btn soft" onClick={onRestart}>
          <RotateCcw size={16} /> {t("restart")}
        </button>
        <button id="home-btn-ending" className="btn ghost" onClick={onBackHome}>
          <Home size={16} /> {t("backHome")}
        </button>
      </div>
    </motion.section>
  );
}
