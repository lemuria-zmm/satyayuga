import type { EndingResult, GameState } from '../types';

interface EndingScreenProps {
  ending: EndingResult;
  state: GameState;
  /** 入秘阁一观（仅 unlockArchive 档可用）：打开《骸游图》解读 */
  onEnterArchive?: () => void;
  /** 重新开始：回到开局表单 */
  onReset: () => void;
}

/** 各档结局的开场结语（固定模板，不调 LLM——结局须稳定可控） */
const TIER_PROLOGUE: Record<EndingResult['tier'], string[]> = {
  excellent: [
    '丹青试毕，监试李唐在你的卷上停了许久，终于颔首。',
    '画院榜文张挂之日，你的名字列在最前——擢为画待诏，得侍御前。',
  ],
  good: [
    '丹青试毕，李唐收起你的卷子，淡淡道了句"可"。',
    '你晋为画正，秘阁的重门，自此向你敞开一线。',
  ],
  pass: [
    '丹青试毕，你的卷子算是过了关，虽不出众。',
    '你晋为画正，留在画院。来日方长，笔下的路还要自己走。',
  ],
  fail: [
    '丹青试毕，李唐看着你的卷子，半晌没有说话。',
    '这一回你未能晋身，画院准你留院再读——手上的功夫，还得再磨。',
  ],
};

export function EndingScreen({ ending, state, onEnterArchive, onReset }: EndingScreenProps) {
  void state;
  const prologue = TIER_PROLOGUE[ending.tier];

  return (
    <main className="ex-page">
      <div className="ex-bg" />
      <div className="ex-bg-overlay" />

      <div className="ex-plaque">
        <span className="ex-plaque-title">{ending.title}</span>
        <span className="ex-plaque-sep">·</span>
        <span className="ex-plaque-info">七日终</span>
      </div>

      <section className="ex-intro-paper">
        <div className="ex-intro-paper-inner">
          <p className="ex-intro-text">
            {prologue[0]}
            <br />
            {prologue[1]}
          </p>

          {/* 七日养成回顾 */}
          <div className="ed-recap">
            {ending.summaryLines.map((line) => (
              <p key={line} className="ed-recap-line">{line}</p>
            ))}
          </div>

          {/* 希孟羁绊 / 暗线点缀 */}
          {ending.ximengNote && <p className="ex-intro-quote">{ending.ximengNote}</p>}
          {ending.themeNote && <p className="ex-intro-quote">{ending.themeNote}</p>}

          {ending.unlockArchive && onEnterArchive && (
            <button className="ex-begin-btn" onClick={onEnterArchive} type="button">
              入秘阁一观
            </button>
          )}
          <button className="ex-leave-btn" onClick={onReset} type="button">
            重新开始
          </button>
        </div>
      </section>
    </main>
  );
}
