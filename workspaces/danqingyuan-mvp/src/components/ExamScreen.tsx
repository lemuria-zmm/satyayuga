import { useState } from 'react';
import type { PaintingPromptGeneratorOutput, QuestionType } from '../types';
import type { Inspiration } from '../engine/inspirations';
import { INSPIRATION_KIND_LABELS, MIN_INSPIRATIONS } from '../engine/inspirations';

export interface ExamAnswer {
  optionId?: string;
  freeText: string;
  /** 自由创作（2026-07-06）：所选灵感 id（记录供账本/复盘） */
  inspirationIds?: string[];
}

interface ExamScreenProps {
  questions: PaintingPromptGeneratorOutput[];
  onCancel: () => void;
  onSubmit: (answers: Record<string, ExamAnswer>) => Promise<void> | void;
  /** 考试模式（2026-06-28；2026-06-30 加 retake）：final=月末丹青试（庄重）；quick=温书自测（夜读）；retake=落第补考（再给一次） */
  mode?: 'final' | 'quick' | 'retake';
  /** 自由创作灵感池（2026-07-06）：从画案手记 + 天气构建，玩家择 3-5 个 */
  inspirations?: Inspiration[];
  /** 自由创作拟题（2026-07-06）：择灵感后 App 调 LLM 据灵感+本科出命题 */
  onComposeTheme?: (inspirationIds: string[]) => Promise<PaintingPromptGeneratorOutput>;
  /** 背景覆盖（2026-07-07）：温书自测传宿舍夜读场景图（按玩家性别），与丹青试考场视觉区分 */
  bgImage?: string;
}

/** 自由创作最多可选灵感数 */
const MAX_INSPIRATIONS = 5;

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
  poem_intent: '以诗入画',
  free_creation: '自由创作',
};

const optionBadges = ['甲', '乙', '丙', '丁'];

type ExamPhase = 'intro' | 'answering' | 'submitting';

