import { useEffect, useMemo, useRef, useState } from 'react';
import type { FamilyOrigin, PlayerGender, PlayerProfile } from '../types';

type StyleOrigin = PlayerProfile['styleOrigin'];

export type SetupPlayerInput = Partial<
  Pick<PlayerProfile, 'name' | 'pronounLabel' | 'styleOrigin' | 'gender' | 'age' | 'origin' | 'personality' | 'aspiration'>
>;

interface SetupScreenProps {
  hasSave: boolean;
  onClearSave: () => void;
  onResume: () => void;
  onStart: (player: SetupPlayerInput) => void;
}

const styleOptions: Array<{
  id: StyleOrigin;
  title: string;
  stats: string;
  guide: string;
}> = [
  { id: 'landscape', title: '山水', stats: '山水 18 / 人物 10 / 界画 10', guide: '本科导师：李唐（总教习）' },
  { id: 'figure', title: '人物', stats: '人物 18 / 山水 10 / 界画 10', guide: '本科导师：嵩' },
  { id: 'architecture', title: '界画', stats: '界画 18 / 山水 10 / 人物 10', guide: '本科导师：择端' },
];

const genderOptions: Array<{ id: PlayerGender; title: string }> = [
  { id: 'female', title: '女' },
  { id: 'male', title: '男' },
];

/* ——— 年龄滚轮 18~60 ——— */
const AGE_MIN = 18;
const AGE_MAX = 60;
const AGE_ITEM_HEIGHT = 36;
const AGES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

function AgeWheel({ value, onChange }: { value: number; onChange: (age: number) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    listRef.current?.scrollTo({ top: (value - AGE_MIN) * AGE_ITEM_HEIGHT });
    // 仅初始化定位一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const idx = Math.round(el.scrollTop / AGE_ITEM_HEIGHT);
      const age = Math.max(AGE_MIN, Math.min(AGE_MAX, AGE_MIN + idx));
      onChange(age);
    }, 80);
  }

  function scrollToAge(age: number) {
    listRef.current?.scrollTo({ top: (age - AGE_MIN) * AGE_ITEM_HEIGHT, behavior: 'smooth' });
    onChange(age);
  }

  return (
    <div className="adm-age-wheel">
      <div className="adm-age-wheel-list" onScroll={handleScroll} ref={listRef}>
        <div className="adm-age-wheel-pad" />
        {AGES.map((age) => (
          <button
            className={`adm-age-wheel-item ${age === value ? 'selected' : ''}`}
            key={age}
            onClick={() => scrollToAge(age)}
            type="button"
          >
            {age}
          </button>
        ))}
        <div className="adm-age-wheel-pad" />
      </div>
      <div className="adm-age-wheel-indicator" />
      <span className="adm-age-wheel-unit">岁</span>
    </div>
  );
}

const originOptions: Array<{ id: FamilyOrigin; title: string; hint: string }> = [
  { id: 'merchant', title: '商贩之家', hint: '钱文 +5；市井消费长享八折' },
  { id: 'farming_scholar', title: '耕读之家', hint: '学识 +3；平日长学识更快（收益 +1）' },
  { id: 'official_branch', title: '官宦旁支', hint: '钱文 +5 学识 +2 心情 -1' },
  { id: 'artisan', title: '匠作之家', hint: '界画 +2；界画长进更快（成长 +1）' },
  { id: 'displaced', title: '流民出身', hint: '体力上限 +1 钱文 -5' },
];

/* ——— Ink cursor trail hook ——— */
function useInkTrail(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const dots: HTMLElement[] = [];
    const MAX_DOTS = 24;

    function onMove(e: MouseEvent) {
      const dot = document.createElement('span');
      dot.className = 'ink-trail-dot';
      const rect = el!.getBoundingClientRect();
      dot.style.left = `${e.clientX - rect.left}px`;
      dot.style.top = `${e.clientY - rect.top}px`;
      const size = 6 + Math.random() * 10;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.opacity = `${0.35 + Math.random() * 0.3}`;
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
      }, 400);
    }

    el.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('mousemove', onMove);
      dots.forEach((d) => d.remove());
    };
  }, [containerRef]);
}

