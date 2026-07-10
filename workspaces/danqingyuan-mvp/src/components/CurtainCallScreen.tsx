import { useEffect, useRef, useState } from 'react';
import type { EndingResult } from '../types';
import { buildCurtainCallPanels, type CurtainFigure } from '../content/curtainCallText';
import { createInkDissolve, type InkDissolve } from '../effects/inkDissolve';

interface CurtainCallScreenProps {
  ending: EndingResult;
  /** 终幕「重新开始」→ 回开局表单 */
  onReset: () => void;
}

const HOLD_MS = 4600; // 停留读文字后触发消融
const PAN_DELAY_MS = 2000; // 消融后停一拍再展下一屏

/**
 * 谢幕长卷（2026-07-10 明明·方案A）：镜头横向展开四屏画（嵩立舟头→二人对弈→希孟俯瞰→定格青绿山水），
 * 每屏对应主创背影 multiply 融画、化成细密粒子飘散；右侧竖排回顾文字逐列浮现；卷尾落朱印+标题+重开。
 * 点击可快进（先催消融、再展卷）。
 */
export function CurtainCallScreen({ ending, onReset }: CurtainCallScreenProps) {
  const panels = buildCurtainCallPanels(ending.tier);
  const last = panels.length - 1;
  const [beat, setBeat] = useState(0);
  const [dissolved, setDissolved] = useState(false);

  const inkHostRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<InkDissolve | null>(null);
  const figureRefs = useRef<Partial<Record<CurtainFigure, HTMLImageElement | null>>>({});

  // 水墨溶解层（尊重 reduce-motion）
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && inkHostRef.current) inkRef.current = createInkDissolve(inkHostRef.current);
    return () => {
      inkRef.current?.destroy();
      inkRef.current = null;
    };
  }, []);

  // 进入一屏：停留后触发消融
  useEffect(() => {
    setDissolved(false);
    const t = setTimeout(() => setDissolved(true), HOLD_MS);
    return () => clearTimeout(t);
  }, [beat]);

  // 消融触发：撒该屏背影粒子；非末屏则停一拍自动展下一屏
  useEffect(() => {
    if (!dissolved) return;
    const figs = panels[beat]?.figures ?? [];
    if (inkRef.current) {
      const host = inkHostRef.current;
      for (const f of figs) {
        const img = figureRefs.current[f];
        if (img && host) {
          const fr = img.getBoundingClientRect();
          const hr = host.getBoundingClientRect();
          inkRef.current.burst(img, { x: fr.left - hr.left, y: fr.top - hr.top, w: fr.width, h: fr.height });
        }
      }
    }
    if (beat < last) {
      const t = setTimeout(() => setBeat((b) => Math.min(b + 1, last)), PAN_DELAY_MS);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dissolved]);

  function advance() {
    if (beat < last) {
      if (!dissolved) setDissolved(true);
      else setBeat((b) => Math.min(b + 1, last));
    }
  }

  const finaleIn = beat === last && dissolved;

  return (
    <main className="cc-page" onClick={advance}>
      <div className="cc-scroll" style={{ transform: `translateX(-${beat * 100}vw)` }}>
        {panels.map((p, i) => (
          <section className="cc-panel" key={i}>
            <div className="cc-panel-bg" style={{ backgroundImage: `url('${p.bg}')` }} />
            <div className="cc-panel-mist" />
            {p.figures.map((f, fi) => {
              const state = i < beat ? 'gone' : i > beat ? 'hidden' : dissolved ? 'exit' : 'enter';
              return (
                <img
                  key={f}
                  ref={(el) => {
                    figureRefs.current[f] = el;
                  }}
                  className={`cc-figure cc-fig-n${p.figures.length} cc-fig-i${fi} cc-figure--${state}`}
                  src={`/char/char-${f}-full-body-back.png`}
                  alt=""
                />
              );
            })}
            {beat >= i && (
              <div className="cc-panel-vtext">
                {p.lines.map((line, li) => (
                  <p className="cc-vline" key={li} style={{ animationDelay: `${0.2 + li * 0.55}s` }}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* 水墨溶解 canvas（屏幕空间，覆盖当前屏） */}
      <div className="cc-ink" ref={inkHostRef} />

      <div className={`cc-finale${finaleIn ? ' cc-finale-in' : ''}`}>
        {finaleIn && (
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

      {!finaleIn && <p className="cc-skip-hint">点击继续</p>}
    </main>
  );
}
