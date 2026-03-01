import { Languages } from "lucide-react";
import type { Lang } from "../types";

type TopBarProps = {
  title: string;
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export default function TopBar({ title, lang, setLang }: TopBarProps) {
  return (
    <section className="card top-bar">
      <strong>{title}</strong>
      <div className="icon-text">
        <Languages size={16} />
        <div className="lang-switch">
          <button data-lang="zh" className={`btn ${lang === "zh" ? "" : "ghost"}`} onClick={() => setLang("zh")}>
            中文
          </button>
          <button data-lang="en" className={`btn ${lang === "en" ? "" : "ghost"}`} onClick={() => setLang("en")}>
            EN
          </button>
        </div>
      </div>
    </section>
  );
}
