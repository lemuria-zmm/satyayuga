import { useEffect, useRef, useState } from 'react';
import type { EndingResult } from '../types';
import { buildCurtainCallLines } from '../content/curtainCallText';
import { createInkDissolve, type InkDissolve } from '../effects/inkDissolve';

interface CurtainCallScreenProps {
  ending: EndingResult;
  /** 终幕「重新开始」→ 回开局表单 */
  onReset: () => void;
}

const CHAR_MS = 62;
const LINE_PAUSE_MS = 900;

const FIGURES = ['litang', 'zeduan', 'song', 'ximeng'] as const;
type FigureKey = (typeof FIGURES)[number];

/**
 * 谢幕落幕页（2026-07-10）：青绿山水作幕布，四位主创背影 multiply「融画」逐一入画谢幕，
 * 配固定模板回顾文字逐行呈现，末位希孟入画后落朱印+标题+重新开始。
 * 背影立绘白底 → mix-blend-mode:multiply 隐去白底、纹样融入山水。水墨溶解用原生 canvas。
 */
export function CurtainCallScreen({ ending, onReset }: CurtainCallScreenProps) {
  const lines = buildCurtainCallLines(ending.tier);
  const [lineIndex, setLineIndex] = useState(0);
  const [shown, setShown] = useState(0);

  const inkHostRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<InkDissolve | null>(null);
  const figureRefs = useRef<Partial<Record<FigureKey, HTMLImageElement | null>>>({});
  const burstedRef = useRef<Set<number>>(new Set());

  const current = lines[lineIndex]?.text ?? '';
  const lineDone = shown >= current.length;
  const allDone = lineIndex >= lines.length - 1 && lineDone;

  // 每个角色出现在哪一行
  const lineForFigure: Partial<Record<FigureKey, number>> = {};
  lines.forEach((l, i) => {
    if (l.figure) lineForFigure[l.figure] = i;
  });

  // 水墨溶解层（尊重 reduce-motion）
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && inkHostRef.current) {
      inkRef.current = createInkDissolve(inkHostRef.current);
    }
    return () => {
      inkRef.current?.destroy();
      inkRef.current = null;
    };
  }, []);

  // 逐字打字
  useEffect(() => {
    if (lineDone) return;
    const t = setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => clearTimeout(t);
  }, [shown, lineDone]);

  // 本行打完自动进下一行
  useEffect(() => {
    if (!lineDone || allDone) return;
    const t = setTimeout(() => {
      setLineIndex((i) => i + 1);
      setShown(0);
    }, LINE_PAUSE_MS);
    return () => clearTimeout(t);
  }, [lineDone, allDone]);

  // 行推进：上一行的角色刚转入 exit（入画）→ 在其位置撒水墨溶解
  useEffect(() => {
    const prev = lines[lineIndex - 1];
    if (!prev?.figure || burstedRef.current.has(lineIndex - 1)) return;
    burstedRef.current.add(lineIndex - 1);
    const img = figureRefs.current[prev.figure];
    const host = inkHostRef.current;
    if (inkRef.current && img && host) {
      const fr = img.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      inkRef.current.burst(img, { x: fr.left - hr.left, y: fr.top - hr.top, w: fr.width, h: fr.height });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIndex]);

  function handleClick() {
    if (allDone) return; // 终幕由按钮控制
    if (!lineDone) setShown(current.length);
    else setLineIndex((i) => Math.min(i + 1, lines.length - 1));
  }

  return (
    <main className="cc-page" onClick={handleClick}>
      <div className="cc-bg" />
      <div className="cc-mist" />
      <div className="cc-vignette" />

      {/* 四人背影（一次一个：before 隐 / enter 前景 / exit 递退入画） */}
      {FIGURES.map((f) => {
        const fi = lineForFigure[f];
        const state =
          fi === undefined || lineIndex < fi ? 'before' : lineIndex === fi ? 'enter' : 'exit';
        return (
          <img
            key={f}
            ref={(el) => {
              figureRefs.current[f] = el;
            }}
            className={`cc-figure cc-fig-${f} cc-figure--${state}`}
            src={`/char/char-${f}-full-body-back.png`}
            alt=""
          />
        );
      })}

      {/* 水墨溶解 canvas 宿主（最上，pointer-events:none 由 CSS 管） */}
      <div className="cc-ink" ref={inkHostRef} />

      {/* 回顾文字 */}
      <div className="cc-text">
        <p className="cc-line" key={lineIndex}>
          {current.slice(0, shown)}
          {!lineDone && <span className="cc-caret" />}
        </p>
      </div>

      {/* 终幕：朱印 + 标题 + 重新开始 */}
      <div className={`cc-finale${allDone ? ' cc-finale-in' : ''}`}>
        {allDone && (
          <>
            <span className="cc-seal" />
            <h1 className="cc-title">丹青院</h1>
            <p className="cc-subtitle">墨枢秘录</p>
            <button
              className="cc-restart-btn"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              type="button"
            >
              重新开始
            </button>
          </>
        )}
      </div>
    </main>
  );
}
