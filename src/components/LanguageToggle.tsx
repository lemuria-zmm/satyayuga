import { Language } from '../types/game';

type LanguageToggleProps = {
  language: Language;
  onChange: (lang: Language) => void;
};

export const LanguageToggle = ({ language, onChange }: LanguageToggleProps) => {
  return (
    <div className="language-toggle">
      <button
        type="button"
        className={language === 'zh' ? 'active' : ''}
        onClick={() => onChange('zh')}
      >
        中文
      </button>
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => onChange('en')}
      >
        EN
      </button>
    </div>
  );
};
