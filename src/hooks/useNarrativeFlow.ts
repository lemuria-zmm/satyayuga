import { useCallback } from "react";
import { DEFAULT_GAME, DEFAULT_SETUP, EVENTS, KEY_INPUT_LIBRARY } from "../gameData";
import type { EndingState, GameState, Lang, Screen, SetupData } from "../types";
import { clamp, computeEnding, randomFrom } from "../utils/gameUtils";

type UseNarrativeFlowParams = {
  lang: Lang;
  t: (path: string) => any;
  tr: (zhText: string, enText: string) => string;
  screen: Screen;
  setup: SetupData;
  game: GameState | null;
  setSetup: React.Dispatch<React.SetStateAction<SetupData>>;
  setGame: React.Dispatch<React.SetStateAction<GameState | null>>;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  setSetupStep: React.Dispatch<React.SetStateAction<number>>;
  setEnding: React.Dispatch<React.SetStateAction<EndingState | null>>;
  setAiNotice: React.Dispatch<React.SetStateAction<string>>;
};

export function useNarrativeFlow({
  lang,
  t,
  tr,
  screen,
  setup,
  game,
  setSetup,
  setGame,
  setScreen,
  setSetupStep,
  setEnding,
  setAiNotice,
}: UseNarrativeFlowParams) {
  const ensureDefaults = useCallback(
    (baseSetup: SetupData) => {
      const next = structuredClone(baseSetup);
      if (!next.me.name) next.me.name = tr("你", "You");
      if (!next.lover.name) next.lover.name = tr("TA", "Partner");
      if (!next.me.mbti) next.me.mbti = "INFP";
      if (!next.lover.mbti) next.lover.mbti = "ENFJ";
      if (!next.me.star) next.me.star = tr("双鱼座", "Pisces");
      if (!next.lover.star) next.lover.star = tr("天秤座", "Libra");
      if (!next.me.hobbies.length) next.me.hobbies = [t("hobbyTags.0") as string];
      if (!next.lover.hobbies.length) next.lover.hobbies = [t("hobbyTags.1") as string];
      if (!next.lover.traits.length) next.lover.traits = [t("traitTags.1") as string];
      return next;
    },
    [t, tr]
  );

  const resolveTemplate = useCallback(
    (text: string, ext: Record<string, string> = {}, setupSnapshot = setup, gameSnapshot = game) => {
      const defaults = {
        playerName: setupSnapshot.me.name || tr("你", "You"),
        loverName: setupSnapshot.lover.name || tr("恋人", "Partner"),
        loverTrait: setupSnapshot.lover.traits[0] || tr("温柔", "gentle"),
        sharedHobby: setupSnapshot.me.hobbies[0] || setupSnapshot.lover.hobbies[0] || tr("音乐", "music"),
      };
      const source = {
        ...defaults,
        ...(gameSnapshot ? gameSnapshot.memory : {}),
        ...ext,
      };
      return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
        if (source[key]) return source[key];
        if (KEY_INPUT_LIBRARY[key]) {
          return KEY_INPUT_LIBRARY[key][lang].fallback[0];
        }
        return "";
      });
    },
    [game, lang, setup, tr]
  );

  const computeLocalEndingNarrative = useCallback(
    (endingKey: EndingState["key"], score: number, gameSnapshot: GameState, setupSnapshot: SetupData) => {
      const last3 = gameSnapshot.history.slice(-3);
      const lover = setupSnapshot.lover.name;
      const nick = gameSnapshot.memory.nick_name || tr("你们的昵称", "your nickname");

      const closingMap = {
        zh: {
          perfect: `在${gameSnapshot.memory.confession_place || "那个夜晚"}之后，你和${lover}把"喜欢"变成了"理解"。\n你们在${gameSnapshot.memory.travel_place || "旅行"}里学会协调，在${gameSnapshot.memory.conflict_reason || "争执"}后学会修复。\n${nick}不再只是称呼，而是互相托底的承诺。综合分 ${score}，你们抵达灵魂伴侣线。`,
          happy: `你和${lover}经历了热烈与分歧，最终找到了可持续的节奏。\n你们未必完美，但在关键节点都愿意回头沟通。\n${nick}成为日常里最稳定的温柔暗号。综合分 ${score}，关系进入稳定幸福。`,
          normal: `你和${lover}把故事走完，也把很多情绪留在了沉默里。\n你们依然陪伴彼此，却偶尔会想起那些没说完的话。\n综合分 ${score}，这是平淡但真实的陪伴线。`,
          regret: `你和${lover}曾在${gameSnapshot.memory.meeting_place || "最初"}彼此心动，也在磨合中逐渐错位。\n努力并非没有发生，但理解总慢半拍。\n综合分 ${score}，你们在遗憾里分开。`,
          sad: `从${gameSnapshot.memory.meeting_place || "初见"}到最后一次争吵，你和${lover}都曾试图靠近。\n但误会叠加、表达失真，让爱变成消耗。\n综合分 ${score}，故事停在不欢而散。`,
        },
        en: {
          perfect: `After ${gameSnapshot.memory.confession_place || "that night"}, you and ${lover} turned attraction into deep understanding.\nYou learned coordination on the ${gameSnapshot.memory.travel_place || "trip"}, and repair after ${gameSnapshot.memory.conflict_reason || "conflict"}.\n${nick} became a promise, not just a nickname. Composite score ${score}: Soulmate route unlocked.`,
          happy: `You and ${lover} survived both sweetness and friction, then found a sustainable rhythm.\nNot flawless, but both of you kept returning to honest conversation.\n${nick} became a quiet daily signal of care. Composite score ${score}: Stable happy ending.`,
          normal: `You and ${lover} stayed through the full journey, while many feelings remained unspoken.\nYou still accompany each other, yet sometimes think of unfinished conversations.\nComposite score ${score}: Ordinary companionship ending.`,
          regret: `You and ${lover} sparked at ${gameSnapshot.memory.meeting_place || "the beginning"}, then slowly misaligned during adjustment.\nEffort existed, but understanding always arrived one step late.\nComposite score ${score}: Regretful breakup ending.`,
          sad: `From ${gameSnapshot.memory.meeting_place || "first meet"} to the final argument, both of you tried to get closer.\nBut layered misunderstandings and distorted expression turned love into exhaustion.\nComposite score ${score}: Bitter goodbye ending.`,
        },
      };

      const highlights = last3.map((item, idx) => `${idx + 1}. ${item.choice}`).join("\n");
      const prefix = lang === "zh" ? `【你做出的最后三个关键选择】\n${highlights}\n\n` : `[Your last three key choices]\n${highlights}\n\n`;

      return `${prefix}${closingMap[lang][endingKey]}`;
    },
    [lang, tr]
  );

  const polishEndingWithAI = useCallback(
    async (localText: string, apiCfg: SetupData["api"]) => {
      const { provider, apiKey, model } = apiCfg;
      if (!provider || provider === "none" || !apiKey) return localText;

      const sys =
        lang === "zh"
          ? "你是恋爱剧情作家。请在保持事实不变的前提下，润色文本为温柔、细腻、简洁的结局独白，200字左右。"
          : "You are a romance narrative writer. Polish the ending text into a warm, emotionally nuanced monologue in about 150 words without changing facts.";

      try {
        if (provider === "openai") {
          const body = {
            model: model || "gpt-4.1-mini",
            input: [
              { role: "system", content: [{ type: "input_text", text: sys }] },
              { role: "user", content: [{ type: "input_text", text: localText }] },
            ],
          };
          const resp = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
          });
          if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
          const data = await resp.json();
          return data.output_text || localText;
        }

        if (provider === "gemini") {
          const useModel = model || "gemini-1.5-flash";
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${sys}\n\n${localText}` }],
                  },
                ],
              }),
            }
          );
          if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          return text || localText;
        }
      } catch (err) {
        console.error(err);
        setAiNotice(t("aiFailed") as string);
        return localText;
      }

      return localText;
    },
    [lang, setAiNotice, t]
  );

  const finishGame = useCallback(
    async (gameSnapshot: GameState, setupSnapshot: SetupData) => {
      const result = computeEnding(gameSnapshot.metrics);
      const endingPack = t(`endings.${result.key}`) as { title: string; desc: string };
      const localText = computeLocalEndingNarrative(result.key, result.score, gameSnapshot, setupSnapshot);

      setEnding({
        key: result.key,
        score: result.score,
        title: endingPack.title,
        desc: endingPack.desc,
        story: localText,
        polished: false,
      });
      setScreen("ending");

      if (setupSnapshot.api.provider !== "none" && setupSnapshot.api.apiKey) {
        setGame((prev) => (prev ? { ...prev, aiBusy: true } : prev));
        const polished = await polishEndingWithAI(localText, setupSnapshot.api);
        setEnding((prev) =>
          prev
            ? {
                ...prev,
                story: polished,
                polished: polished !== localText,
              }
            : prev
        );
        setGame((prev) => (prev ? { ...prev, aiBusy: false } : prev));
      }
    },
    [computeLocalEndingNarrative, polishEndingWithAI, setEnding, setGame, setScreen, t]
  );

  const startNewGame = useCallback(
    (baseSetup = setup) => {
      const nextSetup = ensureDefaults(baseSetup);
      const nextGame = structuredClone(DEFAULT_GAME) as GameState;
      nextGame.logs.push({
        role: "system",
        text: tr("故事开始：每一次选择都在塑造你们的关系。", "Story starts: every choice shapes your relationship."),
      });
      nextGame.logs.push({ role: "system", text: tr("系统会自动存档。", "Auto-save is enabled.") });

      setSetup(nextSetup);
      setGame(nextGame);
      setEnding(null);
      setAiNotice("");
      setScreen("game");
      setSetupStep(0);
    },
    [ensureDefaults, setAiNotice, setEnding, setGame, setScreen, setSetup, setSetupStep, setup, tr]
  );

  const selectOption = useCallback(
    (idx: number) => {
      if (!game || screen !== "game") return;
      const event = EVENTS[game.currentEvent] as any;
      if (!event || game.aiBusy || game.promptInput) return;
      const choice = event.choices[idx];
      if (!choice) return;

      const next = structuredClone(game) as GameState;
      next.focusedOption = idx;
      next.metrics.affection = clamp(next.metrics.affection + choice.impact.affection);
      next.metrics.chemistry = clamp(next.metrics.chemistry + choice.impact.chemistry);
      next.metrics.understanding = clamp(next.metrics.understanding + choice.impact.understanding);

      next.logs.push({ role: "narration", text: resolveTemplate(event.scene[lang], {}, setup, next) });
      next.logs.push({ role: "player", text: resolveTemplate(choice.text[lang], {}, setup, next) });
      next.logs.push({ role: "lover", text: resolveTemplate(choice.reply[lang], {}, setup, next) });

      next.history.push({
        stage: event.stage,
        eventId: event.id,
        scene: resolveTemplate(event.scene[lang], {}, setup, next),
        choice: resolveTemplate(choice.text[lang], {}, setup, next),
        reply: resolveTemplate(choice.reply[lang], {}, setup, next),
        inner: resolveTemplate(choice.inner[lang], {}, setup, next),
        metrics: { ...next.metrics },
      });

      next.currentEvent += 1;
      next.focusedOption = 0;

      setGame(next);
      if (next.currentEvent >= EVENTS.length) {
        void finishGame(next, setup);
      }
    },
    [finishGame, game, lang, resolveTemplate, screen, setGame, setup]
  );

  const commitPromptInput = useCallback(
    (value: string) => {
      setGame((prev) => {
        if (!prev?.promptInput) return prev;
        const next = structuredClone(prev) as GameState;
        const key = next.promptInput.key;
        const slot = KEY_INPUT_LIBRARY[key][lang];
        const finalValue = (value || "").trim() || randomFrom(slot.fallback);
        next.memory[key] = finalValue;
        next.logs.push({
          role: "system",
          text: tr("关键细节已记录：", "Key detail saved: ") + finalValue,
        });
        next.promptInput = null;
        return next;
      });
    },
    [lang, setGame, tr]
  );

  const onQuickStart = useCallback(() => {
    startNewGame(structuredClone(DEFAULT_SETUP));
  }, [startNewGame]);

  return {
    resolveTemplate,
    startNewGame,
    selectOption,
    commitPromptInput,
    onQuickStart,
  };
}
