import { useEffect, useRef, useState } from 'react';

interface ProloguePageProps {
  /** 引语放完（或玩家跳过）→ 进入入院名录 */
  onContinue: () => void;
}

/**
 * 穿越引语页（2026-06-30，先简单做）：入院名录之前的一页，打字机逐字呈现穿越缘起。
 * 后续会详细设计这一页（配乐/分镜/美术）；此处先用 CSS 黑场 + 逐字打字。
 */
const PROLOGUE_LINES = [
  '宣和年间，汴京。',
  '这是后世传说中最繁华的盛世，也是史册不肯细说的前夜。',
  '你本是千年之后的人，一觉醒来，竟成了将入丹青院的画学生。',
  '脑海里挥之不去的，是一个史册未解的谜——',
  '那位惊才绝艳的少年画师，画完《千里江山卷》后，为何就此消失，再无音讯？',
  '如今，你将以同窗的身份，亲眼看着这一切发生。',
];

const CHAR_MS = 80; // 每字间隔
const LINE_PAUSE_MS = 600; // 行末停顿

export function ProloguePage({ onContinue }: ProloguePageProps) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allDone = lineIdx >= PROLOGUE_LINES.length;

  useEffect(() => {
    if (allDone) return;
    const line = PROLOGUE_LINES[lineIdx];
    if (charIdx < line.length) {
      timerRef.current = setTimeout(() => setCharIdx((c) => c + 1), CHAR_MS);
    } else {
      // 本行打完，停顿后进入下一行
      timerRef.current = setTimeout(() => {
        setLineIdx((l) => l + 1);
        setCharIdx(0);
      }, LINE_PAUSE_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lineIdx, charIdx, allDone]);

  // 点击：未放完 → 全部直出；已放完 → 继续
  function handleClick() {
    if (allDone) {
      onContinue();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setLineIdx(PROLOGUE_LINES.length);
    }
  }

  return (
    <main className="prologue-page" onClick={handleClick}>
      <div className="prologue-veil" />
      <section className="prologue-center">
        {PROLOGUE_LINES.map((line, i) => {
          if (i > lineIdx) return null;
          const shown = i < lineIdx ? line : line.slice(0, charIdx);
          const typing = i === lineIdx && !allDone;
          return (
            <p className="prologue-line" key={i}>
              {shown}
              {typing && <span className="prologue-caret" />}
            </p>
          );
        })}
      </section>
      <p className={`prologue-hint${allDone ? ' prologue-hint-in' : ''}`}>
        {allDone ? '点击继续 · 填写入院名录' : '点击跳过'}
      </p>
    </main>
  );
}
