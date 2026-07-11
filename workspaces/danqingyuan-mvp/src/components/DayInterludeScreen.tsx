import { useEffect, useState } from 'react';
import type { DayInterlude } from '../content/dayInterludes';

interface DayInterludeScreenProps {
  interlude: DayInterlude;
  day: number;
  /** 看完/跳过 → 进入次日 */
  onDone: () => void;
}

const CHAR_MS = 62;
const LINE_PAUSE_MS = 620;

/**
 * 每日过场小剧场（2026-07-11）：全屏水墨图 + 逐字模板小故事；点击快进/继续进次日。
 */
export function DayInterludeScreen({ interlude, day, onDone }: DayInterludeScreenProps) {
  const { lines } = interlude;
  const [lineIndex, setLineIndex] = useState(0);
  const [shown, setShown] = useState(0);

  const current = lines[lineIndex] ?? '';
  const lineDone = shown >= current.length;
  const allDone = lineIndex >= lines.length - 1 && lineDone;

  useEffect(() => {
    if (lineDone) return;
    const t = setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => clearTimeout(t);
  }, [shown, lineDone]);

  useEffect(() => {
    if (!lineDone || allDone) return;
    const t = setTimeout(() => {
      setLineIndex((i) => i + 1);
      setShown(0);
    }, LINE_PAUSE_MS);
    return () => clearTimeout(t);
  }, [lineDone, allDone]);

  function handleClick() {
    if (allDone) {
      onDone();
    } else if (!lineDone) {
      setShown(current.length);
    } else {
      setLineIndex((i) => i + 1);
      setShown(0);
    }
  }

  return (
    <main className="di-page" onClick={handleClick}>
      <div className="di-bg" style={{ backgroundImage: `url('${interlude.image}')` }} />
      <div className="di-scrim" />
      <span className="di-day">入院第 {day} 日</span>
      <section className="di-text">
        {lines.slice(0, lineIndex).map((line, i) => (
          <p className="di-line" key={i}>{line}</p>
        ))}
        <p className="di-line">
          {current.slice(0, shown)}
          {!lineDone && <span className="di-caret" />}
        </p>
      </section>
      <p className={`di-hint${allDone ? ' di-hint-in' : ''}`}>{allDone ? '点击继续' : '点击跳过'}</p>
    </main>
  );
}
