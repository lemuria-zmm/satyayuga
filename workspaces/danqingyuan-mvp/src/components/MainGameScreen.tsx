import { useEffect, useRef, useState } from 'react';
import { LOCATIONS } from '../content/locations';
import { ACTIVITY_BY_ID } from '../content/activities';
import { COURSES } from '../content/courses';
import type { ActiveScene } from '../app/App';
import type { ValidatedSuggestedAction } from '../engine/sceneEngine';
import { DAY_CHARS_MAX, SEGMENT_MIN } from '../engine/sceneEngine';
import { MAX_SLOT_SCENES, isActionAffordable, isPracticeMoodLocked } from '../engine/gameEngine';
import { dailyChatQuota } from '../types/core';
import type { GameAction, GameState, LocationId, NpcId, SkillId, ValidatedStatePatch } from '../types';

interface MainGameScreenProps {
  state: GameState;
  actions: GameAction[];
  llmError: string | null;
  settlement?: { patch: ValidatedStatePatch; seq: number } | null;
  scene?: ActiveScene | null;
  /** 剧情驱动三件套（2026-06-17）：继续/去别处/推荐行动 */
  onContinue: (playerInput?: string) => void;
  onLeaveScene: () => void;
  onFollowSuggestion: (next: ValidatedSuggestedAction) => void;
  onAction: (action: GameAction) => void;
  onReset: () => void;
  onDevSkip?: () => void;
  /** 与希孟深谈（2026-06-25 重新接回）：好感≥同僚时便签卡可点 */
  onChat?: (npcId: NpcId) => void;
  /** 引导面板激活中（2026-06-15）：隐藏背景正文与行动签 dock，避免与小书童引导同屏 */
  guideActive?: boolean;
  /** 打开「画案手记」阅读档案（2026-06-16） */
  onOpenArchive?: () => void;
}

const skillLabels: Record<SkillId, string> = {
  landscape: '山水',
  figure: '人物',
  architecture: '界画',
};

const skillClasses: Record<SkillId, string> = {
  landscape: 'skill-landscape',
  figure: 'skill-figure',
  architecture: 'skill-architecture',
};

const rankLabels: Record<GameState['progress']['rank'], string> = {
  student: '学子',
  painter_regular: '画正',
};

/** 结算纸签内容：把本次行动的数值变化列成短句 */
function buildSettlementLines(patch: ValidatedStatePatch): string[] {
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const lines: string[] = [];
  for (const [skillId, delta] of Object.entries(patch.skillDelta ?? {})) {
    if (delta) lines.push(`${skillLabels[skillId as SkillId]} ${signed(delta)}`);
  }
  if (patch.staminaDelta) lines.push(`体力 ${signed(patch.staminaDelta)}`);
  if (patch.moodDelta) lines.push(`心情 ${signed(patch.moodDelta)}`);
  if (patch.knowledgeDelta) lines.push(`学识 ${signed(patch.knowledgeDelta)}`);
  if (patch.moneyDelta) lines.push(`钱文 ${signed(patch.moneyDelta)}`);
  if (patch.nextDayStaminaBonus) lines.push(`明日晨起体力 ${signed(patch.nextDayStaminaBonus)}`);
  if (patch.cluesGranted?.length) lines.push(`线索 +${patch.cluesGranted.length}`);
  if (patch.rankChange === 'painter_regular') lines.push('晋为画正');
  return lines;
}

const timeSlotLabels: Record<GameState['time']['timeSlot'], string> = {
  morning_class: '晨课',
  forenoon: '上午',
  noon: '午间',
  afternoon: '下午',
  evening: '晚间',
};

const TIME_SLOTS: GameState['time']['timeSlot'][] = ['morning_class', 'forenoon', 'noon', 'afternoon', 'evening'];

