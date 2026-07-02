import { useEffect, useState } from 'react';
import { HAIYOU_REVEAL } from '../content/haiyouReveal';
import type { InterpretationTier } from '../types';

interface HaiyouRevealScreenProps {
  tier: InterpretationTier;
  /** 玩家可见批语（幕四 LLM 评），揭卷开篇先呈现 */
  feedback?: string;
  /** 合卷：揭卷序列终点，关闭秘阁提交 */
  onDone: () => void;
}

const CHAR_MS = 55;
const SEGMENT_PAUSE_MS = 500;

/**
 * 秘阁幕五 · 揭卷（2026-07-02 秘阁五幕重做）。
 * 仿 EpilogueScreen 打字机段落序列，逐段呈现 HAIYOU_REVEAL[tier] 固定脚本。
 * 全部段落播完后淡入「合卷」按钮 → onDone（关闭秘阁）。点击任意处可跳过当前段的打字。
 */
export function HaiyouRevealScreen({ tier, feedback, onDone }: HaiyouRevealScreenProps) {
  const segments = HAIYOU_REVEAL[tier] ?? HAIYOU_REVEAL.shallow;
  const [segIndex, setSegIndex] = useState(0);
  const [shown, setShown] = useState(0);

  const current = segments[segIndex] ?? '';
  const segDone = shown >= current.length;
  const allDone = segIndex >= segments.length - 1 && segDone;

  // 逐字打字
  useEffect(() => {
    if (segDone) return;
    const timer = setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => clearTimeout(timer);
  }, [shown, segDone]);

  // 本段打完后自动进下一段（留停顿）
  useEffect(() => {
    if (!segDone || allDone) return;
    const timer = setTimeout(() => {
      setSegIndex((i) => i + 1);
      setShown(0);
    }, SEGMENT_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [segDone, allDone]);

  function handleClick() {
    if (!segDone) {
      // 跳过当前段打字
      setShown(current.length);
    } else if (!allDone) {
      setSegIndex((i) => i + 1);
      setShown(0);
    }
  }

  return (
    <main className="hry-page" onClick={handleClick}>
      <div className="hry-veil" />
      <section className="hry-center">
        <h2 className="hry-title">揭卷</h2>
        {feedback && <p className="hry-feedback">「{feedback}」</p>}

        <p className="hry-line">
          {current.slice(0, shown)}
          {!segDone && <span className="hry-caret" />}
        </p>

        <p className="hry-progress">
          {segments.map((_, i) => (
            <span key={i} className={`hry-dot${i <= segIndex ? ' on' : ''}`} />
          ))}
        </p>

        <div className={`hry-tail${allDone ? ' hry-tail-in' : ''}`}>
          {allDone && (
            <button
              className="hry-done-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDone();
              }}
              type="button"
            >
              合卷
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
