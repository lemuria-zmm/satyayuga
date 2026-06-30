import { useEffect, useState } from 'react';

interface EpilogueScreenProps {
  /** 重新开始：序列终点，回开局表单 */
  onReset: () => void;
}

const EPILOGUE_LINE = '画院之路，才刚刚开始……';

/**
 * 收尾动画段 E（2026-06-30，批一）：黑场 + 打字机渐显收尾语 + 「重新开始」。
 * 纯 CSS/JS 打字机，不依赖额外库；收尾背景图后补。序列终点（替代旧 EndingScreen 重开）。
 */
export function EpilogueScreen({ onReset }: EpilogueScreenProps) {
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
        <button
          className={`epi-reset-btn${done ? ' epi-reset-btn-in' : ''}`}
          onClick={onReset}
          type="button"
        >
          重新开始
        </button>
      </section>
    </main>
  );
}
