import { motion } from 'framer-motion';
import { ChoiceOption, Language } from '../types/game';

type ChoiceGridProps = {
  language: Language;
  options: ChoiceOption[];
  onSelect: (option: ChoiceOption) => void;
};

export const ChoiceGrid = ({ language, options, onSelect }: ChoiceGridProps) => {
  return (
    <div className="choice-grid">
      {options.map((option) => (
        <motion.button
          key={option.id}
          className="choice-button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(option)}
        >
          {option.text[language]}
        </motion.button>
      ))}
    </div>
  );
};
