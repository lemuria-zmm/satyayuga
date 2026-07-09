import { CHARACTERS } from '../content/characters';
import type { NpcId } from '../types';

/** 结局导师点评立绘（2026-06-30；07-09 改用全身像居中，与其他立绘一致）。批二见希孟复用本组件传 ximeng */
const mentorPortrait: Record<NpcId, string> = {
  litang: '/char/char-litang-standard-full-body.png',
  song: '/char/char-song-standard-full-body.png',
  zeduan: '/char/char-zeduan-standard-full-body.png',
  ximeng: '/char/char-ximeng-full-body-a.png',
};

const npcNameColor: Record<NpcId, string> = {
  ximeng: '#24506B',
  zeduan: '#8A5A32',
  litang: '#6E675E',
  song: '#3F7666',
};

interface EndingDialogueProps {
  npcId: NpcId;
  /** LLM 生成的点评/对白（loading 时为 null，显省略号占位） */
  dialogue: string | null;
  /** 角色动作/场景反应（可空） */
  actionText?: string | null;
  /** 顶部小标（如「丹青试 · 放榜」） */
  caption?: string;
  /** 「继续」推进序列 */
  onContinue: () => void;
}

/**
 * 结局序列轻量对白页（2026-06-30，批一）：单段点评，立绘 + 对话框 + 「继续」。
 * 不用 DialogueScreen——后者带好感梅花格/句数额度等闲聊噪音，结局点评是单向的。
 * 导师点评（A）、批二见希孟（D）都用它。
 */
export function EndingDialogue({ npcId, dialogue, actionText, caption, onContinue }: EndingDialogueProps) {
  const character = CHARACTERS[npcId];
  const nameColor = npcNameColor[npcId];
  const loading = dialogue === null;

  return (
    <main className="dlg-page">
      <div className="dlg-bg" />
      <div className="dlg-bg-overlay" />

      <header className="dlg-top-bar">
        <span className="dlg-top-npc" style={{ color: nameColor }}>{character.name}</span>
        {caption && (
          <>
            <span className="dlg-top-sep">｜</span>
            <span className="dlg-top-status">{caption}</span>
          </>
        )}
      </header>

      <div className="dlg-character dlg-character--review">
        <div className="dlg-character-aura" />
        <img className="dlg-character-sprite" src={mentorPortrait[npcId]} alt={character.name} />
      </div>

      <section className="dlg-dialogue-scroll">
        <div className="dlg-dialogue-scroll-inner">
          <span className="dlg-npc-name" style={{ color: nameColor }}>{character.name}</span>
          {loading ? (
            <p className="dlg-dialogue-line">……</p>
          ) : (
            <>
              {actionText && <p className="dlg-action-text">{actionText}</p>}
              <p className="dlg-dialogue-line">“{dialogue}”</p>
            </>
          )}
          <div className="dlg-reply-row">
            <button
              className="ex-begin-btn"
              disabled={loading}
              onClick={onContinue}
              type="button"
            >
              继续
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
