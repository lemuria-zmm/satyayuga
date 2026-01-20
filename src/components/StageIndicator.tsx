import { motion } from 'framer-motion';
import { Stage } from '../types/game';

type StageIndicatorProps = {
  stages: Stage[];
  activeIndex: number;
};

export const StageIndicator = ({ stages, activeIndex }: StageIndicatorProps) => {
  return (
    <div className="stage-indicator">
      {stages.map((stage, index) => (
        <motion.div
          key={stage.id}
          className={`stage-pill ${index === activeIndex ? 'active' : ''}`}
          layout
        >
          {stage.title.zh}
        </motion.div>
      ))}
    </div>
  );
};
