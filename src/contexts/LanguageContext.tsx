import { createContext, useContext, useMemo, useState } from "react";
import { Language } from "../types/game";

const translations = {
  zh: {
    title: "恋人模拟器",
    start: "开始你的爱情故事",
    setup: "设置你的角色",
    next: "下一步",
    back: "上一步",
    game: "进入剧情",
    api: "API 配置",
    mirror: "查看真相",
  },
  en: {
    title: "Love Simulator",
    start: "Begin Your Love Story",
    setup: "Set Your Roles",
    next: "Next",
    back: "Back",
    game: "Enter Story",
    api: "API Settings",
    mirror: "Reveal the Truth",
  },
} satisfies Record<Language, Record<string, string>>;

interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  t: (key: keyof (typeof translations)["zh"]) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>("zh");

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "zh" ? "en" : "zh"));
  };

  const value = useMemo(
    () => ({
      language,
      toggleLanguage,
      t: (key: keyof (typeof translations)["zh"]) => translations[language][key],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