/** 五时段图标（美术 B1：更鼓/砚台/食盒/画卷/灯笼） */
const timeSlotIcons: Record<GameState['time']['timeSlot'], string> = {
  morning_class: '/ui/icon-slot-morning.png',
  forenoon: '/ui/icon-slot-forenoon.png',
  noon: '/ui/icon-slot-noon.png',
  afternoon: '/ui/icon-slot-afternoon.png',
  evening: '/ui/icon-slot-evening.png',
};

/** 行动签道具图（美术 C1/C2/C5/C3 活动卡 + C4 点卯牌/召集令） */
function actionArt(action: GameAction): string | undefined {
  if (action.id === 'chime') return '/ui/icon-chime.png';
  if (action.type === 'activity') return ACTIVITY_BY_ID[action.activityId ?? '']?.art;
  if (action.type === 'attend_class') return '/cards/prop-checkin-tag.png';
  if (action.type === 'take_exam') return '/cards/prop-exam-summon.png';
  return undefined;
}

/** 活动进行中的场景图替换（茶坊/瓦子/夜市为街市的子场景） */
const sceneActivityBackgrounds: Record<string, string> = {
  teahouse: '/teahouse-bg.png',
  eve_tingqu: '/washe-theater-bg.png',
  eve_nightmarket: '/night-market-bg.png',
};

const ximengAtmosphere: Record<GameState['relationships']['ximeng']['emotionState'], string> = {
  distant: '他未与你搭话。只是你经过案前时，他将未干的画卷轻轻合上。',
  noticing: '他似乎记住了你方才的说法。',
  silent: '他没有与你搭话。只是你提到"水路"二字时，他的笔尖停了一瞬。',
  irritated: '他似乎不愿被打扰。笔下的墨色比平日更重。',
  trusting: '他看向你的时间比昨日稍久。',
  avoidant: '你提到秘阁时，他避开了视线。',
  shaken: '他的手停在画卷边缘，像在犹豫要不要继续。',
};

const locationDescShort: Partial<Record<string, string>> = {
  hall: '丹青院日常起居之所。',
  library: '查阅典籍，研习画论。',
  garden: '休憩与观赏园林之地。',
  market: '购置物品，打探消息。',
  dining_hall: '午间饭食，院内供应。',
  dormitory: '一床一案，养精蓄锐。',
  secret_archive: '院中藏画，非请莫入。',
  ximeng_studio: '门内更有希孟在手下。',
};

const locationAtmosphere: Partial<Record<string, string>> = {
  hall: '晨光铺过堂前石地，案上的旧纸被风掀起一角。',
  library: '书房里墨香沉静，旧卷层叠如山。',
  garden: '后花园竹影轻摇，水池尽头有风吹过。',
  market: '街市人声正盛，摊贩叫卖此起彼伏。',
  dining_hall: '膳堂里饭菜香气正浓，碗箸声夹着院中闲话。',
  dormitory: '宿舍安静，日光在床沿挪了一寸又一寸。',
  secret_archive: '秘阁深处灯影幽微，画卷气息古旧。',
  ximeng_studio: '画室门半掩，青绿色的光从缝隙里透出。',
};

const locationBackgrounds: Record<LocationId, string> = {
  hall: '/main-bg.png',
  library: '/library-bg.png',
  garden: '/garden-bg.png',
  market: '/market-bg.png',
  dining_hall: '/dining-hall-bg.png',
  dormitory: '/dormitory-bg.png',
  secret_archive: '/archive-gate-bg.png',
  ximeng_studio: '/ximeng-studio-bg.png',
};

/** 右栏去处一览的固定顺序；未解锁的渲染为灰签 */
const LOCATION_PANEL_ORDER: LocationId[] = [
  'hall',
  'library',
  'garden',
  'dining_hall',
  'market',
  'dormitory',
  'secret_archive',
  'ximeng_studio',
];

