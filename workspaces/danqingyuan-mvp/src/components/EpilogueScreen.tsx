import { useEffect, useState } from 'react';
import type { EndingResult } from '../types';

interface EpilogueScreenProps {
  ending: EndingResult;
  /** 「继续」：打字机播完后浮现，进秘阁引桥过场（引文→推门而入）。无解锁时为 undefined，只留重新开始。 */
  onContinue?: () => void;
  /** 重新开始：序列终点，回开局表单 */
  onReset: () => void;
}

const EPILOGUE_LINE = '画院之路，才刚刚开始……';

/**
 * 收尾动画段 E（2026-06-30，批一；2026-07-03 改：入口收敛为「继续」→ 秘阁引桥过场）：
 * 黑场 + 打字机渐显收尾语；打字完成后淡入「继续」（→ 引桥引文 → 推门而入）+「重新开始」。
 * 探索入口（秘阁/画室）移到引桥过场末尾，保证"收尾→引文→入秘阁按钮"顺序。
 */
export function EpilogueScreen({ onContinue, onReset }: EpilogueScreenProps) {
  const [shown, setShown] = useState(0);
  const done = shown >= EPILOGUE_LINE.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setShown((n) => n + 1), 140);
    return () => clearTimeout(timer);
  }, [shown, done]);

  return (
    <main className="epi-page">
      <div className="epi-veil" />
      <section className="epi-center">
        <p className="epi-line">
          {EPILOGUE_LINE.slice(0, shown)}
          {!done && <span className="epi-caret" />}
        </p>

        <div className={`epi-tail${done ? ' epi-tail-in' : ''}`}>
          {onContinue && (
            <button className="epi-gate-btn" onClick={onContinue} type="button">
              继续
            </button>
          )}
          <button className="epi-reset-btn" onClick={onReset} type="button">
            重新开始
          </button>
        </div>
      </section>
    </main>
  );
}
