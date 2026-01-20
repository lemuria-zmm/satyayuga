import { motion } from 'framer-motion';

type StoryPanelProps = {
  title: string;
  description: string;
  followUp?: string;
};

export const StoryPanel = ({ title, description, followUp }: StoryPanelProps) => {
  return (
    <motion.div
      className="story-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2>{title}</h2>
      <p>{description}</p>
      {followUp ? <p className="follow-up">{followUp}</p> : null}
    </motion.div>
  );
};
