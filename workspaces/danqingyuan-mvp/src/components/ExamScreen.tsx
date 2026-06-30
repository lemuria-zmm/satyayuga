import { useState } from 'react';
import type { PaintingPromptGeneratorOutput, QuestionType } from '../types';

export interface ExamAnswer {
  optionId?: string;
  freeText: string;
}

interface ExamScreenProps {
  questions: PaintingPromptGeneratorOutput[];
  onCancel: () => void;
  onSubmit: (answers: Record<string, ExamAnswer>) => Promise<void> | void;
  /** 考试模式（2026-06-28；2026-06-30 加 retake）：final=月末丹青试（庄重）；quick=温书自测（夜读）；retake=落第补考（再给一次） */
  mode?: 'final' | 'quick' | 'retake';
}

/** 按模式区分门头/开场/批阅文案（2026-06-28） */
const examChrome = {
  final: {
    title: '月末丹青试',
    beginBtn: '展开试帖',
    cancelBtn: '暂不入场',
    introText: ['月末试纸已置堂前。', '诸生入席，风止于竹帘之外。'],
    introQuoteLead: '李唐只说了一句：',
    introQuote: '"观其所取，便知其心。"',
    reviewInfo: '批阅中',
    reviewText: ['墨迹未干，试帖已送至案前。', '堂中无人出声，只听帘外风过。'],
  },
  quick: {
    title: '夜读·温书自测',
    beginBtn: '摊开课业',
    cancelBtn: '今夜先歇',
    introText: ['夜深，宿舍灯下。', '你摊开今日的课业，想再默上一遍。'],
    introQuoteLead: '你对自己说：',
    introQuote: '"白日所学，且看记下了几分。"',
    reviewInfo: '自省中',
    reviewText: ['你搁下笔，把方才的答处又看了一回。', '灯花轻爆，窗外夜色沉沉。'],
  },
  retake: {
    title: '丹青补试',
    beginBtn: '重展试帖',
    cancelBtn: '',
    introText: ['一卷新纸重新铺开。', '画院惜才，准你补试一场——这一回，沉住气。'],
    introQuoteLead: '李唐立在案侧，只道：',
    introQuote: '"前番火候未到，这回，画给我看。"',
    reviewInfo: '复阅中',
    reviewText: ['你搁下笔，长长舒了口气。', '这一回，下笔比方才稳了许多。'],
  },
} as const;

const questionTypeLabels: Record<QuestionType, string> = {
  observe_detail: '观察细节',
  express_intent: '表达立意',
  character_dispute: '人物交锋',
  archive_observation: '秘阁观画',
};

const optionBadges = ['甲', '乙', '丙', '丁'];

type ExamPhase = 'intro' | 'answering' | 'submitting';

