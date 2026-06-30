import { useEffect, useState } from 'react';
import type { EndingResult } from '../types';

interface EpilogueScreenProps {
  ending: EndingResult;
  /** 入秘阁一观（unlockArchive）：暂隐序列进主界面看《骸游图》 */
  onEnterArchive?: () => void;
  /** 赴希孟画室（unlockStudio）：暂隐序列进主界面看画室专属场景 */
  onEnterStudio?: () => void;
  /** 重新开始：序列终点，回开局表单 */
  onReset: () => void;
}

const EPILOGUE_LINE = '画院之路，才刚刚开始……';

/**
 * 收尾动画段 E（2026-06-30，批一；批二修：承接解锁入口）：黑场 + 打字机渐显收尾语。
 * 打字完成后淡入**解锁入口（秘阁/画室，从授衔页移来）+ 重新开始**——演出走完才给探索入口，不与「继续」冲突。
 * 纯 CSS/JS 打字机，不依赖额外库；收尾背景图后补。序列终点。
 */
export function EpilogueScreen({ ending, onEnterArchive, onEnterStudio, onReset }: EpilogueScreenProps) {
  const [shown, setShown] = useState(0);
  const done = shown >= EPILOGUE_LINE.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setShown((n) => n + 1), 140);
    return () => clearTimeout(timer);
  }, [shown, done]);

  const showArchive = ending.unlockArchive && !!onEnterArchive;
  const showStudio = ending.unlockStudio && !!onEnterStudio;
  const bothOpen = showArchive && showStudio;

  return (
    <main className="epi-page">
      <div className="epi-veil" />
      <section className="epi-center">
        <p className="epi-line">
          {EPILOGUE_LINE.slice(0, shown)}
          {!done && <span className="epi-caret" />}
        </p>

        <div className={`epi-tail${done ? ' epi-tail-in' : ''}`}>
          {/* 解锁入口（批二从授衔页移来）：通关后探索入口，演出走完才出现 */}
          {(showArchive || showStudio) && (
            <div className="ed-gates epi-gates">
              <p className="ed-gates-lead">
                {bothOpen
                  ? '两扇门，自此同时为你敞开——'
                  : showArchive
                    ? '秘阁的重门，向你敞开一线。'
                    : '希孟的画室，为你留着一盏灯。'}
              </p>
              <div className={`ed-gates-row${bothOpen ? ' ed-gates-row-dual' : ''}`}>
                {showArchive && (
                  <button className="epi-gate-btn" onClick={onEnterArchive} type="button">
                    入秘阁一观
                  </button>
                )}
                {showStudio && (
                  <button className="epi-gate-btn" onClick={onEnterStudio} type="button">
                    赴希孟画室
                  </button>
                )}
              </div>
            </div>
          )}

          <button className="epi-reset-btn" onClick={onReset} type="button">
            重新开始
          </button>
        </div>
      </section>
    </main>
  );
}
