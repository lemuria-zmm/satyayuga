import { useEffect, useMemo, useRef, useState } from 'react';
import { HAIYOU_PAINTING } from '../content/paintings';
import type { PaintingPromptGeneratorOutput } from '../types';

interface PuzzleScreenProps {
  assessmentPrompt: PaintingPromptGeneratorOutput;
  onCancel: () => void;
  onSubmit: (result: PuzzleSubmission) => Promise<void> | void;
}

export interface PuzzleSubmission {
  anomalyIds: string[];
  clueIds: string[];
  freeText: string;
}

const clueCards = [
  {
    id: 'clue_medicine_bottle',
    title: '药瓶',
    text: '瓶口朝外，像被刻意摆给看画的人。',
  },
  {
    id: 'clue_child_posture',
    title: '婴孩',
    text: '孩子的哭不是热闹的一部分，更像无人回应的求救。',
  },
  {
    id: 'clue_blocked_waterway',
    title: '被遮住的水路',
    text: '摊位与人群挡住画角，那里似乎有一条走不到尽头的水路。',
  },
];

type PuzzlePhase = 'intro' | 'observing' | 'interpreting' | 'submitting';

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

export function PuzzleScreen({ assessmentPrompt, onCancel, onSubmit }: PuzzleScreenProps) {
  const [phase, setPhase] = useState<PuzzlePhase>('intro');
  const [selectedAnomalyIds, setSelectedAnomalyIds] = useState<string[]>([]);
  const [selectedClueIds, setSelectedClueIds] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  useInkTrail(pageRef);

  const unlockedClues = useMemo(() => {
    const clueIds = HAIYOU_PAINTING.anomalies
      .filter((anomaly) => selectedAnomalyIds.includes(anomaly.id))
      .map((anomaly) => anomaly.grantsClueId)
      .filter((clueId): clueId is string => Boolean(clueId));
    return clueCards.filter((clue) => clueIds.includes(clue.id));
  }, [selectedAnomalyIds]);

  function toggleAnomaly(anomalyId: string) {
    setSelectedAnomalyIds((current) =>
      current.includes(anomalyId) ? current.filter((id) => id !== anomalyId) : [...current, anomalyId],
    );
  }

  function toggleClue(clueId: string) {
    setSelectedClueIds((current) =>
      current.includes(clueId) ? current.filter((id) => id !== clueId) : [...current, clueId],
    );
  }

  const canSubmit = selectedClueIds.length >= 2 || freeText.trim().length > 8;

  async function submitPuzzle() {
    setIsSubmitting(true);
    setPhase('submitting');
    try {
      await onSubmit({
        anomalyIds: selectedAnomalyIds,
        clueIds: selectedClueIds,
        freeText,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- Intro phase ----
  if (phase === 'intro') {
    return (
      <main className="pzl-page" ref={pageRef}>
        <div className="pzl-bg" />
        <div className="pzl-vignette" />

        <header className="pzl-top-bar">
          <div className="pzl-top-bar-inner">
            <button className="pzl-back-btn" onClick={onCancel} type="button">
              ← 暂离秘阁
            </button>
            <span className="pzl-top-sep">｜</span>
            <span className="pzl-top-location">秘阁 · 深处</span>
            <span className="pzl-top-sep">｜</span>
            <span className="pzl-top-painting">{HAIYOU_PAINTING.title}</span>
          </div>
        </header>

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
            <button
              className="pzl-begin-btn"
              onClick={() => setPhase('observing')}
              type="button"
            >
              近前观画
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ---- Submitting phase ----
  if (phase === 'submitting') {
    return (
      <main className="pzl-page" ref={pageRef}>
        <div className="pzl-bg" />
        <div className="pzl-vignette" />

        <header className="pzl-top-bar">
          <div className="pzl-top-bar-inner">
            <span className="pzl-top-location">秘阁 · 深处</span>
            <span className="pzl-top-sep">｜</span>
            <span className="pzl-top-painting">{HAIYOU_PAINTING.title}</span>
            <span className="pzl-top-sep">｜</span>
            <span className="pzl-top-status">候批中</span>
          </div>
        </header>

        <section className="pzl-intro-panel">
          <div className="pzl-intro-inner">
            <p className="pzl-intro-text">
              你的解读随墨迹渗入画卷。
              <br />
              灯焰微颤，秘阁中一时寂然无声。
            </p>
            <p className="pzl-reviewing-dots">批阅中 · · ·</p>
          </div>
        </section>
      </main>
    );
  }

  // ---- Observing & Interpreting phases ----
  return (
    <main className="pzl-page" ref={pageRef}>
      <div className="pzl-bg" />
      <div className="pzl-vignette" />

      {/* Top bar */}
      <header className="pzl-top-bar">
        <div className="pzl-top-bar-inner">
          <button className="pzl-back-btn" onClick={onCancel} type="button">
            ← 暂离秘阁
          </button>
          <span className="pzl-top-sep">｜</span>
          <span className="pzl-top-location">秘阁 · 深处</span>
          <span className="pzl-top-sep">｜</span>
          <span className="pzl-top-painting">{HAIYOU_PAINTING.title}</span>
          <span className="pzl-top-sep">｜</span>
          <span className="pzl-top-phase">
            {phase === 'observing' ? '一 · 观画' : '二 · 解读'}
          </span>
          <span className="pzl-top-sep">｜</span>
          <span className="pzl-top-progress">
            异常 {selectedAnomalyIds.length}/{HAIYOU_PAINTING.anomalies.length}
            {' '}· 线索 {selectedClueIds.length}
          </span>
        </div>
      </header>

      {/* Left: Clue box */}
      <aside className="pzl-clue-box">
        <div className="pzl-clue-box-inner">
          <h3 className="pzl-clue-title">线索匣</h3>
          {unlockedClues.length === 0 ? (
            <p className="pzl-clue-empty">先从画面里指出异常，线索才会浮出来。</p>
          ) : (
            <div className="pzl-clue-list">
              {unlockedClues.map((clue) => (
                <button
                  className={`pzl-clue-card ${selectedClueIds.includes(clue.id) ? 'selected' : ''}`}
                  key={clue.id}
                  onClick={() => toggleClue(clue.id)}
                  type="button"
                >
                  <span className="pzl-clue-card-title">{clue.title}</span>
                  <span className="pzl-clue-card-text">{clue.text}</span>
                  {selectedClueIds.includes(clue.id) && (
                    <span className="pzl-clue-stamp" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected clue slots */}
          <div className="pzl-clue-slots">
            <span className="pzl-slots-label">已取线索</span>
            <div className="pzl-slots-row">
              {[0, 1, 2].map((i) => {
                const clueId = selectedClueIds[i];
                const clue = clueCards.find((c) => c.id === clueId);
                return (
                  <div className={`pzl-slot ${clue ? 'filled' : ''}`} key={i}>
                    {clue ? clue.title : '—'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Center: question panel */}
      <section className="pzl-center">
        {phase === 'observing' && (
          <div className="pzl-question-panel">
            <div className="pzl-question-panel-inner">
              <h2 className="pzl-question-title">
                《{HAIYOU_PAINTING.title}》
              </h2>
              <p className="pzl-question-desc">你凝视画卷，以下哪些细节令你不安？</p>

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

              {selectedAnomalyIds.length > 0 && (
                <button
                  className="pzl-proceed-btn"
                  onClick={() => setPhase('interpreting')}
                  type="button"
                >
                  解
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'interpreting' && (
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
                  结合所取线索，写下你对画中异常的理解。措辞影响评价深度。
                </span>
              </div>

              <div className="pzl-interpret-actions">
                <button
                  className="pzl-back-phase-btn"
                  onClick={() => setPhase('observing')}
                  type="button"
                >
                  返回观画
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom submit button */}
        {phase === 'interpreting' && (
          <button
            className="pzl-submit-btn"
            disabled={!canSubmit || isSubmitting}
            onClick={submitPuzzle}
            type="button"
          >
            <span className="pzl-submit-text">
              {isSubmitting ? '候批中……' : '落笔成解'}
            </span>
          </button>
        )}
      </section>

      {/* Right: observation notes */}
      <aside className="pzl-notes">
        <div className="pzl-notes-inner">
          <h3 className="pzl-notes-title">观画札记</h3>
          {selectedAnomalyIds.length === 0 ? (
            <p className="pzl-notes-empty">尚未发现异常。</p>
          ) : (
            <div className="pzl-notes-list">
              {selectedAnomalyIds.map((anomalyId) => {
                const anomaly = HAIYOU_PAINTING.anomalies.find((a) => a.id === anomalyId);
                if (!anomaly) return null;
                return (
                  <div className="pzl-note-item" key={anomalyId}>
                    <span className="pzl-note-bullet" />
                    <span className="pzl-note-text">{anomaly.visibleText}</span>
                  </div>
                );
              })}
            </div>
          )}

          {selectedClueIds.length > 0 && (
            <div className="pzl-notes-clues">
              <h4 className="pzl-notes-subtitle">已取线索</h4>
              {selectedClueIds.map((clueId) => {
                const clue = clueCards.find((c) => c.id === clueId);
                if (!clue) return null;
                return (
                  <div className="pzl-note-clue" key={clueId}>
                    <span className="pzl-note-clue-title">{clue.title}</span>
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
