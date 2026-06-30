import type { EndingResult } from '../types';

interface TitleGrantOverlayProps {
  ending: EndingResult;
  /** 授予的职称中文（通过=祗候；落第补考过后也到这） */
  rankLabel: string;
  /** 入秘阁一观（unlockArchive）：暂隐序列进主界面看《骸游图》 */
  onEnterArchive?: () => void;
  /** 赴希孟画室（unlockStudio）：暂隐序列进主界面看画室专属场景 */
  onEnterStudio?: () => void;
  /** 「继续」推进到收尾动画段 E */
  onContinue: () => void;
}

/**
 * 授衔段 B（2026-06-30，批一）：放榜授职的仪式页。
 * 居中朱印「授 — 祗候」+ 七日养成回顾 + 好感/暗线点缀 + 解锁入口（秘阁/画室，并入本段）+ 「继续」进收尾。
 * CSS 朱印占位，授衔图后补。
 */
export function TitleGrantOverlay({ ending, rankLabel, onEnterArchive, onEnterStudio, onContinue }: TitleGrantOverlayProps) {
  const showArchive = ending.unlockArchive && !!onEnterArchive;
  const showStudio = ending.unlockStudio && !!onEnterStudio;
  const bothOpen = showArchive && showStudio;

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

        {/* 解锁入口（并入授衔段）：双开并列 + 预热语 */}
        {(showArchive || showStudio) && (
          <div className="ed-gates">
            <p className="ed-gates-lead">
              {bothOpen
                ? '两扇门，自此同时为你敞开——'
                : showArchive
                  ? '秘阁的重门，向你敞开一线。'
                  : '希孟的画室，为你留着一盏灯。'}
            </p>
            <div className={`ed-gates-row${bothOpen ? ' ed-gates-row-dual' : ''}`}>
              {showArchive && (
                <button className="ex-begin-btn" onClick={onEnterArchive} type="button">
                  入秘阁一观
                </button>
              )}
              {showStudio && (
                <button className="ex-begin-btn" onClick={onEnterStudio} type="button">
                  赴希孟画室
                </button>
              )}
            </div>
          </div>
        )}

        <button className="ex-leave-btn tg-continue" onClick={onContinue} type="button">
          继续
        </button>
      </section>
    </main>
  );
}
