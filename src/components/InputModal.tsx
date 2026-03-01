import { motion } from "framer-motion";
import { useState } from "react";

type InputModalProps = {
  label: string;
  placeholder: string;
  hint: string;
  skipText: string;
  submitText: string;
  onSkip: () => void;
  onSubmit: (value: string) => void;
};

export default function InputModal({
  label,
  placeholder,
  hint,
  skipText,
  submitText,
  onSkip,
  onSubmit,
}: InputModalProps) {
  const [value, setValue] = useState("");

  return (
    <div className="modal" id="input-modal">
      <motion.div className="modal-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h3 style={{ margin: 0 }}>{label}</h3>
        <p className="note">{hint}</p>
        <input
          id="modal-input"
          autoFocus
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit(value);
          }}
        />
        <div className="modal-actions">
          <button id="modal-skip" className="btn ghost" onClick={onSkip}>
            {skipText}
          </button>
          <button id="modal-submit" className="btn" onClick={() => onSubmit(value)}>
            {submitText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