/** 未解锁灰签文案 */
const lockedDesc: Partial<Record<LocationId, string>> = {
  library: '门还未向你开。',
  garden: '影壁之后，尚未识路。',
  dining_hall: '饭点未到，无人引路。',
  market: '院门之外，且待引路。',
  dormitory: '铺位还未分到你。',
  secret_archive: '院中禁地，门锁未启。',
  ximeng_studio: '门内青绿未干。',
};

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
      dot.style.opacity = `${0.2 + Math.random() * 0.25}`;
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

export function MainGameScreen({ state, actions, llmError, settlement, scene, onContinue, onLeaveScene, onFollowSuggestion, onAction, onReset, onDevSkip, onChat, guideActive, onOpenArchive }: MainGameScreenProps) {
  const pageRef = useRef<HTMLElement>(null);
  useInkTrail(pageRef);

  const [scrollCollapsed, setScrollCollapsed] = useState(false);
  const [slipVisible, setSlipVisible] = useState(false);
  const [freeInput, setFreeInput] = useState('');

  // 场景结束后清空自由输入
  useEffect(() => {
    if (!scene) setFreeInput('');
  }, [scene]);

  // 结算纸签：行动后浮现，数秒后淡出
  useEffect(() => {
    if (!settlement) {
      setSlipVisible(false);
      return;
    }
    setSlipVisible(true);
    const timer = setTimeout(() => setSlipVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [settlement]);

  const settlementLines = settlement ? buildSettlementLines(settlement.patch) : [];

  const currentLocation = state.currentLocation;
  const daysUntilExam = Math.max(0, 7 - state.time.day);
  const isFinalChapter = !!state.progress.flags.finalChapter;

  // Auto-expand scroll when location changes or a scene starts
  useEffect(() => {
    setScrollCollapsed(false);
  }, [currentLocation, scene]);

  // Separate location actions from move actions
  const locationActions = actions.filter((a) => a.type !== 'move_to');
  const moveActions = actions.filter((a) => a.type === 'move_to');

  function handleLocationClick(locationId: LocationId) {
    const moveAction = moveActions.find((a) => a.locationId === locationId);
    if (moveAction) {
      onAction(moveAction);
    }
  }

  const isSandbox = state.time.timeSlot === 'noon' || state.time.timeSlot === 'evening';

  // 场景图：活动子场景（茶坊/瓦子/夜市）优先，院堂/后花园/街市晚间换夜景。
  // 场景进行中以 scene.locationId 为准（2026-06-17 修 bug：否则晨课等场景背景停在 currentLocation 如宿舍）
  const bgLocation = scene?.locationId ?? currentLocation;
  const isEveningBg = state.time.timeSlot === 'evening';
  const backgroundUrl =
    (scene?.action.activityId && sceneActivityBackgrounds[scene.action.activityId]) ||
    (bgLocation === 'hall' && isEveningBg
      ? '/main-night-bg.png'
      : bgLocation === 'garden' && isEveningBg
        ? '/garden-night-bg.png'
        : bgLocation === 'market' && isEveningBg
          ? '/market-night-bg.png'
          : bgLocation === 'library' && isEveningBg
            ? '/library-night-bg.png'
            : bgLocation === 'dormitory' && state.time.timeSlot !== 'evening'
              ? '/dormitory-day-bg.png'
              : locationBackgrounds[bgLocation]);

  // 好感梅花格：无数字，hiddenAffinity 每 20 点亮一瓣（>0 即亮第一瓣）
  const ximengAffinity = state.relationships.ximeng.hiddenAffinity;
  const ximengPlumsLit = ximengAffinity <= 0 ? 0 : Math.min(5, 1 + Math.floor(ximengAffinity / 20));

  // 今日课业（左栏水牌）
  const todayCourse =
    state.time.day >= 7 ? '丹青试' : state.curriculum?.[state.time.day] ? COURSES[state.curriculum[state.time.day]].label : '未排课';

  return (
    <main className="gm-page" ref={pageRef}>
      {/* Background */}
      <div
        className="gm-scene-bg"
        key={backgroundUrl}
        style={{ backgroundImage: `url('${backgroundUrl}')` }}
      />
      <div className="gm-scene-overlay" />

      {/* Top nameplate */}
      <header className="gm-nameplate">
        <div className="gm-nameplate-left">
          <span className="gm-np-brand">丹青院</span>
          <span className="gm-np-sep">｜</span>
          <span className="gm-np-day">入院第{state.time.day}日</span>
          <span className="gm-np-sep">｜</span>
          <span className="gm-np-time-badge">
            {isFinalChapter
              ? '终章'
              : TIME_SLOTS.map((slot) => (
                  <span key={slot} className={`gm-np-slot ${slot === state.time.timeSlot ? 'slot-current' : 'slot-other'}`}>
                    <span className="gm-np-slot-chip">
                      <img alt="" src={timeSlotIcons[slot]} />
                    </span>
                    {timeSlotLabels[slot]}
                  </span>
                ))}
          </span>
          <span className="gm-np-sep">｜</span>
          <span className="gm-np-stamina">
            <span className="gm-np-stat-chip"><img alt="体力" src="/ui/icon-stamina.png" /></span>
            {Array.from({ length: state.time.maxStamina }, (_, i) => (
              <span key={i} className={i < state.time.stamina ? 'dot-full' : 'dot-empty'}>●</span>
            ))}
          </span>
          <span className="gm-np-sep">｜</span>
          <span className="gm-np-mood">
            <span className="gm-np-stat-chip"><img alt="心情" src="/ui/icon-mood.png" /></span>
            {state.stats.mood}
          </span>
          <span className="gm-np-sep">｜</span>
          <span className="gm-np-knowledge">
            <span className="gm-np-stat-chip"><img alt="学识" src="/ui/icon-knowledge.png" /></span>
            {state.stats.knowledge}
          </span>
          <span className="gm-np-sep">｜</span>
          <span className="gm-np-money">
            <span className="gm-np-stat-chip"><img alt="钱文" src="/ui/icon-money.png" /></span>
            {state.stats.money}文
          </span>
          <span className="gm-np-sep">｜</span>
          <span className="gm-np-rank">{rankLabels[state.progress.rank]}</span>
          {daysUntilExam > 0 && (
            <>
              <span className="gm-np-sep">｜</span>
              <span className="gm-np-exam">距丹青试 {daysUntilExam} 日</span>
            </>
          )}
          {state.time.isExamDay && (
            <>
              <span className="gm-np-sep">｜</span>
              <span className="gm-np-exam-today">今日丹青试</span>
            </>
          )}
        </div>
        <div className="gm-nameplate-right">
          {onOpenArchive && (
            <button className="gm-np-btn" onClick={onOpenArchive} type="button">画案手记</button>
          )}
          {onDevSkip && (
            <button className="gm-np-btn" onClick={onDevSkip} type="button">开秘阁</button>
          )}
          <button className="gm-np-btn" onClick={onReset} type="button">重开</button>
        </div>
      </header>

      {/* Left: player notebook */}
      <aside className="gm-player-panel">
        <div className="gm-player-seal">{rankLabels[state.progress.rank]}</div>
        <h2 className="gm-player-name">{state.player.name || '无名'}</h2>
        <div className="gm-player-style">
          画风：{
            state.player.styleOrigin === 'landscape' ? '山水倾向' :
            state.player.styleOrigin === 'figure' ? '人物倾向' :
            state.player.styleOrigin === 'architecture' ? '界画倾向' :
            '均衡'
          }
        </div>

        <div className="gm-player-skills">
          {Object.entries(state.skills).map(([skillId, value]) => (
            <div className={`gm-skill-row ${skillClasses[skillId as SkillId]}`} key={skillId}>
              <span className="gm-skill-name">{skillLabels[skillId as SkillId]}</span>
              <div className="gm-ink-meter">
                <div className="gm-ink-meter-fill" style={{ width: `${Math.min(value, 100)}%` }} />
              </div>
              <span className="gm-skill-value">{value}</span>
            </div>
          ))}
        </div>

        <div className="gm-player-stamina">
          <span>体力</span>
          <span>{state.time.stamina} / {state.time.maxStamina}</span>
        </div>

        {/* 今日课业水牌（美术 C4-1 roster board） */}
        <div className="gm-roster-board">
          <span className="gm-roster-title">今日课业</span>
          <span className="gm-roster-course">{todayCourse}</span>
        </div>
      </aside>

      {/* Center: main scroll */}
      <section className="gm-main-scroll">
        <button
          className={`gm-scroll-toggle ${scrollCollapsed ? 'collapsed' : ''}`}
          onClick={() => setScrollCollapsed(!scrollCollapsed)}
          type="button"
        >
          {scrollCollapsed ? '展' : '✕'}
        </button>
        <div className={`gm-scroll-paper ${scrollCollapsed ? 'collapsed' : ''}`}>
          <h1 className="gm-scroll-title">{LOCATIONS[currentLocation]?.name ?? '院堂'}</h1>
          <div className="gm-scroll-title-line" />

          <div className="gm-scene-text">
            <p className="gm-scene-atmosphere">
              {locationAtmosphere[currentLocation] ?? '院中风静，日光照进堂前。'}
            </p>
            {!guideActive && state.lastRenderedText && (
              <p className="gm-scene-narrative">{state.lastRenderedText}</p>
            )}
          </div>

          {/* 场景 loading 文案（三件套按钮在底部 dock，2026-06-17 移出正文区） */}
          {scene && (
            <div className="gm-scene-branch">
              {(scene.status === 'loading-open' || scene.status === 'loading-continue') && (
                <p className="gm-scene-loading">墨正落纸……</p>
              )}
              {scene.status === 'loading-end' && (
                <p className="gm-scene-loading">笔意未尽，稍候……</p>
              )}
            </div>
          )}

          {llmError && <p className="gm-scroll-error">{llmError}</p>}

          <div className="gm-action-count">
            {isFinalChapter
              ? '七日已尽。时间在秘阁门前停了下来。'
              : <>现在是第{state.time.day}日·{timeSlotLabels[state.time.timeSlot]}。{daysUntilExam > 0 && ` 距丹青试还有 ${daysUntilExam} 日。`}</>}
          </div>
        </div>
      </section>

      {/* Settlement slip（引导激活时隐藏，避免半透明遮罩下结算笺透出与小书童弹窗重叠，2026-06-15） */}
      {!guideActive && slipVisible && settlement && settlementLines.length > 0 && (
        <div className="gm-settlement-slip" key={settlement.seq}>
          <div className="gm-settlement-seal" />
          {settlementLines.map((line) => (
            <span key={line} className={`gm-settlement-line ${line.includes('-') ? 'neg' : 'pos'}`}>
              {line}
            </span>
          ))}
        </div>
      )}

      {/* Bottom: 剧情驱动三件套 dock（2026-06-17：与行动签同样式同位置；LLM 信号驱动显隐） */}
      {scene && scene.status === 'reading' && !guideActive && (() => {
        // 日终字数预算将满：续/推荐都开不出新段，隐藏它们只留「去别处」收束（2026-06-17）
        const budgetFull = state.time.narrativeCharsToday + SEGMENT_MIN > DAY_CHARS_MAX;
        const showContinue = !budgetFull && scene.sceneCanContinue && scene.segmentCount < scene.maxSegments;
        const showSuggest = !budgetFull && scene.suggestedActions.length > 0;
        // 去别处=LLM 判断该收束；全灭兜底（继续/推荐/收束都没有，或预算满）时强亮，防卡死
        const showLeave = scene.shouldConclude || budgetFull || (!showContinue && !showSuggest);
        return (
          <div className="gm-action-dock">
            {showSuggest && scene.suggestedActions.map((sa, i) => (
              <button
                className="gm-action-tag gm-action-tag-suggest"
                key={`${sa.locationId}-${i}`}
                onClick={() => onFollowSuggestion(sa)}
                type="button"
              >
                <span className="gm-action-tag-title">{sa.label}</span>
                <span className="gm-action-tag-cost">{LOCATIONS[sa.locationId]?.name ?? ''}</span>
              </button>
            ))}
            {showContinue && (
              <button className="gm-action-tag gm-action-tag-continue" onClick={() => onContinue()} type="button">
                <span className="gm-action-tag-title">继续</span>
                <span className="gm-action-tag-cost">读下去</span>
              </button>
            )}
            {showLeave && (
              <button className="gm-action-tag gm-action-tag-leave" onClick={onLeaveScene} type="button">
                <span className="gm-action-tag-title">去别处看看</span>
                <span className="gm-action-tag-cost">离场</span>
              </button>
            )}
            <div className="gm-scene-free-input">
              <input
                className="gm-scene-free-field"
                value={freeInput}
                onChange={(e) => setFreeInput(e.target.value.slice(0, 40))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && freeInput.trim()) {
                    onContinue(freeInput.trim());
                    setFreeInput('');
                  }
                }}
                placeholder="或写下你想说想做的……"
              />
              <button
                className="gm-scene-free-btn"
                disabled={!freeInput.trim()}
                onClick={() => {
                  if (freeInput.trim()) {
                    onContinue(freeInput.trim());
                    setFreeInput('');
                  }
                }}
                type="button"
              >
                说
              </button>
            </div>
          </div>
        );
      })()}

      {/* Bottom: action tag dock（场景进行中收起，待玩家回应分支；引导激活时也收起） */}
      {!scene && !guideActive && (
        <div className="gm-action-dock">
          {locationActions.map((action) => {
            const art = actionArt(action);
            // 视觉区分（2026-06-15）：收尾签（歇晌/就寝）赭色、餐签米黄，与成长/娱乐签分开
            // 报时钟收尾签（2026-06-18 A+C 修正）：演完 ≥1 场即出现（平静），满 3 场加 -urge 强脉动提示"该收了"
            const isChime = action.id === 'chime';
            const chimeUrge = isChime && state.time.slotSceneCount >= MAX_SLOT_SCENES;
            const isClosing = action.type === 'rest' || action.type === 'sleep';
            const isMeal = action.type === 'activity' && (action.activityId ?? '').startsWith('meal');
            // 钱不足置灰（2026-06-25）：餐签/市井消费签买不起时显示但不可点，标「需X文」，治"餐签凭空消失疑似bug"
            const affordable = isActionAffordable(state, action);
            // 心情过低锁练习（2026-06-28）：心情≤3 练习签置灰「心绪不宁」，逼玩家先用同时段饮食/娱乐调心情
            const moodLocked = isPracticeMoodLocked(state, action);
            const usable = affordable && !moodLocked;
            const tagClass = `${
              isChime
                ? `gm-action-tag gm-action-tag-chime${chimeUrge ? ' gm-action-tag-chime-urge' : ''}`
                : isClosing
                  ? 'gm-action-tag gm-action-tag-closing'
                  : isMeal
                    ? 'gm-action-tag gm-action-tag-meal'
                    : 'gm-action-tag'
            }${usable ? '' : ' gm-action-tag-unaffordable'}`;
            return (
              <button
                className={tagClass}
                key={action.id}
                onClick={() => usable && onAction(action)}
                type="button"
                disabled={!usable}
              >
                {art && <img alt="" className="gm-action-tag-art" src={art} />}
                <span className="gm-action-tag-title">{action.label}</span>
                <span className="gm-action-tag-cost">
                  {isChime
                    ? '钟声已响'
                    : moodLocked
                      ? '心绪不宁'
                      : !affordable
                        ? `需${action.moneyCost}文`
                        : <>{action.staminaCost > 0 ? `体力-${action.staminaCost}` : '不费体力'}{action.moneyCost ? ` · ${action.moneyCost}文` : ''}</>}
                </span>
              </button>
            );
          })}
          {locationActions.length === 0 && (
            <span className="gm-action-empty">此处此刻无事可做——去别处走走吧。</span>
          )}
        </div>
      )}

      {/* Right: location panel */}
      <aside className="gm-location-panel">
        <div className="gm-loc-panel-title">院中去处</div>
        {LOCATION_PANEL_ORDER.map((locationId) => {
          const unlocked = state.progress.unlockedLocations.includes(locationId);
          if (!unlocked) {
            return (
              <div className="gm-loc-sign locked" key={locationId}>
                <div className="gm-loc-sign-content">
                  <strong>{LOCATIONS[locationId].name}</strong>
                  <p>{lockedDesc[locationId] ?? '此处尚未向你开放。'}</p>
                </div>
                <span className="gm-loc-status gm-loc-status-gray">未启</span>
              </div>
            );
          }
          const isCurrent = locationId === currentLocation;
          const canMove = !isCurrent && moveActions.some((a) => a.locationId === locationId);
          // 宿舍仅晚间开启（2026-06-11 拍板）
          const dormClosed = locationId === 'dormitory' && !isCurrent && !canMove && state.time.timeSlot !== 'evening';
          return (
            <button
              className={`gm-loc-sign ${isCurrent ? 'active' : ''} ${canMove ? '' : 'no-move'}`}
              key={locationId}
              onClick={canMove ? () => handleLocationClick(locationId) : undefined}
              type="button"
              disabled={!canMove && !isCurrent}
            >
              <div className="gm-loc-sign-content">
                <strong>{LOCATIONS[locationId].name}</strong>
                <p>{dormClosed ? '白日门扉虚掩，晚间方开。' : locationDescShort[locationId] ?? LOCATIONS[locationId].summary}</p>
              </div>
              {isCurrent && <span className="gm-loc-status gm-loc-status-red">今在此处</span>}
              {canMove && <span className="gm-loc-status gm-loc-status-green">可前往</span>}
              {dormClosed && <span className="gm-loc-status gm-loc-status-gray">晚间方开</span>}
            </button>
          );
        })}
      </aside>

      {/* Ximeng note card（书房首遇后出现）：闲聊入口，按好感档每日限次（2026-06-25） */}
      {state.progress.flags.metXimeng && (() => {
        const xm = state.relationships.ximeng;
        const chatsLeft = Math.max(0, dailyChatQuota(xm.stage) - (xm.chatsToday ?? 0));
        const canChat = !!onChat && chatsLeft > 0 && state.time.stamina >= 1 && !scene && !guideActive;
        return (
          <div
            className={`gm-ximeng-card${canChat ? ' chattable' : ''}`}
            onClick={canChat ? () => onChat!('ximeng') : undefined}
            role={canChat ? 'button' : undefined}
          >
            <div className="gm-ximeng-vermillion" />
            <h3 className="gm-ximeng-name">希孟</h3>
            <span className="gm-ximeng-plums">
              {Array.from({ length: 5 }, (_, i) => (
                <img
                  alt=""
                  key={i}
                  src={i < ximengPlumsLit ? '/ui/affinity-plum-lit.png' : '/ui/affinity-plum-dim.png'}
                />
              ))}
            </span>
            <p className="gm-ximeng-desc">
              {ximengAtmosphere[state.relationships.ximeng.emotionState]}
            </p>
            {canChat ? (
              <span className="gm-ximeng-chat-hint">闲聊 · 今日还可 {chatsLeft} 句</span>
            ) : chatsLeft <= 0 ? (
              <span className="gm-ximeng-chat-hint gm-ximeng-chat-locked">今日已叙</span>
            ) : null}
          </div>
        );
      })()}
    </main>
  );
}
