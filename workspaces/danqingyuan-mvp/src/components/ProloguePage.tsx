import { useEffect, useRef, useState } from 'react';
import { playOpeningBgm } from '../audio/openingAudio';

interface ProloguePageProps {
  /** 引语放完（或玩家跳过）→ 进入入院名录 */
  onContinue: () => void;
}

/**
 * 开场序列（2026-07-09 重做）：入场 gate → 片头视频（青绿山水→丹青院泼彩标题，自带配乐）
 * → 片尾定格 → 穿越引语逐行浮现落印。视频用用户手势解锁带声播放；引语背景用视频抽帧静帧。
 */
const PROLOGUE_LINES = [
  '宣和年间，汴京。',
  '后世传说中最繁华的盛世——也是史册不肯细说的前夜。',
  '你本是千年之后的人，一梦醒来，成了即将入院的丹青学生。',
  '心底却压着一桩说不清的悬念：这满城锦绣之下，仿佛有什么，正被悄悄抹去。',
  '而你，将以同窗的身份，在笔墨间，亲眼看着这一切徐徐展开。',
];

const CHAR_MS = 78; // 每字间隔
const LINE_PAUSE_MS = 540; // 行末停顿

type Phase = 'gate' | 'video' | 'freeze' | 'verse';

export function ProloguePage({ onContinue }: ProloguePageProps) {
  const [phase, setPhase] = useState<Phase>('gate');
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [sealIn, setSealIn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const verseDone = phase === 'verse' && lineIdx >= PROLOGUE_LINES.length;

  // 进 video 阶段：显式 play（gate 点击是用户手势，允许带声自动播放）
  useEffect(() => {
    if (phase === 'video') {
      videoRef.current?.play().catch(() => {
        /* 播放被拒：玩家可点「跳过」进引语 */
      });
    }
  }, [phase]);

  // 打字机仅在 verse 阶段跑
  useEffect(() => {
    if (phase !== 'verse') return;
    if (lineIdx >= PROLOGUE_LINES.length) {
      setSealIn(true);
      return;
    }
    const line = PROLOGUE_LINES[lineIdx];
    if (charIdx < line.length) {
      timerRef.current = setTimeout(() => setCharIdx((c) => c + 1), CHAR_MS);
    } else {
      timerRef.current = setTimeout(() => {
        setLineIdx((l) => l + 1);
        setCharIdx(0);
      }, LINE_PAUSE_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, lineIdx, charIdx]);

  function enterVerse() {
    videoRef.current?.pause();
    playOpeningBgm(); // 视频配乐止，接低音量竹林配乐续到入院
    setPhase('verse');
  }

  // verse 点击：未放完→全部直出；已放完→继续
  function handleVerseClick() {
    if (lineIdx >= PROLOGUE_LINES.length) {
      onContinue();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setLineIdx(PROLOGUE_LINES.length);
      setCharIdx(0);
    }
  }

  // —— Phase 0：入场 gate（背景图自带「丹青院·墨枢秘录」标题）——
  if (phase === 'gate') {
    return (
      <main className="prologue-page prologue-gate" onClick={() => setPhase('video')}>
        <div className="prologue-gate-bg" />
        <p className="prologue-gate-hint">点击进入</p>
      </main>
    );
  }

  // —— Phase 1/2：片头视频 + 片尾定格 ——
  if (phase === 'video' || phase === 'freeze') {
    return (
      <main className="prologue-page prologue-cinema">
        <video
          className="prologue-video"
          ref={videoRef}
          src="/opening.mp4"
          poster="/bg-opening-title.png"
          preload="auto"
          playsInline
          onEnded={() => setPhase('freeze')}
        />
        {/* 预载引语页背景，避免切到 verse 时黑屏一闪 */}
        <img alt="" className="prologue-preload" src="/bg-verse-paper.png" />
        {phase === 'video' && (
          <button className="prologue-skip" onClick={enterVerse} type="button">
            点击跳过
          </button>
        )}
        {phase === 'freeze' && (
          <div className="prologue-freeze-veil" onClick={enterVerse}>
            <p className="prologue-hint prologue-hint-in prologue-freeze-hint">点击继续</p>
          </div>
        )}
      </main>
    );
  }

  // —— Phase 3：穿越引语 ——
  return (
    <main className="prologue-page prologue-verse" onClick={handleVerseClick}>
      <div className="prologue-verse-bg" />
      <div className="prologue-verse-scrim" />
      {/* 预载入院名录背景，避免切 setup 黑闪 */}
      <img alt="" className="prologue-preload" src="/admission/bg-admission-hall.png" />
      <section className="prologue-center">
        {PROLOGUE_LINES.map((line, i) => {
          if (i > lineIdx) return null;
          const shown = i < lineIdx ? line : line.slice(0, charIdx);
          const typing = i === lineIdx && lineIdx < PROLOGUE_LINES.length;
          return (
            <p className="prologue-line" key={i}>
              {shown}
              {typing && <span className="prologue-caret" />}
            </p>
          );
        })}
        {sealIn && <span className="prologue-seal" />}
      </section>
      <p className={`prologue-hint${verseDone ? ' prologue-hint-in' : ''}`}>
        {verseDone ? '点击继续 · 填写入院名录' : '点击跳过'}
      </p>
    </main>
  );
}