export function ExamScreen({ questions, onCancel, onSubmit, mode = 'final' }: ExamScreenProps) {
  const chrome = examChrome[mode];
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>(
    Object.fromEntries(questions.map((q) => [q.id, { freeText: '' }])),
  );
  const [phase, setPhase] = useState<ExamPhase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const totalQuestions = questions.length;

  function updateAnswer(questionId: string, patch: Partial<ExamAnswer>) {
    setAnswers((cur) => ({
      ...cur,
      [questionId]: { ...cur[questionId], ...patch },
    }));
  }

  const canSubmitCurrent =
    currentAnswer?.optionId || (currentAnswer?.freeText?.trim().length ?? 0) > 0;

  function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitExam();
    }
  }

  async function submitExam() {
    setIsSubmitting(true);
    setPhase('submitting');
    try {
      await onSubmit(answers);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---- Intro phase ----
  if (phase === 'intro') {
    return (
      <main className="ex-page">
        <div className="ex-bg" />
        <div className="ex-bg-overlay" />

        <div className="ex-plaque">
          <span className="ex-plaque-title">{chrome.title}</span>
          <span className="ex-plaque-sep">·</span>
          <span className="ex-plaque-info">共 {totalQuestions} 题</span>
        </div>

        <section className="ex-intro-paper">
          <div className="ex-intro-paper-inner">
            <p className="ex-intro-text">
              {chrome.introText[0]}
              <br />
              {chrome.introText[1]}
            </p>
            <p className="ex-intro-quote">
              {chrome.introQuoteLead}
              <br />
              {chrome.introQuote}
            </p>
            <button
              className="ex-begin-btn"
              onClick={() => setPhase('answering')}
              type="button"
            >
              {chrome.beginBtn}
            </button>
            {chrome.cancelBtn && (
              <button className="ex-leave-btn" onClick={onCancel} type="button">
                {chrome.cancelBtn}
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  // ---- Submitting / reviewing phase ----
  if (phase === 'submitting') {
    return (
      <main className="ex-page">
        <div className="ex-bg" />
        <div className="ex-bg-overlay" />

        <div className="ex-plaque">
          <span className="ex-plaque-title">{chrome.title}</span>
          <span className="ex-plaque-sep">·</span>
          <span className="ex-plaque-info">{chrome.reviewInfo}</span>
        </div>

        <section className="ex-intro-paper">
          <div className="ex-intro-paper-inner">
            <p className="ex-intro-text">
              {chrome.reviewText[0]}
              <br />
              {chrome.reviewText[1]}
            </p>
            <p className="ex-reviewing-dots">{chrome.reviewInfo} · · ·</p>
          </div>
        </section>
      </main>
    );
  }

  // ---- Answering phase ----
  return (
    <main className="ex-page">
      <div className="ex-bg" />
      <div className="ex-bg-overlay" />

      {/* Top plaque */}
      <div className="ex-plaque">
        <span className="ex-plaque-title">{chrome.title}</span>
        <span className="ex-plaque-sep">·</span>
        <span className="ex-plaque-progress">
          {Array.from({ length: totalQuestions }, (_, i) => (
            <span key={i} className={i <= currentIndex ? 'ex-dot-done' : 'ex-dot-todo'}>
              {i <= currentIndex ? '●' : '○'}
            </span>
          ))}
        </span>
        <span className="ex-plaque-sep">·</span>
        <span className="ex-plaque-type">
          {questionTypeLabels[currentQuestion.questionType]}
        </span>
        {chrome.cancelBtn && (
          <button className="ex-plaque-back" onClick={onCancel} type="button">
            返回
          </button>
        )}
      </div>

      {/* Center exam paper */}
      <section className="ex-paper">
        <div className="ex-paper-content">
          {/* Question type seal */}
          <div className="ex-type-seal">
            <span className="ex-type-seal-text">
              {questionTypeLabels[currentQuestion.questionType]}
            </span>
          </div>

          {/* Question prompt */}
          <div className="ex-prompt">
            <p className="ex-prompt-text">{currentQuestion.promptText}</p>
          </div>

          {/* Options */}
          <div className="ex-option-list">
            {currentQuestion.options.map((option, i) => {
              const isSelected = currentAnswer?.optionId === option.id;
              return (
                <button
                  className={`ex-option ${isSelected ? 'selected' : ''}`}
                  key={option.id}
                  onClick={() => updateAnswer(currentQuestion.id, { optionId: option.id })}
                  type="button"
                >
                  <span className="ex-option-badge">
                    {optionBadges[i] ?? option.id}
                  </span>
                  <span className="ex-option-text">{option.text}</span>
                  {isSelected && <span className="ex-option-stamp" />}
                </button>
              );
            })}
          </div>

          {/* Free answer */}
          <div className="ex-free">
            <span className="ex-free-label">另作一解</span>
            <div className="ex-free-area">
              <textarea
                className="ex-free-input"
                value={currentAnswer?.freeText ?? ''}
                onChange={(e) =>
                  updateAnswer(currentQuestion.id, { freeText: e.target.value })
                }
                placeholder={
                  currentQuestion.freeInputHint ||
                  '若三者皆非你意，可写下你的看法……'
                }
                maxLength={160}
              />
            </div>
            <span className="ex-free-hint">
              此题无标准句式，只看你如何取意。
            </span>
          </div>
        </div>

        {/* Submit button */}
        <button
          className="ex-submit"
          disabled={!canSubmitCurrent || isSubmitting}
          onClick={handleNext}
          type="button"
        >
          {currentIndex < totalQuestions - 1 ? '落笔 · 下一题' : (mode === 'quick' ? '落笔 · 温书毕' : '落笔 · 交卷')}
        </button>
      </section>
    </main>
  );
}