export function SetupScreen({ hasSave, onClearSave, onResume, onStart }: SetupScreenProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<PlayerGender | null>(null);
  const [age, setAge] = useState(18);
  const [origin, setOrigin] = useState<FamilyOrigin | null>(null);
  const [styleOrigin, setStyleOrigin] = useState<StyleOrigin | null>(null);
  const [aspiration, setAspiration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sealStamped, setSealStamped] = useState(false);
  /** 重写时令年龄滚轮重挂载回正 */
  const [resetKey, setResetKey] = useState(0);

  const pageRef = useRef<HTMLElement>(null);
  useInkTrail(pageRef);

  const canSubmit =
    name.trim().length > 0 &&
    gender !== null &&
    origin !== null &&
    styleOrigin !== null;

  const nameError = useMemo(() => {
    if (name.length === 0) return '';
    if (name.trim().length === 0) return '院册需留姓名。';
    if (name.length > 8) return '名帖太长，恐难入册。';
    return '';
  }, [name]);

  function handleSubmit() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSealStamped(true);
    setTimeout(() => {
      onStart({
        name: name.trim(),
        pronounLabel: '少君',
        styleOrigin: styleOrigin!,
        gender: gender!,
        age,
        origin: origin!,
        personality: '',
        aspiration: aspiration.trim(),
      });
    }, 800);
  }

  function handleReset() {
    setName('');
    setGender(null);
    setAge(18);
    setOrigin(null);
    setStyleOrigin(null);
    setAspiration('');
    setSealStamped(false);
    setResetKey((k) => k + 1);
  }

  return (
    <main className="adm-page" ref={pageRef}>
      {/* Background */}
      <div className="adm-bg" />
      <div className="adm-bg-overlay" />

      {/* Top plaque */}
      <div className="adm-plaque">
        <div className="adm-plaque-inner">
          <h1 className="adm-plaque-title">丹青院</h1>
          <p className="adm-plaque-subtitle">入院名录</p>
        </div>
      </div>

      {/* Center scroll form */}
      <div className="adm-scroll">
        <div className="adm-scroll-content">
          {/* Name */}
          <div className="adm-form-row">
            <label className="adm-form-label">姓名</label>
            <div className="adm-input-wrap">
              <input
                className={`adm-input ${name.trim().length > 0 && !nameError ? 'has-value' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入姓氏与名讳"
                maxLength={8}
              />
              {name.trim().length > 0 && !nameError && (
                <span className="adm-ink-dot" />
              )}
            </div>
            {nameError && <span className="adm-error">{nameError}</span>}
          </div>

          {/* Gender + Age */}
          <div className="adm-form-row">
            <label className="adm-form-label">性别</label>
            <div className="adm-style-options">
              {genderOptions.map((option) => (
                <button
                  className={`adm-style-btn ${option.id === gender ? 'selected' : ''}`}
                  key={option.id}
                  onClick={() => setGender(option.id)}
                  type="button"
                >
                  <span className="adm-style-btn-text">{option.title}</span>
                  {option.id === gender && <span className="adm-style-seal" />}
                </button>
              ))}
            </div>
          </div>

          <div className="adm-form-row">
            <label className="adm-form-label">年龄</label>
            <AgeWheel key={resetKey} onChange={setAge} value={age} />
            {age > 50 && (
              <span className="adm-form-hint">知命之年入院，少年人的情缘便化作忘年之谊。</span>
            )}
          </div>

          {/* Family origin */}
          <div className="adm-form-row">
            <label className="adm-form-label">家庭背景</label>
            <div className="adm-style-options adm-style-options-wrap">
              {originOptions.map((option) => (
                <button
                  className={`adm-style-btn ${option.id === origin ? 'selected' : ''}`}
                  key={option.id}
                  onClick={() => setOrigin(option.id)}
                  title={option.hint}
                  type="button"
                >
                  <span className="adm-style-btn-text">{option.title}</span>
                  {option.id === origin && <span className="adm-style-seal" />}
                </button>
              ))}
            </div>
            {origin && (
              <span className="adm-form-hint">
                {originOptions.find((o) => o.id === origin)?.hint}
              </span>
            )}
          </div>

          {/* Style tendency */}
          <div className="adm-form-row">
            <label className="adm-form-label">画风倾向</label>
            <div className="adm-style-options">
              {styleOptions.map((option) => (
                <button
                  className={`adm-style-btn ${option.id === styleOrigin ? 'selected' : ''}`}
                  key={option.id}
                  onClick={() => setStyleOrigin(option.id)}
                  title={option.stats}
                  type="button"
                >
                  <span className="adm-style-btn-text">{option.title}</span>
                  {option.id === styleOrigin && (
                    <span className="adm-style-seal" />
                  )}
                </button>
              ))}
            </div>
            {styleOrigin && (
              <span className="adm-form-hint">
                {styleOptions.find((o) => o.id === styleOrigin)?.guide}
              </span>
            )}
          </div>

          {/* Aspiration: free input */}
          <div className="adm-form-row adm-form-row-textarea">
            <label className="adm-form-label">未来志向</label>
            <div className="adm-textarea-wrap">
              <textarea
                className="adm-textarea"
                value={aspiration}
                onChange={(e) => setAspiration(e.target.value.slice(0, 30))}
                placeholder="如：成为画院的待诏，画出传世名作"
                maxLength={30}
              />
              <span className="adm-char-count">{aspiration.length}/30</span>
            </div>
          </div>

          {/* Bottom area: seal + buttons */}
          <div className="adm-scroll-bottom">
            {/* Seal */}
            <div className={`adm-seal-area ${sealStamped ? 'stamped' : ''}`}>
              <div className="adm-seal-circle" />
              <span className="adm-seal-label">
                {sealStamped ? '已入册' : '未盖章'}
              </span>
            </div>

            {/* Submit */}
            <button
              className="adm-submit-btn"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              type="button"
            >
              <span className="adm-submit-text">
                {isSubmitting ? '入册中……' : '呈帖入院'}
              </span>
            </button>

            {/* Reset */}
            <button
              className="adm-reset-btn"
              onClick={handleReset}
              type="button"
            >
              重写
            </button>
          </div>

          {!canSubmit && (
            <p className="adm-submit-hint">请先补全入院名帖。</p>
          )}
        </div>
      </div>

      {/* Right side note */}
      <aside className="adm-side-note">
        <div className="adm-side-note-inner">
          <p className="adm-side-note-text">
            入院后将以七日为期修习丹青月末参与丹青试
          </p>
        </div>
      </aside>

      {/* Save actions */}
      {hasSave && (
        <div className="adm-save-actions">
          <button className="adm-save-btn" onClick={onResume} type="button">继续旧档</button>
          <button className="adm-save-btn" onClick={onClearSave} type="button">清除旧档</button>
        </div>
      )}
    </main>
  );
}
