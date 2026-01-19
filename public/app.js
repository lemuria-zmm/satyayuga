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
const stageName = document.querySelector("#stage-name");
const stageProgress = document.querySelector("#stage-progress");
const stageItems = document.querySelectorAll("#stage-grid li");
const chatLog = document.querySelector("#chat-log");
const choiceButtons = document.querySelectorAll(".choices button");
const barAffection = document.querySelector("#bar-affection");
const barChemistry = document.querySelector("#bar-chemistry");
const barUnderstanding = document.querySelector("#bar-understanding");

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

const stages = ["初识", "暧昧", "确认关系", "热恋", "磨合", "稳定/危机"];
const responses = {
  chat: [
    "我有点紧张，但你笑的时候我就安心了。",
    "我们聊了喜欢的电影，原来口味这么像。",
    "你问我的梦想时，我忽然很想认真回答。",
  ],
  surprise: [
    "你突然送来的小礼物让我心跳加速。",
    "这次约会像是偷偷写给我的情书。",
    "我没想到你会记得我说过的那句话。",
  ],
  distance: [
    "你沉默的时候，我会想是不是哪里做错了。",
    "有些话卡在喉咙里，没敢说出口。",
    "我需要一点时间，但还是想靠近你。",
  ],
};

let currentStage = 0;
let affection = 68;
let chemistry = 52;
let understanding = 40;

const updateMetrics = () => {
  barAffection.style.width = `${affection}%`;
  barChemistry.style.width = `${chemistry}%`;
  barUnderstanding.style.width = `${understanding}%`;
};

const updateStage = () => {
  stageName.textContent = stages[currentStage];
  stageProgress.textContent = `${currentStage + 1} / ${stages.length}`;
  stageItems.forEach((item, index) => {
    item.classList.toggle("is-active", index === currentStage);
  });
};

const appendBubble = (text, isPlayer = false) => {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${isPlayer ? "bubble--me" : "bubble--them"}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
};

const handleAction = (action) => {
  if (action === "memory") {
    const memory = window.prompt("写下这段回忆（可留空跳过）");
    if (memory) {
      appendBubble(`我把这一刻记作：「${memory}」`, true);
      understanding = Math.min(100, understanding + 8);
    }
    updateMetrics();
    return;
  }

  const options = responses[action] || responses.chat;
  const reply = options[Math.floor(Math.random() * options.length)];
  appendBubble(reply, false);

  if (action === "chat") {
    affection = Math.min(100, affection + 4);
    chemistry = Math.min(100, chemistry + 3);
  }
  if (action === "surprise") {
    affection = Math.min(100, affection + 6);
    understanding = Math.min(100, understanding + 2);
  }
  if (action === "distance") {
    affection = Math.max(0, affection - 4);
    understanding = Math.min(100, understanding + 5);
  }

  if (affection + chemistry + understanding > 200 && currentStage < stages.length - 1) {
    currentStage += 1;
    appendBubble(`阶段推进：进入「${stages[currentStage]}」。`, false);
  }

  updateMetrics();
  updateStage();
};

choiceButtons.forEach((button) => {
  button.addEventListener("click", () => handleAction(button.dataset.action));
});

mirrorButton.addEventListener("click", () => {
  const nextTheme = app.dataset.theme === "mirror" ? "bright" : "mirror";
  app.dataset.theme = nextTheme;
});

setLanguage("zh");
updateStage();
updateMetrics();
