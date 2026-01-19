const translations = {
  zh: {
    start: "开始你的爱情故事",
    hero: "体验六大恋爱阶段、三维数值成长与镜像视角反转。输入你的独家记忆，让AI 帮你书写专属恋爱冒险。",
    cta: "开始游戏",
    blueprint: "查看设计蓝图",
    mirror: "查看真相",
  },
  en: {
    start: "Begin your love story",
    hero: "Experience six relationship phases, three emotional metrics, and the mirrored POV twist. Add your memories and let AI craft a story just for you.",
    cta: "Start Game",
    blueprint: "View Blueprint",
    mirror: "Reveal Truth",
  },
};

const app = document.querySelector(".app");
const langButtons = document.querySelectorAll(".pill");
const heroTitle = document.querySelector(".hero__content h2");
const heroText = document.querySelector(".hero__content p");
const heroActions = document.querySelectorAll(".hero__actions button");
const mirrorButton = document.querySelector(".mirror .cta");

const setLanguage = (lang) => {
  const copy = translations[lang] || translations.zh;
  heroTitle.textContent = copy.start;
  heroText.textContent = copy.hero;
  heroActions[0].textContent = copy.cta;
  heroActions[1].textContent = copy.blueprint;
  mirrorButton.textContent = copy.mirror;

  langButtons.forEach((button) => {
    button.classList.toggle("pill--active", button.dataset.lang === lang);
  });

  document.documentElement.lang = lang === "en" ? "en" : "zh-Hans";
};

langButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.lang));
});

setLanguage("zh");
