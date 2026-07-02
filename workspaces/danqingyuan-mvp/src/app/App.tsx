import { useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS } from '../content/characters';
import { applyAction, getAvailableActions, isSandboxSlot, MAX_SLOT_SCENES, buildQuickExamReward, computeExamScore, determineEnding, EXAM_SKILL_GATE } from '../engine/gameEngine';
import { createInitialGameState } from '../engine/initialState';
import { applyValidatedStatePatch } from '../engine/statePatches';
import { dailyChatQuota, stageFloor, DAILY_AFFINITY_CAP } from '../types/core';
import { getThemeBeat, getWeather, SEASON } from '../engine/ambience';
import {
  type EndingStage,
  nextEndingStage,
  mentorForStyle,
} from '../engine/endingSequence';
import {
  buildEnding,
  buildPrevSceneEnding,
  buildSceneFacts,
  buildScenePlayerCard,
  buildTodayPlan,
  clampSceneSuggestedPatch,
  DAY_CHARS_MAX,
  getActionTrack,
  isLlmScene,
  npcIdsToCards,
  type PendingHookDraft,
  clampSuggestedActions,
  type ValidatedSuggestedAction,
  rollNpcsPresent,
  sanitizeMemoryNote,
  SEGMENT_MAX,
  SEGMENT_MIN,
  PRACTICE_SEGMENT_MAX,
  PRACTICE_SEGMENT_MIN,
} from '../engine/sceneEngine';
import { AdmissionTransition } from '../components/AdmissionTransition';
import { DialogueScreen } from '../components/DialogueScreen';
import { ArchiveScreen } from '../components/ArchiveScreen';
import { GuideDialogue } from '../components/GuideDialogue';
import type { ExamAnswer } from '../components/ExamScreen';
import { ExamScreen } from '../components/ExamScreen';
import { EndingScreen } from '../components/EndingScreen';
import { EndingDialogue } from '../components/EndingDialogue';
import { TitleGrantOverlay } from '../components/TitleGrantOverlay';
import { XimengBridge } from '../components/XimengBridge';
import { EpilogueScreen } from '../components/EpilogueScreen';
import { MainGameScreen } from '../components/MainGameScreen';
import type { PuzzleSubmission } from '../components/PuzzleScreen';
import { PuzzleScreen } from '../components/PuzzleScreen';
import { SchedulePlanner } from '../components/SchedulePlanner';
import { SetupScreen } from '../components/SetupScreen';
import { ProloguePage } from '../components/ProloguePage';
import { getStudiedSkills } from '../content/courses';
import { ACTIVITY_BY_ID } from '../content/activities';
import { buildFallbackBeats, getMotifHint, rollMainlineSeed } from '../content/mainlineSeeds';
import { BASE_LOCATIONS, getActiveGuideStep, getSilentSlotUnlock, TUTORIAL_SLOT_FLAGS } from '../content/tutorialScripts';
import type { GuideStep } from '../content/tutorialScripts';
import { LOCATIONS } from '../content/locations';
import { createLlmAdapter } from '../llm/createLlmAdapter';
import { buildMemoryContext } from '../memory/retriever';
import { commitMemoryPatch, mergeDiscoveredEntities } from '../memory/writer';
import { clearSaveFile, loadSaveFile, saveGameState } from '../persistence/storage';
import type {
  CharacterDialogueOutput,
  ChatReplyTone,
  CurriculumState,
  EndingResult,
  GameAction,
  GameState,
  LocationId,
  MainlineState,
  NpcId,
  PaintingIntentEvaluatorOutput,
  PaintingPromptGeneratorOutput,
  QuestionType,
  SceneChoice,
  SceneSegment,
  SceneEntity,
  SkillDelta,
  SkillId,
  TimeSlot,
  ValidatedStatePatch,
} from '../types';
import type { ClueGraphNode } from '../types/memory';
import '../styles/app.css';

const llmAdapter = createLlmAdapter();

const SCENE_PROMPT_VERSION = 'scene_narrator@2026-06-30.v22';
const MAINLINE_PROMPT_VERSION = 'mainline_planner@2026-06-30.v2';
/** 角色对白 prompt 版本（前后端须一致，2026-06-30 v7 加结局见希孟预热指引） */
const DIALOGUE_PROMPT_VERSION = 'character_dialogue@2026-06-30.v10';

/** VN 逐句（2026-06-30）：取 LLM segments，无则把整段正文当一个旁白单元兜底 */
function buildSegments(output: { segments?: SceneSegment[]; narrativeText: string }): SceneSegment[] {
  if (Array.isArray(output.segments) && output.segments.length > 0) return output.segments;
  return [{ text: output.narrativeText, speaker: null }];
}

/** 画科中文名（结局点评喂 LLM examReview.majorSkillLabel） */
const SKILL_LABELS: Record<SkillId, string> = {
  landscape: '山水',
  figure: '人物',
  architecture: '界画',
};

/** 职称中文名（授衔段显示） */
const RANK_LABELS: Record<GameState['progress']['rank'], string> = {
  student: '学子',
  zhihou: '祗候',
  painter_regular: '画正',
  painter_awaiting: '画待诏',
};
/** 希孟首遇闲聊句数（2026-06-26）：独立于每日主动闲聊额度，首遇当场可说几句即自然收尾 */
const FIRST_MEET_CHAT_TURNS = 4;

/** 剧情驱动场景状态机（2026-06-17）：loading-open → reading →（continue 回 reading）→ loading-end → null */
export interface ActiveScene {
  status: 'loading-open' | 'reading' | 'loading-continue' | 'loading-end';
  action: GameAction;
  locationId: LocationId;
  /** 场景所属的日与时段（行动结算前） */
  day: number;
  timeSlot: TimeSlot;
  npcsPresent: NpcId[];
  facts: string[];
  allowedClueIds: string[];
  /** 已生成段数（open=1，每 continue +1）：硬上限保险丝用 */
  segmentCount: number;
  /** 本场段数硬上限（叙事 4，晨课 3）：即便 LLM 一直说可续，到顶也收「继续」 */
  maxSegments: number;
  /** LLM 上段产出：本场是否还有剧情张力。控制「继续」显隐 */
  sceneCanContinue: boolean;
  /** LLM 上段产出：剧情是否到了收束点。控制「去别处看看」显隐（2026-06-17 修正：不再恒显示） */
  shouldConclude: boolean;
  /** LLM 产出的推荐行动（裁决后）：渲染为推荐行动签 */
  suggestedActions: ValidatedSuggestedAction[];
  /** LLM 失败时回落的模板文案 */
  fallbackText?: string;
  /** 上一场结尾锚点（场景创建时从行动前的 lastSceneEnding 截取） */
  prevEnding?: string;
  /** 已生成的累计正文（open + 各 continue 段） */
  openText?: string;
  /** 当前段正文（VN 式分段显示，2026-06-30）：正文区只显示最新一段，不显累计 openText；账本/LLM context 仍用 openText */
  latestSegment?: string;
  /** VN 逐句显示单元（2026-06-30）：当前批 LLM 正文切成的句/段单元，前端逐个播、立绘随 speaker 切换 */
  segments?: SceneSegment[];
  /** 当前正在显示到的 segment 下标（小箭头/自动推进；到 segments.length-1 即本批播完，才出「继续」签） */
  segIndex?: number;
  /** 本场累计档案实体（open+各 continue，2026-07-01）：commit 时去重入 clueGraph */
  discoveredEntities?: SceneEntity[];
  /** 延迟结算（2026-06-15）：runAction 已算好但未提交的引擎成品（含时段推进/体力/技能/例钱/location 跳转） */
  pendingSettledState?: GameState;
  /** 延迟结算的引擎数值签（resolve 时与 LLM 建议签合并 showSettlement） */
  pendingSettlePatch?: ValidatedStatePatch;
}

const examQuestionTypes: QuestionType[] = ['observe_detail', 'express_intent', 'character_dispute', 'poem_intent'];

function pickExamQuestionTypes() {
  const shuffled = [...examQuestionTypes];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, 2);
}

/** 温书自测（2026-06-28）：随机取一个题型（非秘阁 archive_observation），出 1 题 */
function pickQuickExamQuestionType(): QuestionType {
  return examQuestionTypes[Math.floor(Math.random() * examQuestionTypes.length)];
}

function mergeSkillDeltas(evaluations: PaintingIntentEvaluatorOutput[]) {
  return evaluations.reduce<SkillDelta>((merged, evaluation) => {
    for (const [skillId, delta] of Object.entries(evaluation.suggestedStatePatch.skillDelta ?? {})) {
      const typedSkillId = skillId as SkillId;
      merged[typedSkillId] = (merged[typedSkillId] ?? 0) + (delta ?? 0);
    }
    return merged;
  }, {});
}

function collectSuggestedFlags(evaluations: PaintingIntentEvaluatorOutput[]) {
  return Object.fromEntries(
    evaluations.flatMap((evaluation) => evaluation.suggestedStatePatch.flagsSuggested ?? []).map((flag) => [flag, true]),
  );
}

function collectStyleTags(evaluations: PaintingIntentEvaluatorOutput[]) {
  return Array.from(
    new Set(
      evaluations.flatMap((evaluation) => [
        ...evaluation.styleTags,
        ...(evaluation.memoryPatch.playerStyleTags ?? []),
      ]),
    ),
  );
}

function renderLlmError(error: unknown) {
  const message = error instanceof Error ? error.message : '未知错误';
  return `墨枢暂时失声：${message}`;
}