export function ExamScreen({ questions, onCancel, onSubmit, mode = 'final', inspirations = [], onComposeTheme, bgImage }: ExamScreenProps) {
  const chrome = examChrome[mode];
  const bgStyle = bgImage ? { backgroundImage: `url(${bgImage})` } : undefined;
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>(
    Object.fromEntries(questions.map((q) => [q.id, { freeText: '' }])),
  );
  const [phase, setPhase] = useState<ExamPhase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 自由创作子流程（2026-07-06）：择灵感 → 拟题(LLM) → 落墨
  const [inspSelected, setInspSelected] = useState<string[]>([]);
  const [composedTheme, setComposedTheme] = useState<PaintingPromptGeneratorOutput | null>(null);
  const [composing, setComposing] = useState(false);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion?.id];
  const totalQuestions = questions.length;
  const isFreeCreation = currentQuestion?.questionType === 'free_creation';

  function updateAnswer(questionId: string, patch: Partial<ExamAnswer>) {
    setAnswers((cur) => ({
      ...cur,
      [questionId]: { ...cur[questionId], ...patch },
    }));
  }

  function toggleInspiration(id: string) {
    setInspSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_INSPIRATIONS ? cur : [...cur, id],
    );
  }

  async function composeTheme() {
    if (!onComposeTheme || inspSelected.length < MIN_INSPIRATIONS) return;
    setComposing(true);
    try {
      const theme = await onComposeTheme(inspSelected);
      setComposedTheme(theme);
      updateAnswer(currentQuestion.id, { inspirationIds: inspSelected });
    } finally {
      setComposing(false);
    }
  }

  const canSubmitCurrent = isFreeCreation
    ? !!composedTheme && (currentAnswer?.freeText?.trim().length ?? 0) >= 10
    : currentAnswer?.optionId || (currentAnswer?.freeText?.trim().length ?? 0) > 0;

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
        <div className="ex-bg" style={bgStyle} />
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
        <div className="ex-bg" style={bgStyle} />
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
      <div className="ex-bg" style={bgStyle} />
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

          {isFreeCreation ? (
            !composedTheme ? (
              /* 自由创作 · 择灵感 */
              <div className="ex-free-creation">
                <p className="ex-prompt-text ex-fc-lead">
                  丹青试压轴自作一幅——先从你这些时日的所见所闻里，择取三五样入你的画。
                </p>
                <div className="ex-fc-groups">
                  {Object.entries(
                    inspirations.reduce<Record<string, Inspiration[]>>((acc, insp) => {
                      (acc[insp.kind] ??= []).push(insp);
                      return acc;
                    }, {}),
                  ).map(([kind, list]) => (
                    <div className="ex-fc-group" key={kind}>
                      <h4 className="ex-fc-group-title">{INSPIRATION_KIND_LABELS[kind as Inspiration['kind']] ?? kind}</h4>
                      <div className="ex-fc-card-list">
                        {list.map((insp) => (
                          <button
                            className={`ex-fc-card ${inspSelected.includes(insp.id) ? 'selected' : ''}`}
                            key={insp.id}
                            onClick={() => toggleInspiration(insp.id)}
                            type="button"
                          >
                            <span className="ex-fc-card-label">{insp.label}</span>
                            {insp.note && <span className="ex-fc-card-note">{insp.note}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="ex-fc-progress">
                  已择 {inspSelected.length} 样（取 {MIN_INSPIRATIONS}~{MAX_INSPIRATIONS} 样）
                </p>
                <button
                  className="ex-submit ex-fc-compose"
                  disabled={inspSelected.length < MIN_INSPIRATIONS || composing}
                  onClick={composeTheme}
                  type="button"
                >
                  {composing ? '太师拟题中……' : '请太师命题'}
                </button>
              </div>
            ) : (
              /* 自由创作 · 落墨 */
              <div className="ex-free-creation">
                <div className="ex-prompt">
                  <p className="ex-prompt-text">{composedTheme.promptText}</p>
                </div>
                <div className="ex-fc-chosen">
                  {inspSelected
                    .map((id) => inspirations.find((i) => i.id === id)?.label)
                    .filter(Boolean)
                    .map((label) => (
                      <span className="ex-fc-chip" key={label}>{label}</span>
                    ))}
                </div>
                <div className="ex-free">
                  <span className="ex-free-label">你的创作构思</span>
                  <div className="ex-free-area">
                    <textarea
                      className="ex-free-input ex-fc-input"
                      value={currentAnswer?.freeText ?? ''}
                      onChange={(e) => updateAnswer(currentQuestion.id, { freeText: e.target.value })}
                      placeholder={composedTheme.freeInputHint || '说说你会取哪些入画、怎么布置经营、想立什么意……'}
                      maxLength={300}
                    />
                  </div>
                  <span className="ex-free-hint">不必真作画，说说你的立意与构思即可。</span>
                </div>
              </div>
            )
          ) : (
            <>
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
                      <span className="ex-option-badge">{optionBadges[i] ?? option.id}</span>
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
                    onChange={(e) => updateAnswer(currentQuestion.id, { freeText: e.target.value })}
                    placeholder={currentQuestion.freeInputHint || '若三者皆非你意，可写下你的看法……'}
                    maxLength={160}
                  />
                </div>
                <span className="ex-free-hint">此题无标准句式，只看你如何取意。</span>
              </div>
            </>
          )}
        </div>

        {/* Submit button — 自由创作择灵感阶段(未拟题)不显主交卷键（用「请太师命题」推进） */}
        {(!isFreeCreation || composedTheme) && (
          <button
            className="ex-submit"
            disabled={!canSubmitCurrent || isSubmitting}
            onClick={handleNext}
            type="button"
          >
            {currentIndex < totalQuestions - 1 ? '落笔 · 下一题' : (mode === 'quick' ? '落笔 · 温书毕' : '落笔 · 交卷')}
          </button>
        )}
      </section>
    </main>
  );
}
