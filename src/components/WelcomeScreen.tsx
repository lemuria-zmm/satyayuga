import { motion } from "framer-motion";
import { Languages, Sparkles } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <div className="card welcome">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="welcome-hero"
      >
        <Sparkles className="icon" />
        <h2>{t("start")}</h2>
        <p>镜像视角让你看到恋人心底的真实声音。</p>
      </motion.div>
      <div className="welcome-actions">
        <button className="primary" onClick={onStart}>
          {t("setup")}
        </button>
        <button className="ghost" onClick={toggleLanguage}>
          <Languages size={18} />
          {language === "zh" ? "Switch to English" : "切换到中文"}
        </button>
      </div>
    </div>
  );
};
