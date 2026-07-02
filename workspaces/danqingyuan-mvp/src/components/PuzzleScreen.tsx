import { useEffect, useMemo, useRef, useState } from 'react';
import { HAIYOU_PAINTING } from '../content/paintings';
import { CLUE_BY_ID } from '../content/clues';
import type { ClueDef, ClueSource } from '../content/clues';
import { ACT_LABELS, canAdvanceAct, nextAct } from '../engine/puzzleActs';
import type { PuzzleAct } from '../engine/puzzleActs';
import type { PaintingPromptGeneratorOutput } from '../types';

interface PuzzleScreenProps {
  assessmentPrompt: PaintingPromptGeneratorOutput;
  /** 玩家七日带入 + 秘阁已解锁的线索 ID（来自 state.puzzle.collectedClueIds） */
  collectedClueIds: string[];
  onCancel: () => void;
  onSubmit: (result: PuzzleSubmission) => Promise<void> | void;
}

export interface PuzzleSubmission {
  anomalyIds: string[];
  clueIds: string[];
  freeText: string;
}

const SOURCE_ORDER: ClueSource[] = ['书房', '街市', '希孟', '秘阁'];

/* Ink trail hook */
function useInkTrail(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dots: HTMLElement[] = [];
    const MAX_DOTS = 20;

    function onMove(e: MouseEvent) {
      const dot = document.createElement('span');
      dot.className = 'ink-trail-dot';
      const rect = el!.getBoundingClientRect();
      dot.style.left = `${e.clientX - rect.left}px`;
      dot.style.top = `${e.clientY - rect.top}px`;
      const size = 4 + Math.random() * 8;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.opacity = `${0.15 + Math.random() * 0.2}`;
      el!.appendChild(dot);
      dots.push(dot);

      if (dots.length > MAX_DOTS) {
        const old = dots.shift();
        old?.remove();
      }

      setTimeout(() => {
        dot.style.opacity = '0';
        setTimeout(() => dot.remove(), 600);
        const idx = dots.indexOf(dot);
        if (idx > -1) dots.splice(idx, 1);
      }, 500);
    }

    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousemove', onMove);
      dots.forEach((d) => d.remove());
    };
  }, [containerRef]);
}

