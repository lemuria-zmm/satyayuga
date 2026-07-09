import { useEffect, useRef, useState } from 'react';

/** 入院转场页（2026-07-09 重做·卷轴迎帖）：院落背景 + 小书童滑入 + 卷轴展开 + 入院引文打字机 + 朱印 + 入院。 */
interface AdmissionTransitionProps {
  /** null = LLM 入院引文生成中 */
  text: string | null;
  onEnter: () => void;
}

const CHAR_MS = 42;

export function AdmissionTransition({ text, onEnter }: AdmissionTransitionProps) {
  const [shownLen, setShownLen] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const done = text !== null && shownLen >= text.length;

  // 引文到位后逐字打出
  useEffect(() => {
    if (text === null) {
      setShownLen(0);
      return;
    }
    if (shownLen >= text.length) return;
    timerRef.current = setTimeout(() => setShownLen((l) => l + 1), CHAR_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, shownLen]);

  // 点击卷面：快进整段
  function fastForward() {
    if (text !== null && shownLen < text.length) setShownLen(text.length);
  }

  return (
    <main className="adm-transition">
      <div className="adm-transition-bg" />
      <img
        alt="小书童"
        className="adm-transition-boy"
        src="/char/char-shutong-standard-full-body.png"
      />
      <div className="adm-transition-scroll">
        <div className="adm-transition-plaque">
          <span className="adm-transition-plaque-text">入院 · 小书童来迎</span>
        </div>
        <div className="adm-transition-paper" onClick={fastForward}>
          {text === null ? (
            <p className="adm-transition-text adm-transition-loading">院门将启，墨正落纸……</p>
          ) : (
            <p className="adm-transition-text">
              {text.slice(0, shownLen)}
              {!done && <span className="adm-transition-caret" />}
            </p>
          )}
          <span className={`adm-transition-seal${done ? ' stamped' : ''}`} />
        </div>
        <button
          className="adm-transition-enter"
          disabled={!done}
          onClick={onEnter}
          type="button"
        >
          随小书童入院
        </button>
      </div>
    </main>
  );
}
