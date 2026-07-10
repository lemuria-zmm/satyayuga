import { useEffect, useRef, useState } from 'react';
import { CHARACTERS } from '../content/characters';
import { npcSpriteFor } from '../content/npcSprites';
import type { CharacterDialogueOutput, ChatReplyOption, ChatReplyTone, NpcEmotionState, NpcId } from '../types';

const emotionStateLabels: Record<NpcEmotionState, string> = {
  distant: '疏离',
  noticing: '留意',
  silent: '沉默',
  irritated: '烦躁',
  trusting: '信任',
  avoidant: '避让',
  shaken: '动摇',
};

const npcColors: Record<NpcId, string> = {
  ximeng: '#24506B',
  zeduan: '#8A5A32',
  litang: '#6E675E',
  song: '#3F7666',
};

const npcAtmosphere: Record<NpcId, string> = {
  ximeng: '你走近几步。少年似是察觉身后有人，执笔的手顿了顿，正侧过脸来。',
  zeduan: '择端正对着一幅长卷出神，听见脚步声才抬起头。',
  litang: '李唐端坐案前，笔搁一侧，像在等什么人。',
  song: '嵩正在翻看一卷旧画，指尖停在画中人物的眉眼处。',
};

const npcGreeting: Record<NpcId, string> = {
  ximeng: '"……何事？"他偏过头看你一眼，目光淡淡的，并不多问。',
  zeduan: '"来了？正好，你看看这段桥下——"',
  litang: '"坐。有话便说。"',
  song: '"你来得正好。我正想问你一件事。"',
};

/** 默认开场可选回复（首轮，LLM 尚未给 replyOptions 时用）。首次接触：委婉问"在画什么"，不主动点画名 */
const OPENING_REPLIES: ChatReplyOption[] = [
  { text: '你在画什么？', tone: 'warm' },
  { text: '打扰了，我只是随意看看。', tone: 'neutral' },
  { text: '这画……我好像在哪儿见过。', tone: 'probing' },
];

interface DialogueScreenProps {
  npcId: NpcId;
  /** 当前好感（hiddenAffinity），用于梅花格显示与立绘差分 */
  affinity: number;
  /** 立绘覆盖（2026-07-07）：闲聊页用全身立绘（希孟 A；授衔后画室 B），传入则不走表情半身差分 */
  portraitOverride?: string;
  /** 本场可说的句数预算（主动闲聊=好感档剩余次数；首遇=独立固定额度） */
  maxTurns: number;
  /** 顶栏文案：true 显「今日还可说 N 句」（主动）；false 显「初次相识」（首遇，不占当日额度） */
  countsTowardQuota: boolean;
  /** 此前持久化的对话往来（2026-06-26）：「往来」记录区展示 + 续聊衔接 */
  priorHistory: string[];
  /** 可选背景图（如结局见希孟用希孟画室）；缺省用 .dlg-bg 默认庭院图 */
  bgImage?: string;
  /** 结局叙话模式（2026-07-10）：顶栏/收尾/告辞文案改结局措辞，不显"今日" */
  endingMode?: boolean;
  onCancel: () => void;
  /** 单轮闲聊：玩家选中的回复 + 语气 + 本场往来历史 + 是否最后一次 → NPC 回应 */
  onSubmit: (
    playerReply: string,
    replyTone: ChatReplyTone | undefined,
    recentDialogue: string[],
    isFinalExchange: boolean,
  ) => Promise<CharacterDialogueOutput | undefined>;
  /** 续聊开场（2026-06-26）：有历史时进场调一次，希孟延续上次对话主动开场白 + 给回复选项 */
  onOpen?: (priorHistory: string[]) => Promise<CharacterDialogueOutput | undefined>;
}

