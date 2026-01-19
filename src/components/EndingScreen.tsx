import { motion } from "framer-motion";
import { RefreshCcw } from "lucide-react";
import { useGame } from "../contexts/GameContext";
import { useLanguage } from "../contexts/LanguageContext";
import { MirrorReveal } from "./MirrorReveal";

interface EndingScreenProps {
  onReset: () => void;
}

const RadarChart = ({
  affection,
  chemistry,
  understanding,
}: {
  affection: number;
  chemistry: number;
  understanding: number;
}) => {
  const max = 100;
  const points = [
    { label: "好感", value: affection, x: 100, y: 10 },
    { label: "默契", value: chemistry, x: 10, y: 160 },
    { label: "理解", value: understanding, x: 190, y: 160 },
  ];
  const scalePoint = (point: (typeof points)[number]) => {
    const ratio = point.value / max;
    return {
      ...point,
      x: 100 + (point.x - 100) * ratio,
      y: 100 + (point.y - 100) * ratio,
    };
  };
  const scaled = points.map(scalePoint);
  const path = scaled.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg viewBox="0 0 200 200" className="radar">
      <polygon points="100,10 10,160 190,160" className="radar-bg" />
      <polygon points={path} className="radar-data" />
      {points.map((point) => (
        <text key={point.label} x={point.x} y={point.y} className="radar-label">
          {point.label}
        </text>
      ))}
    </svg>
  );
};

export const EndingScreen = ({ onReset }: EndingScreenProps) => {
  const { ending, state, toggleMirror, resetGame } = useGame();
  const { t } = useLanguage();

  if (!ending) {
    return null;
  }

  return (
    <div className="card ending">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ending-content">
        <h2>{ending.title}</h2>
        <p>{ending.summary}</p>
        <div className="ending-grid">
          <div className="ending-stats">
            <h3>综合得分</h3>
            <strong>{ending.score}%</strong>
            <RadarChart
              affection={state.metrics.affection}
              chemistry={state.metrics.chemistry}
              understanding={state.metrics.understanding}
            />
          </div>
          <div className="ending-story">
            <h3>AI 结局预览</h3>
            <p>
              这是基于你们的选择生成的概要故事，将由 AI 接管扩写完整剧情。
            </p>
            <div className="mirror">
              <button className="primary" onClick={toggleMirror}>
                {t("mirror")}
              </button>
              <button
                className="ghost"
                onClick={() => {
                  resetGame();
                  onReset();
                }}
              >
                <RefreshCcw size={16} />
                重新开始
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      {state.mirrorMode && <MirrorReveal insight={ending.mirrorInsight} />}
    </div>
  );
};
