import { useEffect, useState } from 'react';
import { buildEpilogueLines } from '../content/epilogueText';
import type { EndingResult } from '../types';

interface EpilogueScreenProps {
  ending: EndingResult;
  /** 末尾按钮动作（日终收尾序列：推进到谢幕，或回开局表单） */
  onReset: () => void;
  /** 末尾按钮文案（默认「重新开始」；接谢幕时用「落幕」） */
  buttonLabel?: string;
}

const CHAR_MS = 60;
const LINE_PAUSE_MS = 550;

/**
 * 日终收尾文章段（2026-06-30 初版；2026-07-05 第七日重构：改为按结局档的收尾文章 + 续作预热）。
 * 黑场 + 逐行打字机呈现 `epilogueText` 固定模板；全部播完后淡入「重新开始」。
 * 秘阁五幕已在序列内走完，此处只作最终收束——不再有入秘阁/画室入口。
 */
export function EpilogueScreen({ ending, onReset, buttonLabel = '重新开始' }: EpilogueScreenProps) {
  const lines = buildEpilogueLines(ending.tier);
  const [lineIndex, setLineIndex] = useState(0);
  const [shown, setShown] = useState(0);

  const current = lines[lineIndex] ?? '';
  const lineDone = shown >= current.length;
  const allDone = lineIndex >= lines.length - 1 && lineDone;

  // 逐字打字
  useEffect(() => {
    if (lineDone) return;
    const timer = setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => clearTimeout(timer);
  }, [shown, lineDone]);

  // 本行打完自动进下一行（留停顿）
  useEffect(() => {
    if (!lineDone || allDone) return;
    const timer = setTimeout(() => {
      setLineIndex((i) => i + 1);
      setShown(0);
    }, LINE_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [lineDone, allDone]);

  function handleSkip() {
    if (!lineDone) setShown(current.length);
    else if (!allDone) { setLineIndex((i) => i + 1); setShown(0); }
  }

  return (
    <main className="epi-page" onClick={handleSkip}>
      <div className="epi-veil" />
      <section className="epi-center epi-center-article">
        {/* 已播完的行 */}
        {lines.slice(0, lineIndex).map((line, i) => (
          <p className="epi-article-line" key={i}>{line}</p>
        ))}
        {/* 当前打字行 */}
        <p className="epi-article-line">
          {current.slice(0, shown)}
          {!lineDone && <span className="epi-caret" />}
        </p>

        <div className={`epi-tail${allDone ? ' epi-tail-in' : ''}`}>
          {allDone && (
            <button className="epi-reset-btn" onClick={(e) => { e.stopPropagation(); onReset(); }} type="button">
              {buttonLabel}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
