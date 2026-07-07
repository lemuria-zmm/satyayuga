import { generateWeatherWeek } from './ambience';
import { INITIAL_FLAGS } from '../content/flags';
import type { CharacterMemory, FamilyOrigin, GameState, NpcId, PlayerProfile, SkillState } from '../types';

const npcIds: NpcId[] = ['ximeng', 'zeduan', 'litang', 'song'];

function createCharacterMemory(npcId: NpcId): CharacterMemory {
  return {
    npcId,
    impressionOfPlayer: '尚未形成明确印象。',
    knownPlayerStyleTags: [],
    knownClueIds: [],
    avoidedTopics: [],
    relationshipNotes: [],
    lastSummary: '',
  };
}

export interface CreateGameStateOptions {
  player?: Partial<
    Pick<PlayerProfile, 'name' | 'pronounLabel' | 'styleOrigin' | 'gender' | 'age' | 'origin' | 'personality' | 'aspiration'>
  >;
}

function createInitialSkills(styleOrigin: PlayerProfile['styleOrigin']): SkillState {
  const skills: SkillState = { landscape: 10, figure: 10, architecture: 10 };
  skills[styleOrigin] = 18;
  return skills;
}

/** 出身轻微影响初始数值（拍板：小幅影响，不 gate 玩法） */
const ORIGIN_EFFECTS: Record<
  FamilyOrigin,
  { money?: number; knowledge?: number; mood?: number; architecture?: number; maxStamina?: number }
> = {
  merchant: { money: 5 },
  farming_scholar: { knowledge: 3 },
  official_branch: { money: 5, knowledge: 2, mood: -1 },
  artisan: { architecture: 2 },
  displaced: { maxStamina: 1, money: -5 },
};

export function createInitialGameState(options: CreateGameStateOptions = {}): GameState {
  const styleOrigin = options.player?.styleOrigin ?? 'landscape';
  const playerName = options.player?.name?.trim() || '新入院者';
  const origin = options.player?.origin ?? 'farming_scholar';
  const originEffect = ORIGIN_EFFECTS[origin];

  const skills = createInitialSkills(styleOrigin);
  if (originEffect.architecture) skills.architecture += originEffect.architecture;

  const maxStamina = 10 + (originEffect.maxStamina ?? 0);

  return {
    version: 1,
    saveId: `save-${Date.now()}`,
    player: {
      id: 'player',
      name: playerName,
      pronounLabel: options.player?.pronounLabel ?? '你',
      styleOrigin,
      gender: options.player?.gender ?? 'female',
      age: options.player?.age ?? 18,
      origin,
      personality: options.player?.personality?.trim() || '好奇敏锐',
      aspiration: options.player?.aspiration?.trim() || '成为画院的待诏，画出传世名作',
    },
    time: {
      day: 1,
      maxDay: 7,
      timeSlot: 'morning_class',
      stamina: 8,
      maxStamina,
      nextDayStaminaBonus: 0,
      isExamDay: false,
      narrativeCharsToday: 0,
      slotSceneCount: 0,
      skillGainedToday: 0,
      knowledgeGainedToday: 0,
    },
    stats: {
      mood: Math.max(0, Math.min(10, 6 + (originEffect.mood ?? 0))),
      knowledge: Math.max(0, originEffect.knowledge ?? 0),
      // 初始钱 = 第 1 日点卯例钱（与 DAILY_ALLOWANCE 一致，2026-06-12 降为 5）+ 出身修正
      money: Math.max(0, 5 + (originEffect.money ?? 0)),
    },
    skills,
    progress: {
      rank: 'student',
      // 第 1 日教程流（拍板）：开局仅院堂；各时段由小书童引导渐次解锁；第 2 日起全开放
      unlockedLocations: ['hall'],
      triggeredEventIds: [],
      completedEventIds: [],
      flags: { ...INITIAL_FLAGS, visited_hall: true },
    },
    currentLocation: 'hall',
    weatherWeek: generateWeatherWeek(),
    relationships: {
      ximeng: {
        npcId: 'ximeng',
        hiddenAffinity: 0,
        stage: 'stranger',
        emotionState: 'distant',
        unlockedTopics: ['问画', '闲谈'],
      },
      zeduan: {
        npcId: 'zeduan',
        hiddenAffinity: 0,
        stage: 'stranger',
        emotionState: 'noticing',
        unlockedTopics: ['请教界画', '问街市'],
      },
      litang: {
        npcId: 'litang',
        hiddenAffinity: 0,
        stage: 'stranger',
        emotionState: 'silent',
        unlockedTopics: ['请教山水', '问丹青试'],
      },
      song: {
        npcId: 'song',
        hiddenAffinity: 0,
        stage: 'stranger',
        emotionState: 'noticing',
        unlockedTopics: ['请教人物', '问画中人'],
      },
    },
    puzzle: {
      discoveredAnomalyIds: [],
      collectedClueIds: [],
      interpretationHistory: [],
      unlockedPaintingIds: [],
    },
    memory: {
      coreCanon: {
        version: 'mvp-0.2',
        worldPremise: '丹青院是架空宫廷画院，玩家是带着"希孟为何在画完千里江山卷后消失"之谜入院的过客（此为玩家私有，NPC 不知情）。',
        hiddenAnchors: [
          {
            id: 'haiyou_collab',
            codename: '骸游图',
            privateTruth: '《骸游图》是希孟、择端、李唐、嵩四人共创、分工不同，画盛世底下疮痍、欲进献警戒当朝危局；希孟明面画千里江山卷、暗里参与此图，他的消失与此图有关。',
            allowedForeshadowing: ['四位先生的名字在旧档同时出现', '有些景画了不能进献', '题记年月被涂改', '希孟案上不止一卷', '若有一日我不在了'],
            forbiddenReveals: ['秘阁揭开前点明四人共创', '坐实希孟消失的原因', '点明进献警戒的目的'],
          },
        ],
        spoilerBoundaries: ['秘阁揭开前不点明四人共创', '不得坐实希孟未来消失的原因'],
        forbiddenCanonDrifts: ['现代医学解释', '超自然诅咒', '单一宫斗阴谋'],
      },
      storyLedger: [],
      characterMemories: Object.fromEntries(npcIds.map((npcId) => [npcId, createCharacterMemory(npcId)])) as GameState['memory']['characterMemories'],
      playerStyle: {
        tags: [],
        skillBias: [],
        interpretationPatterns: [],
        notableChoices: [],
      },
      clueGraph: {
        nodes: [],
        edges: [],
      },
      summaries: [],
    },
    lastRenderedText: `${playerName}站在丹青院门前。门内墨香很淡，像一场尚未落纸的雨。`,
    pendingHooks: [],
    suggestedIntents: {},
  };
}