export function PuzzleScreen({ assessmentPrompt, collectedClueIds, onCancel, onSubmit }: PuzzleScreenProps) {
  const [act, setAct] = useState<PuzzleAct>('enter');
  const [selectedAnomalyIds, setSelectedAnomalyIds] = useState<string[]>([]);
  // 缀线选取：玩家勾选带入解读的线索（carried + observe）
  const [threadedClueIds, setThreadedClueIds] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  useInkTrail(pageRef);

  // 七日带入的线索（carried：书房/街市/希孟）
  const carriedClues = useMemo(
    () =>
      collectedClueIds
        .map((id) => CLUE_BY_ID[id])
        .filter((c): c is ClueDef => Boolean(c) && c.act === 'carried'),
    [collectedClueIds],
  );

  // 观画解锁的秘阁线索（选中异常→grantsClueId）
  const observeClues = useMemo(() => {
    const clueIds = HAIYOU_PAINTING.anomalies
      .filter((anomaly) => selectedAnomalyIds.includes(anomaly.id))
      .map((anomaly) => anomaly.grantsClueId)
      .filter((clueId): clueId is string => Boolean(clueId));
    return clueIds.map((id) => CLUE_BY_ID[id]).filter((c): c is ClueDef => Boolean(c));
  }, [selectedAnomalyIds]);

  // 缀线可选的全部线索 = 带入 + 观画解锁
  const threadableClues = useMemo(() => [...carriedClues, ...observeClues], [carriedClues, observeClues]);

  const threadedSourceCount = useMemo(() => {
    const sources = new Set(
      threadedClueIds.map((id) => CLUE_BY_ID[id]?.source).filter(Boolean) as ClueSource[],
    );
    return sources.size;
  }, [threadedClueIds]);

  const actCtx = {
    observedAnomalyCount: selectedAnomalyIds.length,
    threadedClueCount: threadedClueIds.length,
    threadedSourceCount,
  };

  function toggleAnomaly(anomalyId: string) {
    setSelectedAnomalyIds((current) =>
      current.includes(anomalyId) ? current.filter((id) => id !== anomalyId) : [...current, anomalyId],
    );
  }

  function toggleThread(clueId: string) {
    setThreadedClueIds((current) =>
      current.includes(clueId) ? current.filter((id) => id !== clueId) : [...current, clueId],
    );
  }

  function advance() {
    const next = nextAct(act);
    if (next && canAdvanceAct(act, actCtx)) setAct(next);
  }

  const canSubmit = threadedClueIds.length >= 2 || freeText.trim().length > 8;

  async function submitPuzzle() {
    setIsSubmitting(true);
    try {
      await onSubmit({
        anomalyIds: selectedAnomalyIds,
        clueIds: threadedClueIds,
        freeText,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const topBar = (withBack: boolean) => (
    <header className="pzl-top-bar">
      <div className="pzl-top-bar-inner">
        {withBack && (
          <>
            <button className="pzl-back-btn" onClick={onCancel} type="button">
              ← 暂离秘阁
            </button>
            <span className="pzl-top-sep">｜</span>
          </>
        )}
        <span className="pzl-top-location">秘阁 · 深处</span>
        <span className="pzl-top-sep">｜</span>
        <span className="pzl-top-painting">{HAIYOU_PAINTING.title}</span>
        <span className="pzl-top-sep">｜</span>
        <span className="pzl-top-phase">{ACT_LABELS[act]}</span>
      </div>
    </header>
  );

  // ---- 幕一 · 入阁 ----
  if (act === 'enter') {
    return (
      <main className="pzl-page" ref={pageRef}>
        <div className="pzl-bg" />
        <div className="pzl-vignette" />
        {topBar(true)}

        <section className="pzl-intro-panel">
          <div className="pzl-intro-inner">
            <p className="pzl-intro-text">
              秘阁深处灯影幽微。
              <br />
              一幅画卷平展于石案之上，绢色发黄，笔触古旧。
            </p>
            <p className="pzl-intro-quote">
              画面乍看是市井热闹——
              <br />
              货郎叫卖、婴孩啼哭、药瓶摆放——
              <br />
              但你隐约觉得，热闹里有什么不对。
            </p>
            <h2 className="pzl-intro-title">{HAIYOU_PAINTING.title}</h2>
            <p className="pzl-intro-summary">{HAIYOU_PAINTING.visibleSummary}</p>

            {/* 你已带入的线索（七日收集） */}
            <div className="pzl-carried">
              <h3 className="pzl-carried-title">你带入秘阁的线索</h3>
              {carriedClues.length === 0 ? (
                <p className="pzl-carried-empty">这七日里，你并未在别处留意到什么——只能就着眼前这幅画细看了。</p>
              ) : (
                <ul className="pzl-carried-list">
                  {carriedClues.map((clue) => (
                    <li className="pzl-carried-item" key={clue.id}>
                      <span className="pzl-carried-src">{clue.source}</span>
                      <span className="pzl-carried-name">{clue.title}</span>
                      <span className="pzl-carried-text">{clue.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button className="pzl-begin-btn" onClick={advance} type="button">
              近前观画
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ---- 幕二 · 观画 / 幕三 · 缀线 / 幕四 · 解读 ----
  return (
    <main className="pzl-page" ref={pageRef}>
      <div className="pzl-bg" />
      <div className="pzl-vignette" />
      {topBar(true)}

      {/* 中央面板 */}
      <section className="pzl-center">
        {/* 幕二 观画 */}
        {act === 'observe' && (
          <div className="pzl-question-panel">
            <div className="pzl-question-panel-inner">
              <h2 className="pzl-question-title">《{HAIYOU_PAINTING.title}》</h2>
              <p className="pzl-question-desc">你凝视画卷，以下哪些细节令你不安？（选出的异常会化作线索）</p>

              <div className="pzl-choice-list">
                {HAIYOU_PAINTING.anomalies.map((anomaly) => {
                  const isSelected = selectedAnomalyIds.includes(anomaly.id);
                  return (
                    <button
                      className={`pzl-choice-slip ${isSelected ? 'selected' : ''}`}
                      key={anomaly.id}
                      onClick={() => toggleAnomaly(anomaly.id)}
                      type="button"
                    >
                      <span className="pzl-choice-text">{anomaly.visibleText}</span>
                      {isSelected && <span className="pzl-choice-mark">已察</span>}
                    </button>
                  );
                })}
              </div>

              {canAdvanceAct('observe', actCtx) && (
                <button className="pzl-proceed-btn" onClick={advance} type="button">
                  缀线
                </button>
              )}
            </div>
          </div>
        )}

        {/* 幕三 缀线 */}
        {act === 'thread' && (
          <div className="pzl-question-panel">
            <div className="pzl-question-panel-inner">
              <h2 className="pzl-question-title">缀线成暗</h2>
              <p className="pzl-question-desc">
                把七日所见与眼前画中异常并在一处——勾选你要带入解读的线索（至少 3 条，跨 2 处来源）。
              </p>

              <div className="pzl-thread-groups">
                {SOURCE_ORDER.map((source) => {
                  const group = threadableClues.filter((c) => c.source === source);
                  if (group.length === 0) return null;
                  return (
                    <div className="pzl-thread-group" key={source}>
                      <h4 className="pzl-thread-src">{source}</h4>
                      <div className="pzl-thread-list">
                        {group.map((clue) => (
                          <button
                            className={`pzl-clue-card ${threadedClueIds.includes(clue.id) ? 'selected' : ''}`}
                            key={clue.id}
                            onClick={() => toggleThread(clue.id)}
                            type="button"
                          >
                            <span className="pzl-clue-card-title">{clue.title}</span>
                            <span className="pzl-clue-card-text">{clue.text}</span>
                            {threadedClueIds.includes(clue.id) && <span className="pzl-clue-stamp" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="pzl-thread-progress">
                已缀 {threadedClueIds.length} 条 · 跨 {threadedSourceCount} 处来源
              </p>

              <div className="pzl-interpret-actions">
                <button className="pzl-back-phase-btn" onClick={() => setAct('observe')} type="button">
                  返回观画
                </button>
                {canAdvanceAct('thread', actCtx) && (
                  <button className="pzl-proceed-btn" onClick={advance} type="button">
                    解
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 幕四 解读 */}
        {act === 'interpret' && (
          <>
            <div className="pzl-question-panel">
              <div className="pzl-question-panel-inner">
                <div className="pzl-interpret-header">
                  <span className="pzl-interpret-tag">解读</span>
                  <h2 className="pzl-interpret-prompt">{assessmentPrompt.promptText}</h2>
                </div>

                <div className="pzl-interpret-body">
                  <textarea
                    className="pzl-interpret-input"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    placeholder={assessmentPrompt.freeInputHint || '写下你对这幅画的解读……'}
                    maxLength={200}
                  />
                  <span className="pzl-interpret-hint">
                    结合所缀线索，写下你对画中异常的理解。措辞影响评价深度。
                  </span>
                </div>

                <div className="pzl-interpret-actions">
                  <button className="pzl-back-phase-btn" onClick={() => setAct('thread')} type="button">
                    返回缀线
                  </button>
                </div>
              </div>
            </div>

            <button
              className="pzl-submit-btn"
              disabled={!canSubmit || isSubmitting}
              onClick={submitPuzzle}
              type="button"
            >
              <span className="pzl-submit-text">{isSubmitting ? '候批中……' : '落笔成解'}</span>
            </button>
          </>
        )}
      </section>

      {/* 右侧：已缀线索札记 */}
      <aside className="pzl-notes">
        <div className="pzl-notes-inner">
          <h3 className="pzl-notes-title">缀线札记</h3>
          {threadedClueIds.length === 0 ? (
            <p className="pzl-notes-empty">尚未缀入线索。</p>
          ) : (
            <div className="pzl-notes-clues">
              {threadedClueIds.map((clueId) => {
                const clue = CLUE_BY_ID[clueId];
                if (!clue) return null;
                return (
                  <div className="pzl-note-clue" key={clueId}>
                    <span className="pzl-note-clue-title">
                      {clue.title}
                      <span className="pzl-note-clue-src">· {clue.source}</span>
                    </span>
                    <span className="pzl-note-clue-text">{clue.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </main>
  );
}
