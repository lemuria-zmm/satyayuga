import type { EndingResult } from '../types';

interface TitleGrantOverlayProps {
  ending: EndingResult;
  /** 授予的职称中文（通过=祗候；落第补考过后也到这） */
  rankLabel: string;
  /** 「继续」推进序列（→ 引希孟线/收尾） */
  onContinue: () => void;
}

/**
 * 授衔段 B（2026-06-30，批一；批二修：解锁入口移到收尾页）：放榜授职的仪式页。
 * 居中朱印「授 — 祗候」+ 七日养成回顾 + 好感/暗线点缀 + 「继续」推进。
 * **解锁入口（秘阁/画室）已移至收尾页 EpilogueScreen**——避免授衔页「赴希孟画室」与「继续」（→见希孟演出）两个希孟入口冲突误导。
 * CSS 朱印占位，授衔图后补。
 */
export function TitleGrantOverlay({ ending, rankLabel, onContinue }: TitleGrantOverlayProps) {
  return (
    <main className="tg-page">
      <div className="tg-bg" />
      <div className="tg-bg-overlay" />

      <section className="tg-card">
        <p className="tg-lead">画院循例，授你——</p>
        <div className="tg-seal">
          <span className="tg-seal-rank">{rankLabel}</span>
        </div>
        <p className="tg-sub">自此你在丹青院有了名分，往后的路，全看手中这支笔。</p>

        {/* 七日养成回顾 */}
        <div className="ed-recap tg-recap">
          {ending.summaryLines.map((line) => (
            <p key={line} className="ed-recap-line">{line}</p>
          ))}
        </div>

        {/* 希孟羁绊 / 暗线点缀 */}
        {ending.ximengNote && <p className="tg-quote">{ending.ximengNote}</p>}
        {ending.themeNote && <p className="tg-quote">{ending.themeNote}</p>}

        <button className="ex-begin-btn tg-continue" onClick={onContinue} type="button">
          继续
        </button>
      </section>
    </main>
  );
}
