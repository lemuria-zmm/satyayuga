import type { EndingResult, GameState } from '../types';

interface EndingScreenProps {
  ending: EndingResult;
  state: GameState;
  /** 「继续」：进秘阁引桥过场（引文→推门而入/赴画室）。无解锁时 undefined，只留重新开始。 */
  onContinue?: () => void;
  /** 重新开始：回到开局表单 */
  onReset: () => void;
}

/** 各档结局的开场结语（固定模板，不调 LLM——结局须稳定可控）。mvp：通过统一授最低阶祗候 */
const TIER_PROLOGUE: Record<EndingResult['tier'], string[]> = {
  excellent: [
    '丹青试毕，监试李唐在你的卷上停了许久，终于颔首。',
    '榜上你名列前茅。画院循例授你「祗候」——入院第一阶，往后的路还长，但你已踏进这扇门。',
  ],
  good: [
    '丹青试毕，李唐收起你的卷子，淡淡道了句"可"。',
    '你得授「祗候」，正式入了画院。来日能走到哪一步，全看往后的笔。',
  ],
  pass: [
    '丹青试毕，你的卷子算是过了关，虽不出众。',
    '你勉力得授「祗候」，在画院有了一席之地。根基尚浅，往后还得下苦功。',
  ],
  fail: [
    '丹青试毕，李唐看着你的卷子，半晌没有说话。',
    '这一回你未能入选，画院准你留院再读——手上的功夫，还得再磨。',
  ],
};

export function EndingScreen({ ending, state, onContinue, onReset }: EndingScreenProps) {
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

          {/* 「继续」→ 秘阁引桥过场（引文在过场里，入口按钮在过场末尾） */}
          {onContinue && (
            <button className="ex-begin-btn" onClick={onContinue} type="button">
              继续
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
