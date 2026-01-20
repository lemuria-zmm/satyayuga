import { createContext, useContext, useMemo, useState } from 'react';
import { Language } from '../types/game';
import { defaultLanguage, translations } from '../data/i18n';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations[Language];
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
