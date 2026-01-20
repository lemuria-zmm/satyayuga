import { motion } from 'framer-motion';

type StatBarProps = {
  label: string;
  value: number;
  color: string;
};

export const StatBar = ({ label, value, color }: StatBarProps) => {
  return (
    <div className="stat-bar">
      <span>{label}</span>
      <div className="stat-track">
        <motion.div
          className="stat-fill"
          style={{ backgroundColor: color, width: `${value}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="stat-value">{value}</span>
    </div>
  );
};
