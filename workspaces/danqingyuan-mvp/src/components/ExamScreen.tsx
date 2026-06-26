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
}

const questionTypeLabels: Record<QuestionType, string> = {
  observe_detail: '观察细节',
  express_intent: '表达立意',
  character_dispute: '人物交锋',
  archive_observation: '秘阁观画',
};

const optionBadges = ['甲', '乙', '丙', '丁'];

type ExamPhase = 'intro' | 'answering' | 'submitting';

export function ExamScreen({ questions, onCancel, onSubmit }: ExamScreenProps) {
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
          <span className="ex-plaque-title">月末丹青试</span>
          <span className="ex-plaque-sep">·</span>
          <span className="ex-plaque-info">共 {totalQuestions} 题</span>
        </div>

        <section className="ex-intro-paper">
          <div className="ex-intro-paper-inner">
            <p className="ex-intro-text">
              月末试纸已置堂前。
              <br />
              诸生入席，风止于竹帘之外。
            </p>
            <p className="ex-intro-quote">
              李唐只说了一句：
              <br />
              "观其所取，便知其心。"
            </p>
            <button
              className="ex-begin-btn"
              onClick={() => setPhase('answering')}
              type="button"
            >
              展开试帖
            </button>
            <button className="ex-leave-btn" onClick={onCancel} type="button">
              暂不入场
            </button>
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
          <span className="ex-plaque-title">月末丹青试</span>
          <span className="ex-plaque-sep">·</span>
          <span className="ex-plaque-info">批阅中</span>
        </div>

        <section className="ex-intro-paper">
          <div className="ex-intro-paper-inner">
            <p className="ex-intro-text">
              墨迹未干，试帖已送至案前。
              <br />
              堂中无人出声，只听帘外风过。
            </p>
            <p className="ex-reviewing-dots">批阅中 · · ·</p>
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
        <span className="ex-plaque-title">月末丹青试</span>
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
        <button className="ex-plaque-back" onClick={onCancel} type="button">
          返回
        </button>
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
          {currentIndex < totalQuestions - 1 ? '落笔 · 下一题' : '落笔 · 交卷'}
        </button>
      </section>
    </main>
  );
}