export function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [hasSave, setHasSave] = useState(() => loadSaveFile() !== null);
  // 穿越引语页（2026-06-30）：入院名录前的打字机引语，每次进程只放一次（有存档可续则跳过）
  const [prologueSeen, setPrologueSeen] = useState(() => loadSaveFile() !== null);
  const [isExamOpen, setIsExamOpen] = useState(false);
  const [isPuzzleOpen, setIsPuzzleOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  // 结局页临时关闭（2026-06-28）：玩家点「入秘阁一观」后暂隐结局页，进主界面看《骸游图》；可再唤回 */
  const [endingDismissed, setEndingDismissed] = useState(false);
  // 结局序列（2026-06-30 批一）：丹青试交卷后分段演出（导师点评→授衔→收尾）。null=不在序列中。UI 临时态不入存档。
  const [endingStage, setEndingStage] = useState<EndingStage | null>(null);
  // 导师点评 LLM 文（批一）：null=生成中
  const [mentorReview, setMentorReview] = useState<{ dialogue: string; actionText: string } | null>(null);
  // 见希孟 LLM 文（批二）：null=生成中
  const [ximengMeet, setXimengMeet] = useState<{ dialogue: string; actionText: string } | null>(null);
  const [dialogueNpcId, setDialogueNpcId] = useState<NpcId | null>(null);
  /** 当前闲聊是否为剧情首遇（2026-06-26）：首遇不计入每日闲聊次数 */
  const [dialogueIsFirstMeet, setDialogueIsFirstMeet] = useState(false);
  const [examQuestions, setExamQuestions] = useState<PaintingPromptGeneratorOutput[]>([]);
  // 考试模式（2026-06-28；2026-06-30 批二加 retake）：final=第7日丹青试；quick=晚间温书自测；retake=落第补考（保底过）
  const [examMode, setExamMode] = useState<'final' | 'quick' | 'retake'>('final');
  const [puzzleAssessmentPrompt, setPuzzleAssessmentPrompt] = useState<PaintingPromptGeneratorOutput | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<{ patch: ValidatedStatePatch; seq: number } | null>(null);
  // 档案库新增实体飘条（2026-07-01）：本次 commit 新增的节点，主界面显数秒淡出
  const [newEntities, setNewEntities] = useState<{ items: ClueGraphNode[]; seq: number } | null>(null);
  const [activeScene, setActiveScene] = useState<ActiveScene | null>(null);
  /** 入院转场页引文：null = 生成中 */
  const [admissionText, setAdmissionText] = useState<string | null>(null);
  const mainlineStartedRef = useRef(false);
  /** 叙事时段自动开场防重入（2026-06-18）：本时段已访问地点集合，每地点本时段只自动开一次 */
  const autoStartRef = useRef<{ slotKey: string; visited: Set<LocationId> }>({ slotKey: '', visited: new Set() });
  /** 最新 state 镜像：异步收尾（场景 resolve 等）须以此为基底，避免旧快照覆盖后台写入（如主线规划） */
  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;
  const actions = useMemo(() => (state ? getAvailableActions(state) : []), [state]);
  /** 当前应播的引导脚本（固定脚本）：场景/考试/解谜/对话进行中不插播 */
  const guideStep =
    state && !activeScene && !isExamOpen && !isPuzzleOpen && !dialogueNpcId ? getActiveGuideStep(state) : null;

  // 叙事时段自动开场（2026-06-18 A+C）：进入 forenoon/afternoon、走到新地点时自动开 LLM 场景；
  // 玩家通过三件套（继续/推荐/去别处）推进。去别处不推进时段、回主界面自由走动。
  // 防重入：每个地点本时段只自动开一次（visited 集合），满 MAX_SLOT_SCENES 场后停开（报时钟收尾签接管）。
  useEffect(() => {
    if (!state || activeScene || guideStep) return;
    if (state.progress.flags.finalChapter) return;
    const slot = state.time.timeSlot;
    if (slot !== 'forenoon' && slot !== 'afternoon') return;
    // 竞态修复（2026-06-25）：自动开场与静默解锁(library/garden/market)都监听 [state]，自动开场定义在前先跑，
    // 会用 stale 的 unlockedLocations(还是['hall'])开场，导致整条 follow 链的推荐签按['hall']裁决、去别处全被剔。
    // 本时段尚有待应用的静默解锁时，跳过这一拍，让解锁 effect 先更新 state，下一拍以新 unlocked 再开场。
    if (getSilentSlotUnlock(state)) return;
    const slotKey = `d${state.time.day}-${slot}`;
    // 跨时段重置已访问地点集合
    if (autoStartRef.current.slotKey !== slotKey) {
      autoStartRef.current = { slotKey, visited: new Set() };
    }
    // 演满上限：不再自动开场，等玩家点报时钟收尾签推进时段
    if (state.time.slotSceneCount >= MAX_SLOT_SCENES) return;
    // 本地点本时段已开过：不重开（治去别处后原地立即重启），玩家走到新地点才开新场
    if (autoStartRef.current.visited.has(state.currentLocation)) return;
    autoStartRef.current.visited.add(state.currentLocation);
    const action: GameAction = {
      id: `auto-wander-${state.currentLocation}-${Date.now()}`,
      type: 'wander',
      label: '信步走走',
      locationId: state.currentLocation,
      staminaCost: 0,
    };
    runAction(state, action);
  }, [state, activeScene, guideStep]);

  function showSettlement(patch: ValidatedStatePatch) {
    setSettlement((prev) => ({ patch, seq: (prev?.seq ?? 0) + 1 }));
  }

  /** 档案库新增实体飘条（2026-07-01）：commit 时新增的节点，主界面显数秒淡出 */
  function showNewEntities(items: ClueGraphNode[]) {
    if (!items.length) return;
    setNewEntities((prev) => ({ items, seq: (prev?.seq ?? 0) + 1 }));
  }

  function buildSceneInput(scene: ActiveScene, anchor: GameState) {
    return {
      day: scene.day,
      timeSlot: scene.timeSlot,
      locationId: scene.locationId,
      currentLocationLabel: LOCATIONS[scene.locationId]?.name,
      allowedLocations: anchor.progress.unlockedLocations.map((id) => LOCATIONS[id]?.name).filter(Boolean),
      weather: getWeather(scene.day),
      season: SEASON,
      player: buildScenePlayerCard(anchor.player),
      actionLabel: scene.action.label,
      facts: scene.facts,
      themeBeat: getThemeBeat(scene.day),
      mainlineBeat: anchor.mainline?.beats.find((beat) => beat.day === scene.day)?.beat,
      // 双轨叙事（2026-06-12）：机械类不进 startScene，故此处只会是 growth/narrative
      narrativeTrack: getActionTrack(scene.action) === 'narrative' ? ('narrative' as const) : ('growth' as const),
      prevSceneEnding: scene.prevEnding,
      locationThread: anchor.memory.locationThreads?.[scene.locationId],
      appointmentContext:
        scene.action.type === 'keep_appointment'
          ? anchor.pendingHooks?.find((h) => h.id === scene.action.hookId)?.summary
          : undefined,
      todayPlan: buildTodayPlan(anchor),
      npcsPresent: npcIdsToCards(scene.npcsPresent, anchor.relationships),
      ximengMet: anchor.progress.flags.metXimeng === true,
      lengthBudget: {
        segmentMin: SEGMENT_MIN,
        segmentMax: SEGMENT_MAX,
        dayCharsUsed: anchor.time.narrativeCharsToday,
        dayCharsMax: DAY_CHARS_MAX,
      },
      allowedClueIds: scene.allowedClueIds,
      playerStyleTags: anchor.memory.playerStyle.tags,
      recentLedger: anchor.memory.storyLedger.slice(-2).map((entry) => entry.summary),
      canonWarnings: anchor.memory.coreCanon.spoilerBoundaries,
    };
  }

  /** 入院引文（拍板：轻量转场页）：小书童在院门前迎人；失败回落模板，不卡入院 */
  async function fetchAdmissionIntro(s: GameState) {
    const fallback = `${s.player.name}立在丹青院门前。门楼旧漆未褪，匾上「丹青院」三字沉稳如山。一个挎着布巾的小书童从门里探出头来，上下打量一眼，笑嘻嘻拱手："新来的学子罢？随我进来。"门内墨香很淡，像一场尚未落纸的雨。`;
    try {
      const response = await llmAdapter.narrateScene({
        traceId: `scene-intro-${Date.now()}`,
        role: 'scene_narrator',
        promptVersion: SCENE_PROMPT_VERSION,
        input: {
          phase: 'intro',
          day: 1,
          timeSlot: 'morning_class',
          locationId: 'hall',
          weather: getWeather(1),
          season: SEASON,
          player: buildScenePlayerCard(s.player),
          actionLabel: '入院',
          facts: [
            `今日是${s.player.name}入院第一日`,
            '画院的小书童在院门前迎人——一个十二三岁的机灵孩子，院里洒扫传话都归他',
            '李唐为丹青院总教习',
          ],
          themeBeat: getThemeBeat(1),
          npcsPresent: [{ id: 'shutong', name: '小书童' }],
          lengthBudget: {
            segmentMin: SEGMENT_MIN,
            segmentMax: SEGMENT_MAX,
            dayCharsUsed: 0,
            dayCharsMax: DAY_CHARS_MAX,
          },
          allowedClueIds: [],
          playerStyleTags: [],
          recentLedger: [],
          canonWarnings: s.memory.coreCanon.spoilerBoundaries,
        },
        context: buildMemoryContext(s, 'scene_narrator'),
      });
      setAdmissionText(response.output.narrativeText);
    } catch {
      setAdmissionText(fallback);
    }
  }

  /** 点击「入院」：落 admitted 旗标进主界面，引导场景由 effect 自动发起 */
  function enterAcademy() {
    if (!state || !admissionText) return;
    const entered: GameState = {
      ...state,
      progress: {
        ...state.progress,
        flags: { ...state.progress.flags, admitted: true },
      },
      lastRenderedText: admissionText,
      // 入院引文作首场承接锚点（2026-06-16）：否则改读 lastSceneEnding 后第 1 日晨课开场会断
      lastSceneEnding: admissionText,
    };
    saveGameState(entered);
    setHasSave(true);
    setState(entered);
  }

  /** 引导脚本收尾（拍板：固定脚本不走 LLM）：落旗标/解锁去处，希孟首场接自由对话 */
  function completeGuideStep(step: GuideStep) {
    const base = stateRef.current;
    if (!base) return;
    // 希孟书房首遇给初始好感（2026-06-25）：山水画风 +12 / 其余 +5（都在陌路档，便签卡靠 metXimeng 解锁）
    const ximengFirstMeet = step.after === 'ximeng_chat';
    const patched = applyValidatedStatePatch(base, {
      flagsSet: step.flagsSet,
      unlockedLocations: step.unlockLocations,
      relationshipDeltaByNpc: ximengFirstMeet
        ? { ximeng: base.player.styleOrigin === 'landscape' ? 12 : 5 }
        : undefined,
    });
    saveGameState(patched);
    setHasSave(true);
    setState(patched);
    // 脚本场景占位（2026-06-26 治 #3）：希孟首遇等脚本在某地点发生后，标记该地点本时段已访问，
    // 防自动开场在同地点同时段又开一场 wander（首遇希孟后又自动遇李唐、希孟线断）。
    if (base.time.timeSlot === 'forenoon' || base.time.timeSlot === 'afternoon') {
      const slotKey = `d${base.time.day}-${base.time.timeSlot}`;
      if (autoStartRef.current.slotKey !== slotKey) {
        autoStartRef.current = { slotKey, visited: new Set() };
      }
      autoStartRef.current.visited.add(base.currentLocation);
    }
    if (step.after === 'ximeng_chat') {
      setDialogueIsFirstMeet(true); // 首遇对话不计次（2026-06-26 治 #4）
      setDialogueNpcId('ximeng');
    }
  }

  // 第 2 日起全开放（拍板）：第 1 日渐次解锁仅为教程；跳段（体力耗尽）也由此兜底
  useEffect(() => {
    if (!state || !state.progress.flags.admitted || state.time.day < 2) return;
    const missingLocations = BASE_LOCATIONS.filter((loc) => !state.progress.unlockedLocations.includes(loc));
    const missingFlags = Object.values(TUTORIAL_SLOT_FLAGS).filter((flagId) => !state.progress.flags[flagId]);
    if (missingLocations.length === 0 && missingFlags.length === 0) return;
    const patched = applyValidatedStatePatch(state, {
      unlockedLocations: missingLocations,
      flagsSet: Object.fromEntries(missingFlags.map((flagId) => [flagId, true])),
    });
    saveGameState(patched);
    setState(patched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 第 1 日上午/下午静默解锁（2026-06-11 拍板：不弹小书童，右栏灰牌直接亮起）
  useEffect(() => {
    if (!state) return;
    const silent = getSilentSlotUnlock(state);
    if (!silent) return;
    const patched = applyValidatedStatePatch(state, {
      flagsSet: silent.flagsSet,
      unlockedLocations: silent.unlockLocations,
    });
    saveGameState(patched);
    setState(patched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 希孟画室解锁（2026-06-25）：好感 ≥ 知己(60) 解锁 ximeng_studio，去处面板亮起，可前往触发画室专属场景
  useEffect(() => {
    if (!state) return;
    if (state.relationships.ximeng.hiddenAffinity < 60) return;
    if (state.progress.unlockedLocations.includes('ximeng_studio')) return;
    const patched = applyValidatedStatePatch(state, { unlockedLocations: ['ximeng_studio'] });
    saveGameState(patched);
    setState(patched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  /** 七日主线规划（拍板）：开局种子 + 一次 LLM 扩写节拍表；失败回落模板节拍 */
  async function ensureMainline(s: GameState) {
    const seed = rollMainlineSeed();
    let mainline: MainlineState;
    try {
      const response = await llmAdapter.planMainline({
        traceId: `mainline-${Date.now()}`,
        role: 'mainline_planner',
        promptVersion: MAINLINE_PROMPT_VERSION,
        input: {
          seed: {
            motifLabel: seed.motifLabel,
            motifHint: getMotifHint(seed.motifId),
            npcId: seed.npcId,
            npcName: CHARACTERS[seed.npcId].name,
            objectLabel: seed.objectLabel,
            locationLabel: LOCATIONS[seed.locationId].name,
          },
          playerName: s.player.name,
          styleLabel: buildScenePlayerCard(s.player).styleLabel,
          aspiration: s.player.aspiration,
          canonWarnings: s.memory.coreCanon.spoilerBoundaries,
        },
        context: buildMemoryContext(s, 'mainline_planner'),
      });
      mainline = { seed, title: response.output.title, beats: response.output.beats };
    } catch {
      mainline = { seed, title: seed.motifLabel, beats: buildFallbackBeats(seed) };
    }
    setState((prev) => {
      if (!prev || prev.mainline) return prev;
      const next: GameState = { ...prev, mainline };
      saveGameState(next);
      return next;
    });
  }

  // 入院后台规划主线（含旧档补齐）：不阻塞任何页面
  useEffect(() => {
    if (!state || !state.progress.flags.admitted || state.mainline) return;
    if (mainlineStartedRef.current) return;
    mainlineStartedRef.current = true;
    void ensureMainline(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  /**
   * 合并引擎结算签 + LLM 建议签（仅用于 showSettlement 展示）：skillDelta 相加，其余字段后者覆盖。
   * clamp 已在各自 applyValidatedStatePatch 做过，此处只为让玩家一次看到全部变化（如晨课技能+1 与场景心情+1）。
   */
  function mergeSettlementPatch(
    enginePatch: ValidatedStatePatch | undefined,
    llmPatch: ValidatedStatePatch | undefined,
  ): ValidatedStatePatch {
    const merged: ValidatedStatePatch = { ...(enginePatch ?? {}) };
    if (llmPatch?.moodDelta) merged.moodDelta = (merged.moodDelta ?? 0) + llmPatch.moodDelta;
    if (llmPatch?.relationshipDeltaByNpc) merged.relationshipDeltaByNpc = llmPatch.relationshipDeltaByNpc;
    if (llmPatch?.cluesGranted) merged.cluesGranted = llmPatch.cluesGranted;
    return merged;
  }

  /**
   * 延迟结算提交（2026-06-15；2026-06-16 加连贯记忆）：把 runAction 算好的引擎成品 settled 正式交付——
   * 三条路径共用：正常 resolve / 预算跳过 / open 失败。提交时回灌后台异步字段（mainline），
   * 字数用 stateRef.current（已含本场 open+mid）+ resolveText 长度，避免双重记账丢字数。
   *
   * 两个 gate 语义不同（关键）：
   * - 档案写入 = resolveTextLen>0（有正文就记，含兜底句，保证画案手记不缺格）；
   * - 锚点/地点线程写入 = isLlmRendered（仅真实 LLM 正文，兜底句不当锚点防污染）。
   */
  function commitPendingSettlement(args: {
    settled: GameState;
    enginePatch?: ValidatedStatePatch;
    combinedText: string;
    resolveTextLen: number;
    llmPatch?: ValidatedStatePatch;
    memoryNote?: string | null;
    actionType: GameAction['type'];
    locationId: LocationId;
    isLlmRendered?: boolean;
    /** 本场是赴约（keep_appointment）则标记该约定完成 */
    completedHookId?: string;
    /** 本场 LLM 产出的新约定，入 pendingHooks 队列 */
    newHook?: PendingHookDraft;
    /** 结算落定后回调（用 committed state，供推荐行动串场，避免 stale） */
    afterCommit?: (committed: GameState) => void;
    /** 点「去别处看看」收束本时段（2026-06-17）：提交时补推一个时段。推荐行动串场=false（同时段衔接） */
    advanceSlotOnCommit?: boolean;
    /** 本场 LLM 产出的推荐行动（2026-06-17）：落入 suggestedIntents 持久层，手动走到该地可触发接续场景 */
    recordIntents?: ValidatedSuggestedAction[];
    /** 字数增量覆盖（2026-06-18）：去别处收束时正文已在 open/continue 计过，传 0 防双重记账；不传则用 resolveTextLen */
    charDelta?: number;
    /** 本场算作一场叙事（2026-06-18）：slotSceneCount+1，满 MAX_SLOT_SCENES 后报时钟收尾签亮起 */
    countsAsScene?: boolean;
    /** 本场累计档案实体（2026-07-01）：去重入 clueGraph，新增的飘「新增」提示 */
    entities?: SceneEntity[];
  }) {
    const { settled, enginePatch, combinedText, resolveTextLen, llmPatch, memoryNote, actionType, locationId, isLlmRendered, completedHookId, newHook, afterCommit, advanceSlotOnCommit, recordIntents, charDelta, countsAsScene, entities } = args;
    const live = stateRef.current;
    // 回灌后台异步写入字段（ensureMainline 可能在场景进行中写了 mainline，settled 基于行动前 base 不含它）
    let next: GameState = { ...settled, mainline: live?.mainline ?? settled.mainline };
    if (llmPatch && Object.keys(llmPatch).length > 0) next = applyValidatedStatePatch(next, llmPatch);
    // 档案不缺格：有正文即写账本（memoryNote 空则用末尾/actionLabel 兜底 summary），visibleText 存全文
    if (resolveTextLen > 0) {
      const ledgerNote = memoryNote || buildEnding(combinedText) || actionType;
      next = commitMemoryPatch({ state: next, actionType, renderedText: combinedText, locationId, memoryPatch: { storyLedgerNote: ledgerNote } });
    }
    // 档案实体去重入库（2026-07-01）：不依赖是否写账本，独立并入 clueGraph；新增的飘「新增」提示
    if (entities?.length) {
      const merged = mergeDiscoveredEntities(next.memory.clueGraph.nodes, entities);
      if (merged.added.length > 0) {
        next = { ...next, memory: { ...next.memory, clueGraph: { ...next.memory.clueGraph, nodes: merged.nodes } } };
        showNewEntities(merged.added);
      }
    }
    // 连贯锚点 + 地点线程：仅真实 LLM 正文才写（兜底句/预算跳过/失败不污染）
    if (isLlmRendered) {
      const ending = buildEnding(combinedText);
      if (ending) next.lastSceneEnding = ending;
      const threads = { ...(next.memory.locationThreads ?? {}) };
      threads[locationId] = memoryNote || ending || threads[locationId];
      next.memory = { ...next.memory, locationThreads: threads };
    }
    // 剧情约定（2026-06-16）：标记完成 + 新约定入队。**必须在 next 链末尾**——
    // next 起于 settled（行动前快照，含旧 pendingHooks），早写会被覆盖。
    let hooks = next.pendingHooks ?? [];
    if (completedHookId) {
      hooks = hooks.map((h) => (h.id === completedHookId ? { ...h, status: 'completed' as const } : h));
      next = applyValidatedStatePatch(next, { eventIdsCompleted: [completedHookId] });
    }
    if (newHook) {
      const seq = hooks.length + 1;
      hooks = [...hooks, { ...newHook, id: `hook-d${newHook.createdDay}-${seq}`, status: 'pending' as const }];
    }
    if (completedHookId || newHook) next = { ...next, pendingHooks: hooks };
    // 即时推荐意图落持久层（2026-06-17）：本场推荐的去处→intent，手动走到该地可触发接续场景。同地点后写覆盖。
    // 须在跨日补推（advanceSlotOnCommit）之前——advanceTime 会清空 suggestedIntents（推荐当日有效）。
    if (recordIntents?.length) {
      const intents = { ...(next.suggestedIntents ?? {}) };
      for (const s of recordIntents) intents[s.locationId] = s.summary;
      next = { ...next, suggestedIntents: intents };
    }
    // 字数：取场景进行中累加后的最新值（open+mid 已计），再加 resolve 段（charDelta 覆盖：去别处收束传 0 防双重记账）
    const baseChars = live?.time.narrativeCharsToday ?? settled.time.narrativeCharsToday;
    const addChars = charDelta ?? resolveTextLen;
    next = { ...next, lastRenderedText: combinedText, time: { ...next.time, narrativeCharsToday: baseChars + addChars } };
    // 本场算作一场叙事（2026-06-18）：slotSceneCount+1（去别处/推荐串场/普通场景皆 +1）。advanceSlotOnCommit 会清零，无需在意顺序
    if (countsAsScene) next = { ...next, time: { ...next.time, slotSceneCount: next.time.slotSceneCount + 1 } };
    // 点「去别处看看」收束本时段（2026-06-17）：此刻才补推一个时段（场景行动本身已 timeAdvance:false）。
    // 复用 applyValidatedStatePatch 的 advanceTime（含体力归零 while + 跨日小结/missed/晨起回院堂/narrativeCharsToday 清零）。
    if (advanceSlotOnCommit) next = applyValidatedStatePatch(next, { timeAdvance: true });
    const settleSign = mergeSettlementPatch(enginePatch, llmPatch);
    if (Object.keys(settleSign).length > 0) showSettlement(settleSign);
    saveGameState(next);
    setHasSave(true);
    setState(next);
    setActiveScene(null);
    // 结算落定后串场（推荐行动用 committed state 立即开下一场，避免 stale）
    afterCommit?.(next);
  }

  /**
   * 多轮场景 · 开场（2026-06-11 拍板，2026-06-15 延迟结算）：直接 loading → LLM 开场；
   * 模板仅作 LLM 失败兜底。第 1 日场景 2 轮分支，其余 1 轮。settled/enginePatch 缓存进场景，resolve 时提交。
   */
  async function startScene(prevState: GameState, settledState: GameState, action: GameAction, enginePatch: ValidatedStatePatch) {
    const locationId = action.locationId ?? prevState.currentLocation;
    const fallbackText = settledState.lastRenderedText ?? '';
    // 日终字数预算：当日余额不足一段时不生成 LLM。
    // 推荐行动串场（follow_suggestion）豁免（2026-06-18 治 #2）：否则接续场景落到模板"你循着方才的念头…"+固定签，不接前文。
    if (
      action.type !== 'follow_suggestion' &&
      settledState.time.narrativeCharsToday + SEGMENT_MIN > DAY_CHARS_MAX
    ) {
      // 预算耗尽（罕见，当日已写满 4500 字）：叙事时段补推一个时段；沙盒时段不推（靠歇晌/就寝出口，治 #3）
      commitPendingSettlement({
        settled: settledState,
        enginePatch,
        combinedText: fallbackText,
        resolveTextLen: 0,
        charDelta: 0,
        actionType: action.type,
        locationId,
        advanceSlotOnCommit: !isSandboxSlot(settledState.time.timeSlot),
      });
      return;
    }

    const scene: ActiveScene = {
      status: 'loading-open',
      action,
      locationId,
      day: prevState.time.day,
      timeSlot: prevState.time.timeSlot,
      npcsPresent: rollNpcsPresent(prevState, action, locationId),
      facts: buildSceneFacts(prevState, action, locationId),
      allowedClueIds: [],
      segmentCount: 1,
      // 硬上限保险丝（2026-06-17）：晨课课业偏轻 3 段，其余叙事 4 段
      maxSegments: action.type === 'attend_class' ? 3 : 4,
      sceneCanContinue: true,
      shouldConclude: false,
      suggestedActions: [],
      fallbackText,
      prevEnding: buildPrevSceneEnding(prevState),
      pendingSettledState: settledState,
      pendingSettlePatch: enginePatch,
    };
    setActiveScene(scene);
    // 预设文案不上屏（拍板）：loading 期间正文留白
    setState((prev) => (prev ? { ...prev, lastRenderedText: '' } : prev));

    try {
      const response = await llmAdapter.narrateScene({
        traceId: `scene-open-${Date.now()}`,
        role: 'scene_narrator',
        promptVersion: SCENE_PROMPT_VERSION,
        input: { phase: 'open', ...buildSceneInput(scene, settledState) },
        context: buildMemoryContext(settledState, 'scene_narrator'),
      });
      const { narrativeText } = response.output;
      const canContinue = response.output.sceneCanContinue ?? true;
      const shouldConclude = response.output.shouldConclude ?? false;
      // 用 LIVE unlocked（stateRef.current）裁决，不用 settledState 快照（2026-06-25 修竞态）：
      // 第一日静默解锁与自动开场同拍，settledState 可能仍是开场前的 ['hall']，会把"去书房"等推荐签全裁掉。
      const suggested = clampSuggestedActions(
        response.output.suggestedActions,
        (stateRef.current ?? settledState).progress.unlockedLocations,
      );
      setState((prev) =>
        prev
          ? {
              ...prev,
              lastRenderedText: narrativeText,
              time: { ...prev.time, narrativeCharsToday: prev.time.narrativeCharsToday + narrativeText.length },
            }
          : prev,
      );
      setActiveScene((current) =>
        current?.status === 'loading-open'
          ? { ...current, status: 'reading', openText: narrativeText, latestSegment: narrativeText, segments: buildSegments(response.output), segIndex: 0, discoveredEntities: response.output.entitiesIntroduced ?? [], sceneCanContinue: canContinue, shouldConclude, suggestedActions: suggested }
          : current,
      );
    } catch {
      // 开场生成失败（2026-06-18）：不推进时段，回主界面自由走动（叙事时段算一场，让报时钟收尾签能接管；
      // 沙盒时段不推让玩家走回宿舍就寝，治 #3）。正文回落模板。
      commitPendingSettlement({
        settled: settledState,
        enginePatch,
        combinedText: fallbackText,
        resolveTextLen: 0,
        charDelta: 0,
        actionType: action.type,
        locationId,
        advanceSlotOnCommit: false,
        countsAsScene: !isSandboxSlot(settledState.time.timeSlot),
      });
    }
  }

  /**
   * 续写（2026-06-17）：玩家点「继续」或写自由回应——LLM 顺剧情续一段，不结算、不推进时段。
   * 受 maxSegments 硬上限与日终字数预算约束（任一到顶则当作「继续」不可用，由 UI 隐藏，此处兜底防御）。
   */
  async function continueScene(playerInput?: string) {
    if (!state || !activeScene || activeScene.status !== 'reading' || !activeScene.openText) return;
    const scene = activeScene;
    // 硬上限/预算兜底：到顶则不再续（UI 已隐藏「继续」，此处防御性 no-op）
    if (scene.segmentCount >= scene.maxSegments) return;
    if (state.time.narrativeCharsToday + SEGMENT_MIN > DAY_CHARS_MAX) return;
    setActiveScene({ ...scene, status: 'loading-continue' });
    try {
      const response = await llmAdapter.narrateScene({
        traceId: `scene-continue-${Date.now()}`,
        role: 'scene_narrator',
        promptVersion: SCENE_PROMPT_VERSION,
        input: {
          phase: 'continue',
          ...buildSceneInput(scene, stateRef.current ?? state),
          openNarrative: scene.openText,
          playerChoice: playerInput,
        },
        context: buildMemoryContext(stateRef.current ?? state, 'scene_narrator'),
      });
      const { narrativeText } = response.output;
      const canContinue = response.output.sceneCanContinue ?? true;
      const shouldConclude = response.output.shouldConclude ?? false;
      const suggested = clampSuggestedActions(
        response.output.suggestedActions,
        (stateRef.current ?? state).progress.unlockedLocations,
      );
      const accumulated = `${scene.openText}\n\n${narrativeText}`;
      setState((prev) =>
        prev
          ? {
              ...prev,
              lastRenderedText: accumulated,
              time: { ...prev.time, narrativeCharsToday: prev.time.narrativeCharsToday + narrativeText.length },
            }
          : prev,
      );
      setActiveScene((current) =>
        current?.status === 'loading-continue'
          ? {
              ...current,
              status: 'reading',
              openText: accumulated,
              latestSegment: narrativeText,
              segments: buildSegments(response.output),
              segIndex: 0,
              discoveredEntities: [...(current.discoveredEntities ?? []), ...(response.output.entitiesIntroduced ?? [])],
              segmentCount: current.segmentCount + 1,
              sceneCanContinue: canContinue,
              shouldConclude,
              suggestedActions: suggested,
            }
          : current,
      );
    } catch {
      // 续写失败：回到 reading，本段不计；「继续」仍在（除非已到上限）
      setActiveScene((current) => (current?.status === 'loading-continue' ? { ...current, status: 'reading' } : current));
    }
  }

  /** VN 逐句推进（2026-06-30）：小箭头/自动播放——把当前 segIndex 往后挪一个单元（不调 LLM，纯前端切换）。到末尾不再前进（UI 改显「继续」签）。 */
  function advanceSegment() {
    setActiveScene((current) => {
      if (!current || current.status !== 'reading' || !current.segments) return current;
      const next = (current.segIndex ?? 0) + 1;
      if (next >= current.segments.length) return current;
      return { ...current, segIndex: next };
    });
  }

  /**
   * 去别处看看（2026-06-18 A+C 重做）：收束本场——**不调 LLM、不推进时段**。
   * 已生成的 openText 即最终正文；写 locationThread（玩家任何时段回该地点可由 LLM 接续）；
   * 本场推荐落 suggestedIntents 持久层；slotSceneCount+1（满 3 场报时钟亮）；回主界面自由走动。
   */
  function concludeScene() {
    if (!state || !activeScene || activeScene.status !== 'reading' || !activeScene.openText) return;
    const scene = activeScene;
    const combinedText = scene.openText ?? '';
    commitPendingSettlement({
      settled: scene.pendingSettledState ?? stateRef.current ?? state,
      enginePatch: scene.pendingSettlePatch,
      combinedText,
      // 正文已在 open/continue 计过字数与上屏；这里只补写账本/地点线程，charDelta:0 防双重记账
      resolveTextLen: combinedText.length,
      charDelta: 0,
      actionType: scene.action.type,
      locationId: scene.locationId,
      // openText 是真实 LLM 正文 → 写连贯锚点 + 地点线程（记忆衔接 #4）
      isLlmRendered: true,
      completedHookId: scene.action.type === 'keep_appointment' ? scene.action.hookId : undefined,
      // 去别处不推进时段（A+C）：靠报时钟收尾签推进；本场推荐落持久层，手动走到推荐地可接续
      advanceSlotOnCommit: false,
      recordIntents: scene.suggestedActions,
      countsAsScene: true,
      entities: scene.discoveredEntities,
    });
  }

  /**
   * 推荐行动串场（2026-06-17，2026-06-18 收敛为仅 follow）：玩家点某「推荐行动」——
   * LLM 写收束段 + 同时段衔接（不推进时段），结算落定后立即以推荐行动开下一场。
   */
  async function endScene(opts: { reason: 'follow'; next?: ValidatedSuggestedAction }) {
    if (!state || !activeScene || activeScene.status !== 'reading' || !activeScene.openText) return;
    const scene = activeScene;
    setActiveScene({ ...scene, status: 'loading-end' });

    let resolveText = '你收住念头，这一场便这样过去。';
    let clamped: ValidatedStatePatch = {};
    let newHook: PendingHookDraft | undefined;
    let memoryNote: string | null = null;
    let resolveOk = false;
    try {
      const response = await llmAdapter.narrateScene({
        traceId: `scene-end-${Date.now()}`,
        role: 'scene_narrator',
        promptVersion: SCENE_PROMPT_VERSION,
        input: {
          phase: 'end',
          ...buildSceneInput(scene, state),
          openNarrative: scene.openText,
        },
        context: buildMemoryContext(state, 'scene_narrator'),
      });
      resolveText = response.output.narrativeText;
      ({ patch: clamped, hook: newHook } = clampSceneSuggestedPatch(
        response.output.suggestedPatch,
        scene.npcsPresent,
        scene.allowedClueIds,
        scene.day,
      ));
      memoryNote = sanitizeMemoryNote(response.output.memoryNote);
      resolveOk = true;
    } catch {
      // 收束失败：兜底句收场，不附加状态变化（resolveOk=false → 不写锚点/地点线程）
    }

    const combinedText = `${scene.openText}\n\n${resolveText}`;
    const followNext = opts.next;
    commitPendingSettlement({
      settled: scene.pendingSettledState ?? stateRef.current ?? state,
      enginePatch: scene.pendingSettlePatch,
      combinedText,
      resolveTextLen: resolveText.length,
      llmPatch: clamped,
      memoryNote,
      actionType: scene.action.type,
      locationId: scene.locationId,
      isLlmRendered: resolveOk,
      completedHookId: scene.action.type === 'keep_appointment' ? scene.action.hookId : undefined,
      newHook,
      // 推荐行动串场=同时段衔接不补推（2026-06-17）；本场算一场叙事
      advanceSlotOnCommit: false,
      countsAsScene: true,
      entities: scene.discoveredEntities,
      // 推荐行动串场：结算落定后用 committed state 立即开下一场，避免 stale
      afterCommit: followNext
        ? (committed) => {
            const followAction: GameAction = {
              id: `follow-${followNext.locationId}-${Date.now()}`,
              type: 'follow_suggestion',
              label: followNext.label,
              locationId: followNext.locationId,
              intent: followNext.summary,
              staminaCost: 0,
            };
            runAction(committed, followAction);
          }
        : undefined,
    });
  }

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        mode: state === null ? 'setup' : !state.progress.flags.admitted ? 'admission' : guideStep ? 'guide' : state.progress.flags.intro_tour_done && !state.curriculum ? 'planner' : isExamOpen ? 'exam' : isPuzzleOpen ? 'puzzle' : dialogueNpcId ? 'dialogue' : 'main',
        guide: guideStep?.script.id ?? null,
        curriculum: state?.curriculum ?? null,
        player: state?.player,
        time: state?.time,
        stats: state?.stats,
        rank: state?.progress.rank,
        skills: state?.skills,
        ximeng: state?.relationships.ximeng,
        currentNpcId: dialogueNpcId,
        currentLocation: state?.currentLocation,
        examQuestionIds: examQuestions.map((question) => question.id),
        puzzleAssessmentPromptId: puzzleAssessmentPrompt?.id,
        llmError,
        unlockedLocations: state?.progress.unlockedLocations,
        availableActions: actions.map((action) => ({
          id: action.id,
          label: action.label,
          type: action.type,
        })),
        scene: activeScene
          ? { status: activeScene.status, sceneCanContinue: activeScene.sceneCanContinue, shouldConclude: activeScene.shouldConclude, segmentCount: activeScene.segmentCount, maxSegments: activeScene.maxSegments, suggestedActions: activeScene.suggestedActions, npcsPresent: activeScene.npcsPresent }
          : null,
        lastRenderedText: state?.lastRenderedText,
      });
    window.advanceTime = () => undefined;
  }, [actions, activeScene, dialogueNpcId, examQuestions, isExamOpen, isPuzzleOpen, llmError, puzzleAssessmentPrompt, state]);

  if (state === null) {
    if (!prologueSeen) {
      return <ProloguePage onContinue={() => setPrologueSeen(true)} />;
    }
    return (
      <SetupScreen
        hasSave={hasSave}
        onClearSave={() => {
          clearSaveFile();
          setHasSave(false);
        }}
        onResume={() => {
          const saveFile = loadSaveFile();
          if (saveFile) {
            setState(saveFile.gameState);
            if (!saveFile.gameState.progress.flags.admitted) {
              setAdmissionText(null);
              void fetchAdmissionIntro(saveFile.gameState);
            }
          }
        }}
        onStart={(player) => {
          const nextState = createInitialGameState({ player });
          saveGameState(nextState);
          setHasSave(true);
          setState(nextState);
          setAdmissionText(null);
          void fetchAdmissionIntro(nextState);
        }}
      />
    );
  }

  // 轻量入院转场页（拍板）：小书童引文生成后才可入院
  if (!state.progress.flags.admitted) {
    return <AdmissionTransition text={admissionText} onEnter={enterAcademy} />;
  }

  // 引导对话（拍板：固定脚本立绘对话框）：小书童入院介绍 / 第 1 日午间晚间 / 希孟书房首场
  if (guideStep) {
    return (
      <>
        <MainGameScreen
          state={state}
          actions={actions}
          llmError={llmError}
          settlement={settlement}
          newEntities={newEntities}
          scene={activeScene}
          onContinue={continueScene}
          onLeaveScene={concludeScene}
          onAdvanceSegment={advanceSegment}
          onFollowSuggestion={(next) => endScene({ reason: 'follow', next })}
          onAction={handleAction}
          onReset={resetGame}
          guideActive
        />
        <GuideDialogue script={guideStep.script} onDone={() => completeGuideStep(guideStep)} />
      </>
    );
  }

  // 入院引导完成后、未填课表前：课表自填页（拍板：晨课 7 格，第 7 日固定丹青试）
  if (state.progress.flags.intro_tour_done && !state.curriculum) {
    return (
      <SchedulePlanner
        majorSkill={state.player.styleOrigin}
        onConfirm={(curriculum: CurriculumState) => {
          const confirmLine = '课表呈上，李唐扫过一眼，提笔圈点："明日起，照此上课。"';
          const next: GameState = {
            ...state,
            curriculum,
            lastRenderedText: state.lastRenderedText
              ? `${state.lastRenderedText}\n\n${confirmLine}`
              : confirmLine,
          };
          saveGameState(next);
          setState(next);
          // 拍板：呈上课表后自动开讲第 1 日晨课（剧情由此开始）；自由临摹有三选项时留给玩家自选
          const classActions = getAvailableActions(next).filter((action) => action.type === 'attend_class');
          if (classActions.length === 1) runAction(next, classActions[0]);
        }}
      />
    );
  }

  async function generatePaintingPrompt(
    currentState: GameState,
    mode: 'exam' | 'puzzle',
    questionType: QuestionType,
    quickReview = false,
  ) {
    const response = await llmAdapter.generatePaintingPrompt({
      traceId: `${mode}-prompt-${questionType}-${Date.now()}`,
      role: 'painting_prompt_generator',
      promptVersion: 'mock-0.2',
      input: {
        mode,
        questionType,
        difficulty: mode === 'exam' ? 1 : 2,
        relatedSkills:
          questionType === 'archive_observation'
            ? ['figure', 'landscape']
            : mode === 'exam'
              ? getStudiedSkills(currentState.curriculum, currentState.player.styleOrigin)
              : ['landscape', 'figure', 'architecture'],
        day: currentState.time.day,
        playerStyleTags: currentState.memory.playerStyle.tags,
        requiredElements:
          questionType === 'archive_observation'
            ? ['《骸游图》', '药瓶', '婴孩', '被遮住的水路']
            : ['三选项', '自由输入', '趣味考查'],
        forbiddenElements: ['坐实希孟消失原因', '骸游图四人共创', '进献警戒目的'],
        tone: mode === 'exam' ? 'plain' : 'restrained',
        quickReview,
      },
      context: buildMemoryContext(currentState, 'painting_prompt_generator'),
    });
    return response.output;
  }

  /** 行动结算 + 场景发起（handleAction 与课表确认后自动开讲共用） */
  function runAction(base: GameState, action: GameAction) {
    const result = applyAction(base, action);
    const nextState = result.nextState ?? base;

    // 小游戏接入口预留（2026-06-12，本轮全部留空）：将来投壶→小游戏、点茶→调茶
    const card = action.type === 'activity' ? ACTIVITY_BY_ID[action.activityId ?? ''] : undefined;

    // 沙盒练习（2026-06-27）：引擎已确定性结算技能（resolvePractice），调 LLM 出单段沉浸文。
    // 走独立轻量路径——不进三件套场景循环、不写主线账本、不推进时段。在 isLlmScene 分支之前拦截。
    if (getActionTrack(action) === 'practice') {
      void runPractice(base, action, result);
      return;
    }

    // 成长/叙事行动（2026-06-15 延迟结算）：已算好引擎成品但**先不提交、不推进时段**，
    // 仅进 loading 发起 LLM；待场景 resolve 完成（或 LLM 失败/预算跳过）才提交 nextState。
    // 这样"晨课正文刚出、进度条已跳上午"的脱节被根治——时间严格卡在场景完成点。
    if (!card?.minigameId && isLlmScene(action)) {
      // 叙事时段：标记场景地点已访问，防 useEffect 在去别处收束后于原地立即重开（2026-06-18）。
      // 覆盖 auto-wander / follow_suggestion / 手动 intent 接续三条入场路径。
      const sceneLoc = action.locationId ?? nextState.currentLocation;
      if (base.time.timeSlot === 'forenoon' || base.time.timeSlot === 'afternoon') {
        autoStartRef.current.visited.add(sceneLoc);
      }
      // UI 仍停在 base 的时段（进度条不动）；但地点要跟到场景地点（2026-06-17 修 bug：否则 loading 期背景停在旧地点如宿舍）
      setState((prev) => (prev ? { ...prev, lastRenderedText: '', currentLocation: nextState.currentLocation } : prev));
      void startScene(base, nextState, action, result.statePatch);
      return;
    }

    // 机械/rest/sleep/move_to：立即结算推进（维持现状）
    if (action.type === 'move_to') {
      setSettlement(null);
    } else {
      showSettlement(result.statePatch);
    }
    saveGameState(nextState);
    setHasSave(true);
    setState(nextState);

    if (card?.minigameId) {
      // TODO 本轮占位：将来 setActiveMinigame(card.minigameId) 跳小游戏组件再结算
      return;
    }
  }

  /**
   * 沙盒练习（2026-06-27 成长数值重设计）：玩家在午/晚沙盒主动练技能。
   * 引擎已确定性结算技能（resolvePractice，含每日封顶），此处仅调 LLM 出单段沉浸文覆盖正文。
   * 与三件套场景的区别：单段即结束、不进 reading 态（无继续/推荐/去别处 dock）、不写主线账本、不推进时段。
   * loading 复用 ActiveScene 的 'loading-open'（显示「墨正落纸……」）；拿到文本即 setActiveScene(null)。
   * 失败兜底：用练习卡模板句，技能照常结算（练习收益是确定性的，不因 LLM 失败而丢）。
   */
  async function runPractice(base: GameState, action: GameAction, result: ReturnType<typeof applyAction>) {
    const nextState = result.nextState ?? base;
    const card = ACTIVITY_BY_ID[action.activityId ?? ''];
    const locationId = action.locationId ?? base.currentLocation;
    const fallbackText = card?.narratives?.[Math.floor(Math.random() * (card.narratives.length || 1))] ?? '你专心练了半日。';

    // 提交引擎结算（技能/体力/封顶累加），先落兜底文；地点跟到练习处
    const commit = (text: string) => {
      const committed: GameState = { ...nextState, lastRenderedText: text, currentLocation: locationId };
      showSettlement(result.statePatch);
      saveGameState(committed);
      setHasSave(true);
      setState(committed);
      setActiveScene(null);
    };

    // loading 态：复用 ActiveScene 'loading-open'（沉浸文 loading 提示），不进 reading
    setActiveScene({
      status: 'loading-open',
      action,
      locationId,
      day: base.time.day,
      timeSlot: base.time.timeSlot,
      npcsPresent: [],
      facts: [],
      allowedClueIds: [],
      segmentCount: 1,
      maxSegments: 1,
      sceneCanContinue: false,
      shouldConclude: true,
      suggestedActions: [],
      fallbackText,
    });
    setState((prev) => (prev ? { ...prev, lastRenderedText: '', currentLocation: locationId } : prev));

    try {
      const response = await llmAdapter.narrateScene({
        traceId: `scene-practice-${Date.now()}`,
        role: 'scene_narrator',
        promptVersion: SCENE_PROMPT_VERSION,
        input: {
          phase: 'practice',
          day: base.time.day,
          timeSlot: base.time.timeSlot,
          locationId,
          currentLocationLabel: LOCATIONS[locationId]?.name,
          weather: getWeather(base.time.day),
          season: SEASON,
          player: buildScenePlayerCard(base.player),
          actionLabel: action.label,
          facts: [`${base.player.name}在${LOCATIONS[locationId]?.name}专心练习：${action.label}`],
          // 练习纯个人沉浸：不点主题暗线、不插 NPC、不推主线
          themeBeat: '',
          // 练习纯个人沉浸：不插 NPC、不推主线
          npcsPresent: [],
          lengthBudget: {
            segmentMin: PRACTICE_SEGMENT_MIN,
            segmentMax: PRACTICE_SEGMENT_MAX,
            dayCharsUsed: base.time.narrativeCharsToday,
            dayCharsMax: DAY_CHARS_MAX,
          },
          allowedClueIds: [],
          playerStyleTags: base.memory.playerStyle.tags,
          recentLedger: [],
          canonWarnings: base.memory.coreCanon.spoilerBoundaries,
        },
        context: buildMemoryContext(base, 'scene_narrator'),
      });
      commit(response.output.narrativeText || fallbackText);
    } catch {
      // LLM 失败：落模板兜底句，技能照常结算
      commit(fallbackText);
    }
  }

  async function handleAction(action: GameAction) {
    if (!state || activeScene) {
      return;
    }
    setLlmError(null);
    if (action.type === 'take_exam') {
      try {
        const questions = await Promise.all(
          pickExamQuestionTypes().map((questionType) => generatePaintingPrompt(state, 'exam', questionType)),
        );
        setExamMode('final');
        setExamQuestions(questions);
        setIsExamOpen(true);
      } catch (error) {
        setLlmError(renderLlmError(error));
      }
      return;
    }
    if (action.type === 'quick_exam') {
      // 温书自测（2026-06-28）：晚间宿舍夜读自省，出 1 题；复用 exam 出题/答题/评分基建
      try {
        const question = await generatePaintingPrompt(state, 'exam', pickQuickExamQuestionType(), true);
        setExamMode('quick');
        setExamQuestions([question]);
        setIsExamOpen(true);
      } catch (error) {
        setLlmError(renderLlmError(error));
      }
      return;
    }
    if (action.type === 'solve_puzzle') {
      try {
        const prompt = await generatePaintingPrompt(state, 'puzzle', 'archive_observation');
        setPuzzleAssessmentPrompt(prompt);
        setIsPuzzleOpen(true);
      } catch (error) {
        setLlmError(renderLlmError(error));
      }
      return;
    }
    if (action.type === 'talk_to_npc' && action.npcId) {
      setDialogueNpcId(action.npcId);
      return;
    }
    // 即时推荐衔接（2026-06-17）：手动走到"被推荐过的地点"且当前是叙事时段 → 不走普通 move_to，
    // 改开 follow 接续场景（带 intent），并消费该意图。沙盒时段不触发（与"沙盒不出 LLM 场景"一致）。
    if (action.type === 'move_to' && action.locationId) {
      const intent = state.suggestedIntents?.[action.locationId];
      const isNarrative = state.time.timeSlot === 'forenoon' || state.time.timeSlot === 'afternoon';
      if (intent && isNarrative) {
        const remaining = { ...(state.suggestedIntents ?? {}) };
        delete remaining[action.locationId];
        const consumed: GameState = { ...state, suggestedIntents: remaining };
        saveGameState(consumed);
        setState(consumed);
        runAction(consumed, {
          id: `follow-${action.locationId}-${Date.now()}`,
          type: 'follow_suggestion',
          label: `循念前往${LOCATIONS[action.locationId].name}`,
          locationId: action.locationId,
          intent,
          staminaCost: 0,
        });
        return;
      }
    }
    runAction(state, action);
  }

  function resetGame() {
    clearSaveFile();
    setHasSave(false);
    setPrologueSeen(false);
    setIsExamOpen(false);
    setIsPuzzleOpen(false);
    setEndingDismissed(false);
    setEndingStage(null);
    setMentorReview(null);
    setXimengMeet(null);
    setDialogueNpcId(null);
    setExamQuestions([]);
    setPuzzleAssessmentPrompt(null);
    setLlmError(null);
    setActiveScene(null);
    setAdmissionText(null);
    mainlineStartedRef.current = false;
    setState(null);
  }

  async function submitExam(answers: Record<string, ExamAnswer>) {
    if (!state) {
      return;
    }
    // 补考（2026-06-30 批二）在结局序列中进行，第7日丹青试已应过、无 take_exam 行动也不再扣体力；
    // final/quick 仍需对应行动（取其 staminaCost）。
    const examActionType = examMode === 'quick' ? 'quick_exam' : 'take_exam';
    const examAction = examMode === 'retake' ? undefined : actions.find((action) => action.type === examActionType);
    if (examMode !== 'retake' && !examAction) {
      return;
    }

    let evaluationResponses;
    try {
      evaluationResponses = await Promise.all(
        examQuestions.map((question) => {
          const answer = answers[question.id] ?? { freeText: '' };
          return llmAdapter.evaluatePaintingIntent({
            traceId: `exam-eval-${question.id}-${Date.now()}`,
            role: 'painting_intent_evaluator',
            promptVersion: 'mock-0.2',
            input: {
              mode: 'exam',
              question: {
                id: question.id,
                hiddenRubric: question.hiddenRubric,
              },
              playerAnswer: {
                selectedOptionIds: answer.optionId ? [answer.optionId] : [],
                freeText: answer.freeText,
              },
              playerStats: state.skills,
              knowledge: state.stats.knowledge,
              relationshipStage: state.relationships.ximeng.stage,
              canonWarnings: question.canonWarnings,
            },
            context: buildMemoryContext(state, 'painting_intent_evaluator'),
          });
        }),
      );
    } catch (error) {
      setLlmError(renderLlmError(error));
      return;
    }
    const evaluations = evaluationResponses.map((response) => response.output);
    const rawScore = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length;
    // 学识加分 floor(k/5) 在 quick 用简单口径；final 走引擎 computeExamScore（含本科技能 gating）
    const knowledgeBonus = Math.floor(state.stats.knowledge / 5);
    const quickScore = Math.max(0, Math.min(100, rawScore + knowledgeBonus));
    const passed = quickScore >= 60;
    const feedback = evaluations.map((evaluation) => evaluation.visibleFeedback).join('；');

    // 补考（2026-06-30 批二）：落第后保底过——finalScore 至少 60（保底过线），重算 ending 为通过档，直接进授衔段。
    // 不重启序列、不扣体力、不推时段；技能加成照给（补考也是真画了一场）。
    if (examMode === 'retake') {
      const exam = computeExamScore(state, rawScore);
      const guaranteedScore = Math.max(exam.finalScore, 60); // 保底到通过线
      const retakeEnding = determineEnding(state, { finalScore: guaranteedScore, cappedBySkill: false });
      const renderedRetake = `补试既毕：${feedback}`;
      const retakeState: GameState = {
        ...commitMemoryPatch({
          state: applyValidatedStatePatch(state, {
            skillDelta: mergeSkillDeltas(evaluations),
            timeAdvance: false,
          }),
          actionType: 'take_exam',
          renderedText: renderedRetake,
          memoryPatch: {
            playerStyleTags: collectStyleTags(evaluations),
            storyLedgerNote: renderedRetake,
          },
        }),
        lastRenderedText: renderedRetake,
        ending: retakeEnding,
      };
      setIsExamOpen(false);
      setExamQuestions([]);
      // 补考过 → 授衔段（commitTitleGrant 用重算后的通过档 ending 授名分）
      commitTitleGrant(retakeState, retakeEnding);
      setEndingStage('title_grant');
      return;
    }

    let patch: ValidatedStatePatch;
    let renderedText: string;
    let endingResult: EndingResult | undefined;

    // 至此 examMode 为 final/quick，examAction 必定存在（retake 已提前 return）
    if (!examAction) {
      return;
    }

    if (examMode === 'quick') {
      // 温书自测（2026-06-28）：夜读自省，答得好（≥60）给本科技能/学识小额加成（受心情修正+每日封顶）；答差不罚。
      // 不推进时段（晚间沙盒）、扣体力、落 flag 当晚不再出；不碰丹青试硬编码（晋画正/解锁秘阁）。
      const studied = getStudiedSkills(state.curriculum, state.player.styleOrigin);
      // 本科技能与学识轮换给：本科未满封顶给本科，否则给学识（避免单点封顶后白测）
      const rewardTarget = state.time.skillGainedToday < 4 ? studied[0] : 'knowledge';
      const reward = passed ? buildQuickExamReward(state, rewardTarget, 1) : {};
      patch = {
        ...reward,
        staminaDelta: -examAction.staminaCost,
        timeAdvance: false,
        flagsSet: { [`quick_exam_d${state.time.day}`]: true },
      };
      renderedText = passed
        ? `夜深，宿舍灯下，你把今日所学默了一遍。${feedback} 灯花结了又落，心里渐渐有了底。`
        : `夜深，宿舍灯下，你把今日所学默了一遍。${feedback} 有几处仍是夹生，你记下了，明日再看。`;
    } else {
      // 丹青试（第7日，2026-06-28 多维结局；2026-06-30 改走结局序列）：本科技能 gating + 分数定主轴档 → 结局序列演出。
      // 注意：rank 授予 / 秘阁画室解锁 / firstExamPassed 旗标全部**推迟到授衔段（title_grant）提交**——
      //   落第须先走导师点评→补考保底过才授衔，故交卷时只结算考试本身（技能/体力/已应试旗标），不提前给名分。
      const exam = computeExamScore(state, rawScore);
      endingResult = determineEnding(state, exam);
      renderedText = `丹青试两题批毕：${feedback}`;
      patch = {
        skillDelta: mergeSkillDeltas(evaluations),
        staminaDelta: -examAction.staminaCost,
        timeAdvance: true,
        flagsSet: {
          firstExamTaken: true,
          ...collectSuggestedFlags(evaluations),
        },
      };
    }

    const patchedState = applyValidatedStatePatch(state, patch);
    const nextState = {
      ...commitMemoryPatch({
        state: patchedState,
        actionType: examMode === 'quick' ? 'quick_exam' : 'take_exam',
        renderedText,
        memoryPatch: {
          playerStyleTags: collectStyleTags(evaluations),
          storyLedgerNote: renderedText,
        },
      }),
      lastRenderedText: renderedText,
      ...(endingResult ? { ending: endingResult } : {}),
    };

    saveGameState(nextState);
    setHasSave(true);
    setIsExamOpen(false);
    setExamQuestions([]);
    showSettlement(patch);
    setState(nextState);

    // 丹青试 → 启动结局序列（2026-06-30 批一）：导师点评 → 授衔 → 收尾
    if (endingResult) {
      setMentorReview(null);
      setEndingStage('mentor_review');
      void fetchMentorReview(nextState, endingResult);
    }
  }

  if (isExamOpen) {
    return <ExamScreen questions={examQuestions} mode={examMode} onCancel={() => setIsExamOpen(false)} onSubmit={submitExam} />;
  }

  /**
   * 结局导师点评（2026-06-30 批一）：丹青试放榜后，本科导师按表现点评（LLM，复用 character_dialogue + examReview）。
   * 失败走兜底点评句（结局不可卡死）。
   */
  async function fetchMentorReview(reviewState: GameState, ending: EndingResult) {
    const mentorId = mentorForStyle(reviewState.player.styleOrigin);
    const mentorRel = reviewState.relationships[mentorId];
    const majorSkillLabel = SKILL_LABELS[reviewState.player.styleOrigin];
    const failed = ending.tier === 'fail';
    try {
      const response = await llmAdapter.generateCharacterDialogue({
        traceId: `ending-review-${Date.now()}`,
        role: 'character_dialogue',
        promptVersion: DIALOGUE_PROMPT_VERSION,
        input: {
          npcId: mentorId,
          day: reviewState.time.day,
          timeSlot: reviewState.time.timeSlot,
          locationId: reviewState.currentLocation,
          relationshipStage: mentorRel.stage,
          emotionState: mentorRel.emotionState,
          topicCard: '丹青试点评',
          examReview: { tier: ending.tier, score: ending.score, failed, majorSkillLabel },
          recentEvents: reviewState.memory.storyLedger.slice(-2).map((entry) => entry.summary),
          relevantMemories: reviewState.memory.playerStyle.tags,
          availableClueIds: reviewState.puzzle.collectedClueIds,
          canonWarnings: reviewState.memory.coreCanon.spoilerBoundaries,
        },
        context: buildMemoryContext(reviewState, 'character_dialogue', mentorId),
      });
      setMentorReview({ dialogue: response.output.dialogue, actionText: response.output.actionText });
    } catch {
      // 兜底：LLM 失败也要有点评，序列不卡死
      setMentorReview({
        dialogue: failed
          ? `${majorSkillLabel}的火候还差一层。画院惜才，准你补试一场，莫负了这身手。`
          : `${majorSkillLabel}上见了功夫，往后还须精进。`,
        actionText: '导师端详着你的卷子，缓缓开口。',
      });
    }
  }

  /**
   * 结局序列推进（2026-06-30 批一骨架 + 批二补全）：按当前段算下一段。
   * - retake：落第→点评后启动真补考（ExamScreen examMode='retake' 保底过），不在此折叠。
   * - ximeng_meet：好感≥知己→拉希孟话别 LLM。
   * 授衔段（title_grant）提交时正式授 rank / 解锁秘阁画室 / 落 firstExamPassed（推迟到此，落第补考过后才给名分）。
   */
  function advanceEndingStage(from: EndingStage) {
    if (!state || !state.ending) return;
    const next = nextEndingStage(from, state.ending, state);

    if (next === 'retake') {
      // 批二：落第补考——点评后真走一场 ExamScreen（examMode='retake' 保底过）
      void launchRetake(state);
      setEndingStage('retake');
      return;
    }
    if (next === 'title_grant') {
      commitTitleGrant(state, state.ending);
      setEndingStage('title_grant');
      return;
    }
    if (next === 'ximeng_meet') {
      // 批二：见希孟——拉希孟话别预热语
      setXimengMeet(null);
      void fetchXimengMeet(state);
      setEndingStage('ximeng_meet');
      return;
    }
    setEndingStage(next);
  }

  /** 落第补考（2026-06-30 批二）：复用 final 出题，examMode='retake'；submitExam retake 分支保底过 */
  async function launchRetake(baseState: GameState) {
    try {
      const questions = await Promise.all(
        pickExamQuestionTypes().map((questionType) => generatePaintingPrompt(baseState, 'exam', questionType)),
      );
      setExamMode('retake');
      setExamQuestions(questions);
      setIsExamOpen(true);
    } catch (error) {
      setLlmError(renderLlmError(error));
    }
  }

  /** 见希孟话别（2026-06-30 批二）：复用 character_dialogue + endingMeet，希孟说预热话。失败走兜底句（序列不卡死）。 */
  async function fetchXimengMeet(meetState: GameState) {
    const rel = meetState.relationships.ximeng;
    try {
      const response = await llmAdapter.generateCharacterDialogue({
        traceId: `ending-ximeng-${Date.now()}`,
        role: 'character_dialogue',
        promptVersion: DIALOGUE_PROMPT_VERSION,
        input: {
          npcId: 'ximeng',
          day: meetState.time.day,
          timeSlot: meetState.time.timeSlot,
          locationId: meetState.currentLocation,
          relationshipStage: rel.stage,
          emotionState: rel.emotionState,
          topicCard: '画院之路同行',
          endingMeet: true,
          recentDialogue: (rel.chatHistory ?? []).slice(-6),
          recentEvents: meetState.memory.storyLedger.slice(-2).map((entry) => entry.summary),
          relevantMemories: meetState.memory.playerStyle.tags,
          availableClueIds: meetState.puzzle.collectedClueIds,
          canonWarnings: meetState.memory.coreCanon.spoilerBoundaries,
        },
        context: buildMemoryContext(meetState, 'character_dialogue', 'ximeng'),
      });
      setXimengMeet({ dialogue: response.output.dialogue, actionText: response.output.actionText });
    } catch {
      setXimengMeet({
        dialogue: '你既留下了，那条没画完的水路，迟早要一起去走一趟。',
        actionText: '希孟看了你许久，将手中半卷青绿轻轻按了按。',
      });
    }
  }

  /** 授衔提交（2026-06-30）：授 rank=zhihou（落第补考保底过同授）+ 解锁秘阁/画室 + 落 firstExamPassed/archiveUnlocked 旗标。
   * 以传入 baseState/ending 为准（避免 setState 异步后读 stale state）。 */
  function commitTitleGrant(baseState: GameState, ending: EndingResult) {
    // 落第补考保底过后 ending 已被重算为通过档（见 submitExam retake 分支），此处统一按 ending 授名分
    const grantedRank = ending.rankChange ?? ('zhihou' as const);
    const granted = applyValidatedStatePatch(baseState, {
      rankChange: grantedRank,
      flagsSet: {
        firstExamPassed: true,
        archiveUnlocked: ending.unlockArchive,
      },
      unlockedLocations: [
        ...(ending.unlockArchive ? ['secret_archive' as const] : []),
        ...(ending.unlockStudio ? ['ximeng_studio' as const] : []),
      ],
    });
    saveGameState(granted);
    setState(granted);
  }

  async function submitPuzzle(submission: PuzzleSubmission) {
    if (!state || !puzzleAssessmentPrompt) {
      return;
    }
    const puzzleAction = actions.find((action) => action.type === 'solve_puzzle');
    if (!puzzleAction) {
      return;
    }

    let response;
    try {
      response = await llmAdapter.evaluatePaintingIntent({
        traceId: `puzzle-eval-${puzzleAssessmentPrompt.id}-${Date.now()}`,
        role: 'painting_intent_evaluator',
        promptVersion: 'mock-0.2',
        input: {
          mode: 'puzzle',
          question: {
            id: puzzleAssessmentPrompt.id,
            hiddenRubric: puzzleAssessmentPrompt.hiddenRubric,
          },
          playerAnswer: {
            selectedClueIds: submission.clueIds,
            freeText: submission.freeText,
          },
          playerStats: state.skills,
          knowledge: state.stats.knowledge,
          relationshipStage: state.relationships.ximeng.stage,
          canonWarnings: puzzleAssessmentPrompt.canonWarnings,
        },
        context: buildMemoryContext(state, 'painting_intent_evaluator'),
      });
    } catch (error) {
      setLlmError(renderLlmError(error));
      return;
    }

    const evaluation = response.output;
    const suggestedClues = evaluation.suggestedStatePatch.cluesGranted ?? [];
    const tierIsStrong = evaluation.interpretationTier !== 'shallow';
    // 戏剧性揭示移到幕五「揭卷」固定脚本（haiyouReveal）；此处只留可见批语入账本。
    const renderedText = `《骸游图》评估：${evaluation.visibleFeedback}`;

    const patch: ValidatedStatePatch = {
      skillDelta: evaluation.suggestedStatePatch.skillDelta,
      staminaDelta: -puzzleAction.staminaCost,
      timeAdvance: true,
      cluesGranted: Array.from(new Set([...submission.clueIds, ...suggestedClues])),
      flagsSet: {
        haiyouDiscovered: true,
        haiyouFirstInterpreted: true,
        haiyouThreadStrong: tierIsStrong,
        haiyouDisappearanceHooked: evaluation.interpretationTier === 'core',
        ...collectSuggestedFlags([evaluation]),
      },
    };
    const patchedState = applyValidatedStatePatch(state, patch);
    const withMemory = commitMemoryPatch({
      state: patchedState,
      actionType: 'solve_puzzle',
      renderedText,
      locationId: puzzleAction.locationId,
      memoryPatch: {
        ...evaluation.memoryPatch,
        storyLedgerNote: renderedText,
      },
    });
    const nextState: GameState = {
      ...withMemory,
      puzzle: {
        ...withMemory.puzzle,
        haiyouRevealTier: evaluation.interpretationTier,
        discoveredAnomalyIds: Array.from(
          new Set([...withMemory.puzzle.discoveredAnomalyIds, ...submission.anomalyIds]),
        ),
        interpretationHistory: [
          ...withMemory.puzzle.interpretationHistory,
          {
            id: `interpretation-${Date.now()}`,
            paintingId: puzzleAction.paintingId ?? 'haiyou',
            day: state.time.day,
            selectedClueIds: submission.clueIds,
            freeText: submission.freeText,
            tier: evaluation.interpretationTier,
            styleTags: evaluation.styleTags,
            feedback: evaluation.visibleFeedback,
          },
        ],
      },
      lastRenderedText: renderedText,
    };

    saveGameState(nextState);
    setHasSave(true);
    setIsPuzzleOpen(false);
    setPuzzleAssessmentPrompt(null);
    showSettlement(patch);
    setState(nextState);
  }

  if (isPuzzleOpen && puzzleAssessmentPrompt && state) {
    return (
      <PuzzleScreen
        assessmentPrompt={puzzleAssessmentPrompt}
        collectedClueIds={state.puzzle.collectedClueIds}
        onCancel={() => setIsPuzzleOpen(false)}
        onSubmit={submitPuzzle}
      />
    );
  }

  /**
   * 闲聊单轮（2026-06-25 多轮重构）：每轮一次 LLM 调用，按玩家上一轮回复语气裁好感增减。
   * 不扣体力/不推进时段（进场已在 handleChat 扣体力+计次）。返回 output 供 DialogueScreen 续轮。
   */
  /** 续聊开场（2026-06-26）：有历史时进场调一次，希孟延续上次对话主动开场白 + 回复选项。不计次、不改好感。 */
  async function openDialogue(priorHistory: string[]): Promise<CharacterDialogueOutput | undefined> {
    if (!state || !dialogueNpcId) return undefined;
    const relationship = state.relationships[dialogueNpcId];
    try {
      const response = await llmAdapter.generateCharacterDialogue({
        traceId: `dialogue-open-${Date.now()}`,
        role: 'character_dialogue',
        promptVersion: DIALOGUE_PROMPT_VERSION,
        input: {
          npcId: dialogueNpcId,
          day: state.time.day,
          timeSlot: state.time.timeSlot,
          locationId: state.currentLocation,
          relationshipStage: relationship.stage,
          emotionState: relationship.emotionState,
          topicCard: relationship.unlockedTopics[0] ?? '闲谈',
          isOpening: true,
          recentDialogue: priorHistory.slice(-6),
          recentEvents: state.memory.storyLedger.slice(-2).map((entry) => entry.summary),
          relevantMemories: state.memory.playerStyle.tags,
          availableClueIds: state.puzzle.collectedClueIds,
          canonWarnings: state.memory.coreCanon.spoilerBoundaries,
        },
        context: buildMemoryContext(state, 'character_dialogue', dialogueNpcId),
      });
      // 开场白追加进 chatHistory（希孟主动说的话），不改好感、不计次
      const prev = state.relationships[dialogueNpcId].chatHistory ?? [];
      const nextHistory = [...prev, `${CHARACTERS[dialogueNpcId].name}：${response.output.dialogue}`].slice(-30);
      const next: GameState = {
        ...state,
        relationships: {
          ...state.relationships,
          [dialogueNpcId]: { ...state.relationships[dialogueNpcId], chatHistory: nextHistory, emotionState: response.output.emotionState },
        },
      };
      saveGameState(next);
      setState(next);
      return response.output;
    } catch (error) {
      setLlmError(renderLlmError(error));
      return undefined;
    }
  }

  async function submitDialogue(
    playerReply: string,
    replyTone: ChatReplyTone | undefined,
    recentDialogue: string[],
    isFinalExchange: boolean,
  ): Promise<CharacterDialogueOutput | undefined> {
    if (!state || !dialogueNpcId) {
      return undefined;
    }
    const relationship = state.relationships[dialogueNpcId];

    let response;
    try {
      response = await llmAdapter.generateCharacterDialogue({
        traceId: `dialogue-${Date.now()}`,
        role: 'character_dialogue',
        promptVersion: DIALOGUE_PROMPT_VERSION,
        input: {
          npcId: dialogueNpcId,
          day: state.time.day,
          timeSlot: state.time.timeSlot,
          locationId: state.currentLocation,
          relationshipStage: relationship.stage,
          emotionState: relationship.emotionState,
          topicCard: relationship.unlockedTopics[0] ?? '闲谈',
          playerReply: playerReply || undefined,
          replyTone,
          recentDialogue: recentDialogue.slice(-4),
          isFinalExchange,
          recentEvents: state.memory.storyLedger.slice(-2).map((entry) => entry.summary),
          relevantMemories: state.memory.playerStyle.tags,
          availableClueIds: state.puzzle.collectedClueIds,
          canonWarnings: state.memory.coreCanon.spoilerBoundaries,
        },
        context: buildMemoryContext(state, 'character_dialogue', dialogueNpcId),
      });
    } catch (error) {
      setLlmError(renderLlmError(error));
      return undefined;
    }

    // 好感增减裁决（2026-06-26 三路 + 每日封顶）：
    // ①越界(问AI/元游戏)→boundaryViolation：直接降一档（绕过±3/封顶），扣到下一档区间顶；
    // ②点选项(tone已知)→tone保底：warm≥+1、probing≤-1、neutral 保底+1，clamp±3；
    // ③自由输入(tone undefined)→纯用LLM按语义+好感档判的值，clamp±3。
    // 正增量受 DAILY_AFFINITY_CAP 当日封顶（防高档+warm 一日拉满）；降好感不受封顶。
    const rel0 = state.relationships[dialogueNpcId];
    const cur = rel0.hiddenAffinity;
    const raw = response.output.relationshipDelta ?? 0;
    let delta;
    if (response.output.boundaryViolation) {
      delta = Math.max(-cur, (stageFloor(cur) - 1) - cur); // 降到下一档区间顶（如45→39/25→19/10→0），不受封顶
    } else {
      if (replyTone === 'warm') {
        delta = Math.max(1, Math.min(3, raw));
      } else if (replyTone === 'probing') {
        delta = Math.max(-3, Math.min(-1, raw));
      } else if (replyTone === 'neutral') {
        delta = Math.max(1, Math.min(2, raw)); // neutral 保底+1（治低档卡死），至多+2
      } else {
        delta = Math.max(-3, Math.min(3, raw)); // 自由输入：信 LLM 语义判定
      }
      // 当日正增量封顶：已涨满 DAILY_AFFINITY_CAP 后正 delta 归零（负 delta 仍生效）
      if (delta > 0) {
        const gained = rel0.affinityGainedToday ?? 0;
        delta = Math.max(0, Math.min(delta, DAILY_AFFINITY_CAP - gained));
      }
    }
    const gainedDelta = Math.max(0, delta); // 计入当日涨幅的部分

    const patchedState = applyValidatedStatePatch(state, {
      relationshipDeltaByNpc: delta !== 0 ? { [dialogueNpcId]: delta } : undefined,
    });

    const withMemory = commitMemoryPatch({
      state: patchedState,
      actionType: 'talk_to_npc',
      renderedText: `${response.output.dialogue}\n${response.output.actionText}`,
      memoryPatch: response.output.memoryPatch,
      locationId: state.currentLocation,
      npcId: dialogueNpcId,
      entities: response.output.entitiesIntroduced,
    });
    // 闲聊新增实体飘条（commitMemoryPatch 已入库，这里算 added 供提示）
    if (response.output.entitiesIntroduced?.length) {
      showNewEntities(mergeDiscoveredEntities(patchedState.memory.clueGraph.nodes, response.output.entitiesIntroduced).added);
    }

    // 对话往来持久化（2026-06-26）：本轮"我：…"+"希孟：…"追加进 chatHistory（跨日保留），上限末 30 条防膨胀
    const prevHistory = withMemory.relationships[dialogueNpcId].chatHistory ?? [];
    const appended = playerReply
      ? [...prevHistory, `我：${playerReply}`, `${CHARACTERS[dialogueNpcId].name}：${response.output.dialogue}`]
      : [...prevHistory, `${CHARACTERS[dialogueNpcId].name}：${response.output.dialogue}`];
    const nextHistory = appended.slice(-30);

    const finalState: GameState = {
      ...withMemory,
      relationships: {
        ...withMemory.relationships,
        [dialogueNpcId]: {
          ...withMemory.relationships[dialogueNpcId],
          emotionState: response.output.emotionState,
          // 计次（2026-06-25）：每说一句闲聊 +1，顶栏实时递减；跨日清零。首遇剧情对话不计次（2026-06-26 治 #4）
          chatsToday: (withMemory.relationships[dialogueNpcId].chatsToday ?? 0) + (dialogueIsFirstMeet ? 0 : 1),
          chatHistory: nextHistory,
          // 当日好感涨幅累计（2026-06-26）：用于每日封顶；跨日清零
          affinityGainedToday: (rel0.affinityGainedToday ?? 0) + gainedDelta,
          unlockedTopics: Array.from(
            new Set([...withMemory.relationships[dialogueNpcId].unlockedTopics, ...response.output.topicUnlocked]),
          ),
        },
      },
      lastRenderedText: `${CHARACTERS[dialogueNpcId].name}说：“${response.output.dialogue}”\n${response.output.actionText}`,
    };

    saveGameState(finalState);
    setHasSave(true);
    setState(finalState);
    return response.output;
  }

  /** 开启闲聊（2026-06-25）：进场扣体力 -1，不推进时段；计次改为每句一次（在 submitDialogue 扣）。次数/体力 gate 在便签卡 */
  function handleChat(npcId: NpcId) {
    if (!state || state.time.stamina < 1) return;
    const rel = state.relationships[npcId];
    const left = Math.max(0, dailyChatQuota(rel.stage) - (rel.chatsToday ?? 0));
    if (left <= 0) return;
    const opened = applyValidatedStatePatch(state, { staminaDelta: -1 });
    const counted: GameState = {
      ...opened,
      relationships: {
        ...opened.relationships,
        [npcId]: { ...opened.relationships[npcId], lastInteractionDay: state.time.day },
      },
    };
    saveGameState(counted);
    setState(counted);
    setDialogueIsFirstMeet(false); // 主动闲聊计次（区别于首遇）
    setDialogueNpcId(npcId);
  }

  if (dialogueNpcId) {
    const rel = state.relationships[dialogueNpcId];
    // 本场句数预算（2026-06-26）：主动闲聊=好感档剩余次数；首遇=独立固定额度 FIRST_MEET_CHAT_TURNS
    const maxTurns = dialogueIsFirstMeet
      ? FIRST_MEET_CHAT_TURNS
      : Math.max(0, dailyChatQuota(rel.stage) - (rel.chatsToday ?? 0));
    return (
      <DialogueScreen
        affinity={rel.hiddenAffinity}
        maxTurns={maxTurns}
        countsTowardQuota={!dialogueIsFirstMeet}
        priorHistory={rel.chatHistory ?? []}
        npcId={dialogueNpcId}
        onCancel={() => setDialogueNpcId(null)}
        onSubmit={submitDialogue}
        onOpen={openDialogue}
      />
    );
  }

  if (isArchiveOpen) {
    return (
      <ArchiveScreen
        ledger={state.memory.storyLedger}
        summaries={state.memory.summaries}
        entities={state.memory.clueGraph.nodes}
        onClose={() => setIsArchiveOpen(false)}
      />
    );
  }

  // 结局序列（2026-06-30 批一）：丹青试交卷后分段演出，优先于旧 EndingScreen。
  // 导师点评(A) → 授衔(B) → 收尾(E)；落第补考桩/见希孟桩在 advanceEndingStage 内处理。
  if (state.ending && endingStage && !endingDismissed) {
    const ending = state.ending;
    const enterArchive = ending.unlockArchive
      ? () => { setEndingStage(null); setEndingDismissed(true); }
      : undefined;
    const enterStudio = ending.unlockStudio
      ? () => { setEndingStage(null); setEndingDismissed(true); }
      : undefined;

    if (endingStage === 'mentor_review') {
      return (
        <EndingDialogue
          npcId={mentorForStyle(state.player.styleOrigin)}
          dialogue={mentorReview ? mentorReview.dialogue : null}
          actionText={mentorReview ? mentorReview.actionText : null}
          caption="丹青试 · 放榜点评"
          onContinue={() => advanceEndingStage('mentor_review')}
        />
      );
    }
    if (endingStage === 'title_grant') {
      return (
        <TitleGrantOverlay
          ending={ending}
          rankLabel={RANK_LABELS.zhihou}
          onContinue={() => advanceEndingStage('title_grant')}
        />
      );
    }
    if (endingStage === 'ximeng_bridge') {
      return <XimengBridge onContinue={() => advanceEndingStage('ximeng_bridge')} />;
    }
    if (endingStage === 'ximeng_meet') {
      return (
        <EndingDialogue
          npcId="ximeng"
          dialogue={ximengMeet ? ximengMeet.dialogue : null}
          actionText={ximengMeet ? ximengMeet.actionText : null}
          caption="放榜既毕 · 寻希孟"
          onContinue={() => advanceEndingStage('ximeng_meet')}
        />
      );
    }
    if (endingStage === 'epilogue') {
      return <EpilogueScreen ending={ending} onEnterArchive={enterArchive} onEnterStudio={enterStudio} onReset={resetGame} />;
    }
    // retake：补考出题中（isExamOpen 尚未开）的过渡，显点评页占位避免回落旧 EndingScreen
    if (endingStage === 'retake') {
      return (
        <EndingDialogue
          npcId={mentorForStyle(state.player.styleOrigin)}
          dialogue={null}
          caption="补试 · 准备中"
          onContinue={() => {}}
        />
      );
    }
  }

  // 丹青试结局页（2026-06-28；2026-06-29 双入口）：旧静态结局页，保留作回退/参考（2026-06-30 起主流程走上方结局序列）
  if (state.ending && !endingDismissed) {
    return (
      <EndingScreen
        ending={state.ending}
        state={state}
        onEnterArchive={state.ending.unlockArchive ? () => setEndingDismissed(true) : undefined}
        onEnterStudio={state.ending.unlockStudio ? () => setEndingDismissed(true) : undefined}
        onReset={resetGame}
      />
    );
  }

  return (
    <MainGameScreen
      state={state}
      actions={actions}
      llmError={llmError}
      settlement={settlement}
      newEntities={newEntities}
      scene={activeScene}
      onContinue={continueScene}
      onLeaveScene={concludeScene}
      onAdvanceSegment={advanceSegment}
      onFollowSuggestion={(next) => endScene({ reason: 'follow', next })}
      onAction={handleAction}
      onReset={resetGame}
      onOpenArchive={() => setIsArchiveOpen(true)}
      onChat={handleChat}
      onDevSkip={import.meta.env.DEV ? () => {
        const devState: GameState = {
          ...state,
          progress: {
            ...state.progress,
            rank: 'painter_regular',
            unlockedLocations: Array.from(
              new Set([...state.progress.unlockedLocations, 'secret_archive']),
            ),
            flags: {
              ...state.progress.flags,
              firstExamTaken: true,
              firstExamPassed: true,
              archiveUnlocked: true,
            },
          },
          currentLocation: state.currentLocation,
          time: {
            ...state.time,
            day: 7,
            timeSlot: 'morning_class',
            isExamDay: true,
          },
          lastRenderedText: '开发捷径：你已晋为画正，秘阁入口由此开启。',
        };
        saveGameState(devState);
        setHasSave(true);
        setState(devState);
      } : undefined}
      onPreviewEnding={import.meta.env.DEV ? (score, ximengAffinity) => {
        // 开发预览（2026-06-29；2026-06-30 改走结局序列）：引擎 determineEnding 生成对应档结局，启动结局序列逐段预览。
        // 用真实引擎函数保证预览与实际逻辑一致；好感设到 ximengAffinity 以预览好感修饰/画室入口。
        // 注意：computeExamScore 有本科技能 gating（<30 封顶 59 分），预览时玩家技能仍是初始 18，
        //   会把"优 90 分"封成落第。预览意图是直跳目标档，故把本科技能临时拉到门槛以上让分数生效。
        const previewState: GameState = {
          ...state,
          skills: { ...state.skills, [state.player.styleOrigin]: Math.max(state.skills[state.player.styleOrigin], EXAM_SKILL_GATE) },
          relationships: {
            ...state.relationships,
            ximeng: { ...state.relationships.ximeng, hiddenAffinity: ximengAffinity },
          },
        };
        const ending = determineEnding(previewState, computeExamScore(previewState, score));
        const nextState = { ...previewState, ending };
        setEndingDismissed(false);
        setMentorReview(null);
        setEndingStage('mentor_review');
        setState(nextState);
        void fetchMentorReview(nextState, ending);
      } : undefined}
    />
  );
}
