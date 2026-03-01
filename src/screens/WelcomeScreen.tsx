import { motion } from "framer-motion";
import { Play, RotateCcw, WandSparkles } from "lucide-react";

type WelcomeScreenProps = {
  t: (path: string) => any;
  progressExists: boolean;
  onStart: () => void;
  onQuickStart: () => void;
  onContinue: () => void;
  onReset: () => void;
};

export default function WelcomeScreen({
  t,
  progressExists,
  onStart,
  onQuickStart,
  onContinue,
  onReset,
}: WelcomeScreenProps) {
  return (
    <motion.section className="card hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h1>{t("appTitle")}</h1>
      <p>{t("subtitle")}</p>
      <div className="hero-actions">
        <button id="start-story-btn" className="btn" onClick={onStart}>
          <Play size={16} /> {t("start")}
        </button>
        <button id="quick-start-btn" className="btn soft" onClick={onQuickStart}>
          <WandSparkles size={16} /> {t("quickStart")}
        </button>
        <button id="continue-btn" className="btn ghost" disabled={!progressExists} onClick={onContinue}>
          {t("continue")}
        </button>
        <button id="reset-btn" className="btn ghost" onClick={onReset}>
          <RotateCcw size={16} /> {t("reset")}
        </button>
      </div>
    </motion.section>
  );
}