export function DialogueScreen({ npcId, affinity, portraitOverride, maxTurns, countsTowardQuota, priorHistory, bgImage, endingMode, onCancel, onSubmit, onOpen }: DialogueScreenProps) {
  // 当前希孟的话（首轮用问候语 + 默认选项；之后用 LLM 输出）
  const [response, setResponse] = useState<CharacterDialogueOutput | null>(null);
  const [replyOptions, setReplyOptions] = useState<ChatReplyOption[]>(OPENING_REPLIES);
  const [freeInput, setFreeInput] = useState('');
  // 本场新增的往来（叠加在 priorHistory 之后）
  const [history, setHistory] = useState<string[]>([]);
  const [turnsUsed, setTurnsUsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showLog, setShowLog] = useState(false);
  /** 本轮 LLM 是否把这一场收尾了（次数耗尽或 LLM 自判了结）：true 时它的 dialogue 即自然结束语 */
  const [concluded, setConcluded] = useState(false);
  /** 进场快照本场句数预算（2026-06-26 修双重扣减 bug）：不随 maxTurns prop 因 chatsToday 递减而变 */
  const [budget] = useState(maxTurns);
  const openedRef = useRef(false);

  const character = CHARACTERS[npcId];
  const turnsLeft = Math.max(0, budget - turnsUsed);
  const nameColor = npcColors[npcId];
  const plumsLit = affinity <= 0 ? 0 : Math.min(5, 1 + Math.floor(affinity / 20));
  // 立绘（2026-07-07）：闲聊页优先用 portraitOverride 全身立绘（希孟 A / 授衔后画室 B）；
  // 未传时按情绪差分半身（2026-07-06）：有回应时按 response.emotionState 切表情；进场（无回应）用好感兜底。
  const portrait =
    portraitOverride ??
    (response
      ? npcSpriteFor(npcId, response.emotionState, affinity)
      : npcSpriteFor(npcId, npcId === 'ximeng' && affinity >= 40 ? 'noticing' : undefined, affinity));
  // 完整往来 = 持久历史 + 本场新增
  const fullLog = [...priorHistory, ...history];

  // 续聊开场（2026-06-26）：有历史时进场调一次 onOpen，希孟延续上次话题主动开场白 + 给回复选项。
  // 不计句数（开场是 NPC 主动，不耗玩家额度）。首遇/无历史保持静态问候 + OPENING_REPLIES。
  useEffect(() => {
    if (openedRef.current) return;
    if (!onOpen || priorHistory.length === 0) return;
    openedRef.current = true;
    setIsSubmitting(true);
    void (async () => {
      try {
        const out = await onOpen(priorHistory);
        if (out) {
          setResponse(out);
          setReplyOptions(out.replyOptions ?? []);
        }
      } finally {
        setIsSubmitting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当前显示的 NPC 台词（LLM 输出，含收尾时的自然作别语）
  const npcLine = response ? response.dialogue : npcGreeting[npcId];
  const npcAction = response ? response.actionText : npcAtmosphere[npcId];

  async function pickReply(text: string, tone: ChatReplyTone | undefined) {
    if (isSubmitting || ended) return;
    // 这一句若用尽本场句数预算，则告知 LLM 这是最后一次——回完玩家这问、再自然作别
    const isFinalExchange = turnsLeft - 1 <= 0;
    setIsSubmitting(true);
    try {
      const turnLine = `我：${text}`;
      // 喂 LLM 的近期往来 = 持久历史 + 本场已发生 + 这一句（衔接前文）
      const recentForLlm = [...priorHistory, ...history, turnLine];
      const output = await onSubmit(text, tone, recentForLlm, isFinalExchange);
      if (output) {
        setResponse(output);
        setTurnsUsed((n) => n + 1);
        const opts = output.replyOptions ?? [];
        setHistory((h) => [...h, turnLine, `${character.name}：${output.dialogue}`]);
        // 最后一次 / LLM 自判了结（replyOptions 空）→ 本场收尾，LLM 的 dialogue 即自然作别语
        if (isFinalExchange || opts.length === 0) {
          setReplyOptions([]);
          setConcluded(true);
          setEnded(true);
        } else {
          setReplyOptions(opts);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitFree() {
    const t = freeInput.trim();
    if (!t) return;
    setFreeInput('');
    // 自由输入 tone=undefined（2026-06-26）：好感增减由 LLM 按语义+好感档判定，不再写死 neutral
    void pickReply(t, undefined);
  }

  return (
    <main className="dlg-page">
      <div className="dlg-bg" style={bgImage ? { backgroundImage: `url('${bgImage}')` } : undefined} />
      <div className="dlg-bg-overlay" />

      <header className="dlg-top-bar">
        <button className="dlg-back-btn" onClick={onCancel} type="button">
          ← 返回院中
        </button>
        <span className="dlg-top-sep">｜</span>
        <span className="dlg-top-npc" style={{ color: nameColor }}>{character.name}</span>
        <span className="dlg-top-sep">｜</span>
        <span className="dlg-top-status">
          {response ? emotionStateLabels[response.emotionState] : '相对'}
        </span>
        <span className="dlg-top-sep">｜</span>
        {/* 常驻梅花好感格（2026-06-25）：随时可见当前好感档 */}
        <span className="dlg-top-plums">
          {Array.from({ length: 5 }, (_, i) => (
            <img
              alt=""
              key={i}
              src={i < plumsLit ? '/ui/affinity-plum-lit.png' : '/ui/affinity-plum-dim.png'}
            />
          ))}
        </span>
        <span className="dlg-top-sep">｜</span>
        <span className="dlg-top-status">
          {endingMode
            ? `还可叙 ${turnsLeft} 句`
            : countsTowardQuota
              ? `今日还可说 ${turnsLeft} 句`
              : `初次相识 · 还可说 ${turnsLeft} 句`}
        </span>
        <span className="dlg-top-sep">｜</span>
        <button className="dlg-log-toggle" onClick={() => setShowLog((v) => !v)} type="button">
          {showLog ? '收起往来' : `往来${fullLog.length > 0 ? ` (${fullLog.length})` : ''}`}
        </button>
      </header>

      {/* 往来记录区（2026-06-26）：默认折叠，点「往来」展开滚动列表（含此前持久历史） */}
      {showLog && (
        <aside className="dlg-log-panel">
          <h3 className="dlg-log-title">往来</h3>
          <div className="dlg-log-list">
            {fullLog.length === 0 ? (
              <p className="dlg-log-empty">还未有往来。</p>
            ) : (
              fullLog.map((line, i) => (
                <p className={`dlg-log-line ${line.startsWith('我：') ? 'me' : 'npc'}`} key={i}>{line}</p>
              ))
            )}
          </div>
        </aside>
      )}

      {/* NPC character sprite */}
      <div className="dlg-character">
        <div className="dlg-character-aura" />
        <img
          className="dlg-character-sprite"
          src={portrait}
          alt={character.name}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>


      {/* Bottom: dialogue scroll */}
      <section className="dlg-dialogue-scroll">
        <div className="dlg-dialogue-scroll-inner">
          <span className="dlg-npc-name" style={{ color: nameColor }}>{character.name}</span>
          <p className="dlg-action-text">{npcAction}</p>
          <p className="dlg-dialogue-line">"{npcLine}"</p>
        </div>
      </section>

      {/* Bottom: reply options + free input */}
      <div className="dlg-input-bar">
        <div className="dlg-input-bar-inner">
          {ended ? (
            <div className="dlg-input-bar-left">
              <span className="dlg-input-topic-hint">{endingMode ? '这一席话，暂告段落。' : concluded ? '今日叙话已尽，改日再来。' : '话已说尽，他重新执起笔。'}</span>
            </div>
          ) : isSubmitting ? (
            <div className="dlg-input-bar-left">
              <span className="dlg-input-topic-hint">墨迹未干……</span>
            </div>
          ) : (
            <div className="dlg-reply-options">
              {replyOptions.map((opt, i) => (
                <button
                  className={`dlg-reply-slip dlg-reply-${opt.tone}`}
                  key={`${opt.text}-${i}`}
                  onClick={() => pickReply(opt.text, opt.tone)}
                  type="button"
                >
                  <span className="dlg-reply-text">{opt.text}</span>
                </button>
              ))}
              <div className="dlg-free-input">
                <input
                  className="dlg-input-field"
                  type="text"
                  value={freeInput}
                  onChange={(e) => setFreeInput(e.target.value.slice(0, 40))}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitFree(); }}
                  placeholder="或自己写一句……"
                  maxLength={40}
                />
                <button className="dlg-submit-btn" disabled={!freeInput.trim()} onClick={submitFree} type="button">
                  说
                </button>
              </div>
            </div>
          )}
          <div className="dlg-input-bar-right">
            <button className="dlg-cancel-btn" onClick={onCancel} type="button">
              {endingMode ? (ended ? '就此别过' : '别过') : ended ? '回到院中' : '告辞'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
